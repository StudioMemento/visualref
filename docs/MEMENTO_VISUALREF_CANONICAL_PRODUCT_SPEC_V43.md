# MEMENTO VisualRef — Canonical Product Specification

**Specification:** V43 · Clean Rebuild Definition  
**Status:** Product direction locked; ready for architecture and implementation planning  
**Behavioral baseline:** `MEMENTO_V36C_SHOT_PRESET_ENGINE.html`  
**Supporting comparison:** `MEMENTO_VISUALREF_REVERSE_ENGINEERING_COMPARISON.md`  
**Primary outcome:** A complete cinematic sequence playblast created from real 3D assets through one continuous workflow

---

## 0. Locked decisions

The following decisions are authoritative for the rebuild.

| Topic | Locked direction |
|---|---|
| Product identity | VisualRef is a **shot generator, manual previsualization editor and sequence builder**, in that order inside one workflow. |
| Audience | Built for **all creatives**, not only 3D specialists. It must be approachable without removing professional control. |
| Successful output | A **complete sequence playblast**, not merely an isolated attractive shot. |
| Rendering | Real-time 3D with real **Hero GLB**, **Environment GLB**, HDRI and secondary GLB support. |
| Transform control | Every imported 3D asset must support position, scale, rotation and pivot/calibration controls. |
| Sacred systems | Shot Player; Shot Player Editor; Start, End and Delta control; coherent presets; responsive behavior. |
| Behavioral reference | V36C is the source of truth for the product’s feel, player grammar and creative behavior. |
| Removed systems | TEST, BANCO, DEF navigation; old technical matrices; PDF/text exports; demo content; experimental presets. |
| Retained learning system | The Glossary remains, but is removed from the primary creative workflow. |
| Architecture | **Three dedicated workspace entry pages sharing one application core.** No duplicated player, renderer or state logic. |
| Mobile role | A playful, immediate demo and lightweight creation experience: upload a GLB, choose ready-made shot/environment presets, add HDRI or supplied assets and create shots. |
| Timeline tracks | `GFX / FX`, `V3`, `V2`, `V1`, `A1`, `A2`, from top to bottom. |
| Visual baseline | V36C, simplified and rebuilt cleanly rather than visually replaced by V42. |

---

# 1. Product definition

## 1.1 What VisualRef is

VisualRef is a **child-proof cinematic 3D previsualization studio for professional creatives**.

It allows a user to:

1. upload or select a real 3D hero product;
2. establish a scene and visual world;
3. generate or manually direct a cinematic shot;
4. define its Start and End states;
5. control the Delta between those states;
6. add the shot to a sequence;
7. edit the complete sequence on a timeline;
8. preview and record a playblast.

The application should feel closer to directing a visual experience than operating a traditional 3D package.

It is **not** intended to reproduce Blender, Unreal Engine or DaVinci Resolve feature-for-feature. It borrows only the controls needed to make cinematic decisions understandable, fast and reusable.

## 1.2 Product promise

> Upload an object, choose a visual direction, shape the movement, build the sequence and see the idea move.

## 1.3 Core user outcome

The user must be able to start from an empty project and reach a coherent multi-shot playblast without leaving VisualRef.

A single beautiful shot is an intermediate success. A complete playable sequence is the product success.

---

# 2. Product principles

## 2.1 Game-like first, professional depth second

The initial interaction layer should be immediate:

- upload;
- select a preset;
- generate a variant;
- play;
- add to sequence.

Technical controls should appear contextually when the user needs them, not dominate the initial experience.

## 2.2 One state, many views

Render, Viewport and Timeline are three views over the same project.

They must never contain separate copies of:

- the active Hero;
- the current shot;
- Start or End state;
- timeline clip data;
- environment state;
- asset transforms;
- player timing.

## 2.3 No hidden destructive behavior

Changing a preset, generating a variation or editing an asset must be predictable and undoable.

Preset application must report what it changed. Generation must respect locks. Timeline edits must not silently alter source shots.

## 2.4 Player-first hierarchy

The Player is the dominant visual object across all workspaces.

Controls exist to affect what the user sees in the Player. The UI must never visually overpower the scene.

## 2.5 Progressive disclosure

Simple mode shows creative decisions. Advanced mode exposes technical overrides.

Advanced mode is not a second application. It extends the currently selected creative control.

## 2.6 Mobile is not a squeezed desktop

Mobile is a deliberately simplified, highly tactile product experience with a clear success path. It should be fun enough to demonstrate the product and capable enough to produce a small real sequence.

