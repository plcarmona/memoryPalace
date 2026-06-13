import { IImageGenerator, ImageData } from '../domain/interfaces/IImageGenerator'
import { IPersistence } from '../domain/interfaces/IPersistence'
import { NodeId, PalaceNode, ElementType, Vec3 } from '../domain/models'
import { ElementUseCase } from './ElementUseCase'
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 16)

export class GenerationUseCase {
  constructor(
    private generator: IImageGenerator,
    private persistence: IPersistence,
    private getNodes: () => PalaceNode[],
    private setNodes: (nodes: PalaceNode[]) => void,
    private getCurrentSceneId: () => NodeId | null
  ) {}

  async generateAndPlace(
    prompt: string,
    sceneId: NodeId,
    position: Vec3
  ): Promise<{ elementId: string; imageData: ImageData }> {
    // Generate image
    const imageData = await this.generator.generate(prompt)

    // Store the blob as an asset
    const assetId = `gen-${nanoid()}`
    await this.persistence.saveAsset(assetId, imageData.blob, 'image/png')

    // Create an object URL for the asset
    const assetUrl = imageData.url

    // Create element via ElementUseCase
    const elementUseCase = new ElementUseCase(
      this.getNodes,
      this.setNodes,
      this.getCurrentSceneId
    )

    const element = elementUseCase.addElement(sceneId, ElementType.ImagePlane, assetUrl, position)

    return { elementId: element.id, imageData }
  }

  async generateOnly(prompt: string): Promise<ImageData> {
    return this.generator.generate(prompt)
  }
}
