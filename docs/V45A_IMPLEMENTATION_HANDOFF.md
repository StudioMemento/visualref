# MEMENTO VisualRef V45A — First Integration Build

## Purpose
V45A is the first **integration** build after the V45 freeze. It deliberately does not redesign the visible UI and does not claim Product Vis scene calibration is complete.

It implements the roadmap's Phase 1 bridge:

- schema-45 project factory;
- strict Scene / Shot / Timeline ownership checks;
- one-Hero invariant;
- Motion Off default;
- linked Shot clips and Make Unique without Scene cloning;
- monotonic clip retime data;
- read-only V44 → V45 adapter with preset quarantine;
- renderer ownership guard;
- runtime diagnostics;
- dev-only overlay bootstrap;
- donor-signature-safe installer;
- automated V45 core and migration smoke tests.

## Safety contract
The installer only accepts `memento-visualref-v44@44.0.2` and a bootstrap containing the expected V44 runtime signature. It refuses any other donor.

V45A is disabled by default. Enable it with either:

```text
?v45a=1
```

or browser local storage:

```text
memento-v45a-dev = 1
```

When enabled, the current V44 UI/renderer still owns production mutations. V45A exposes a read-only schema-45 view at:

```js
globalThis.__MEMENTO_V45A__
```

This is intentional. The first bridge proves migration and ownership before moving domain writes.

## Install into donor
Copy this package's `src/v45/`, `tests/`, and `scripts/` folders into the frozen V44.0.2 repository, then run:

```bash
node scripts/install-v45a.mjs
npm run check
```

## Acceptance for V45A
V45A passes when:

1. existing V44 checks still pass;
2. V45 core contract smoke passes;
3. V44→V45 migration smoke passes;
4. opening without `?v45a=1` behaves exactly like V44;
5. opening with `?v45a=1` exposes one schema-45 read view without creating a second renderer;
6. the adapted project has at most one Hero entity;
7. Timeline clip operations do not create Scene entities;
8. legacy preset IDs are quarantined rather than becoming active V45 authority.

## Deliberately deferred
- real persistence write migration;
- routing production commands through V45;
- replacing `new RendererService(...)` with RendererAuthority in the live Player;
- real asset transaction integration;
- browser GLB/HDRI acceptance;
- Product Vis calibration UI;
- procedural Stage / Backplate;
- new Render categories;
- motion primitives and speed-ramp UI.

Those are V45B / Phase 1 completion and Phase 2 work, after this bridge passes in the deployed browser.
