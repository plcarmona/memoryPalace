import { create } from 'zustand'
import { Vec3, NodeId, PalaceNode } from '../domain/models'
import { NavigationUseCase } from '../application/NavigationUseCase'
import { usePalaceStore } from './palaceStore'

type CameraMode = 'overview' | 'focused' | 'transitioning'

interface CameraState {
  mode: CameraMode
  targetPosition: Vec3
  targetLookAt: Vec3

  focusNode: (nodeId: NodeId) => void
  showOverview: () => void
  navigateToLinkedElement: (elementId: string) => void
  setMode: (mode: CameraMode) => void
}

function createNavUseCase(
  getNodes: () => PalaceNode[],
  set: (partial: Partial<CameraState>) => void
): NavigationUseCase {
  return new NavigationUseCase(
    getNodes,
    (target) => {
      set({
        mode: 'transitioning',
        targetPosition: target.position,
        targetLookAt: target.lookAt,
      })
      setTimeout(() => set({ mode: target.mode }), 500)
    }
  )
}

export const useCameraStore = create<CameraState>((set) => ({
  mode: 'overview',
  targetPosition: [0, 50, 50],
  targetLookAt: [0, 0, 0],

  focusNode: (nodeId) => {
    usePalaceStore.getState().setCurrentScene(nodeId)
    createNavUseCase(() => usePalaceStore.getState().nodes, set).focusNode(nodeId)
  },

  showOverview: () => {
    usePalaceStore.getState().setCurrentScene(null)
    createNavUseCase(() => usePalaceStore.getState().nodes, set).showOverview()
  },

  navigateToLinkedElement: (elementId) => {
    createNavUseCase(() => usePalaceStore.getState().nodes, set).navigateToLinkedElement(elementId)
  },

  setMode: (mode) => set({ mode }),
}))