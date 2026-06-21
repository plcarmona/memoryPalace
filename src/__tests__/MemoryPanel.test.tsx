/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryPanel } from '../presentation/ui/MemoryPanel'
import { usePalaceStore } from '../stores/palaceStore'
import { useUIStore } from '../stores/uiStore'
import { ElementType } from '../domain/models'

describe('MemoryPanel', () => {
  beforeEach(() => {
    usePalaceStore.setState({ nodes: [], currentSceneId: null, selectedElementId: null })
    useUIStore.setState({ activePanel: 'none', editMode: false })
  })

  it('returns null when panel is not memory-panel', () => {
    useUIStore.getState().setActivePanel('toolbar')
    const { container } = render(<MemoryPanel />)
    expect(container.innerHTML).toBe('')
  })

  it('returns null when no element is selected', () => {
    useUIStore.getState().setActivePanel('memory-panel')
    const { container } = render(<MemoryPanel />)
    expect(container.innerHTML).toBe('')
  })

  it('renders panel header when active with selected element', () => {
    const rootId = usePalaceStore.getState().addNode('Root', null, [0, 0, 0])

    // Add element with content via store
    const nodes = usePalaceStore.getState().nodes.map(n =>
      n.id === rootId ? {
        ...n,
        elements: [{
          id: 'el-test',
          type: ElementType.ImagePlane,
          position: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
          assetUrl: 'test.png',
          hiddenContent: { text: 'Remember this fact' },
          contentRevealed: true,
        }],
      } : n
    )
    usePalaceStore.setState({ nodes, selectedElementId: 'el-test' })
    useUIStore.getState().setActivePanel('memory-panel')

    render(<MemoryPanel />)

    expect(screen.getByText('Memory Content')).toBeInTheDocument()
    expect(screen.getByText('Remember this fact')).toBeInTheDocument()
  })

  it('shows "No audio" when no audio attached', () => {
    const rootId = usePalaceStore.getState().addNode('Root', null, [0, 0, 0])
    const nodes = usePalaceStore.getState().nodes.map(n =>
      n.id === rootId ? {
        ...n,
        elements: [{
          id: 'el-audio',
          type: ElementType.ImagePlane,
          position: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
          assetUrl: 'test.png',
          hiddenContent: {},
          contentRevealed: true,
        }],
      } : n
    )
    usePalaceStore.setState({ nodes, selectedElementId: 'el-audio' })
    useUIStore.getState().setActivePanel('memory-panel')

    render(<MemoryPanel />)

    expect(screen.getByText('No audio attached')).toBeInTheDocument()
    expect(screen.getByText('No images attached')).toBeInTheDocument()
  })

  it('closes when ✕ is clicked', () => {
    const rootId = usePalaceStore.getState().addNode('Root', null, [0, 0, 0])
    const nodes = usePalaceStore.getState().nodes.map(n =>
      n.id === rootId ? {
        ...n,
        elements: [{
          id: 'el-close',
          type: ElementType.ImagePlane,
          position: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
          assetUrl: 'test.png',
          hiddenContent: { text: 'data' },
          contentRevealed: true,
        }],
      } : n
    )
    usePalaceStore.setState({ nodes, selectedElementId: 'el-close' })
    useUIStore.getState().setActivePanel('memory-panel')

    render(<MemoryPanel />)
    fireEvent.click(screen.getByText('✕'))

    expect(useUIStore.getState().activePanel).toBe('none')
  })

  it('shows portal link when element is linked', () => {
    const rootId = usePalaceStore.getState().addNode('Root', null, [0, 0, 0])
    const nodes = usePalaceStore.getState().nodes.map(n =>
      n.id === rootId ? {
        ...n,
        elements: [{
          id: 'el-linked',
          type: ElementType.ImagePlane,
          position: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
          assetUrl: 'test.png',
          hiddenContent: { text: 'linked content' },
          contentRevealed: true,
          link: { targetNodeId: 'target-scene' },
        }],
      } : n
    )
    usePalaceStore.setState({ nodes, selectedElementId: 'el-linked' })
    useUIStore.getState().setActivePanel('memory-panel')

    render(<MemoryPanel />)

    expect(screen.getByText('Portal Link')).toBeInTheDocument()
  })
})
