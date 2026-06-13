import { create } from 'zustand'
import { ElementId, NodeId } from '../domain/models'

export interface RecallAnswer {
  elementId: ElementId
  sceneId: NodeId
  correct: boolean
}

interface RecallState {
  isActive: boolean
  sceneOrder: NodeId[]
  currentSceneIndex: number
  answers: RecallAnswer[]
  waitingForAnswer: boolean
  currentRevealElementId: ElementId | null

  startRecall: (sceneIds: NodeId[]) => void
  endRecall: () => void
  nextScene: () => void
  recordAnswer: (elementId: ElementId, sceneId: NodeId, correct: boolean) => void
  setWaitingForAnswer: (waiting: boolean) => void
  setCurrentRevealElement: (elementId: ElementId | null) => void
}

export const useRecallStore = create<RecallState>((set, get) => ({
  isActive: false,
  sceneOrder: [],
  currentSceneIndex: 0,
  answers: [],
  waitingForAnswer: false,
  currentRevealElementId: null,

  startRecall: (sceneIds) => {
    const shuffled = [...sceneIds].sort(() => Math.random() - 0.5)
    set({
      isActive: true,
      sceneOrder: shuffled,
      currentSceneIndex: 0,
      answers: [],
      waitingForAnswer: false,
      currentRevealElementId: null,
    })
  },

  endRecall: () => {
    // Preserve answers for summary, but clear everything else
    set({
      isActive: false,
      sceneOrder: [],
      currentSceneIndex: 0,
      waitingForAnswer: false,
      currentRevealElementId: null,
    })
  },

  nextScene: () => {
    const { currentSceneIndex, sceneOrder } = get()
    if (currentSceneIndex < sceneOrder.length - 1) {
      set({
        currentSceneIndex: currentSceneIndex + 1,
        waitingForAnswer: false,
        currentRevealElementId: null,
      })
    }
  },

  recordAnswer: (elementId, sceneId, correct) => {
    const { answers } = get()
    set({ answers: [...answers, { elementId, sceneId, correct }] })
  },

  setWaitingForAnswer: (waiting) => set({ waitingForAnswer: waiting }),

  setCurrentRevealElement: (elementId) => set({ currentRevealElementId: elementId }),
}))
