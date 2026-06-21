import { useRef, useState } from 'react'
import { useStore } from 'zustand'
import { usePalaceStore } from '../../stores/palaceStore'
import { useCameraStore } from '../../stores/cameraStore'
import { useUIStore } from '../../stores/uiStore'
import { GenerationUseCase } from '../../application/GenerationUseCase'
import { SDXLGenerator } from '../../infrastructure/generation/SDXLGenerator'
import { IndexedDBPersistence } from '../../infrastructure/persistence/IndexedDBPersistence'
import { ExportUseCase } from '../../application/ExportUseCase'

interface ToolbarProps {
  onLinkCommand: () => void
  onShowSnapshots: () => void
}

export function Toolbar({ onLinkCommand, onShowSnapshots }: ToolbarProps) {
  const { nodes, currentSceneId, addNode, removeNode, clearAll, isLoaded, selectedElementId, selectedRegionId, setNodeTags, moveElementForward, moveElementBackward, bringElementToFront, sendElementToBack } = usePalaceStore()
  const undoSteps = useStore(usePalaceStore.temporal, s => s.pastStates.length)
  const redoSteps = useStore(usePalaceStore.temporal, s => s.futureStates.length)
  const { goHome } = useCameraStore()
  const { editMode, setEditMode, setShowImagePicker } = useUIStore()
  const [showGenForm, setShowGenForm] = useState(false)
  const [genPrompt, setGenPrompt] = useState('')
  const [genStatus, setGenStatus] = useState<string | null>(null)
  const [segStatus, setSegStatus] = useState<string | null>(null)
  const [ioStatus, setIoStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const currentScene = nodes.find(n => n.id === currentSceneId)
  const selectedElement = currentScene?.elements.find(e => e.id === selectedElementId)
  const canSegment = selectedElement?.type === 'image-plane'
  const selectedIndex = selectedElement
    ? currentScene?.elements.findIndex(e => e.id === selectedElement.id) ?? -1
    : -1
  const sceneElementCount = currentScene?.elements.length ?? 0
  const canMoveBack = selectedIndex > 0
  const canMoveForward = selectedIndex >= 0 && selectedIndex < sceneElementCount - 1

  const handleSegment = async () => {
    if (!selectedElement) return
    setSegStatus('Segmenting...')
    try {
      const { SegmentationUseCase } = await import('../../application/SegmentationUseCase')
      const useCase = new SegmentationUseCase(
        () => usePalaceStore.getState().nodes,
        (nodes) => usePalaceStore.setState({ nodes }),
        (sceneId, type, url, pos) => usePalaceStore.getState().addElementToScene(sceneId, type, url, pos),
        (sceneId, elId) => usePalaceStore.getState().removeElementFromScene(sceneId, elId),
      )
      await useCase.segment(selectedElement.id)
      setSegStatus('Done!')
      setTimeout(() => setSegStatus(null), 1500)
    } catch (err) {
      setSegStatus(`Error: ${err instanceof Error ? err.message : 'Unknown'}`)
      setTimeout(() => setSegStatus(null), 3000)
    }
  }

  const handleAddScene = () => {
    const parentId = currentSceneId ?? null
    const existing = usePalaceStore.getState().nodes
    const angle = Math.random() * Math.PI * 2
    const radius = 300 + Math.random() * 200
    const baseX = parentId ? (existing.find(n => n.id === parentId)?.position[0] ?? 0) : 0
    const baseY = parentId ? (existing.find(n => n.id === parentId)?.position[1] ?? 0) : 0
    const x = baseX + Math.cos(angle) * radius
    const y = baseY + Math.sin(angle) * radius
    const newId = addNode('New Scene', parentId, [x, y, 0])
    const { selectedElementId } = usePalaceStore.getState()
    if (selectedElementId) {
      usePalaceStore.getState().linkElement(selectedElementId, newId)
    }
  }

  const handleDeleteScene = () => {
    if (!currentSceneId) return
    removeNode(currentSceneId)
    goHome()
  }

  const handleGenerate = async () => {
    if (!currentSceneId || !genPrompt.trim()) return
    setGenStatus('Generating...')
    try {
      const useCase = new GenerationUseCase(
        new SDXLGenerator(),
        new IndexedDBPersistence(),
        () => usePalaceStore.getState().nodes,
        (nodes) => usePalaceStore.setState({ nodes }),
        () => usePalaceStore.getState().currentSceneId
      )
      const position: [number, number, number] = [
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        0,
      ]
      await useCase.generateAndPlace(genPrompt, currentSceneId, position)
      setGenStatus('Done!')
      setGenPrompt('')
      setTimeout(() => { setGenStatus(null); setShowGenForm(false) }, 1500)
    } catch (err) {
      setGenStatus(`Error: ${err instanceof Error ? err.message : 'Unknown'}`)
    }
  }

  const handleAddText = () => {
    const position: [number, number, number] = [
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      0,
    ]
    usePalaceStore.getState().addElement('text', 'New text', position)
  }

  const handleExport = async () => {
    setIoStatus('Exporting...')
    try {
      const useCase = new ExportUseCase()
      const blob = await useCase.exportPalace(usePalaceStore.getState().nodes)
      const today = new Date().toISOString().slice(0, 10)
      ExportUseCase.download(blob, `memory-palace-${today}.zip`)
      setIoStatus('Exported!')
      setTimeout(() => setIoStatus(null), 1500)
    } catch (err) {
      setIoStatus(`Error: ${err instanceof Error ? err.message : 'Unknown'}`)
      setTimeout(() => setIoStatus(null), 3000)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // allow re-importing same file
    setIoStatus('Importing...')
    try {
      const useCase = new ExportUseCase()
      const nodes = await useCase.importPalace(file)
      usePalaceStore.getState().setNodes(nodes)
      usePalaceStore.temporal.getState().clear()
      setIoStatus('Imported!')
      setTimeout(() => setIoStatus(null), 1500)
    } catch (err) {
      setIoStatus(`Error: ${err instanceof Error ? err.message : 'Unknown'}`)
      setTimeout(() => setIoStatus(null), 3000)
    }
  }

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 48,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 8, zIndex: 100,
    }}>
      <button onClick={goHome} style={btn}>Home</button>
      <button
        onClick={() => usePalaceStore.temporal.getState().undo()}
        disabled={undoSteps === 0}
        title="Undo (Ctrl/Cmd+Z)"
        style={{ ...btn, opacity: undoSteps === 0 ? 0.4 : 1, fontSize: 14 }}
      >↶</button>
      <button
        onClick={() => usePalaceStore.temporal.getState().redo()}
        disabled={redoSteps === 0}
        title="Redo (Ctrl/Cmd+Shift+Z)"
        style={{ ...btn, opacity: redoSteps === 0 ? 0.4 : 1, fontSize: 14 }}
      >↷</button>
      <button onClick={onShowSnapshots} title="Snapshots" style={btn}>💾</button>
      <button onClick={handleAddScene} style={btn}>+ Scene</button>

      <button
        onClick={() => {
          if (nodes.length > 0 && !confirm('Clear all scenes and start a new palace?')) return
          clearAll()
        }}
        style={{ ...btn, background: 'rgba(255,255,255,0.05)', color: '#888' }}
      >New Palace</button>

      {currentSceneId && (
        <>
          <button onClick={() => {
            if (selectedElementId) {
              onLinkCommand()
            } else {
              setShowImagePicker(true)
            }
          }} style={btn}>+ Image <span style={{ color: '#666', fontSize: 9 }}>I</span></button>
          <button onClick={handleAddText} style={btn}>+ Text</button>

          <button onClick={() => setEditMode(!editMode)} style={{
            ...btn, background: editMode ? '#4a9eff' : 'rgba(255,255,255,0.1)',
          }}>{editMode ? 'Editing' : 'Edit'}</button>

          <button onClick={handleDeleteScene} style={{ ...btn, background: 'rgba(255,68,68,0.2)' }}>🗑</button>

          {currentScene && !selectedElement && (
            <input
              defaultValue={(currentScene.metadata?.tags || []).join(' ')}
              onBlur={e => {
                const tags = e.target.value.trim().split(/\s+/).filter(Boolean)
                const existing = currentScene.metadata?.tags || []
                if (tags.join(' ') !== existing.join(' ')) {
                  setNodeTags(currentScene.id, tags)
                }
              }}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              placeholder="scene tags..."
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4,
                padding: '4px 8px',
                color: '#888',
                fontSize: 11,
                width: 140,
                outline: 'none',
              }}
            />
          )}

          {selectedElement && (
            <>
              {sceneElementCount > 1 && (
                <>
                  <button
                    onClick={() => sendElementToBack(selectedElement.id)}
                    disabled={!canMoveBack}
                    title="Send to back (Shift+[)"
                    style={{ ...btn, fontSize: 11, opacity: canMoveBack ? 1 : 0.4, background: 'rgba(255,255,255,0.05)' }}
                  >⤓</button>
                  <button
                    onClick={() => moveElementBackward(selectedElement.id)}
                    disabled={!canMoveBack}
                    title="Move down ([)"
                    style={{ ...btn, fontSize: 11, opacity: canMoveBack ? 1 : 0.4, background: 'rgba(255,255,255,0.05)' }}
                  >↓</button>
                  <button
                    onClick={() => moveElementForward(selectedElement.id)}
                    disabled={!canMoveForward}
                    title="Move up (])"
                    style={{ ...btn, fontSize: 11, opacity: canMoveForward ? 1 : 0.4, background: 'rgba(255,255,255,0.05)' }}
                  >↑</button>
                  <button
                    onClick={() => bringElementToFront(selectedElement.id)}
                    disabled={!canMoveForward}
                    title="Bring to front (Shift+])"
                    style={{ ...btn, fontSize: 11, opacity: canMoveForward ? 1 : 0.4, background: 'rgba(255,255,255,0.05)' }}
                  >⤒</button>
                </>
              )}

              {canSegment && (
                <button onClick={() => handleSegment()} disabled={!!segStatus} style={{
                  ...btn,
                  background: segStatus ? '#666' : 'rgba(255,255,255,0.1)',
                  fontSize: 11,
                  opacity: segStatus ? 0.7 : 1,
                }}>
                  {segStatus ?? '✂ Segment'} <span style={{ color: '#666', fontSize: 9 }}>S</span>
                </button>
              )}

              {(() => {
                const selectedRegion = selectedElement.segmentRegions?.find(r => r.id === selectedRegionId)
                if (selectedRegion) {
                  return (
                    <>
                      {selectedRegion.link && (
                        <button
                          onClick={() => {
                            const nodes = usePalaceStore.getState().nodes
                            if (selectedRegion.linkedElementId && selectedRegion.link) {
                              usePalaceStore.getState().removeElementFromScene(
                                selectedRegion.link.targetNodeId,
                                selectedRegion.linkedElementId
                              )
                            }
                            usePalaceStore.setState({
                              nodes: nodes.map(n => ({
                                ...n,
                                elements: n.elements.map(e =>
                                  e.id === selectedElement.id ? {
                                    ...e,
                                    segmentRegions: e.segmentRegions?.map(r =>
                                      r.id === selectedRegion.id
                                        ? { ...r, link: undefined, linkedElementId: undefined }
                                        : r
                                    )
                                  } : e
                                ),
                              })),
                            })
                            usePalaceStore.getState().setSelectedRegion(null)
                          }}
                          style={{ ...btn, background: 'rgba(255,255,255,0.05)', color: '#888', fontSize: 11 }}
                        >Unlink Region</button>
                      )}
                      <button onClick={onLinkCommand} style={{
                        ...btn,
                        background: selectedRegion.link ? '#2a6644' : 'rgba(255,255,255,0.1)',
                        fontSize: 11,
                      }}>{selectedRegion.link ? '🔗 Region Linked' : '🔗 Link Region'} <span style={{ color: '#666', fontSize: 9 }}>L</span></button>
                    </>
                  )
                }
                return (
                  <>
                    {selectedElement.link ? (
                      <button
                        onClick={() => {
                          usePalaceStore.setState(s => ({
                            nodes: s.nodes.map(n => ({
                              ...n,
                              elements: n.elements.map(e =>
                                e.id === selectedElement.id ? { ...e, link: undefined } : e
                              ),
                            })),
                          }))
                        }}
                        style={{ ...btn, background: 'rgba(255,255,255,0.05)', color: '#888', fontSize: 11 }}
                      >Unlink</button>
                    ) : null}
                    <button onClick={onLinkCommand} style={{
                      ...btn,
                      background: selectedElement.link ? '#2a6644' : 'rgba(255,255,255,0.1)',
                      fontSize: 11,
                    }}>{selectedElement.link ? '🔗 Linked' : '🔗 Link'} <span style={{ color: '#666', fontSize: 9 }}>L</span></button>
                  </>
                )
              })()}

            </>
          )}

          <button onClick={() => setShowGenForm(!showGenForm)} style={{
            ...btn, background: showGenForm ? '#ff8844' : 'rgba(255,255,255,0.1)',
          }}>🎨 Generate</button>
        </>
      )}

      <span style={{ color: '#888', marginLeft: 'auto', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        {!isLoaded && 'Loading...'}
        {isLoaded && `${nodes.length} scene${nodes.length !== 1 ? 's' : ''}`}
        <button
          onClick={handleExport}
          disabled={!!ioStatus && !ioStatus.startsWith('Import')}
          title="Export palace to .zip"
          style={{ ...btn, fontSize: 11, padding: '4px 10px', opacity: ioStatus?.startsWith('Export') ? 0.6 : 1 }}
        >{ioStatus?.startsWith('Export') ? ioStatus : 'Export'}</button>
        <button
          onClick={handleImportClick}
          disabled={!!ioStatus && !ioStatus.startsWith('Export')}
          title="Import palace from .zip"
          style={{ ...btn, fontSize: 11, padding: '4px 10px', opacity: ioStatus?.startsWith('Import') ? 0.6 : 1 }}
        >{ioStatus?.startsWith('Import') ? ioStatus : 'Import'}</button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          onChange={handleImportFile}
          style={{ display: 'none' }}
        />
        {isLoaded && currentSceneId && (
          <>
            {' · '}
            <input
              value={nodes.find(n => n.id === currentSceneId)?.label ?? ''}
              onChange={e => {
                const renameNode = usePalaceStore.getState().renameNode
                renameNode(currentSceneId, e.target.value)
              }}
              style={{
                background: 'transparent', border: 'none', color: '#ccc',
                fontSize: 12, width: 100, padding: 0, outline: 'none',
                borderBottom: '1px solid #444',
              }}
            />
          </>
        )}
      </span>

      {showGenForm && (
        <div style={{
          position: 'absolute', top: 48, right: 16,
          background: 'rgba(20,20,35,0.95)', borderRadius: 8, padding: 12,
          display: 'flex', gap: 8, zIndex: 200,
        }}>
          <input
            type="text"
            value={genPrompt}
            onChange={e => setGenPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            placeholder="Describe image..."
            style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 4, color: '#fff', padding: '6px 10px', width: 240, fontSize: 13,
            }}
          />
          <button onClick={handleGenerate} disabled={!!genStatus} style={{
            background: genStatus ? '#666' : '#ff8844', border: 'none', color: '#fff',
            padding: '6px 14px', borderRadius: 4, cursor: genStatus ? 'not-allowed' : 'pointer', fontSize: 13,
          }}>{genStatus ?? 'Go'}</button>
        </div>
      )}
    </div>
  )
}

const btn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.2)',
  color: '#fff',
  padding: '6px 14px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
}
