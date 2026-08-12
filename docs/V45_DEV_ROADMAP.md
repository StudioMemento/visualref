# MEMENTO VisualRef V45 — Development Roadmap

**Authority:** `MEMENTO_VISUALREF_NEXT_PRODUCT_VIS_RESET_2026-08-08.md`  
**Strategy:** controlled strangler migration  
**First vertical target:** car + showroom, then product + stage/backplate

---

## Status legend

- `DONE` — artifact or test exists in this V45 package.
- `STARTED` — contract/scaffold exists; current runtime is not yet connected.
- `NEXT` — immediate integration work.
- `LATER` — intentionally gated behind prior acceptance.

---

## Phase 0 — Freeze and establish truth

### Status: **DONE for source control definition; browser evidence still pending**

Delivered here:

- immutable commit manifest;
- V45 freeze policy;
- Preserve / Replace / Defer / Remove matrix;
- state ownership contract;
- Git tag / branch commands;
- explicit deployed-browser acceptance debt;
- V45 schema boundary;
- inherited capability inventory.

Still required in the real repository/testing environment:

- push `v45-freeze` tag and `freeze/v45` branch;
- capture current Render, Viewport, and Timeline screenshots/recordings;
- run the real GLB/HDRI acceptance matrix;
- add approved fixtures or documented external fixture references.

---

## Phase 1 — Core state and renderer stabilization

### Status: **STARTED**

Implemented in this package:

- schema 45 project factory;
- strict Scene / Shot / Timeline separation;
- one-Hero invariant;
- Motion Off default;
- preset-free active project state;
- command reducer;
- one Project Store and one history path;
- linked clip model;
- Make Unique without scene cloning;
- monotonic retime model;
- renderer authority guard;
- atomic asset replacement transaction;
- V44 compatibility adapter with preset quarantine;
- automated contract smoke tests.

### NEXT integration order

1. Add `src/v45/` beside the current V44 modules without changing production bootstrap.
2. Run V45 contract tests in CI beside existing `npm run check`.
3. Build a read-only adapter from the current V44 store into the V45 selector model.
4. Replace direct UI mutation paths with V45 commands one domain at a time.
5. Connect persistence and migration while retaining the old project backup.
6. Place renderer creation behind `RendererAuthority`.
7. Add runtime instrumentation: renderer count, live Hero count, asset lifecycle count.
8. Gate production bootstrap with an explicit development flag until parity passes.

### Phase 1 exit gate

- one renderer owner;
- one Player clock;
- one store/history path;
- failed asset replacement preserves active asset;
- reload restores the same entity, Shot, and clip references;
- no Timeline operation changes scene entity count;
- old projects open through the compatibility adapter;
- all existing V44 checks and all V45 contract tests pass.

---

## Phase 2 — Product Vis scene calibration

### Status: **NEXT after Phase 1 integration**

Build:

- Hero and Environment imports through the V45 asset transaction;
- procedural Stage entity;
- HDRI role with rotation, exposure, blur, reflection/background separation;
- Backplate role with crop, horizon, FOV/perspective match, and contact point;
- interaction normalization;
- physical/reference-dimension calibration;
- ground and pivot;
- World / Local gizmos;
- Hero / Environment proportion calibration;
- semantic scene list.

Acceptance scenes:

1. car + showroom;
2. car + racetrack;
3. product + procedural stage;
4. product + HDRI;
5. product + Backplate.

---

## Phase 3 — Render interaction reset

### Status: **LATER, no visual rewrite before Phase 1/2 stability**

Replace the eleven permanent rails with:

```text
SUBJECT
CAMERA
COMPOSITION
LENS & FOCUS
LIGHT
ENVIRONMENT
MOTION
ATMOSPHERE / IMAGE
TIMING
```

Each category shows its active state and opens precision inline beneath itself.

Required interaction:

- Subject Present / Hidden;
- Grounded / Void;
- physical scale versus apparent size separation;
- Live / Start / End / Compare;
- Motion Off default;
- Variation always available;
- Energy only when Motion is on;
- no detached Advanced panel;
- no visible presets.

---

## Phase 4 — Motion engine

### Status: **LATER**

Initial primitives only:

- Dolly;
- Truck;
- Pedestal;
- Orbit;
- Arc Reveal;
- Turntable;
- static focus/light change.

Every motion has actor, primitive, direction, amount, energy, duration, constraints, and deterministic seed.

---

## Phase 5 — Timeline professional core

### Status: **LATER**

- stable six-track model;
- move, trim, split, snap;
- source in/out;
- linked Shot and Make Unique;
- speed ramps and retime curves;
- transitions without scene clones;
- markers and audio;
- frame-authoritative mobile-safe input;
- synchronized Player.

---

## Phase 6 — Sequence intelligence

### Status: **BLOCKED until Phases 1–5 pass**

Build roles, coverage, continuity, angle/lens diversity, B-roll balance, energy arc, and repetition rejection. Do not restore frozen shot-list presets.

---

## Phase 7 — Showcase configuration

### Status: **BLOCKED until the professional path is real**

Same engine, same project, simplified visible depth. No second codebase and no fake demo behaviour.

---

## Current executable result

This package does not pretend to be the completed visual runtime. It is the first safe development layer:

```text
FREEZE THE DONOR
→ DEFINE OWNERSHIP
→ ENFORCE IT IN CODE
→ TEST THE INVARIANTS
→ THEN CONNECT THE RENDERER AND UI
```
