# MEMENTO VisualRef V47A — Delta + Limbo Foundation

V47A restores the product grammar that made VisualRef understandable:

- **Viewport = State** — establish the Hero and its world.
- **Render = Delta** — generate controlled alternatives without destroying the current shot.
- **Timeline = Curve** — accept shots and assemble a sequence.

This release is intentionally narrow. It does not add another broad layer of features; it makes the core generation loop visible, reversible and visually credible.

## What changed

### 1. Numeric Delta is authoritative

Render now exposes one visible **Target Δ** value from `05` to `95`.

Near, Balanced and Bold still exist internally as generation profiles, but they are derived from the requested number rather than competing with it:

- `05–27` → Near
- `28–68` → Balanced
- `69–95` → Bold

The same Target Delta is shown in the Render editor, the Player and the Timeline creation bar.

### 2. Current / Previous / Candidate workflow

Generating a variant no longer mutates the active shot.

V47A:

1. snapshots the current shot;
2. runs seeded, lock-aware generation on a private clone;
3. measures the resulting distance;
4. keeps Current untouched;
5. exposes Current, Previous and Candidate review;
6. applies Candidate only after **Accept**.

The review console reports:

- Target Delta;
- Actual Delta;
- requested/resolved seed;
- derived profile;
- changed categories;
- locked categories.

Accept replaces the current shot in one committed history action. Regenerate advances the seed. Discard removes only the pending candidate.

### 3. Real procedural cyclorama

The built-in black void / flat plane presentation is replaced by a seamless curved stage:

- Grey Limbo — default neutral baseline;
- White Limbo — catalogue / bright product baseline;
- Black Limbo — premium silhouette / rim-light baseline;
- Void — explicit empty-world choice.

The recipe coordinates surface colour, background, exposure and conservative light multipliers without moving the Hero or Camera. A procedural contact shadow follows the Hero bounds. Imported custom environments remain authoritative and disable built-in recipe switching.

### 4. Cleaner workspace hierarchy

The V47A stylesheet retains the existing architecture and functions, but restores a quieter V36C-inspired hierarchy:

- the image is the dominant surface;
- Render starts with Delta, then the persistent Start / End matrix;
- Viewport keeps World Stack and Properties available together on desktop;
- the Viewport dock contains the everyday transform and framing actions;
- property search filters the current inspector;
- Timeline uses the same candidate transaction before adding a shot.

## Direct Vercel deployment

Upload the contents of this folder to a clean repository or directly to Vercel. The root route opens `viewport.html`.

The standalone package loads the frozen V45 runtime from commit:

```text
48ff1e50424da0a0546ade9039f00368073f56f2
```

It then installs the local V46 ownership corrections and the local V47A foundation. A network connection is required for the pinned base runtime and Three.js modules.

## Install into a complete local VisualRef repository

```bash
node scripts/install-v47a.mjs /absolute/path/to/visualref
```

The installer:

- validates the target repository;
- creates `_backup_before_v47a/`;
- copies the V46 compatibility and V47A source modules;
- adds V47A styles and documentation;
- changes workspace pages to the local V47A bootstrap;
- preserves Viewport as the root route.

Then run:

```bash
npm run check
npm run check:v47a
```

## Validation

Run the complete offline release gate:

```bash
npm run validate
```

The release gate includes:

- JavaScript syntax checks;
- package and manifest integrity;
- deterministic Delta tests;
- Target Δ 10 / 45 / 82 progression;
- lock and exclusion tests;
- six browser-controller scenarios: Viewport, Render and Timeline with both empty/proxy and custom-Hero states.

The final offline result is **6 / 6 browser scenarios passing** with no console or page errors.

## Main files

- `src/v47/delta-engine.js` — deterministic, source-safe candidate engine
- `src/v47/foundation-controller.js` — Delta UI, World Recipes and workspace hierarchy
- `css/v47.css` — V47A interface system
- `scripts/install-v47a.mjs` — local repository installer
- `docs/V47A_IMPLEMENTATION.md` — implementation contract
- `docs/V47A_VALIDATION_REPORT.md` — passed and pending acceptance
- `docs/V36C_V47A_DONOR_MAP.md` — what was retained from V36C and what was rejected
- `V47_GOALS.md` — full V47 roadmap

## Scope boundary

This is the first runnable V47 vertical slice, not the entire V47 roadmap.

Still outside this package:

- formal schema version 47 and migrations from every legacy project;
- full native absorption of the V46 overlay into workspace classes;
- production visual QA with real GLB, HDRI and audio assets;
- final GPU/performance budgets;
- complete Variant Bin and sequence-recipe workflow.

Those remain subsequent V47 milestones rather than being hidden behind a misleading “complete” label.
