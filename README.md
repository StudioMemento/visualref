# MEMENTO VisualRef V46

V46 is a viewport-first polish layer over the frozen V45 VisualRef foundation.

## Direct Vercel deployment

Upload the contents of this folder to a clean GitHub repository or directly to Vercel.

The root route opens `viewport.html`. The renderer canvas stays guarded until a custom Hero has actually mounted, so a persisted GLB never flashes back to the built-in proxy while it is restoring.

The standalone package loads the frozen V45 runtime from the commit-pinned jsDelivr URL documented in `docs/V46_POLISH_IMPLEMENTATION.md`. The V46 controller and stylesheet are included locally.

## Apply V46 to a full local V45 repository

```bash
node scripts/install-v46.mjs /absolute/path/to/visualref-v45
```

The installer:

- verifies the target repository;
- creates `_v45_backup_before_v46/`;
- copies the V46 stylesheet and controller;
- changes all page entry modules to the local V46 bootstrap;
- makes Viewport the root entry;
- copies the V46 implementation report and V47 goals;
- updates `package.json` to V46.

Then run:

```bash
npm run check
npm run check:v46
```

## Main files

- `viewport.html` — first page and World Builder entry
- `render.html` — Start/End shot creation
- `timeline.html` — sequence assembly
- `css/v46.css` — global polish system
- `src/v46/polish-controller.js` — V46 behavior and control ownership
- `docs/V46_POLISH_IMPLEMENTATION.md` — implementation and acceptance contract
- `docs/V46_VALIDATION_REPORT.md` — automated checks and remaining browser QA
- `V47_GOALS.md` — next development target

## V46 priorities

- no visible proxy hero;
- optional guided Viewport setup;
- Maya-inspired essential Viewport controls;
- icon-tab Outliner/Properties/World editor;
- deterministic Subject Rotation ownership;
- Delta control in the Render player;
- persistent Start/End shot-state rail;
- precision panels that remain open;
- visible Timeline shot, variant and audio creation;
- shared Render/Timeline player styling.

## Validation

```bash
npm run check
```

The included browser mock covers all three workspaces in both empty/proxy and custom-Hero states. With Python Playwright and Chromium available:

```bash
python tests/run_browser_mock.py
```

The automated suite passes in this package. Real GLB, Environment, HDRI, audio, IndexedDB reload and deployed WebGL still require the networked acceptance matrix in `docs/V46_VALIDATION_REPORT.md`.
