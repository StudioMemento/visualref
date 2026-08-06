# V43B.1 Timeline Monitor Acceptance

## Correction

Timeline no longer renders Start and End stills above the sequence player. Its left 50% is one monitor with two tabs:

1. **PLAYER** — frame-authoritative sequence playback using the Shot Camera.
2. **VIEWPORT** — the same evaluated sequence scene viewed through the independent Editor Camera.

## Preserved

- Render keeps Start/End stills plus Live Interpolation.
- Viewport keeps 50/30/20 layout and transform gizmos.
- Timeline remains 50% monitor / 50% timeline.
- The same scene, assets, playhead and project clock are shared.

## Timeline Viewport controls

- Orbit: left drag.
- Pan: right/middle drag.
- Zoom: wheel/pinch.
- Frame selected.
- Frame all.
- Grid toggle.
- Helpers toggle.

The Timeline Viewport does not expose transform gizmos; direct object correction remains in the Viewport workspace.

## Regression gate

- Switching Player ↔ Viewport does not change the playhead.
- Viewport camera movement does not modify the Shot Camera.
- Timeline playback continues to evaluate the same sequence in either monitor mode.
- Clicking the stage toggles playback only in Player mode.
- Reload restores the selected Timeline monitor mode and Editor Camera.
