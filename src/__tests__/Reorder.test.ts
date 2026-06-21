import { usePalaceStore } from '../stores/palaceStore'

describe('Element z-order (move up/down)', () => {
  beforeEach(() => {
    usePalaceStore.setState({
      nodes: [],
      currentSceneId: null,
      selectedElementId: null,
      isLoaded: true,
    })
  })

  function setupScene(): { sceneId: string; elIds: string[] } {
    const sceneId = usePalaceStore.getState().addNode('Scene', null, [0, 0, 0])
    usePalaceStore.getState().setCurrentScene(sceneId)
    usePalaceStore.getState().addElement('image-plane', 'a', [0, 0, 0])
    usePalaceStore.getState().addElement('image-plane', 'b', [0, 0, 0])
    usePalaceStore.getState().addElement('image-plane', 'c', [0, 0, 0])
    const scene = usePalaceStore.getState().nodes.find(n => n.id === sceneId)!
    return { sceneId, elIds: scene.elements.map(e => e.id) }
  }

  function orderOf(sceneId: string): string[] {
    const scene = usePalaceStore.getState().nodes.find(n => n.id === sceneId)!
    return scene.elements.map(e => e.assetUrl)
  }

  it('moveElementForward swaps element with next (paints more on top)', () => {
    const { sceneId, elIds } = setupScene()
    usePalaceStore.getState().moveElementForward(elIds[0])
    expect(orderOf(sceneId)).toEqual(['b', 'a', 'c'])
  })

  it('moveElementForward is a no-op at the end', () => {
    const { sceneId, elIds } = setupScene()
    usePalaceStore.getState().moveElementForward(elIds[2])
    expect(orderOf(sceneId)).toEqual(['a', 'b', 'c'])
  })

  it('moveElementBackward swaps element with previous (paints behind)', () => {
    const { sceneId, elIds } = setupScene()
    usePalaceStore.getState().moveElementBackward(elIds[2])
    expect(orderOf(sceneId)).toEqual(['a', 'c', 'b'])
  })

  it('moveElementBackward is a no-op at the start', () => {
    const { sceneId, elIds } = setupScene()
    usePalaceStore.getState().moveElementBackward(elIds[0])
    expect(orderOf(sceneId)).toEqual(['a', 'b', 'c'])
  })

  it('bringElementToFront moves element to end', () => {
    const { sceneId, elIds } = setupScene()
    usePalaceStore.getState().bringElementToFront(elIds[0])
    expect(orderOf(sceneId)).toEqual(['b', 'c', 'a'])
  })

  it('sendElementToBack moves element to start', () => {
    const { sceneId, elIds } = setupScene()
    usePalaceStore.getState().sendElementToBack(elIds[2])
    expect(orderOf(sceneId)).toEqual(['c', 'a', 'b'])
  })

  it('is scoped to the correct scene', () => {
    const { sceneId: sceneA, elIds: elIdsA } = setupScene()
    // Create a second scene with its own elements
    const sceneBId = usePalaceStore.getState().addNode('SceneB', null, [10, 0, 0])
    usePalaceStore.getState().addElementToScene(sceneBId, 'image-plane', 'x', [0, 0, 0])
    usePalaceStore.getState().addElementToScene(sceneBId, 'image-plane', 'y', [0, 0, 0])

    usePalaceStore.getState().moveElementForward(elIdsA[0])

    // Scene A reordered
    expect(orderOf(sceneA)).toEqual(['b', 'a', 'c'])
    // Scene B untouched
    expect(orderOf(sceneBId)).toEqual(['x', 'y'])
  })

  it('is a no-op when element does not exist', () => {
    const { sceneId } = setupScene()
    const before = orderOf(sceneId)
    usePalaceStore.getState().moveElementForward('nonexistent-id')
    expect(orderOf(sceneId)).toEqual(before)
  })
})
