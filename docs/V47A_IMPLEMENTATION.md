# MEMENTO VisualRef V47A — Implementation Contract

## 1. Release purpose

V47A restores one complete product loop:

```text
STATE → TARGET DELTA → CANDIDATE → REVIEW → ACCEPT → CURVE
```

The release addresses three immediate product failures:

1. Delta had become a small secondary setting instead of the generation instrument.
2. A black background and flat plane made valid shots feel like unfinished technical previews.
3. Existing functions were exposed through a dense architecture-led interface instead of a simple creative hierarchy.

The implementation therefore prioritizes a numeric Delta instrument, a procedural cyclorama and an image-first workspace hierarchy before further feature expansion.

## 2. Runtime architecture

The standalone package uses the uploaded V46 package as its deployment baseline and preserves the exact frozen V45 source reference:

```text
48ff1e50424da0a0546ade9039f00368073f56f2
```

Runtime order:

1. V45 boots the Store, Command Bus, History, Persistence, Renderer, Player and workspace classes.
2. V46 applies existing ownership and visibility corrections.
3. V47A installs the Delta / Limbo foundation.

V47A does not create a second renderer, scene, store or timeline. It operates through the existing runtime authorities.

The local installer places the same modules into a full VisualRef checkout. Formal schema 47 migrations and full native absorption of the V46 layer remain later architectural work.

## 3. Delta engine

### 3.1 Authoritative request

The active shot retains the existing `deltaTarget` field, normalized from `0.05` to `0.95`. The interface presents it as `05–95`.

The numeric value controls generation intensity. Near, Balanced and Bold are derived implementation profiles:

```text
05–27 → near
28–68 → balanced
69–95 → bold
```

No profile selector is exposed as a competing primary input.

### 3.2 Source-safe candidate generation

`src/v47/delta-engine.js` receives the current project state and never mutates it.

Generation procedure:

1. clone the project state;
2. assign the requested seed and Target Delta to the cloned shot;
3. invoke the existing V45 generation handlers against the clone;
4. search several profile/depth combinations;
5. enforce every lock and option exclusion after each pass;
6. steer the candidate toward the requested distance;
7. score the candidate against Current;
8. return the best candidate and metadata.

The engine temporarily substitutes Store mutation methods only while a synchronous legacy command is evaluated against the private clone. Original Store methods are restored in `finally`, and the live project is never passed to the generator.

### 3.3 Delta measurement

The comparison metric combines:

- creative Start / End option changes;
- normalized numeric Start / End differences;
- category grouping for readable reporting.

Creative changes carry most of the visible score. Numeric differences contribute a smaller precision component. The output is an integer `0–100` Actual Delta.

Reported groups:

- Subject
- Camera
- Composition
- Lens / Focus
- Light
- Environment
- Motion
- Image
- Precision

### 3.4 Determinism

The candidate fingerprint includes:

- current shot state;
- requested seed;
- Target Delta.

The same Current state, seed and Target Delta returns the same Candidate. Regenerate increments the base seed; Generate without changing the seed reproduces the same result.

### 3.5 Lock and exclusion contract

After every generation and steering operation:

- locked creative axes are restored from Current;
- locked numeric axes are restored from Current;
- excluded creative options are replaced with the Current value;
- the built-in Environment category is locked while a procedural World Recipe owns the stage.

### 3.6 Candidate state

Candidate review is stored under:

```text
v47.generation.byShot[shotId]
```

Each record contains:

- `review`: current / previous / candidate;
- `baseSeed`;
- `candidate` and `candidateMeta`;
- `previous` and `previousMeta`.

The Candidate is a snapshot, not a temporary shot in the project shot order. It therefore cannot create accidental Timeline links or mutate the active shot.

### 3.7 Accept, Regenerate and Discard

**Accept** performs one committed Store mutation:

- Current is copied into Previous;
- Candidate replaces Current while retaining the same Shot ID;
- Candidate is cleared;
- playback returns to frame zero.

