# MEMENTO VisualRef V46A — Validation Report

**Build:** V46A Working Workflow

**Frozen base commit:** `48ff1e50424da0a0546ade9039f00368073f56f2`

## 1. Automated result

### `npm run check`

PASS.

Coverage:

- `bootstrap.js` syntax
- `local-bootstrap.js` syntax
- `polish-controller.js` syntax
- installer syntax
- 21 static workflow contracts

The static contracts verify, among other things:

- exactly one PlayerController is created by each V46A bootstrap;
- neither V46A bootstrap imports the page-scoped legacy app bootstrap;
- workspace navigation is intercepted and switched with History API;
- the same RendererService is retained while workspace controllers change;
- the renderer is initialized once with Viewport capabilities;
- all route documents include the Render editor CSS required for in-place workspace switching;
- the full eleven-button Viewport dock exists;
- Outliner + searchable Properties are permanent Viewport editor surfaces;
- Render has the three requested monitor modes;
- numeric Delta is present and qualitative generation mode is hidden;
- camera-owned framing logic is installed;
- Subject translation/scale/pitch/roll are stabilized;
- Subject Rotation remains authoritative;
- auto-ground, zero pivot and XYZ helper exist;
- Start / Both / End option zones remain visible;
- Render scope/navigation stays outside the scrollable property stack.

**Result: 20 / 20 PASS.**

## 2. Single-runtime bootstrap fixture

`npm run check:runtime`

PASS.

This test executes the **actual V46A bootstrap logic** against browser-side service mocks, then performs `Viewport → Render → Viewport`. It verifies that:

- only one PlayerController is constructed;
- the RendererService object identity does not change;
- the renderer `loadedAssets` Map object does not change;
- the mounted Hero asset record remains the same object;
- only the workspace controller is disposed/recreated;
- navigation uses History API instead of document navigation.

This is the direct regression test for the V36C-style smooth-workspace architecture.

## 3. Browser DOM/controller matrix

`npm run check:browser`

PASS.

The Playwright fixture executes Viewport, Render and Timeline in both states:

1. no custom Hero mounted;
2. custom Hero mounted.

**Result: 6 / 6 PASS. Zero console errors. Zero page errors.**

The Render fixture additionally mutates the old inherited fields on purpose and verifies V46A repairs them:

- View cannot change Subject Rotation;
- View cannot leave Subject translation or scale behind;
- non-Subject precision cannot change Subject Rotation;
- Subject Rotation itself still works;
- generated variants resolve back to Subject Rotation authority;
- generated variants leave Subject translation and scale grounded/neutral.

## 4. Source-level V36C / V45 comparison

The source comparison confirms the runtime diagnosis:

- V36C switches modes inside one document and keeps the renderer alive.
- Frozen V45 creates PlayerController per page and PlayerController owns/disposes RendererService.
- RendererService itself already avoids duplicate asset loading when the asset revision is unchanged and the ID exists in `loadedAssets`.

V46A therefore fixes the ownership boundary instead of adding another asset cache.

## 5. Browser limitation of this artifact environment

A true networked WebGL acceptance run could not be executed here because Chromium in the artifact sandbox cannot resolve the external jsDelivr/Three.js resources and local HTTP navigation is administratively blocked.

This means the following remain **deployment gates**, not claimed passes:

- real Three.js WebGL boot on Vercel;
- production Hero GLB import and IndexedDB restore;
- verify the same Hero object remains mounted across Viewport → Render → Viewport;
- Environment GLB and HDRI restore;
- TransformControls on a real imported model;
- Ground and zero pivot with several badly-authored origins;
- real Start / End still capture;
- mobile/touch layout and gestures;
- Timeline end-to-end editing.

## 6. Minimum deployed acceptance

Before calling V46A production-accepted:

1. import the current car GLB in Viewport;
2. verify it grounds and frames correctly;
3. switch Viewport → Render → Viewport repeatedly and confirm there is no loading status, proxy flash or GLB remount;
4. generate Delta 10, 30, 60 and confirm the Hero stays physically grounded while camera framing changes;
5. set Subject Rotation to equal Start/End and confirm no hidden yaw offset remains;
6. verify Live, Live + Start/End and Viewport monitor modes;
7. verify all Start/Both/End option hit zones remain visible while the property list scrolls;
8. import an Environment/HDRI and repeat the workspace-switch test.

V46A is intended to be the first build that is simple enough to run this acceptance meaningfully.


## 7. Installer fixture

The V46A installer was also applied to a synthetic V45-shaped repository fixture. The test verified that it:

- creates `_v45_backup_before_v46a/`;
- copies the V46A stylesheet, controller and local single-runtime bootstrap;
- replaces page entry modules with `src/v46/local-bootstrap.js`;
- adds `check:v46a` to the target package;
- leaves the installed bootstrap/controller syntactically valid.

**Result: PASS.**
