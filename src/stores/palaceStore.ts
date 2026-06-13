import { create } from 'zustand'
import { PalaceNode, NodeId, ElementId } from '../domain/models'
import { TreeService } from '../domain/tree/TreeService'
import { ElementUseCase } from '../application/ElementUseCase'

interface PalaceState {
  nodes: PalaceNode[]
  currentSceneId: NodeId | null
  selectedElementId: ElementId | null
  isLoaded: boolean

  addNode: (label: string, parentId: NodeId | null, position: [number, number, number]) => NodeId
  removeNode: (nodeId: NodeId) => void
  setCurrentScene: (nodeId: NodeId | null) => void
  setSelectedElement: (elementId: ElementId | null) => void
  addElement: (type: string, assetUrl: string, position: [number, number, number]) => void
  removeElement: (elementId: ElementId) => void
  transformElement: (elementId: ElementId, transform: { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }) => void
  linkElement: (elementId: ElementId, targetNodeId: NodeId) => void
  setIsLoaded: (loaded: boolean) => void
  setNodes: (nodes: PalaceNode[]) => void
  clearAll: () => void
  moveNode: (nodeId: NodeId, position: [number, number, number]) => void
}

export const usePalaceStore = create<PalaceState>((set, get) => ({
  nodes: [],
  currentSceneId: null,
  selectedElementId: null,
  isLoaded: false,

  addNode: (label, parentId, position) => {
    const { nodes } = get()
    const newNode = TreeService.createNode(nodes, label, parentId, position)
    set({ nodes: [...nodes, newNode] })
    return newNode.id
  },

  removeNode: (nodeId) => {
    const { nodes, currentSceneId } = get()
    const newNodes = TreeService.removeChild(nodes, nodeId)

    // If the deleted node was focused, clear currentSceneId
    const newCurrentSceneId = currentSceneId === nodeId ? null : currentSceneId

    set({ nodes: newNodes, currentSceneId: newCurrentSceneId })
  },

  setCurrentScene: (nodeId) => {
    set({ currentSceneId: nodeId, selectedElementId: null })
  },

  setSelectedElement: (elementId) => {
    set({ selectedElementId: elementId })
  },

  addElement: (type, assetUrl, position) => {
    const { currentSceneId } = get()
    if (!currentSceneId) return

    const useCase = new ElementUseCase(
      () => get().nodes,
      (newNodes) => set({ nodes: newNodes }),
      () => get().currentSceneId
    )
    useCase.addElement(currentSceneId, type as any, assetUrl, position)
  },

  removeElement: (elementId) => {
    const { currentSceneId } = get()
    if (!currentSceneId) return

    const useCase = new ElementUseCase(
      () => get().nodes,
      (newNodes) => set({ nodes: newNodes }),
      () => get().currentSceneId
    )
    useCase.removeElement(currentSceneId, elementId)
  },

  transformElement: (elementId, transform) => {
    const useCase = new ElementUseCase(
      () => get().nodes,
      (newNodes) => set({ nodes: newNodes }),
      () => get().currentSceneId
    )
    useCase.transformElement(elementId, transform)
  },

  linkElement: (elementId, targetNodeId) => {
    const useCase = new ElementUseCase(
      () => get().nodes,
      (newNodes) => set({ nodes: newNodes }),
      () => get().currentSceneId
    )
    useCase.linkElement(elementId, targetNodeId)
  },

  setIsLoaded: (loaded) => {
    set({ isLoaded: loaded })
  },

  setNodes: (newNodes) => {
    set({ nodes: newNodes })
  },

  clearAll: () => {
    set({ nodes: [], currentSceneId: null, selectedElementId: null })
  },

  moveNode: (nodeId, position) => {
    const { nodes } = get()
    set({ nodes: nodes.map(n => n.id === nodeId ? { ...n, position } : n) })
  },
}))