Because the Shot ID remains stable, linked Timeline clips continue to resolve to the accepted shot.

**Regenerate** advances the base seed and creates another Candidate.

**Discard** clears Candidate and returns review to Current without changing the active shot.

## 4. World Recipe system

### 4.1 State

World Recipe state is stored at:

```text
v47.world
```

Fields:

- `recipe`: grey-limbo / white-limbo / black-limbo / void;
- `ground`;
- `shadowSoftness`;
- `autoFit`.

Legacy `scene.worldRecipe` values are mapped during the V47A foundation migration.

### 4.2 Procedural cyclorama

The renderer receives one `BufferGeometry` sweep with:

- a wide flat floor;
- a tangent quarter-circle curve;
- a tall rear wall;
- computed vertex normals;
- one physical material;
- shadow receiving enabled.

The geometry is named:

```text
V47_PROCEDURAL_CYCLORAMA
```

The inherited flat floor and two-plane cove are hidden whenever the procedural recipe owns the built-in environment.

### 4.3 Recipes

**Grey Limbo** is the default and safest neutral baseline.

**White Limbo** lowers exposure and light intensity to protect bright products and highlights.

**Black Limbo** reduces ambient/fill response and strengthens rim separation.

**Void** hides the cyclorama and contact shadow explicitly.

A recipe may change:

- stage colour;
- background and fog colour;
- roughness / metalness;
- renderer exposure multiplier;
- key, rim, fill and ambient multipliers.

A recipe may not change:

- Hero transform;
- pivot correction;
- camera transform;
- camera framing;
- imported environment transform.

### 4.4 Contact shadow

A procedural radial alpha texture creates a lightweight contact-shadow plane. It follows the evaluated Hero bounds and scales from the Hero footprint. Shadow softness changes spread and opacity rather than moving the Hero.

### 4.5 Imported environment ownership

When `assets.environmentId` is not `environment-proxy`:

- procedural recipe buttons are disabled;
- cyclorama and contact shadow are hidden;
- the custom Environment remains authoritative;
- HDRI background visibility remains independent from HDRI lighting contribution.

## 5. Workspace hierarchy

### Viewport — State

V47A keeps the World Stack and Properties visible together on desktop. The player-edge dock contains:

- Select
- Move
- Rotate
- Scale
- Pivot
- World / Local
- Snap
- Frame
- Ground
- Reset
- Helpers
- Guide

The Inspector adds property search and the World Recipe panel.

### Render — Delta

Default hierarchy:

1. Player
2. Target Delta / Generate Candidate
3. Current / Previous / Candidate review
4. Target / Actual / Seed / Profile readout
5. Changed-category report
6. Accept / Regenerate / Discard
7. persistent Start / End matrix
8. contextual detailed controls

The inherited profile selector and direct-mutating Variant action are hidden.

### Timeline — Curve

The creation bar uses the same Target Delta and Candidate transaction:

- Generate Candidate preserves Current;
- Current / Candidate review is available;
- Accept / Discard is available before adding the shot;
- Add Current Shot adds the accepted/current source to the selected track.

## 6. V36C donor rules

V47A borrows V36C principles, not its accumulated implementation:

Retained:

- one dominant image surface;
- Start / End always legible;
- generation near the Player;
- flat text-first controls;
- teal / white / orange semantic state;
- immediate transport and scrub relationship;
- progressive disclosure.

Rejected:

- single-file accumulation;
- duplicate renderers;
- hidden state in closed panels;
- competing profile and Delta inputs;
- direct destructive randomization;
- technical helpers visible by default.

## 7. Known architectural boundary

This package still loads V46 as a compatibility layer. It is not the final V47 native architecture.

The next native milestone should:

- introduce schema version 47 and migrations;
- move `v47.world` and `v47.generation` into formal default-state definitions;
- register candidate commands in the native Command Bus;
- integrate the procedural World Recipe into `RendererService` directly;
- retire V46 DOM reconciliation after feature parity;
- preserve the same visual and behavioral acceptance contract.
