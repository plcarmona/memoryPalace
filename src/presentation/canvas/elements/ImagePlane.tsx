import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { useElementInteraction } from './useElementInteraction'
import { useDrag } from './useDrag'
import { ElementProps } from './ElementFactory'

function ImageContent({ url }: { url: string }) {
  const texture = useMemo(() => new THREE.TextureLoader().load(url), [url])
  return <meshStandardMaterial map={texture} side={THREE.DoubleSide} />
}

export function ImagePlane({ element, isSelected, onSelect }: ElementProps) {
  const { handleClick, handleDoubleClick, showPortalGlow, showContentIndicator, showHiddenIndicator } =
    useElementInteraction(element, isSelected, onSelect)
  const { dragHandlers } = useDrag(element, isSelected)

  const selectionGeometry = useMemo(() => new THREE.BoxGeometry(2.05, 2.05, 0.02), [])

  return (
    <group position={element.position} rotation={element.rotation} scale={element.scale}>
      <mesh
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        {...dragHandlers}
      >
        <planeGeometry args={[2, 2]} />
        <Suspense fallback={<meshStandardMaterial color="#888888" side={THREE.DoubleSide} />}>
          <ImageContent url={element.assetUrl} />
        </Suspense>
      </mesh>

      {showPortalGlow && (
        <mesh>
          <planeGeometry args={[2.1, 2.1]} />
          <meshBasicMaterial color="#4a9eff" transparent opacity={0.15} side={THREE.DoubleSide} />
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
          <meshBasicMaterial color="#ff6644" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}

      {isSelected && (
        <lineSegments>
          <edgesGeometry args={[selectionGeometry]} />
          <lineBasicMaterial color="#ffff00" />
        </lineSegments>
      )}
    </group>
  )
}