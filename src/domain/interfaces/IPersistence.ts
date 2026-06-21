import { PalaceNode } from '../models/PalaceNode'

export interface PalaceInfo {
  id: string
  label: string
  thumbnail?: string
  updatedAt: number
}

export interface SnapshotInfo {
  id: string
  label: string
  palaceId: string
  createdAt: number
}

export interface IPersistence {
  savePalace(id: string, nodes: PalaceNode[]): Promise<void>
  loadPalace(id: string): Promise<PalaceNode[]>
  listPalaces(): Promise<PalaceInfo[]>
  deletePalace(id: string): Promise<void>
  saveAsset(id: string, blob: Blob, type: string): Promise<void>
  loadAsset(id: string): Promise<Blob | null>
  saveSnapshot(snapshotId: string, palaceId: string, label: string, nodes: PalaceNode[]): Promise<void>
  listSnapshots(palaceId: string): Promise<SnapshotInfo[]>
  loadSnapshot(snapshotId: string): Promise<PalaceNode[]>
  deleteSnapshot(snapshotId: string): Promise<void>
}
