import { usePalaceStore } from '../stores/palaceStore'
import { TreeService } from '../domain/tree/TreeService'
import { IndexedDBPersistence } from '../infrastructure/persistence/IndexedDBPersistence'
import { ElementUseCase } from '../application/ElementUseCase'
import { ContentUseCase } from '../application/ContentUseCase'
import { ElementType } from '../domain/models'

describe('Integration: Full workflow', () => {
  beforeEach(() => {
    usePalaceStore.setState({ nodes: [], currentSceneId: null, selectedElementId: null })
  })

  it('create palace → add elements → add content → persist → reload', async () => {
    const persistence = new IndexedDBPersistence()

    // 1. Create palace structure
    const rootId = usePalaceStore.getState().addNode('Root Scene', null, [0, 0, 0])
    const childId = usePalaceStore.getState().addNode('Child Scene', rootId, [4, 4, 0])

    const { nodes } = usePalaceStore.getState()
    expect(nodes).toHaveLength(2)

    // 2. Add elements to root scene
    const elementUseCase = new ElementUseCase(
      () => usePalaceStore.getState().nodes,
      (updated) => usePalaceStore.setState({ nodes: updated }),
      () => rootId
    )

    const el1 = elementUseCase.addElement(rootId, ElementType.ImagePlane, 'photo.png', [1, 0, 0])
    const el2 = elementUseCase.addElement(rootId, ElementType.Object3D, 'cube.glb', [-1, 0, 0])

    const rootNode = usePalaceStore.getState().nodes.find(n => n.id === rootId)!
    expect(rootNode.elements).toHaveLength(2)

    // 3. Link element to child scene
    elementUseCase.linkElement(el1.id, childId)
    const linkedEl = usePalaceStore.getState().nodes.find(n => n.id === rootId)!.elements[0]
    expect(linkedEl.link?.targetNodeId).toBe(childId)

    // 4. Add hidden content
    const contentUseCase = new ContentUseCase(
      () => usePalaceStore.getState().nodes,
      (updated) => usePalaceStore.setState({ nodes: updated })
    )

    contentUseCase.setContent(el2.id, {
      text: 'Remember this object',
      audioUrl: 'voice.mp3',
      images: ['detail.png'],
    })

    const content = contentUseCase.getContent(el2.id)
    expect(content).toEqual({
      text: 'Remember this object',
      audioUrl: 'voice.mp3',
      images: ['detail.png'],
    })

    // 5. Persist
    await persistence.savePalace('integration-test', usePalaceStore.getState().nodes)

    // 6. Reload into fresh state
    usePalaceStore.setState({ nodes: [], currentSceneId: null, selectedElementId: null })
    expect(usePalaceStore.getState().nodes).toHaveLength(0)

    const loaded = await persistence.loadPalace('integration-test')
    usePalaceStore.setState({ nodes: loaded })

    // 7. Verify everything survived the round trip
    const restoredNodes = usePalaceStore.getState().nodes
    expect(restoredNodes).toHaveLength(2)

    const restoredRoot = restoredNodes.find(n => n.id === rootId)!
    expect(restoredRoot.label).toBe('Root Scene')
    expect(restoredRoot.elements).toHaveLength(2)
    expect(restoredRoot.elements[0].link?.targetNodeId).toBe(childId)

    const restoredContent = restoredRoot.elements[1].hiddenContent
    expect(restoredContent?.text).toBe('Remember this object')
    expect(restoredContent?.audioUrl).toBe('voice.mp3')

    // Cleanup
    await persistence.deletePalace('integration-test')
  })

  it('recall flow: hide → reveal → assess cycle', () => {
    const rootId = usePalaceStore.getState().addNode('Study Scene', null, [0, 0, 0])

    const elementUseCase = new ElementUseCase(
      () => usePalaceStore.getState().nodes,
      (updated) => usePalaceStore.setState({ nodes: updated }),
      () => rootId
    )

    const el1 = elementUseCase.addElement(rootId, ElementType.ImagePlane, 'item1.png', [0, 0, 0])
    const el2 = elementUseCase.addElement(rootId, ElementType.ImagePlane, 'item2.png', [2, 0, 0])

    const contentUseCase = new ContentUseCase(
      () => usePalaceStore.getState().nodes,
      (updated) => usePalaceStore.setState({ nodes: updated })
    )

    contentUseCase.setContent(el1.id, { text: 'Fact A' })
    contentUseCase.setContent(el2.id, { text: 'Fact B' })

    // Start recall: hide all
    contentUseCase.hideAllContent(rootId)

    let nodes = usePalaceStore.getState().nodes
    expect(nodes[0].elements[0].contentRevealed).toBe(false)
    expect(nodes[0].elements[0].hiddenContent?.text).toBe('Fact A') // data preserved
    expect(nodes[0].elements[1].contentRevealed).toBe(false)

    // Reveal one
    contentUseCase.revealContent(el1.id)
    nodes = usePalaceStore.getState().nodes
    expect(nodes[0].elements[0].contentRevealed).toBe(true)
    expect(nodes[0].elements[1].contentRevealed).toBe(false)

    // End recall: reveal all
    contentUseCase.revealAllContent(rootId)
    nodes = usePalaceStore.getState().nodes
    expect(nodes[0].elements[0].contentRevealed).toBe(true)
    expect(nodes[0].elements[1].contentRevealed).toBe(true)
  })
})
