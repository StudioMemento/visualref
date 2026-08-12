# MEMENTO VisualRef V45 — Product and UX Freeze

**Status:** approved implementation direction  
**Product path:** `VIEWPORT → RENDER → TIMELINE`  
**Visual donor:** V36C clarity and immediacy  
**Functional donor:** V44 scene, asset, Shot, Player and Timeline foundation

---

## 1. Product promise

VisualRef is a cinematic direction tool for real 3D assets. It must let a non-specialist build a controlled product or car sequence without first learning a professional 3D or editing application.

The product is not a smaller Blender, Unreal or Resolve. Professional depth is allowed only when it extends a visible creative decision.

---

## 2. One question per workspace

| Workspace | User question | Authority |
|---|---|---|
| Viewport | Is my physical scene correct? | Scene calibration |
| Render | What is this Shot, and how does it change? | Shot direction |
| Timeline | How do the Shots play together? | Sequence timing |

No workspace may silently own another workspace's domain.

---

## 3. Shared shell

The final shell is:

```text
MEMENTO + V45
RENDER | VIEWPORT | TIMELINE
UNDO | REDO | PROJECT | IT/EN | FULLSCREEN
```

Rules:

- one top navigation;
- no Test, Banco or Glossary mode in the production shell;
- one Project dialog;
- one responsive splitter per workspace;
- one mobile workspace rail;
- no second navigation system competing with the header.

---

## 4. Shared Player contract

The Player is a stable product surface, not a workspace-specific recreation.

It owns:

- renderer authority;
- playback clock;
- output gate and aspect ratio;
- Start/End scrub;
- frame/time readout;
- Loop, Play, Start and End;
- workspace-appropriate monitor controls;
- fullscreen.

Render adds `LIVE / START / END / COMPARE`.

Timeline adds `PLAYER / VIEWPORT` monitor context.

Viewport defaults to the calibration camera and keeps Shot camera editing deliberate.

---

## 5. Render anatomy

```text
ACTIVE SHOT / INTENT / SCOPE
VARIATION
SUBJECT
CAMERA
COMPOSITION
LENS & FOCUS
LIGHT
ENVIRONMENT
MOTION
ATMOSPHERE / IMAGE
TIMING
CURATED STARTING POINTS
UPDATE / ADD TO TIMELINE
```

### Rules

- all nine macros remain visible;
- each macro shows its active state even while closed;
- only the selected macro opens precision;
- precision appears inline below that macro;
- no detached Advanced panel;
- Motion is Off by default;
- Motion Energy is visible only while Motion needs it;
- Variation is always available;
- presets are optional starting points, never an application mode.

### Chip grammar

- left hit zone assigns Start;
- centre hit zone assigns Both;
- right hit zone assigns End;
- Start uses teal-left emphasis;
- Both uses white horizontal rules;
- End uses orange-right emphasis;
- the label remains uninterrupted;
- lock and exclusion are secondary.

---

## 6. Viewport anatomy

```text
TOOLBAR
SELECTED CONTEXT / CALIBRATE / EDIT SHOT STATE
SEMANTIC SCENE LIST
CONTEXTUAL INSPECTOR
```

### Semantic scene list

```text
HERO
ENVIRONMENT
PROPS
CAMERA
LIGHT
HDRI
BACKPLATE
```

Only available roles appear. Raw engine hierarchy remains hidden unless explicitly expanded later.

### Contextual Inspector

| Active context | Primary information |
|---|---|
| No selection | import and setup path |
| Hero | reference dimension, orientation, ground, pivot, scale |
| Environment | position, rotation, native scale, Hero proportion |
| HDRI | rotation, exposure, background/reflection split, blur |
| Backplate | crop, horizon, FOV match, contact point |
| Camera | framing, lens, focus, clipping |
| Light | position/direction, intensity, softness |
| Pivot tool | pivot and compensation only |

Healthy diagnostics collapse. Warnings remain visible with one clear action.

---

## 7. Timeline anatomy

```text
PLAYER LEFT
EDIT BOARD RIGHT
GFX / FX
V3
V2
V1
A1
A2
CONTEXTUAL CLIP INSPECTOR
```

### Rules

- the edit board is the default surface;
- Recipes and Library are optional drawers;
- clip selection reveals the Inspector;
- no selected clip means no permanent Inspector noise;
- Shot clips link to a Shot master;
- Make Unique copies the Shot and breaks the link;
- no Timeline operation clones or changes the physical scene;
- timing and retime change temporal use, not Shot endpoints;
- mobile canvas pan must not move the playhead.

---

## 8. Preserve / replace / hide / remove

### Preserve

- V44 atomic import and rollback;
- semantic Hero, Environment, Prop and HDRI roles;
- World/Local gizmos;
- compensated Pivot;
- shared project state;
- Start/Both/End Shot model;
- linked clips, Make Unique, trim, split, Slip, markers, waveform and Playblast foundations;
- V36C Player dominance and Timeline immediacy.

### Replace

- eleven equally weighted permanent rails → nine stable macro categories;
- engineering-first Viewport Inspector → task/context-first calibration;
- Timeline sub-application tabs → board first with contextual drawers;
- visible preset authority → optional starting points.

### Hide by default

- successful diagnostics;
- raw XYZ correction when not relevant;
- library and sequence recipes;
- numeric precision for closed macros;
- raw hierarchy details.

### Remove from the primary product

- Test, Banco and Glossary navigation;
- detached global Advanced panel;
- a second renderer or Player clock;
- preset mode as project authority;
- scene cloning through Timeline operations;
- duplicate transport systems.

---

## 9. Acceptance gates

V45 is accepted only when:

- the three workspaces share one shell, Player and history path;
- a non-technical user can import, calibrate, direct and sequence a car or product;
- the Player remains visually dominant in Render;
- Viewport exposes only relevant calibration depth;
- Timeline reads immediately as an editing board;
- failed asset replacement preserves the active scene;
- physical scale remains separate from apparent size;
- route switching does not duplicate renderers or assets;
- mobile gestures do not conflict;
- the real GLB/HDRI acceptance matrix passes.
