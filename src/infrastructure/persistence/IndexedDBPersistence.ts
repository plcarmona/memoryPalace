import { openDB, IDBPDatabase } from 'idb'
import { PalaceNode } from '../../domain/models'
import { IPersistence, PalaceInfo, SnapshotInfo } from '../../domain/interfaces/IPersistence'

const DB_NAME = 'memory-palace'
const DB_VERSION = 2
const PALACES_STORE = 'palaces'
const ASSETS_STORE = 'assets'
const SNAPSHOTS_STORE = 'snapshots'

interface PalaceDB {
  palaces: {
    key: string
    value: {
      id: string
      label: string
      thumbnail?: string
      updatedAt: number
      nodes: PalaceNode[]
    }
  }
  assets: {
    key: string
    value: {
      id: string
      blob: Blob
      type: string
      createdAt: number
    }
  }
  snapshots: {
    key: string
    value: {
      id: string
      palaceId: string
      label: string
      createdAt: number
      nodes: PalaceNode[]
    }
  }
}

async function getDB(): Promise<IDBPDatabase<PalaceDB>> {
  return openDB<PalaceDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(PALACES_STORE)) {
        db.createObjectStore(PALACES_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(ASSETS_STORE)) {
        db.createObjectStore(ASSETS_STORE, { keyPath: 'id' })
      }
      // Added in v2: snapshots store, indexed by palaceId for fast lookup
      if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
        const store = db.createObjectStore(SNAPSHOTS_STORE, { keyPath: 'id' })
        store.createIndex('palaceId', 'palaceId')
      }
    },
  })
}

export class IndexedDBPersistence implements IPersistence {
  async savePalace(id: string, nodes: PalaceNode[]): Promise<void> {
    const db = await getDB()
    const label = nodes.find(n => n.parentId === null)?.label ?? 'Untitled Palace'
    await db.put(PALACES_STORE, {
      id,
      label,
      updatedAt: Date.now(),
      nodes,
    })
  }

  async loadPalace(id: string): Promise<PalaceNode[]> {
    const db = await getDB()
    const record = await db.get(PALACES_STORE, id)
    return record?.nodes ?? []
  }

  async listPalaces(): Promise<PalaceInfo[]> {
    const db = await getDB()
    const all = await db.getAll(PALACES_STORE)
    return all.map(record => ({
      id: record.id,
      label: record.label,
      thumbnail: record.thumbnail,
      updatedAt: record.updatedAt,
    }))
  }

  async deletePalace(id: string): Promise<void> {
    const db = await getDB()
    await db.delete(PALACES_STORE, id)
  }

  async saveAsset(id: string, blob: Blob, type: string): Promise<void> {
    const db = await getDB()
    await db.put(ASSETS_STORE, {
      id,
      blob,
      type,
      createdAt: Date.now(),
    })
  }

  async loadAsset(id: string): Promise<Blob | null> {
    const db = await getDB()
    const record = await db.get(ASSETS_STORE, id)
    return record?.blob ?? null
  }

  async saveSnapshot(snapshotId: string, palaceId: string, label: string, nodes: PalaceNode[]): Promise<void> {
    const db = await getDB()
    await db.put(SNAPSHOTS_STORE, {
      id: snapshotId,
      palaceId,
      label,
      createdAt: Date.now(),
      nodes,
    })
  }

  async listSnapshots(palaceId: string): Promise<SnapshotInfo[]> {
    const db = await getDB()
    const all = await db.getAllFromIndex(SNAPSHOTS_STORE, 'palaceId', palaceId)
    return all
      .map(record => ({
        id: record.id,
        palaceId: record.palaceId,
        label: record.label,
        createdAt: record.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  async loadSnapshot(snapshotId: string): Promise<PalaceNode[]> {
    const db = await getDB()
    const record = await db.get(SNAPSHOTS_STORE, snapshotId)
    return record?.nodes ?? []
  }

  async deleteSnapshot(snapshotId: string): Promise<void> {
    const db = await getDB()
    await db.delete(SNAPSHOTS_STORE, snapshotId)
  }
}