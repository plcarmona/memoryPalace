import { Line, Html } from '@react-three/drei'
import { useState, useRef, useCallback, Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { usePalaceStore } from '../../../stores/palaceStore'
import { useCameraStore } from '../../../stores/cameraStore'
import { isDraggingGlobal } from '../elements/useDrag'
import { PalaceNode, Vec3 } from '../../../domain/models'

const labelStyle: React.CSSProperties = {
  color: '#eee',
  fontSize: 10,
  fontWeight: 600,
  textShadow: '0 1px 4px rgba(0,0,0,0.9)',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  userSelect: 'none',
  textAlign: 'center' as const,
  maxWidth: 80,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

function ThumbnailImage({ url }: { url: string }) {
  const texture = useMemo(() => new THREE.TextureLoader().load(url), [url])
  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial map={texture} side={THREE.FrontSide} toneMapped={false} />
    </mesh>
  )
}

function getSceneThumbnail(node: PalaceNode): string | null {
  const img = node.elements.find(e => e.type === 'image-plane')
  return img?.assetUrl ?? node.thumbnail ?? null
}

function SceneCard({ node, isHovered, onHover, onBlur }: {
  node: PalaceNode
  isHovered: boolean
  onHover: () => void
  onBlur: () => void
}) {
  const { removeNode, moveNode, nodes } = usePalaceStore()
  const childCount = nodes.filter(n => n.parentId === node.id).length
  const depth = getNodeDepth(nodes, node.id)
  const scale = Math.max(0.6, 1 - depth * 0.15)
  const thumbnailUrl = getSceneThumbnail(node)

  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0))
  const dragOffset = useRef(new THREE.Vector3())
  const isDragging = useRef(false)
  const dragMoved = useRef(false)

  const handlePointerDown = useCallback((e: any) => {
    if (e.nativeEvent?.button !== 1) return
    e.stopPropagation()
    isDragging.current = true
    isDraggingGlobal.value = true
    dragMoved.current = false

    const planeNormal = new THREE.Vector3(0, 0, 1)
    const nodePos = new THREE.Vector3(...node.position)
    dragPlane.current.setFromNormalAndCoplanarPoint(planeNormal, nodePos)

    const intersection = new THREE.Vector3()
    e.ray.intersectPlane(dragPlane.current, intersection)
    dragOffset.current.copy(intersection).sub(nodePos)
  }, [node.position])

  const handlePointerMove = useCallback((e: any) => {
    if (!isDragging.current) return
    e.stopPropagation()
    dragMoved.current = true

    const intersection = new THREE.Vector3()
    e.ray.intersectPlane(dragPlane.current, intersection)
    if (!intersection) return

    const newPos = intersection.sub(dragOffset.current)
    moveNode(node.id, [newPos.x, newPos.y, newPos.z])
  }, [node.id, moveNode])

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false
    isDraggingGlobal.value = false
  }, [])

  const pos: Vec3 = node.position

  return (
    <group position={pos} scale={[scale, scale, scale]}>
      {/* Clickable hit area */}
      <mesh
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOver={onHover}
        onPointerOut={onBlur}
        onClick={() => {
          if (dragMoved.current) { dragMoved.current = false; return }
          useCameraStore.getState().focusNode(node.id)
        }}
      >
        <planeGeometry args={[2.2, 2.2]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Background card */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[2.1, 2.6]} />
        <meshStandardMaterial
          color={isHovered ? '#2a3a55' : '#1a2233'}
          roughness={0.8}
        />
      </mesh>

      {/* Border */}
      <mesh position={[0, 0.15, -0.005]}>
        <planeGeometry args={[2.15, 2.15]} />
        <meshStandardMaterial
          color={isHovered ? '#4a9eff' : '#334466'}
        />
      </mesh>

      {/* Thumbnail or placeholder */}
      <group position={[0, 0.15, 0.01]}>
        {thumbnailUrl ? (
          <Suspense fallback={
            <mesh>
              <planeGeometry args={[2, 2]} />
              <meshStandardMaterial color="#333" />
            </mesh>
          }>
            <ThumbnailImage url={thumbnailUrl} />
          </Suspense>
        ) : (
          <mesh>
            <planeGeometry args={[2, 2]} />
            <meshStandardMaterial color={isHovered ? '#2a3a55' : '#1e2d42'} />
          </mesh>
        )}
      </group>

      {/* Child count badge */}
      {childCount > 0 && (
        <mesh position={[0.85, 1.1, 0.02]}>
          <circleGeometry args={[0.25, 16]} />
          <meshBasicMaterial color="#4a9eff" />
        </mesh>
      )}
      {childCount > 0 && (
        <Html position={[0.85, 1.1, 0.03]} center style={{ pointerEvents: 'none' }}>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}>
            {childCount}
          </span>
        </Html>
      )}

      {/* Label */}
      <Html position={[0, -1.2, 0.02]} center style={{ pointerEvents: 'none' }}>
        <div style={labelStyle}>{node.label}</div>
      </Html>

      {/* Delete button on hover */}
      <Html position={[0.85, -1.2, 0.02]} center>
        {isHovered && (
          <button
            onClick={(e) => { e.stopPropagation(); removeNode(node.id) }}
            style={{
              background: 'rgba(255, 60, 60, 0.8)',
              border: 'none',
              color: '#fff',
              width: 20,
              height: 20,
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              lineHeight: '20px',
              textAlign: 'center',
              padding: 0,
            }}
            title="Delete scene"
          >
            x
          </button>
        )}
      </Html>
    </group>
  )
}

function getNodeDepth(nodes: PalaceNode[], nodeId: string): number {
  let depth = 0
  let current = nodes.find(n => n.id === nodeId)
  while (current?.parentId) {
    depth++
    current = nodes.find(n => n.id === current!.parentId)
  }
  return depth
}

export function TreeOverview() {
  const nodes = usePalaceStore(s => s.nodes)
  const mode = useCameraStore(s => s.mode)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  if (mode !== 'overview') return null

  const edges: [Vec3, Vec3][] = nodes.flatMap((node: PalaceNode) => {
    if (!node.parentId) return []
    const parent = nodes.find(n => n.id === node.parentId)
    if (!parent) return []
    return [[parent.position, node.position] as [Vec3, Vec3]]
  })

  return (
    <>
      {nodes.map((node: PalaceNode) => (
        <SceneCard
          key={node.id}
          node={node}
          isHovered={hoveredNode === node.id}
          onHover={() => { setHoveredNode(node.id); (window as any).__hoveredNodeId = node.id }}
          onBlur={() => { setHoveredNode(null); (window as any).__hoveredNodeId = null }}
        />
      ))}

      {edges.map((points: [Vec3, Vec3], i: number) => (
        <Line key={i} points={points} color="#334466" lineWidth={1.5} dashed dashSize={0.3} gapSize={0.2} />
      ))}

      {nodes.length === 0 && (
        <Html center position={[0, 0, 0]}>
          <div style={{ color: '#888', fontSize: 16, textAlign: 'center' }}>
            No scenes yet. Click "+ Scene" to get started.
          </div>
        </Html>
      )}
    </>
  )
}
