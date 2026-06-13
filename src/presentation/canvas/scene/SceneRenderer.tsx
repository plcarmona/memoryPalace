import { usePalaceStore } from '../../../stores/palaceStore'
import { useCameraStore } from '../../../stores/cameraStore'
import { SceneNode } from './SceneNode'
import { ElementFactory } from '../elements/ElementFactory'

export function SceneRenderer() {
  const { nodes, currentSceneId, selectedElementId, setSelectedElement } = usePalaceStore()
  const { mode } = useCameraStore()

  if (mode === 'overview') return null

  const currentNode = nodes.find(n => n.id === currentSceneId)
  if (!currentNode) return null

  return (
    <SceneNode node={currentNode}>
      {currentNode.elements.map(element => (
        <ElementFactory
          key={element.id}
          element={element}
          isSelected={element.id === selectedElementId}
          onSelect={() => setSelectedElement(element.id)}
        />
      ))}
    </SceneNode>
  )
}