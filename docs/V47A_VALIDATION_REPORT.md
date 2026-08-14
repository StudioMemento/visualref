# MEMENTO VisualRef V47A — Validation Report

**Build:** V47A Delta + Limbo Foundation  
**Validation date:** 2026-08-14  
**Frozen base commit:** `48ff1e50424da0a0546ade9039f00368073f56f2`

## 1. Automated release gate

Run:

```bash
npm run validate
```

The command executes syntax, static package, deterministic Delta and offline browser-controller tests.

## 2. JavaScript and package checks

Passed:

- V46 standalone and local bootstraps;
- V46 polish controller;
- V47A standalone and local bootstraps;
- V47A Delta engine;
- V47A foundation controller;
- V47A installer;
- Vercel JSON parsing;
- root route to Viewport;
- stylesheet order: V46 before V47A;
- frozen V45 commit pin on all workspace pages;
- package manifest hashes.

## 3. Delta engine checks

Passed results:

```json
{
  "low": 10,
  "mid": 43,
  "high": 80,
  "deterministic": true,
  "locked": true
}
```

The unit suite verifies:

- candidate generation does not mutate Current;
- same Current + Target + seed reproduces the same Candidate;
- Target Δ 10, 45 and 82 produce increasing measured distance;
- locked Camera state remains unchanged;
- numeric axes owned by a locked creative category remain unchanged;
- excluded creative options do not appear;
- changed-category reporting is populated.

## 4. Offline browser-controller matrix

Six scenarios execute in headless Chromium:

1. Viewport — empty/proxy Hero slot;
2. Viewport — custom Hero mounted;
3. Render — empty/proxy Hero slot;
4. Render — custom Hero mounted;
5. Timeline — empty/proxy Hero slot;
6. Timeline — custom Hero mounted.

**Result: 6 / 6 PASS.**  
**Console errors: 0.**  
**Page errors: 0.**

### Viewport assertions

- V47A installed and branded;
- Viewport → Render → Timeline navigation order;
- honest proxy suppression state;
- Grey Limbo default;
- built-in World choice locked to Limbo;
- technical helpers disabled by default;
- renderer World patch installed;
- World Recipe panel and four presets;
- property search;
- Pivot and Ground in the player dock;
- World / Local switching;
- recipe state changes.

### Render assertions

- Delta console and Player Delta instrument;
- old profile control hidden;
- persistent Start / End matrix;
- Candidate created without changing Current;
- Actual Delta reported;
- Candidate renderer preview;
- deterministic same-seed regeneration;
- Previous Candidate retained;
- Accept is one committed history action;
- Candidate clears after Accept;
- Current changes only after Accept;
- Camera group lock is respected.

### Timeline assertions

- candidate-aware creation bar;
- Target Delta instrument;
- Candidate status badge;
- empty-state guidance;
- Generate Candidate preserves Current;
- Candidate preview routes through the shared renderer;
- Accept promotes Candidate;
- accepted/current shot can be added to the selected track;
- Timeline library opens on first empty sequence.

## 5. Production browser acceptance still required

The execution environment blocks direct localhost navigation and external CDN runtime loading. The following real-runtime scenarios remain pending:

### Renderer and assets

- [ ] cold Vercel boot using the pinned base runtime;
- [ ] real Three.js WebGL initialization;
- [ ] curved cyclorama normals from front, side, top and macro cameras;
- [ ] no visible floor/wall seam at 16:9, 9:16, 1:1 and 2.39:1;
- [ ] contact shadow on real GLB bounds;
- [ ] White Limbo highlight retention;
- [ ] Black Limbo silhouette and rim readability;
- [ ] imported Environment suppresses the procedural stage;
- [ ] HDRI lighting/background independence;
- [ ] exact Hero and Camera transform preservation across recipe changes.

### Persistence and history

- [ ] Candidate survives Render → Timeline → Render navigation in production IndexedDB;
- [ ] Current / Previous / Candidate survive save, close and reopen;
- [ ] Accept and Undo restore the exact previous Current shot;
- [ ] large repeated candidate sessions remain within storage and memory budgets;
- [ ] legacy V45/V46 project migration preserves assets and links.

### Input and performance

- [ ] 1440p, 1920p and ultrawide desktop layouts;
- [ ] Safari desktop;
- [ ] iPhone Safari;
- [ ] Android Chrome;
- [ ] mouse, trackpad and touch Delta controls;
- [ ] UI responsiveness during large GLB decode;
- [ ] reduced-motion behavior;
- [ ] keyboard focus order.

## 6. Release decision

V47A passes the complete offline structural, deterministic-generation and controller acceptance gate.

It is ready for deployment-based WebGL acceptance as the first runnable V47 product slice. It is not presented as completion of the full V47 roadmap: formal schema 47 migration, native V46 absorption and final production GPU validation remain subsequent milestones.
