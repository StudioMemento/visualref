# MEMENTO VisualRef V43C-R1 — Core Rebuild

A deploy-ready rebuild of the V43C modular application that restores the useful creative and editing grammar proven in V36C without returning to the old monolithic UI.

## Rebuild principle

The application is organized around three simple workspaces:

- **RENDER** — create a shot as two controllable states, START and END.
- **VIEWPORT** — import and correct real GLB/HDRI assets in scene space.
- **TIMELINE** — assemble, trim, split, slip, layer, hear and export a complete sequence.

The interface is deliberately chip-driven, icon-first and game-like. Advanced controls are contextual **DETAILS**, not a second technical application hidden inside the first.

## Restored creative core

### Shot system

- Multiple named shot slots: create, select, duplicate and delete.
- Shot families and coherent visual presets.
- START / BOTH / END editing scopes.
- Eleven creative axes with visible renderer consequences:
  - Lens
  - Camera movement
  - Composition
  - Focus
  - Light rig
  - Subject size
  - Subject rotation
  - Subject view
  - Environment
  - Atmosphere
  - Motion design
- Per-axis locks, option exclusions and generation-pool reset.
- Near / Balanced / Bold generation strength.
- Delta target, live delta score and risk feedback.
- Contextual numeric DETAILS for precise camera, subject, light and environment overrides.
- Add a shot to the timeline or update its linked clip.

### Real assets

- Camera-normalized Hero GLB import.
- Native-space Environment GLB import.
- Secondary props.
- HDR/HDRI lighting and optional background.
- Position, rotation, scale, pivot and correction controls in Viewport.
- IndexedDB persistence for local binary assets.

### Timeline system

- V1–V3, FX and A1–A2 tracks.
- Visible pre-roll and frame-based ruler.
- Select, Blade and Slip tools.
- Drag clips between compatible tracks.
- Independent left/right trim handles.
- Frame snapping.
- Linked shots and **Make Unique**.
- Track lock, mute and visibility controls.
- Timeline markers.
- FX clips: Flash, Vignette, Title and Grain.
- Audio import, waveform display, volume and source offset.
- Sequence recipe presets.
- Player IN / OUT, loop and aspect-ratio controls.
- WebM Playblast recording with browser-supported audio capture.

## Asset contract

### Hero GLB

The Hero is normalized against a fixed Shot Camera reference:

- reference FOV: 38°
- reference distance: 5.5
- target frame coverage: 58%
- non-destructive source centering
- optional automatic ground alignment
- Subject Size applied after normalization

### Environment GLB

Environment assets remain in native scene space:

- no Shot Camera normalization
- no automatic scale conversion
- editable position XYZ
- editable rotation XYZ
- editable scale XYZ
- editable pivot XYZ
- editable correction rotation and scale
- optional ground alignment and ground offset

## Entry points

- `render.html` — Shot creation and START/END control.
- `viewport.html` — Real-asset correction and scene editing.
- `timeline.html` — Sequence editing, audio and Playblast.

## Validation

Run:

```bash
npm test
```

The smoke suite validates state migration, creative choices, locks and exclusions, shot duplication, linked clips, left/right trim, blade, unique shots, track controls, markers, FX clips, audio clips, sequence recipes, real-asset transforms and undo/redo.

## Deployment

No build command is required. Upload the repository contents to GitHub and import it into Vercel as a static project. Binary GLB, HDR and audio files stay in the current browser's IndexedDB and are not committed to GitHub.
