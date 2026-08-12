# MEMENTO VisualRef V47 — Product Goal and Development Roadmap

## 1. V47 product goal

V47 must transform VisualRef from a capable technical prototype into a coherent **world-first cinematic builder**.

A new user should be able to import a product, establish its world, generate intentional shot variants and assemble a short sequence without understanding professional 3D, cinematography or editing terminology.

A professional user should still be able to override scale, pivot, camera, light, motion, timing and sequence structure without leaving the same interface.

The target experience is:

> **Child-proof at first contact. Professionally controllable when opened deeper.**

## 2. Product promise

VisualRef V47 helps the user answer four questions in order:

1. **What is the hero?**
2. **What world does it live in?**
3. **How should it be filmed?**
4. **How do the shots become a sequence?**

The application must never make the user solve renderer architecture, scene ownership or timeline plumbing before answering those creative questions.

## 3. Non-negotiable product principles

### 3.1 One world

Viewport, Render and Timeline must reference the same scene, assets, cameras, lights and normalization data.

No workspace may create a second hidden version of the hero or environment.

### 3.2 One owner per control

Every visible parameter must have one clear authority.

Examples:

- Subject Rotation owns final hero orientation.
- View owns camera relationship, not hero rotation.
- Environment Scale owns world-to-hero proportion.
- Timeline owns clip placement, not shot definition.
- Shot definition owns Start and End values, not the timeline clip.

### 3.3 Real asset first

No temporary proxy is shown as the user's product.

Loading, validation and error states must be designed states rather than accidental frames.

### 3.4 Progressive disclosure

The default interface shows only the decisions required for the current step.

Advanced controls expand the same concept; they must not introduce an unrelated second editor.

### 3.5 Visible state

The user must be able to see:

- what is selected;
- what Start contains;
- what End contains;
- what is locked;
- what random generation can change;
- what clip is linked to what shot;
- what asset or audio file is missing.

No important state can exist only inside a closed accordion, hover tooltip or developer console.

## 4. V47 architecture objective

V47 should absorb the V46 overlay into the native repository and introduce a formal V47 schema.

### Required architectural work

- Create schema version 47 with explicit migrations from V43, V44, V45 and the V46-compatible state.
- Move V46 navigation, guide, viewport tabs, rotation ownership and timeline creation controls into native workspace classes.
- Remove runtime DOM patching once native implementations reach parity.
- Preserve one Store, one Command Bus, one History Service, one Renderer Service and one Persistence Service.
- Add invariants that reject multiple writers for the same semantic control.
- Add a documented asset lifecycle: selected → reading → validating → normalizing → GPU loading → ready → missing/error.
- Add deterministic project serialization for imported assets, semantic settings and timeline links.

## 5. Workstream A — Native World Builder

### Goal

Viewport becomes a focused World Builder rather than a generic scene inspector.

### Required features

#### Hero setup

- GLB/GLTF import with designed progress and validation.
- Automatic bounds, unit and ground analysis.
- Explicit physical reference dimension.
- Pivot correction that does not destructively modify source geometry.
- Ground contact and shadow receiver controls.
- Front, rear, left, right, top and bottom orientation registration.
- Hero variants as related assets, not unrelated scene nodes.
- Material and backface diagnostics.

#### World setup

- Environment GLB import.
- HDRI import with rotation, exposure, blur and visibility controls.
- Hero-to-world proportion control using semantic scale rather than arbitrary scene units.
- Environment origin and ground calibration.
- Stage, showroom, racetrack, studio and void world recipes.
- Optional dollhouse or cutaway visibility for enclosed environments.
- Simple collision or safe-volume data for camera generation.

#### Scene hierarchy

The Outliner should become a semantic World Stack:

- Hero
- Hero Variants
- Environment
- Props
- Lights
- Cameras
- Graphics
- Audio references

Each item must expose a clean status: Ready, Hidden, Missing, Loading, Warning or Error.

### Acceptance criteria

- A new user can import and ground a GLB in under one minute.
- No technical proxy is visible.
- Hero scale remains stable when the environment changes.
- Environment scale remains stable when the hero variant changes.
- A wrong pivot can be corrected and saved.
- HDRI controls produce immediate visual feedback.
- Front/side/top camera commands frame the real asset reliably.

## 6. Workstream B — Camera and shot grammar

### Goal

Separate **camera relationship**, **hero orientation** and **motion intent** so each remains understandable and controllable.

### Required model

#### Camera relationship

- azimuth;
- elevation;
- distance;
- focal length;
- sensor/aspect relationship;
- target point;
- framing margin;
- camera roll;
- focus target and depth of field.

#### Hero orientation

- X, Y and Z rotation;
- registered product front;
- pivot mode;
- orientation preset;
- optional turntable motion.

#### Motion intent

- camera motion;
- hero motion;
- environment motion;
- graphic or FX motion;
- easing and phase.