---

# 3. Canonical application architecture

## 3.1 Chosen architecture: three entries, one shared core

The rebuild will use three dedicated workspace entry pages:

```text
/render.html
/viewport.html
/timeline.html
```

These pages are lightweight shells. They must not contain independent copies of the application logic.

They share:

```text
/src/core/
/src/engine/
/src/player/
/src/assets/
/src/shots/
/src/timeline/
/src/ui/
/src/presets/
/src/storage/
/src/glossary/
```

This architecture provides the mental clarity of separate tools while preserving one application and one workflow.

## 3.2 Static-first technical direction

The first rebuild should remain deployable as a static application on Vercel.

Recommended baseline:

- semantic HTML;
- modern CSS;
- JavaScript ES modules;
- Three.js;
- GLTFLoader and DRACOLoader;
- RGBELoader;
- IndexedDB for project media and project state;
- BroadcastChannel for synchronization between workspace pages;
- MediaRecorder for browser playblast capture where supported;
- no framework dependency unless the vanilla module architecture becomes a measurable limitation.

## 3.3 Shared services

### Project Store

The single canonical project state.

### Command Bus

Every meaningful user action is an explicit command.

### History Service

Undo and redo at command level. Continuous gestures create a single history entry.

### Renderer Service

Owns the Three.js renderer, scenes, cameras, lights, post-processing and GPU lifecycle.

### Asset Service

Loads, validates, calibrates, stores, relinks and removes GLB, GLTF, HDRI, image and audio assets.

### Shot Service

Creates, resolves, duplicates, presets, locks and evaluates shots.

### Timeline Service

Owns clip timing, tracks, selection, trim, blade, snapping, markers and playback scheduling.

### Playback Service

Provides a common time source for a single shot and the complete project sequence.

### Migration Service

Imports supported historical VisualRef projects and normalizes them into the new schema.

---

# 4. Canonical project state database

## 4.1 Root state

```text
ProjectState
├── schema
│   ├── name
│   ├── version
│   └── migratedFrom
├── meta
│   ├── id
│   ├── name
│   ├── createdAt
│   ├── updatedAt
│   └── language
├── settings
│   ├── aspectRatio
│   ├── fps
│   ├── resolution
│   ├── playbackQuality
│   └── performanceTier
├── assets
│   ├── heroId
│   ├── environmentId
│   ├── hdriId
│   ├── secondaryIds[]
│   ├── audioIds[]
│   └── byId{}
├── scene
│   ├── nodes{}
│   ├── activeCameraId
│   ├── activeLightRigId
│   ├── environment
│   └── rendererSettings
├── shots
│   ├── order[]
│   ├── activeShotId
│   └── byId{}
├── timeline
│   ├── durationFrames
│   ├── playheadFrame
│   ├── loop
│   ├── selectedClipIds[]
│   ├── markers[]
│   ├── tracks{}
│   └── clips{}
├── glossary
│   └── preferences
└── ui
    ├── activeWorkspace
    ├── advanced
    ├── panels
    ├── splitters
    └── mobileMode
```

## 4.2 State ownership rules

- Asset files belong to the project asset database.
- Asset transforms belong to scene nodes.
- Shot Start and End states belong to the Shot database.
- Delta is derived from Start and End, but stores user constraints and intent.
- Timeline clips reference Shot IDs; they do not duplicate the entire Shot state.
- Clip timing belongs to the Timeline.
- Workspace layout belongs to UI state and must not affect creative output.
- History is session state and is not required inside exported project JSON.

## 4.3 Persistence

### IndexedDB

Stores:

- project state snapshots;
- GLB and GLTF blobs;
- HDRI files;
- audio files;
- image references and thumbnails;
- cached asset analysis;
- generated shot thumbnails.

### Local storage

Stores only lightweight preferences:

- last opened project;
- interface language;
- last workspace;
- panel sizes;
- mobile onboarding state.

### Broadcast synchronization

`render.html`, `viewport.html` and `timeline.html` communicate through `BroadcastChannel`.

A change made in one workspace should update another open workspace immediately without a reload.

## 4.4 Autosave

Autosave occurs after every completed command, not every pointer movement.

A drag follows:

```text
beginGesture
→ transient updates
→ endGesture
→ one command commit
→ one history entry
→ one autosave
```

---

# 5. Shared global navigation

## 5.1 Desktop header order

```text
MEMENTO logo
|
RENDER · VIEWPORT · TIMELINE
|
UNDO · REDO · PROJECT · IT/EN · ADVANCED · FULLSCREEN
```

