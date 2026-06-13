# Presentation Module

## Responsibility
Render the UI — both the 3D canvas (R3F) and the HTML overlay (React).
This module depends on application use cases and domain types, but never
directly on infrastructure.

## Submodules

### canvas/camera/CameraController
- **Responsibility**: Position the Three.js camera based on cameraStore state
- **Reads**: `cameraStore.mode`, `cameraStore.targetPosition`
- **Uses**: GSAP for smooth transitions
- **SOLID**: SRP (only camera), DIP (reads abstract store state, doesn't know about tree or elements)

### canvas/overview/TreeOverview
- **Responsibility**: Render all palace nodes as interactive spheres in overview mode
- **Reads**: `palaceStore.nodes`, `cameraStore.mode === 'overview'`
- **Actions**: Click node → `cameraStore.focusNode(id)`
- **SOLID**: SRP (only overview viz), DIP (reads from store, delegates to use case)

### canvas/scene/SceneRenderer + SceneNode
- **Responsibility**: Render the current focused scene with all its elements
- **Reads**: `palaceStore.currentSceneId`, elements for that node
- **Uses**: ElementFactory to render each element
- **SOLID**: SRP (only current scene rendering), OCP (uses factory — new element types don't require changes here)

### canvas/elements/ElementFactory
- **Responsibility**: Dispatch element rendering to the correct component based on `element.type`
- **Pattern**: Registry map `ElementType → React.ComponentType`
- **SOLID**: OCP — this is THE extension point. New element types register here. No existing code modified.

### canvas/elements/ImagePlane
- **Responsibility**: Render an image as a textured plane with interaction
- **Props**: `PalaceElement` (data), `isSelected`, `onSelect`, `onLinkClick`, `onContentClick`
- **Features**: TransformControls, portal glow, content indicator, click/double-click handlers
- **SOLID**: SRP (only image planes), DIP (receives data as props, doesn't fetch)

### canvas/elements/Object3D
- **Responsibility**: Render a loaded glTF model
- **Props**: Same as ImagePlane
- **Uses**: `useGLTF` from drei
- **SOLID**: SRP (only 3D models), DIP (receives asset URL, doesn't load directly)

### canvas/elements/SegmentedElement
- **Responsibility**: Render an image with clickable segmented regions
- **Props**: `PalaceElement` with `segmentData`
- **Features**: Hover highlight, click to extract/link, visual segmentation overlays
- **SOLID**: SRP (only segments), OCP (extends element system without modifying others)

### ui/Toolbar
- **Responsibility**: Top-level actions — add scene, generate image, toggle recall mode
- **SOLID**: SRP (only toolbar actions)

### ui/NodeEditor
- **Responsibility**: Edit scene label, position, delete scene
- **SOLID**: SRP (only node editing)

### ui/ElementEditor
- **Responsibility**: Edit element properties — transform values, link target, content
- **SOLID**: SRP (only element editing)

### ui/MemoryPanel
- **Responsibility**: Display/edit hidden content (text, audio, images) for selected element
- **SOLID**: SRP (only content display/editing)

### ui/RecallMode
- **Responsibility**: Recall mode overlay — progress, reveal, self-assessment
- **SOLID**: SRP (only recall workflow UI)

## Shared Hooks

### `useElementInteraction()`
- **Responsibility**: Shared interaction logic for all element types
- **Returns**: `{ isSelected, onSelect, onLinkClick, onContentClick, showPortalGlow, showContentIndicator }`
- **SOLID**: DRY without inheritance — composition via hook

## Dependencies
- `application/*` — calls use case methods
- `domain/models` — reads PalaceNode, PalaceElement types
- `stores/*` — reads/writes Zustand stores
- External: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `gsap`, `howler`

## Key Decisions
1. **R3F components receive data as props, never fetch** — all data flows through stores → props. Components are pure renderers.
2. **ElementFactory is the OCP extension point** — adding a new element type means: (1) add type to domain enum, (2) create renderer component, (3) register in factory map. Zero changes to SceneRenderer or other elements.
3. **Shared interaction via hooks, not base classes** — `useElementInteraction()` provides common selection/link/content logic. No inheritance hierarchy.
4. **Camera is a separate concern from scene content** — CameraController reads cameraStore and positions the camera. SceneRenderer reads palaceStore and renders elements. They never communicate directly.
5. **UI overlay is pure React** — no Three.js in ui/* components. Communication with canvas goes through stores.

## SOLID Compliance
- **SRP**: Each component = one visual concern
- **OCP**: ElementFactory + registry pattern for element types
- **LSP**: All element renderers accept the same props interface
- **ISP**: Components import only the store slice they need
- **DIP**: Components depend on store interfaces and use case interfaces, not infrastructure
