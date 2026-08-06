# MEMENTO VisualRef V44

V44 keeps the functional Shot and Timeline core rebuilt from the V36C donor, then adds a physically controllable real-scene workflow: atomic GLB/HDRI import, direct object selection, World/Local gizmos and compensated pivot correction.

## Workspaces

- **RENDER** — create named shots with START / BOTH / END states, creative families, presets, generation pools and precise Details.
- **VIEWPORT** — import and calibrate Hero, Environment, Prop and HDRI assets with large icon-led controls.
- **TIMELINE** — assemble and edit V1–V3, FX and A1–A2 tracks, audio, markers, sequence recipes and Playblast.

All three workspaces share one project state and one IndexedDB asset store.

## V44 scene controls

The Viewport toolbar is deliberately simple and game-like:

```text
SELECT  MOVE  ROTATE  SCALE  PIVOT  |  WORLD / LOCAL  |  SNAP  FRAME  GROUND  RESET
```

Keyboard shortcuts:

```text
Q Select     W Move       E Rotate     R Scale
P Pivot      X World/Local
S Snap       F Frame       G Ground     Esc Cancel
```

### Hero: Shot versus Calibrate

- **SHOT** edits the current shot's START / BOTH / END position, rotation and uniform subject scale.
- **CALIBRATE** edits persistent project placement, import orientation, scale, ground and pivot.
- Choosing **PIVOT** while the Hero is in Shot mode automatically enters Calibrate, preventing accidental START/END contamination.

### World and Local

- Move and Rotate use the selected **WORLD** or **LOCAL** coordinate system.
- Scale uses object-local axes, matching Three.js TransformControls behavior rather than presenting a misleading world-scale mode.
- Pivot supports World and Local movement, numeric XYZ values and Origin / Centre / Bottom / Top presets.

## Atomic import pipeline

V44 does not replace a working asset merely because a file was chosen.

```text
choose file
→ stage import session
→ parse in a detached scene
→ remove embedded cameras/lights
→ inspect meshes, triangles, nodes, materials, animation and bounds
→ persist the new Blob
→ mount and verify finite matrices/bounds
→ commit scene state
→ dispose the superseded asset
```

On failure, the previous Hero, Environment or HDRI remains active and its Blob remains stored. Staging resources are disposed and the Inspector reports the error.

### Supported import roles

- one primary Hero `.glb`;
- one native-space Environment `.glb`;
- persistent Prop `.glb` nodes;
- one `.hdr` environment map.

V44 intentionally accepts self-contained `.glb` rather than advertising incomplete multi-file `.gltf` support.

## Non-destructive transform hierarchy

Hero:

```text
Project Root
└── Shot State Root
    └── Pivot Compensation
        └── Import Correction
            └── Auto Fit
                └── GLB Content
```

Environment and Props use the same structure without Hero Shot normalization. Environment geometry remains in native authoring units.

## Compensated pivot

Changing the pivot updates two state values in one history command:

1. the requested local pivot offset;
2. an equal world-space compensation on the project root.

The transform origin moves, while visible geometry remains stationary. One Undo restores both values; one Redo reapplies both.

## Restored creative core

V44 retains the V43C-R1 core rebuild:

- multiple named Shot slots;
- shot families and visual presets;
- eleven creative axes with renderer consequences;
- per-axis locks and option exclusions;
- Near / Balanced / Bold generation;
- delta target and risk feedback;
- V1–V3, FX and A1–A2 timeline tracks;
- left/right trim, Blade, Slip and frame snapping;
- linked Shots and Make Unique;
- track lock, mute and visibility;
- markers, FX clips, audio waveform and synchronized playback;
- WebM Playblast where supported by the browser.

## V44.0.1 editor chip rollback

The Render editor now reconnects the preserved **V43B.9 clean chip component**:

- left chevron = START with a teal gradient;
- center = BOTH with white top and bottom lines;
- right chevron = END with an orange gradient;
- text label only inside the option chip;
- invisible 30 / 40 / 30 interaction zones;
- quiet generation-pool exclusion control remains available.

No GLB, Environment, gizmo, Pivot, Shot or Timeline behavior was removed.

## Run locally

The project is static and has no build step. Serve the repository over HTTP so browser modules and IndexedDB work correctly:

```bash
python3 -m http.server 8080
```

Open:

- `http://localhost:8080/render.html`
- `http://localhost:8080/viewport.html`
- `http://localhost:8080/timeline.html`

Opening through `file://` intentionally uses the visible Canvas fallback.

## Automated validation

```bash
npm run check
```

This runs local-reference and architecture checks followed by the functional smoke suite. See `VALIDATION.md` for coverage and the remaining deployed-browser acceptance pass.

## Deployment

Upload the repository contents to GitHub and deploy it as a static Vercel project. Uploaded GLB, HDR and audio binaries remain in that browser's IndexedDB and are not committed to GitHub.
