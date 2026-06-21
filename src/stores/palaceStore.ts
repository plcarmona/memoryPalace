import { create } from 'zustand'
import { temporal } from 'zundo'
import { PalaceNode, NodeId, ElementId } from '../domain/models'
import { TreeService } from '../domain/tree/TreeService'
import { ElementUseCase } from '../application/ElementUseCase'
import { IndexedDBPersistence } from '../infrastructure/persistence/IndexedDBPersistence'
import type { SnapshotInfo } from '../domain/interfaces/IPersistence'

const PALACE_ID = 'default'

function newPersistence() {
  return new IndexedDBPersistence()
}

function reorderElement(
  nodes: PalaceNode[],
  elementId: ElementId,
  computeNewIndex: (currentIndex: number, length: number) => number
): PalaceNode[] {
  return nodes.map(n => {
    const idx = n.elements.findIndex(e => e.id === elementId)
    if (idx === -1) return n
    const newIdx = computeNewIndex(idx, n.elements.length)
    if (newIdx === idx || newIdx < 0 || newIdx >= n.elements.length) return n
    const newElements = [...n.elements]
    const [moved] = newElements.splice(idx, 1)
    newElements.splice(newIdx, 0, moved)
    return { ...n, elements: newElements }
  })
}

interface PalaceState {
  nodes: PalaceNode[]
  currentSceneId: NodeId | null
  selectedElementId: ElementId | null
  selectedElementIds: ElementId[]
  selectedRegionId: string | null
  isLoaded: boolean

  addNode: (label: string, parentId: NodeId | null, position: [number, number, number]) => NodeId
  removeNode: (nodeId: NodeId) => void
  setCurrentScene: (nodeId: NodeId | null) => void
  setSelectedElement: (elementId: ElementId | null) => void
  toggleElementSelection: (elementId: ElementId) => void
  setSelectedRegion: (regionId: string | null) => void
  addElement: (type: string, assetUrl: string, position: [number, number, number]) => void
  addElementToScene: (sceneId: NodeId, type: string, assetUrl: string, position: [number, number, number]) => string
  removeElement: (elementId: ElementId) => void
  removeElementFromScene: (sceneId: NodeId, elementId: ElementId) => void
  transformElement: (elementId: ElementId, transform: { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }) => void
  linkElement: (elementId: ElementId, targetNodeId: NodeId) => void
  updateElement: (elementId: ElementId, updates: Record<string, unknown>) => void
  groupElements: (elementIds: ElementId[]) => void
  ungroupElements: (groupId: string) => void
  toggleLock: (elementId: ElementId) => void
  moveElementForward: (elementId: ElementId) => void
  moveElementBackward: (elementId: ElementId) => void
  bringElementToFront: (elementId: ElementId) => void
  sendElementToBack: (elementId: ElementId) => void
  setIsLoaded: (loaded: boolean) => void
  setNodes: (nodes: PalaceNode[]) => void
  clearAll: () => void
  moveNode: (nodeId: NodeId, position: [number, number, number]) => void
  renameNode: (nodeId: NodeId, label: string) => void
  scaleNode: (nodeId: NodeId, scale: number) => void
  setNodeTags: (nodeId: NodeId, tags: string[]) => void
  saveSnapshot: (label?: string) => Promise<SnapshotInfo | null>
  listSnapshots: () => Promise<SnapshotInfo[]>
  restoreSnapshot: (snapshotId: string) => Promise<void>
  deleteSnapshot: (snapshotId: string) => Promise<void>
}

