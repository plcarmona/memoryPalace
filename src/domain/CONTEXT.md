# Domain Module

## Responsibility
Define all data structures, business rules, and abstract contracts for the
Memory Palace. This module has **zero runtime dependencies** — it is pure
TypeScript types, interfaces, and pure functions.

## Interfaces (Public API)

### Models (`models/`)
- `PalaceNode` — A scene in the palace tree. Contains child references and a flat list of `PalaceElement[]`.
- `PalaceElement` — A visual item in a scene. Uses composition: optional `link`, `hiddenContent`, `segmentData` fields attach behaviours without inheritance.
- `HiddenContent` — Container for text, audio, and sub-images associated with an element.
- `Vec3`, `NodeId`, `ElementId`, `ElementType` — Shared primitives.

### Tree Service (`tree/TreeService`)
Pure functions operating on `PalaceNode[]`:
- `createNode(nodes, label, parentId, position)` → `PalaceNode`
- `removeChild(nodes, nodeId)` → `PalaceNode[]`
- `getChildren(nodes, parentId)` → `PalaceNode[]`
- `getPath(nodes, nodeId)` → `PalaceNode[]`
- `computeLayout(nodes)` → `Map<NodeId, Vec3>`

### Interfaces (`interfaces/`)
- `IPersistence` — savePalace, loadPalace, listPalaces, deletePalace
- `IImageGenerator` — generate(prompt) → Promise<ImageData>
- `ISegmentationService` — segment(image) → Promise<SegmentMask[]>
- `IAssetProvider` — loadModel(id), listModels()
- `ITransformable`, `ILinkable`, `IContentCarrier`, `ISegmentable` — behaviour interfaces

## Dependencies
- **None.** This is the innermost layer. Zero npm dependencies.

## Key Decisions
1. **Composition over inheritance** for elements — flat data with optional behaviour fields instead of class hierarchies. This satisfies OCP: new behaviours = new optional fields, no class tree changes.
2. **Pure functions for TreeService** — no class, no state. Functions take data in, return data out. Easier to test, easier to reason about.
3. **Behaviour interfaces are segregated (ISP)** — an element that only has a link doesn't need to know about hidden content. Each behaviour is its own type.
4. **IDs are strings** (`NodeId = string`) — UUIDs generated at creation. Simple, portable, no collision risk.

## SOLID Compliance
- **SRP**: Each file = one type or one service
- **OCP**: New element types = new `ElementType` variant + optional fields. No existing code changes.
- **LSP**: Any `IPersistence` implementation works. Contract is explicit.
- **ISP**: Behaviour interfaces are separate. `ITransformable` ≠ `ILinkable` ≠ `IContentCarrier`.
- **DIP**: All interfaces defined here. Application and infrastructure depend on these abstractions.
