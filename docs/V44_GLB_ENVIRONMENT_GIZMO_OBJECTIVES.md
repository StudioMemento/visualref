# MEMENTO VisualRef — V44
## GLB / Environment Import + World–Local Gizmo Objectives

**Status:** approved V44 implementation brief  
**Comparison basis:** current `V43C-R1 CORE REBUILD` runtime versus the actual uploaded `V36C.html` runtime  
**Purpose:** verify exactly what exists, what V36C actually did, and what must be built before another UI-polish pass.

---

## 1. Decision

The next pass must **not** rebuild the asset engine from zero.

V43C-R1 already has the better architectural base:

- modular project state;
- one shared asset database;
- IndexedDB binary persistence;
- dedicated Hero and Environment scene roots;
- non-destructive import correction and auto-calibration layers;
- separate Shot Camera and Editor Camera;
- real Three.js `TransformControls` for Move, Rotate and Scale.

The missing work is the **operational scene-control layer**:

1. make Hero and Environment import transactional and failure-safe;
2. expose complete selection and transform behavior;
3. add World / Local coordinate space;
4. implement a genuine Pivot tool with world-position compensation;
5. separate Hero **Shot Motion** from Hero **Asset Calibration**;
6. make every tool understandable as a large icon-led game-like interaction;
7. validate the complete flow in a deployed browser with real assets.

> **Core gate:** do not continue visual polish until a real Hero GLB and a real Environment GLB can be imported, selected, transformed, pivot-corrected, saved, reloaded and used consistently by Render, Viewport and Timeline.

---

## 2. Evidence boundary

This document distinguishes two categories.

### Source-derived behavior

Statements under **V36C** and **V43C-R1 baseline** describe behavior found in the actual source files.

### Proposed objective

Statements under **V44 target** are the approved design and implementation direction. Some deliberately go beyond V36C.

V36C is therefore a **functional donor**, not the architecture or UI to copy verbatim.

---

## 3. Executive comparison

