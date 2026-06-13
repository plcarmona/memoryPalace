/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { RecallMode } from '../presentation/ui/RecallMode'
import { usePalaceStore } from '../stores/palaceStore'
import { useUIStore } from '../stores/uiStore'
import { useRecallStore } from '../stores/recallStore'
import { useCameraStore } from '../stores/cameraStore'
import { ElementType } from '../domain/models'

function setupSceneWithContent() {
  const rootId = usePalaceStore.getState().addNode('Study Scene', null, [0, 0, 0])

  const nodes = usePalaceStore.getState().nodes.map(n =>
    n.id === rootId ? {
      ...n,
      elements: [{
        id: 'el-mem',
        type: ElementType.ImagePlane,
        position: [0, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: [1, 1, 1] as [number, number, number],
        assetUrl: 'test.png',
        hiddenContent: { text: 'Remember me' },
        contentRevealed: true,
      }],
    } : n
  )
  usePalaceStore.setState({ nodes })
  return rootId
}

describe('RecallMode', () => {
  beforeEach(() => {
    usePalaceStore.setState({ nodes: [], currentSceneId: null, selectedElementId: null })
    useUIStore.setState({ activePanel: 'toolbar', editMode: false, recallMode: false })
    useRecallStore.setState({
      isActive: false,
      sceneOrder: [],
      currentSceneIndex: 0,
      answers: [],
      waitingForAnswer: false,
      currentRevealElementId: null,
    })
    useCameraStore.setState({ mode: 'overview', targetPosition: [0, 50, 50], targetLookAt: [0, 0, 0] })
  })

  it('returns null when recall mode is off', () => {
    const { container } = render(<RecallMode />)
    expect(container.innerHTML).toBe('')
  })

  it('shows start screen when recall mode is toggled on', () => {
    useUIStore.getState().setRecallMode(true)
    render(<RecallMode />)

    expect(screen.getByText('Recall Mode')).toBeInTheDocument()
    expect(screen.getByText('Start')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('shows "0 scenes" when no content exists', () => {
    usePalaceStore.getState().addNode('Empty', null, [0, 0, 0])
    useUIStore.getState().setRecallMode(true)
    render(<RecallMode />)

    expect(screen.getByText(/0 scenes/)).toBeInTheDocument()
  })

  it('shows scene count with content', () => {
    setupSceneWithContent()
    useUIStore.getState().setRecallMode(true)
    render(<RecallMode />)

    expect(screen.getByText(/1 scene with memory items/)).toBeInTheDocument()
  })

  it('cancel returns to normal mode', () => {
    useUIStore.getState().setRecallMode(true)
    render(<RecallMode />)

    fireEvent.click(screen.getByText('Cancel'))
    expect(useUIStore.getState().recallMode).toBe(false)
  })

  it('start button begins recall session', () => {
    setupSceneWithContent()
    useUIStore.getState().setRecallMode(true)
    render(<RecallMode />)

    fireEvent.click(screen.getByText('Start'))

    expect(useRecallStore.getState().isActive).toBe(true)
    expect(useRecallStore.getState().sceneOrder).toHaveLength(1)
  })
})
