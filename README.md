# MEMENTO VisualRef V47R — Core Recovery

V47R restores VisualRef around one continuous creative loop:

**Build the World → Create the Shot → Generate through Delta → Direct the Curve**

This package is ready to upload to Vercel with `index.html` at the archive root.

## What changed

- One persistent application shell for Viewport, Render and Timeline.
- One Project Store, one Command Bus, one History Service and one Renderer instance.
- Workspace switching changes context without reloading the application or the Hero.
- V47 Candidate generation is now a native command transaction: Current remains untouched until Accept.
- Grey, White, Black and Void world recipes share one fixed world-zero ground.
- The cyclorama no longer follows a floating Hero; one-time visual-truth recovery grounds the Hero and reframes the editor camera per imported asset.
- Viewport exposes a guided Import → Ground → Scale → Orient → World path without blocking direct editing.
- Render puts Target Delta, Current/Candidate/Previous review and Accept/Discard next to the image.
- Timeline remains the owner of time and opens selected shots back in Render instead of duplicating the shot editor.
- Existing `/viewport.html`, `/render.html` and `/timeline.html` links redirect into the persistent shell.

## Deploy

1. Upload the contents of this package to a Vercel project.
2. Use the default static deployment settings. No build command is required.
3. Open `/`, `/viewport`, `/render` or `/timeline`.

## Validation

Run locally from the project root:

```bash
npm run validate
```

The validation suite checks syntax, deterministic Delta behavior, Current-safe Candidate acceptance, fixed world-zero ground, one Renderer construction site, absence of MutationObserver UI patching, absence of prototype monkey-patching, workspace continuity, ultrawide containment and mobile layout.

See `docs/V47R_VALIDATION_REPORT.md` for the exact results and remaining live-environment checks.

## Source strategy

V47R uses:

- the frozen V45 native architecture as the runtime foundation;
- the V47A Delta transaction as a logic donor;
- V30 only as the behavioral reference for Start/End, Delta and sequence clarity.

Production loads the frozen V45 modules and native V45 CSS from commit `48ff1e50424da0a0546ade9039f00368073f56f2`, plus Three.js `0.160.0`, through pinned CDN URLs. V46 and V47 overlay controllers are not loaded.

## Acceptance mode

Appending `?mock=1` starts the dependency-free acceptance fixture used by the automated browser suite. It is a testing mode, not the production renderer.
