import { PalaceNode } from '../domain/models'
import { TreeService } from '../domain/tree/TreeService'

describe('TreeService', () => {
  describe('createNode', () => {
    it('creates a node with auto-generated ID', () => {
      const nodes: PalaceNode[] = []
      const node = TreeService.createNode(nodes, 'Root', null, [0, 0, 0])

      expect(node.id).toBeTruthy()
      expect(node.label).toBe('Root')
      expect(node.parentId).toBeNull()
      expect(node.position).toEqual([0, 0, 0])
      expect(node.elements).toEqual([])
      expect(node.metadata.createdAt).toBeGreaterThan(0)
    })

    it('creates unique IDs for each node', () => {
      const nodes: PalaceNode[] = []
      const a = TreeService.createNode(nodes, 'A', null, [0, 0, 0])
      const b = TreeService.createNode(nodes, 'B', null, [1, 0, 0])
      expect(a.id).not.toBe(b.id)
    })
  })

  describe('removeChild', () => {
    it('removes a node and all its descendants', () => {
      const root = TreeService.createNode([], 'Root', null, [0, 0, 0])
      const child1 = TreeService.createNode([], 'Child1', root.id, [4, 4, 0])
      const grandchild = TreeService.createNode([], 'Grandchild', child1.id, [8, 8, 0])
      const child2 = TreeService.createNode([], 'Child2', root.id, [-4, 4, 0])

      const nodes = [root, child1, grandchild, child2]
      const result = TreeService.removeChild(nodes, child1.id)

      expect(result).toHaveLength(2)
      expect(result.map(n => n.id)).toEqual(expect.arrayContaining([root.id, child2.id]))
      expect(result.find(n => n.id === grandchild.id)).toBeUndefined()
    })

    it('removes only the specified node if it has no children', () => {
      const root = TreeService.createNode([], 'Root', null, [0, 0, 0])
      const child = TreeService.createNode([], 'Child', root.id, [4, 4, 0])

      const result = TreeService.removeChild([root, child], child.id)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(root.id)
    })

    it('returns all nodes if nodeId not found', () => {
      const root = TreeService.createNode([], 'Root', null, [0, 0, 0])
      const result = TreeService.removeChild([root], 'nonexistent')
      expect(result).toHaveLength(1)
    })
  })

  describe('getChildren', () => {
    it('returns direct children of a parent', () => {
      const root = TreeService.createNode([], 'Root', null, [0, 0, 0])
      const child1 = TreeService.createNode([], 'Child1', root.id, [4, 4, 0])
      const child2 = TreeService.createNode([], 'Child2', root.id, [-4, 4, 0])
      const grandchild = TreeService.createNode([], 'GC', child1.id, [8, 8, 0])

      const children = TreeService.getChildren([root, child1, child2, grandchild], root.id)
      expect(children).toHaveLength(2)
      expect(children.map(c => c.id)).toEqual(expect.arrayContaining([child1.id, child2.id]))
    })

    it('returns root nodes when parentId is null', () => {
      const root = TreeService.createNode([], 'Root', null, [0, 0, 0])
      const child = TreeService.createNode([], 'Child', root.id, [4, 4, 0])

      const roots = TreeService.getChildren([root, child], null)
      expect(roots).toHaveLength(1)
      expect(roots[0].id).toBe(root.id)
    })

    it('returns empty array for leaf node', () => {
      const root = TreeService.createNode([], 'Root', null, [0, 0, 0])
      const children = TreeService.getChildren([root], root.id)
      expect(children).toHaveLength(0)
    })
  })

  describe('getPath', () => {
    it('returns path from root to target node', () => {
      const root = TreeService.createNode([], 'Root', null, [0, 0, 0])
      const child = TreeService.createNode([], 'Child', root.id, [4, 4, 0])
      const grandchild = TreeService.createNode([], 'Grandchild', child.id, [8, 8, 0])

      const path = TreeService.getPath([root, child, grandchild], grandchild.id)
      expect(path.map(n => n.id)).toEqual([root.id, child.id, grandchild.id])
    })

    it('returns single-element path for root', () => {
      const root = TreeService.createNode([], 'Root', null, [0, 0, 0])
      const path = TreeService.getPath([root], root.id)
      expect(path).toHaveLength(1)
      expect(path[0].id).toBe(root.id)
    })

    it('returns empty array for nonexistent node', () => {
      const root = TreeService.createNode([], 'Root', null, [0, 0, 0])
      const path = TreeService.getPath([root], 'nonexistent')
      expect(path).toHaveLength(0)
    })
  })

  describe('computeLayout', () => {
    it('assigns positions to all nodes', () => {
      const root = TreeService.createNode([], 'Root', null, [0, 0, 0])
      const child1 = TreeService.createNode([], 'Child1', root.id, [0, 0, 0])
      const child2 = TreeService.createNode([], 'Child2', root.id, [0, 0, 0])

      const layout = TreeService.computeLayout([root, child1, child2])
      expect(layout.size).toBe(3)
      expect(layout.has(root.id)).toBe(true)
      expect(layout.has(child1.id)).toBe(true)
      expect(layout.has(child2.id)).toBe(true)
    })

    it('places children at lower depth than parent', () => {
      const root = TreeService.createNode([], 'Root', null, [0, 0, 0])
      const child = TreeService.createNode([], 'Child', root.id, [0, 0, 0])

      const layout = TreeService.computeLayout([root, child])
      const rootPos = layout.get(root.id)!
      const childPos = layout.get(child.id)!

      expect(childPos[1]).toBeGreaterThan(rootPos[1])
    })

    it('returns empty map for empty node list', () => {
      const layout = TreeService.computeLayout([])
      expect(layout.size).toBe(0)
    })
  })
})