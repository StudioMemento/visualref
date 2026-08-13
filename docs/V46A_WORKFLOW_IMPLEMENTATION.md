# MEMENTO VisualRef V46A — Workflow Stabilization

## 1. Goal

V46A is not a feature expansion. It creates a usable baseline for testing the real VisualRef workflow:

**VIEWPORT → RENDER → TIMELINE**

The current focus is Viewport and Render. Timeline remains functionally inherited and will be handled after the first two stages are trustworthy.

## 2. Why Viewport → Render felt laggy

The important difference from V36C was runtime lifetime.

V36C changed modes in one document. The Three scene, renderer and imported asset stayed alive while the visible workspace changed.

The frozen V45 bootstrap creates a page-scoped AppShell, PlayerController and workspace controller. PlayerController owns RendererService and disposes it when the page unloads. Therefore a normal Viewport → Render link navigation destroys the old runtime and the next page restores the asset again.

RendererService already contains the correct reuse behavior: `syncAssets()` derives an asset revision and immediately returns when the revision is unchanged; `ensureAsset()` also returns if `loadedAssets` already contains the asset. The problem was that the whole RendererService instance was being replaced before those guards could help.

## 3. V46A runtime architecture

V46A creates the PlayerController once, deliberately in Viewport-capable mode so OrbitControls, TransformControls and the compensated Pivot system are initialized one time.

Workspace switching now:

1. disposes only the current **workspace UI controller**;
2. keeps Project Store, PlayerController and RendererService alive;
3. clears/rebuilds only the editor panel;
4. changes `player.workspace` and `renderer.workspace`;
5. updates history with `pushState()`;
6. mounts the next workspace controller against the same player/scene.

No page unload is involved.

### Runtime invariant

```text
ONE STORE
ONE PLAYER
ONE RENDERER
ONE MOUNTED HERO
MANY WORKSPACE VIEWS
```

## 4. Subject / camera ownership repair

Render categories had inherited numeric patches that could write directly into:

- `subject.positionX/Y/Z`
- `subject.scale`
- `subject.rotationX/Y/Z`

That allowed View, Composition, Size and other categories to alter the physical Hero while the visible Subject Rotation chip said something else.

V46A changes the rule to:

```text
PHYSICAL HERO TRANSFORM = VIEWPORT
CREATIVE YAW           = SUBJECT ROTATION
FRAMING                = CAMERA
```

At shot evaluation time V46A neutralizes Subject translation, Subject scale, pitch and roll before RendererService applies the frame. Subject yaw remains authored by Subject Rotation.

Then V46A reframes the shot camera from the creative choices:

- Subject Size → camera distance
- Composition → camera target offset
- View → camera azimuth/elevation
- Lens → existing camera FOV
- Camera → existing V45 camera motion primitive

This preserves the idea of the creative categories without letting them move the product off its calibrated world position.

## 5. Ground and zero pivot

After a real Hero is mounted:

1. V46A asks RendererService for a compensated zero-pivot result;
2. the pivot is committed through `scene.setNodePivotCompensated`;
3. the selected Hero is grounded with RendererService's bounds-aware ground resolver;
4. a world-origin XYZ helper is shown;
5. the Hero is framed in the editor camera.

The process is recorded once per project + asset ID so it does not repeatedly rewrite calibration during normal workspace switching.

## 6. Viewport UI

### Player dock

The original right-panel gizmo toolbar is hidden. The 3D player owns one consistent dock:

- Select
- Move
- Rotate
- Scale
- Pivot
- Local
- Snap
- Frame
- Ground
- Reset
- Guide

### Editor

The editor is a stable two-column layout:

- **Outliner** — always visible and responsible for subjects/assets.
- **Properties** — always visible, contextual, categorized and searchable.

The property search filters existing V45 property sections; it does not create a duplicate state model.

## 7. Render UI

### Player

Qualitative generation modes are hidden. A numeric Delta field and slider edit the existing `shot.deltaTarget` state. Visible player monitor modes are:

- Live
- Live + Start / End
- Viewport

Start/End previews are captured with the same RendererService and cached until the shot signature changes.

### Editor

The editor uses explicit grid rows so the property stack is the only large scrolling surface:

```text
SHOT COMMAND
VARIATION
START / BOTH / END + SEARCH + CATEGORY NAV
SCROLLABLE PROPERTY STACK
STARTING POINTS (hidden in V46A)
BOTTOM ACTION DOCK
```

Every option chip keeps Start / Both / End hit zones visible at all times. Typography and spacing are increased to make the editor readable at normal desktop distance.

## 8. Timeline boundary

Timeline still uses the inherited V45 implementation. V46A does not claim to repair the broken end-to-end Timeline workflow; this is intentionally deferred until Viewport and Render pass real production-asset acceptance.
