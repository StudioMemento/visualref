# MEMENTO VisualRef — V43 Technical Implementation Handoff

**Status:** Canonical architecture locked; V43A Foundation implemented  
**Behavioral oracle:** `MEMENTO_V36C_SHOT_PRESET_ENGINE.html`  
**Product specification:** `MEMENTO_VISUALREF_CANONICAL_PRODUCT_SPEC_V43.md`  
**First implementation:** `MEMENTO_VISUALREF_V43A_FOUNDATION/`  
**Primary product outcome:** A complete multi-shot sequence playblast built from real 3D assets through one continuous workflow.

---

## 0. Executive implementation decision

VisualRef V43 will use **three dedicated workspace entry pages sharing one application core**:

```text
render.html
viewport.html
timeline.html
```

This is architecture **D** from the product decision:

- separate mental spaces for Shot, Scene and Sequence work;
- one Player implementation;
- one project state;
- one command path;
- one undo/redo history;
- one persistence layer;
- one renderer contract;
- one linked Shot database;
- no duplicated application logic inside the three HTML files.

V36C remains frozen and unchanged. It is not copied wholesale into the new runtime. It is used as:

1. a behavioral oracle;
2. a registry and migration source;
3. an acceptance-test source;
4. a visual hierarchy reference.

V42 contributes only the useful architectural concepts: central state, explicit workspaces, gesture-aware history and a shared Player shell.

---

# 1. Release architecture

## 1.1 Canonical folder structure

```text
visualref-v43/
├── index.html
├── render.html
├── viewport.html
├── timeline.html
├── vercel.json
│
├── css/
│   ├── tokens.css
│   ├── base.css
│   ├── shell.css
│   ├── player.css
│   ├── workspaces.css
│   └── responsive.css
│
├── src/
│   ├── app/
│   │   └── bootstrap.js
│   │
│   ├── core/
│   │   ├── default-state.js
│   │   ├── project-store.js
│   │   ├── command-bus.js
│   │   ├── commands.js
│   │   ├── history-service.js
│   │   ├── persistence-service.js
│   │   ├── workspace-sync.js
│   │   └── utils.js
│   │
│   ├── engine/
│   │   └── renderer-service.js
│   │
│   ├── player/
│   │   ├── player-controller.js
│   │   └── shot-interpolator.js
│   │
│   ├── shots/
│   │   └── presets.js
│   │
│   ├── ui/
│   │   └── app-shell.js
│   │
│   └── workspaces/
│       ├── render-workspace.js
│       ├── viewport-workspace.js
│       └── timeline-workspace.js
│
├── tests/
│   └── core-smoke.mjs
│
└── docs/
    ├── MEMENTO_VISUALREF_CANONICAL_PRODUCT_SPEC_V43.md
    └── MEMENTO_VISUALREF_V43_IMPLEMENTATION_HANDOFF.md
```

## 1.2 Entry-page rule

The three HTML files may contain:

- metadata;
- stylesheet links;
- one root mount element;
- workspace identity through `body[data-workspace]`;
- one shared bootstrap module.

They must not contain independent:

- project stores;
- renderers;
- Player code;
- Shot logic;
- Timeline logic;
- persistence code;
- duplicate CSS systems.

---

# 2. Shared application boot

## 2.1 Boot order

```text
1. Display visible calibrated boot/proxy state.
2. Read workspace identity from body[data-workspace].
3. Load the active project from IndexedDB/local fallback.
4. Normalize the state schema.
5. Restore session history.
6. Start BroadcastChannel synchronization.
7. Create ProjectStore.
8. Register CommandBus handlers.
9. Mount global AppShell.
10. Mount shared Player.
11. Mount the selected workspace panel.
12. Persist active workspace.
13. Remove boot class.
```

## 2.2 Non-black boot requirement

The Player must never depend on a real GLB before it can display something.

Boot states:

| State | Player output |
|---|---|
| Project database loading | Visible branded boot proxy |
| Renderer loading | Calibrated proxy surface |
| Three.js unavailable | Explicit visible fallback renderer |
| GLB loading | Proxy remains until validated Hero is ready |
| WebGL context loss | Recovery message and retained project state |
| Hero failed | Proxy plus import diagnostic |

