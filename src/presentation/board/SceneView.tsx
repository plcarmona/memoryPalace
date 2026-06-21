import { useRef, useCallback, useState, useEffect } from 'react'
import { PalaceNode, PalaceElement, SegmentRegion } from '../../domain/models'
import { usePalaceStore } from '../../stores/palaceStore'
import { useCameraStore } from '../../stores/cameraStore'
import { useUIStore } from '../../stores/uiStore'
import { beginTrackedDrag } from '../../application/dragHistory'

const BASE_WIDTH = 200
const BASE_FONT = 14

interface SceneViewProps {
  scene: PalaceNode
  allNodes: PalaceNode[]
}

export function SceneView({ scene, allNodes }: SceneViewProps) {
  const children = allNodes.filter(n =>
    n.parentId === scene.id &&
    !scene.elements.some(e => e.link?.targetNodeId === n.id)
  )

  return (
    <div style={{ position: 'absolute', left: scene.position[0] - 500, top: scene.position[1] - 400 }}>
      <div style={{
        width: 1000,
        height: 800,
        background: 'rgba(15,15,25,0.5)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 12, left: 16,
          color: 'rgba(255,255,255,0.2)', fontSize: 14, fontWeight: 600,
          pointerEvents: 'none',
        }}>
          {scene.label}
        </div>
        {scene.elements.map(el => (
          <ElementItem key={el.id} element={el} />
        ))}
        {children.map(child => (
          <ChildSceneCard key={child.id} node={child} allNodes={allNodes} />
        ))}
      </div>
    </div>
  )
}

const CARD_BASE = 150

