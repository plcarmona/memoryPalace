import { useEffect, useRef } from 'react'
import { usePalaceStore } from '../../stores/palaceStore'
import { IndexedDBPersistence } from '../../infrastructure/persistence/IndexedDBPersistence'

const DEBOUNCE_MS = 1000
const PALACE_ID = 'default'

export function useAutoSave() {
  const nodes = usePalaceStore(s => s.nodes)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const persistenceRef = useRef(new IndexedDBPersistence())
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      if (nodes.length === 0) {
        persistenceRef.current.deletePalace(PALACE_ID)
      } else {
        persistenceRef.current.savePalace(PALACE_ID, nodes)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [nodes])
}

export function useLoadPalace() {
  useEffect(() => {
    async function load() {
      const persistence = new IndexedDBPersistence()
      const nodes = await persistence.loadPalace(PALACE_ID)
      if (nodes.length > 0) {
        usePalaceStore.setState({ nodes, isLoaded: true })
      } else {
        usePalaceStore.setState({ isLoaded: true })
      }
    }
    load()
  }, [])
}