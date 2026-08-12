# MEMENTO VisualRef V46 — Validation Report

**Build:** V46 viewport-first polish layer over frozen V45  
**Validation date:** 2026-08-12  
**Base commit:** `48ff1e50424da0a0546ade9039f00368073f56f2`

## 1. Automated checks passed

### JavaScript and installer syntax

`npm run check` passes for:

- `src/v46/bootstrap.js`
- `src/v46/local-bootstrap.js`
- `src/v46/polish-controller.js`
- `scripts/install-v46.mjs`

### Local overlay installer

The installer was applied to a complete V45 fixture and passed these checks:

- validates the expected V45 repository landmarks;
- creates `_v45_backup_before_v46/` before changing entry files;
- copies the V46 stylesheet, controller, local bootstrap and documents;
- adds the `v46-preboot` guard to Viewport, Render and Timeline;
- replaces the local page entry with `src/v46/local-bootstrap.js`;
- changes `/` to open Viewport;
- updates the package release to V46;
- generated `npm run check:v46` passes.

### Browser DOM/controller fixture

The in-memory browser fixture ran Viewport, Render and Timeline in two project states:

1. no custom Hero mounted;
2. custom Hero mounted.

**Result: 6 of 6 scenarios passed. Zero console errors. Zero page errors.**

The fixture validates:

- Viewport-first navigation order;
- preboot/proxy suppression and honest empty state;
- optional Viewport guide;
- Scene, Properties and World tabs;
- Maya-inspired transform HUD;
- Render Delta control;
- all 12 creative categories plus Timing visible at once;
- persistent Start / equality / End chip labels;
- removal of duplicate non-Subject rotation precision controls;
- View choices preserve authored Subject Rotation;
- non-Subject precision cannot write Subject Rotation;
- Subject Rotation remains editable;
- generated variants resolve back to Subject Rotation authority;
- Timeline creation bar and empty state;
- New Variant duplicates the active shot before generation;
- Add Active Shot creates a clip;
- the Timeline library opens for first-use creation.

Run the same fixture with:

```bash
python tests/run_browser_mock.py
```

Python Playwright and a Chromium installation are required. The test does not use external network access.

## 2. Manual networked acceptance still required

The artifact environment could not execute the external V45/Three.js CDN runtime or production assets. Before production merge, verify:

- [ ] standalone Vercel boot on Viewport;
- [ ] no built-in proxy frame during cold start or persisted-asset restoration;
- [ ] production Hero GLB import, validation, mount and reload;
- [ ] Environment GLB import and hero-to-world proportion;
- [ ] HDRI decode, PMREM, background, rotation, blur and exposure;
- [ ] World/Local transforms, pivot compensation and Ground;
- [ ] real Start, End and Compare stills with equal rotations;
- [ ] Near, Balanced and Bold generation across several Delta targets;
- [ ] Undo/Redo after a continuous Delta drag and precision drag;
- [ ] Timeline move, trim, blade, slip, markers, FX and playblast;
- [ ] audio decoding, waveform, playback and IndexedDB recovery;
- [ ] desktop responsive acceptance;
- [ ] mobile/touch acceptance;
- [ ] explicit Canvas fallback and asset-error states.

## 3. Release decision

V46 is ready for a deployed browser acceptance pass and real-asset testing. It should not be labelled production-accepted until the unchecked WebGL, asset, audio, persistence and responsive scenarios above pass on the actual deployment.
