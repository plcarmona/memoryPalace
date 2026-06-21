# Memory Palace

A spatial mnemonic tool that implements the method of loci as an infinite-canvas web app with AI-assisted authoring.

## Overview

The method of loci (also known as the memory palace or journey method) is a memorization technique that attaches information to vivid places along a mental route. Memory Palace implements this technique digitally: users build a tree of scenes on a pan/zoom infinite canvas, populate each scene with image and text elements, and link elements as "portals" to nested child scenes. Any element can carry hidden content for recall practice.

The app is built with clean architecture and fully typed. State changes are reversible via comprehensive undo/redo, and the entire palace can be versioned with in-browser snapshots or exported to a portable .zip file with bundled assets.

## Features

- Infinite canvas with smooth pan, zoom, and animated scene-to-scene navigation
- Hierarchical scene tree; elements link as portals to nested scenes
- Image, text, and 3D-object elements with drag, resize, lock, and group
- AI image generation via local SDXL (ComfyUI / Automatic1111)
- SAM segmentation: extract image regions, each linkable to its own child scene
- Recall mode: flashcard-style self-testing with reveal and scoring
- Full undo/redo with drag-aware history coalescing
- Named snapshots (in-browser versioning) and .zip export/import with bundled assets
- Element z-order control (layer images above/below each other)
- Auto-save to IndexedDB; works fully offline

## Demo: memorizing the digits of pi

The `demosnap/` folder contains a self-contained example showing how the app is used in practice.

### Major System word finder

`major_system.py` is a Python utility that finds words that phonetically encode a given number using the Major System mnemonic code. It sources words from:
- English (370k+ words)
- Spanish (636k+ words)
- Pokemon (all 1000+ species)
- Pop culture (embedded list from Star Wars, Marvel, anime, video games, brands, music)

Usage:
```bash
python3 demosnap/major_system.py 34
# Output: mirror, mario, amaura, maria, mariah, moria...

python3 demosnap/major_system.py all:34
# Find words that contain "34" anywhere (partial matches)
```

`major_system_34.txt` contains the exact matches for 34 across all sources.

### Example pi export

`example_pi.zip` is an exported palace that encodes digits of pi as nested mnemonic scenes. For example, a scene labeled `5358979323846264` links into `338327950`, and so on. Each scene is paired with vivid imagery derived from the Major System script, demonstrating a real workflow: turn abstract numbers into image-rich, nested places.

To explore:
1. Open Memory Palace
2. Click "Import" in the toolbar
3. Select `example_pi.zip`
4. Navigate through the nested scenes to see how pi is encoded

## Tech stack

| Technology | Role |
|------------|------|
| React 19 + TypeScript | UI framework |
| Zustand + zundo | State management with temporal undo/redo middleware |
| idb | IndexedDB persistence |
| JSZip | .zip export/import with bundled assets |
| Vitest + Testing Library + fake-indexeddb + jsdom | Test framework |
| Vite | Build tool and dev server |

Note: three.js and @react-three/* dependencies are present as legacy from an earlier 3D prototype. The current UI is a 2D HTML canvas.

## Architecture

Clean Architecture in 4 layers (domain / application / infrastructure / presentation) with dependencies pointing inward. SOLID principles applied: ports for persistence/generation/segmentation, interface segregation for element behaviors. Full detail in `ARCHITECTURE.md`.

## Getting started

### Prerequisites
- Node.js 18+
- (Optional) Local SDXL server for AI image generation
- (Optional) SAM server for image segmentation (see `start.sh`)

### Install
```bash
git clone https://github.com/plcarmona/memoryPalace.git
cd memoryPalace
npm install --legacy-peer-deps  # React 19 vs react-spring peer conflict
```

### Development
```bash
npm run dev    # Dev server at http://localhost:5174
./start.sh     # Also launches SAM server
```

### Build and test
```bash
npm run build  # Production build in dist/
npm test       # Run test suite
```

## Project structure
```
src/
├── domain/              # Pure TS models, interfaces, TreeService
├── application/         # Use cases (Navigation, Element, Content, Generation, Export)
├── infrastructure/      # Concrete implementations (IndexedDB, SAM, SDXL, assets)
├── presentation/        # React + board UI (2D infinite canvas)
│   ├── board/           # Board, SceneView, ElementItem
│   └── ui/              # Toolbar, SnapshotsPanel, MemoryPanel, CommandPalette
├── stores/              # Zustand stores (palaceStore, cameraStore, uiStore)
└── __tests__/           # Test files (122 tests total)
```

## Testing

The test suite comprises 122 tests across 17 files:
- Tree logic (`TreeService.test.ts`)
- Store behavior (`Stores.test.ts`, `cameraStore.test.ts`, `uiStore.test.ts`)
- Persistence (`Persistence.test.ts`, `useAutoSave.test.ts`)
- Undo/redo (`UndoRedo.test.ts`)
- Element reordering (`Reorder.test.ts`)
- Snapshots (`Snapshots.test.ts`)
- Export/import round-trips (`Export.test.ts`)
- UI components (`Toolbar.test.tsx`, `MemoryPanel.test.tsx`, etc.)
- Integration scenarios (`Integration.test.ts`, `ContentAndRecall.test.ts`)

Frameworks: Vitest, Testing Library, fake-indexeddb, jsdom.

## Status

Personal project. Active development.