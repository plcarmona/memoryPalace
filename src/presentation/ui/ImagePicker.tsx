import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { usePalaceStore } from '../../stores/palaceStore'
import { TreeService } from '../../domain/tree/TreeService'
import { SegmentRegion, PalaceElement } from '../../domain/models'
import { fuzzyScore } from './CommandPalette'

const SERVER = `http://${window.location.hostname}:8000`

type BBox = [number, number, number, number]

interface ImageEntry {
  path: string
  filename: string
  subfolder: string
}

interface ServerFolder {
  name: string
  path: string
  tags: string[]
  imageCount: number
  images: ImageEntry[]
}

interface ImagePickerProps {
  onClose: () => void
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function cropToDataUrl(dataUrl: string, bbox: BBox): Promise<string> {
  const img = await loadImage(dataUrl)
  const [x, y, w, h] = bbox
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, x, y, w, h, 0, 0, w, h)
  return canvas.toDataURL('image/png')
}

function randomPos(): [number, number, number] {
  return [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 0]
}

export function ImagePicker({ onClose }: ImagePickerProps) {
  const addElement = usePalaceStore(s => s.addElement)
  const currentSceneId = usePalaceStore(s => s.currentSceneId)
  const nodes = usePalaceStore(s => s.nodes)

  const [tab, setTab] = useState<'folders' | 'palace'>('folders')
  const [folders, setFolders] = useState<ServerFolder[]>([])
  const [query, setQuery] = useState('')
  const [activeFolders, setActiveFolders] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [distance, setDistance] = useState(2)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [folderRegions, setFolderRegions] = useState<Map<string, SegmentRegion[]>>(new Map())
  const [segmentingIds, setSegmentingIds] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  const sceneTags = useMemo(() => {
    const scene = nodes.find(n => n.id === currentSceneId)
    return scene?.metadata?.tags || []
  }, [nodes, currentSceneId])

  const fetchFolders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${SERVER}/folders`)
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      setFolders(data.folders || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFolders() }, [fetchFolders])
  useEffect(() => { inputRef.current?.focus() }, [])

  // --- Folder filtering ---

  const visibleFolders = useMemo(() => {
    if (sceneTags.length === 0) return folders
    return folders.filter(f => f.tags.some(t => sceneTags.includes(t)))
  }, [folders, sceneTags])

  const filteredFolderImages = useMemo(() => {
    const result: ImageEntry[] = []
    const foldersToShow = activeFolders.size > 0
      ? visibleFolders.filter(f => activeFolders.has(f.name))
      : visibleFolders
    for (const folder of foldersToShow) {
      for (const image of folder.images) {
        if (query) {
          const fullName = image.subfolder ? `${image.subfolder}/${image.filename}` : image.filename
          if (fuzzyScore(query.toLowerCase(), fullName.toLowerCase()) < 0) continue
        }
        result.push(image)
      }
    }
    return result
  }, [visibleFolders, activeFolders, query])

  // --- Palace images from nearby nodes ---

  const palaceImages = useMemo(() => {
    if (!currentSceneId) return []
    const nearby = TreeService.getNodesWithinDistance(nodes, currentSceneId, distance)
      .filter(n => n.id !== currentSceneId)
    const images: { element: PalaceElement; sceneName: string; sceneId: string }[] = []
    for (const node of nearby) {
      for (const el of node.elements) {
        if (el.type === 'image-plane') {
          images.push({ element: el, sceneName: node.label, sceneId: node.id })
        }
      }
    }
    return images
  }, [nodes, currentSceneId, distance])

  const filteredPalaceImages = useMemo(() => {
    if (!query) return palaceImages
    return palaceImages.filter(({ element, sceneName }) => {
      const name = element.id.toLowerCase()
      const scene = sceneName.toLowerCase()
      return fuzzyScore(query.toLowerCase(), name) >= 0 || fuzzyScore(query.toLowerCase(), scene) >= 0
    })
  }, [palaceImages, query])

  // --- Actions ---

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectFolderImage = async (imagePath: string) => {
    try {
      const res = await fetch(`${SERVER}/image?path=${encodeURIComponent(imagePath)}`)
      if (!res.ok) throw new Error('Failed to load image')
      const data = await res.json()
      addElement('image-plane', data.dataUrl, randomPos())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load image')
    }
  }

  const handleSelectPalaceImage = async (dataUrl: string) => {
    addElement('image-plane', dataUrl, randomPos())
    onClose()
  }

  const handleSegmentFolder = async (imagePath: string) => {
    setSegmentingIds(prev => new Set(prev).add(imagePath))
    try {
      const res = await fetch(`${SERVER}/segment-path?path=${encodeURIComponent(imagePath)}`, { method: 'POST' })
      if (!res.ok) throw new Error('Segmentation failed')
      const data = await res.json()
      const regions: SegmentRegion[] = (data.masks || []).map((m: { bbox: BBox; label?: string }, i: number) => ({
        id: `seg-${i}-${imagePath}`,
        boundingBox: m.bbox,
        label: m.label,
      }))
      setFolderRegions(prev => new Map(prev).set(imagePath, regions))
      setExpandedIds(prev => new Set(prev).add(imagePath))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Segmentation failed')
    } finally {
      setSegmentingIds(prev => { const n = new Set(prev); n.delete(imagePath); return n })
    }
  }

  const handleSelectRegion = async (fullDataUrl: string, bbox: BBox) => {
    try {
      const cropped = await cropToDataUrl(fullDataUrl, bbox)
      addElement('image-plane', cropped, randomPos())
      onClose()
    } catch {
      setError('Failed to crop region')
    }
  }

  const handleSelectFolderRegion = async (imagePath: string, bbox: BBox) => {
    try {
      const res = await fetch(`${SERVER}/image?path=${encodeURIComponent(imagePath)}`)
      if (!res.ok) throw new Error('Failed to load image')
      const data = await res.json()
      await handleSelectRegion(data.dataUrl, bbox)
    } catch {
      setError('Failed to load image for crop')
    }
  }

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={e => e.stopPropagation()} style={modalStyle}>
        {/* Search bar + tabs */}
        <div style={searchBarStyle}>
          <span style={{ color: '#666', fontSize: 14 }}>🖼</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search images..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 15 }}
          />
          <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: 2 }}>
            {(['folders', 'palace'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '3px 12px', borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: tab === t ? 'rgba(74,158,255,0.3)' : 'transparent',
                  color: tab === t ? '#4a9eff' : '#666', fontSize: 11,
                  textTransform: 'capitalize',
                }}
              >{t}</button>
            ))}
          </div>
          {tab === 'folders' && (
            <button
              onClick={() => setShowManage(s => !s)}
              style={{
                background: showManage ? 'rgba(74,158,255,0.2)' : 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6, padding: '4px 10px',
                color: '#aaa', fontSize: 11, cursor: 'pointer',
              }}
            >Manage</button>
          )}
          <span style={{ color: '#444', fontSize: 11 }}>Esc</span>
        </div>

        {/* Manage panel */}
        {tab === 'folders' && showManage && (
          <ManageFolders folders={folders} onChanged={fetchFolders} />
        )}

        {/* Filter bar */}
        {tab === 'folders' ? (
          visibleFolders.length > 0 && (
            <div style={filterBarStyle}>
              {visibleFolders.map(folder => (
                <button
                  key={folder.name}
                  onClick={() => toggleFolderSet(activeFolders, setActiveFolders, folder.name)}
                  style={chipStyle(activeFolders.has(folder.name))}
                >
                  {folder.name}
                  <span style={{ opacity: 0.5, marginLeft: 4 }}>{folder.imageCount}</span>
                  {folder.tags.length > 0 && (
                    <span style={{ opacity: 0.3, marginLeft: 4 }}>#{folder.tags.join(' #')}</span>
                  )}
                </button>
              ))}
            </div>
          )
        ) : (
          <div style={filterBarStyle}>
            <span style={{ color: '#555', fontSize: 11 }}>Distance:</span>
            {[1, 2, 3, 5].map(d => (
              <button
                key={d}
                onClick={() => setDistance(d)}
                style={chipStyle(distance === d)}
              >{d === 5 ? '5+' : d}</button>
            ))}
            <span style={{ color: '#555', fontSize: 11, marginLeft: 8 }}>
              {palaceImages.length} images in {distance}-hop range
            </span>
          </div>
        )}

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {error && (
            <div style={{ color: '#ff5555', fontSize: 13, textAlign: 'center', padding: 24 }}>
              {error}
              <button onClick={() => { setError(null); fetchFolders() }} style={{ marginLeft: 12, color: '#4a9eff', background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button>
            </div>
          )}

          {tab === 'folders' && !loading && !error && folders.length === 0 && (
            <EmptyState text='No folders configured. Click "Manage" to add image folders.' />
          )}

          {tab === 'folders' && !loading && !error && filteredFolderImages.length === 0 && folders.length > 0 && (
            <EmptyState text="No images found." />
          )}

          {tab === 'palace' && !error && filteredPalaceImages.length === 0 && (
            <EmptyState text="No images found in nearby scenes. Try increasing the distance." />
          )}

          {/* Folder grid */}
          {tab === 'folders' && !loading && !error && filteredFolderImages.length > 0 && (
            <Grid>
              {filteredFolderImages.map(image => {
                const regions = folderRegions.get(image.path)
                const isExpanded = expandedIds.has(image.path)
                const isSegmenting = segmentingIds.has(image.path)
                return (
                  <ImageCard
                    key={image.path}
                    thumbnailUrl={`${SERVER}/thumbnail?path=${encodeURIComponent(image.path)}`}
                    title={image.filename}
                    subtitle={image.subfolder || undefined}
                    regions={regions}
                    isExpanded={isExpanded}
                    isSegmenting={isSegmenting}
                    onToggleExpand={() => toggleExpand(image.path)}
                    onSegment={() => handleSegmentFolder(image.path)}
                    onSelect={() => handleSelectFolderImage(image.path)}
                    onSelectRegion={(bbox) => handleSelectFolderRegion(image.path, bbox)}
                  />
                )
              })}
            </Grid>
          )}

          {/* Palace grid */}
          {tab === 'palace' && !error && filteredPalaceImages.length > 0 && (
            <Grid>
              {filteredPalaceImages.map(({ element, sceneName }) => {
                const regions = element.segmentRegions
                const isExpanded = expandedIds.has(element.id)
                return (
                  <ImageCard
                    key={element.id}
                    thumbnailUrl={element.assetUrl}
                    title={sceneName}
                    subtitle={undefined}
                    regions={regions}
                    isExpanded={isExpanded}
                    isSegmenting={false}
                    onToggleExpand={() => toggleExpand(element.id)}
                    onSelect={() => handleSelectPalaceImage(element.assetUrl)}
                    onSelectRegion={(bbox) => handleSelectRegion(element.assetUrl, bbox)}
                  />
                )
              })}
            </Grid>
          )}
        </div>

        {/* Scene tags indicator */}
        {sceneTags.length > 0 && (
          <div style={{ padding: '6px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 10, color: '#555' }}>
            Scene tags: {sceneTags.map(t => `#${t}`).join(' ')}
          </div>
        )}
      </div>
    </div>
  )
}

