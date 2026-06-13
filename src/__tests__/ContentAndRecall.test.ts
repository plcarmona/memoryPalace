import { PalaceNode, ElementType } from '../domain/models'
import { ContentUseCase } from '../application/ContentUseCase'
import { TreeService } from '../domain/tree/TreeService'
import { usePalaceStore } from '../stores/palaceStore'
import { useRecallStore } from '../stores/recallStore'

describe('ContentUseCase — enhanced with reveal tracking', () => {
  function setup() {
    const root = TreeService.createNode([], 'Root', null, [0, 0, 0])
    const element = {
      id: 'el-1',
      type: ElementType.ImagePlane as ElementType,
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      assetUrl: 'test.png',
    }
    let nodes: PalaceNode[] = [{ ...root, elements: [element] }]

    const useCase = new ContentUseCase(
      () => nodes,
      (updated) => { nodes = updated }
    )

    return { useCase, getNodes: () => nodes, root }
  }

  it('setContent marks content as revealed by default', () => {
    const { useCase, getNodes } = setup()
    useCase.setContent('el-1', { text: 'Hello' })

    const el = getNodes()[0].elements[0]
    expect(el.hiddenContent).toEqual({ text: 'Hello' })
    expect(el.contentRevealed).toBe(true)
  })

  it('hideContent sets contentRevealed to false without deleting data', () => {
    const { useCase, getNodes } = setup()
    useCase.setContent('el-1', { text: 'Secret' })
    useCase.hideContent('el-1')

    const el = getNodes()[0].elements[0]
    expect(el.hiddenContent).toEqual({ text: 'Secret' }) // data preserved!
    expect(el.contentRevealed).toBe(false)
  })

  it('revealContent sets contentRevealed to true', () => {
    const { useCase, getNodes } = setup()
    useCase.setContent('el-1', { text: 'Secret' })
    useCase.hideContent('el-1')
    useCase.revealContent('el-1')

    const el = getNodes()[0].elements[0]
    expect(el.contentRevealed).toBe(true)
    expect(el.hiddenContent).toEqual({ text: 'Secret' })
  })

  it('isRevealed returns correct state', () => {
    const { useCase } = setup()
    useCase.setContent('el-1', { text: 'Test' })
    expect(useCase.isRevealed('el-1')).toBe(true)

    useCase.hideContent('el-1')
    expect(useCase.isRevealed('el-1')).toBe(false)

    useCase.revealContent('el-1')
    expect(useCase.isRevealed('el-1')).toBe(true)
  })

  it('hideAllContent hides only elements with hidden content in a scene', () => {
    const { useCase, getNodes, root } = setup()
    useCase.setContent('el-1', { text: 'Hidden' })

    // Add a second element without content
    let nodes = getNodes()
    nodes = nodes.map(n => ({
      ...n,
      elements: [
        ...n.elements,
        {
          id: 'el-2',
          type: ElementType.ImagePlane as ElementType,
          position: [1, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
          assetUrl: 'test2.png',
        },
      ],
    }))

    const useCase2 = new ContentUseCase(
      () => nodes,
      (updated) => { nodes = updated }
    )
    useCase2.hideAllContent(root.id)

    const el1 = nodes[0].elements.find(e => e.id === 'el-1')!
    const el2 = nodes[0].elements.find(e => e.id === 'el-2')!
    expect(el1.contentRevealed).toBe(false)
    expect(el2.contentRevealed).toBeUndefined() // untouched
  })

  it('revealAllContent restores all elements in a scene', () => {
    const { useCase, getNodes, root } = setup()
    useCase.setContent('el-1', { text: 'Hidden' })
    useCase.hideAllContent(root.id)
    useCase.revealAllContent(root.id)

    const el = getNodes()[0].elements[0]
    expect(el.contentRevealed).toBe(true)
  })
})

describe('recallStore', () => {
  beforeEach(() => {
    useRecallStore.setState({
      isActive: false,
      sceneOrder: [],
      currentSceneIndex: 0,
      answers: [],
      waitingForAnswer: false,
      currentRevealElementId: null,
    })
  })

  it('startRecall sets active state with shuffled scenes', () => {
    useRecallStore.getState().startRecall(['a', 'b', 'c'])
    const state = useRecallStore.getState()

    expect(state.isActive).toBe(true)
    expect(state.sceneOrder).toHaveLength(3)
    expect(state.sceneOrder.sort()).toEqual(['a', 'b', 'c'])
    expect(state.answers).toEqual([])
  })

  it('nextScene advances the index', () => {
    useRecallStore.getState().startRecall(['a', 'b', 'c'])
    expect(useRecallStore.getState().currentSceneIndex).toBe(0)

    useRecallStore.getState().nextScene()
    expect(useRecallStore.getState().currentSceneIndex).toBe(1)
  })

  it('recordAnswer adds to answers array', () => {
    useRecallStore.getState().recordAnswer('el-1', 'scene-1', true)
    useRecallStore.getState().recordAnswer('el-2', 'scene-1', false)

    const { answers } = useRecallStore.getState()
    expect(answers).toHaveLength(2)
    expect(answers[0].correct).toBe(true)
    expect(answers[1].correct).toBe(false)
  })

  it('endRecall resets state', () => {
    useRecallStore.getState().startRecall(['a', 'b'])
    useRecallStore.getState().recordAnswer('el-1', 'a', true)
    useRecallStore.getState().endRecall()

    const state = useRecallStore.getState()
    expect(state.isActive).toBe(false)
    expect(state.sceneOrder).toEqual([])
    // answers preserved for summary
    expect(state.answers).toHaveLength(1)
  })

  it('setCurrentRevealElement tracks which element was revealed', () => {
    useRecallStore.getState().setCurrentRevealElement('el-1')
    expect(useRecallStore.getState().currentRevealElementId).toBe('el-1')

    useRecallStore.getState().setCurrentRevealElement(null)
    expect(useRecallStore.getState().currentRevealElementId).toBeNull()
  })
})