These categories may coordinate through a preset, but one category may not silently overwrite another.

### Shot interaction goal

The default shot editor should present a persistent matrix:

| Category | Start | End | Lock | Generation pool |
|---|---|---|---|---|
| Hero | visible value | visible value | status | allowed choices |
| Camera | visible value | visible value | status | allowed choices |
| Composition | visible value | visible value | status | allowed choices |
| Lens/Focus | visible value | visible value | status | allowed choices |
| Light | visible value | visible value | status | allowed choices |
| World | visible value | visible value | status | allowed choices |
| Motion | visible value | visible value | status | allowed choices |
| Image | visible value | visible value | status | allowed choices |
| Timing | duration | delta | status | range |

The detailed option chips open contextually beneath the selected row, but the matrix remains visible.

### Acceptance criteria

- Equal Start and End values produce no hidden transform difference.
- Every randomized value is visible after generation.
- Delta produces measurably different Near, Balanced and Bold results.
- A locked category never changes during generation.
- Excluded options never appear.
- Precision remains open during continuous edits.
- Undo and Redo treat one user action as one history step.

## 7. Workstream C — Guided cinematic creation

### Goal

Give non-professional users a creative path without forcing a wizard.

### Guided modes

#### Quick Start

- Import Hero
- Select World Recipe
- Select Shot Family
- Generate Three Variants
- Add Preferred Variant to Sequence

#### World First

- Import Hero
- Calibrate
- Build Environment
- Configure Light
- Continue to Render

#### Sequence First

- Select a sequence recipe
- Generate missing shots
- Replace generated shots with preferred variants
- Add music and export preview

The guide must be collapsible and resumable. The current step should be visible without blocking free editing.

### Acceptance criteria

- The user may skip any guide step.
- Closing the guide never disables functionality.
- Returning to a project restores progress accurately.
- Completed steps are derived from project state, not a fragile checklist flag.

## 8. Workstream D — Render generation system

### Goal

Turn random generation into a controllable creative assistant.

### Required features

- Persistent Delta control in player and editor.
- Near, Balanced and Bold generation profiles with documented behavior.
- Per-category lock.
- Per-option exclusion.
- Per-category generation probability.
- Seeded generation for reproducibility.
- Compare Current, Previous and Candidate.
- Accept Candidate or Regenerate without destroying the current shot.
- Variant history and naming.
- Variant thumbnails generated only from real assets.
- Batch generation with a clear queue and cancel action.

### Acceptance criteria

- Reusing the same seed reproduces the same candidate.
- The current shot remains intact until a candidate is accepted.
- Candidate generation never changes locked categories.
- Every candidate reports what changed.
- Variant history can be reopened after navigating to Timeline and back.

## 9. Workstream E — Timeline as sequence composer

### Goal

Timeline must support both direct editing and guided shot creation.

### Required creation controls

- Add Active Shot to V1, V2 or V3.
- Generate Variant from Timeline.
- Generate a Missing Shot from a sequence recipe.
- Duplicate a shot as linked or unique.
- Replace a clip with another variant.
- Create FX, Text and Graphic clips.
- Import one or more audio files.
- Record or import voice-over.

### Required editing controls

- three video tracks;
- two audio tracks;
- future FX/Text tracks;
- move, trim, blade, slip and ripple modes;
- one-frame snapping;
- negative pre-roll buffer;
- clip selection and multi-selection;
- waveform and audio scrubbing;
- track mute, solo, lock and visibility;
- markers and notes;
- loop range;
- linked-shot update warning;
- sequence recipes;
- playblast export.

### Variant Bin

V47 should add a Variant Bin adjacent to the timeline:

- shot families grouped by purpose;
- thumbnail, duration and Delta summary;
- linked/unique status;
- drag to track;
- replace selected clip;
- generate more variants in place.

### Audio workflow

- visible import action at all times;
- decoded waveform progress;
- missing-audio recovery;
- volume, fade in, fade out and offset;
- beat markers or manual beat tap;
- playback synchronized to negative pre-roll and loop range.

### Acceptance criteria

- An empty sequence clearly explains how to add the first clip.
- A user can generate, add and replace a variant without leaving Timeline.
- Audio import produces a visible waveform and synchronized playback.
- Timeline panning never moves the playhead unintentionally.
- Clip editing remains usable on desktop and touch devices.

## 10. Workstream F — Loading, performance and trust

### Goal

The application must feel stable before it becomes visually complex.

### Required work

- Designed boot state with no accidental intermediate UI.
- Asset loading queue with real progress states.
- No proxy flash.
- No black player start unless the shot intentionally starts black.
- Progressive texture and geometry upload.
- GPU memory budget and warning.
- Renderer fallback presented as a diagnostic mode, not a silent downgrade.
- Backface and non-manifold material diagnostics.
- Missing file recovery for GLB, HDRI and audio.
- Autosave status and last-saved timestamp.
- Crash-safe project recovery.