export const usePalaceStore = create<PalaceState>()(temporal((set, get) => ({
  nodes: [],
  currentSceneId: null,
  selectedElementId: null,
  selectedElementIds: [],
  selectedRegionId: null,
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
    set({ selectedElementId: elementId, selectedElementIds: elementId ? [elementId] : [], selectedRegionId: null })
  },

  toggleElementSelection: (elementId) => {
    const { selectedElementIds, selectedElementId } = get()
    if (selectedElementIds.includes(elementId)) {
      const next = selectedElementIds.filter(id => id !== elementId)
      set({ selectedElementIds: next, selectedElementId: next[next.length - 1] ?? null })
    } else {
      const next = [...selectedElementIds, elementId]
      set({ selectedElementIds: next, selectedElementId })
    }
  },

  setSelectedRegion: (regionId) => {
    set({ selectedRegionId: regionId })
  },

  addElement: (type, assetUrl, position) => {
    const { currentSceneId } = get()
    if (!currentSceneId) return
    get().addElementToScene(currentSceneId, type, assetUrl, position)
  },

  addElementToScene: (sceneId, type, assetUrl, position) => {
    const useCase = new ElementUseCase(
      () => get().nodes,
      (newNodes) => set({ nodes: newNodes }),
      () => sceneId
    )
    const el = useCase.addElement(sceneId, type as any, assetUrl, position)
    return el.id
  },

  removeElement: (elementId) => {
    const { currentSceneId } = get()
    if (!currentSceneId) return
    get().removeElementFromScene(currentSceneId, elementId)
  },

  removeElementFromScene: (sceneId, elementId) => {
    const useCase = new ElementUseCase(
      () => get().nodes,
      (newNodes) => set({ nodes: newNodes }),
      () => sceneId
    )
    useCase.removeElement(sceneId, elementId)
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

  updateElement: (elementId, updates) => {
    set({
      nodes: get().nodes.map(n => ({
        ...n,
        elements: n.elements.map(e =>
          e.id === elementId ? { ...e, ...updates } : e
        ),
      })),
    })
  },

  groupElements: (elementIds) => {
    const groupId = `grp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    set({
      nodes: get().nodes.map(n => ({
        ...n,
        elements: n.elements.map(e =>
          elementIds.includes(e.id) ? { ...e, groupId } : e
        ),
      })),
    })
  },

  ungroupElements: (groupId) => {
    set({
      nodes: get().nodes.map(n => ({
        ...n,
        elements: n.elements.map(e =>
          e.groupId === groupId ? { ...e, groupId: undefined } : e
        ),
      })),
    })
  },

  toggleLock: (elementId) => {
    set({
      nodes: get().nodes.map(n => ({
        ...n,
        elements: n.elements.map(e =>
          e.id === elementId ? { ...e, locked: !e.locked } : e
        ),
      })),
    })
  },

  moveElementForward: (elementId) => {
    set({
      nodes: reorderElement(get().nodes, elementId,
        (i, len) => Math.min(i + 1, len - 1)),
    })
  },

  moveElementBackward: (elementId) => {
    set({
      nodes: reorderElement(get().nodes, elementId,
        (i) => Math.max(i - 1, 0)),
    })
  },

  bringElementToFront: (elementId) => {
    set({
      nodes: reorderElement(get().nodes, elementId,
        (_i, len) => len - 1),
    })
  },

  sendElementToBack: (elementId) => {
    set({
      nodes: reorderElement(get().nodes, elementId,
        () => 0),
    })
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

  renameNode: (nodeId, label) => {
    const { nodes } = get()
    set({ nodes: nodes.map(n => n.id === nodeId ? { ...n, label } : n) })
  },

  scaleNode: (nodeId, scale) => {
    const { nodes } = get()
    set({ nodes: nodes.map(n => n.id === nodeId ? { ...n, scale } : n) })
  },

  setNodeTags: (nodeId, tags) => {
    const { nodes } = get()
    set({ nodes: nodes.map(n => n.id === nodeId ? { ...n, metadata: { ...n.metadata, tags } } : n) })
  },

  saveSnapshot: async (label) => {
    const { nodes } = get()
    const snapshotId = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const snapshotLabel = label?.trim() || new Date().toLocaleString()
    await newPersistence().saveSnapshot(snapshotId, PALACE_ID, snapshotLabel, nodes)
    return {
      id: snapshotId,
      palaceId: PALACE_ID,
      label: snapshotLabel,
      createdAt: Date.now(),
    }
  },

  listSnapshots: async () => {
    return newPersistence().listSnapshots(PALACE_ID)
  },

  restoreSnapshot: async (snapshotId) => {
    const loaded = await newPersistence().loadSnapshot(snapshotId)
    set({ nodes: loaded, currentSceneId: null, selectedElementId: null, selectedElementIds: [], selectedRegionId: null })
    // Wipe undo history so users can't undo across the restore boundary
    usePalaceStore.temporal.getState().clear()
  },

  deleteSnapshot: async (snapshotId) => {
    await newPersistence().deleteSnapshot(snapshotId)
  },
}), {
  limit: 100,
  partialize: (state) => ({ nodes: state.nodes }),
  equality: (a, b) => a.nodes === b.nodes,
}))
