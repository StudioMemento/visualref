# VisualRef V47R — Core Recovery Implementation

**Release:** V47R · 47.0.2  
**Date:** 2026-08-14  
**Purpose:** recover one coherent cinematic instrument without continuing the V46/V47 overlay stack.

## 1. Product contract

V47R is organized around four native questions:

1. What is the Hero and where is world zero?
2. What shot should be created?
3. How much Delta should the Candidate contain?
4. How does the accepted shot become part of the sequence curve?

The visible workflow is therefore:

> **WORLD → SHOT → DELTA → CURVE**

## 2. Runtime architecture

`index.html` creates one persistent shell. Viewport, Render and Timeline are mounted once inside that shell and are shown or hidden through project state.

```text
INDEX.HTML
└── V47R APPLICATION SHELL
    ├── one ProjectStore
    ├── one CommandBus
    ├── one HistoryService
    ├── one PersistenceService
    ├── one RendererService / WebGL canvas
    ├── ViewportWorkspace
    ├── RenderWorkspace
    └── TimelineWorkspace
```

A workspace change updates `ui.activeWorkspace`, the player interaction context and the visible panel. It does not replace the document, create another Store or create another Renderer.

## 3. Source authorities

### Retained from native V45

- project schema and normalization contract;
- Project Store and gesture-aware History;
- Command Bus;
- IndexedDB/local snapshot persistence;
- asset staging, validation and GLB/HDRI loading;
- Viewport transform and pivot controls;
- Start/End shot evaluation;
- frame-authoritative Timeline;
- native Render, Viewport and Timeline workspace classes.

### Ported from V47A as native V47R logic

- deterministic Candidate generation;
- Target Delta steering;
- seed reproducibility;
- category-lock awareness;
- Current / Candidate / Previous review;
- Current-safe Accept/Discard transaction;
- changed-category generation report.

### Used from V30 only as behavioral reference

- the image remains the dominant creative surface;
- Start and End stay legible;
- Delta sits close to playback;
- a sequence reads as a curve rather than an implementation dashboard;
- advanced controls deepen the same concept instead of introducing a second product.

No V30 source code is used as the runtime baseline.

## 4. Overlay removal

V47R does not load:

- `src/v46/polish-controller.js`;
- `src/v47/foundation-controller.js`;
- V46 or V47 overlay CSS;
- a MutationObserver that constructs or reconciles the product UI;
- temporary Store-method substitution;
- Renderer method replacement;
- prototype monkey-patching.

The recovery commands and components are explicit ES modules under `src/v47r/`.

## 5. World truth

`RecoveryRendererService` adds one procedural cyclorama and one contact-shadow receiver.

World rules:

- the cyclorama floor is fixed at world `Y = 0`;
- the stage never follows a floating Hero;
- the contact shadow stays on world zero and follows only the Hero footprint in X/Z;
- imported Hero bounds determine contact-shadow width and depth;
- Grey, White, Black and Void use absolute lighting recipes rather than inherited relative multipliers;
- motes are disabled in the recovery recipes;
- the obsolete base floor and legacy creative cove are hidden while a recovery recipe is active.

A one-time asset-specific visual-truth pass waits for the real Hero asset, then:

1. derives a grounded transform from the real rendered bounds;
2. persists that transform through `world.recoverVisualTruth`;
3. records the grounded state for that asset;
4. reframes the editor camera around the Hero;
5. does not repeat on future loads unless the Hero asset changes.

User-triggered **Ground** remains a normal history-aware scene command.

## 6. Candidate transaction

Candidate generation is pure until accepted.

```text
CURRENT SHOT
   │
   ├── generate(seed, target, locks)
   │       └── CANDIDATE SNAPSHOT
   │
   ├── discard → CURRENT unchanged
   │
   └── accept
           ├── CURRENT becomes accepted Candidate
           └── previous CURRENT is stored as PREVIOUS
```

Native recovery commands:

- `candidate.setTarget`
- `candidate.setReview`
- `candidate.generate`
- `candidate.regenerate`
- `candidate.discard`
- `candidate.accept`

The Delta generator is deterministic for the same project state, seed and Target Delta. It does not mutate the source state.

## 7. Workspace responsibilities

### Viewport — World

The Player dock owns Select, Move, Rotate, Scale, Pivot, World/Local, Snap, Frame, Ground, Reset, Grid and Guides.

The editor owns:

- guided setup state;
- World recipes;
- Outliner / subjects;
- contextual calibration and properties;
- import actions;
- HDRI and renderer controls.

### Render — Shot and Delta

The recovery surface owns:

- Target Delta;
- Generate;
- Current / Candidate / Previous;
- measured Delta and changed categories;
- Accept / Regenerate / Discard;
- Add or Update Timeline.

The native V45 editor remains the detailed **Refine Shot** layer for families, Start/End, locks, exclusions and precision.

### Timeline — Curve

Timeline owns:

- frame placement;
- trimming, blade, slip, markers and tracks;
- sequence recipes;
- FX and audio;
- playblast;
- selected-clip inspection.

A selected shot returns to the same Render editor through `timeline.openSelectedInRender`.

## 8. Persistence and migration

V47R retains the V45 persistence stores so existing imported binary assets remain addressable.

`initializeRecoveryState` adds a `recovery` namespace without replacing the V45 schema shape. It can import the V47A world recipe and generation records where available.

For an inherited imported Hero without an established V47R ground record, `recovery.world.ground` starts false. The visual-truth pass then grounds the real asset against fixed world zero rather than moving the stage to hide the offset.

## 9. Source pin and network behavior

The production entry imports native V45 modules and CSS from the frozen commit:

`48ff1e50424da0a0546ade9039f00368073f56f2`

Three.js is pinned to `0.160.0` through the import map.

This keeps the source baseline immutable and excludes later repository drift. It also means first production load requires access to the pinned CDN resources. Imported GLB/HDRI data remains in the local V45 IndexedDB persistence path.

## 10. File map

```text
index.html                       persistent application entry
viewport.html                    compatibility redirect
render.html                      compatibility redirect
timeline.html                    compatibility redirect
css/v47r.css                     local recovery UI authority
src/v47r/bootstrap.js            native V45 composition root
src/v47r/shell.js                persistent shell and workspace navigation
src/v47r/player.js               one canvas, transport and player dock
src/v47r/panels.js               World / Delta / Curve recovery surfaces
src/v47r/recovery-renderer.js    fixed-zero stage and visual recipe authority
src/v47r/delta-engine.js         pure deterministic Candidate generator
src/v47r/commands.js             recovery state and native commands
src/v47r/mock-native.js          offline acceptance fixture only
tests/                           syntax, logic, static and browser gates
docs/acceptance/                 generated acceptance screenshots
```
