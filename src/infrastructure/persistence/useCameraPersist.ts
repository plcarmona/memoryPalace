import { useEffect, useRef } from 'react'
import { useCameraStore } from '../../stores/cameraStore'

const STORAGE_KEY = 'mp-camera'
const DEBOUNCE_MS = 500

export function useCameraPersist() {
  const viewport = useCameraStore(s => s.viewport)
  const savedViewports = useCameraStore(s => s.savedViewports)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      if (data.viewport) {
        useCameraStore.getState().setViewport(data.viewport.x, data.viewport.y, data.viewport.zoom)
      }
      if (data.savedViewports) {
        useCameraStore.setState({ savedViewports: data.savedViewports })
      }
    } catch {
      // ignore corrupt data
    }
    loadedRef.current = true
  }, [])

  useEffect(() => {
    if (!loadedRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ viewport, savedViewports }))
      } catch {
        // storage full or unavailable
      }
    }, DEBOUNCE_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [viewport, savedViewports])
}
