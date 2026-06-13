import { registerElement } from './ElementFactory'
import { ElementType } from '../../../domain/models'
import { ImagePlane } from './ImagePlane'
import { Object3D } from './Object3D'
import { SegmentedElement } from './SegmentedElement'

registerElement(ElementType.ImagePlane, ImagePlane)
registerElement(ElementType.Object3D, Object3D)
registerElement(ElementType.Segment, SegmentedElement)