### Performance targets

- UI interaction should remain responsive while an asset is decoding.
- Player controls should react within one animation frame under normal load.
- Timeline pan and trim should sustain smooth interaction on supported desktop hardware.
- Mobile should degrade visual quality before degrading control responsiveness.

## 11. Workstream G — Global interface system

### Goal

Create one visual grammar for the full application.

### Required system

- shared spacing scale;
- shared typography scale;
- shared icon family;
- shared field, button, chip and tab components;
- shared semantic colors;
- shared loading, empty, warning and error states;
- clear keyboard focus;
- predictable hover and pressed states;
- consistent desktop and mobile breakpoint behavior.

### Workspace personality

The workspaces may have different tools, but not different design languages:

- **Viewport** — spatial, icon-led, Maya-inspired and minimal.
- **Render** — visual choice matrix with persistent Start/End state.
- **Timeline** — sequence creation and direct manipulation.

### Accessibility baseline

- readable minimum text size;
- visible focus state;
- complete button labels and tooltips;
- keyboard access for primary workflows;
- no critical information encoded by color alone;
- reduced-motion mode.

## 12. Workstream H — Project, export and delivery

### Required project functions

- New Project
- Open Project
- Save Project
- Save As
- Import Project
- Export Portable Project
- Relink Missing Assets
- Project diagnostics
- Project version and migration report

### Required output functions

V47 does not need final offline ray tracing, but it must provide reliable preview output:

- image snapshot;
- Start and End stills;
- shot playblast;
- sequence playblast;
- transparent graphics export where supported;
- project manifest with assets, shots and sequence metadata.

## 13. V47 phased development

### V47A — Native integration and invariants

- Merge V46 into native source.
- Introduce schema 47 and migration tests.
- Implement single-owner transform invariants.
- Native Viewport-first routing.
- Native loading and empty states.
- Remove proxy presentation.

**Exit condition:** V46 behavior exists without runtime DOM patching.

### V47B — World Builder

- Hero normalization.
- Environment/HDRI relationship.
- Semantic World Stack.
- Pivot, ground and physical scale workflow.
- Reliable orientation and camera framing.

**Exit condition:** a custom product and world can be built, saved and reopened reliably.

### V47C — Shot and generation grammar

- Persistent Start/End matrix.
- Candidate-based generation.
- seeded variants;
- category ownership, locks and pools;
- variant history and thumbnails.

**Exit condition:** generation is understandable, reversible and reproducible.

### V47D — Sequence composer

- Variant Bin.
- visible shot creation;
- audio workflow;
- linked/unique clip management;
- sequence recipes;
- playblast reliability.

**Exit condition:** a complete short product reel can be assembled without leaving VisualRef.

### V47E — Product hardening

- responsive and touch behavior;
- accessibility;
- performance budgets;
- project recovery;
- regression and acceptance suite;
- deployment documentation.

**Exit condition:** the build is ready for repeatable external user testing.

## 14. V47 validation strategy

### Automated

- schema migration tests;
- state invariant tests;
- command and undo/redo tests;
- deterministic generation tests;
- asset lifecycle tests;
- linked-shot timeline tests;
- audio timing tests;
- structural page checks.

### Browser

- Chrome and Edge desktop;
- Safari desktop;
- iPhone Safari;
- Android Chrome;
- mouse, trackpad and touch interaction;
- WebGL renderer and explicit fallback mode.

### Product acceptance scenarios

1. Import a car, create a showroom, generate three hero shots and build a 10-second reel.
2. Import a small product, create a stage, produce macro/detail variants and add music.
3. Open an older V45 project, migrate it, verify rotation, relink assets and continue editing.
4. Interrupt a large GLB import, recover safely and retry.
5. Open a project with missing GLB, HDRI and audio files and relink all three.

## 15. Out of scope for V47

To protect the product direction, V47 should not attempt to become:

- Blender;
- Maya;
- Unreal Engine;
- DaVinci Resolve;
- a node-based compositor;
- a full material authoring package;
- a cloud render farm;
- a final offline path tracer;
- a multi-user collaboration platform.

The application may borrow recognizable interaction grammar from professional tools, but every feature must serve fast visual preproduction and short-form product cinematics.

## 16. Definition of done

V47 is complete when a first-time user can:

1. open VisualRef and understand that Viewport is the starting point;
2. import a real hero without seeing a cheap proxy;
3. establish the hero's scale, pivot, ground and world;
4. create intentional Start and End shot states;
5. generate controlled variants with visible changes;
6. add preferred variants to a timeline;
7. import audio and arrange a coherent sequence;
8. export a reliable playblast;
9. save, close and reopen the project without losing ownership, links or asset state.

A professional user must be able to open advanced properties at every step and obtain precise control without entering a separate, contradictory interface.
