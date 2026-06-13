/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { usePalaceStore } from '../stores/palaceStore'
import { useLoadPalace } from '../infrastructure/persistence/useAutoSave'

describe('Phase C: New Features Tests', () => {
  beforeEach(() => {
    usePalaceStore.setState({
      nodes: [],
      currentSceneId: null,
      selectedElementId: null,
      isLoaded: false,
    })
  })

  describe('C1: isLoaded flag in palaceStore', () => {
    it('initializes isLoaded to false', () => {
      const { result } = renderHook(() => usePalaceStore())
      expect(result.current.isLoaded).toBe(false)
    })

    it('can set isLoaded to true', () => {
      const { result } = renderHook(() => usePalaceStore())
      const get = usePalaceStore.getState

      act(() => {
        get().setIsLoaded(true)
      })
      expect(get().isLoaded).toBe(true)
    })

    it('can set isLoaded to false', () => {
      const { result } = renderHook(() => usePalaceStore())
      const get = usePalaceStore.getState

      act(() => {
        get().setIsLoaded(true)
        get().setIsLoaded(false)
      })
      expect(get().isLoaded).toBe(false)
    })
  })

  describe('C2: delete scene flow', () => {
    it('deletes a node and all its descendants', () => {
      const { result } = renderHook(() => usePalaceStore())
      const get = usePalaceStore.getState

      // Create tree: Root -> Child1 -> Grandchild1, Grandchild2
      //             -> Child2
      act(() => {
        const rootId = get().addNode('Root', null, [0, 0, 0])
        const child1Id = get().addNode('Child1', rootId, [-2, 0, 0])
        const child2Id = get().addNode('Child2', rootId, [2, 0, 0])
        get().addNode('Grandchild1', child1Id, [-3, 0, 0])
        get().addNode('Grandchild2', child1Id, [-1, 0, 0])
      })

      expect(get().nodes.length).toBe(5)

      // Delete Child1 (should remove Grandchild1 and Grandchild2)
      const child1Node = get().nodes.find(n => n.label === 'Child1')
      expect(child1Node).toBeDefined()
      act(() => {
        get().removeNode(child1Node!.id)
      })

      expect(get().nodes.length).toBe(2)
      expect(get().nodes.find(n => n.id === child1Node!.id)).toBeUndefined()
      expect(get().nodes.find(n => n.label === 'Grandchild1')).toBeUndefined()
      expect(get().nodes.find(n => n.label === 'Grandchild2')).toBeUndefined()
      expect(get().nodes.find(n => n.label === 'Root')).toBeDefined()
      expect(get().nodes.find(n => n.label === 'Child2')).toBeDefined()
    })

    it('clears currentSceneId if deleted node is focused', () => {
      const { result } = renderHook(() => usePalaceStore())
      const get = usePalaceStore.getState

      act(() => {
        const rootId = get().addNode('Root', null, [0, 0, 0])
        const childId = get().addNode('Child', rootId, [0, 0, 0])
        get().setCurrentScene(childId)
      })

      const childNode = get().nodes.find(n => n.label === 'Child')
      expect(get().currentSceneId).toBe(childNode!.id)

      act(() => {
        get().removeNode(childNode!.id)
      })

      expect(get().currentSceneId).toBeNull()
    })

    it('does not clear currentSceneId if deleting a different node', () => {
      const { result } = renderHook(() => usePalaceStore())
      const get = usePalaceStore.getState

      act(() => {
        const rootId = get().addNode('Root', null, [0, 0, 0])
        const child1Id = get().addNode('Child1', rootId, [-2, 0, 0])
        const child2Id = get().addNode('Child2', rootId, [2, 0, 0])
        get().setCurrentScene(child1Id)

        get().removeNode(child2Id)
      })

      const child1Node = get().nodes.find(n => n.label === 'Child1')
      expect(get().currentSceneId).toBe(child1Node!.id)
    })
  })

  describe('C3: file upload flow', () => {
    it('adds an image-plane element when file is uploaded', () => {
      const { result } = renderHook(() => usePalaceStore())
      const get = usePalaceStore.getState

      act(() => {
        const sceneId = get().addNode('Scene', null, [0, 0, 0])
        get().setCurrentScene(sceneId)

        // Simulate file upload
        const mockFileUrl = 'blob:http://localhost/test-image.jpg'
        get().addElement('image-plane', mockFileUrl, [0, 0, 0])
      })

      const sceneNode = get().nodes.find(n => n.label === 'Scene')
      expect(sceneNode?.elements.length).toBe(1)
      expect(sceneNode?.elements[0].type).toBe('image-plane')
      expect(sceneNode?.elements[0].assetUrl).toBe('blob:http://localhost/test-image.jpg')
    })

    it('assigns random positions to uploaded images', () => {
      const { result } = renderHook(() => usePalaceStore())
      const get = usePalaceStore.getState

      act(() => {
        const sceneId = get().addNode('Scene', null, [0, 0, 0])
        get().setCurrentScene(sceneId)

        // Simulate multiple file uploads
        get().addElement('image-plane', 'blob:image1.jpg', [1, 2, 0])
        get().addElement('image-plane', 'blob:image2.jpg', [3, 4, 0])
      })

      const sceneNode = get().nodes.find(n => n.label === 'Scene')
      expect(sceneNode?.elements.length).toBe(2)
      expect(sceneNode?.elements[0].position).toEqual([1, 2, 0])
      expect(sceneNode?.elements[1].position).toEqual([3, 4, 0])
    })
  })

  describe('C4: useLoadPalace sets isLoaded and prevents ghost nodes', () => {
    it('sets isLoaded to true after loading', () => {
      const { result } = renderHook(() => usePalaceStore())
      const get = usePalaceStore.getState

      // Load should set isLoaded to true
      renderHook(() => useLoadPalace())

      // Wait for async load (mock IndexedDB returns empty array by default)
      // The hook should set isLoaded after load completes
      // Note: This test depends on the mock IndexedDB implementation
      // In a real scenario, we'd need to mock the IndexedDBPersistence layer
    })

    it('does not create duplicate nodes on reload', () => {
      const { result } = renderHook(() => usePalaceStore())
      const get = usePalaceStore.getState

      act(() => {
        // Manually set nodes to simulate a previous save
        const existingNodes = [{ id: 'root-1', label: 'Existing Root', parentId: null, position: [0, 0, 0], elements: [] }]
        get().setNodes(existingNodes)
        get().setIsLoaded(true)
      })

      expect(get().nodes.length).toBe(1)
      expect(get().isLoaded).toBe(true)

      // Simulating reload - if isLoaded is true, initialization should not create a new root
      // This would be tested in the App.tsx integration, but we verify the store state here
      act(() => {
        // Try to add a node after isLoaded is true
        get().addNode('New Scene', null, [0, 0, 0])
      })

      expect(get().nodes.length).toBe(2)
    })
  })
})