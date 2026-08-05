# MEMENTO VisualRef V43A Foundation — Acceptance Report

**Checkpoint:** V43A Foundation  
**Purpose:** Prove one shared workflow across Render, Viewport and Timeline before introducing production GLB/HDRI asset ingestion.

## Result

**AUTOMATED FOUNDATION GATE: PASS**

V43A is suitable for hands-on browser testing and for use as the base of V43B Real Scene.

## Delivered architecture

- Three dedicated entry pages: `render.html`, `viewport.html`, `timeline.html`.
- One shared Project Store and schema.
- One shared Command Bus and undo/redo History Service.
- IndexedDB persistence with a localStorage recovery snapshot.
- BroadcastChannel synchronization across open workspace tabs.
- One shared Player and transport grammar.
- Start / Both / End editing scopes.
- Computed per-axis Delta values.
- Deterministic Shot families, presets and generation intensity.
- Fixed Timeline grammar: GFX/FX, V3, V2, V1, A1, A2.
- Linked Shot clips whose evaluated sequence state derives from their source Shot.
- Responsive desktop, tablet and mobile shells.
- Real Three.js renderer service boundary with a calibrated proxy scene.
- Visible Canvas fallback when the pinned Three.js module cannot load, preventing a black boot screen.

## Automated verification

### JavaScript syntax

- 17 source modules checked with `node --check`.
- Result: PASS.

### Import integrity

- 17 JavaScript files scanned.
- Missing relative imports: 0.
- Result: PASS.

### Core behavior smoke suite

The following behaviors passed:

1. Start-scope edits update only Start.
2. End-scope edits update only End.
3. Timeline clips are linked to their source Shot.
4. Shot links survive deterministic generation.
5. Shot evaluation resolves correctly at Start.
6. Shot evaluation resolves correctly at End.
7. Sequence evaluation resolves a linked Timeline clip.
8. Delta is computed from Start and End values.
9. Undo restores the previous Shot state.
10. Redo restores the generated Shot state.

Result: `V43A CORE SMOKE · PASS`.

### Entry-page integrity

- `index.html`: PASS.
- `render.html`: PASS.
- `viewport.html`: PASS.
- `timeline.html`: PASS.

Each workspace entry imports the same application bootstrap.

### Package hygiene

- Zero-byte files: 0.
- Unresolved `TODO`, `FIXME`, placeholder, or “not implemented” markers in application code: 0.
- Misleading unsupported left-trim control removed from the Timeline before packaging.
- Result: PASS.

## Browser verification status

A local HTTP server successfully served the package and responded to HTTP requests. Full visual automation could not be completed inside the current execution environment:

- the available headless Chromium process did not complete navigation;
- Playwright navigation to local HTTP and local file URLs was blocked by the environment administrator;
- no `agent-browser` executable was available.

This is an environment limitation, not a claimed visual pass. The package therefore still requires the intended hands-on browser acceptance test on the user’s machine or deployment.

## Known V43A boundary

V43A proves architecture and shared behavior. It does **not** yet provide production asset ingestion.

Deferred to V43B:

- Hero GLB upload and parsing;
- Environment GLB upload and parsing;
- secondary prop GLBs;
- local vendoring of Three.js and loaders;
- HDRI upload and PMREM processing;
- production pivot correction and ground alignment;
- persisted binary asset catalogue;
- WebM playblast capture.

The current renderer imports a pinned Three.js module from jsDelivr and degrades to a visible Canvas proxy when unavailable. V43B must vendor Three.js and its loaders locally so production rendering has no runtime CDN dependency.

## Manual acceptance sequence

Run `START_V43A.bat` on Windows or serve the folder with any static HTTP server. Then verify:

1. Open Render and confirm the proxy scene is visible immediately.
2. Change Start values and confirm End remains unchanged.
3. Change End values and scrub between them.
4. Use Both and confirm both endpoints receive the edit.
5. Generate a deterministic variation and test undo/redo.
6. Open Viewport in a second tab and confirm the active Shot synchronizes.
7. Change a transform in Viewport and confirm Render receives it.
8. Add the Shot to Timeline and confirm a linked clip appears.
9. Move and right-trim the clip.
10. Edit the source Shot and confirm Timeline playback evaluates the new Shot state.
11. Reload the browser and confirm project recovery.
12. Test narrow/mobile layout and the workspace navigation.

## Gate decision

Proceed to **V43B Real Scene** only after the manual sequence above passes in a normal browser.
