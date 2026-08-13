# MEMENTO VisualRef V46A — Working Workflow Build

V46A is the stabilization pass for the basic **Viewport → Render** workflow. It keeps the frozen V45 scene/store/import engine, but changes runtime ownership and the visible UI so the app can be tested without the current rotation/framing/reload chaos.

## What changed

### One persistent runtime

V36C felt fast because workspace changes happened inside one document and one live renderer. The V45/V46 page architecture recreated the AppShell, PlayerController and RendererService whenever a page URL loaded.

V46A restores the important behavior without going back to the old monolithic HTML:

- one Project Store;
- one PlayerController;
- one WebGL RendererService;
- one mounted Hero scene;
- Viewport / Render / Timeline swap only their workspace controller and panel DOM;
- navigation uses `history.pushState()` instead of a document reload;
- all three route documents load the same workspace CSS superset, so switching in-place never loses Render-specific styling;
- the renderer's `loadedAssets` map survives the switch, so the same GLB is reused rather than parsed/mounted again.

### Grounded Hero and clear transform ownership

- Hero translation, pitch, roll and apparent scale are no longer authored by Render categories.
- **Subject Rotation** is the only creative control allowed to rotate the Hero.
- Subject Size, Composition and View are evaluated as camera reframing instead of moving/scaling the Hero.
- the real Hero is auto-grounded after mount;
- the Hero pivot is normalized to zero with compensated geometry placement;
- an XYZ origin helper is visible in Viewport;
- Ground and Reset return the selected object to a predictable usable state.

### Viewport player

The stage dock is now the requested tool set:

`Select · Move · Rotate · Scale · Pivot · Local · Snap · Frame · Ground · Reset · Guide`

### Viewport editor

- Outliner is always visible in its own panel.
- Properties are always visible beside it.
- Properties have one persistent search field (`Ctrl/Cmd + K`).
- existing V45 categories remain underneath instead of being split into Scene / Properties / World tabs.

### Render player

- Near / Balanced / Bold is removed from the visible generation workflow.
- **Delta is numeric** and can be typed or dragged.
- generation internally uses the balanced solver, with Delta controlling how far the result can travel.
- top monitor modes are:
  - `LIVE`
  - `LIVE + START / END`
  - `VIEWPORT`
- endpoint stills reuse the same renderer and are cached by shot signature.

### Render editor

- sticky/fixed Start · Both · End scope above the scrollable properties;
- search field plus icon-led category navigation;
- larger typography and stronger grouping;
- every option chip exposes persistent `START · BOTH · END` hit zones;
- Subject transform precision fields that conflict with physical scene calibration are removed from Render;
- precision panels keep their open state;
- the property list scrolls independently while the scope/navigation and bottom actions remain reachable.

Timeline is intentionally not redesigned in this pass.

## Deploy directly to Vercel

Upload the **contents of this folder** to a repository or Vercel. `/` opens `viewport.html`.

The standalone build loads the frozen V45 source from commit:

`48ff1e50424da0a0546ade9039f00368073f56f2`

The V46A overlay itself is local.

## Apply to a full local V45 repository

```bash
node scripts/install-v46.mjs /absolute/path/to/visualref-v45
```

The installer creates `_v45_backup_before_v46a/`, adds the V46A layer, switches the page entry modules to the local single-runtime bootstrap and changes `/` to Viewport.

Then run:

```bash
npm run check
npm run check:v46a
```

## Validation

Run the full included validation with:

```bash
npm run check:all
```

It includes:

- `npm run check` — JavaScript syntax + **21/21 static workflow contracts**
- `npm run check:runtime` — real V46A bootstrap in a browser fixture; Viewport → Render → Viewport keeps the **same PlayerController, RendererService, loaded-assets Map and Hero record**
- `npm run check:browser` — Viewport / Render / Timeline DOM-controller matrix in empty-Hero and custom-Hero states

Current included results:

- JavaScript syntax: PASS
- static workflow contracts: **21/21 PASS**
- single-runtime bootstrap fixture: **PASS**
- browser DOM/controller matrix: **6/6 PASS**, zero console/page errors
- local V45 overlay installer fixture: **PASS**

The execution sandbox cannot resolve the external jsDelivr/Three.js CDN inside Chromium, so a production WebGL + real GLB/HDRI acceptance pass still has to be run after deployment. See `docs/V46A_VALIDATION_REPORT.md`.

## Main files

- `src/v46/bootstrap.js` — standalone single-runtime bootstrap
- `src/v46/local-bootstrap.js` — same architecture for a full local repository
- `src/v46/polish-controller.js` — control ownership, camera framing and UI behavior
- `css/v46.css` — V46A visible workflow layer
- `docs/V46A_WORKFLOW_IMPLEMENTATION.md` — implementation detail
- `docs/V46A_VALIDATION_REPORT.md` — validation and remaining real-browser gate