Rules:

- The three workspace tabs are mathematically centered in the viewport.
- The Memento logo uses the SVG path only.
- Undo and Redo always refer to the same project history.
- Project opens one shared project and asset sheet.
- Advanced is contextual and persistent across workspaces.
- Fullscreen expands the current Player, not the complete editor UI.
- Copy and Paste are not primary global navigation actions.

## 5.2 Mobile header

The mobile header contains:

```text
MEMENTO logo · Project name · Project menu
```

Workspace navigation moves to a bottom dock:

```text
SHOT · VIEW · TIME
```

The language, advanced mode, import/export and project settings live in the Project sheet.

## 5.3 Glossary access

Glossary is accessible through:

- the Project sheet;
- contextual help on a control;
- a keyboard shortcut on desktop.

It must not occupy one of the three primary navigation positions.

---

# 6. Shared Shot Player

## 6.1 Role

The Shot Player is one reusable component used in:

- Render as the primary shot authoring monitor;
- Viewport as the scene manipulation surface;
- Timeline as the sequence or selected-shot monitor;
- mobile as the main product experience.

Its rendering engine, aspect-ratio gate, timing and transport behavior must be identical across all appearances.

## 6.2 Player anatomy

```text
PLAYER STATUS BAR
3D RENDER SURFACE
CONTEXT TOOLBAR, only when required
PRIMARY TRANSPORT
SECONDARY TRANSPORT / SHOT CONTROLS
```

## 6.3 Status bar

Left:

- current workspace;
- renderer state;
- selected shot or selected asset.

Center:

- timecode or current frame;
- project playback mode.

Right:

- aspect ratio;
- FPS;
- quality/performance status.

The status bar must stay visually quiet.

## 6.4 Render surface rules

- It must never start as a blank black failure state.
- A calibrated proxy is shown until a Hero loads.
- After a real Hero loads, the proxy is removed completely.
- The project aspect-ratio gate is always visible as the true output frame.
- Outside the gate is dimmed, not cropped unpredictably.
- Center click or tap toggles Play/Pause when no transform tool is active.
- No flash, UI rollback or previous-frame exposure during generation.
- Resize must preserve camera framing and render resolution.
- Context loss must show a clear recovery state rather than a black player.

## 6.5 Primary transport order

From left to right:

```text
LOOP
PLAY / PAUSE
START
END
SHOT SCRUB
CURRENT FRAME
DELTA
```

Behavior:

- Loop is active by default.
- Start jumps to and displays the exact Start state.
- End jumps to and displays the exact End state.
- Shot Scrub interpolates continuously from Start to End.
- Current Frame is frame-authoritative.
- Delta displays the amount of meaningful change between Start and End.

Color grammar:

- Start: teal.
- End: orange `#ff7950`.
- Controls affecting both: white.
- Disabled or non-applicable controls: neutral gray.

## 6.6 Secondary transport order

```text
SECONDS
FPS
ASPECT RATIO
GENERATE VARIANT
VARIANT NUMBER
ADD TO TIMELINE
```

Notes:

- Generate Variant is prominent but does not visually dominate Play.
- The variant number identifies the deterministic generation seed/iteration.
- Add to Timeline creates a linked timeline clip from the active Shot.
- When editing an existing linked Shot, the final action becomes `UPDATE SHOT`.

## 6.7 Player modes

### Shot mode

Plays and scrubs the active Shot Start-to-End interpolation.

### Viewport mode

Directly displays the current scene state and enables scene navigation/manipulation.

### Sequence mode

Plays the complete Timeline using one frame clock.

### Focus mode

Shows only:

- the render surface;
- the essential transport;
- an exit control.

---

# 7. Render workspace — Shot creation

## 7.1 Purpose

Render is where a creative defines **what the shot is and how it moves**.

It combines the proven V36C Shot Player and Start/End editor into one clean workspace.

## 7.2 Desktop layout

```text
┌──────────────────────────────┬──────────┬────────────────────────┐
│                              │ SPLITTER │                        │
│        SHARED PLAYER         │          │      SHOT EDITOR       │
│                              │          │                        │
└──────────────────────────────┴──────────┴────────────────────────┘
```

Default ratio:

- Player: 60%.
- Editor: 40%.
- User-adjustable splitter.
- Minimum widths prevent either side becoming unusable.

## 7.3 Simple-mode hierarchy

The editor must follow this order:

```text
1. ACTIVE SHOT + PROJECT ASSET SUMMARY
2. SHOT FAMILY
3. FAMILY PRESETS
4. GENERATE / RESET
5. START · BOTH · END SCOPE
6. DELTA SUMMARY
7. ACTIVE CREATIVE CONTROLS
8. ADD / UPDATE SHOT
```

The user should not begin with an enormous technical matrix.

## 7.4 Shot families

The canonical curated families are:

1. **Hero** — iconic, premium, product-led framing.
2. **Reveal** — progressive discovery through light, camera, object or environment.
3. **Motion** — orbit, truck, crane, spin, parallax and dynamic subject motion.
4. **Detail** — macro, material, edge, logo and feature emphasis.
5. **Tech** — exploded views, scan language, data layers and engineered presentation.
6. **Graphic** — patterns, stacks, clones, typography space and motion-design framing.
7. **Closing** — resolve, hold, logo, lineup and final product statement.

Each family should launch with **three to five highly intentional presets**, not a large experimental library.

## 7.5 Preset behavior

A preset is a coherent cinematic recipe. It may set:

- Start and End axis values;
- camera framing and movement;
- lens and focus;
- Hero transform and rotation;
- composition;
- environment;
- light rig;
- atmosphere;
- reveal pattern;
- duration recommendation;
- easing recommendation;
- mobile performance fallback.

Preset application must be:

- capability-aware;
- deterministic;
- reversible;
- lock-aware;
- safe for the current Hero bounds;
- explicit about changed values.

## 7.6 Variant generation

Generate Variant creates a new valid interpretation inside the current family and preset intent.

It must:

- preserve locked axes;
- preserve the selected Hero and asset world;
- respect the Delta target;
- avoid impossible camera/subject intersections;
- use a stored seed and iteration;
- produce one undo step;
- never briefly reveal an older UI state;
- never reload the renderer.

Generation modes for release one:

- **Near** — small controlled variation.
- **Balanced** — default variation.
- **Bold** — larger but compatible variation.

These may live behind a compact control rather than three permanent buttons.

## 7.7 Start, Both and End scope

The scope selector is always visible when manual editing is active.

```text
START · BOTH · END
```

- Start edits only the Start state.
- End edits only the End state.
- Both edits Start and End simultaneously.
- Mixed values are visually indicated.
- Both must be truly linked; it must not update only one half of a parameter.

## 7.8 Canonical creative axes

V36C’s eleven-axis grammar remains the creative foundation:

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

These axes should be regrouped visually so they are easier to understand:

### Frame

- Camera
- Lens
- Focus
- Composition
- View

### Subject

- Scale
- Rotation
- Motion Design

### World

- Light
- Environment
- Atmosphere

The underlying axes remain independent in state.

## 7.9 Delta control

Delta is the controlled difference between Start and End.

The UI includes:

- total Delta score;
- number of changed axes;
- compact changed-axis chips;
- editable Delta target;
- risk indicator when a variation is too aggressive for stable generation/playback.

Delta must not be a decorative number. It influences variant generation and preset resolution.

## 7.10 Advanced mode

Advanced mode opens contextual properties for the currently selected control.

Examples:

- Selecting Camera exposes position, target, FOV, near/far and movement easing.
- Selecting Subject Scale exposes numeric Start/End values, axis constraints and safety limits.
- Selecting Environment exposes HDRI contribution, background visibility, environment GLB transform and shadow policy.
- Selecting Motion exposes duration, easing, loop, phase and amplitude.

Advanced mode must not duplicate the entire Simple UI.

---

# 8. Asset and scene workflow

## 8.1 Asset classes

Release one supports:

- one primary Hero GLB/GLTF;
- one Environment GLB/GLTF;
- up to eight secondary GLB/GLTF assets;
- one HDRI;
- image references for timeline/graphics;
- audio files for A1 and A2.

## 8.2 Hero import

After import, VisualRef performs:

1. file validation;
2. loader and decoder selection;
3. mesh and material inspection;
4. animation discovery;
5. bounds calculation;
6. default orientation analysis;
7. ground estimation;
8. camera fit;
9. thumbnail generation;
10. persistence to IndexedDB.

The Hero must not be permanently modified just to fit the viewport. Calibration values are stored separately.

## 8.3 Transform model

Every 3D scene node supports:

```text
Position X Y Z
Rotation X Y Z
Scale X Y Z
Uniform Scale
Pivot Offset X Y Z
Ground Offset
Forward Axis
Up Axis
Visibility
Lock Transform
```

