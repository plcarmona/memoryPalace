# Infrastructure Module

## Responsibility
Implement domain interfaces with concrete technologies (IndexedDB, HTTP APIs,
file system). This is the outermost layer — it knows about browsers, networks,
and storage, but the rest of the app doesn't know about it.

## Interfaces (Implements domain contracts)

### persistence/IndexedDBPersistence
Implements `IPersistence`:
- `savePalace(id, data)` — serializes PalaceNode[] to IndexedDB
- `loadPalace(id)` → `PalaceNode[]` — deserializes from IndexedDB
- `listPalaces()` → `{id, label, thumbnail}[]` — lists saved palaces
- `deletePalace(id)` — removes palace and associated assets
- Asset blob storage — separate `assets` object store for images, models, audio

### segmentation/SAMSegmentation
Implements `ISegmentationService`:
- `segment(image)` → `SegmentMask[]` — POST image to SAM server endpoint
- Mask normalization — converts SAM output to domain `SegmentMask` format
- Result caching — indexed by image hash to avoid re-processing

### generation/SDXLGenerator
Implements `IImageGenerator`:
- `generate(prompt)` → `ImageData` — calls ComfyUI or A1111 API
- Provider detection — checks which local API is reachable
- Configurable endpoint — user can set API URL in settings
- Error handling — timeout, connection refused, GPU OOM

### assets/AssetLibrary
Implements `IAssetProvider`:
- `loadModel(id)` → `GLTF` — loads glTF from bundled assets or IndexedDB
- `listModels()` → `AssetInfo[]` — returns available catalog
- Custom import — drag-drop .glb → store → catalog update
- In-memory cache — loaded models cached for session duration

## Dependencies
- `domain/interfaces` — implements these contracts
- `domain/models` — returns domain types (PalaceNode, SegmentMask, etc.)
- External: `idb` (IndexedDB), browser Fetch API, Three.js loaders

## Key Decisions
1. **Each infrastructure class implements exactly one domain interface** — SRP. If IndexedDBPersistence grows too large, split into PalacePersistence + AssetPersistence.
2. **Provider pattern for AI services** — SDXLGenerator detects which API is running. User doesn't choose implementation, they just click "Generate."
3. **All I/O is async** — every method returns a Promise. The application layer never blocks.
4. **Error types are domain types** — infrastructure catches network errors and throws domain-level error types that the application layer understands.

## SOLID Compliance
- **SRP**: Each file = one external service integration
- **OCP**: New AI providers = new class implementing IImageGenerator. Existing code untouched.
- **LSP**: All implementations satisfy their interface contract. Swap SDXL for DALL-E without touching application code.
- **ISP**: Each implementation only implements its own interface. No god-class.
- **DIP**: This layer DEPENDS on domain abstractions. The dependency arrow points inward.
