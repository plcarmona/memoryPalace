import { usePalaceStore } from '../stores/palaceStore'
import { beginTrackedDrag } from '../application/dragHistory'

describe('Undo/Redo (zundo temporal middleware)', () => {
  beforeEach(() => {
    usePalaceStore.setState({
      nodes: [],
      currentSceneId: null,
      selectedElementId: null,
      selectedElementIds: [],
      selectedRegionId: null,
      isLoaded: true,
    })
    usePalaceStore.temporal.getState().clear()
  })

  function currentNodes() {
    return usePalaceStore.getState().nodes
  }

  it('tracks addNode in history', () => {
    usePalaceStore.getState().addNode('A', null, [0, 0, 0])
    expect(currentNodes()).toHaveLength(1)
    expect(usePalaceStore.temporal.getState().pastStates).toHaveLength(1)
  })

  it('undo reverses addNode', () => {
    usePalaceStore.getState().addNode('A', null, [0, 0, 0])
    usePalaceStore.temporal.getState().undo()
    expect(currentNodes()).toHaveLength(0)
  })

  it('redo reapplies addNode', () => {
    usePalaceStore.getState().addNode('A', null, [0, 0, 0])
    usePalaceStore.temporal.getState().undo()
    usePalaceStore.temporal.getState().redo()
    expect(currentNodes()).toHaveLength(1)
    expect(currentNodes()[0].label).toBe('A')
  })

  it('undo reverses addElement', () => {
    const sceneId = usePalaceStore.getState().addNode('Scene', null, [0, 0, 0])
    usePalaceStore.getState().setCurrentScene(sceneId)
    usePalaceStore.getState().addElement('image-plane', 'x.jpg', [0, 0, 0])

    const sceneBefore = currentNodes().find(n => n.id === sceneId)!
    expect(sceneBefore.elements).toHaveLength(1)

    // Undo: first undo removes element, second undo removes scene
    usePalaceStore.temporal.getState().undo()
    const sceneAfter = currentNodes().find(n => n.id === sceneId)
    expect(sceneAfter?.elements).toHaveLength(0)
  })

  it('undo reverses removeElement', () => {
    const sceneId = usePalaceStore.getState().addNode('Scene', null, [0, 0, 0])
    usePalaceStore.getState().setCurrentScene(sceneId)
    usePalaceStore.getState().addElement('image-plane', 'a.jpg', [0, 0, 0])
    usePalaceStore.temporal.getState().clear() // baseline after setup

    usePalaceStore.getState().removeElement(
      currentNodes().find(n => n.id === sceneId)!.elements[0].id
    )
    expect(currentNodes().find(n => n.id === sceneId)!.elements).toHaveLength(0)

    usePalaceStore.temporal.getState().undo()
    expect(currentNodes().find(n => n.id === sceneId)!.elements).toHaveLength(1)
  })

  it('undo reverses moveElementForward', () => {
    const sceneId = usePalaceStore.getState().addNode('Scene', null, [0, 0, 0])
    usePalaceStore.getState().setCurrentScene(sceneId)
    usePalaceStore.getState().addElement('image-plane', 'a', [0, 0, 0])
    usePalaceStore.getState().addElement('image-plane', 'b', [0, 0, 0])
    usePalaceStore.temporal.getState().clear()

    const firstEl = currentNodes().find(n => n.id === sceneId)!.elements[0]
    usePalaceStore.getState().moveElementForward(firstEl.id)
    expect(currentNodes().find(n => n.id === sceneId)!.elements.map(e => e.assetUrl))
      .toEqual(['b', 'a'])

    usePalaceStore.temporal.getState().undo()
    expect(currentNodes().find(n => n.id === sceneId)!.elements.map(e => e.assetUrl))
      .toEqual(['a', 'b'])
  })

  it('selection changes are NOT tracked in history', () => {
    usePalaceStore.getState().addNode('A', null, [0, 0, 0])
    usePalaceStore.temporal.getState().clear()

    usePalaceStore.getState().setSelectedElement('whatever')
    usePalaceStore.getState().setCurrentScene('whatever')

    expect(usePalaceStore.temporal.getState().pastStates).toHaveLength(0)
  })

  it('isLoaded is NOT tracked in history', () => {
    usePalaceStore.temporal.getState().clear()
    usePalaceStore.getState().setIsLoaded(false)
    usePalaceStore.getState().setIsLoaded(true)
    expect(usePalaceStore.temporal.getState().pastStates).toHaveLength(0)
  })

  it('coalesces multiple sets during drag pause into one undo entry', () => {
    const sceneId = usePalaceStore.getState().addNode('Scene', null, [0, 0, 0])
    usePalaceStore.temporal.getState().clear()

    const session = beginTrackedDrag()
    // Simulate drag: many small label updates
    for (let i = 0; i < 50; i++) {
      usePalaceStore.getState().renameNode(sceneId, `Iter ${i}`)
    }
    session.end()

    // 50 updates -> 1 history entry
    expect(usePalaceStore.temporal.getState().pastStates).toHaveLength(1)
    expect(usePalaceStore.getState().nodes[0].label).toBe('Iter 49')

    // Undo reverses ALL of them in one step
    usePalaceStore.temporal.getState().undo()
    expect(usePalaceStore.getState().nodes[0].label).toBe('Scene')
  })

  it('does not create history entry when drag produced no state change', () => {
    usePalaceStore.getState().addNode('Scene', null, [0, 0, 0])
    usePalaceStore.temporal.getState().clear()

    const session = beginTrackedDrag()
    // No state changes during "drag"
    session.end()

    expect(usePalaceStore.temporal.getState().pastStates).toHaveLength(0)
  })

  it('clear() wipes history without affecting current state', () => {
    usePalaceStore.getState().addNode('A', null, [0, 0, 0])
    expect(currentNodes()).toHaveLength(1)

    usePalaceStore.temporal.getState().clear()
    expect(usePalaceStore.temporal.getState().pastStates).toHaveLength(0)
    expect(currentNodes()).toHaveLength(1)
  })

  it('history is capped by limit', () => {
    // Generate more than 100 history entries
    for (let i = 0; i < 120; i++) {
      usePalaceStore.getState().addNode(`Node ${i}`, null, [i, 0, 0])
    }
    expect(usePalaceStore.temporal.getState().pastStates.length).toBeLessThanOrEqual(100)
  })
})
