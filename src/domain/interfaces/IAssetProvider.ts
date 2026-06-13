export interface AssetInfo {
  id: string
  name: string
  thumbnailUrl?: string
  type: 'model' | 'image'
  source: 'builtin' | 'custom'
  createdAt: number
}

export interface IAssetProvider {
  loadModel(id: string): Promise<{ url: string; type: 'gltf' | 'glb' }>
  listModels(): Promise<AssetInfo[]>
}