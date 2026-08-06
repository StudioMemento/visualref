# Deploy VisualRef V43C-R1 Core Rebuild

1. Extract the ZIP.
2. Open the extracted repository folder.
3. Upload every file and folder inside it to the root of the GitHub repository.
4. Commit the replacement as `V43C-R1 CORE REBUILD`.
5. Let Vercel redeploy from the connected repository.

For a new Vercel project:

- Framework preset: **Other**
- Build command: leave empty
- Output directory: leave empty
- Install command: leave empty

The root route redirects to `render.html` through `vercel.json`.

## Runtime acceptance pass

### RENDER

1. Create and duplicate shots.
2. Change a shot family and preset.
3. Edit Lens, Camera, Light, Environment and Motion Design on START and END.
4. Confirm the viewport changes visibly.
5. Lock an axis, exclude an option and generate Near / Balanced / Bold variants.
6. Add the shot to TIMELINE.

### VIEWPORT

1. Upload a Hero GLB and confirm predictable framing.
2. Upload an Environment GLB.
3. Edit position, rotation, scale and pivot.
4. Add an HDRI and optionally show it as background.
5. Reload and confirm the local binary assets and transforms return.

### TIMELINE

1. Apply a sequence recipe.
2. Move a shot between V1–V3.
3. Trim both clip edges, Blade it and Slip its source.
4. Make one linked clip unique.
5. Lock/hide a video track and mute an audio track.
6. Add a marker and an FX clip.
7. Import audio and verify waveform/playback.
8. Set IN/OUT and export a WebM Playblast.

Uploaded GLB, HDR and audio files live in that browser's IndexedDB and are not added to the Git repository.
