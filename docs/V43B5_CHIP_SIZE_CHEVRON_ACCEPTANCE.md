# MEMENTO VisualRef V43B.5 — Chip Size & Chevron Interaction Acceptance

## Delivered
- Increased creative option chip width and overall visual breathing room.
- Increased option label size and tracking.
- Preserved horizontal label-first chip structure.
- Replaced Start/End endpoint glyphs with pure chevrons.
- Removed the `=` glyph from the Both state.
- The Both interaction is now communicated through a white top/bottom outline treatment rather than an explicit symbol.
- Preserved category locks, exclusion pool logic, Start/Both/End assignment logic, and generation behavior.

## Interaction grammar
- Left area: Start only.
- Center area: Both Start and End.
- Right area: End only.
- Hover teaching colors remain teal / white / orange.

## Validation
- Core smoke suite passed after the change.
- Shared state, timeline monitor, viewport, linked clips, exclusion pools, and locks remain intact.
