import { openDB, IDBPDatabase } from 'idb'
import { PalaceNode } from '../../domain/models'
import { IPersistence, PalaceInfo } from '../../domain/interfaces/IPersistence'

const DB_NAME = 'memory-palace'
const DB_VERSION = 1
const PALACES_STORE = 'palaces'
const ASSETS_STORE = 'assets'

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
}