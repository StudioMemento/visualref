# MEMENTO VisualRef V45

V45 is the first integrated Product Vis reset of VisualRef.

It keeps the real scene, Shot, Player, asset and Timeline capabilities developed through V44, while moving the visible product back toward the clarity and immediacy of the V36C interface. It is not a rollback: V36C is the interaction reference, V44 is the functional chassis, and V45 establishes a cleaner ownership and product model.

```text
VIEWPORT → RENDER → TIMELINE
calibrate     direct      assemble
```

## Current build status

This package is a working V45 development build with:

- schema `45` and explicit V44 migration;
- one Project Store and one history path;
- one Player-owned renderer authority;
- atomic asset replacement state;
- physical Hero calibration fields;
- the new nine-category Render editor;
- task-based Viewport calibration;
- a board-first six-track Timeline;
- responsive desktop and mobile layouts;
- local structure and functional smoke tests.

It does **not** claim that the complete V45 roadmap is finished. The full motion-primitive engine, sequence intelligence and showcase configuration remain later phases.

The frozen development sequence is included at [`docs/V45_DEV_ROADMAP.md`](./docs/V45_DEV_ROADMAP.md), and the approved screen anatomy is recorded in [`docs/V45_PRODUCT_UX_FREEZE.md`](./docs/V45_PRODUCT_UX_FREEZE.md).

## Workspaces

### VIEWPORT — make the physical scene correct

Viewport is the calibration workspace. Its default mode is **CALIBRATE**, not Shot editing.

Primary tools:

```text
SELECT  MOVE  ROTATE  SCALE  PIVOT
WORLD / LOCAL  SNAP  FRAME  GROUND  RESET
```

The workspace contains:

- a semantic scene list for Hero, Environment, Cameras and Light;
- contextual controls for the active tool and selected node;
- Hero reference axis, real dimension and unit calibration;
- persistent position, rotation, scale and compensated pivot;
- World / Local transform space;
- separate CALIBRATE and EDIT SHOT STATE modes;
- HDRI/background controls and compact import correction;
- warning-first diagnostics rather than permanent technical noise.

Physical calibration stores the real-world reference independently from creative apparent size. A car may be calibrated to its real width while the Render workspace still decides how large it appears in frame.

### RENDER — direct one Shot

Render restores the visual clarity of V36C without restoring its monolithic architecture.

The editor is organised into nine stable macro categories:

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

Each macro remains spatially visible, shows its active state and opens precision directly beneath itself. There is no detached global Advanced panel.

The V43B.9 interaction grammar remains canonical:

- left assignment = Start, with a teal-left treatment;
- centre assignment = Both, with white rules;
- right assignment = End, with an orange-right treatment;
- locks and exclusions remain quiet secondary actions;
- Variation remains a first-class action;
- Motion starts Off and Energy starts at zero.

Render monitor modes are:

```text
LIVE  START  END  COMPARE
```

Curated presets survive only as optional starting points. They do not own the active project state and do not compete with direct editing.

### TIMELINE — assemble the sequence

Timeline returns to a simple Player-left / board-right composition and uses a fixed professional core:

```text
GFX / FX
V3
V2
V1
A1
A2
```

Implemented state and interaction contracts include:

- linked Shot clips;
- Make Unique without cloning the physical scene;
- move, left/right trim, split and Slip foundations;
- frame snapping and negative pre-roll;
- markers;
- FX clips;
- audio tracks and waveform data;
- source in/out and clip duration;
- contextual clip Inspector;
- optional Recipe and Library drawers;
- synchronized Player and playhead.

Timeline operations do not change scene entity count. Timing changes how a Shot is used; it does not duplicate or mutate the physical scene.

## Core ownership rules

V45 enforces these product invariants:

1. one renderer owner;
2. one Player clock;
3. one Project Store;
4. one Undo/Redo history path;
5. one live Hero semantic node;
6. Scene, Shot and Timeline remain separate domains;
7. failed asset replacement preserves the current asset;
8. Make Unique copies a Shot, never the scene;
9. Motion is opt-in;
10. active project state is preset-free by default.

Runtime instrumentation is exposed at `window.__MEMENTO_V45__.instrumentation` in a normal browser session.

## Asset pipeline

V45 retains the V44 atomic replacement contract:

```text
choose file
→ stage import session
→ parse away from the live scene
→ validate geometry / bounds / materials / animation
→ persist binary
→ mount and verify
→ commit project state
→ dispose the superseded asset
```

A malformed replacement must leave the previous Hero, Environment or HDRI active.

Supported production roles currently include:

- one primary Hero `.glb`;
- one Environment `.glb` in native authoring space;
- persistent Prop `.glb` nodes;
- one `.hdr` environment map;
- local audio files for Timeline use.

## Run locally

The project is static and has no build step. Serve the folder over HTTP so browser modules, IndexedDB and asset persistence work correctly:

```bash
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080/render.html
http://localhost:8080/viewport.html
http://localhost:8080/timeline.html
```

The Three.js modules are loaded from jsDelivr. A normal online browser session is therefore required for the full WebGL runtime. Add `?fallback=1` to any workspace URL to force the visible Canvas proxy while reviewing layout or state behavior.

## Automated validation

```bash
npm run check
```

This runs:

1. local structure and contract assertions;
2. V45 functional state smoke tests.

The suite checks schema migration, renderer authority, physical calibration, nine Render macros, endpoint assignment, Motion Off/Energy, atomic replacement, six Timeline tracks, linked clips, Make Unique, move/trim, markers, FX/audio and the single history path.

See [`VALIDATION.md`](./VALIDATION.md) for the exact tested boundary and the real-browser acceptance debt.

## UI acceptance previews

Canvas-fallback UI captures are included for layout review:

- `docs/V45_RENDER_UI_ACCEPTANCE_PREVIEW.png`
- `docs/V45_VIEWPORT_UI_ACCEPTANCE_PREVIEW.png`
- `docs/V45_TIMELINE_UI_ACCEPTANCE_PREVIEW.png`
- `docs/V45_RENDER_MOBILE_ACCEPTANCE_PREVIEW.png`
- `docs/V45_VIEWPORT_MOBILE_ACCEPTANCE_PREVIEW.png`
- `docs/V45_TIMELINE_MOBILE_ACCEPTANCE_PREVIEW.png`

They validate the product hierarchy and responsive CSS, not real GLB/HDRI rendering.

## Deployment

Upload the repository contents to GitHub and deploy as a static Vercel project. No framework preset or build command is required.

Uploaded GLB, HDRI and audio binaries remain inside the user browser's IndexedDB. They are not uploaded to GitHub or Vercel by this static build.

See [`DEPLOY_TO_GITHUB_AND_VERCEL.md`](./DEPLOY_TO_GITHUB_AND_VERCEL.md).
