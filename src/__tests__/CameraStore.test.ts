import { useCameraStore } from '../stores/cameraStore'
import { usePalaceStore } from '../stores/palaceStore'

describe('cameraStore', () => {
  beforeEach(() => {
    useCameraStore.setState({
      viewport: { x: 0, y: 0, zoom: 1 },
      targetViewport: { x: 0, y: 0, zoom: 1 },
      animating: false,
      savedViewports: {},
    })
    usePalaceStore.setState({ nodes: [], currentSceneId: null, selectedElementId: null })
  })

  it('starts with default viewport', () => {
    const state = useCameraStore.getState()
    expect(state.viewport.x).toBe(0)
    expect(state.viewport.y).toBe(0)
    expect(state.viewport.zoom).toBe(1)
  })

  it('navigateToScene sets targetViewport to node position', () => {
    const nodeId = usePalaceStore.getState().addNode('Test', null, [5, 10, 0])
    useCameraStore.getState().navigateToScene(nodeId)

    const state = useCameraStore.getState()
    expect(state.animating).toBe(true)
    expect(state.targetViewport.x).toBe(5)
    expect(state.targetViewport.y).toBe(10)
    expect(usePalaceStore.getState().currentSceneId).toBe(nodeId)
  })

  it('navigateToScene uses saved viewport if available', () => {
    const nodeId = usePalaceStore.getState().addNode('Test', null, [5, 10, 0])
    useCameraStore.getState().saveCurrentViewport(nodeId, { x: 100, y: 200, zoom: 2 })
    useCameraStore.getState().navigateToScene(nodeId)

    const state = useCameraStore.getState()
    expect(state.targetViewport.x).toBe(100)
    expect(state.targetViewport.y).toBe(200)
    expect(state.targetViewport.zoom).toBe(2)
  })

  it('navigateToScene saves current viewport before switching', () => {
    const node1 = usePalaceStore.getState().addNode('A', null, [0, 0, 0])
    const node2 = usePalaceStore.getState().addNode('B', null, [100, 100, 0])

    usePalaceStore.getState().setCurrentScene(node1)
    useCameraStore.getState().setViewport(50, 60, 1.5)
    useCameraStore.getState().navigateToScene(node2)

    const saved = useCameraStore.getState().savedViewports[node1]
    expect(saved.x).toBe(50)
    expect(saved.y).toBe(60)
    expect(saved.zoom).toBe(1.5)
  })

  it('goHome navigates to root node', () => {
    const rootId = usePalaceStore.getState().addNode('Home', null, [0, 0, 0])
    usePalaceStore.getState().addNode('Child', rootId, [300, 0, 0])
    useCameraStore.getState().goHome()

    expect(usePalaceStore.getState().currentSceneId).toBe(rootId)
  })
})
