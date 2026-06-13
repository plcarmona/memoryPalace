import { PalaceNode } from '../../../domain/models'

interface SceneNodeProps {
  node: PalaceNode
  children: React.ReactNode
}

export function SceneNode({ node, children }: SceneNodeProps) {
  return (
    <group position={node.position}>
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        color="#ffffff"
      />
      <directionalLight
        position={[-5, 5, -5]}
        intensity={0.4}
        color="#8888ff"
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.3} />
      </mesh>

      <gridHelper args={[20, 20, '#333355', '#222244']} position={[0, -0.49, 0]} />

      {children}
    </group>
  )
}