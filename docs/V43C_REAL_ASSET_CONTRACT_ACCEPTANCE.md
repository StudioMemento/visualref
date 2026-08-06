# MEMENTO VisualRef V43C — Real Asset Contract Acceptance

## Hero contract

- Hero GLBs are camera-normalized rather than normalized by an arbitrary world-unit size.
- The reference contract is 38° FOV, 5.5 camera distance and 58% target frame coverage.
- Different source bounding radii resolve to the same normalized camera-relative radius.
- Subject Size and manual Subject Scale are applied after normalization.
- Camera safety still prevents the Shot Camera from entering the Hero bounds.
- Pivot, import orientation, correction scale and ground offset remain non-destructive.

## Environment contract

- Environment GLBs preserve native scale and origin.
- Environment assets are never normalized to the Shot Camera.
- Position XYZ, rotation XYZ and scale XYZ are editable through the Inspector and transform gizmos.
- Pivot XYZ, correction rotation, correction scale and ground offset are editable and persistent.
- Optional Auto Ground does not enable camera normalization.

## Persistence

- Hero, Environment, Props and HDRI binaries remain stored in IndexedDB.
- Project state stores asset references, transforms, corrections and selected workspace state.
- Reload normalization migrates earlier V43 states into the V43C contract.

## Regression validation

- Core smoke suite passed.
- JavaScript syntax audit passed.
- Relative import audit passed.
- CSS parser audit passed.
- Static HTML entry audit passed.
