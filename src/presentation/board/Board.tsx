import { useRef, useCallback, useEffect } from 'react'
import { useCameraStore } from '../../stores/cameraStore'
import { usePalaceStore } from '../../stores/palaceStore'
import { SceneView } from './SceneView'

export function Board() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { viewport, animating, finishAnimation, targetViewport } = useCameraStore()
  const { nodes, currentSceneId, setSelectedElement } = usePalaceStore()
  const isPanning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const didDrag = useRef(false)

  const screenW = typeof window !== 'undefined' ? window.innerWidth : 1920
  const screenH = typeof window !== 'undefined' ? window.innerHeight - 48 : 1080

  const tx = -viewport.x * viewport.zoom + screenW / 2
  const ty = -viewport.y * viewport.zoom + screenH / 2

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 2) {
      isPanning.current = true
      didDrag.current = false
      lastMouse.current = { x: e.clientX, y: e.clientY }
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }

    const zoom = useCameraStore.getState().viewport.zoom
    useCameraStore.getState().setViewport(
      useCameraStore.getState().viewport.x - dx / zoom,
      useCameraStore.getState().viewport.y - dy / zoom,
      zoom
    )
  }, [])

  const handleMouseUp = useCallback(() => {
    if (isPanning.current && !didDrag.current) {
      setSelectedElement(null)
    }
    isPanning.current = false
  }, [setSelectedElement])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const vp = useCameraStore.getState().viewport
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.1, Math.min(5, vp.zoom * zoomFactor))

    const mouseX = e.clientX
    const mouseY = e.clientY - 48

    const worldX = vp.x + (mouseX - screenW / 2) / vp.zoom
    const worldY = vp.y + (mouseY - screenH / 2) / vp.zoom

    const newX = worldX - (mouseX - screenW / 2) / newZoom
    const newY = worldY - (mouseY - screenH / 2) / newZoom

    useCameraStore.getState().setViewport(newX, newY, newZoom)
  }, [screenW, screenH])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  useEffect(() => {
    if (!animating) return

    const startVp = { ...useCameraStore.getState().viewport }
    const endVp = { ...targetViewport }
    const duration = 400
    const start = performance.now()

    let raf: number
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

      const x = startVp.x + (endVp.x - startVp.x) * ease
      const y = startVp.y + (endVp.y - startVp.y) * ease
      const zoom = startVp.zoom + (endVp.zoom - startVp.zoom) * ease

      useCameraStore.getState().setViewport(x, y, zoom)

      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        finishAnimation()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [animating, targetViewport])

  useEffect(() => {
    if (!animating && currentSceneId) {
      const vp = useCameraStore.getState().viewport
      useCameraStore.getState().saveCurrentViewport(currentSceneId, vp)
    }
  }, [animating, currentSceneId])

  const currentScene = nodes.find(n => n.id === currentSceneId)

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={e => e.preventDefault()}
      style={{
        position: 'absolute',
        top: 48,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        background: '#0a0a12',
        cursor: isPanning.current ? 'grabbing' : 'grab',
      }}
    >
      <div style={{
        transform: `translate(${tx}px, ${ty}px) scale(${viewport.zoom})`,
        transformOrigin: '0 0',
        position: 'absolute',
        top: 0,
        left: 0,
      }}>
        {currentScene && <SceneView scene={currentScene} allNodes={nodes} />}
      </div>
    </div>
  )
}
