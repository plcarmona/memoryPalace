import { PalaceNode, ElementType } from '../domain/models'
import { NavigationUseCase, CameraTarget } from '../application/NavigationUseCase'
import { ElementUseCase } from '../application/ElementUseCase'
import { ContentUseCase } from '../application/ContentUseCase'
import { TreeService } from '../domain/tree/TreeService'

describe('NavigationUseCase', () => {
  function setup() {
    const captured: CameraTarget[] = []
    const root = TreeService.createNode([], 'Root', null, [0, 0, 0])
    const child = TreeService.createNode([], 'Child', root.id, [10, 5, 0])
    const nodes = [root, child]

    const useCase = new NavigationUseCase(
      () => nodes,
      (target) => captured.push(target)
    )

    return { useCase, captured, nodes, root, child }
  }

  it('focusNode sets camera to focused mode above the node', () => {
    const { useCase, captured, child } = setup()
    useCase.focusNode(child.id)

    expect(captured).toHaveLength(1)
    expect(captured[0].mode).toBe('focused')
    expect(captured[0].lookAt).toEqual(child.position)
    expect(captured[0].position[2]).toBeGreaterThan(child.position[2])
  })

  it('focusNode does nothing for nonexistent node', () => {
    const { useCase, captured } = setup()
    useCase.focusNode('nonexistent')
    expect(captured).toHaveLength(0)
  })

  it('showOverview sets camera to overview mode', () => {
    const { useCase, captured } = setup()
    useCase.showOverview()

    expect(captured).toHaveLength(1)
    expect(captured[0].mode).toBe('overview')
  })

  it('navigateToLinkedElement follows element link to target node', () => {
    const { useCase, captured, root, child } = setup()

    const nodesWithElement: PalaceNode[] = [{
      ...root,
      elements: [{
        id: 'el-1',
        type: ElementType.ImagePlane,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        assetUrl: 'test.png',
        link: { targetNodeId: child.id },
      }],
    }, child]

    const navUseCase = new NavigationUseCase(
      () => nodesWithElement,
      (target) => captured.push(target)
    )

    navUseCase.navigateToLinkedElement('el-1')
    expect(captured).toHaveLength(1)
    expect(captured[0].mode).toBe('focused')
  })
})

describe('ElementUseCase', () => {
  function setup() {
    const root = TreeService.createNode([], 'Root', null, [0, 0, 0])
    let nodes: PalaceNode[] = [root]

    const useCase = new ElementUseCase(
      () => nodes,
      (updated) => { nodes = updated },
      () => root.id
    )

    return { useCase, getNodes: () => nodes, root }
  }

  it('addElement creates element in the specified scene', () => {
    const { useCase, getNodes, root } = setup()
    const element = useCase.addElement(root.id, ElementType.ImagePlane, 'test.png', [1, 2, 3])

    expect(element.type).toBe(ElementType.ImagePlane)
    expect(element.assetUrl).toBe('test.png')
    expect(element.position).toEqual([1, 2, 3])

    const nodes = getNodes()
    const rootNode = nodes.find(n => n.id === root.id)!
    expect(rootNode.elements).toHaveLength(1)
    expect(rootNode.elements[0].id).toBe(element.id)
  })

  it('removeElement removes element from scene', () => {
    const { useCase, getNodes, root } = setup()
    const element = useCase.addElement(root.id, ElementType.ImagePlane, 'test.png', [0, 0, 0])
    useCase.removeElement(root.id, element.id)

    const nodes = getNodes()
    expect(nodes.find(n => n.id === root.id)!.elements).toHaveLength(0)
  })

  it('transformElement updates position/rotation/scale', () => {
    const { useCase, getNodes, root } = setup()
    const element = useCase.addElement(root.id, ElementType.ImagePlane, 'test.png', [0, 0, 0])

    useCase.transformElement(element.id, {
      position: [5, 5, 5],
      rotation: [1, 0, 0],
      scale: [2, 2, 2],
    })

    const nodes = getNodes()
    const el = nodes.find(n => n.id === root.id)!.elements[0]
    expect(el.position).toEqual([5, 5, 5])
    expect(el.rotation).toEqual([1, 0, 0])
    expect(el.scale).toEqual([2, 2, 2])
  })

  it('linkElement sets link target on element', () => {
    const { useCase, getNodes, root } = setup()
    const element = useCase.addElement(root.id, ElementType.ImagePlane, 'test.png', [0, 0, 0])

    useCase.linkElement(element.id, 'target-node-id')

    const nodes = getNodes()
    const el = nodes.find(n => n.id === root.id)!.elements[0]
    expect(el.link).toEqual({ targetNodeId: 'target-node-id' })
  })
})

describe('ContentUseCase', () => {
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

    return { useCase, getNodes: () => nodes }
  }

  it('setContent attaches hidden content to an element', () => {
    const { useCase, getNodes } = setup()
    useCase.setContent('el-1', { text: 'Remember this' })

    const nodes = getNodes()
    const el = nodes[0].elements[0]
    expect(el.hiddenContent).toEqual({ text: 'Remember this' })
  })

  it('getContent retrieves hidden content from element', () => {
    const { useCase } = setup()
    useCase.setContent('el-1', { text: 'Hello', audioUrl: 'audio.mp3' })

    const content = useCase.getContent('el-1')
    expect(content).toEqual({ text: 'Hello', audioUrl: 'audio.mp3' })
  })

  it('getContent returns null for element with no content', () => {
    const { useCase } = setup()
    const content = useCase.getContent('el-1')
    expect(content).toBeNull()
  })

  it('hideAllContent hides content without deleting data', () => {
    const { useCase, getNodes } = setup()
    useCase.setContent('el-1', { text: 'Secret' })
    useCase.hideAllContent(getNodes()[0].id)

    const nodes = getNodes()
    expect(nodes[0].elements[0].hiddenContent).toEqual({ text: "Secret" }); expect(nodes[0].elements[0].contentRevealed).toBe(false)
  })
})