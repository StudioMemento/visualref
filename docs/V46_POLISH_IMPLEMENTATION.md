# MEMENTO VisualRef V46 — Polish Pass Implementation

## 1. Purpose

V46 is the corrective product pass between the V45 foundation and the deeper V47 rebuild.

It does not replace the V45 scene, store, renderer, history, import or timeline engines. It changes how the product is entered, understood and controlled so the existing capability feels intentional rather than exposed as engineering UI.

The guiding product sequence is now:

**VIEWPORT → RENDER → TIMELINE**

1. Build and calibrate the real product world.
2. Create controlled Start-to-End shot variants.
3. Assemble shots, effects and audio into a sequence.

## 2. Core decisions

### 2.1 No visible proxy hero

The built-in calibration proxy is no longer presented as the user's product.

Until a custom hero has been loaded and mounted by the renderer:

- the renderer canvas is visually hidden;
- the stage displays a deliberate empty state;
- Viewport offers the optional guided setup;
- Render and Timeline direct the user back to Viewport;
- import progress replaces the empty-state copy while the asset is being validated.

The underlying V45 proxy can still perform internal calibration work, but it is no longer allowed to define the perceived quality of the product.

### 2.2 Viewport is the product entry

`index.html` opens `viewport.html`.

Viewport owns:

- hero import;
- environment or HDRI import;
- object hierarchy;
- physical scale;
- pivot and ground relationship;
- world/local transform mode;
- editor camera framing.

The guide is visible on first use but can be dismissed immediately. It never locks controls or prevents free navigation.

### 2.3 Subject rotation has one owner

V45 allowed other creative categories such as View or Motion Design to write into `subject.rotationY`. This produced a hidden offset: the Subject Rotation category could appear identical at Start and End while the rendered orientation remained different.

V46 intercepts the relevant V45 commands so:

- changing another creative category preserves the current Start and End subject rotation;
- changing Subject Rotation still changes the angle normally;
- generated variants, presets, reset, family changes and new shots resolve the final angle from the Subject Rotation choice;
- existing V45 shots receive a one-time normalization pass, recorded as an undoable project change.

The result is a clear ownership rule:

> **Subject Rotation owns the final hero angle.**

### 2.4 Additive architecture

The standalone V46 package loads the frozen V45 base from this exact commit:

`48ff1e50424da0a0546ade9039f00368073f56f2`

V46 then adds a local stylesheet and runtime controller.

This provides two safe deployment paths:

1. **Standalone Vercel build** — upload this folder directly. The V45 base is loaded from a commit-pinned jsDelivr URL.
2. **Local repository overlay** — run `node scripts/install-v46.mjs <path-to-v45-repository>`. The installer copies the V46 layer into the complete V45 repository and changes the page entry modules to the local overlay.

The installer creates `_v45_backup_before_v46/` before altering entry files.

## 3. Viewport changes

### 3.1 Optional four-step setup

The Viewport stage introduces:

1. **Import Hero**
2. **Create the World** — environment GLB or HDRI
3. **Calibrate** — scale, ground, pivot and orientation
4. **Create Shots** — continue to Render

Each step reflects the current project state. The guide can be closed with **Work Freely** and reopened from the Viewport toolbar.

### 3.2 Minimal Maya-inspired player grammar

The video-style transport is removed from Viewport. The stage instead exposes an essential transform HUD:

- `Q` Select
- `W` Move
- `E` Rotate
- `R` Scale
- `F` Frame selected
- Grid icon — toggle the grid without colliding with V45’s `G` Ground shortcut

A compact readout shows:

- editor or shot camera;
- selected object;
- World or Local transform space.

The implementation borrows Maya's recognizable tool grammar without reproducing Maya's density.

### 3.3 Icon-tab editor

The previous simultaneous Outliner and Inspector presentation is reorganized as three visual tabs:

- **Scene** — hierarchy and asset creation;
- **Properties** — contextual properties for the selected node;
- **World** — environment and HDRI controls only.

Only one editing surface is shown at a time. Existing V45 controls remain available; the change is organizational and visual.

## 4. Render changes

### 4.1 Player Delta control

The shared Render player now includes a persistent Delta slider next to generation controls.

It edits the same `shot.deltaTarget` state used by the editor, wrapped in a Store gesture so one slider drag becomes one Undo step. The user can therefore control how close or distant the next generated variation should be without leaving the player.

### 4.2 Always-visible shot state

A new **Visible Shot State** rail displays every creative category at once. Each category shows:

- the category name;
- the current Start value;
- the current End value.

Selecting a card opens the correct detailed macro and creative axis. This removes the need to remember values hidden inside closed accordion categories.

### 4.3 Explicit Start and End ownership on chips

Option chips retain the accepted V43B9 visual grammar while adding persistent endpoint labels:

- Start on the teal side;
- equality in the center;
- End on the orange side.

The endpoint labels remain visible even when an option is not selected, so the interaction is understandable before hover.