## 8.4 Environment model

The environment may combine:

- Environment GLB;
- HDRI lighting;
- HDRI visible background toggle;
- procedural fallback world;
- floor/contact shadow;
- atmosphere layer.

An Environment GLB is a real scene node and has complete transform controls.

## 8.5 Asset access

Asset controls are available from:

- the global Project sheet;
- Render’s compact asset summary;
- Viewport’s Outliner;
- mobile’s Upload/World sheet.

There must be one asset database, not separate uploads per workspace.

---

# 9. Viewport workspace — scene control

## 9.1 Purpose

Viewport is where the user fixes or deliberately overrides the physical scene.

It must feel simpler than a DCC package while solving the real problems that presets cannot solve automatically:

- bad pivot;
- wrong scale;
- wrong orientation;
- poor placement;
- environment alignment;
- camera collision;
- light and HDRI adjustment.

## 9.2 Desktop layout

```text
┌──────────────────────────────┬──────────┬──────────────────┬──────────────┐
│                              │ SPLITTER │                  │              │
│        SHARED PLAYER         │          │    INSPECTOR     │   OUTLINER   │
│        VIEWPORT MODE         │          │                  │              │
└──────────────────────────────┴──────────┴──────────────────┴──────────────┘
```

The Inspector and Outliner may collapse into one right column on narrower screens.

## 9.3 Pointer grammar

Desktop:

- Left mouse: orbit/select depending on active tool.
- Right or middle mouse: pan.
- Wheel: zoom/dolly.
- `F`: frame selected.
- `W`: move.
- `E`: rotate.
- `R`: scale.
- `P`: pivot mode.

Mobile/tablet:

- one finger: orbit or manipulate active gizmo;
- two fingers: pan;
- pinch: zoom;
- long press: select/context;
- transform tool chosen from the bottom toolbar.

## 9.4 Viewport toolbar order

```text
SELECT
MOVE
ROTATE
SCALE
PIVOT
FRAME
GROUND
RESET
```

The selected asset name and active coordinate mode appear after the tools.

## 9.5 Outliner order

```text
HERO
HERO VARIANTS
SECONDARY ASSETS
ENVIRONMENT GLB
CAMERAS
LIGHTS
HDRI
ATMOSPHERE
```

Each item shows:

- type icon;
- name;
- visibility;
- lock;
- selection state;
- warning state when unresolved or missing.

## 9.6 Inspector order

For a selected 3D asset:

```text
IDENTITY
TRANSFORM
PIVOT & CALIBRATION
MATERIAL SUMMARY
ANIMATION
VISIBILITY & LOCKS
DIAGNOSTICS
```

For HDRI:

```text
FILE
ROTATION
INTENSITY
BACKGROUND VISIBILITY
BACKGROUND BLUR
EXPOSURE CONTRIBUTION
RESET
```

For Camera:

```text
TRANSFORM
TARGET
LENS
FOCUS
CLIPPING
SAFE FRAME
RESET
```

## 9.7 Shot relationship

Viewport modifications affect the project scene baseline unless the user explicitly enters `Edit Shot State`.

When editing a Shot state, the UI clearly shows:

```text
EDITING: SHOT 04 · END
```

This prevents accidental confusion between global asset calibration and shot-specific animation.

---

# 10. Timeline workspace — sequence creation

## 10.1 Purpose

Timeline converts individual shots into the final product outcome: a complete playable sequence.

It should borrow the clarity of an editing timeline without becoming a full nonlinear editor.

## 10.2 Desktop layout

```text
┌────────────────────────────┬──────────┬───────────────────────────────────┐
│                            │ SPLITTER │                                   │
│       SHARED PLAYER        │          │             TIMELINE              │
│      SEQUENCE / SHOT       │          │                                   │
└────────────────────────────┴──────────┴───────────────────────────────────┘
```

The left Player can switch between:

- complete sequence;
- selected shot;
- selected asset viewport.

## 10.3 Track order

Top to bottom:

```text
GFX / FX
V3
V2
V1
A1
A2
```

### GFX / FX

Titles, graphic overlays, transition effects and visual accents.

### V1–V3

Shot clips and visual reference clips. V1 is the primary story track.

### A1–A2

Music, sound design, voice or reference audio.

## 10.4 Clip model

A Shot clip contains:

```text
clipId
shotId
trackId
startFrame
endFrame
sourceInFrame
sourceOutFrame
playbackRate
blendInFrames
blendOutFrames
linked: true
```

