export interface ImageData {
  url: string
  blob: Blob
  width: number
  height: number
}

export interface IImageGenerator {
  generate(prompt: string): Promise<ImageData>
}