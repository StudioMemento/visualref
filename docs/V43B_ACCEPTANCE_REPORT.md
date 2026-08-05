# MEMENTO VisualRef V43B — Acceptance Report

## Scope delivered

V43B attaches real GLB/HDRI assets to the V43A.1 shared store, Player and workspace architecture. The implementation selectively ports proven V36C ideas: imported-object cleanup, bounding-box normalization, automatic ground alignment, PMREM HDRI conversion, separate scene groups, camera safety and an editor-only scene camera.

## Automated validation completed

- JavaScript syntax validation for every module and test file.
- Relative import audit: no missing local modules.
- CSS parser audit: zero parse errors.
- 23 shared-state smoke assertions pass.
- HTML entry validation for `index.html`, `render.html`, `viewport.html`, and `timeline.html`.

The smoke suite covers:

- Start and End independence
- coherent creative choices and locks
- linked Timeline clips
- Shot and Sequence evaluation
- undo / redo
- 3D transform-axis migration
- Hero asset registration
- Prop node registration
- pivot correction persistence
- Editor Camera independence from Shot Camera

## Runtime architecture

### One real renderer per workspace page

The continuously animated Player owns one WebGL renderer. Start and End previews are captured from that same renderer into lightweight 2D canvases. This avoids three simultaneous WebGL contexts.

### Dual camera separation

- **Shot Camera**: authoritative Render, Start, End and Timeline camera.
- **Editor Camera**: Viewport orbit/pan/zoom camera only.

### Transform hierarchy

```text
Creative Node
└── Import Correction
    └── Auto Normalize / Auto Ground
        └── Imported GLB content
```

Creative Start/End motion is independent from pivot, orientation and ground correction.

### Binary persistence

IndexedDB database `memento-visualref-v43`, version 2:

- `projects` object store
- `assets` object store

Project JSON stores asset metadata and references. Original Blob data remains in IndexedDB.

## Honest limitation

The execution container blocks browser navigation to local URLs and cannot resolve the pinned CDN modules. Therefore this report does not claim an in-container live WebGL/GLB browser pass. The deployed Vercel acceptance sequence above is required for the final runtime gate.

## Next gate

Do not begin V43C until a deployed browser passes Hero GLB, Environment GLB, HDRI, dual cameras, correction controls, Start/End captures and reload persistence.
