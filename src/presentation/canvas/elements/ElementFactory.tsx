import { ElementType, PalaceElement } from '../../../domain/models'

export interface ElementProps {
  element: PalaceElement
  isSelected: boolean
  onSelect: () => void
}

type ElementRenderer = React.ComponentType<ElementProps>

const registry = new Map<ElementType, ElementRenderer>()

export function registerElement(type: ElementType, component: ElementRenderer): void {
  registry.set(type, component)
}

export function ElementFactory({ element, isSelected, onSelect }: ElementProps) {
  const Renderer = registry.get(element.type)

  if (!Renderer) {
    return (
      <group position={element.position}>
        <mesh onClick={onSelect}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#ff4444" wireframe={isSelected} />
        </mesh>
      </group>
    )
  }

  return <Renderer element={element} isSelected={isSelected} onSelect={onSelect} />
}