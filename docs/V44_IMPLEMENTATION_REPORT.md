# MEMENTO VisualRef V44
## GLB / Environment Import + World–Local Gizmo Implementation Report

**Build:** V44  
**Baseline:** V43C-R1 Core Rebuild  
**Functional donor:** uploaded V36C runtime  
**Implementation brief:** `docs/V44_GLB_ENVIRONMENT_GIZMO_OBJECTIVES.md`

---

## 1. Result

V44 implements the missing physical scene-control layer without removing the Shot and Timeline functions restored in V43C-R1.

The new Viewport supports:

```text
SELECT  MOVE  ROTATE  SCALE  PIVOT
WORLD / LOCAL
SNAP  FRAME  GROUND  RESET
```

The work is built on the modular V43C-R1 architecture rather than copying V36C's monolithic runtime. V36C remains the donor for semantic asset roles, capability scanning, explicit status and feature-anchor thinking.

---

## 2. What changed

### 2.1 Atomic Hero / Environment / Prop / HDRI import

V44 no longer registers a chosen asset as the live project asset before the renderer proves that it is usable.

The implemented sequence is:

```text
file chosen
→ serialized import queue
→ transient import session
→ detached renderer staging
→ GLB/HDR parse
→ imported camera/light removal
→ mesh / node / material / triangle / animation / bounds scan
→ non-destructive normalization calculation
→ binary persistence
→ temporary scene mount
→ finite matrix and bounds validation
→ one project-state commit
→ old asset disposal and old Blob deletion
```

Failure behavior:

- the previous Hero, Environment or HDRI stays mounted;
- its previous IndexedDB Blob is retained;
- the staged object is disposed;
- the new persisted Blob is deleted when the transaction fails;
- the user receives an explicit import error;
- no partial asset state enters Undo history.

Concurrent drops are serialized so an HDRI and GLB cannot overwrite one shared import session.

### 2.2 Import inspection and diagnostics

V44 records:

- semantic type;
- source file name and byte size;
- SHA-256 fingerprint when Web Crypto is available;
- nodes;
- meshes;
- triangles;
- material count;
- animations and durations;
- skinned meshes;
- morph-target meshes;
- source bounds and radius;
- GLB extensions used and required;
- removed embedded cameras and lights;
- heavy-geometry, huge-bounds and tiny-bounds warnings.

Assets with warnings remain usable and are marked `warning`; missing IndexedDB binaries become `missing` rather than disappearing silently.

### 2.3 Dedicated transform hierarchy

Hero:

```text
Hero Project Root
└── Hero Shot State Root
    └── Pivot Compensation
        └── Import Correction
            └── Auto Fit
                └── GLB Content
```

Environment / Prop:

```text
Project Root
└── Shot Root (identity outside Hero motion)
    └── Pivot Compensation
        └── Import Correction
            └── Optional Auto Fit
                └── GLB Content
```

Responsibilities remain separate:

- **Project Root** — persistent scene position, rotation and scale;
- **Shot Root** — Hero START / END creative transform only;
- **Pivot Compensation** — physical origin repair;
- **Import Correction** — orientation, correction scale and ground offset;
- **Auto Fit** — Hero/Prop framing contract;
- **Content** — imported source hierarchy.

Environment GLBs remain in native authoring units and are not camera-normalized.

### 2.4 Select / Move / Rotate / Scale / Pivot

The previous hidden transform behavior is now an explicit icon-and-label toolbar.

- **Select** detaches TransformControls and enables direct click/tap raycast selection.
- **Move** edits the active scene or Hero Shot transform.
- **Rotate** edits the active scene or Hero Shot transform.
- **Scale** edits local object axes; Hero Shot scale is converted to one uniform creative value.
- **Pivot** attaches a dedicated visual helper and dashed centre guide.

Double-clicking a visible object selects and frames it.

### 2.5 World / Local

Viewport space is persistent project UI state.

- Move and Rotate use World or Local space.
- Pivot uses World or Local axes; its helper copies the selected object's world quaternion in Local mode.
- Scale always uses local axes, matching TransformControls instead of simulating a false world-scale mode.

### 2.6 Hero Shot / Calibrate separation

Hero now has two explicit edit modes:

- **SHOT** — edits START / BOTH / END position, XYZ rotation and uniform scale;
- **CALIBRATE** — edits persistent baseline placement, scale, grounding and pivot.

Selecting Pivot while Hero is in Shot automatically moves to Calibrate. Returning to Shot while Pivot is active automatically exits Pivot to Select.

### 2.7 True compensated Pivot

Numeric input, Pivot gizmo and Pivot presets use one compensation path.

For a local pivot delta `d`, V44 transforms that delta through the selected root's current linear world transform and adds the result to the project-root position while applying `-pivot` to the nested Pivot Compensation group.

The requested origin moves, while the visible content remains in the same world position.

Implemented presets:

- Origin;
- Bounds Centre;
- Bottom / Ground Centre;
- Top Centre.

Pivot and compensation are committed together, so one Undo/Redo restores or reapplies both.

### 2.8 Locks, Snap, Frame, Ground and Reset

- whole-node lock;
- Position lock;
- Rotation lock;
- Scale lock;
- Pivot lock;
- Move snap;
- Rotate snap in degrees;
- Scale snap;
- Pivot snap;
- Frame Selected;
- one-command Ground;
- contextual Reset.