A blank black Player is always considered a failure.

---

# 3. State architecture

## 3.1 State ownership

```text
ProjectState
├── schema
├── meta
├── settings
├── assets
├── scene
├── shots
├── playback
├── timeline
├── glossary
└── ui
```

### Asset state

Describes reusable source media:

- Hero GLB;
- Environment GLB;
- HDRI;
- secondary GLBs;
- audio;
- images;
- generated thumbnails.

### Scene state

Describes the persistent scene graph:

- node identity;
- hierarchy;
- visibility;
- lock state;
- base transform;
- active camera;
- active light rig;
- environment contribution;
- renderer settings.

### Shot state

Describes one authored cinematic movement:

- identity and family;
- Start values;
- End values;
- duration;
- easing;
- variant seed and iteration;
- locks;
- preset provenance;
- Delta target and diagnostics.

### Clip state

Describes sequence placement only:

- track;
- start frame;
- duration;
- source in/out;
- linked Shot ID;
- alias;
- linked or unique state.

Clip geometry must never be stored inside the Shot.

## 3.2 Frame authority

The internal source of truth is frames.

```text
seconds = frame / fps
frame = round(seconds × fps)
```

Rules:

- Shot duration is stored in frames.
- Timeline positions are stored in frames.
- Player scrubbing is frame-authoritative.
- UI seconds are derived.
- MediaRecorder timing is derived from the Timeline clock.

## 3.3 Start / Both / End contract

```text
START → mutate shot.start only
END   → mutate shot.end only
BOTH  → mutate both endpoints through the same command
```

Both must not be implemented as a UI visual state only.

Mixed values:

- display both values;
- identify the field as mixed;
- do not silently choose Start or End;
- the next explicit edit writes to both.

## 3.4 Delta contract

Delta is derived from normalized Start/End differences.

Release-one values:

- changed-axis count;
- normalized aggregate score;
- per-axis difference;
- risk band: stable, active, aggressive;
- target used by deterministic variant generation.

Delta is never manually cached without validation. It should be recalculated from canonical endpoint state.

---

# 4. Command architecture

## 4.1 Rule

All meaningful mutations must go through the CommandBus.

UI components may:

- dispatch commands;
- subscribe to state;
- hold temporary pointer geometry during gestures.

UI components may not directly mutate project state.

## 4.2 Command catalogue — foundation

### History

```text
history.undo
history.redo
```

### Gestures

```text
gesture.begin
gesture.end
gesture.cancel
```

One drag or slider gesture creates one history entry.

### UI

```text
ui.setScope
ui.toggleAdvanced
ui.setViewportTool
ui.selectNode
ui.openProject
```

### Project

```text
project.rename
project.reset
```

### Shot

```text
shot.setAxis
shot.setDuration
shot.setFamily
shot.applyPreset
shot.generateVariant
shot.reset
shot.addToTimeline
```

### Playback

```text
playback.toggle
playback.setLoop
playback.seek
playback.jumpStart
playback.jumpEnd
```

### Timeline

```text
timeline.selectClip
timeline.setPlayhead
timeline.moveClip
timeline.trimClip
timeline.deleteClip
timeline.toggleSnap
timeline.setZoom
timeline.updateSelected
```

## 4.3 Command catalogue — next implementation

```text
asset.importHero
asset.importEnvironment
asset.importSecondary
asset.importHDRI
asset.importAudio
asset.relink
asset.remove
asset.calibrate
asset.setPivot
asset.ground
asset.frame
scene.setTransform
scene.toggleVisibility
scene.toggleLock
scene.addAnchor
scene.removeAnchor
shot.duplicate
shot.makeUnique
shot.updateLinkedClip
shot.setLock
shot.setDeltaTarget
shot.applyV36Preset
timeline.blade
timeline.slip
timeline.moveToTrack
timeline.addMarker
timeline.toggleTrackVisibility
timeline.toggleTrackMute
timeline.toggleTrackLock
playblast.start
playblast.cancel
playblast.save
```

---

# 5. History and persistence

## 5.1 History

