import { useEffect, useState } from 'react'
import { Board } from './presentation/board/Board'
import { Toolbar } from './presentation/ui/Toolbar'
import { MemoryPanel } from './presentation/ui/MemoryPanel'
import { CommandPalette } from './presentation/ui/CommandPalette'
import { CommandMenu } from './presentation/ui/CommandMenu'
import { ImagePicker } from './presentation/ui/ImagePicker'
import { SnapshotsPanel } from './presentation/ui/SnapshotsPanel'
import { usePalaceStore } from './stores/palaceStore'
import { useCameraStore } from './stores/cameraStore'
import { useUIStore } from './stores/uiStore'
import { useAutoSave, useLoadPalace } from './infrastructure/persistence/useAutoSave'
import { useCameraPersist } from './infrastructure/persistence/useCameraPersist'
import { SegmentationUseCase } from './application/SegmentationUseCase'

function App() {
  const { nodes, addNode, isLoaded } = usePalaceStore()
  const { goHome, navigateToScene } = useCameraStore()
  const { showImagePicker, setShowImagePicker } = useUIStore()
  const [showLinkPalette, setShowLinkPalette] = useState(false)
  const [showCommandMenu, setShowCommandMenu] = useState(false)
  const [showSnapshots, setShowSnapshots] = useState(false)

  useLoadPalace()
  useAutoSave()
  useCameraPersist()

  useEffect(() => {
    if (!isLoaded) return
    if (nodes.length === 0) {
      const rootId = addNode('Home', null, [0, 0, 0])
      usePalaceStore.getState().setCurrentScene(rootId)
      useCameraStore.getState().setViewport(0, 0, 1)
    } else {
      const root = usePalaceStore.getState().nodes.find(n => n.parentId === null)
      if (root) navigateToScene(root.id)
    }
  }, [isLoaded])

  // Reconcile transient selection state after undo/redo may have removed nodes/elements
  useEffect(() => {
    const { selectedElementId, selectedElementIds, currentSceneId, nodes, setSelectedElement, setCurrentScene } =
      usePalaceStore.getState()
    let needsUpdate = false
    const patch: Partial<ReturnType<typeof usePalaceStore.getState>> = {}

    // Clear selection if element no longer exists in its scene
    if (selectedElementId) {
      const scene = nodes.find(n => n.id === currentSceneId)
      const exists = scene?.elements.some(e => e.id === selectedElementId) ?? false
      if (!exists) {
        patch.selectedElementId = null
        patch.selectedElementIds = []
        patch.selectedRegionId = null
        needsUpdate = true
      }
    } else if (selectedElementIds.length > 0) {
      const scene = nodes.find(n => n.id === currentSceneId)
      const surviving = selectedElementIds.filter(id => scene?.elements.some(e => e.id === id) ?? false)
      if (surviving.length !== selectedElementIds.length) {
        patch.selectedElementIds = surviving
        needsUpdate = true
      }
    }

    // Clear currentSceneId if the focused scene was removed by undo
    if (currentSceneId && !nodes.some(n => n.id === currentSceneId)) {
      patch.currentSceneId = null
      patch.selectedElementId = null
      patch.selectedElementIds = []
      needsUpdate = true
    }

    if (needsUpdate) usePalaceStore.setState(patch)
    void setSelectedElement; void setCurrentScene
  }, [nodes])

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
      if (isTyping) return
      const { currentSceneId } = usePalaceStore.getState()
      if (!currentSceneId) return

      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const blob = item.getAsFile()
          if (!blob) continue
          const reader = new FileReader()
          reader.onload = () => {
            const dataUrl = reader.result as string
            const position: [number, number, number] = [
              (Math.random() - 0.5) * 4,
              (Math.random() - 0.5) * 4,
              0,
            ]
            usePalaceStore.getState().addElement('image-plane', dataUrl, position)
          }
          reader.readAsDataURL(blob)
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandMenu(s => !s)
        return
      }

      if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        if (e.shiftKey) {
          usePalaceStore.temporal.getState().redo()
        } else {
          usePalaceStore.temporal.getState().undo()
        }
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault()
        usePalaceStore.temporal.getState().redo()
        return
      }

      if (isTyping) return

      if (e.key === 'Escape') {
        if (showCommandMenu) { setShowCommandMenu(false); return }
        if (showLinkPalette) { setShowLinkPalette(false); return }
        if (showImagePicker) { setShowImagePicker(false); return }
        const { currentSceneId, nodes, selectedRegionId, setSelectedRegion } = usePalaceStore.getState()
        if (selectedRegionId) {
          setSelectedRegion(null)
          return
        }
        if (currentSceneId) {
          const current = nodes.find(n => n.id === currentSceneId)
          if (current?.parentId) {
            navigateToScene(current.parentId)
          } else {
            goHome()
          }
        }
      }

      if (isTyping) return

      if (e.key === 'l' || e.key === 'L') {
        const { selectedElementId } = usePalaceStore.getState()
        if (selectedElementId) {
          e.preventDefault()
          setShowLinkPalette(true)
        }
      }

      if (e.key === 'i' || e.key === 'I') {
        const { currentSceneId, selectedElementId } = usePalaceStore.getState()
        if (!currentSceneId) return
        e.preventDefault()
        if (selectedElementId) {
          setShowLinkPalette(true)
        } else {
          setShowImagePicker(true)
        }
      }

      if (e.key === 'g' && !e.shiftKey) {
        const { selectedElementIds } = usePalaceStore.getState()
        if (selectedElementIds.length >= 2) {
          e.preventDefault()
          usePalaceStore.getState().groupElements(selectedElementIds)
        }
      }

      if (e.key === 'G' || (e.shiftKey && e.key === 'g')) {
        const { selectedElementId, nodes, currentSceneId } = usePalaceStore.getState()
        if (!selectedElementId || !currentSceneId) return
        const scene = nodes.find(n => n.id === currentSceneId)
        const element = scene?.elements.find(el => el.id === selectedElementId)
        if (element?.groupId) {
          e.preventDefault()
          usePalaceStore.getState().ungroupElements(element.groupId)
        }
      }

      if (e.key === 'f' || e.key === 'F') {
        const { selectedElementId } = usePalaceStore.getState()
        if (selectedElementId) {
          e.preventDefault()
          usePalaceStore.getState().toggleLock(selectedElementId)
        }
      }

      if (e.key === 's' || e.key === 'S') {
        const { selectedElementId, currentSceneId, nodes } = usePalaceStore.getState()
        if (!selectedElementId || !currentSceneId) return
        const scene = nodes.find(n => n.id === currentSceneId)
        const element = scene?.elements.find(el => el.id === selectedElementId)
        if (element?.type === 'image-plane') {
          e.preventDefault()
          handleSegment(selectedElementId)
        }
      }

      if (e.key === '[') {
        const { selectedElementId } = usePalaceStore.getState()
        if (!selectedElementId) return
        e.preventDefault()
        if (e.shiftKey) {
          usePalaceStore.getState().sendElementToBack(selectedElementId)
        } else {
          usePalaceStore.getState().moveElementBackward(selectedElementId)
        }
      }

      if (e.key === ']') {
        const { selectedElementId } = usePalaceStore.getState()
        if (!selectedElementId) return
        e.preventDefault()
        if (e.shiftKey) {
          usePalaceStore.getState().bringElementToFront(selectedElementId)
        } else {
          usePalaceStore.getState().moveElementForward(selectedElementId)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showLinkPalette, showCommandMenu, showImagePicker, goHome, navigateToScene, setShowImagePicker])

  const handleSegment = async (elementId: string) => {
    try {
      const useCase = new SegmentationUseCase(
        () => usePalaceStore.getState().nodes,
        (nodes) => usePalaceStore.setState({ nodes }),
        (sceneId, type, url, pos) => usePalaceStore.getState().addElementToScene(sceneId, type, url, pos),
        (sceneId, elId) => usePalaceStore.getState().removeElementFromScene(sceneId, elId),
      )
      await useCase.segment(elementId)
    } catch (err) {
      console.error('Segmentation failed:', err)
    }
  }

  const handleLinkSelect = async (nodeId: string) => {
    const { selectedElementId, selectedRegionId } = usePalaceStore.getState()

    if (selectedElementId && selectedRegionId) {
      const useCase = new SegmentationUseCase(
        () => usePalaceStore.getState().nodes,
        (newNodes) => usePalaceStore.getState().setNodes(newNodes),
        (sceneId, type, url, pos) => usePalaceStore.getState().addElementToScene(sceneId, type, url, pos),
        (sceneId, elId) => usePalaceStore.getState().removeElementFromScene(sceneId, elId),
      )
      await useCase.linkRegion(selectedElementId, selectedRegionId, nodeId)
      usePalaceStore.getState().setSelectedRegion(null)
    } else if (selectedElementId) {
      usePalaceStore.getState().linkElement(selectedElementId, nodeId)
    }
    setShowLinkPalette(false)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a12', overflow: 'hidden' }}>
      <Toolbar
        onLinkCommand={() => setShowLinkPalette(true)}
        onShowSnapshots={() => setShowSnapshots(true)}
      />
      <Board />
      <MemoryPanel />
      {showLinkPalette && (
        <CommandPalette
          onSelect={handleLinkSelect}
          onClose={() => setShowLinkPalette(false)}
          excludeNodeId={usePalaceStore.getState().currentSceneId ?? undefined}
        />
      )}
      {showCommandMenu && (
        <CommandMenu
          onClose={() => setShowCommandMenu(false)}
          onLink={() => setShowLinkPalette(true)}
          onSegment={(elId) => handleSegment(elId)}
        />
      )}
      {showImagePicker && (
        <ImagePicker onClose={() => setShowImagePicker(false)} />
      )}
      {showSnapshots && (
        <SnapshotsPanel onClose={() => setShowSnapshots(false)} />
      )}
    </div>
  )
}

export default App
