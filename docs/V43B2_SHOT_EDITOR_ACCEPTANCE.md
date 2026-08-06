# MEMENTO VisualRef V43B.2 — Shot Editor Parity Acceptance

## Correction delivered

V43B.2 restores the missing V36C authoring controls without restoring V36C's monolithic runtime.

### Start / Both / End

- The global edit scope is permanently visible in Render.
- `START` writes only the Start endpoint.
- `END` writes only the End endpoint.
- `BOTH` writes both endpoints through one command and one undo step.
- Each creative option also exposes direct Start and End endpoint controls.
- Mixed selections remain visibly split cyan/orange.

### Category locks

- Every creative axis has a dedicated lock button on its category tile.
- A lock protects the axis during preset and variant generation.
- Manual editing remains available.
- Shared numerical controls remain locked while any owning creative category is locked.

### Per-option exclusion pools

- Every option has a visible pool include/exclude control.
- Exclusion affects generation only; it never removes the manual choice.
- Each axis shows `POOL allowed/total`.
- A reset action restores the complete pool for that axis.
- If all options are excluded, the axis behaves as generation-locked.

### Generation

- Near, Balanced and Bold are deterministic from Shot seed and iteration.
- Creative choices are generated from the allowed pool.
- Category locks and empty pools are respected.
- Numerical jitter also respects the locks created by creative categories.

## Automated validation

The smoke suite verifies:

1. Both-scope writes both creative endpoints.
2. Start-only and End-only writes remain isolated.
3. Category locks protect linked numerical axes.
4. Per-option exclusions persist in Shot state.
5. Excluded options remain manually selectable.
6. Variant generation selects only from allowed options.
7. An empty pool behaves as a generation lock.
8. Axis pool reset restores all options.
9. Linked Timeline clips survive generation.
10. Undo and redo restore the complete Shot state.

Result: `V43B.2 CORE + LOCKS + EXCLUSION POOLS + TIMELINE MONITOR SMOKE · PASS`.

## DOM structure validation

The generated Render editor contains:

- 11 creative axis rows;
- 11 category locks;
- 84 creative option cards;
- 84 Start endpoint controls;
- 84 End endpoint controls;
- 84 generation-pool controls;
- one Start/Both/End global scope control.

## Runtime note

Headless Chromium is installed in the execution container but does not complete navigation even for a trivial data URL. Therefore this report does not claim an automated screenshot pass. The package passed syntax, import, state, command and static DOM audits and requires the normal Vercel visual acceptance pass.
