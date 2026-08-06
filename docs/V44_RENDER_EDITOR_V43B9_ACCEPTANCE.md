# MEMENTO VisualRef V44.0.2 — Render Editor V43B.9 Acceptance

## Correction

The previous V44 chip patch only restyled the options inside the interim **ACTIVE CONTROL** panel. It did not replace the Render editor's FRAME / SUBJECT / WORLD drill-down, so the editor architecture remained visually the same.

V44.0.2 removes that interim drill-down and mounts the complete V43B.9 creative-axis matrix in the Render workspace.

## Accepted Render editor structure

All eleven creative axes are visible as independent horizontal rows:

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

Each row scrolls independently when its option set exceeds the available width. The category tile remains sticky at the left edge.

## Category tile

The category component now follows the supplied acceptance exactly:

- text label only;
- no category icon;
- no `GEN ACTIVE` copy;
- no option count or current-value recap inside the tile;
- one small functional generation lock in the upper-right.

Selecting the category still sets the contextual axis used by Advanced Details.

## Creative option chip

Each option is one uninterrupted surface:

- large centered, single-line label;
- visible left and right chevrons;
- no center glyph;
- no visible internal divider;
- invisible 30% / 40% / 30% Start / Both / End hit zones;
- teal gradient entering from the left for Start;
- full-width white top and bottom rules for a shared Both value;
- orange gradient entering from the right for End;
- quiet generation-pool exclusion control in the upper-right.

Long labels remain single-line but receive a compact typography adjustment rather than becoming a second row.

## Functional behavior preserved

- explicit Start, Both and End assignment;
- axis generation locks;
- per-option generation-pool exclusion;
- complete pool reset when exclusions exist;
- contextual Advanced numeric properties;
- Near, Balanced and Bold generation;
- shot slots, linked timeline clips and playback;
- Hero / Environment GLB import;
- World / Local Move, Rotate, Scale and compensated Pivot;
- Timeline editing and audio functionality.

No Viewport, import, gizmo, pivot or Timeline runtime code was changed by this correction.

## Removed from Render

- FRAME / SUBJECT / WORLD category drill-down;
- icon-led axis summary tiles;
- the separate ACTIVE CONTROL header and panel;
- the stale V44 CSS patch that targeted only `.active-axis-panel`.

## Validation

- JavaScript syntax validation: pass.
- File and import resolution: pass.
- V43B.9 structure assertions: pass.
- Creative Start / Both / End command tests: pass.
- Lock and generation-pool tests: pass.
- GLB / Environment / World-Local / Pivot regression suite: pass.
- Timeline regression suite: pass.
- Local HTTP checks for Render, Viewport, Timeline, the new stylesheet and Render module: HTTP 200.
- The isolated component preview was rendered from the final acceptance stylesheet with Chromium through an in-memory page because direct local navigation is blocked by the container policy.
