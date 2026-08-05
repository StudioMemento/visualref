# MEMENTO VisualRef V43A.1 — Layout Stabilization

GitHub/Vercel-ready checkpoint built from the working V43A shared core.

V43A.1 does **not** replace the project store, history, persistence, playback or Timeline model. It corrects the workspace composition and restores the V36C-style Render axis grammar before real GLB/HDRI integration.

## Deploy

No local server, package installation, or build step is required.

1. Extract the ZIP.
2. Upload everything inside the folder to the root of a GitHub repository.
3. Import that repository into Vercel.
4. Select `Other` as the framework preset.
5. Leave Build, Install and Output Directory empty.
6. Deploy.

The root URL redirects to `/render.html`.

## Entry pages

```text
/render.html
/viewport.html
/timeline.html
```

## Locked desktop layouts

```text
RENDER    50% Shot Player / 50% Render Editor
VIEWPORT  50% Viewport / 30% Outliner / 20% Inspector
TIMELINE  50% Sequence Player / 50% Timeline
```

The Shot Player in Render and Timeline is split vertically:

```text
START FRAME STILL | END FRAME STILL
------------------------------------
LIVE INTERPOLATED PLAYER
TRANSPORT + PROJECT CONTROLS
```

Viewport remains one uninterrupted direct scene surface.

## Render editor

The Render editor now uses the V36C horizontal axis layout:

- Light
- Camera
- Lens
- Focus
- Composition
- Subject Size
- Subject Rotation
- View
- Motion Design
- Environment
- Atmosphere

Each option can hold Start, End, or both endpoint states. Cyan is Start; orange is End. Axis locks protect the associated numerical controls from generated variants. Advanced mode exposes contextual numerical overrides only for the selected creative axis.

## Existing foundation preserved

- canonical Project State;
- IndexedDB autosave and local recovery snapshot;
- BroadcastChannel workspace synchronization;
- command-based mutations;
- undo and redo;
- deterministic Shot variants;
- linked Timeline clips;
- sequence evaluation;
- responsive tablet/mobile recomposition;
- visible Canvas fallback when Three.js cannot load.

## Current boundary

V43A.1 is the final layout gate before **V43B Real Scene**:

- Hero GLB;
- Environment GLB;
- secondary GLBs;
- HDRI and PMREM;
- Position / Rotation / Scale;
- pivot correction;
- ground alignment;
- persistent binary assets.
