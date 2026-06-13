import { useState } from 'react'
import { useElementInteraction } from './useElementInteraction'
import { ElementProps } from './ElementFactory'
import { usePalaceStore } from '../../../stores/palaceStore'

interface SegmentRegion {
  x: number
  y: number
  width: number
  height: number
  maskUrl: string
  id: string
}

export function SegmentedElement({ element, isSelected, onSelect }: ElementProps) {
  const { handleClick, showPortalGlow, showContentIndicator, showHiddenIndicator } =
    useElementInteraction(element, isSelected, onSelect)
  const { addNode } = usePalaceStore()
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; segmentId: string } | null>(null)

  // Parse segment regions from element data
  const segments: SegmentRegion[] = element.segmentData ? [{
    id: 'seg-0',
    x: element.segmentData.boundingBox[0],
    y: element.segmentData.boundingBox[1],
    width: element.segmentData.boundingBox[2],
    height: element.segmentData.boundingBox[3],
    maskUrl: element.segmentData.maskUrl,
  }] : []

  const handleSegmentClick = (e: { stopPropagation: () => void }, segment: SegmentRegion) => {
    e.stopPropagation()
    setContextMenu({ x: segment.x, y: segment.y, segmentId: segment.id })
  }

  const handleExtractToScene = (segment: SegmentRegion) => {
    const parentId = element.link?.targetNodeId ?? null
    addNode(
      'Extracted Element',
      parentId,
      [segment.x, segment.y, 0]
    )
    setContextMenu(null)
  }

  return (
    <group position={element.position} rotation={element.rotation} scale={element.scale}>
      {/* Base image */}
      <mesh onClick={handleClick}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial color="#888888" />
      </mesh>

      {/* Segment overlays */}
      {segments.map(segment => (
        <mesh
          key={segment.id}
          position={[segment.x - 1, 1 - segment.y, 0.02]}
          onClick={(e) => handleSegmentClick(e, segment)}
          onPointerOver={() => setHoveredSegment(segment.id)}
          onPointerOut={() => setHoveredSegment(null)}
        >
          <planeGeometry args={[segment.width, segment.height]} />
          <meshBasicMaterial
            color={hoveredSegment === segment.id ? '#4a9eff' : '#ffffff'}
            transparent
            opacity={hoveredSegment === segment.id ? 0.25 : 0.05}
          />
        </mesh>
      ))}

      {/* Context menu for segment actions */}
      {contextMenu && (
        <group position={[0, 0, 0.1]}>
          <mesh onClick={() => setContextMenu(null)}>
            <planeGeometry args={[1.8, 0.4]} />
            <meshBasicMaterial color="#1a1a2e" transparent opacity={0.95} />
          </mesh>
          {/* Extract button */}
          <mesh
            position={[-0.4, 0, 0.01]}
            onClick={(e) => {
              e.stopPropagation()
              const seg = segments.find(s => s.id === contextMenu.segmentId)
              if (seg) handleExtractToScene(seg)
            }}
          >
            <planeGeometry args={[0.8, 0.2]} />
            <meshBasicMaterial color="#4a9eff" />
          </mesh>
        </group>
      )}

      {showPortalGlow && (
        <mesh>
          <planeGeometry args={[2.1, 2.1]} />
          <meshBasicMaterial color="#4a9eff" transparent opacity={0.15} />
        </mesh>
      )}

      {showContentIndicator && !showHiddenIndicator && (
        <mesh position={[0.8, 0.8, 0.05]}>
          <circleGeometry args={[0.1, 16]} />
          <meshBasicMaterial color="#44ff88" />
        </mesh>
      )}

      {showHiddenIndicator && (
        <mesh>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial color="#ff6644" transparent opacity={0.3} />
        </mesh>
      )}

      {isSelected && (
        <mesh>
          <planeGeometry args={[2.05, 2.05]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.08} wireframe />
        </mesh>
      )}
    </group>
  )
}