| Capability | V36C actual runtime | V43C-R1 baseline | V44 target |
|---|---|---|---|
| Hero GLB import | Present. Removes imported cameras/lights, repairs materials, scans mesh/triangle/animation data, then normalizes the imported root directly. | Present. Loads a persisted `.glb` with GLTFLoader, DRACO and Meshopt, cleans imported content and mounts it under a dedicated Hero hierarchy. | Keep current hierarchy; make parse/scan/persist/swap atomic; preserve old Hero on every failure. |
| Environment GLB import | Later V36A has a semantic Environment slot, but the renderer inserts Environment through the generic secondary-asset path and auto-normalizes/auto-arranges it. | Present as a dedicated `environment-proxy` node. Environment preserves native scale and origin. | Keep dedicated native-space root. Add complete transform, pivot, grounding, visibility, lock and import diagnostics. |
| Secondary GLBs | Up to eight; normalized and automatically arranged around Hero. | Present as persistent Prop nodes. | Reuse the hardened pipeline after Hero and Environment pass acceptance. |
| HDRI | Present through RGBELoader + PMREM; lighting and visible background can be separated. | Present through RGBELoader + PMREM; background visibility, intensity, rotation and blur exist. | Keep independent from Environment GLB. Improve failed-import rollback and diagnostics. |
| Binary persistence | IndexedDB-based asset storage exists. | IndexedDB stores source Blob and project stores references. | Keep one database; add staged records, status and relink diagnostics. |
| Import validation | Extension validation and renderer parsing exist. V36A records loading/error/ready and capability metadata. | `.glb` extension check exists, but project registration happens before renderer parsing proves the file is valid. | Parse and inspect in a staging root first. Commit project state and delete the old Blob only after success. |
| Import normalization | Hero and secondary roots are directly scaled and recentered. This is destructive to the imported root transform. | Non-destructive hierarchy: Creative → Correction → Auto → Content. Hero uses camera-fit normalization; Environment stays native. | Preserve the current non-destructive hierarchy. Never permanently edit source GLB transforms to fit the viewport. |
| Asset role semantics | Strong semantic socket registry: Hero Primary, five Hero Variants, Environment, Landscape and HDRI. | Simpler roles: Hero, Environment, Props and HDRI. | Keep release-one roles simple, but store explicit semantic type, capabilities and diagnostics per asset. |
| Move / Rotate / Scale gizmo | No real object TransformControls in the uploaded V36C runtime. Its work viewport has custom orbit and technical camera/light helpers. Object changes are mainly sliders and commands. | Real TransformControls exist for Move, Rotate and Scale. | Keep them; enlarge and simplify their UI, enforce locks, snapping and one-gesture history. |
| World / Local space | Not present as an actual interactive gizmo switch. | Not present. TransformControls space is never changed. | Add persistent **WORLD / LOCAL** chips. Apply to Move and Rotate. Explain that Scale follows object-local axes rather than pretending it has a true world-scale mode. |
| Pivot model | Named feature-anchor semantics via `pivotAnchorId`; not a free XYZ draggable pivot gizmo. | Numeric `correction.pivot[X/Y/Z]` fields exist. No pivot gizmo. Changing them moves visible geometry because no compensation transaction is performed. | Add a visual Pivot tool, XYZ fields and presets. Moving the pivot must leave visible geometry stationary through matrix compensation. |
| Hero transform intent | V36 distinguishes authored world scale, Euler/quaternion rotation and feature anchors, but control is command/slider based. | Gizmo on Hero modifies Shot Start/Both/End values. Import correction is numeric only. | Add an explicit **SHOT / CALIBRATE** mode. Shot edits Start/End motion; Calibrate edits project baseline, orientation, scale, ground and pivot. |
| Environment transform | Environment is semantically identified but renderer treatment remains secondary-like. | Position, rotation, non-uniform scale and numeric pivot are persistent and native-space. | Make Environment a first-class selectable world node with full gizmo, pivot presets, ground/reset and large-range numeric entry. |
| Direct viewport selection | Not a complete scene raycast selection workflow. | Outliner selection exists; viewport raycast selection is missing. | Click/tap a visible object to select it; Outliner and Inspector must update immediately. |
| Transform lock | Lock concepts exist in V36 registries and commands. | `node.locked` exists in state and Outliner display, but current gizmo interaction does not reliably enforce it. | Lock disables gizmo and numeric mutation, while still allowing selection, framing and visibility. |
| Frame / ground tools | V36 has camera safety and conceptual grounding. | Frame Selected and Frame All exist. Auto-ground fields exist; no clear one-click Ground interaction in the main toolbar. | Toolbar order: Select, Move, Rotate, Scale, Pivot, Frame, Ground, Reset. |
| Diagnostics | Stronger capability metadata and explicit error states. | Basic status and source size metrics; automated tests mostly validate state mutations. | Meshes, triangles, animation count, bounds, source scale, warnings, staged status and relink state. |
| Runtime QA | Large internal audit system, but monolithic and difficult to isolate. | Core smoke suite passes; it does not prove a real browser GLB/gizmo session. | Add browser acceptance against real compressed/uncompressed GLBs, reload, route changes, invalid replacement and mobile gestures. |

---

## 4. What V36C contributes

V36C remains useful for four proven ideas.

### 4.1 Explicit asset roles

V36A defines a single socket registry rather than anonymous file uploads. The useful principle is:

- one primary Hero;
- optional Hero variants;
- Environment and Landscape as world roles;
- HDRI as a separate lighting/background role;
- persistent status, lock and diagnostics.

V44 should preserve **semantic identity**, even with a smaller release-one slot set.

### 4.2 Capability scan

V36 scans imported scenes for:

- node count;
- mesh count;
- triangle count;
- animation count;
- bounds status.

V44 should store this metadata at import time and show only a compact, comprehensible summary in the Inspector.

### 4.3 Failure state and diagnostics

V36A records `loading`, `ready` and `error`, and emits explicit diagnostic codes. The current rebuild needs the same honesty without importing V36’s monolithic command architecture.

### 4.4 Feature-anchor thinking

V36’s pivot is not a complete pivot tool, but named anchors such as visual centre or feature targets are valuable. They should become **Pivot Presets / Anchor Presets** after the true XYZ pivot system is reliable.

