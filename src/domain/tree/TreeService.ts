import { PalaceNode, NodeId, Vec3 } from '../models'
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 16)

export class TreeService {
  static createNode(
    _nodes: PalaceNode[],
    label: string,
    parentId: NodeId | null,
    position: Vec3
  ): PalaceNode {
    const id = nanoid()
    return {
      id,
      label,
      parentId,
      position,
      elements: [],
      metadata: {
        createdAt: Date.now(),
      },
    }
  }

  static removeChild(nodes: PalaceNode[], nodeId: NodeId): PalaceNode[] {
    const toRemove = new Set<NodeId>()
    const collectDescendants = (id: NodeId) => {
      toRemove.add(id)
      nodes.filter(n => n.parentId === id).forEach(child => collectDescendants(child.id))
    }
    collectDescendants(nodeId)
    return nodes.filter(n => !toRemove.has(n.id))
  }

  static getChildren(nodes: PalaceNode[], parentId: NodeId | null): PalaceNode[] {
    return nodes.filter(n => n.parentId === parentId)
  }

  static getPath(nodes: PalaceNode[], nodeId: NodeId): PalaceNode[] {
    const path: PalaceNode[] = []
    let current = nodes.find(n => n.id === nodeId)
    while (current) {
      path.unshift(current)
      current = current.parentId ? nodes.find(n => n.id === current!.parentId) ?? undefined : undefined
    }
    return path
  }

  static computeLayout(nodes: PalaceNode[]): Map<NodeId, Vec3> {
    const layout = new Map<NodeId, Vec3>()
    const rootNodes = this.getChildren(nodes, null)

    const layoutLevel = (
      levelNodes: PalaceNode[],
      depth: number,
    ) => {
      const count = levelNodes.length
      levelNodes.forEach((node, i) => {
        const x = (i - count / 2 + 0.5) * 4
        const y = depth * 4
        const z = 0
        layout.set(node.id, [x, y, z] as Vec3)
        const children = this.getChildren(nodes, node.id)
        if (children.length > 0) {
          layoutLevel(children, depth + 1)
        }
      })
    }

    layoutLevel(rootNodes, 0)
    return layout
  }

  static getNodesWithinDistance(nodes: PalaceNode[], startId: NodeId, maxDistance: number): PalaceNode[] {
    if (maxDistance <= 0) {
      const self = nodes.find(n => n.id === startId)
      return self ? [self] : []
    }

    const adj = new Map<NodeId, NodeId[]>()
    for (const node of nodes) {
      const neighbors: NodeId[] = []
      if (node.parentId) neighbors.push(node.parentId)
      for (const child of nodes) {
        if (child.parentId === node.id) neighbors.push(child.id)
      }
      adj.set(node.id, neighbors)
    }

    const visited = new Set<NodeId>([startId])
    const result: PalaceNode[] = []
    let frontier: NodeId[] = [startId]

    for (let dist = 0; dist <= maxDistance; dist++) {
      const nextFrontier: NodeId[] = []
      for (const id of frontier) {
        const node = nodes.find(n => n.id === id)
        if (node) result.push(node)
        const neighbors = adj.get(id) || []
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId)
            nextFrontier.push(neighborId)
          }
        }
      }
      frontier = nextFrontier
    }

    return result
  }
}