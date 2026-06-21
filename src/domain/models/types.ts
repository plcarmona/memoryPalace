export type Vec3 = [number, number, number]

export type NodeId = string

export type ElementId = string

export enum ElementType {
  ImagePlane = 'image-plane',
  Object3D = '3d-object',
  Segment = 'segment',
  Text = 'text',
}