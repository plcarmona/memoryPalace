import { usePalaceStore } from '../stores/palaceStore'

const HISTORY_LIMIT = 100

export interface DragHistorySession {
  end: () => void
}

export function beginTrackedDrag(): DragHistorySession {
  const temporal = usePalaceStore.temporal.getState()
  const wasTracking = temporal.isTracking
  const preDragNodes = usePalaceStore.getState().nodes
  temporal.pause()

  return {
    end() {
      temporal.resume()
      if (!wasTracking) return
      const postNodes = usePalaceStore.getState().nodes
      if (postNodes === preDragNodes) return
      usePalaceStore.temporal.setState(state => ({
        pastStates: [...state.pastStates, { nodes: preDragNodes }].slice(-HISTORY_LIMIT),
        futureStates: [],
      }))
    },
  }
}
