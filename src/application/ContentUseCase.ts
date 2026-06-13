import { ElementId, HiddenContent, PalaceNode, NodeId } from '../domain/models'

export class ContentUseCase {
  constructor(
    private getNodes: () => PalaceNode[],
    private setNodes: (nodes: PalaceNode[]) => void
  ) {}

  setContent(elementId: ElementId, content: HiddenContent): void {
    const nodes = this.getNodes()
    const updatedNodes = nodes.map(n => ({
      ...n,
      elements: n.elements.map(e =>
        e.id === elementId ? { ...e, hiddenContent: content, contentRevealed: true } : e
      ),
    }))
    this.setNodes(updatedNodes)
  }

  getContent(elementId: ElementId): HiddenContent | null {
    const nodes = this.getNodes()
    for (const node of nodes) {
      const element = node.elements.find(e => e.id === elementId)
      if (element?.hiddenContent) return element.hiddenContent
    }
    return null
  }

  isRevealed(elementId: ElementId): boolean {
    const nodes = this.getNodes()
    for (const node of nodes) {
      const element = node.elements.find(e => e.id === elementId)
      if (element) return element.contentRevealed ?? true
    }
    return true
  }

  revealContent(elementId: ElementId): void {
    const nodes = this.getNodes()
    const updatedNodes = nodes.map(n => ({
      ...n,
      elements: n.elements.map(e =>
        e.id === elementId ? { ...e, contentRevealed: true } : e
      ),
    }))
    this.setNodes(updatedNodes)
  }

  hideContent(elementId: ElementId): void {
    const nodes = this.getNodes()
    const updatedNodes = nodes.map(n => ({
      ...n,
      elements: n.elements.map(e =>
        e.id === elementId ? { ...e, contentRevealed: false } : e
      ),
    }))
    this.setNodes(updatedNodes)
  }

  hideAllContent(sceneId: NodeId): void {
    const nodes = this.getNodes()
    const updatedNodes = nodes.map(n =>
      n.id === sceneId
        ? {
            ...n,
            elements: n.elements.map(e =>
              e.hiddenContent ? { ...e, contentRevealed: false } : e
            ),
          }
        : n
    )
    this.setNodes(updatedNodes)
  }

  revealAllContent(sceneId: NodeId): void {
    const nodes = this.getNodes()
    const updatedNodes = nodes.map(n =>
      n.id === sceneId
        ? {
            ...n,
            elements: n.elements.map(e =>
              e.hiddenContent ? { ...e, contentRevealed: true } : e
            ),
          }
        : n
    )
    this.setNodes(updatedNodes)
  }
}
