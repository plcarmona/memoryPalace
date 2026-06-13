import { Suspense } from 'react'
import { useElementInteraction } from './useElementInteraction'
import { useDrag } from './useDrag'
import { ElementProps } from './ElementFactory'
import { createBuiltInMesh, BuiltInShape } from '../../../infrastructure/assets/AssetLibrary'

function ObjectContent({ type }: { type: BuiltInShape }) {
  return <primitive object={createBuiltInMesh(type)} />
}

export function Object3D({ element, isSelected, onSelect }: ElementProps) {
  const { handleClick, handleDoubleClick, showPortalGlow, showContentIndicator, showHiddenIndicator } =
    useElementInteraction(element, isSelected, onSelect)
  const { dragHandlers } = useDrag(element, isSelected)

  const builtInType = element.assetUrl.startsWith('builtin:') ? element.assetUrl.slice(8) as BuiltInShape : null

  return (
    <group position={element.position} rotation={element.rotation} scale={element.scale}>
      <mesh
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        {...dragHandlers}
      >
        <boxGeometry args={[1, 1, 1]} />
        <Suspense fallback={<meshStandardMaterial color="#666666" />}>
          {builtInType ? (
            <ObjectContent type={builtInType} />
          ) : (
            <meshStandardMaterial color="#666666" />
          )}
        </Suspense>
      </mesh>

      {showPortalGlow && (
        <mesh>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshBasicMaterial color="#4a9eff" transparent opacity={0.1} />
        </mesh>
      )}

      {showContentIndicator && !showHiddenIndicator && (
        <mesh position={[0, 0.6, 0.05]}>
          <circleGeometry args={[0.1, 16]} />
          <meshBasicMaterial color="#44ff88" />
        </mesh>
      )}

      {showHiddenIndicator && (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#ff6644" transparent opacity={0.3} />
        </mesh>
      )}

      {isSelected && (
        <mesh>
          <boxGeometry args={[1.05, 1.05, 1.05]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.08} wireframe />
        </mesh>
      )}
    </group>
  )
}
