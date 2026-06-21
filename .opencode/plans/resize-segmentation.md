# Resize + Segmentation Build Plan

## 1. Resize Controls
- Corner handle (bottom-right) on selected elements
- Uses `scale[0]` as uniform multiplier on base 200px
- Images: `width = 200 * scale[0]`, height auto
- Text: `width = 200 * scale[0]`, `fontSize = 14 * scale[0]`
- Drag adjusted for viewport zoom

## 2. Domain Model Changes
Add to `PalaceElement.ts`:
```ts
interface SegmentRegion {
  id: string
  boundingBox: [number, number, number, number]
  label?: string
  link?: ElementLink
  linkedElementId?: string
}
// PalaceElement.segmentRegions?: SegmentRegion[]
```

## 3. Store Changes (`palaceStore.ts`)
- `selectedRegionId: string | null`
- `setSelectedRegion(regionId)`
- `addElementToScene(sceneId, type, assetUrl, position) => elementId`

## 4. SegmentationUseCase (new file)
- `segment(elementId)`: data URL → blob → SAM → store regions
- `linkRegion(elementId, regionId, targetNodeId)`: crop region → create image in target scene → link region
- `unlinkRegion(elementId, regionId)`: remove linked image → clear link

## 5. SceneView Changes
- Resize handle on selected elements
- Region overlays on segmented images (hover highlight, click select/navigate)
- Scale-aware rendering for images and text

## 6. Toolbar + App
- Segment button when image selected
- S keyboard shortcut
- L shortcut: links region if selected, else element
