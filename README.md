# MEMENTO VisualRef V43A Foundation

GitHub/Vercel-ready checkpoint for the shared VisualRef application foundation.

## Deploy

No local server, package installation, or build step is required for deployment.

Read:

```text
DEPLOY_TO_GITHUB_AND_VERCEL.md
```

## Vercel configuration

- Framework preset: `Other`
- Root directory: repository root
- Build command: empty
- Output directory: empty
- Install command: empty

The root URL opens `render.html` automatically.

## Entry pages

```text
/render.html
/viewport.html
/timeline.html
```

## Implemented

- one canonical project state;
- IndexedDB autosave and recovery snapshot;
- BroadcastChannel workspace synchronization;
- command-based mutations and undo/redo;
- one shared Player across all workspaces;
- Start / Both / End editing;
- Delta calculation;
- deterministic Shot variants;
- direct Viewport proxy transforms;
- linked Timeline clips and sequence evaluation;
- desktop, tablet and mobile layouts.

## Renderer boundary

V43A is an architecture checkpoint. It loads a pinned Three.js proxy from jsDelivr and falls back to a visible Canvas renderer if the CDN cannot be reached. V43B adds local Three.js loaders, Hero GLB, Environment GLB, HDRI, pivot correction and binary asset persistence.
