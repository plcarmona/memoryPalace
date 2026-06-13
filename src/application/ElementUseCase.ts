import { customAlphabet } from 'nanoid'
import { NodeId, ElementId, PalaceNode, PalaceElement, ElementType, Vec3 } from '../domain/models'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 16)

export class ElementUseCase {
  constructor(
    private getNodes: () => PalaceNode[],
    private setNodes: (nodes: PalaceNode[]) => void,
    private getCurrentSceneId: () => NodeId | null
  ) {}

  addElement(
    sceneId: NodeId,
    type: ElementType,
    assetUrl: string,
    position: Vec3
  ): PalaceElement {
    const element: PalaceElement = {
      id: nanoid() as ElementId,
      type,
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      assetUrl,
    }

    const nodes = this.getNodes()
    const updatedNodes = nodes.map(n =>
      n.id === sceneId ? { ...n, elements: [...n.elements, element] } : n
    )
    this.setNodes(updatedNodes)

    return element
  }

  removeElement(sceneId: NodeId, elementId: ElementId): void {
    const nodes = this.getNodes()
    const updatedNodes = nodes.map(n =>
      n.id === sceneId ? { ...n, elements: n.elements.filter(e => e.id !== elementId) } : n
    )
    this.setNodes(updatedNodes)
  }

  transformElement(
    elementId: ElementId,
    transform: { position: Vec3; rotation: Vec3; scale: Vec3 }
  ): void {
    const nodes = this.getNodes()
    const updatedNodes = nodes.map(n => ({
      ...n,
      elements: n.elements.map(e =>
        e.id === elementId ? { ...e, ...transform } : e
      ),
    }))
    this.setNodes(updatedNodes)
  }

  linkElement(elementId: ElementId, targetNodeId: NodeId): void {
    const nodes = this.getNodes()
    const updatedNodes = nodes.map(n => ({
      ...n,
      elements: n.elements.map(e =>
        e.id === elementId ? { ...e, link: { targetNodeId } } : e
      ),
    }))
    this.setNodes(updatedNodes)
  }

  getCurrentScene(): PalaceNode | null {
    const sceneId = this.getCurrentSceneId()
    if (!sceneId) return null
    return this.getNodes().find(n => n.id === sceneId) ?? null
  }
}