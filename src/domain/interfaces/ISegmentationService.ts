export interface ImageSource {
  url: string
  blob: Blob
  width: number
  height: number
}

export interface SegmentMask {
  id: string
  maskUrl: string
  boundingBox: [number, number, number, number]
  label?: string
}

export interface ISegmentationService {
  segment(image: ImageSource): Promise<SegmentMask[]>
}