The history service stores project snapshots for command boundaries.

Rules:

- limit the history stack;
- do not add playback ticks;
- do not add hover or selection-only changes unless useful;
- one slider drag = one undo;
- one clip move = one undo;
- one preset application = one undo;
- one variant generation = one undo;
- history survives navigation between the three pages through `sessionStorage`;
- project reset clears history.

## 5.2 IndexedDB

Database:

```text
memento-visualref-v43
```

Stores required for the full build:

```text
projects
assets
thumbnails
waveforms
playblasts
migrationReports
```

V43A currently stores the project record. V43B expands the database with binary media stores.

## 5.3 Local storage

Local storage is restricted to:

- fast boot project snapshot;
- cross-page fallback signal;
- small interface preferences.

Large media does not belong in local storage.

## 5.4 Autosave

Autosave triggers after:

- a command commit;
- a completed gesture;
- project rename;
- workspace change;
- page unload flush.

Playback ticks and hover state do not trigger autosave.

## 5.5 Cross-workspace synchronization

Primary mechanism:

```text
BroadcastChannel("memento-visualref-v43")
```

Fallback:

```text
storage event
```

Remote state is accepted only when its `updatedAt` is not older than the local state.

---

# 6. Renderer contract

## 6.1 RendererService interface

```text
mount(canvas)
render(evaluatedFrame, projectState, wallTime)
resize()
dispose()
loadHero(assetRecord)
loadEnvironment(assetRecord)
loadHDRI(assetRecord)
setQuality(tier)
recoverContext()
```

V43A implements:

- actual Three.js WebGL rendering through a pinned module URL;
- a calibrated built-in 3D Hero proxy;
- camera, Hero, light and atmosphere interpolation;
- resize handling;
- context-lost status;
- visible Canvas fallback.

V43B adds:

- local vendored Three.js dependency;
- GLTFLoader;
- DRACOLoader;
- RGBELoader;
- real Hero and Environment nodes;
- binary asset persistence;
- material and animation validation;
- bounds and pivot calibration.

## 6.2 Runtime separation

The renderer consumes derived state. It does not own authored project state.

```text
ProjectState
    ↓
ShotInterpolator / SequenceEvaluator
    ↓
EvaluatedFrame
    ↓
RendererService
```

This prevents the renderer, Player and Timeline from maintaining conflicting transforms.

## 6.3 EvaluatedFrame

```text
EvaluatedFrame
├── shotId
├── clipId?
├── frame
├── duration
├── normalizedTime
├── easedTime
├── values
│   ├── subject transform
│   ├── camera state
│   ├── light state
│   └── environment state
└── diagnostics
```

---

# 7. Shared Player contract

## 7.1 One implementation

The same `PlayerController` is mounted in all workspaces.

Mode changes only affect:

- evaluated source;
- overlays;
- pointer behavior;
- maximum frame;
- status labels.

## 7.2 Fixed visual layers

```text
STATUS BAR
VISIBLE FALLBACK / RENDER CANVAS
OUTPUT GATE
CONTEXT OVERLAY
PRIMARY TRANSPORT
SECONDARY TRANSPORT
```

## 7.3 Primary transport order

```text
LOOP
PLAY / PAUSE
START
END
SHOT SCRUB
CURRENT FRAME
DELTA
```

## 7.4 Secondary transport order

```text
SECONDS
FPS
ASPECT
VARIANT MODE
GENERATE
VARIANT NUMBER
ADD TO TIMELINE
```

## 7.5 Player modes

### Render

Evaluates the active Shot.

### Viewport

Displays the active Shot state while direct pointer tools edit its endpoint values.

### Timeline

Evaluates the highest occupied visible video track at the current sequence frame.

## 7.6 Critical behavior

- center click/tap toggles Play outside Viewport transform mode;
- Start and End are exact authored states;
- resizing does not reset playback;
- route change does not replace project state;
- linked Timeline clips resolve the current Shot data;
- gaps show a valid scene rather than black;
- format gate is the true output area;
- outside-gate area is dimmed.

---

# 8. Render workspace contract

## 8.1 Order

