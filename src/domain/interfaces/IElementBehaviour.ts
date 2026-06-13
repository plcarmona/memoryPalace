export interface TransformData {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}

export interface ITransformable {
  isTransformable: true
}

export interface ILinkable {
  isLinkable: true
  targetNodeId: string
}

export interface IContentCarrier {
  hasContent: true
  contentHidden: boolean
}

export interface ISegmentable {
  isSegmentable: true
  segmentCount: number
}