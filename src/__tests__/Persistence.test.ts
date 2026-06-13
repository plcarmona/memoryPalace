import { IndexedDBPersistence } from '../infrastructure/persistence/IndexedDBPersistence'
import { TreeService } from '../domain/tree/TreeService'

describe('IndexedDBPersistence', () => {
  let persistence: IndexedDBPersistence

  beforeEach(() => {
    persistence = new IndexedDBPersistence()
  })

  describe('savePalace + loadPalace', () => {
    it('round-trips palace data through IndexedDB', async () => {
      const root = TreeService.createNode([], 'Root', null, [0, 0, 0])
      const child = TreeService.createNode([], 'Child', root.id, [4, 4, 0])
      const nodes = [root, child]

      await persistence.savePalace('test-palace', nodes)
      const loaded = await persistence.loadPalace('test-palace')

      expect(loaded).toHaveLength(2)
      expect(loaded[0].label).toBe('Root')
      expect(loaded[1].label).toBe('Child')
      expect(loaded[1].parentId).toBe(root.id)
    })

    it('returns empty array for nonexistent palace', async () => {
      const loaded = await persistence.loadPalace('nonexistent')
      expect(loaded).toEqual([])
    })
  })

  describe('listPalaces', () => {
    it('lists saved palaces', async () => {
      const nodes = [TreeService.createNode([], 'Test', null, [0, 0, 0])]
      await persistence.savePalace('palace-1', nodes)
      await persistence.savePalace('palace-2', nodes)

      const list = await persistence.listPalaces()
      expect(list.length).toBeGreaterThanOrEqual(2)
      const ids = list.map(p => p.id)
      expect(ids).toContain('palace-1')
      expect(ids).toContain('palace-2')
    })
  })

  describe('deletePalace', () => {
    it('removes a saved palace', async () => {
      const nodes = [TreeService.createNode([], 'Temp', null, [0, 0, 0])]
      await persistence.savePalace('to-delete', nodes)

      await persistence.deletePalace('to-delete')
      const loaded = await persistence.loadPalace('to-delete')
      expect(loaded).toEqual([])
    })
  })

  describe('saveAsset + loadAsset', () => {
    it('round-trips binary assets', async () => {
      const blob = new Blob(['test-data'], { type: 'text/plain' })
      await persistence.saveAsset('asset-1', blob, 'text/plain')

      const loaded = await persistence.loadAsset('asset-1')
      expect(loaded).not.toBeNull()
      expect(loaded!.type).toBe('text/plain')

      const text = await loaded!.text()
      expect(text).toBe('test-data')
    })

    it('returns null for nonexistent asset', async () => {
      const loaded = await persistence.loadAsset('nonexistent')
      expect(loaded).toBeNull()
    })
  })
})