```text
ACTIVE SHOT
ASSET SUMMARY
SHOT FAMILY
FAMILY PRESETS
GENERATE / RESET
START · BOTH · END
DELTA SUMMARY
CREATIVE CONTROLS
ADD / UPDATE SHOT
```

## 8.2 Foundation axes

V43A proves endpoint architecture using:

### Frame

- Camera distance
- Camera height

### Subject

- Position X
- Position Y
- Scale
- Rotation Y

### World

- Key light
- Environment depth

These are temporary implementation axes, not the final reduced creative grammar.

## 8.3 Full V36C axis migration

V43C expands to the canonical eleven axes:

1. Light
2. Camera
3. Lens
4. Focus
5. Composition
6. Subject Scale
7. Subject Rotation
8. View
9. Motion Design
10. Environment
11. Atmosphere

The UI groups them into Frame, Subject and World without merging their state identities.

## 8.4 Preset rule

A preset must:

- patch Start and End through one command;
- respect locks;
- preserve asset identity;
- preserve Timeline clip geometry;
- record provenance;
- be deterministic;
- be undoable;
- start playback without renderer reload.

---

# 9. Viewport workspace contract

## 9.1 Purpose

Viewport edits real spatial state without becoming a general 3D package.

## 9.2 Tool order

```text
TRANSLATE
ROTATE
SCALE
ORBIT VIEW
```

Next:

```text
PIVOT
GROUND
FRAME
ANCHOR
RESET
```

## 9.3 Pointer grammar

```text
Translate → horizontal/vertical pointer delta edits endpoint position
Rotate    → horizontal pointer delta edits endpoint rotation
Scale     → vertical pointer delta edits endpoint scale
Orbit     → pointer delta edits camera distance and height
```

Gestures are grouped into one history action.

## 9.4 Outliner order

```text
Hero
Environment
Secondary Assets
Camera
Light Rig
Graphics
```

## 9.5 Transform model

Every imported node has:

```text
baseTransform
├── position [x,y,z]
├── rotation [x,y,z]
├── scale [x,y,z]
└── pivotOffset [x,y,z]
```

Shot endpoint transforms are authored separately from base calibration.

```text
finalRuntimeTransform = baseTransform × evaluatedShotTransform
```

---

# 10. Timeline workspace contract

## 10.1 Fixed tracks

Top to bottom:

```text
GFX / FX
V3
V2
V1
A1
A2
```

## 10.2 Layer rule

The highest occupied visible video track wins unless an explicit compositing mode exists.

```text
V3 > V2 > V1
```

## 10.3 Linked Shot rule

Default Timeline Shot clips are linked references.

Editing the source Shot updates every linked clip's visual result but does not alter:

- clip start;
- clip duration;
- track;
- source in/out;
- clip alias.

`Make Unique` duplicates the Shot and repoints only the selected clip.

## 10.4 Foundation tools

V43A implements:

- select;
- frame playhead;
- move clip;
- right trim;
- fixed tracks;
- zoom;
- fit;
- delete;
- linked sequence playback;
- negative pre-roll to -10 frames.

Next tools:

- left trim;
- blade;
- slip;
- markers;
- track lock/visibility/mute;
- audio waveform;
- GFX/FX evaluation.

## 10.5 Touch rule

Timeline panning must never move the playhead unless the ruler or playhead is explicitly engaged.

---

# 11. V36C extraction map

## 11.1 Preserve as behavioral tests

From the V36C public and acceptance APIs:

```text
v36CPublicAPI
v36CRunTests
v36CAudit
v36CExecuteCommand
v36CCompatibility
v36CPresetSeed
projectPayload
restoreHistorySnapshot
```

The final migration harness should load V36C in an isolated test page, call its public API and compare normalized outputs.

## 11.2 Extract and normalize

### Creative grammar

```text
AXES
optOf
cloneSel
deltaAnalysis
```

### Shot role and technical preset layers

```text
ROLE_PRESETS
ROLE_BY_ID
TECH_PRESETS
TECH_BY_ID
SHOT_TYPES
SHOT_TYPE_BY_PRESET
```

### Sequence preset data

```text
PRESETS
SEQ_PRESET_ICON
```