---

## 5. What must not be copied from V36C

### 5.1 Destructive root normalization

V36 directly multiplies the imported root scale and subtracts its bounds centre from the root position.

That makes the runtime convenient, but blurs the difference between:

- source transform;
- automatic calibration;
- user correction;
- creative animation.

V43C-R1’s layered transform hierarchy is the better foundation and must remain.

### 5.2 Environment through the secondary-asset engine

V36’s semantic Environment slot eventually routes into `addSecondary`, inheriting normalized size and automatic circular placement. That is unsuitable for a world mesh.

An Environment GLB must retain:

- native units;
- native origin;
- native hierarchy;
- deliberate user placement;
- independent visibility and lock state.

### 5.3 Conceptual pivot without physical pivot editing

A `pivotAnchorId` alone does not solve a GLB with a bad origin. The new tool requires an editable XYZ offset and visible world-space handle.

### 5.4 Monolithic patch layers

Do not migrate:

- shared global mutable state;
- repeated late installers;
- UI elements that own renderer state;
- compatibility CSS stacks;
- separate asset uploads for different pages.

---

## 6. Canonical asset model

### 6.1 Release-one scene roles

```text
HERO PRIMARY       one GLB
ENVIRONMENT GLB    one GLB
SECONDARY ASSETS   up to eight GLBs, existing support retained
HDRI               one HDR
PROCEDURAL WORLD   fallback only
```

Environment GLB and HDRI are complementary, not mutually exclusive.

```text
Environment GLB = geometry / world / occlusion / spatial reference
HDRI            = image-based light / reflections / optional visible background
```

### 6.2 One asset database

Render, Viewport and Timeline must reference the same asset IDs and scene nodes.

No workspace may create an independent Hero, Environment or HDRI copy.

### 6.3 Asset status

Each imported asset records:

```text
staging
ready
warning
missing
error
```

Recommended metadata:

```text
id
semanticType
fileName
mime
bytes
blobKey
contentHash
meshCount
triangleCount
nodeCount
animationCount
boundsMin
boundsMax
boundsSize
boundsRadius
sourceUnitHint
hasSkinnedMesh
hasMorphTargets
hasDraco
hasMeshopt
importedAt
lastValidatedAt
diagnostics[]
```

---

## 7. Atomic import pipeline

### 7.1 Required order

```text
1. Choose / drop file
2. Validate extension and basic size
3. Read Blob without changing the live project
4. Parse in a detached staging scene
5. Remove or quarantine imported cameras and lights
6. Inspect hierarchy, meshes, materials, animations and bounds
7. Build a preview/capability result
8. Persist new Blob under a temporary asset ID
9. Mount in the correct scene root
10. Verify finite transforms, bounds and renderability
11. Commit project state as one history command
12. Delete superseded Blob only after commit succeeds
13. Frame the imported node
```

### 7.2 Failure behavior

On any failure:

- the previous Hero or Environment remains active;
- the previous Blob remains stored;
- no proxy silently replaces a valid asset;
- staging resources are disposed;
- state receives an actionable diagnostic;
- the user sees `IMPORT FAILED`, not `READY`;
- Undo history receives no partial import.

### 7.3 Supported formats for this pass

**P0:** self-contained `.glb` only.  
**P1:** `.gltf` only after external buffer/texture bundling and relink behavior are designed.

Do not advertise `.gltf` support while only a single file picker exists.

### 7.4 Decoder policy

The production build must vendor or locally pin:

- Three.js;
- GLTFLoader;
- TransformControls;
- OrbitControls;
- DRACOLoader and decoder files;
- Meshopt decoder;
- RGBELoader.

A deployed project should not depend on a third-party Draco decoder URL for core import.

---

## 8. Canonical transform hierarchy

### 8.1 Hero

```text
Hero Project Root              baseline scene placement
└── Hero Shot State Root       Start / End creative motion only
    └── Pivot Compensation     correct physical origin without moving geometry
        └── Import Correction  orientation, correction scale, ground offset
            └── Auto Fit       camera-normalization contract
                └── GLB Content
```

### 8.2 Environment

