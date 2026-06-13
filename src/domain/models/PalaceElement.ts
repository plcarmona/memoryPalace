import { Vec3, ElementType, ElementId } from './types'
import { HiddenContent } from './HiddenContent'

export interface ElementLink {
  targetNodeId: string
}

export interface SegmentData {
  maskUrl: string
  originalImageId: string
  boundingBox: [number, number, number, number]
}

export interface PalaceElement {
  id: ElementId
  type: ElementType
  position: Vec3
  rotation: Vec3
  scale: Vec3
  assetUrl: string
  link?: ElementLink
  hiddenContent?: HiddenContent
  contentRevealed?: boolean
  segmentData?: SegmentData
}
