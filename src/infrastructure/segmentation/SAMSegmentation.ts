import { ISegmentationService, ImageSource, SegmentMask } from '../../domain/interfaces/ISegmentationService'
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 12)

const DEFAULT_ENDPOINT = 'http://localhost:8000'
const TIMEOUT = 60_000

interface SAMMask {
  bbox: [number, number, number, number]
  label?: string
  mask: number[][]
}

interface SAMResponse {
  masks: SAMMask[]
}

const cache = new Map<string, SegmentMask[]>()

function hashBlob(blob: Blob): string {
  return `seg-${blob.size}-${blob.type}`
}

export class SAMSegmentation implements ISegmentationService {
  private endpoint: string

  constructor(endpoint = DEFAULT_ENDPOINT) {
    this.endpoint = endpoint
  }

  async segment(image: ImageSource): Promise<SegmentMask[]> {
    const cacheKey = hashBlob(image.blob)
    const cached = cache.get(cacheKey)
    if (cached) return cached

    const formData = new FormData()
    formData.append('image', image.blob, 'image.png')

    const res = await fetch(`${this.endpoint}/segment`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(TIMEOUT),
    })

    if (!res.ok) {
      throw new Error(`SAM segmentation failed: ${res.status} ${res.statusText}`)
    }

    const data: SAMResponse = await res.json()

    const masks: SegmentMask[] = data.masks.map(samMask => {
      const maskBlob = new Blob(
        [new Uint8Array(samMask.mask.flat())],
        { type: 'application/octet-stream' }
      )

      return {
        id: nanoid(),
        maskUrl: URL.createObjectURL(maskBlob),
        boundingBox: samMask.bbox,
        label: samMask.label,
      }
    })

    cache.set(cacheKey, masks)
    return masks
  }

  clearCache(): void {
    cache.clear()
  }
}