### V36A real-scene systems

```text
V36A_ASSET_SLOT_REGISTRY
V36A_LIGHT_RIG_REGISTRY
V36A_LIGHT_RIG_MAP
camera safety / rollback state
anchor data
HDRI state
```

### V36B composition/reveal systems

```text
V36B_COMPOSITION_PATTERN_REGISTRY
V36B_REVEAL_PATTERN_REGISTRY
composition elements
five reveal phases
screen safety
world safety
```

### V36C shot preset system

```text
V36C_SHOT_PRESET_REGISTRY
V36C_DEFAULT_PRESET_IDS
V36C_COMMANDS
preset fallback chains
compatibility diagnostics
provenance
```

### Timeline policy

Extract behavior rather than DOM:

- frame-authoritative geometry;
- negative pre-roll;
- track order;
- trim and blade semantics;
- track visibility/mute/lock;
- selected clip behavior;
- linked Shot relationship;
- waveform and relink state;
- player/timeline agreement.

## 11.3 Rewrite cleanly

Do not copy the following runtime architecture:

- global mutable variables;
- layered script overrides;
- late monkey patches;
- repeated install timers;
- DOM ownership shared by unrelated systems;
- renderer state stored in UI elements;
- duplicated View modes;
- historical compatibility CSS inside the new UI.

## 11.4 Remove

Do not migrate:

- TEST / BANCO / DEF navigation;
- old technical matrices;
- PDF export;
- text export;
- demo projects;
- experimental preset libraries;
- future-engine placeholders without a committed product use.

The Glossary remains as a secondary page/service after core stabilization.

---

# 12. V43A Foundation implementation status

## 12.1 Implemented

- three entry pages;
- shared AppShell;
- centered workspace navigation;
- shared Player component;
- visible non-black proxy boot;
- pinned Three.js renderer path with visible fallback;
- calibrated proxy Hero and environment;
- one canonical project state;
- command bus;
- gesture-aware history;
- session history across routes;
- IndexedDB project persistence;
- local boot snapshot;
- BroadcastChannel synchronization;
- Start / Both / End editing;
- mixed-value display;
- Delta computation;
- deterministic Near / Balanced / Bold variants;
- Shot families and curated foundation presets;
- direct Viewport pointer transforms;
- fixed Timeline tracks;
- linked Shot clips;
- Timeline move and right trim;
- sequence evaluation through the shared Player;
- responsive desktop/tablet/mobile layouts;
- core smoke test.

## 12.2 Deliberately deferred

- real GLB import;
- Environment GLB import;
- secondary GLBs;
- HDRI import;
- pivot correction;
- ground and frame helpers;
- binary IndexedDB assets;
- V36C registry migration;
- audio decoding and waveform;
- GFX/FX compositing;
- playblast capture;
- Glossary page;
- mobile world chooser.

## 12.3 Known foundation dependency

The current Three.js module is loaded from a pinned CDN URL. A visible Canvas fallback prevents a black Player when the module is unavailable.

Before V43B is considered production-ready, vendor the exact Three.js package locally with:

```text
three.module.js
GLTFLoader.js
DRACOLoader.js
DRACODecoder files
RGBELoader.js
```

This removes the remaining external boot dependency.

---

# 13. Build sequence

## V43A — Shared foundation

Pass criteria:

1. Player is visible immediately.
2. Start edit remains Start-only.
3. End edit remains End-only.
4. Both edits both endpoints.
5. Scrub evaluates continuous interpolation.
6. Undo/redo restores commands and gestures.
7. Route changes preserve project and history.
8. Add Shot creates a linked V1 clip.
9. Linked clip resolves current Shot data.
10. Timeline sequence playback uses the same Player.
11. Refresh restores the project.
12. Mobile shows a functional creation path.

## V43B — Real scene

Implement:

- vendored Three.js stack;
- Hero GLB;
- Environment GLB;
- secondary GLB slots;
- HDRI;
- IndexedDB binary assets;
- position, rotation, scale;
- pivot correction;
- ground;
- frame;
- bounds-aware camera;
- relink diagnostics.

Gate:

