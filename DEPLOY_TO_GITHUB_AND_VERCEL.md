# Deploy MEMENTO VisualRef V44

## GitHub / Vercel

1. Extract `MEMENTO_VISUALREF_V44.zip`.
2. Upload every file and folder inside `MEMENTO_VISUALREF_V44` to the repository root.
3. Commit the replacement as `V44 · GLB + WORLD/LOCAL GIZMO`.
4. Let Vercel redeploy from the connected repository.

For a new Vercel project:

- Framework preset: **Other**
- Build command: empty
- Output directory: empty
- Install command: empty

`vercel.json` redirects the root route to `render.html`; `index.html` keeps a browser fallback redirect.

## Important storage behavior

GLB, HDR and audio files are persisted in the current browser's IndexedDB. They are not uploaded to GitHub or Vercel and do not automatically travel to another browser or device.

## V44 runtime acceptance

### Atomic Hero import

1. Open VIEWPORT and import a valid Hero GLB.
2. Confirm `STAGING` / `VALIDATED` / ready feedback.
3. Confirm the Hero is framed and enters **CALIBRATE**.
4. Attempt to replace it with a malformed file.
5. Confirm the valid Hero stays active and reload still restores it.

### Environment import

1. Import a real Environment GLB.
2. Confirm its native scale and origin are retained.
3. Use Frame Selected before judging a very large or distant asset.
4. Test Move, Rotate, XYZ Scale, Ground and Reset.
5. Reload and navigate between all workspaces.

### Gizmo grammar

1. Select Hero, Environment and Prop by clicking them in the canvas and in the Outliner.
2. Test Select, Move, Rotate, Scale and Pivot.
3. Test World and Local for Move, Rotate and Pivot.
4. Confirm Scale follows local object axes.
5. Enable Snap and test each configured increment.
6. Lock Position, Rotation, Scale and Pivot separately.
7. Lock the entire node and confirm selection/frame still work but mutation does not.

### Pivot invariance

1. Import an asset with a bad origin.
2. Enter Pivot and move the handle.
3. Confirm the visible model does not jump.
4. Test Origin, Centre, Bottom and Top presets.
5. Confirm one Undo restores both pivot and compensated transform.
6. Confirm one Redo reapplies both.

### Hero Shot / Calibrate separation

1. In **SHOT**, edit START, BOTH and END through Move/Rotate/Scale.
2. Enter **CALIBRATE** and correct the persistent asset placement.
3. Confirm Calibrate does not rewrite START/END.
4. Press Pivot while in Shot and confirm V44 switches to Calibrate automatically.

### Shared scene

1. Create or update a Shot in RENDER.
2. Confirm the corrected Hero and Environment appear in RENDER.
3. Add the Shot to TIMELINE.
4. Confirm TIMELINE uses the same corrected scene.
5. Reload and repeat the route changes.

### Timeline regression

1. Apply a sequence recipe.
2. Move a Shot between V1–V3.
3. Trim both edges, Blade and Slip.
4. Make one linked clip unique.
5. Lock/hide video and mute audio tracks.
6. Add marker, FX and audio.
7. Set IN/OUT and export WebM Playblast where supported.
