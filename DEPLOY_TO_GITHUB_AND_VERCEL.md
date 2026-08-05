# Deploy V43B to GitHub and Vercel

1. Extract the ZIP.
2. Delete the old repository contents, except `.git` when working locally.
3. Upload **all files inside this folder** to the GitHub repository root.
4. Commit the replacement.
5. Vercel redeploys automatically.

No framework, package installation, build command or output directory is required.

After deployment, clear the browser cache once or open a private window. Existing V43A.1 project state is migrated in place. Binary GLB/HDRI assets are stored per browser in IndexedDB and therefore do not travel through GitHub.

## Deployment acceptance

- Render, Viewport and Timeline boot without a black screen.
- Import a Hero GLB in Viewport.
- Orbit without changing the Shot Camera.
- Use Translate/Rotate/Scale gizmos.
- Correct pivot/orientation in Inspector.
- Import Environment GLB and HDRI.
- Return to Render: Start and End stills show the real scene.
- Add a Shot to Timeline: sequence Player shows the same scene.
- Reload: assets and transforms recover from IndexedDB.