function ChildSceneCard({ node, allNodes }: { node: PalaceNode; allNodes: PalaceNode[] }) {
  const { removeNode, moveNode, renameNode, scaleNode, currentSceneId } = usePalaceStore()
  const { navigateToScene } = useCameraStore()
  const [hovered, setHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(node.label)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const startPos = useRef({ x: 0, y: 0 })

  const ns = node.scale || 1
  const cardW = CARD_BASE * ns
  const thumbH = 80 * ns

  const childCount = allNodes.filter(n => n.parentId === node.id).length
  const imageEl = node.elements.find(e => e.type === 'image-plane')
  const px = node.position[0]
  const py = node.position[1]

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (isDragging.current) return
    navigateToScene(node.id)
  }, [node.id, navigateToScene])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setEditLabel(node.label)
  }, [node.label])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault()
      e.stopPropagation()
      isDragging.current = false
      dragStart.current = { x: e.clientX, y: e.clientY }
      startPos.current = { x: node.position[0], y: node.position[1] }

      // Coalesce drag into single undo entry
      const dragSession = beginTrackedDrag()

      const handleMove = (ev: MouseEvent) => {
        const dx = ev.clientX - dragStart.current.x
        const dy = ev.clientY - dragStart.current.y
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.current = true
        const zoom = useCameraStore.getState().viewport.zoom
        moveNode(node.id, [startPos.current.x + dx / zoom, startPos.current.y + dy / zoom, 0])
      }
      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
        setTimeout(() => { isDragging.current = false }, 50)
        dragSession.end()
      }
      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
    }
  }, [node.id, node.position, moveNode])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const startScale = node.scale || 1

    // Coalesce resize into single undo entry
    const dragSession = beginTrackedDrag()

    const handleMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX
      const zoom = useCameraStore.getState().viewport.zoom
      const delta = dx / (CARD_BASE * zoom)
      const newScale = Math.max(0.4, Math.min(4, startScale + delta))
      scaleNode(node.id, newScale)
    }
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      dragSession.end()
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [node.id, node.scale, scaleNode])

  const handleLabelSubmit = () => {
    renameNode(node.id, editLabel)
    setIsEditing(false)
  }

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left: 500 + px - cardW / 2,
        top: 400 + py - (thumbH + 40) / 2,
        width: cardW,
        background: hovered ? 'rgba(30,30,50,0.95)' : 'rgba(20,20,35,0.9)',
        border: `1px solid ${currentSceneId === node.id ? '#4a9eff' : 'rgba(255,255,255,0.15)'}`,
        borderRadius: 10,
        cursor: 'pointer',
        overflow: 'visible',
        boxShadow: hovered ? '0 4px 20px rgba(74,158,255,0.2)' : '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); removeNode(node.id) }}
          style={{
            position: 'absolute', top: 4, right: 4, zIndex: 10,
            background: 'rgba(255,68,68,0.7)', border: 'none', borderRadius: 4,
            color: '#fff', cursor: 'pointer', fontSize: 11, padding: '2px 6px',
          }}
        >×</button>
      )}
      <div style={{ width: '100%', height: thumbH, overflow: 'hidden', borderRadius: '10px 10px 0 0' }}>
        {imageEl ? (
          <img src={imageEl.assetUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, rgba(74,158,255,0.15), rgba(100,60,200,0.15))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28 * ns, opacity: 0.4,
          }}>◈</div>
        )}
      </div>
      <div style={{ padding: `${8 * ns}px ${10 * ns}px` }}>
        {isEditing ? (
          <input
            value={editLabel}
            onChange={e => setEditLabel(e.target.value)}
            onBlur={handleLabelSubmit}
            onKeyDown={e => { if (e.key === 'Enter') handleLabelSubmit() }}
            onClick={e => e.stopPropagation()}
            autoFocus
            style={{
              width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none',
              color: '#fff', fontSize: 12 * ns, padding: '2px 4px', borderRadius: 3, outline: 'none',
            }}
          />
        ) : (
          <div style={{ color: '#ddd', fontSize: 12 * ns, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {node.label}
          </div>
        )}
        {childCount > 0 && (
          <div style={{ color: '#888', fontSize: 10 * ns, marginTop: 2 }}>
            {childCount} sub-scene{childCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
      {hovered && (
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute', bottom: -6, right: -6,
            width: 12, height: 12, background: '#ffff00', borderRadius: 2,
            cursor: 'nwse-resize', border: '1px solid rgba(0,0,0,0.4)', zIndex: 10,
          }}
        />
      )}
    </div>
  )
}

interface ElementItemProps {
  element: PalaceElement
}

function ElementItem({ element }: ElementItemProps) {
  const { selectedElementId, selectedElementIds, setSelectedElement, toggleElementSelection, transformElement, removeElement, selectedRegionId, setSelectedRegion, nodes, currentSceneId } = usePalaceStore()
  const { navigateToLinkedElement, navigateToScene } = useCameraStore()
  const { editMode } = useUIStore()
  const isSelected = selectedElementIds.includes(element.id)
  const isLocked = !!element.locked
  const isGrouped = !!element.groupId
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const startPos = useRef({ x: 0, y: 0 })
  const groupStartPos = useRef<Map<string, { x: number, y: number }>>(new Map())
  const [isEditingText, setIsEditingText] = useState(false)
  const [textValue, setTextValue] = useState(element.assetUrl)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)

  const scale = element.scale[0] || 1
  const displayWidth = BASE_WIDTH * scale

  useEffect(() => {
    if (element.type === 'image-plane') {
      const img = new Image()
      img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
      img.src = element.assetUrl
    }
  }, [element.assetUrl, element.type])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (isDragging.current) return
    if (element.link && !e.shiftKey && !editMode) {
      navigateToLinkedElement(element.id)
    } else if (e.shiftKey) {
      toggleElementSelection(element.id)
    } else {
      setSelectedElement(element.id)
    }
  }, [element.id, element.link, navigateToLinkedElement, setSelectedElement, toggleElementSelection, editMode])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (element.type === 'text') {
      setIsEditingText(true)
      setTextValue(element.assetUrl)
    }
  }, [element.type, element.assetUrl])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && !isEditingText && !isLocked) {
      e.stopPropagation()
      isDragging.current = false
      dragStart.current = { x: e.clientX, y: e.clientY }
      startPos.current = { x: element.position[0], y: element.position[1] }

      const groupSiblings = element.groupId
        ? nodes.filter(n => n.id === currentSceneId).flatMap(n => n.elements)
            .filter(el => el.groupId === element.groupId)
        : []

      groupStartPos.current = new Map()
      for (const el of groupSiblings) {
        groupStartPos.current.set(el.id, { x: el.position[0], y: el.position[1] })
      }

      // Coalesce this drag into a single undo entry
      const dragSession = beginTrackedDrag()

      const handleMove = (ev: MouseEvent) => {
        const dx = ev.clientX - dragStart.current.x
        const dy = ev.clientY - dragStart.current.y
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.current = true
        const zoom = useCameraStore.getState().viewport.zoom
        const deltaX = dx / zoom
        const deltaY = dy / zoom

        for (const [elId, start] of groupStartPos.current) {
          const el = groupSiblings.find(e => e.id === elId)
          if (!el || el.locked) continue
          transformElement(elId, {
            position: [start.x + deltaX, start.y + deltaY, 0],
            rotation: el.rotation,
            scale: el.scale,
          })
        }
        if (groupStartPos.current.size === 0) {
          transformElement(element.id, {
            position: [startPos.current.x + deltaX, startPos.current.y + deltaY, 0],
            rotation: element.rotation,
            scale: element.scale,
          })
        }
      }
      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
        setTimeout(() => { isDragging.current = false }, 50)
        dragSession.end()
      }
      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
    }
  }, [element.id, element.position, element.rotation, element.scale, element.groupId, element.locked, transformElement, isEditingText, isLocked, nodes, currentSceneId])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (isLocked) return
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const startScale = element.scale[0] || 1

    // Coalesce resize into a single undo entry
    const dragSession = beginTrackedDrag()

    const handleMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX
      const zoom = useCameraStore.getState().viewport.zoom
      const delta = dx / (BASE_WIDTH * zoom)
      const newScale = Math.max(0.2, Math.min(5, startScale + delta))
      transformElement(element.id, {
        position: element.position,
        rotation: element.rotation,
        scale: [newScale, newScale, 1],
      })
    }
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      dragSession.end()
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [element.id, element.position, element.rotation, element.scale, transformElement, isLocked])

  const handleRegionClick = useCallback((e: React.MouseEvent, region: SegmentRegion) => {
    e.stopPropagation()
    if (isDragging.current) return
    if (region.link && !editMode) {
      navigateToScene(region.link.targetNodeId)
    } else {
      setSelectedElement(element.id)
      setSelectedRegion(region.id)
    }
  }, [element.id, navigateToLinkedElement, setSelectedElement, setSelectedRegion, editMode])

  const px = element.position[0]
  const py = element.position[1]

  const borderColor = isLocked ? '#ff8844'
    : isSelected ? '#ffff00'
    : element.link ? '#4a9eff'
    : isGrouped ? '#aa44cc'
    : 'transparent'
  const borderStyle = isGrouped ? 'dashed' : 'solid'

  const resizeHandle = isSelected && !isEditingText && !isLocked ? (
    <div
      onMouseDown={handleResizeStart}
      style={{
        position: 'absolute', bottom: -6, right: -6,
        width: 12, height: 12, background: '#ffff00', borderRadius: 2,
        cursor: 'nwse-resize', border: '1px solid rgba(0,0,0,0.4)', zIndex: 10,
      }}
    />
  ) : null

  const lockBadge = isLocked ? (
    <div style={{
      position: 'absolute', top: -10, left: -10,
      width: 20, height: 20, borderRadius: '50%',
      background: '#ff8844', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, zIndex: 10, cursor: 'pointer',
      border: '1px solid rgba(0,0,0,0.4)',
    }}
      onClick={e => { e.stopPropagation(); usePalaceStore.getState().toggleLock(element.id) }}
    >🔒</div>
  ) : null

  if (element.type === 'image-plane') {
    const regions = element.segmentRegions || []
    const hasRegions = regions.length > 0

    return (
      <div
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onKeyDown={e => { if ((e.key === 'Delete' || e.key === 'Backspace') && isSelected) removeElement(element.id) }}
        tabIndex={0}
        style={{
          position: 'absolute',
          left: 500 + px - displayWidth / 2,
          top: 400 + py - displayWidth / 2,
          width: displayWidth,
          cursor: isLocked ? 'default' : 'grab',
          outline: 'none',
          border: `2px ${borderStyle} ${borderColor}`,
          borderRadius: 4,
          overflow: 'visible',
          boxShadow: element.link ? '0 0 12px rgba(74,158,255,0.4)' : 'none',
          opacity: isLocked ? 0.85 : 1,
        }}
      >
        {lockBadge}
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 2 }}>
          <img src={element.assetUrl} style={{ width: '100%', display: 'block' }} draggable={false} />

          {hasRegions && imgSize.w > 0 && regions.map(region => {
            const left = (region.boundingBox[0] / imgSize.w) * 100
            const top = (region.boundingBox[1] / imgSize.h) * 100
            const w = (region.boundingBox[2] / imgSize.w) * 100
            const h = (region.boundingBox[3] / imgSize.h) * 100
            const isRegionHovered = hoveredRegion === region.id
            const isRegionSelected = selectedRegionId === region.id && selectedElementId === element.id
            const isLinked = !!region.link

            return (
              <div
                key={region.id}
                onClick={e => handleRegionClick(e, region)}
                onMouseEnter={() => setHoveredRegion(region.id)}
                onMouseLeave={() => setHoveredRegion(null)}
                style={{
                  position: 'absolute',
                  left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%`,
                  border: isRegionSelected ? '2px solid #ffff00'
                    : isLinked ? '2px solid #4a9eff'
                    : isRegionHovered ? '2px solid rgba(255,255,255,0.7)'
                    : '1px solid rgba(255,255,255,0.2)',
                  background: isRegionHovered || isRegionSelected ? 'rgba(255,255,0,0.15)' : isLinked ? 'rgba(74,158,255,0.1)' : 'transparent',
                  cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                {isLinked && (
                  <div style={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: '50%', background: '#4a9eff' }} />
                )}
              </div>
            )
          })}
        </div>

        {element.hiddenContent && !element.contentRevealed && (
          <div style={{ position: 'absolute', bottom: 6, right: 6, width: 10, height: 10, borderRadius: '50%', background: '#44ff88' }} />
        )}
        {resizeHandle}
      </div>
    )
  }

  if (element.type === 'text') {
    const saveText = () => {
      usePalaceStore.setState(s => ({
        nodes: s.nodes.map(n => ({
          ...n,
          elements: n.elements.map(e =>
            e.id === element.id ? { ...e, assetUrl: textValue } : e
          ),
        })),
      }))
      setIsEditingText(false)
    }

    return (
      <div
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onKeyDown={e => { if ((e.key === 'Delete' || e.key === 'Backspace') && isSelected && !isEditingText) removeElement(element.id) }}
        tabIndex={0}
        style={{
          position: 'absolute',
          left: 500 + px - displayWidth / 2,
          top: 400 + py - BASE_FONT * scale,
          width: displayWidth,
          cursor: isEditingText ? 'text' : isLocked ? 'default' : 'grab',
          outline: 'none',
          border: `1px ${borderStyle} ${borderColor}`,
          borderRadius: 4,
        }}
      >
        {lockBadge}
        {isEditingText ? (
          <textarea
            value={textValue}
            onChange={e => setTextValue(e.target.value)}
            onBlur={saveText}
            onKeyDown={e => { if (e.key === 'Escape') saveText() }}
            autoFocus
            style={{
              width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontSize: BASE_FONT * scale, padding: '4px 6px', borderRadius: 4, outline: 'none',
              resize: 'none', minHeight: 28, fontFamily: 'inherit',
            }}
          />
        ) : (
          <div style={{ color: '#ddd', fontSize: BASE_FONT * scale, padding: '4px 6px', whiteSpace: 'pre-wrap', minHeight: 20 }}>
            {element.assetUrl || 'Double-click to edit...'}
          </div>
        )}
        {resizeHandle}
      </div>
    )
  }

  return null
}
