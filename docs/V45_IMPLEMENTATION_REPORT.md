# MEMENTO VisualRef V45 — Implementation Report

**Build:** V45 development package  
**Strategy:** controlled migration from the V44 runtime  
**Product direction:** V36C clarity + V44 capability + V45 ownership  
**Primary vertical:** car + showroom, then product + stage/backplate

---

## 1. Executive result

V45 is now an integrated development build rather than only a roadmap scaffold.

The current V44 runtime has been upgraded to schema 45 and given a new product-facing layer across Render, Viewport and Timeline. The implementation does not discard the proven asset, renderer, Shot or Timeline systems. It changes how those systems are owned, exposed and validated.

The package boots all three workspaces through one shell and one shared state architecture. Automated structure and functional tests pass.

This is not the end of the V45 roadmap. The initial motion primitive engine, advanced retime, sequence intelligence, Backplate matching and showcase configuration remain gated work.

---

## 2. Core state and ownership

Implemented:

- `SCHEMA_VERSION = 45`;
- explicit V44 → V45 normalization;
- one Project Store;
- one command/history path;
- per-workspace splitter persistence;
- one Player renderer authority through `src/v45/renderer-authority.js`;
- runtime instrumentation through `src/v45/runtime-instrumentation.js`;
- active project state with no visible preset authority;
- one-Hero semantic invariant;
- Motion Off and Energy zero defaults;
- canonical GFX/FX, V3, V2, V1, A1, A2 tracks;
- compatibility aliases for previous internal global handles.

The renderer, Player and Timeline still use the inherited modular V44 runtime rather than a separate second V45 application. This keeps the migration controlled and avoids two competing codebases.

---

## 3. Physical calibration contract

The scene normalization contract now includes:

- `referenceDimension`;
- `referenceAxis`;
- `unit`;
- `unitScaleToMeters`;
- separate Hero camera-relative normalization and Environment native-space rules.

Viewport exposes the contract through a Physical Calibration section. The user may state a known width, height or depth and select metric or imperial units. The renderer then derives a deterministic calibrated scale while creative apparent size remains a Render concern.

This is the foundation for reliable Hero-to-showroom, Hero-to-racetrack and product-to-stage proportions.

---

## 4. Render reset

The previous eleven-rail editor has been reorganised into nine permanent macro categories:

```text
SUBJECT
CAMERA
COMPOSITION
LENS & FOCUS
LIGHT
ENVIRONMENT
MOTION
ATMOSPHERE / IMAGE
TIMING
```

Delivered interaction:

- active Shot and family selection;
- Live, Start, End and Compare monitor state;
- Start/Both/End edit scope;
- visible Variation action;
- delta readout;
- all macros remain spatially visible;
- one macro expands at a time;
- precision opens inline;
- V43B.9 text-first chip grammar;
- optional curated starting points below the direct editor;
- Add/Update Timeline action remains visible.

The global detached Advanced panel has been removed from the V45 shell.

---

## 5. Viewport reset

Viewport now uses a task-based hierarchy:

1. tool toolbar;
2. selected context and CALIBRATE / EDIT SHOT STATE switch;
3. semantic World list;
4. contextual Inspector.

Delivered controls include:

- Select, Move, Rotate, Scale and Pivot;
- World/Local;
- Snap, Frame, Ground and Reset;
- semantic Hero, Environment, Camera and Light nodes;
- node visibility and lock;
- physical calibration;
- persistent object transform summaries;
- import correction as secondary depth;
- HDRI/background controls;
- warning-oriented diagnostics.

The selected tool now determines the dominant Inspector task instead of presenting every technical field at once.

---

## 6. Timeline reset

Timeline is board-first and keeps the Player visible on the left.

Delivered product layer:

- fixed six-track board;
- compact tool strip;
- negative pre-roll and frame ruler;
- linked Shot clips;
- real FX and audio clips;
- waveform rendering;
- marker storage;
- move, trim, split, Slip and snap state contracts;
- contextual clip Inspector;
- Make Unique;
- optional Recipe and Library drawers;
- synchronized Player and playhead;
- no scene cloning through Timeline edits.

The acceptance preview includes a populated four-Shot sequence, one FX clip, one marker and one audio waveform.

---

## 7. Renderer and Player changes

Implemented:

- renderer creation guarded by a single-owner authority;
- visible Canvas fallback via `?fallback=1`;
- Render monitor modes;
- subject Present/Hidden evaluation;
- Motion Energy passed to motion-design rendering;
- physical calibration applied to Hero scale;
- camera distance derived relative to calibrated Hero radius;
- Timeline monitor context retained;
- stable shared transport and output gate.

The full WebGL path still imports Three.js and official loaders from jsDelivr.

---

## 8. Automated test result

`npm run check` passes.

The suite covers:

- V45 package identity;
- local dependency resolution;
- V45 CSS ordering;
- schema and migration;
- nine Render macros;
- six Timeline tracks;
- Motion Off/Energy zero;
- renderer authority and instrumentation;
- physical units and calibration;
- Render monitor and endpoint assignment;
- Variation;
- atomic replacement rollback;
- linked Shot and Make Unique;
- move, trim, markers, FX and audio;
- no scene entity changes during Timeline editing;
- one Undo/Redo path;
- workspace splitter persistence.

---

## 9. Browser UI evidence

The real V45 modules were booted in Chromium through an isolated module harness with Canvas fallback forced. Desktop and mobile captures are included:

- `V45_RENDER_UI_ACCEPTANCE_PREVIEW.png`;
- `V45_VIEWPORT_UI_ACCEPTANCE_PREVIEW.png`;
- `V45_TIMELINE_UI_ACCEPTANCE_PREVIEW.png`;
- `V45_RENDER_MOBILE_ACCEPTANCE_PREVIEW.png`;
- `V45_VIEWPORT_MOBILE_ACCEPTANCE_PREVIEW.png`;
- `V45_TIMELINE_MOBILE_ACCEPTANCE_PREVIEW.png`.

This demonstrates successful V45 bootstrap and the intended visual hierarchy. It does not validate Three.js, IndexedDB, real GLB/HDRI imports or device gestures.

---

## 10. Known debt and next safe order

### Immediate production acceptance

- deploy the package;
- test real Three.js creation and renderer count;
- run the GLB/HDRI fixture matrix;
- verify IndexedDB binary reload;
- verify route switching and rollback;
- verify mobile pan, scrub and trim.

### Product Vis calibration expansion

- procedural Stage entity;
- Hero/Environment proportion helper;
- Backplate crop, horizon, FOV and contact point;
- HDRI reflection/background separation, blur and exposure;
- car + showroom and car + racetrack acceptance scenes.

### Motion and Timeline depth

- deterministic Dolly, Truck, Pedestal, Orbit, Arc Reveal and Turntable primitives;
- actor, direction, amount, energy, duration and constraints;
- retime curves and speed ramps;
- transitions that never clone the scene.

### Later gates

- sequence intelligence;
- continuity and repetition rejection;
- showcase depth using the same project and engine.

---

## 11. Honest release statement

V45 is ready for deployment as a serious integrated development build and for the real-asset acceptance pass.

It should not yet be labelled the completed V45 product. The current package establishes the product hierarchy, state contract, calibration foundation and professional editing path required to complete the remaining roadmap without another architectural reset.
