import { useCameraStore } from '../stores/cameraStore'
import { usePalaceStore } from '../stores/palaceStore'
import { TreeService } from '../domain/tree/TreeService'

describe('cameraStore', () => {
  beforeEach(() => {
    useCameraStore.setState({
      mode: 'overview',
      targetPosition: [0, 50, 50],
      targetLookAt: [0, 0, 0],
    })
    usePalaceStore.setState({ nodes: [], currentSceneId: null, selectedElementId: null })
  })

  it('starts in overview mode', () => {
    const state = useCameraStore.getState()
    expect(state.mode).toBe('overview')
  })

  it('setMode updates mode', () => {
    useCameraStore.getState().setMode('focused')
    expect(useCameraStore.getState().mode).toBe('focused')
  })

  it('focusNode reads nodes from palaceStore', () => {
    // Create a node so focusNode has something to focus on
    const nodeId = usePalaceStore.getState().addNode('Test', null, [5, 10, 0])
    useCameraStore.getState().focusNode(nodeId)

    const state = useCameraStore.getState()
    // Camera should have transitioned
    expect(state.mode).oneOf(['transitioning', 'focused'])
    // LookAt should target the node's position
    expect(state.targetLookAt).toEqual([5, 10, 0])
  })

  it('focusNode for nonexistent node does nothing', () => {
    const before = useCameraStore.getState().targetPosition
    useCameraStore.getState().focusNode('nonexistent')
    const after = useCameraStore.getState().targetPosition
    // Position unchanged since no node found
    expect(after).toEqual(before)
  })

  it('showOverview transitions to overview', () => {
    useCameraStore.getState().setMode('focused')
    usePalaceStore.getState().addNode('Root', null, [0, 0, 0])
    useCameraStore.getState().showOverview()

    const state = useCameraStore.getState()
    expect(state.mode).oneOf(['transitioning', 'overview'])
  })
})
