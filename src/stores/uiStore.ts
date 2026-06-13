import { create } from 'zustand'

type PanelType = 'none' | 'toolbar' | 'node-editor' | 'element-editor' | 'memory-panel' | 'recall-mode'

interface UIState {
  activePanel: PanelType
  editMode: boolean
  recallMode: boolean

  setActivePanel: (panel: PanelType) => void
  setEditMode: (enabled: boolean) => void
  setRecallMode: (enabled: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  activePanel: 'toolbar',
  editMode: false,
  recallMode: false,

  setActivePanel: (panel) => set({ activePanel: panel }),
  setEditMode: (enabled) => set({ editMode: enabled }),
  setRecallMode: (enabled) => set({ recallMode: enabled }),
}))