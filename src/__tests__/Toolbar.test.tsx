/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { Toolbar } from '../presentation/ui/Toolbar'
import { usePalaceStore } from '../stores/palaceStore'
import { useCameraStore } from '../stores/cameraStore'
import { useUIStore } from '../stores/uiStore'

describe('Toolbar', () => {
  beforeEach(() => {
    usePalaceStore.setState({ nodes: [], currentSceneId: null, selectedElementId: null, isLoaded: true })
    useCameraStore.setState({ viewport: { x: 0, y: 0, zoom: 1 }, targetViewport: { x: 0, y: 0, zoom: 1 }, animating: false, savedViewports: {} })
    useUIStore.setState({ activePanel: 'toolbar', editMode: false })
  })

  it('renders Home button', () => {
    render(<Toolbar onLinkCommand={() => {}} onShowSnapshots={() => {}} />)
    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('renders + Scene button', () => {
    render(<Toolbar onLinkCommand={() => {}} onShowSnapshots={() => {}} />)
    expect(screen.getByText('+ Scene')).toBeInTheDocument()
  })

  it('shows scene count', () => {
    usePalaceStore.getState().addNode('Root', null, [0, 0, 0])
    render(<Toolbar onLinkCommand={() => {}} onShowSnapshots={() => {}} />)
    expect(screen.getByText(/1 scene/)).toBeInTheDocument()
  })

  it('does not show Edit or Generate when no scene is focused', () => {
    render(<Toolbar onLinkCommand={() => {}} onShowSnapshots={() => {}} />)
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('🎨 Generate')).not.toBeInTheDocument()
  })

  it('shows Edit and Generate when a scene is focused', () => {
    const id = usePalaceStore.getState().addNode('My Scene', null, [0, 0, 0])
    usePalaceStore.getState().setCurrentScene(id)
    render(<Toolbar onLinkCommand={() => {}} onShowSnapshots={() => {}} />)

    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('🎨 Generate')).toBeInTheDocument()
  })

  it('adds a scene when + Scene is clicked', () => {
    render(<Toolbar onLinkCommand={() => {}} onShowSnapshots={() => {}} />)
    const before = usePalaceStore.getState().nodes.length

    fireEvent.click(screen.getByText('+ Scene'))

    const after = usePalaceStore.getState().nodes.length
    expect(after).toBe(before + 1)
  })

  it('toggles edit mode on click', () => {
    const id = usePalaceStore.getState().addNode('Scene', null, [0, 0, 0])
    usePalaceStore.getState().setCurrentScene(id)
    render(<Toolbar onLinkCommand={() => {}} onShowSnapshots={() => {}} />)

    expect(useUIStore.getState().editMode).toBe(false)
    fireEvent.click(screen.getByText('Edit'))

    expect(useUIStore.getState().editMode).toBe(true)
    expect(screen.getByText('Editing')).toBeInTheDocument()
  })

  it('shows scene label when focused', () => {
    const id = usePalaceStore.getState().addNode('My Palace', null, [0, 0, 0])
    usePalaceStore.getState().setCurrentScene(id)
    render(<Toolbar onLinkCommand={() => {}} onShowSnapshots={() => {}} />)

    expect(screen.getByDisplayValue('My Palace')).toBeInTheDocument()
  })
})
