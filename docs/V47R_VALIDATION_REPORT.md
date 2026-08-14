# VisualRef V47R — Validation Report

**Release:** 47.0.2  
**Validation date:** 2026-08-14  
**Command:** `npm run validate`

## Result

**PASS — all automated V47R gates completed successfully.**

```text
syntax: 10 JavaScript modules passed
delta: deterministic · targets 15/33/57/76/88 · locks · zero-ground recovery · safe accept passed
static: persistent shell · one renderer site · no observers · no monkey patches passed
browser:
  rendererInstances: 1
  workspaceSwitches: 2
  ultrawideEditorWidth: 708 px
  screenshots: 5
```

## 1. Syntax gate

Checked every `.js` and `.mjs` file under `src/` and `tests/` with Node syntax validation.

Result: **10 modules passed**.

## 2. Delta engine gate

Verified:

- same seed and Target Delta produce the same Candidate;
- Candidate generation does not mutate Current;
- measured Delta follows increasing target values;
- camera category locks preserve Start and End;
- an inherited imported Hero starts ungrounded until recovery;
- `world.recoverVisualTruth` establishes fixed world-zero ground for the specific asset;
- Accept updates Current only after explicit approval;
- Previous preserves the pre-accept Current;
- Candidate is cleared after Accept.

Measured progression for the fixed test seed:

```text
Target request: 15 / 35 / 55 / 75 / 90
Measured Delta: 15 / 33 / 57 / 76 / 88
```

## 3. Static architecture gate

Verified:

- one `index.html` application root;
- one `RendererService` construction site;
- no V46/V47 overlay controller loaded;
- no `MutationObserver` UI construction;
- no prototype monkey-patching;
- no cyclorama movement to the Hero ground offset;
- fixed world-zero cyclorama code is present;
- native one-time visual-truth recovery is present;
- the V47R stylesheet loads after the native V45 styles;
- compatibility entry pages redirect to the persistent shell;
- the package exposes the complete validation script.

## 4. Browser acceptance gate

The automated browser flow verified:

1. boot creates one Store and one Renderer;
2. Viewport is visible;
3. switching to Render does not replace the document or Renderer;
4. Target Delta can be changed;
5. Generate creates Candidate while Current remains byte-for-byte unchanged;
6. Candidate review is visible in the Player;
7. Accept changes Current and records Previous;
8. the accepted shot can be added to Timeline;
9. switching to Timeline preserves the same Store, Renderer and `performance.timeOrigin`;
10. Timeline receives the accepted clip;
11. 5120×1440 keeps the editor at 708 px rather than allowing it to consume the ultrawide canvas;
12. 390×844 retains a usable Player region.

Generated screenshots:

- `docs/acceptance/v47r-viewport-1920x1080.png`
- `docs/acceptance/v47r-render-candidate-1920x1080.png`
- `docs/acceptance/v47r-timeline-1920x1080.png`
- `docs/acceptance/v47r-render-5120x1440.png`
- `docs/acceptance/v47r-viewport-390x844.png`

## 5. Browser-test environment

The container Chromium policy blocks URL navigation and external module loading. The browser acceptance gate therefore bundles the local V47R modules into `about:blank` and uses `src/v47r/mock-native.js` for the native V45 contracts and deterministic canvas fixture.

This validates V47R shell behavior, transaction logic, runtime continuity and responsive layout. It does not pretend to validate remote module delivery or a real imported GLB.

## 6. Remaining deployment acceptance

The following checks should be completed on the deployed Vercel build using the real project assets:

- pinned V45 and Three.js CDN delivery;
- real WebGL initialization;
- the existing Lamborghini GLB restored from IndexedDB or re-imported;
- automatic asset-specific ground recovery against world zero;
- contact-shadow footprint under the real wheelbase;
- black body-panel readability in Grey, White and Black Limbo;
- HDRI restoration and background controls;
- imported environment/prop persistence;
- native V45 timeline drag, trim, blade, slip, audio and playblast;
- WebGL context recovery and long-session memory behavior.

These are live renderer and asset acceptance items, not failures in the automated V47R package gates.
