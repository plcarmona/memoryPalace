import { usePalaceStore } from '../stores/palaceStore'
import { useUIStore } from '../stores/uiStore'

describe('palaceStore', () => {
  beforeEach(() => {
    usePalaceStore.setState({ nodes: [], currentSceneId: null, selectedElementId: null })
  })

  it('addNode creates a node and adds it to state', () => {
    const id = usePalaceStore.getState().addNode('Test Node', null, [0, 0, 0])
    const { nodes } = usePalaceStore.getState()

    expect(id).toBeTruthy()
    expect(nodes).toHaveLength(1)
    expect(nodes[0].label).toBe('Test Node')
    expect(nodes[0].parentId).toBeNull()
  })

  it('addNode with parentId creates a child', () => {
    const parentId = usePalaceStore.getState().addNode('Parent', null, [0, 0, 0])
    usePalaceStore.getState().addNode('Child', parentId, [4, 4, 0])

    const { nodes } = usePalaceStore.getState()
    expect(nodes).toHaveLength(2)
    expect(nodes[1].parentId).toBe(parentId)
  })

  it('removeNode removes node and descendants', () => {
    const parentId = usePalaceStore.getState().addNode('Parent', null, [0, 0, 0])
    const childId = usePalaceStore.getState().addNode('Child', parentId, [4, 4, 0])

    usePalaceStore.getState().removeNode(parentId)
    const { nodes } = usePalaceStore.getState()
    expect(nodes).toHaveLength(0)
  })

  it('setCurrentScene and setSelectedElement update state', () => {
    usePalaceStore.getState().setCurrentScene('scene-1')
    usePalaceStore.getState().setSelectedElement('el-1')

    const state = usePalaceStore.getState()
    expect(state.currentSceneId).toBe('scene-1')
    expect(state.selectedElementId).toBe('el-1')
  })
})

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({ activePanel: 'toolbar', editMode: false })
  })

  it('setActivePanel updates panel', () => {
    useUIStore.getState().setActivePanel('memory-panel')
    expect(useUIStore.getState().activePanel).toBe('memory-panel')
  })

  it('setEditMode toggles edit mode', () => {
    useUIStore.getState().setEditMode(true)
    expect(useUIStore.getState().editMode).toBe(true)
  })
})