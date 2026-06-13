# Application Module

## Responsibility
Orchestrate use cases by coordinating domain logic with infrastructure
implementations. Each use case represents one user workflow.

This module contains **no UI code and no Three.js code**. It operates on
domain types and calls domain interfaces.

## Interfaces (Public API)

### NavigationUseCase
Orchestrates camera state and tree queries for navigation:
- `focusNode(nodeId: NodeId)` — resolves node position from TreeService, triggers camera transition
- `showOverview()` — computes overview position, triggers camera to overview mode
- `navigateToLinkedElement(elementId: ElementId)` — reads element's link target, calls focusNode

### ElementUseCase
Manages elements within scenes:
- `addElement(sceneId, type, assetUrl, position)` — creates PalaceElement, adds to scene
- `removeElement(sceneId, elementId)` — removes element and cleans up links
- `transformElement(elementId, transform: {position, rotation, scale})` — updates element transform
- `linkElement(elementId, targetNodeId)` — sets element's link field

### ContentUseCase
Manages hidden content on elements:
- `setContent(elementId, content: HiddenContent)` — attaches content to element
- `getContent(elementId)` → `HiddenContent` — retrieves content
- `revealContent(elementId)` — marks content as revealed (for UI feedback)
- `hideAllContent(sceneId)` — hides all content in a scene (for recall mode)

### GenerationUseCase
Orchestrates AI image generation and placement:
- `generateAndPlace(prompt, sceneId, position)` — calls IImageGenerator, stores result, creates element

## Dependencies
- `domain/models` — reads/writes PalaceNode, PalaceElement, HiddenContent
- `domain/interfaces` — uses IPersistence, IImageGenerator (injected)
- `domain/tree/TreeService` — calls tree operations

## Key Decisions
1. **Use cases are classes with injected dependencies** — constructor takes interface implementations (DIP). Easy to test with mocks.
2. **Use cases don't import infrastructure** — they receive `IPersistence`, `IImageGenerator`, etc. via constructor injection. The composition root (App.tsx) wires concrete implementations.
3. **No direct state mutation** — use cases return new data or call store actions. They don't directly mutate Zustand state (that's the stores' job).
4. **One use case per workflow** — SRP. NavigationUseCase doesn't know about content. ContentUseCase doesn't know about camera.

## SOLID Compliance
- **SRP**: Each use case file = one user workflow
- **OCP**: New workflows = new use case files
- **LSP**: Works with any implementation of domain interfaces
- **ISP**: Each use case depends only on the interfaces it needs (NavigationUseCase doesn't import IImageGenerator)
- **DIP**: All dependencies are domain interfaces, injected at construction
