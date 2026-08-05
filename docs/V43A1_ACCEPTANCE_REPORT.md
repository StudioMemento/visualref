# MEMENTO VisualRef V43A.1 — Acceptance Report

**Checkpoint:** Layout Stabilization  
**Status:** Ready for GitHub/Vercel deployment test  
**Purpose:** Lock the workspace proportions, shared Shot Player grammar and V36C Render axis layout before V43B Real Scene.

## Structural acceptance

- Render uses a fixed 50/50 Player–Editor split.
- Viewport uses 50% direct Viewport, 30% Outliner and 20% Inspector.
- Timeline uses a fixed 50/50 Player–Timeline split.
- The application root is explicitly constrained to the browser viewport; transport bars no longer fall below the visible workspace.
- Viewport and Timeline use the complete available height with no dead lower canvas.

## Shot Player acceptance

- Render and Timeline show Start and End stills in the upper comparison region.
- The live interpolated Player occupies the lower visual region.
- Start and End stills use the same project state and renderer service as live playback.
- Viewport remains a single full-height direct manipulation surface.
- Start, End, live scrub, playback, duration, FPS and aspect controls remain synchronized.

## Render axis acceptance

Eleven creative axes are present in the canonical order:

1. Light
2. Camera
3. Lens
4. Focus
5. Composition
6. Subject Size
7. Subject Rotation
8. View
9. Motion Design
10. Environment
11. Atmosphere

Each axis provides:

- category/icon tile;
- generation lock;
- horizontally scrollable option rail;
- independent Start and End markers;
- split cyan/orange state when both endpoints use one option;
- resolved endpoint value in the axis header;
- contextual Advanced numerical controls.

## Automated core tests

The V43A.1 smoke suite verifies:

- creative defaults;
- creative Both-scope writes;
- endpoint-specific numerical patches;
- Start-only choice isolation;
- generation locks and associated numerical locks;
- Start/End numerical isolation;
- linked Timeline clips;
- generation link survival;
- Shot Start/End evaluation;
- linked sequence evaluation;
- Delta calculation;
- undo and redo.

Result:

```text
V43A.1 CORE SMOKE · PASS
```

## Browser regression tests

The actual application modules were loaded in headless Chromium through routed local resources with a controlled persistence mock. Three.js network access was intentionally aborted to verify the visible Canvas fallback.

Passed:

- no runtime page errors across Render, Viewport and Timeline;
- all three pages reach `data-ready=true`;
- Render Player and Editor widths match within 2 pixels;
- Start/End comparison renders two surfaces;
- all eleven axis rows render;
- Start-only creative choice preserves End;
- Advanced mode opens only the selected axis properties;
- Viewport proportions measure 50/30/20 within 1%;
- Timeline Player and panel widths match within 2 pixels;
- six Timeline tracks divide the available vertical area equally;
- adding a Shot creates a linked V1 clip;
- desktop screenshots render at 1920×1080;
- mobile pages boot without runtime errors at 390×844.

## Known boundary

The deployed renderer still uses the pinned Three.js CDN build and a Canvas fallback. Real GLB, Environment GLB, HDRI, PMREM, pivot correction and binary asset persistence belong to V43B and are not claimed in this checkpoint.