```text
Environment Project Root       position / rotation / scale
└── Pivot Compensation         editable physical origin
    └── Import Correction      orientation / ground correction
        └── GLB Content        native scale; no camera-fit normalization
```

### 8.3 Secondary asset

```text
Prop Project Root
└── Pivot Compensation
    └── Import Correction
        └── Optional Auto Fit
            └── GLB Content
```

### 8.4 Transform responsibilities

| Layer | Editable by | Purpose |
|---|---|---|
| Project Root | Viewport Scene mode | persistent world placement |
| Shot State Root | Render or Viewport Shot mode | Start/End creative delta |
| Pivot Compensation | Pivot tool | repair origin while preserving world geometry |
| Import Correction | Calibration inspector | forward/up orientation, ground and source correction |
| Auto Fit | system | non-destructive Hero/Prop fit contract |
| Content | importer only | untouched source scene hierarchy |

---

## 9. Viewport interaction grammar

### 9.1 Main toolbar

```text
SELECT  MOVE  ROTATE  SCALE  PIVOT  |  WORLD / LOCAL  |  SNAP  FRAME  GROUND  RESET
```

Every item is a large chip with:

- icon;
- plain-language label;
- selected state;
- one-line tooltip;
- keyboard shortcut shown only in the tooltip or help layer.

Minimum desktop hit area: **40 px**.  
Minimum touch hit area: **44 px**.  
Primary control text: **14–16 px**, not micro typography.

### 9.2 Keyboard

```text
Q  Select
W  Move
E  Rotate
R  Scale
P  Pivot
X  World / Local
F  Frame selected
G  Ground selected
Esc cancel active transform
```

Shortcuts supplement the UI; they never replace visible controls.

### 9.3 Pointer behavior

Desktop:

```text
Left click object       select
Left drag gizmo         transform
Left drag empty space   orbit when Select is active
Right / middle drag     pan
Wheel                    dolly / zoom
Double click object     frame selected
```

Mobile/tablet:

```text
Tap object              select
One-finger empty drag   orbit
One-finger gizmo drag   transform
Two-finger drag         pan
Pinch                    zoom
Long press               contextual node actions
```

### 9.4 Direct selection

Implement raycast selection against imported meshes.

Selection resolves upward to the owning semantic scene node:

- any Hero child selects `hero-primary`;
- any Environment child selects `environment`;
- any Prop child selects its Prop node.

Outliner, Inspector, gizmo and selected highlight update from the same selected-node ID.

---

## 10. World / Local behavior

### 10.1 Persistent state

```js
ui.viewportSpace = "world" | "local";
```

### 10.2 Move

- **World:** handles remain aligned to global X/Y/Z.
- **Local:** handles follow selected node rotation.

### 10.3 Rotate

- **World:** rotation rings use global axes.
- **Local:** rings use node-local axes.

### 10.4 Scale

Three.js scale manipulation is fundamentally object-local. The UI must not fake a mathematically misleading world-scale mode.

Required behavior:

- Scale uses local axes in both states;
- World / Local chip remains visible for workflow continuity;
- selecting Scale shows a small contextual note: `SCALE · LOCAL AXES`;
- Uniform Scale is the primary simple control;
- XYZ non-uniform scale is contextual Advanced control.

### 10.5 Pivot

World / Local controls the orientation of the Pivot translation handles:

- World moves pivot offset along world axes;
- Local moves it along selected-node axes.

---

## 11. True pivot behavior

### 11.1 Required invariant

> Moving the pivot must not move the visible object.

The pivot operation changes the transform origin, not the current world-space appearance.

### 11.2 Compensation transaction

At pivot-drag start:

1. capture the selected content’s world matrix;
2. capture project-root and correction matrices;
3. begin one history gesture.

During drag:

1. calculate the requested pivot offset in asset-local coordinates;
2. update the Pivot Compensation node;
3. compensate the Project Root or child offset so the content world matrix remains unchanged;
4. refresh numeric fields and helper;
5. reject NaN, infinite or singular matrices.

At drag end:

- commit one undoable command;
- keep geometry stationary to within a small epsilon;
- persist pivot offset and compensated transform.

On cancel:

- restore the complete captured transform snapshot.