Locks are enforced by both TransformControls attachment and state mutation commands.

### 2.9 Contextual, larger UI

The V44 pass adds `css/v44.css` after the inherited style stack.

- 48 px main tool chips;
- larger icons and readable labels;
- selected tool and coordinate-space states;
- Hero Shot / Calibrate context bar;
- large Outliner targets;
- tool-specific Inspector content;
- channel lock chips;
- Pivot preset chips;
- import status and diagnostics;
- Advanced correction as a collapsible section rather than a permanent technical matrix;
- responsive icon-only fallback at narrower widths.

---

## 3. Existing functions retained

The automated regression suite confirms that V44 still supports:

- multiple Shot slots;
- Shot duplication;
- START / BOTH / END creative writes;
- creative category locks;
- option exclusions and pool reset;
- Near / Balanced / Bold variants;
- Shot interpolation and delta;
- linked Timeline clips;
- V1–V3, FX and A1–A2 tracks;
- left trim;
- Blade;
- Make Unique;
- track locks;
- markers;
- FX clips;
- audio clips;
- sequence recipes.

---

## 4. Objective status

### P0 — blocking core

| Objective | Status |
|---|---|
| Parse Hero before replacement | Implemented |
| Parse Environment before replacement | Implemented |
| Preserve active asset and Blob on failed replacement | Implemented |
| Persist assets/transforms across refresh and routes | Implemented in shared state + IndexedDB; deployed-browser acceptance pending |
| Native-space Environment root | Implemented |
| Direct raycast selection | Implemented |
| Select / Move / Rotate / Scale / Pivot | Implemented |
| Persistent World / Local | Implemented |
| Scale identified as local | Implemented in UI and TransformControls |
| Pivot without visible geometry movement | Implemented compensation transaction; real-asset epsilon test pending |
| Pivot fields/helper synchronized | Implemented |
| Origin / Centre / Ground / reset presets | Implemented as Origin / Centre / Bottom / Top |
| Hero Shot / Calibrate | Implemented |
| Hero START / BOTH / END | Implemented |
| Environment Position / Rotation / XYZ Scale / Pivot | Implemented |
| Locks block gizmo and numeric mutation | Implemented |
| Frame Selected | Implemented |
| Ground Selected | Implemented |
| One history item per gizmo gesture | Implemented |
| Shared Render / Viewport / Timeline state | Implemented architecturally; deployed route test pending |
| Visible renderer fallback | Retained Canvas fallback |
| Real deployed-browser asset pass | Not performed in this execution environment |

### P1 — hardening and clarity

| Objective | Status |
|---|---|
| Move / Rotate / Scale / Pivot snapping | Implemented |
| Capability metadata | Implemented |
| Unsupported `.gltf` / extension honesty | `.glb`-only contract and explicit errors implemented |
| Relink missing Blob | Missing state implemented; interactive relink flow remains |
| Selected-surface Pivot placement | Not included |
| Forward / Up presets | Stored correction semantics; preset UI remains |
| Animation summary / clip selection | Summary implemented; explicit clip picker remains |
| Material summary | Material count implemented; editing intentionally absent |
| Mobile toolbar | Responsive toolbar implemented; touch acceptance pending |
| Locally vendored Three/decoders | Not included; current import map and Draco decoder remain remote |

### P2

Feature anchors, Hero Variant sockets, Landscape role, collision navigation and surface snapping remain later expansion work.

---

## 5. Validation performed

### Automated

```bash
npm run check
```

Passes:

- static local-reference checks;
- V44 architecture assertions;
- schema 43 → 44 migration;
- atomic import state behavior;
- World/Local, Snap and edit-mode guards;
- transform locks;
- compensated Pivot + one-step Undo/Redo;
- Hero and Environment normalization;
- full Shot and Timeline regression suite.

Every JS module passes `node --check`.

### Local HTTP

The static server returned HTTP 200 for:

```text
index.html
render.html
viewport.html
timeline.html
css/v44.css
src/app/bootstrap.js
```

### Not claimed

A real Chromium/WebGL pass with production Hero, Environment, DRACO, Meshopt, skinned GLB and HDRI files was not completed in this execution environment. The deployed acceptance checklist is in `DEPLOY_TO_GITHUB_AND_VERCEL.md` and `VALIDATION.md`.

---

## 6. Main files changed

```text
src/core/default-state.js
src/core/commands.js
src/core/normalization-contract.js
src/core/history-service.js
src/core/persistence-service.js
src/core/workspace-sync.js
src/engine/renderer-service.js
src/player/player-controller.js
src/workspaces/viewport-workspace.js
src/ui/app-shell.js
css/v44.css
tests/core-smoke.mjs
tests/structure-check.mjs
README.md
VALIDATION.md
DEPLOY_TO_GITHUB_AND_VERCEL.md
```

---

## 7. Acceptance gate

The next visual-polish pass should begin only after the ZIP is deployed and the following is confirmed with real files:

1. valid Hero and Environment import;
2. failed replacements preserve the current scene;
3. World/Local axes behave correctly;
4. an off-centre Pivot can be repaired without visible drift;
5. Ground and Frame handle a large Environment;
6. reload and workspace route changes preserve assets and transforms;
7. Render and Timeline use the same corrected scene.