The clip references a Shot. It does not duplicate the Shot recipe.

Rules:

- Editing the source Shot updates every linked clip.
- `Make Unique` creates a new Shot and redirects only the selected clip.
- Duplicating a clip keeps the Shot linked by default.
- `Duplicate as New Shot` is an explicit alternative.

## 10.5 Timeline core behavior

Release one must support:

- frame-authoritative playhead;
- sequence play/pause;
- loop range;
- horizontal pan;
- zoom;
- clip selection;
- multi-selection;
- drag clip in time;
- move clip between compatible tracks;
- trim Start and End;
- blade/split;
- snapping to playhead, clips and markers;
- markers;
- delete;
- duplicate;
- Make Unique;
- non-ripple editing by default;
- negative pre-roll of at least ten frames;
- visible add-space after the final clip;
- real audio waveform;
- shot thumbnails;
- mobile touch panning that never moves the playhead accidentally.

## 10.6 Timeline toolbar order

```text
SELECT
BLADE
SNAP
MARKER
UNDO
REDO
ZOOM
FIT
LIBRARY
```

Transport remains inside the shared Player and is not duplicated above the timeline.

## 10.7 Timeline library

The Library contains:

```text
SHOTS
GFX / FX
AUDIO
REFERENCES
```

The default view prioritizes existing project Shots.

A Shot can be:

- dragged to V1–V3;
- opened in Render;
- opened in Viewport;
- duplicated;
- deleted when unused;
- inserted at the playhead.

## 10.8 Sequence presets

Sequence presets are editorial structures, not decorative templates.

Initial curated structures:

- Product Reveal
- Hero Launch
- Feature Breakdown
- Motion Montage
- Premium Loop
- Social Short

A sequence preset creates track structure and placeholder Shot roles. It does not silently replace existing work without confirmation.

---

# 11. Playblast system

## 11.1 Definition of success

A complete sequence playblast includes:

- all active visual tracks;
- Start-to-End shot playback;
- clip timing;
- basic blends/transitions;
- GFX/FX overlays supported by release one;
- A1/A2 playback;
- selected aspect ratio;
- selected FPS.

## 11.2 Release-one output

Release one provides:

1. real-time fullscreen sequence preview;
2. browser-recorded WebM playblast where MediaRecorder is supported;
3. project JSON export for continued work and backup;
4. a clean fallback message when the browser cannot record the desired format.

MP4 encoding is a later export service unless a reliable local browser pipeline is added without destabilizing performance.

## 11.3 Playblast controls

```text
PREVIEW
RECORD PLAYBLAST
STOP
DOWNLOAD WEBM
```

Settings:

- aspect ratio;
- FPS;
- resolution tier;
- include audio;
- loop or one pass;
- clean output or UI reference overlay.

---

# 12. Mobile experience

## 12.1 Mobile product promise

> Upload a product, choose a world, swipe through cinematic shot presets and build a short playable sequence.

## 12.2 Mobile creation path

```text
NEW PROJECT
→ UPLOAD HERO GLB
→ AUTO FIT & CALIBRATE
→ CHOOSE WORLD
→ CHOOSE SHOT PRESET
→ SWIPE VARIANTS
→ PLAY / SCRUB
→ ADD TO SEQUENCE
→ REPEAT
→ PLAYBLAST
```

## 12.3 Mobile capability

Mobile release one supports:

- Hero GLB upload;
- curated built-in Hero examples;
- curated Environment GLBs;
- HDRI selection and upload;
- a small secondary asset library;
- ready-made shot presets;
- Generate Variant;
- Start/End scrub;
- simplified position, rotation and scale controls;
- basic viewport orbit/pan/zoom;
- adding Shots to a simplified timeline;
- reordering and trimming clips;
- sequence playback;
- playblast where device/browser capability allows.

## 12.4 Mobile limitations by design

The following may be desktop/tablet-only in release one:

- complete pivot matrix editing;
- full material inspection;
- complex multi-selection;
- large secondary-asset scenes;
- heavy post-processing;
- high-resolution recording;
- deep diagnostics.

## 12.5 Mobile layout

### Shot

- full-width Player;
- persistent compact transport;
- horizontal family and preset rails;
- bottom sheet for Start/End and transforms.

### View

- full-screen Viewport;
- bottom transform toolbar;
- selected asset sheet.

### Time

- compact Player at top;
- horizontally scrollable timeline;
- large touch targets;
- clip inspector bottom sheet.

## 12.6 Performance adaptation