### 4.4 Precision panels remain open

V45 rebuilt the active macro after every state change, which caused open `<details>` precision panels to close.

V46 records the open precision panel per macro and restores it after every render. Sliders can now be adjusted repeatedly without reopening the panel after each change.

### 4.5 Calmer hierarchy

The polish layer reduces visual noise through:

- fewer competing border weights;
- consistent four-pixel corners;
- compact but readable typography;
- clearer grouping of primary and secondary actions;
- quieter backgrounds;
- controlled orange and teal use;
- consistent player treatment across Render and Timeline.

## 5. Timeline changes

### 5.1 Creation bar

A persistent sequence creation bar is placed directly beneath the timeline toolbar. It exposes:

- target video track V1, V2 or V3;
- Add Active Shot;
- variant mode Near, Balanced or Bold;
- New Variant — duplicates the active shot before generation, preserving the source;
- Import Audio;
- Show Library.

The user no longer needs to discover these operations through hidden panels.

### 5.2 Empty-sequence state

An empty timeline shows direct actions for:

- adding the current shot;
- importing audio.

The sequence library opens automatically the first time an empty timeline is visited.

### 5.3 Existing V45 editing retained

V46 keeps the existing V45 timeline capability:

- three video tracks;
- two audio tracks;
- shot, FX and audio clips;
- direct move, trim, blade and slip editing;
- markers;
- waveform playback;
- playblast export;
- clip inspector;
- sequence recipes.

The pass makes these capabilities visible and reachable rather than replacing their implementation.

## 6. Shared player polish

Render and Timeline now use the same visual treatment:

- cleaner status bar;
- reduced border noise;
- consistent icon sizing;
- compact transport spacing;
- clear teal Start and orange End actions;
- quieter output framing;
- deliberate stage background;
- improved focus states.

Viewport intentionally diverges because it is a scene editor, not a playback monitor.

## 7. Acceptance checklist

### Entry and loading

- [ ] Opening `/` lands on Viewport.
- [ ] No temporary proxy car or proxy product is visible.
- [ ] Import progress is deliberate and readable.
- [ ] The real GLB is revealed only after the custom hero is mounted and renderer-ready.

### Viewport

- [ ] The optional guide appears for a new project.
- [ ] The guide can be dismissed without restricting controls.
- [ ] The guide can be reopened.
- [ ] Q, W, E and R change the active Viewport tool.
- [ ] F frames the selected object.
- [ ] The grid icon toggles the grid without stealing the existing Ground shortcut.
- [ ] Scene, Properties and World tabs display the intended editor surface.
- [ ] Hero, environment and HDRI imports still use the V45 import pipeline.

### Render

- [ ] Delta can be changed from the player.
- [ ] Start and End creative choices are visible in the shot-state rail.
- [ ] Selecting a rail card opens the correct category.
- [ ] Start and End labels remain visible on every option chip.
- [ ] Precision stays open after slider changes.
- [ ] Matching Start and End Subject Rotation produces matching numeric rotation.
- [ ] View and Motion choices no longer add an invisible subject-rotation offset.
- [ ] Variant generation respects the Subject Rotation category as final authority.

### Timeline

- [ ] Add Active Shot is visible without opening the library.
- [ ] The target video track can be selected.
- [ ] A Near, Balanced or Bold variant can be generated.
- [ ] Audio import is visible and opens the file picker.
- [ ] The empty state disappears after a clip is added.
- [ ] Existing move, trim, blade, slip, marker, FX and playblast actions still work.

## 8. Validation performed in this package

The package includes syntax checks for:

- `src/v46/bootstrap.js`
- `src/v46/local-bootstrap.js`
- `src/v46/polish-controller.js`
- `scripts/install-v46.mjs`

Run:

```bash
npm run check
```

The local installer was also applied to a complete V45 fixture. Its generated `check:v46` command passed, the root route changed to Viewport, the V46 preboot guard and local bootstrap were installed, and `_v45_backup_before_v46/` was created.

A browser DOM/controller fixture was executed for Viewport, Render and Timeline with both proxy-state and custom-Hero-state projects: **6 of 6 scenarios passed with no console or page errors**. It covers the guide, icon tabs, proxy guard, Delta, persistent endpoint state, rotation ownership, Timeline variant duplication, clip creation and library opening. The reproducible fixture is in `tests/browser-mock/`; `tests/run_browser_mock.py` runs it without external network access when Python Playwright and Chromium are available.

A final networked acceptance pass is still required for the real V45 + Three.js runtime, WebGL, IndexedDB and production GLB/HDRI/audio assets. See `docs/V46_VALIDATION_REPORT.md`.

## 9. Boundary of this pass

V46 is a polish and control-ownership pass. It intentionally does not:

- replace the V45 renderer;
- create a new persistence schema;
- rebuild the entire timeline data model;
- add cloud asset storage;
- add final-quality render export;
- create a complete environment recipe system;
- redesign mobile as a separate product.

Those items are assigned to V47.
