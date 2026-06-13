import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useState } from 'react'
import { CameraController } from './presentation/canvas/camera/CameraController'
import { TreeOverview } from './presentation/canvas/overview/TreeOverview'
import { SceneRenderer } from './presentation/canvas/scene/SceneRenderer'
import { Toolbar } from './presentation/ui/Toolbar'
import { MemoryPanel } from './presentation/ui/MemoryPanel'
import { RecallMode } from './presentation/ui/RecallMode'
import { usePalaceStore } from './stores/palaceStore'
import { useCameraStore } from './stores/cameraStore'
import { useAutoSave, useLoadPalace } from './infrastructure/persistence/useAutoSave'
import { isDraggingGlobal } from './presentation/canvas/elements/useDrag'
import './presentation/canvas/elements/registry'

function App() {
  const { nodes, addNode, removeNode, isLoaded } = usePalaceStore()
  const { showOverview, mode } = useCameraStore()
  const [orbitEnabled, setOrbitEnabled] = useState(true)

  useLoadPalace()
  useAutoSave()

  useEffect(() => {
    if (!isLoaded) return

    if (nodes.length === 0) {
      addNode('Root', null, [0, 0, 0])
    }
    showOverview()
  }, [isLoaded])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && mode === 'overview') {
        const hovered = (window as any).__hoveredNodeId
        if (hovered) {
          removeNode(hovered)
        }
      }
      if (e.key === 'Escape') {
        usePalaceStore.getState().setCurrentScene(null)
        showOverview()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, showOverview, removeNode])

  useEffect(() => {
    const interval = setInterval(() => {
      setOrbitEnabled(!isDraggingGlobal.value)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const preventMiddleClick = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault()
    }
    window.addEventListener('auxclick', preventMiddleClick)
    window.addEventListener('mousedown', preventMiddleClick)
    return () => {
      window.removeEventListener('auxclick', preventMiddleClick)
      window.removeEventListener('mousedown', preventMiddleClick)
    }
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111' }}>
      <Toolbar />
      <Canvas style={{ paddingTop: 48 }}>
        <CameraController />
        <TreeOverview />
        <SceneRenderer />
        <OrbitControls
          enabled={orbitEnabled}
          mouseButtons={{
            LEFT: 2,
            MIDDLE: -1,
            RIGHT: 0,
          }}
        />
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={0.6} />
      </Canvas>
      <MemoryPanel />
      <RecallMode />
    </div>
  )
}

export default App
