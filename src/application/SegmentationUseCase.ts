import { customAlphabet } from 'nanoid'
import { NodeId, PalaceNode, PalaceElement, SegmentRegion } from '../domain/models'
import { SAMSegmentation } from '../infrastructure/segmentation/SAMSegmentation'
import { ImageSource } from '../domain/interfaces/ISegmentationService'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 12)

export class SegmentationUseCase {
  private sam: SAMSegmentation

  constructor(
    private getNodes: () => PalaceNode[],
    private setNodes: (nodes: PalaceNode[]) => void,
    private addElementToScene: (sceneId: NodeId, type: string, assetUrl: string, position: [number, number, number]) => string,
    private removeElementFromScene: (sceneId: NodeId, elementId: string) => void,
    endpoint?: string
  ) {
    this.sam = new SAMSegmentation(endpoint)
  }

  async segment(elementId: string): Promise<void> {
    const nodes = this.getNodes()
    let element: { assetUrl: string } | undefined
    for (const node of nodes) {
      const el = node.elements.find(e => e.id === elementId)
      if (el) { element = el; break }
    }
    if (!element) throw new Error('Element not found')

    const blob = await (await fetch(element.assetUrl)).blob()
    const img = await this.loadImage(element.assetUrl)

    const source: ImageSource = {
      url: element.assetUrl,
      blob,
      width: img.naturalWidth,
      height: img.naturalHeight,
    }

    const masks = await this.sam.segment(source)

    const regions: SegmentRegion[] = masks.map(m => ({
      id: m.id || nanoid(),
      boundingBox: m.boundingBox,
      label: m.label,
    }))

    this.updateElementRegions(elementId, regions)
  }

  async linkRegion(elementId: string, regionId: string, targetNodeId: NodeId): Promise<void> {
    const nodes = this.getNodes()

    let sourceNodeId: NodeId | undefined
    let element: PalaceElement | undefined
    for (const node of nodes) {
      const el = node.elements.find(e => e.id === elementId)
      if (el) { element = el; sourceNodeId = node.id; break }
    }
    if (!element?.segmentRegions || !sourceNodeId) return

    const region = element.segmentRegions.find(r => r.id === regionId)
    if (!region) return

    const croppedDataUrl = await this.cropRegionAsync(element.assetUrl, region.boundingBox)

    const pos: [number, number, number] = [
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      0,
    ]

    const linkedElementId = this.addElementToScene(
      targetNodeId,
      'image-plane',
      croppedDataUrl,
      pos
    )

    const updatedRegions = element.segmentRegions.map(r =>
      r.id === regionId
        ? { ...r, link: { targetNodeId }, linkedElementId }
        : r
    )

    const freshNodes = this.getNodes()
    this.setNodes(freshNodes.map(n => ({
      ...n,
      elements: n.elements.map(e => {
        if (e.id === elementId) return { ...e, segmentRegions: updatedRegions }
        if (e.id === linkedElementId) return { ...e, link: { targetNodeId: sourceNodeId! } }
        return e
      }),
    })))
  }

  unlinkRegion(elementId: string, regionId: string): void {
    const nodes = this.getNodes()
    const element = this.findElement(nodes, elementId)
    if (!element?.segmentRegions) return

    const region = element.segmentRegions.find(r => r.id === regionId)
    if (!region?.link || !region.linkedElementId) return

    this.removeElementFromScene(region.link.targetNodeId, region.linkedElementId)

    const updatedRegions = element.segmentRegions.map(r =>
      r.id === regionId
        ? { ...r, link: undefined, linkedElementId: undefined }
        : r
    )
    this.updateElementRegions(elementId, updatedRegions)
  }

  private updateElementRegions(elementId: string, regions: SegmentRegion[]): void {
    const nodes = this.getNodes()
    this.setNodes(nodes.map(n => ({
      ...n,
      elements: n.elements.map(e =>
        e.id === elementId ? { ...e, segmentRegions: regions } : e
      ),
    })))
  }

  private findElement(nodes: PalaceNode[], elementId: string) {
    for (const node of nodes) {
      const el = node.elements.find(e => e.id === elementId)
      if (el) return el
    }
    return undefined
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  async cropRegionAsync(dataUrl: string, bbox: [number, number, number, number]): Promise<string> {
    const img = await this.loadImage(dataUrl)
    const [x, y, w, h] = bbox
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return dataUrl
    ctx.drawImage(img, x, y, w, h, 0, 0, w, h)
    return canvas.toDataURL('image/png')
  }
}