### 11.3 Pivot visual helper

The helper must be unmistakable but simple:

- small centre sphere;
- three translation axes;
- dashed line from pivot to bounds centre when they differ;
- optional bounds box;
- hidden in Render, Timeline playback and exports.

### 11.4 Pivot presets

```text
SOURCE ORIGIN
BOUNDS CENTRE
GROUND CENTRE
BOTTOM FRONT
BOTTOM BACK
SELECTED SURFACE POINT   P1
RESET
```

`GROUND CENTRE` should be the default rescue action for a badly exported product model.

### 11.5 Numeric control

Advanced Pivot properties expose:

```text
Pivot X
Pivot Y
Pivot Z
```

Values are stored in asset-local units and update live with the gizmo.

---

## 12. Hero edit modes

The Hero has two fundamentally different transform contexts. They must never be silently mixed.

### 12.1 SHOT mode

Edits the selected shot endpoint scope:

```text
START
BOTH
END
```

Move, Rotate and Uniform Scale affect the Hero’s creative Start/End state.

Pivot is disabled in Shot mode because pivot is project calibration, not shot animation.

### 12.2 CALIBRATE mode

Edits project-level physical setup:

- base placement;
- import orientation;
- uniform correction scale;
- ground offset;
- pivot;
- forward/up convention;
- auto-fit state.

Calibration affects every shot that references the Hero.

### 12.3 Visible mode chip

After selecting the Hero, display:

```text
HERO  |  SHOT / CALIBRATE  |  START / BOTH / END
```

When `CALIBRATE` is active, endpoint chips are disabled and replaced by `PROJECT BASELINE`.

---

## 13. Environment behavior

Environment is always edited as project scene baseline.

### 13.1 Simple controls

```text
Move
Rotate
Uniform Scale
Pivot
Frame
Ground
Visibility
Lock
Reset
```

### 13.2 Contextual Advanced controls

```text
Position X Y Z
Rotation X Y Z
Scale X Y Z
Uniform Scale
Pivot X Y Z
Ground Offset
Forward Axis
Up Axis
Receive Shadow
Cast Shadow
Material / mesh summary
Native bounds
Diagnostics
```

### 13.3 Environment import rules

- preserve native scale and origin;
- do not centre automatically;
- do not auto-arrange around Hero;
- calculate bounds for framing and diagnostics only;
- allow very large coordinate ranges;
- warn when the Hero is outside Environment bounds, but do not auto-fix it;
- keep HDRI light active independently;
- visible HDRI background may be on or off independently.

### 13.4 Ground action

`GROUND` translates the selected node so the lowest visible bounds point reaches project ground Y = 0.

It must:

- preserve X/Z placement;
- respect current rotation and scale;
- be one undo command;
- remain reversible;
- not modify source content.

---

## 14. Inspector grammar

The Inspector must be contextual, not a permanent technical matrix.

### 14.1 Selected Hero

```text
IDENTITY
SHOT / CALIBRATION MODE
TRANSFORM — active tool only
PIVOT & GROUND — only in Calibration
IMPORT SUMMARY
ANIMATION SUMMARY
VISIBILITY & LOCK
DIAGNOSTICS
```

### 14.2 Selected Environment

```text
IDENTITY
TRANSFORM — active tool only
PIVOT & GROUND
WORLD OPTIONS
IMPORT SUMMARY
VISIBILITY & LOCK
DIAGNOSTICS
```

### 14.3 Contextual “Advanced properties”

The Advanced panel extends the selected chip.

Examples:

- Move → numeric XYZ and position snap;
- Rotate → numeric XYZ, rotation snap and local/world explanation;
- Scale → uniform/XYZ and positive-scale limits;
- Pivot → XYZ, presets and compensation status;
- Environment → shadow policy and native-bounds diagnostics;
- Import card → file metadata and relink.

It must never duplicate every scene property at once.

---

## 15. Game-like visual language

The scene editor should feel like choosing a move in a game, not operating a DCC package.

### 15.1 Primary chips

- large icon;
- single verb;
- immediate selected state;
- no abbreviations such as `TR`, `RT`, `SCL`;
- no 7 px labels;
- direct visual feedback in the player.

