import { create } from 'zustand'
import { NodeId } from '../domain/models'
import { usePalaceStore } from './palaceStore'

export interface Viewport {
  x: number
  y: number
  zoom: number
}

interface CameraState {
  viewport: Viewport
  targetViewport: Viewport
  animating: boolean
  savedViewports: Record<string, Viewport>

  navigateToScene: (nodeId: NodeId) => void
  goHome: () => void
  navigateToLinkedElement: (elementId: string) => void
  setViewport: (x: number, y: number, zoom: number) => void
  finishAnimation: () => void
  saveCurrentViewport: (nodeId: string, viewport: Viewport) => void
}

function getNodeViewport(nodes: ReturnType<typeof usePalaceStore.getState>['nodes'], nodeId: string, savedViewports: Record<string, Viewport>): Viewport {
  const saved = savedViewports[nodeId]
  if (saved) return saved
  const node = nodes.find(n => n.id === nodeId)
  return { x: node?.position[0] ?? 0, y: node?.position[1] ?? 0, zoom: 1 }
}

export const useCameraStore = create<CameraState>((set, get) => ({
  viewport: { x: 0, y: 0, zoom: 1 },
  targetViewport: { x: 0, y: 0, zoom: 1 },
  animating: false,
  savedViewports: {},

  navigateToScene: (nodeId) => {
    const { viewport, savedViewports } = get()
    const currentId = usePalaceStore.getState().currentSceneId
    if (currentId) {
      get().saveCurrentViewport(currentId, viewport)
    }

    usePalaceStore.getState().setCurrentScene(nodeId)
    const nodes = usePalaceStore.getState().nodes
    const target = getNodeViewport(nodes, nodeId, savedViewports)

    set({ targetViewport: target, animating: true })
  },

  goHome: () => {
    const root = usePalaceStore.getState().nodes.find(n => n.parentId === null)
    if (root) {
      get().navigateToScene(root.id)
    }
  },

  navigateToLinkedElement: (elementId) => {
    const nodes = usePalaceStore.getState().nodes
    for (const node of nodes) {
      const element = node.elements.find(e => e.id === elementId)
      if (element?.link?.targetNodeId) {
        get().navigateToScene(element.link.targetNodeId)
        return
      }
    }
  },

  setViewport: (x, y, zoom) => set({ viewport: { x, y, zoom } }),

  finishAnimation: () => {
    set({
      viewport: { ...get().targetViewport },
      animating: false,
    })
  },

  saveCurrentViewport: (nodeId, viewport) => {
    set({
      savedViewports: {
        ...get().savedViewports,
        [nodeId]: { ...viewport },
      },
    })
  },
}))
