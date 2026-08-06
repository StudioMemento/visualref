# V36C → V43C-R1 Core Rebuild Comparison

## Objective

Restore the functions that made V36C creatively usable before continuing visual polish. V43C-R1 keeps the modular state/store/renderer architecture of V43C, but rebuilds the missing interaction and editing grammar as a cleaner icon-and-chip system.

## Functional comparison

| V36C useful behavior | V43C before rebuild | V43C-R1 implementation |
|---|---|---|
| Multiple shot concepts and variants | One active shot workflow felt narrow | Named shot slots with create, duplicate, delete, family and preset selection |
| START and END as the core of a shot | Data existed, editing was indirect | Explicit START / BOTH / END scope on every creative option and numeric detail |
| Eleven coordinated creative axes | Values were stored, several had weak or no visible result | Lens, camera, light, focus, environment, atmosphere and motion-design choices now materially affect the renderer |
| Controlled random generation | Basic variant command | Near / Balanced / Bold generation, delta target, locks, exclusions and pool reset |
| Readable advanced control | Technical controls felt detached from the simple mode | Contextual DETAILS panel tied to the currently selected axis |
| Shot-to-sequence workflow | Linked clips existed but editing depth was limited | Add/update linked shot, duplicate as unique, selected-clip inspector and sequence recipes |
| Real timeline manipulation | Mostly decorative move/delete board | Move, left trim, right trim, blade, slip, frame snap and source range |
| Layered sequence | Partial tracks | V1–V3, FX, A1–A2 with compatible drag targets and per-track state |
| Track management | Missing | Lock, mute and visibility per track |
| Timeline navigation | Basic ruler/playhead | Pre-roll, IN/OUT, markers, zoom, home and frame-accurate playhead |
| Audio reference | Not operational | Local audio import, IndexedDB persistence, waveform, offset, volume and playback sync |
| FX grammar | Missing as clips | Flash, Vignette, Title and Grain clips; visual effects are applied in the renderer and title has a captured scene layer |
| Complete sequence preview | Player existed but sequence output was incomplete | Timeline player evaluates top visible video layer plus FX and synchronized audio |
| Playblast | Missing | Browser WebM recording from the render canvas with supported audio capture |
| Child-proof/game-like interaction | Dense technical UI | Larger type, icon-first commands, chips, clear selected states, scopes and contextual controls |

## Architecture retained from V43C

- Modular ES modules instead of a single giant HTML runtime.
- Central normalized state and command layer.
- Shared renderer across RENDER, VIEWPORT and TIMELINE.
- IndexedDB binary persistence.
- Camera-normalized Hero and native-space Environment contracts.
- Static GitHub/Vercel deployment.

## Intentionally not restored

The following V36C areas remain outside the rebuild because they were legacy/testing surfaces rather than the product core:

- BANCO / DEF / glossary workspaces.
- Old technical matrices and diagnostic text walls.
- PDF and plain-text shot-list exporters.
- Experimental demo banks that do not belong to RENDER / VIEWPORT / TIMELINE.
- A monolithic single-file architecture.

## Known browser constraints

- Playblast format depends on `MediaRecorder` support; WebM is used where available.
- Audio recording depends on the browser allowing the Web Audio graph after a user gesture.
- Binary assets are local to the browser profile because they live in IndexedDB.
