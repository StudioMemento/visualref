# Deploy MEMENTO VisualRef V45

## Replace the GitHub repository cleanly

1. Download and extract `MEMENTO_VISUALREF_V45.zip`.
2. Open the existing GitHub repository.
3. Remove the old application files from the repository root, while retaining repository settings and any intentional legal files.
4. Upload every file and folder **inside** `MEMENTO_VISUALREF_V45` to the repository root.
5. Commit the replacement as:

```text
V45 · Product Vis reset
```

The V45 package contains fewer than 100 files, so GitHub's web uploader should accept the full root in one pass. A local Git clone remains safer because it preserves deletions and folder structure exactly.

## Local Git method

From a clean clone of the correct repository:

```bash
git checkout -b v45
```

Delete the old tracked application files, copy the contents of the extracted V45 folder into the repository root, then run:

```bash
npm run check
git add -A
git commit -m "V45 · Product Vis reset"
git push -u origin v45
```

Open a pull request or merge the branch only after the deployed acceptance pass.

## Vercel settings

Use a static deployment:

```text
Framework preset: Other
Root directory: repository root
Build command: none
Output directory: none
Install command: none required
```

`vercel.json` supplies the clean routes and static headers.

Primary URLs:

```text
/render.html
/viewport.html
/timeline.html
```

The root redirects to Render.

## Important runtime requirement

Three.js and its official loaders are imported from jsDelivr. The deployed browser must have network access to that CDN. Add `?fallback=1` to a workspace URL only for layout/state review; it intentionally disables real WebGL asset work.

## V45 deployment acceptance

### Shell and ownership

- V45 appears in the header and boot screen.
- Render, Viewport and Timeline are the only primary workspace destinations.
- Undo/Redo use one shared history.
- only one Player and one WebGL renderer are created.
- workspace splitter positions survive reload.

### Viewport

- valid Hero GLB imports atomically;
- invalid replacement leaves the current Hero active;
- reference dimension, reference axis and unit calibrate the Hero;
- Environment retains native authoring scale;
- Move/Rotate obey World and Local;
- Scale remains object-local;
- Pivot does not move visible geometry;
- Frame and Ground work;
- CALIBRATE remains the default Hero mode;
- EDIT SHOT STATE changes Shot state only when deliberately enabled.

### Render

- Player remains visually dominant;
- all nine macros remain visible;
- selecting a macro opens precision inline;
- Start, Both and End chip assignments are readable;
- Live, Start, End and Compare work;
- Motion starts Off and Energy at zero;
- Variation changes unlocked creative decisions;
- Add to Timeline creates a linked Shot clip.

### Timeline

- GFX/FX, V3, V2, V1, A1 and A2 are present;
- Shot clips remain linked until Make Unique;
- move, trim, split, snap and Slip do not alter the scene;
- audio waveform is visible;
- markers persist;
- Recipes and Library remain secondary drawers;
- Player and playhead remain synchronized;
- mobile pan does not accidentally move the playhead.

### Persistence

- reload preserves the project, semantic nodes, Shots and clips;
- uploaded binaries are restored from IndexedDB;
- route switching does not duplicate assets or renderers;
- an unavailable binary is reported rather than silently replaced.

Do not mark the deployment production-ready until the real asset matrix in `VALIDATION.md` has passed.