Mobile uses automatic performance tiers based on:

- GPU capability;
- device memory where available;
- screen resolution;
- scene complexity;
- frame-time measurement.

Possible degradations:

- reduced pixel ratio;
- lower HDRI resolution;
- disabled expensive post-processing;
- reduced secondary asset count;
- simplified particles;
- lower thumbnail refresh frequency.

These changes must preserve the creative result rather than arbitrarily changing the composition.

---

# 13. Visual and graphic system

## 13.1 Direction

The final visual language is a cleaned, professional continuation of V36C.

It should feel:

- dark;
- cinematic;
- minimal;
- technical without looking industrial;
- premium without ornamental effects;
- compact but breathable;
- confident rather than overly rounded or app-like.

## 13.2 Color grammar

```text
Background: near black
Primary text: soft white
Secondary text: cool gray
Start: teal
End / Memento accent: #ff7950
Both / linked: white
Timeline video: controlled blue
Timeline GFX/FX: warm yellow
Timeline audio: green
Warnings: amber
Errors: muted red
```

## 13.3 Typography

- Inter as the primary UI font.
- Labels use restrained uppercase and letter spacing.
- Values use tabular numerals.
- Titles remain readable and do not use excessive tracking.
- Minimum readable mobile font sizes are enforced.

## 13.4 Shape language

- Mostly flat panels and lines.
- Small radii only where they improve touch clarity.
- No nested stacks of rounded cards.
- No glassmorphism as a primary visual language.
- Glow is reserved for state, focus and the orange brand accent.

## 13.5 Motion language

- UI transitions are fast and understated.
- Player generation never flashes.
- Panels move only when the spatial change is meaningful.
- Sliders and scrubbing respond immediately.
- Mobile sheets use momentum and natural spring limits.
- Reduced-motion preferences are respected.

---

# 14. Glossary

## 14.1 Purpose

The Glossary explains cinematic and technical concepts without interfering with creation.

It preserves the educational value of the earlier application while removing DEF from the main navigation.

## 14.2 Access model

- Searchable standalone view.
- Contextual `?` from controls.
- Deep links from Camera, Lens, Focus, Light, Composition, Motion and Timeline terminology.

## 14.3 Content relationship

Glossary entries may reference a live control and offer:

- definition;
- visual example;
- what it changes;
- when to use it;
- generation risk;
- related presets.

Glossary content never modifies the project without an explicit `Apply example` action.

---

# 15. Removed and deferred systems

## 15.1 Permanently removed from the main product

- TEST workspace;
- BANCO workspace;
- DEF as primary navigation;
- old technical matrix pages;
- PDF shot-list export;
- text breakdown export;
- generic demo content;
- experimental or duplicate preset pools;
- multiple competing Player implementations;
- duplicated project stores;
- separate Shot and Timeline copies of the same state.

## 15.2 Deferred after release one

- final-quality offline rendering;
- MP4/H.264 server encoding;
- cloud collaboration;
- real-time multi-user editing;
- AI-generated 3D geometry;
- full material node editing;
- compositing-grade GFX system;
- professional color-management pipeline;
- plugin integrations with Blender, Unreal or Resolve.

---

# 16. Rebuild phases

## Phase 0 — Freeze and extract

- Freeze V36C unchanged.
- Create a behavioral checklist from its sacred systems.
- Extract axis, preset and project schema data.
- Identify V36C acceptance hooks and renderer safety logic.
- Capture desktop, tablet and mobile reference recordings.

**Gate:** The team can describe exactly what must survive before writing the new interface.

## Phase 1 — Shared core and Player

- Create three entry pages.
- Create Project Store, Command Bus, History and persistence.
- Create one shared Player shell.
- Restore the V36C Player grammar with a proxy scene.
- Implement Start, End, Both, scrub, Delta, loop and frame timing.
- Implement BroadcastChannel synchronization.

**Gate:** The same Shot plays identically in Render, Viewport and Timeline pages.

## Phase 2 — Real assets and Viewport

- Add Three.js renderer service.
- Add Hero GLB/GLTF import.
- Add Environment GLB/GLTF import.
- Add secondary assets.
- Add HDRI.
- Add calibration, transforms and pivot control.
- Add Outliner and Inspector.
- Add renderer recovery and diagnostics.

**Gate:** A user can upload a real Hero and Environment, fix their transforms and reopen the project without losing them.

## Phase 3 — Shot editor and preset engine

