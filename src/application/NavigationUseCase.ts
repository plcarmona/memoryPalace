import { NodeId, ElementId, PalaceNode, Vec3 } from '../domain/models'
import { TreeService } from '../domain/tree/TreeService'

export interface CameraTarget {
  position: Vec3
  lookAt: Vec3
  mode: 'overview' | 'focused'
}

export class NavigationUseCase {
  constructor(
    private getNodes: () => PalaceNode[],
    private setCameraTarget: (target: CameraTarget) => void
  ) {}

  focusNode(nodeId: NodeId): void {
    const nodes = this.getNodes()
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    const target: CameraTarget = {
      position: [node.position[0], node.position[1] + 8, node.position[2] + 8],
      lookAt: node.position,
      mode: 'focused',
    }
    this.setCameraTarget(target)
  }

  showOverview(): void {
    const nodes = this.getNodes()
    const layout = TreeService.computeLayout(nodes)
    const center = this.computeCenter(Array.from(layout.values()))

    const target: CameraTarget = {
      position: [center[0], center[1], center[2] + 50],
      lookAt: center,
      mode: 'overview',
    }
    this.setCameraTarget(target)
  }

  navigateToLinkedElement(elementId: ElementId): void {
    const nodes = this.getNodes()
    for (const node of nodes) {
      const element = node.elements.find(e => e.id === elementId)
      if (element?.link?.targetNodeId) {
        this.focusNode(element.link.targetNodeId)
        return
      }
    }
  }

  private computeCenter(positions: Vec3[]): Vec3 {
    if (positions.length === 0) return [0, 0, 0]

    const sum = positions.reduce(
      (acc, pos) => [acc[0] + pos[0], acc[1] + pos[1], acc[2] + pos[2]],
      [0, 0, 0] as Vec3
    )
    return [sum[0] / positions.length, sum[1] / positions.length, sum[2] / positions.length]
  }
}