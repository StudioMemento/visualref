# MEMENTO VisualRef V44 — Validation

## Automated result

`npm run check` passes.

The command runs:

1. `tests/structure-check.mjs`
2. `tests/core-smoke.mjs`

Every JavaScript module also passes `node --check`, and the four entry pages plus V44 CSS and bootstrap return HTTP 200 from a local static server.

## Static structure coverage

- every local `href` and `src` used by the entry pages resolves;
- `v44.css` is loaded after the inherited style stack;
- the runtime is visibly labelled V44;
- Select, Move, Rotate, Scale and Pivot controls exist;
- World/Local and serialized import queue exist;
- the renderer hierarchy is Project → Shot → Pivot → Correction → Auto → Content;
- TransformControls, local Pivot orientation, raycast selection, staging, mount, rollback, Frame and Ground methods exist;
- atomic asset and transform commands are registered;
- schema 44 and transform-channel locks are explicit.

## Functional smoke coverage

### Schema and migration

- V44 defaults;
- migration from schema 43 / V43C-R1;
- Viewport tool, space, edit mode and snap defaults.

### Atomic asset state

- staging does not replace the current Hero;
- validated state still preserves the previous asset;
- failed import leaves the previous asset active;
- successful Hero and Environment commits set the correct semantic node and normalization contract;
- Prop nodes and missing-binary diagnostics;
- import session cleanup.

### Gizmos and pivot state

- Pivot forces Hero Calibrate mode;
- returning to Hero Shot exits Pivot safely;
- World/Local and snapping persist;
- position, rotation and scale transforms persist;
- object lock and per-channel locks block writes;
- compensated Pivot stores pivot and base compensation together;
- one Undo/Redo restores/reapplies both values.

### Restored editor chip contract

- preserved V43B.9 isolated chip styles are present;
- Render markup reconnects the V43B.9 component;
- left / center / right zones map to Start / Both / End;
- selection states remain teal-left, white top/bottom and orange-right;
- generation-pool exclusion remains functional.

### Existing core regression

- creative START/BOTH/END choices and numeric values;
- locks, exclusions and generation pools;
- Near/Balanced/Bold generation;
- shot interpolation and delta;
- linked clips;
- Shot duplication;
- trim, Blade and Make Unique;
- track lock, marker, FX and audio clips;
- sequence recipes.

## Local HTTP check

Verified HTTP 200 responses for:

```text
index.html
render.html
viewport.html
timeline.html
css/v44.css
src/app/bootstrap.js
```

## Required deployed-browser acceptance

Automated state tests do not substitute for a real WebGL session. Before calling the visual/runtime pass final, deploy V44 and test with actual assets:

1. valid small Hero GLB;
2. Hero with a visibly incorrect origin;
3. wrong-orientation Hero;
4. large architectural Environment;
5. Environment with a distant origin;
6. DRACO GLB;
7. Meshopt GLB;
8. animated/skinned GLB;
9. malformed replacement file;
10. HDRI.

For each relevant asset:

- import;
- select by clicking the object;
- Move / Rotate in World and Local;
- Scale;
- Pivot in World and Local;
- use Origin, Centre, Bottom and Top;
- Frame and Ground;
- Undo and Redo;
- reload;
- navigate Render → Viewport → Timeline → Viewport;
- attempt an invalid replacement and confirm the prior asset remains visible.

The current execution environment did not complete a real Chromium/WebGL visual session, so this document does not claim that deployed-browser acceptance has already passed.
