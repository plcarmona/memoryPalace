import { IPersistence, PalaceInfo } from '../domain/interfaces/IPersistence'
import { IImageGenerator, ImageData } from '../domain/interfaces/IImageGenerator'
import { ISegmentationService, ImageSource, SegmentMask } from '../domain/interfaces/ISegmentationService'
import { GenerationUseCase } from '../application/GenerationUseCase'
import { PalaceNode, ElementType } from '../domain/models'
import { TreeService } from '../domain/tree/TreeService'

// --- Mock implementations for testing ---

class MockGenerator implements IImageGenerator {
  async generate(prompt: string): Promise<ImageData> {
    const blob = new Blob([new Uint8Array(64 * 64 * 4)], { type: "image/png" })
    return { url: `mock://${prompt}`, blob, width: 64, height: 64 }
  }
}

class MockPersistence implements IPersistence {
  private palaces = new Map<string, PalaceNode[]>()
  private assets = new Map<string, Blob>()

  async savePalace(id: string, nodes: PalaceNode[]): Promise<void> {
    this.palaces.set(id, nodes)
  }
  async loadPalace(id: string): Promise<PalaceNode[]> {
    return this.palaces.get(id) ?? []
  }
  async listPalaces(): Promise<PalaceInfo[]> {
    return Array.from(this.palaces.entries()).map(([id, nodes]) => ({
      id,
      label: nodes.find(n => !n.parentId)?.label ?? 'Untitled',
      updatedAt: Date.now(),
    }))
  }
  async deletePalace(id: string): Promise<void> {
    this.palaces.delete(id)
  }
  async saveAsset(id: string, blob: Blob, _type: string): Promise<void> {
    this.assets.set(id, blob)
  }
  async loadAsset(id: string): Promise<Blob | null> {
    return this.assets.get(id) ?? null
  }
}

class MockSegmentation implements ISegmentationService {
  async segment(image: ImageSource): Promise<SegmentMask[]> {
    return [
      { id: 'seg-1', maskUrl: 'mock://mask1', boundingBox: [10, 10, 50, 50], label: 'object' },
      { id: 'seg-2', maskUrl: 'mock://mask2', boundingBox: [60, 60, 30, 30] },
    ]
  }
}

// --- Tests ---

describe('GenerationUseCase', () => {
  it('generateAndPlace creates element with generated image', async () => {
    const root = TreeService.createNode([], 'Root', null, [0, 0, 0])
    let nodes: PalaceNode[] = [root]

    const useCase = new GenerationUseCase(
      new MockGenerator(),
      new MockPersistence(),
      () => nodes,
      (updated) => { nodes = updated },
      () => root.id
    )

    const result = await useCase.generateAndPlace(
      'a mountain landscape',
      root.id,
      [1, 2, 3]
    )

    expect(result.elementId).toBeTruthy()
    expect(result.imageData.url).toBe('mock://a mountain landscape')
    expect(result.imageData.width).toBe(64)

    const updatedRoot = nodes.find(n => n.id === root.id)!
    expect(updatedRoot.elements).toHaveLength(1)
    expect(updatedRoot.elements[0].type).toBe(ElementType.ImagePlane)
    expect(updatedRoot.elements[0].position).toEqual([1, 2, 3])
  })

  it('generateOnly returns image without placing', async () => {
    let nodes: PalaceNode[] = []

    const useCase = new GenerationUseCase(
      new MockGenerator(),
      new MockPersistence(),
      () => nodes,
      (updated) => { nodes = updated },
      () => null
    )

    const imageData = await useCase.generateOnly('test prompt')
    expect(imageData.url).toBe('mock://test prompt')
    expect(nodes).toHaveLength(0) // no elements added
  })
})

describe('MockSegmentation (interface contract)', () => {
  it('returns segment masks for an image', async () => {
    const service = new MockSegmentation()
    const blob = new Blob(['fake-image'], { type: 'image/png' })
    const masks = await service.segment({ url: 'test.png', blob, width: 100, height: 100 })

    expect(masks).toHaveLength(2)
    expect(masks[0].id).toBe('seg-1')
    expect(masks[0].boundingBox).toEqual([10, 10, 50, 50])
    expect(masks[0].label).toBe('object')
    expect(masks[1].boundingBox).toEqual([60, 60, 30, 30])
  })
})

describe('IPersistence asset methods', () => {
  it('round-trips assets through persistence', async () => {
    const persistence = new MockPersistence()

    const blob = new Blob(['asset-data'], { type: 'image/png' })
    await persistence.saveAsset('asset-1', blob, 'image/png')
    const loaded = await persistence.loadAsset('asset-1')

    expect(loaded).not.toBeNull()
    const text = await loaded!.text()
    expect(text).toBe('asset-data')
  })

  it('returns null for nonexistent asset', async () => {
    const persistence = new MockPersistence()
    const loaded = await persistence.loadAsset('nonexistent')
    expect(loaded).toBeNull()
  })
})
