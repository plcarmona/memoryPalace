import { Vec3, NodeId } from './types'
import { PalaceElement } from './PalaceElement'

export interface NodeMetadata {
  createdAt: number
  tags?: string[]
}

export interface PalaceNode {
  id: NodeId
  label: string
  parentId: NodeId | null
  position: Vec3
  scale?: number
  elements: PalaceElement[]
  metadata: NodeMetadata
  thumbnail?: string
}