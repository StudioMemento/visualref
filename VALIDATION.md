# V43C-R1 Validation

## Automated checks

- Every JavaScript module passes `node --check`.
- `npm test` passes the full functional smoke suite.
- All local CSS and JavaScript references from `index.html`, `render.html`, `viewport.html` and `timeline.html` resolve to files in the repository.

## Smoke coverage

- Creative defaults, START/BOTH/END writes, locks and option pools.
- Shot generation, duplication, interpolation, delta and undo/redo.
- Hero normalization and native Environment transforms.
- GLB/HDRI scene state and viewport camera independence.
- Linked clips, left trim, blade, unique shots and track locking.
- Timeline markers, FX clips, audio clips and sequence recipes.

## Manual deployed-browser pass

Use `DEPLOY_TO_GITHUB_AND_VERCEL.md` for the runtime acceptance checklist. Real GLB/HDRI import, WebGL presentation, Web Audio and MediaRecorder depend on browser capabilities and must be verified in the deployed browser.
