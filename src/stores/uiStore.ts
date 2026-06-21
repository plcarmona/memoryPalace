import { create } from 'zustand'

type PanelType = 'none' | 'toolbar' | 'node-editor' | 'element-editor' | 'memory-panel'

interface UIState {
  activePanel: PanelType
  editMode: boolean
  showImagePicker: boolean

  setActivePanel: (panel: PanelType) => void
  setEditMode: (enabled: boolean) => void
  setShowImagePicker: (show: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  activePanel: 'toolbar',
  editMode: false,
  showImagePicker: false,

  setActivePanel: (panel) => set({ activePanel: panel }),
  setEditMode: (enabled) => set({ editMode: enabled }),
  setShowImagePicker: (show) => set({ showImagePicker: show }),
}))