### 15.2 State color

```text
Selected / Memento action     #ff7950
Neutral shared state          white
Disabled / locked             restrained grey
Warning                       orange outline + plain-language reason
Error                         persistent red status, no silent fallback
```

World and Local should be a two-state chip, not a dropdown.

### 15.3 Progressive disclosure

```text
First layer   Select / Move / Rotate / Scale / Pivot
Second layer  World / Local, Snap, Frame, Ground, Reset
Advanced      only the active tool’s granular controls
```

---

## 16. State additions

Recommended additions to canonical project state:

```js
ui: {
  viewportTool: "select",       // select | translate | rotate | scale | pivot
  viewportSpace: "world",       // world | local
  viewportEditMode: "scene",    // scene | shot | calibrate
  viewportSnapEnabled: false,
  viewportSnap: {
    position: 0.1,
    rotationDeg: 15,
    scale: 0.1,
    pivot: 0.1
  },
  selectedNodeId: "hero-proxy"
}
```

Per node:

```js
{
  locked: false,
  transformLocks: {
    position: false,
    rotation: false,
    scale: false,
    pivot: false
  },
  baseTransform: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1]
  },
  correction: {
    pivot: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    groundOffset: 0,
    forwardAxis: "+Z",
    upAxis: "+Y"
  }
}
```

---

## 17. Command additions

### Asset lifecycle

```text
asset.stageImport
asset.validateStagedImport
asset.commitImport
asset.failImport
asset.cancelImport
asset.relink
asset.remove
```

### Viewport state

```text
ui.setViewportTool
ui.setViewportSpace
ui.setViewportEditMode
ui.setViewportSnap
ui.selectNode
```

### Scene transforms

```text
scene.setNodeTransform
scene.setNodeCorrection
scene.setNodePivotCompensated
scene.applyPivotPreset
scene.groundNode
scene.frameNode
scene.resetNodeTransform
scene.setNodeLocked
scene.setTransformChannelLock
```

Every pointer drag must be one gesture in Undo/Redo.

---

## 18. Renderer-service objectives

### 18.1 TransformControls

Required integration:

```js
transformControl.setMode("translate" | "rotate" | "scale");
transformControl.setSpace("world" | "local");
transformControl.setTranslationSnap(valueOrNull);
transformControl.setRotationSnap(radiansOrNull);
transformControl.setScaleSnap(valueOrNull);
```

For Pivot mode, attach TransformControls to a dedicated temporary pivot helper rather than directly moving the visible node.

### 18.2 Visibility policy

Editor-only helpers must never appear in:

- Render output;
- Start/End captures;
- Timeline playback;
- Playblast/export.

### 18.3 Selection highlight

Use a lightweight bounds/helper highlight, not duplicate emissive materials across the whole asset.

### 18.4 Safety

Reject or rollback:

- non-finite matrices;
- zero or negative scale below the approved epsilon;
- invalid quaternion/Euler conversion;
- camera clipping inside selected bounds after Frame;
- detached or disposed selected nodes;
- pivot compensation that moves geometry beyond tolerance.

---

## 19. Priority plan

### P0 — blocking core

- [ ] Hero `.glb` import parses before replacing the current Hero.
- [ ] Environment `.glb` import parses before replacing the current Environment.
- [ ] Failed replacement preserves the active asset and Blob.
- [ ] Hero and Environment survive refresh and route changes.
- [ ] Dedicated Environment root remains native-space.
- [ ] Direct viewport raycast selection works.
- [ ] Select, Move, Rotate, Scale and Pivot tools work.
- [ ] World / Local switch is persistent and updates TransformControls.
- [ ] Scale is clearly identified as local-axis behavior.
- [ ] Pivot gizmo changes origin without moving visible geometry.
- [ ] Pivot XYZ values and helper stay synchronized.
- [ ] Source Origin, Bounds Centre, Ground Centre and Reset pivot presets work.
- [ ] Hero clearly switches between Shot and Calibrate modes.
- [ ] Hero Shot mode respects Start / Both / End.
- [ ] Environment supports Position, Rotation, XYZ Scale, Uniform Scale and Pivot.
- [ ] Lock prevents gizmo and numeric mutation.
- [ ] Frame Selected works for Hero and huge Environment assets.
- [ ] Ground Selected works as one undoable command.
- [ ] Every gizmo drag creates one Undo/Redo history entry.
- [ ] Render, Viewport and Timeline resolve the same imported scene state.
- [ ] Renderer fallback never starts as an unexplained black screen.
- [ ] Deployed browser test passes with real project assets.

