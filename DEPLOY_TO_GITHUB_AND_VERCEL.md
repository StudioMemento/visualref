# Deploy V43A.1 through GitHub and Vercel

This repository is a static site. It requires no package installation and no build command.

## 1. Upload to GitHub

1. Create a new empty GitHub repository.
2. Extract this ZIP.
3. Open the extracted folder.
4. Upload **all files and folders inside it** to the root of the GitHub repository.
5. Commit the files to `main`.

The repository root must contain:

```text
index.html
render.html
viewport.html
timeline.html
vercel.json
css/
src/
docs/
```

Do not upload the ZIP itself as the only repository file.

## 2. Connect the repository to Vercel

1. In Vercel choose **Add New → Project**.
2. Import the GitHub repository.
3. Framework Preset: **Other**.
4. Root Directory: leave empty / repository root.
5. Build Command: leave empty.
6. Output Directory: leave empty.
7. Install Command: leave empty.
8. Deploy.

## 3. Open the workspaces

The root domain redirects to Render.

```text
/
/render.html
/viewport.html
/timeline.html
```

## 4. What to report after deployment

Check these eight points:

1. The Player is visible and does not start black.
2. Render is 50% Player and 50% Editor.
3. Start and End stills appear above the live Render/Timeline Player.
4. Viewport reads as 50% Viewport, 30% Outliner and 20% Inspector.
5. Timeline is 50% Player and 50% full-height Timeline.
6. Creative axis options preserve independent Start and End states.
7. A Shot can be added to Timeline as a linked V1 clip.
8. Refreshing preserves the project state.

The current V43A.1 renderer tries the pinned Three.js CDN build and automatically uses a visible Canvas fallback if that request is unavailable. Real GLB and HDRI ingestion begins in V43B.