// --- ImageCard with expandable regions ---

function ImageCard({ thumbnailUrl, title, subtitle, regions, isExpanded, isSegmenting, onToggleExpand, onSegment, onSelect, onSelectRegion }: {
  thumbnailUrl: string
  title: string
  subtitle?: string
  regions?: SegmentRegion[]
  isExpanded: boolean
  isSegmenting: boolean
  onToggleExpand: () => void
  onSegment?: () => void
  onSelect: () => void
  onSelectRegion: (bbox: BBox) => void
}) {
  const hasRegions = regions && regions.length > 0

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
      <div
        onClick={onSelect}
        style={{ cursor: 'pointer', position: 'relative', transition: 'transform 0.1s' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <img
          src={thumbnailUrl}
          loading="lazy"
          style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
          draggable={false}
        />
        {/* Region badge / segment button */}
        {hasRegions ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand() }}
            style={badgeStyle(isExpanded)}
          >{regions!.length}▦</button>
        ) : isSegmenting ? (
          <div style={badgeStyle(false)}>...</div>
        ) : onSegment && (
          <button
            onClick={(e) => { e.stopPropagation(); onSegment() }}
            style={segBtnStyle}
            title="Segment this image"
          >✂</button>
        )}
      </div>
      <div style={{ padding: '4px 6px' }}>
        <div style={{ color: '#aaa', fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {subtitle && <div style={{ color: '#555', fontSize: 9 }}>{subtitle}</div>}
      </div>
      {/* Expanded regions */}
      {isExpanded && hasRegions && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
          padding: '6px', background: 'rgba(0,0,0,0.3)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          {regions!.map((region, i) => (
            <div
              key={region.id}
              onClick={() => onSelectRegion(region.boundingBox)}
              style={{
                cursor: 'pointer', borderRadius: 4,
                border: '1px solid rgba(74,158,255,0.3)',
                background: 'rgba(74,158,255,0.1)',
                padding: '6px 4px', textAlign: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,158,255,0.25)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,158,255,0.1)' }}
              title={`Add: ${region.label || 'Region ' + (i + 1)}`}
            >
              <div style={{ color: '#4a9eff', fontSize: 16 }}>▦</div>
              <div style={{ color: '#8899bb', fontSize: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {region.label || `R${i + 1}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Manage Folders ---

function ManageFolders({ folders, onChanged }: { folders: ServerFolder[]; onChanged: () => void }) {
  const [newName, setNewName] = useState('')
  const [newPath, setNewPath] = useState('')
  const [newTags, setNewTags] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newName || !newPath) return
    setAdding(true)
    setError(null)
    try {
      const res = await fetch(`${SERVER}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, path: newPath, tags: newTags.split(/\s+/).filter(Boolean) }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to add folder')
      }
      setNewName(''); setNewPath(''); setNewTags('')
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (name: string) => {
    await fetch(`${SERVER}/folders/${encodeURIComponent(name)}`, { method: 'DELETE' })
    onChanged()
  }

  const handleUpdateTags = async (name: string, tags: string) => {
    await fetch(`${SERVER}/folders/${encodeURIComponent(name)}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: tags.split(/\s+/).filter(Boolean) }),
    })
    onChanged()
  }

  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', maxHeight: 250, overflowY: 'auto' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" style={inputStyle} />
        <input value={newPath} onChange={e => setNewPath(e.target.value)} placeholder="/path/to/folder" style={{ ...inputStyle, flex: 2 }} />
        <input value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="tags" style={{ ...inputStyle, flex: 1.5 }} />
        <button onClick={handleAdd} disabled={adding || !newName || !newPath} style={addBtnStyle}>+</button>
      </div>
      {error && <div style={{ color: '#ff5555', fontSize: 11, marginBottom: 6 }}>{error}</div>}
      {folders.map(folder => (
        <div key={folder.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 11 }}>
          <span style={{ color: '#ddd', minWidth: 80 }}>{folder.name}</span>
          <span style={{ color: '#555', flex: 1, fontSize: 10 }}>{folder.path}</span>
          <input
            defaultValue={folder.tags.join(' ')}
            onBlur={e => { if (e.target.value !== folder.tags.join(' ')) handleUpdateTags(folder.name, e.target.value) }}
            placeholder="tags"
            style={{ ...inputStyle, width: 120, fontSize: 10 }}
          />
          <span style={{ color: '#444' }}>{folder.imageCount}</span>
          <button onClick={() => handleRemove(folder.name)} style={{ background: 'none', border: 'none', color: '#ff5555', cursor: 'pointer', fontSize: 13 }}>×</button>
        </div>
      ))}
    </div>
  )
}

// --- Helpers & styles ---

function toggleFolderSet(_set: Set<string>, setter: (fn: (prev: Set<string>) => Set<string>) => void, name: string) {
  setter(prev => { const n = new Set(prev); if (n.has(name)) n.delete(name); else n.add(name); return n })
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
      {children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ color: '#555', fontSize: 13, textAlign: 'center', padding: 24 }}>{text}</div>
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  paddingTop: 60, zIndex: 500,
}

const modalStyle: React.CSSProperties = {
  width: 720, maxHeight: '80vh',
  background: 'rgba(20,20,35,0.98)',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.15)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden',
}

const searchBarStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  display: 'flex', alignItems: 'center', gap: 8,
}

const filterBarStyle: React.CSSProperties = {
  display: 'flex', gap: 6, padding: '8px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  flexWrap: 'wrap', alignItems: 'center',
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '4px 10px', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: active ? 'rgba(74,158,255,0.2)' : 'rgba(255,255,255,0.05)',
    color: active ? '#4a9eff' : '#888',
    fontSize: 11, cursor: 'pointer', transition: 'all 0.15s',
  }
}

function badgeStyle(active: boolean): React.CSSProperties {
  return {
    position: 'absolute', top: 4, right: 4,
    padding: '2px 6px', borderRadius: 4,
    background: active ? 'rgba(74,158,255,0.8)' : 'rgba(0,0,0,0.7)',
    color: '#fff', fontSize: 10, cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.2)',
  }
}

const segBtnStyle: React.CSSProperties = {
  position: 'absolute', top: 4, right: 4,
  padding: '2px 6px', borderRadius: 4,
  background: 'rgba(0,0,0,0.7)',
  color: '#aaa', fontSize: 11, cursor: 'pointer',
  border: '1px solid rgba(255,255,255,0.2)',
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 4, padding: '4px 8px',
  color: '#ddd', fontSize: 11, outline: 'none',
}

const addBtnStyle: React.CSSProperties = {
  background: 'rgba(74,158,255,0.2)',
  border: '1px solid rgba(74,158,255,0.3)',
  borderRadius: 4, color: '#4a9eff',
  cursor: 'pointer', padding: '4px 12px', fontSize: 14,
}