### P1 — hardening and clarity

- [ ] Position, rotation, scale and pivot snapping.
- [ ] Capability metadata: meshes, triangles, nodes, animations and bounds.
- [ ] Import warning for unsupported extensions and external `.gltf` dependencies.
- [ ] Relink missing Blob flow.
- [ ] Selected-surface pivot placement.
- [ ] Forward / Up axis presets.
- [ ] Animation summary and default clip selection.
- [ ] Material summary without material editing.
- [ ] Mobile transform toolbar and touch acceptance pass.
- [ ] Locally vendored Three.js and decoder stack.

### P2 — later expansion

- [ ] Feature-anchor authoring inspired by V36.
- [ ] Hero Variant semantic slots.
- [ ] Landscape world role.
- [ ] Per-shot scene overrides beyond Hero creative transform.
- [ ] Collision-aware camera navigation.
- [ ] Surface snapping and scene alignment tools.

---

## 20. Test matrix

### 20.1 Required assets

Use at least:

1. a small product Hero with correct origin;
2. a Hero with an obviously bad/off-centre pivot;
3. a Hero exported with wrong up/forward orientation;
4. a very large architectural Environment;
5. an Environment whose origin is far from visible geometry;
6. one DRACO-compressed GLB;
7. one Meshopt-compressed GLB;
8. one animated/skinned GLB;
9. one malformed or unsupported file;
10. one HDRI.

### 20.2 Required sessions

```text
Fresh project
Import Hero
Import Environment
Transform each in World and Local
Correct Hero pivot
Correct Environment pivot
Ground and frame both
Create Start/End Hero motion
Add shot to Timeline
Reload page
Navigate Render → Viewport → Timeline → Viewport
Undo / Redo transforms
Attempt invalid Hero replacement
Attempt invalid Environment replacement
Remove and relink asset
Repeat core controls on touch device
```

### 20.3 Pivot invariance test

Before and after every pivot change:

- sample the world positions of several content vertices or bounds corners;
- confirm maximum movement remains below the approved epsilon;
- confirm the pivot helper moved to the requested location;
- confirm Undo restores both pivot and compensated transform.

Recommended tolerance for normal project scales:

```text
max visible world-space drift ≤ 0.0001 scene units
```

### 20.4 Persistence test

After reload:

- asset IDs match;
- Blob records resolve;
- node transforms match;
- pivot offsets match;
- calibration and shot transforms remain separate;
- current selected tool/space may restore, but active drag never restores;
- missing assets show `MISSING`, never disappear silently.

---

## 21. Explicit non-goals for V44

Do not expand this pass into:

- full Blender-style hierarchy editing;
- mesh/component edit mode;
- material authoring;
- UV or texture editing;
- skeleton/rig editing;
- keyframe animation editing;
- physics;
- collision authoring;
- FBX/OBJ/USD import;
- cloud asset marketplace;
- multi-user collaboration.

The objective is a **child-proof scene correction tool**, not a general-purpose DCC package.

---

## 22. Definition of Done

V44 is complete only when a non-technical user can:

1. press **Hero** and import a GLB;
2. press **World** and import an Environment GLB;
3. click either object to select it;
4. understand Move, Rotate, Scale and Pivot from icons and labels;
5. switch World / Local without knowing matrix terminology;
6. repair a bad object origin without the model jumping;
7. ground and frame the asset with one action;
8. distinguish Hero Shot movement from Hero Calibration;
9. reload and find the same scene intact;
10. use the same corrected scene in Render and Timeline.

> **Final acceptance statement:** the scene must be physically controllable before it is visually polished. No amount of UI refinement can compensate for missing import, transform and pivot behavior.
