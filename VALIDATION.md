# MEMENTO VisualRef V45 — Validation

## Automated result

`npm run check` passes.

The command runs:

1. `tests/structure-check.mjs`
2. `tests/core-smoke.mjs`

All JavaScript sources also pass syntax validation through the structure suite's dependency walk. The package contains resolvable static entry points for Render, Viewport and Timeline, with `css/v45.css` loaded after the inherited donor styles.

## Static structure coverage

The structure suite verifies that:

- every local `href`, `src` and JavaScript import resolves;
- all visible entry pages identify V45;
- the shell exposes Render, Viewport and Timeline only;
- the shell exposes one Project surface, one language switch and one workspace splitter contract;
- no detached global Advanced switch remains;
- schema `45`, release `V45` and the V45 UI defaults are explicit;
- the canonical six tracks exist;
- active project state is preset-free by default;
- all nine Render macro categories are present;
- the V43B.9 Start/Both/End chip language is present;
- Viewport exposes CALIBRATE, EDIT SHOT STATE and PHYSICAL CALIBRATION;
- the renderer consumes unit, reference dimension, reference axis, subject presence and Motion Energy;
- Timeline exposes a board-first surface, contextual Recipes/Library and a clip Inspector;
- Player creation is guarded by `RendererAuthority`;
- V45 runtime instrumentation is present.

## Functional smoke coverage

### Product state and migration

- release constants identify V45;
- default project is schema 45;
- migration from schema 44 restores V45 UI defaults;
- per-workspace splitter values migrate and persist;
- Viewport starts in physical calibration mode;
- Render monitor starts in Live mode;
- Timeline drawers start closed;
- active project state has no visible preset authority.

### Renderer ownership and instrumentation

- one renderer owner may acquire authority;
- a second renderer owner is rejected;
- authority releases cleanly;
- instrumentation reports one renderer owner and one visible Hero.

### Physical calibration

- metric and imperial units convert to metres;
- Hero and Environment retain different normalization roles;
- Hero reference dimension, axis and unit persist through commands;
- Hero camera-relative normalization remains deterministic;
- Environment native scale remains preserved.

### Render

- nine stable macro categories exist;
- Live, Start, End and Compare monitor state persists;
- Both assignment writes Start and End;
- subject presence can differ by endpoint;
- Motion is Off by default;
- Motion Energy is independently controllable;
- Energy appears as Motion precision rather than permanent clutter;
- Variation remains a first-class action;
- endpoint evaluation and delta calculation succeed.

### Atomic assets

- staging and validation do not replace the live Hero;
- failed replacement preserves the previous Hero;
- failed import sessions can be dismissed;
- semantic node and normalization state remain consistent.

### Timeline professional core

- GFX/FX, V3, V2, V1, A1 and A2 exist;
- Recipes and Library are contextual toggles;
- a linked Shot clip is added to V1;
- Make Unique creates a Shot copy and breaks the link;
- Make Unique never clones the physical scene;
- move changes time and compatible track only;
- left trim preserves source timing;
- markers persist;
- FX clips are real Timeline clips;
- audio attaches only to audio tracks;
- mixed sequence evaluation succeeds;
- no Timeline edit changes scene entity count.

### History

- one command records history;
- Undo restores the prior project state;
- Redo restores the next project state;
- workspace splitter changes use the same persistence path.

## Browser UI capture completed

Render, Viewport and Timeline were booted through the actual V45 modules in an isolated Chromium harness with the Canvas renderer forced. The resulting captures are included in `docs/`.

This confirms that:

- all three V45 workspaces mount;
- the new shell and workspace layouts render;
- the Player and editor hierarchy remains usable at 1920 × 1080;
- a populated six-track Timeline renders Shot, FX and audio clips;
- 390 × 844 mobile captures mount all three workspaces and preserve the mobile navigation/scroll hierarchy;
- no V45 JavaScript bootstrap error occurred in the fallback run.

The harness intentionally replaces browser storage with in-memory storage and forces Canvas fallback. It is not evidence that WebGL, IndexedDB or uploaded assets have passed in deployment.

## Required real-browser acceptance

Automated state tests and fallback captures do not substitute for a real WebGL session. Before calling V45 production-ready, deploy it and test the following fixtures:

1. valid small Hero GLB;
2. Hero with visibly incorrect origin;
3. wrong-orientation Hero;
4. car calibrated from a known real width;
5. large architectural Environment;
6. Environment with distant origin;
7. DRACO GLB;
8. Meshopt GLB;
9. animated or skinned GLB;
10. malformed Hero replacement;
11. valid HDRI;
12. product plus procedural Stage;
13. product plus Backplate;
14. real audio file.

For each relevant fixture:

- import and confirm the previous asset remains visible until commit;
- select the object by clicking it;
- Move and Rotate in World and Local;
- Scale and compensated Pivot;
- apply Origin, Centre, Bottom and Top pivot presets;
- set a physical reference dimension and verify calibrated proportions;
- Frame and Ground;
- Undo and Redo;
- reload and confirm references survive;
- navigate Viewport → Render → Timeline → Viewport;
- create a Shot, add it to Timeline and use Make Unique;
- attempt an invalid replacement and confirm rollback;
- verify mobile pan, trim, scrub and drawer gestures.

## Current validation boundary

The current execution environment cannot provide a trustworthy deployed Three.js/WebGL and IndexedDB acceptance session. Therefore this package does **not** claim that real GLB/HDRI rendering, binary reload, compression decoders or device-specific gestures have already passed.