> Do not begin full preset migration until a real Hero and Environment survive refresh and route changes.

## V43C — V36C Shot intelligence

Implement:

- eleven axes;
- curated families;
- normalized V36C preset registry;
- locks and exclusion pools;
- compatibility resolution;
- fallback chains;
- provenance;
- Delta target;
- Advanced contextual controls.

## V43D — Production Viewport

Implement:

- outliner hierarchy;
- base transforms;
- pivot;
- anchors;
- camera target;
- HDRI/background policy;
- shadow policy;
- material diagnostics;
- animation mixer selection.

## V43E — Timeline and complete sequence

Implement:

- blade;
- both-side trim;
- slip;
- track controls;
- markers;
- audio;
- waveforms;
- GFX/FX;
- Shot library;
- Make Unique;
- sequence presets;
- player/timeline acceptance parity.

## V43F — Playblast

Implement:

- deterministic sequence clock;
- MediaRecorder/WebM;
- resolution choice;
- burn-in options;
- output diagnostics;
- saved playblasts in IndexedDB.

## V43M — Mobile demo product

Implement:

- GLB upload;
- ready-made worlds;
- swipe Shot presets;
- simplified Shot axes;
- small Timeline;
- preview/playblast;
- adaptive render tier.

---

# 14. Acceptance matrix

## 14.1 Boot

| Test | Pass condition |
|---|---|
| No asset | Calibrated proxy visible |
| Slow renderer | Boot proxy remains visible |
| Renderer failure | Explicit fallback, no black screen |
| Refresh | Current project restored |
| Route change | Same project and active Shot |

## 14.2 Player

| Test | Pass condition |
|---|---|
| Start | Exact Start values |
| End | Exact End values |
| Scrub | Continuous monotonic interpolation |
| Loop | Returns to frame zero |
| Resize | No state or playback reset |
| Sequence mode | Uses Timeline frame source |

## 14.3 Shot editor

| Test | Pass condition |
|---|---|
| Start scope | End unchanged |
| End scope | Start unchanged |
| Both scope | Both receive explicit edit |
| Mixed value | Both endpoint values visible |
| Preset | One undo step |
| Generate | Deterministic seed/iteration |
| Linked clip | Clip geometry unchanged |

## 14.4 Viewport

| Test | Pass condition |
|---|---|
| Translate drag | One undo step |
| Rotate drag | Same state visible in Render |
| Scale drag | Bounds preserved |
| Orbit drag | Player does not toggle playback |
| Select node | Inspector follows selection |

## 14.5 Timeline

| Test | Pass condition |
|---|---|
| Add Shot | Linked clip created |
| Move | Frame-authoritative position |
| Trim | Minimum one frame |
| Track layer | V3 > V2 > V1 |
| Gap | Valid scene, not black |
| Pan | Does not move playhead |
| Source edit | Linked visual updates, geometry stable |

## 14.6 Persistence

| Test | Pass condition |
|---|---|
| Refresh | Project restored |
| Page navigation | History survives |
| Cross-tab | Newer state appears |
| Asset missing | Relink state, no silent replacement |
| Schema mismatch | Explicit migration report |

## 14.7 Mobile

| Test | Pass condition |
|---|---|
| Initial load | Player dominant and usable |
| Touch scrub | No page conflict |
| Preset swipe | Smooth and intentional |
| Shot creation | Add to small sequence |
| Performance | Adaptive quality, no hidden crash |

---

# 15. Immediate next action

The next code checkpoint is **V43B Real Scene**.

Implementation order:

```text
1. Vendor Three.js and loaders locally.
2. Add AssetService and binary IndexedDB stores.
3. Import and render Hero GLB.
4. Persist Hero across refresh.
5. Import and render Environment GLB.
6. Persist Environment across refresh.
7. Add position / rotation / scale UI.
8. Add pivot correction.
9. Add Ground and Frame commands.
10. Add HDRI import and background toggle.
11. Run the real-scene acceptance gate.
```

No additional visual redesign should happen until this gate passes.

---

# 16. Final engineering principle

> The rebuild is successful only when Render, Viewport and Timeline are three views over the same real project—not three interfaces that merely look related.
