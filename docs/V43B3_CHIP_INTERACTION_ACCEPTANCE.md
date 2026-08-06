# MEMENTO VisualRef V43B.3 — Chip Interaction Polish Acceptance

## Delivered
- Reworked creative option chips to a clear 3-zone interaction layout.
- Added explicit Start / Both / End assignment controls directly inside every option chip.
- Applied 30 / 40 / 30 proportional split for the interaction zones.
- Added hover teaching colors:
  - Start = teal
  - Both = neutral / white
  - End = orange
- Increased option label breathing room and tracking for a cleaner premium read.
- Preserved category locks and generation-pool exclusion controls.

## Interaction behavior
- Left chevron assigns the option to Start only.
- Center equal-sign assigns the option to both Start and End.
- Right chevron assigns the option to End only.
- Clicking the main option label still applies to the current global edit scope.

## Regression status
- Core smoke tests passed after the change.
- Timeline monitor, viewport, locks, exclusions, and linked shot behaviors remain intact.
