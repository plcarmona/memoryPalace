/**
 * @vitest-environment jsdom
 */
import 'fake-indexeddb/auto'
import { ExportUseCase } from '../application/ExportUseCase'
import { usePalaceStore } from '../stores/palaceStore'
import type { PalaceNode } from '../domain/models'

function makeNode(overrides: Partial<PalaceNode> = {}): PalaceNode {
  return {
    id: 'n-' + Math.random().toString(36).slice(2, 8),
    label: 'Scene',
    parentId: null,
    position: [0, 0, 0],
    elements: [],
    ...overrides,
  }
}

describe('ExportUseCase', () => {
  let useCase: ExportUseCase

  beforeEach(() => {
    useCase = new ExportUseCase()
  })

  describe('exportPalace', () => {
    it('produces a non-empty Blob', async () => {
      const nodes = [makeNode({ label: 'Root' })]
      const blob = await useCase.exportPalace(nodes)
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.size).toBeGreaterThan(0)
    })

    it('preserves node structure in the manifest', async () => {
      const root = makeNode({ label: 'Root' })
      const child = makeNode({ label: 'Child', parentId: root.id })
      const blob = await useCase.exportPalace([root, child])

      // Re-import to verify
      const imported = await useCase.importPalace(blob)
      expect(imported).toHaveLength(2)
      expect(imported.find(n => n.label === 'Root')).toBeDefined()
      expect(imported.find(n => n.label === 'Child')).toBeDefined()
      expect(imported.find(n => n.label === 'Child')?.parentId).toBe(root.id)
    })

    it('rewrites image-plane assetUrls to blob: URLs on import', async () => {
      // Use a data URL so fetch works in jsdom
      const pixelDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
      const node = makeNode({
        elements: [{
          id: 'e1',
          type: 'image-plane',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          assetUrl: pixelDataUrl,
        }],
      })

      const blob = await useCase.exportPalace([node])
      const imported = await useCase.importPalace(blob)

      const importedUrl = imported[0].elements[0].assetUrl
      expect(importedUrl).not.toBe(pixelDataUrl)
      expect(importedUrl.startsWith('blob:')).toBe(true)
    })

    it('skips builtin: asset URLs (no fetch needed)', async () => {
      const node = makeNode({
        elements: [{
          id: 'e1',
          type: '3d-object',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          assetUrl: 'builtin:cube',
        }],
      })
      const blob = await useCase.exportPalace([node])
      const imported = await useCase.importPalace(blob)
      // builtin URLs pass through unchanged
      expect(imported[0].elements[0].assetUrl).toBe('builtin:cube')
    })

    it('preserves text element content', async () => {
      const node = makeNode({
        elements: [{
          id: 'e1',
          type: 'text',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          assetUrl: 'Hello world',
        }],
      })
      const blob = await useCase.exportPalace([node])
      const imported = await useCase.importPalace(blob)
      expect(imported[0].elements[0].assetUrl).toBe('Hello world')
    })

    it('handles element links and segment regions', async () => {
      const node = makeNode({
        elements: [{
          id: 'e1',
          type: 'image-plane',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          assetUrl: 'builtin:cube',
          link: { targetNodeId: 'other-scene' },
          segmentRegions: [{
            id: 'r1',
            boundingBox: [10, 20, 30, 40],
          }],
        }],
      })
      const blob = await useCase.exportPalace([node])
      const imported = await useCase.importPalace(blob)
      const el = imported[0].elements[0]
      expect(el.link?.targetNodeId).toBe('other-scene')
      expect(el.segmentRegions?.[0].id).toBe('r1')
    })

    it('round-trips an empty palace', async () => {
      const blob = await useCase.exportPalace([])
      const imported = await useCase.importPalace(blob)
      expect(imported).toEqual([])
    })

    it('rejects archives with no manifest', async () => {
      await expect(useCase.importPalace(new Blob([new Uint8Array([0, 1, 2])]))).rejects.toThrow()
    })
  })

  describe('download helper', () => {
    it('creates an <a> element and triggers a click', () => {
      const blob = new Blob(['test'], { type: 'text/plain' })
      const clickSpy = vi.fn()
      const originalCreate = document.createElement.bind(document)
      const anchorEl = {
        href: '',
        download: '',
        click: clickSpy,
      } as unknown as HTMLAnchorElement
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') return anchorEl
        return originalCreate(tag)
      })
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as never)
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as never)

      ExportUseCase.download(blob, 'test.zip')
      expect(clickSpy).toHaveBeenCalledTimes(1)
      expect(anchorEl.download).toBe('test.zip')
    })
  })
})

import { vi } from 'vitest'