- Normalize the eleven V36C axes.
- Implement Shot families.
- Implement curated presets.
- Implement Start/End/Both editor.
- Implement Delta target and risk.
- Implement deterministic Near/Balanced/Bold generation.
- Implement Shot thumbnails and Add/Update Shot.

**Gate:** A user can create multiple coherent, reproducible Shots using real assets.

## Phase 4 — Timeline and sequence playback

- Build six-track timeline.
- Add linked Shot clips.
- Add trim, move, blade, snap, markers and negative pre-roll.
- Add real audio and waveform.
- Add complete sequence playback through the shared Player.
- Add sequence presets.

**Gate:** A multi-shot sequence remains frame-accurate after reload, undo and workspace switching.

## Phase 5 — Playblast

- Add clean fullscreen preview.
- Add WebM recording.
- Add audio capture.
- Add output settings and capability fallback.

**Gate:** The user can download a playable representation of the complete sequence.

## Phase 6 — Mobile product

- Build Shot/View/Time mobile dock.
- Add mobile GLB/HDRI upload.
- Add curated starter asset library.
- Add swipe presets and bottom-sheet controls.
- Add touch-safe timeline editing.
- Add mobile performance adaptation.

**Gate:** A first-time mobile user can create and play a short sequence without instructions.

## Phase 7 — Migration, Glossary and hardening

- Import V36C project data where technically recoverable.
- Import V42 projects where technically recoverable.
- Restore Glossary as a secondary product surface.
- Add automated behavioral and visual tests.
- Run device and browser compatibility QA.

**Gate:** Historical projects either migrate correctly or report exactly what cannot be recovered.

---

# 17. Acceptance criteria

## 17.1 Shared state

- A Hero uploaded in Viewport appears in Render and Timeline immediately.
- A Shot edited in Render updates every linked Timeline clip.
- A Timeline trim does not change the source Shot.
- Reload restores assets, Shots, Timeline and UI preferences.

## 17.2 Player

- The Player never starts as an unexplained black screen.
- Click/tap center toggles playback when appropriate.
- Loop defaults to active.
- Start and End always display exact stored states.
- The scrub is smooth and deterministic.
- Fullscreen works in every workspace.
- Resize does not break framing.

## 17.3 Shot editor

- Both updates both states.
- Locks survive generation.
- Generate Variant produces one history entry.
- Reset is undoable.
- Preset application reports changed axes.
- Delta target materially affects generation.

## 17.4 Real assets

- Hero GLB imports and renders with its materials.
- Environment GLB imports and renders.
- Position, scale, rotation and pivot persist.
- HDRI can light the scene with background shown or hidden.
- Missing assets display relink controls.

## 17.5 Timeline

- Track order is fixed and correct.
- Clips can move, trim and split without ripple.
- Touch pan never moves the playhead.
- Negative pre-roll is usable.
- Selected clips are visually obvious.
- Waveforms reflect real decoded audio.
- Playback uses one project clock.

## 17.6 Mobile

- Core touch targets are at least 44 CSS pixels where practical.
- Horizontal rails do not trap vertical page movement.
- The Player remains dominant.
- Upload, preset selection, generation and Add to Sequence are possible without desktop mode.
- Performance degradation is graceful and visible.

## 17.7 Playblast

- Project audio and visuals remain synchronized.
- Output length matches the Timeline.
- Output aspect ratio matches project settings.
- The clean output contains no editor UI.

---

# 18. First implementation checkpoint

The first new file set should not attempt to rebuild the whole product.

It should prove the architecture with:

```text
render.html
viewport.html
timeline.html

shared Project Store
shared Command Bus
shared History
shared IndexedDB persistence
shared Player
shared proxy scene
Start / Both / End state
shot scrub
Delta value
workspace synchronization
responsive desktop and mobile shells
```

No preset library, timeline clip editing or real GLB import should be added until the shared state and Player pass this checkpoint.

The second checkpoint adds real Hero and Environment import plus transforms.

This order prevents the project from repeating the V37–V42 failure mode: rebuilding the visible interface before proving that one real engine and one real state are shared by every workspace.

---

# 19. Canonical summary

VisualRef V43 will be rebuilt as:

> **One cinematic previsualization application with three focused workspaces, one real-time 3D engine, one Player, one project database and one linked path from uploaded object to complete sequence playblast.**

V36C supplies the behavioral and visual DNA. The rebuild supplies the missing architecture.

The priority is not to make V36C look newer. The priority is to preserve what worked, remove what diluted the workflow and make the entire product understandable as one system.
