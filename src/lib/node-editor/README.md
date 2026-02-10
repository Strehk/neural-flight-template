# 🔧 Node Editor — Architecture

A **modular signal system** inspired by Eurorack synthesizers. Users build signal pipelines from pre-built modules — no code required.

---

## Eurorack Analogy

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║  CANVAS  (SvelteFlow)  =  The Eurorack Case                         ║
║  ──────────────────────────────────────                              ║
║  Users see modules on a surface, connected by cables.                ║
║                                                                      ║
║  ┌─── Node A ─────┐   edge   ┌─── Node B ─────┐   edge   ┌ Node C ┐║
║  │  ○ In          │ ──────→ │  ○ In           │ ──────→ │  ○ In   │║
║  │  [~~~~~wave~~] │          │  [A] × [B]      │          │ [==●==] │║
║  │  [Speed: 0.3]  │          │                  │          │ Fog:120 │║
║  │      Out ●     │          │       Out ●      │          │  Out ●  │║
║  └─────────────────┘          └──────────────────┘          └─────────┘║
║                                                                      ║
║  NODE = Eurorack Module — UI panel visible, internals hidden         ║
║  COMPONENT = Electronic part inside a module — atomic, reusable      ║
║  EDGE = Patch cable — all signals normalized float 0–1               ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
          │                                              ▲
          │  WebSocket (bridge.ts)                       │ PARAMETER_PRESETS
          │  Only changed values,                        │ defines steerable
          │  only numbers.                               │ VR parameters
          ▼                                              │
╔══════════════════════════════════════════════════════════════════════╗
║  VR SCENE  (/vr)  —  Three.js + WebXR on Meta Quest                 ║
║  Completely separate from the editor. No Three.js import in editor.  ║
║  Parameters: terrainAmplitude · fogNear · sunIntensity · cloudOpacity║
╚══════════════════════════════════════════════════════════════════════╝
```

| Concept | Eurorack | Node Editor |
|---------|----------|-------------|
| **Canvas** | Case | SvelteFlow workspace — modules on a surface, connected by cables |
| **Nodes** | Modules | Compositions of Components with UI panel and exposed ports |
| **Components** | Electronic parts | Atomic signal processors with `compute()` |
| **Edges** | Patch cables | Normalized float signals (0–1) |

---

## Three Layers

```
┌──────────────────────────────────────────────────┐
│  CANVAS                                           │
│  What the user sees: modules, cables, workspace.  │
│  → Knows: Nodes                                   │
├──────────────────────────────────────────────────┤
│  NODES                                            │
│  Compositions of Components (= modules).          │
│  1 file = 1 node. Internally a pipeline.          │
│  → Knows: Components                              │
├──────────────────────────────────────────────────┤
│  COMPONENTS                                       │
│  The smallest building blocks. Process signals.    │
│  Know nothing about Nodes or Canvas.               │
│  → Knows: only itself                              │
└──────────────────────────────────────────────────┘
```

**Core rule:** Dependencies only flow **downward**. Components never import Nodes. Nodes never import Canvas code. Three.js code lives only in `/vr` — the editor sends numbers, not 3D objects.

### Three Pillars

| Library | Layer | Role |
|---------|-------|------|
| **SvelteFlow** (`@xyflow/svelte`) | Canvas | Node positioning, cables, handles, zoom, pan |
| **bits-ui** | Controls | UI primitives (slider, button, input) — headless, accessible |
| **Three.js + WebXR** | Output target | VR scene on Quest — receives numbers via WebSocket |

SvelteFlow and bits-ui live in the editor. Three.js lives in the VR scene (`/vr`). The bridge between them is WebSocket. The editor never imports Three.js — it sends numbers.

---

## Directory Structure

```
src/lib/node-editor/
│
├── components/          # Atomic signal processors (Logic + UI)
│   ├── lfo.ts                 COMPONENT_LFO
│   ├── lfo_ui.ts              COMPONENT_LFO_UI
│   ├── lfo_ui.svelte          WaveBar + Speed slider
│   ├── multiply.ts            COMPONENT_MULTIPLY
│   ├── multiply_ui.ts         COMPONENT_MULTIPLY_UI
│   ├── multiply_ui.svelte
│   ├── signal_adder.ts        COMPONENT_ADDER
│   ├── color.ts               COMPONENT_COLOR
│   ├── color_ui.ts            COMPONENT_COLOR_UI
│   ├── color_ui.svelte
│   ├── gate.ts                COMPONENT_GATE
│   ├── gate_ui.ts             COMPONENT_GATE_UI
│   ├── gate_ui.svelte
│   ├── switch.ts              COMPONENT_SWITCH
│   ├── switch_ui.ts           COMPONENT_SWITCH_UI
│   ├── switch_ui.svelte
│   ├── slider_ui.ts           COMPONENT_SLIDER_UI
│   ├── slider_ui.svelte
│   ├── comparator.ts          COMPONENT_COMPARATOR
│   ├── comparator_ui.ts       COMPONENT_COMPARATOR_UI
│   ├── comparator_ui.svelte
│   ├── noise.ts               COMPONENT_NOISE
│   ├── noise_ui.ts            COMPONENT_NOISE_UI
│   ├── noise_ui.svelte
│   ├── envelope.ts            COMPONENT_ENVELOPE
│   ├── envelope_ui.ts         COMPONENT_ENVELOPE_UI
│   ├── envelope_ui.svelte
│   ├── spring.ts              COMPONENT_SPRING
│   ├── spring_ui.ts           COMPONENT_SPRING_UI
│   ├── spring_ui.svelte
│   ├── mixer_ui.ts            COMPONENT_MIXER_UI
│   ├── mixer_ui.svelte
│   └── types.ts               AnyComponent type alias
│
├── nodes/               # Node compositions (= Eurorack modules)
│   ├── types.ts               NodeDef, ComponentSlot, ExposedPort
│   ├── port_types.ts          arePortTypesCompatible()
│   ├── registry.ts            ALL_NODES, getNodeDef()
│   ├── system_nodes.ts        Auto-generated Output Nodes from PARAMETER_PRESETS
│   ├── lfo_modulator_node.ts  NODE_LFO_MODULATOR
│   ├── slider_node.ts         NODE_SLIDER
│   ├── envelope_node.ts       NODE_ENVELOPE
│   ├── noise_node.ts          NODE_NOISE
│   ├── logic_gate_node.ts     NODE_LOGIC_GATE
│   ├── spring_node.ts         NODE_SPRING
│   ├── pulse_generator_node.ts NODE_PULSE_GENERATOR
│   ├── color_blend_node.ts    NODE_COLOR_BLEND
│   └── mixer_node.ts          NODE_MIXER
│
├── canvas/              # SvelteFlow infrastructure
│   ├── EditorCanvas.svelte    Canvas wrapper
│   ├── NodeShell.svelte       Shared node frame (header + handles)
│   ├── NodeCatalog.svelte     Sidebar with drag & drop
│   ├── ModuleRenderer.svelte  Generic component renderer
│   ├── canvas.css             Central styles (single CSS source)
│   └── index.ts               Barrel export
│
├── controls/            # UI primitives (bits-ui based, signal-unaware)
│   ├── Slider.svelte          Range input
│   ├── WaveBar.svelte         Vertical signal bar (0–1 as height)
│   ├── ColorPicker.svelte     Color input + preview
│   ├── GateButton.svelte      Trigger button with state
│   ├── ValueDisplay.svelte    Formatted number display
│   ├── AddButton.svelte       Dynamic channel add button
│   └── index.ts               Barrel export
│
├── graph/               # Compute engine (headless, no UI imports)
│   ├── engine.ts              SignalGraph, evaluate(), registerNodeType()
│   ├── types.ts               SignalDef, SignalPort, clampSignal()
│   └── index.ts               Barrel export
│
├── parameters/          # VR parameter registry
│   └── registry.ts            PARAMETER_PRESETS, ParameterPreset
│
├── bridge.ts            # WebSocket → Three.js (sends numbers, no Three.js import)
└── index.ts             # Public API barrel
```

The three folders `components/`, `nodes/`, `canvas/` map 1:1 to the three architecture layers.

---

## Component Pattern

Components are **atomic signal processors** — like ICs on a circuit board. They never use other Components internally. Combination happens at the Node level.

### Two Variants, One Interface

Both variants implement `SignalDef` with `compute(inputs, state, dt) → { outputs, state }`:

| Variant | Files | Description |
|---------|-------|-------------|
| **Logic** | `{name}.ts` | Pure computation, no UI. 1 export: `COMPONENT_{NAME}` |
| **UI** | `{name}_ui.ts` + `{name}_ui.svelte` | Computation + Svelte widget. 1 export: `COMPONENT_{NAME}_UI` |

UI Components are **self-contained** — they have their own `compute()` and are NOT dependent on the Logic variant. This enables 1:N — multiple UI variants per function:

```
lfo.ts                               ← Logic (1×)
lfo_ui.ts + lfo_ui.svelte            ← UI variant A: WaveBar
lfo_knob_ui.ts + lfo_knob_ui.svelte  ← UI variant B: rotary knob (future)
```

The `widget` property lives directly on the `SignalDef` — no separate `_WIDGET` or `_DEFAULTS` exports.

### Logic Component Example

```typescript
// components/multiply.ts
import type { SignalDef } from "../graph/types";
import { clampSignal } from "../graph/types";

export const COMPONENT_MULTIPLY: SignalDef = {
    type: "multiply",
    label: "Multiply",
    inputs: [
        { id: "a", label: "A", default: 1 },
        { id: "b", label: "B", default: 1 },
    ],
    outputs: [{ id: "product", label: "Product", default: 1 }],
    createState: () => null,
    compute: (inputs) => ({
        outputs: { product: clampSignal((inputs.a ?? 1) * (inputs.b ?? 1)) },
        state: null,
    }),
};
```

### UI Component Example

**File 1:** `components/lfo_ui.ts` — logic + widget reference on SignalDef:

```typescript
import type { SignalDef } from "../graph/types";
import { clampSignal } from "../graph/types";
import LfoUi from "./lfo_ui.svelte";

interface LfoState { phase: number; baseSpeed: number; }

export const COMPONENT_LFO_UI: SignalDef = {
    type: "lfo",
    label: "LFO",
    inputs: [{ id: "speedMod", label: "Speed Mod", default: 0.5 }],
    outputs: [{ id: "wave", label: "Wave", default: 0.5 }],
    createState: (): LfoState => ({ phase: 0, baseSpeed: 0.1 }),
    compute: (inputs, state, dt) => {
        const s = state as LfoState;
        const speed = s.baseSpeed * (0.25 + (inputs.speedMod ?? 0.5) * 3.75);
        const phase = (s.phase + speed * dt) % 1;
        const wave = clampSignal((Math.sin(phase * Math.PI * 2) + 1) / 2);
        return { outputs: { wave }, state: { ...s, phase } };
    },
    widget: LfoUi,
};
```

**File 2:** `components/lfo_ui.svelte` — Svelte widget:

```svelte
<script lang="ts">
    import { useSvelteFlow } from "@xyflow/svelte";
    import { WaveBar, Slider, ValueDisplay } from "../controls";

    interface Props { id: string; data: Record<string, unknown>; }
    const { id, data }: Props = $props();
    const { updateNodeData } = useSvelteFlow();
</script>

<WaveBar value={data.wave as number} color="var(--success)" />
<Slider label="Speed" value={data.speed as number}
    min={0.01} max={1} step={0.01} unit="Hz" color="var(--success)"
    onchange={(v) => updateNodeData(id, { speed: v })} />
<ValueDisplay value={data.wave as number} />
```

Svelte widgets import only from `controls/` (dumb widgets) — never from other components. Data updates go through `useSvelteFlow()`. Styles come from `canvas.css`, not inline.

### Component Catalog

**Logic Components (10):**

| Export | File | Purpose |
|--------|------|---------|
| `COMPONENT_LFO` | `lfo.ts` | Low-frequency oscillator |
| `COMPONENT_MULTIPLY` | `multiply.ts` | Signal multiplication |
| `COMPONENT_ADDER` | `signal_adder.ts` | Signal addition |
| `COMPONENT_COLOR` | `color.ts` | RGB color signal |
| `COMPONENT_GATE` | `gate.ts` | Binary gate (on/off) |
| `COMPONENT_SWITCH` | `switch.ts` | A/B signal switch |
| `COMPONENT_COMPARATOR` | `comparator.ts` | Signal comparison (value > threshold → 1) |
| `COMPONENT_NOISE` | `noise.ts` | Simplex/Perlin random signal |
| `COMPONENT_ENVELOPE` | `envelope.ts` | ADSR curve on trigger |
| `COMPONENT_SPRING` | `spring.ts` | Damped spring physics smoothing |

**UI Components (11):**

| Export | Files | Widget |
|--------|-------|--------|
| `COMPONENT_LFO_UI` | `lfo_ui.ts` + `.svelte` | WaveBar + Speed slider |
| `COMPONENT_MULTIPLY_UI` | `multiply_ui.ts` + `.svelte` | Product value display |
| `COMPONENT_COLOR_UI` | `color_ui.ts` + `.svelte` | Color picker |
| `COMPONENT_GATE_UI` | `gate_ui.ts` + `.svelte` | Toggle button |
| `COMPONENT_SWITCH_UI` | `switch_ui.ts` + `.svelte` | A/B switch toggle |
| `COMPONENT_SLIDER_UI` | `slider_ui.ts` + `.svelte` | Generic range slider |
| `COMPONENT_COMPARATOR_UI` | `comparator_ui.ts` + `.svelte` | Threshold display |
| `COMPONENT_NOISE_UI` | `noise_ui.ts` + `.svelte` | Noise visualization |
| `COMPONENT_ENVELOPE_UI` | `envelope_ui.ts` + `.svelte` | ADSR curve controls |
| `COMPONENT_SPRING_UI` | `spring_ui.ts` + `.svelte` | Spring value display |
| `COMPONENT_MIXER_UI` | `mixer_ui.ts` + `.svelte` | Multi-channel gain sliders |

---

## Node Pattern

Nodes are **compositions** of Components — like Eurorack modules. Each node wires Components into an internal pipeline and exposes only the UI panel and external ports.

### Three Stages

Every node has up to three internal stages:

```
INPUT STAGE      → Where do signals come from?
PROCESSING STAGE → What happens to them?
OUTPUT STAGE     → Where do they go?
```

### Minimum 2 Components

Every node needs at least 2 Components — a source/sink and a processing step. Internal wires use `signal_` prefix.

### NodeDef Interface

```typescript
interface NodeDef {
    type: string;                    // Unique identifier
    label: string;                   // Display name
    category: NodeCategory;          // "input" | "process" | "trigger" | "logic" | "output"
    icon: AnyComponent;              // Lucide icon for catalog + header

    components: ComponentSlot[];     // Internal pipeline
    inputs: ExposedPort[];           // Left handles
    outputs: ExposedPort[];          // Right handles
}

interface ComponentSlot {
    id: string;                                 // Unique slot ID
    signal: SignalDef;                          // Direct reference
    inputWires: Record<string, string | null>;  // Component port → wire
    outputWires: Record<string, string>;        // Component port → wire
}

interface ExposedPort {
    id: string;             // Signal wire name
    label: string;          // Display label
    side: "left" | "right";
    portType?: PortType;    // "number" (default) | "trigger"
}
```

### Node Example: LFO Modulator

```
┌──────────────── NODE: LFO Modulator ────────────────────┐
│                                                           │
│  ○ signal_in ──→ [SignalAdder] ──→ signal_speed ──→ [LFO] ──→ ●
│                       ▲                              signal_  │
│                       │                              lfo_wave │
│                  [Slider_ui]                                  │
│                  signal_offset                                │
│                                                               │
│  Exposed:  ○ signal_in (left)    signal_lfo_wave ● (right)   │
│  Internal: 3 Components + 4 signal_-Wires                    │
│  UI:       Slider-Knob + WaveBar (bits-ui based)             │
└───────────────────────────────────────────────────────────────┘
```

The user sees only the UI panel and the exposed ports. Internal wiring is invisible.

### Node Catalog

**Standard + Complex Nodes (9):**

| Export | File | Category | Components |
|--------|------|----------|------------|
| `NODE_LFO_MODULATOR` | `lfo_modulator_node.ts` | input | Adder + Slider UI + LFO UI |
| `NODE_SLIDER` | `slider_node.ts` | input | Slider UI + Multiply |
| `NODE_ENVELOPE` | `envelope_node.ts` | input | Envelope UI + Gate UI |
| `NODE_NOISE` | `noise_node.ts` | input | Noise UI + Multiply |
| `NODE_LOGIC_GATE` | `logic_gate_node.ts` | logic | Comparator UI + Gate |
| `NODE_SPRING` | `spring_node.ts` | process | Spring UI + Multiply |
| `NODE_PULSE_GENERATOR` | `pulse_generator_node.ts` | trigger | Gate UI + LFO + Comparator |
| `NODE_COLOR_BLEND` | `color_blend_node.ts` | process | Color UI + Mixer + Multiply |
| `NODE_MIXER` | `mixer_node.ts` | process | Mixer UI (dynamic 2–8 channels) |

**Output Nodes (8, auto-generated):**

Generated from `PARAMETER_PRESETS` in `system_nodes.ts`. Each VR parameter becomes a sink node with a slider:

| Label | Parameter | Range |
|-------|-----------|-------|
| Terrain Amplitude | `terrainAmplitude` | 30–90 |
| Terrain Frequency | `terrainFrequency` | 0.001–0.01 |
| Water Level | `waterLevel` | 0–20 |
| Fog Near | `fogNear` | 50–200 |
| Fog Far | `fogFar` | 300–800 |
| Sun Intensity | `sunIntensity` | 1–5 |
| Cloud Opacity | `cloudOpacity` | 0–1 |
| Wind Speed | `windSpeed` | 0–10 |

---

## Signals

### One Format

All signals are **float, normalized to [0.0 – 1.0]** — like control voltages (CV) in analog synthesis.

```
0.0 = Minimum
0.5 = Neutral / Center
1.0 = Maximum
```

`clampSignal()` enforces this range. Remapping to real-world values happens in the bridge step, not in components.

### Exception: Color

Color signals consist of three normalized channels: `{r, g, b}`, each 0.0–1.0.

### Signal Mixing

When multiple outputs connect to one input, values are **averaged**:

```
Output_A (0.8) ──┐
                  ├──→ Input_X = (0.8 + 0.2) / 2 = 0.5
Output_B (0.2) ──┘
```

### Port Types (Soft Typing)

Semantic hints, not runtime types. All signals remain `number` (0–1).

| Port Type | Meaning | Handle Shape |
|-----------|---------|-------------|
| `number` | Continuous signal 0–1 | ■ Square (default) |
| `trigger` | Binary event 0/1 | ◆ Diamond |

Currently all types are cross-compatible. The infrastructure supports future restrictions.

---

## controls/ vs. components/

Two folders, clear boundary:

```
controls/     → DUMB widgets. Know nothing about signals.
components/   → SMART processors. Know the signal system.
```

| | controls/ | components/ |
|--|----------|-------------|
| **Knows about signals** | No | Yes |
| **Has compute()** | No | Yes |
| **Built on** | bits-ui | Controls + Signal System |
| **Example** | `Slider.svelte` — generic range input | `lfo_ui.ts` — binds WaveBar to wave output |
| **Used by** | Components | Nodes |

**Rule:** Controls never import from components/. Dependency flows one direction:

```
Node → imports → Component → imports → Control (bits-ui)
```

---

## Dynamic Nodes (Mixer)

The Mixer node supports **dynamic channel count** (2–8):

- `COMPONENT_MIXER_UI` defines 8 channels, visibility controlled by `channelCount`
- `ModuleRenderer.svelte` checks `data._channelCount`:
  - `undefined` → show all inputs (backwards-compatible)
  - `number` → show only first N input handles
- Mixer drop in catalog sets `_channelCount = 2`
- "+" button in `mixer_ui.svelte` increments `_channelCount`

---

## Evaluation Cycle

Every frame runs through the same cycle:

```
1. SYNC IN     SvelteFlow state → Compute Engine
2. EVALUATE    All nodes in topological order
3. SYNC OUT    Results → SvelteFlow nodes
4. BRIDGE      Signal 0–1 → remap(min/max) → WebSocket → Three.js /vr
```

**Remap happens in the bridge step.** Output nodes are pure sinks (`components: []`) — they don't compute. `syncBridge()` in `+page.svelte` reads the 0–1 signal value, looks up `min`/`max` from `PARAMETER_PRESETS`, and sends the remapped real value.

The **Compute Engine** (`graph/`) is headless — no SvelteFlow imports.
The **Page** (`+page.svelte`) handles sync between SvelteFlow and Engine.
The **Bridge** (`bridge.ts`) sends only changed values over WebSocket to `/vr`.

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│SvelteFlow│────→│  Signal  │────→│ Svelte   │────→│ Three.js │
│  State   │sync │  Graph   │eval │  Flow    │ws   │  /vr     │
│ (nodes,  │ in  │ evaluate │     │  update  │     │  Quest   │
│  edges)  │     │  (dt)    │     │  + bridge│     │  Scene   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

`syncOutputs` is pure — it only writes values from engine back to SvelteFlow. It never calls `sendSettings` — that's the bridge loop's job. Separation of data flow and side effects.

---

## Naming Conventions

| Prefix | Type | Example | File |
|--------|------|---------|------|
| `COMPONENT_` | Logic SignalDef | `COMPONENT_LFO` | `components/lfo.ts` |
| `COMPONENT_*_UI` | UI SignalDef (+ widget) | `COMPONENT_LFO_UI` | `components/lfo_ui.ts` |
| `NODE_` | NodeDef | `NODE_LFO_MODULATOR` | `nodes/lfo_modulator_node.ts` |

- Files: **always `snake_case`** (including `.svelte`)
- Svelte imports: `import LfoUi from "./lfo_ui.svelte"`
- Internal wires: `signal_` prefix (e.g. `signal_speed`, `signal_lfo_wave`)

---

## Rules

| # | Rule | Reason |
|---|------|--------|
| R1 | **Three layers:** Components → Nodes → Canvas. Dependencies only downward. | Decoupling, testability |
| R2 | **Components = `SignalDef`.** No separate interface. Both Logic and UI are `SignalDef` with `compute()`. | KISS |
| R3 | **All signals 0–1 normalized.** `clampSignal()` enforces range. Remapping in the consumer, not the signal. | Universal format |
| R4 | **Nodes = compositions.** Minimum 2 Components. Internal wiring via `ComponentSlot[]`. | Atomic parts, complex nodes |
| R5 | **Filename = documentation.** `snake_case`, always. `_ui` suffix indicates UI. No PascalCase in filenames. | Instantly readable |
| R6 | **Variable prefixes:** `COMPONENT_` (Logic), `COMPONENT_*_UI` (UI), `NODE_` (Node). No collisions. | Layer membership obvious |
| R7 | **Controls are dumb, Components are smart.** Controls build on bits-ui, know no signals. | Clear separation |
| R8 | **Engine is headless.** No SvelteFlow import in graph/. Sync happens in the page. | Testable without UI |
| R9 | **Editor knows no Three.js.** Communication only via WebSocket + Parameter Registry. | Completely separate systems |
| R10 | **bits-ui for ALL UI widgets.** CSS central (`canvas.css`), no inline styling. | Consistency |
| R11 | **KISS.** Shortest readable code. Use type inference. No unnecessary abstractions. | Readability > DRY |
| R12 | **Signal wires use `signal_` prefix.** All internal wires in nodes are named `signal_*`. | Uniform convention |

---

## How To: Add a Component

1. **Logic only** — create `components/{name}.ts`:
   - Export `COMPONENT_{NAME}: SignalDef` with `compute()`
2. **With UI** — also create `components/{name}_ui.ts` + `{name}_ui.svelte`:
   - Export `COMPONENT_{NAME}_UI: SignalDef` with own `compute()` + `widget`
   - Svelte file imports controls from `../controls/`, never from other components

## How To: Add a Node

1. Create `nodes/{name}_node.ts`
2. Import 2+ Components, wire them via `ComponentSlot[]`
3. Export `NODE_{NAME}: NodeDef`
4. Register in `nodes/registry.ts` → add to `ALL_NODES`

Reference: `nodes/lfo_modulator_node.ts`

---

## Coding Style

```
✅ Type inference (not: const x: number = 5)
✅ Shortest readable code
✅ Functions < 20 lines
✅ Early returns over deep nesting
✅ Explicit types on function signatures

❌ Unnecessary interfaces (when SignalDef is enough)
❌ Generic abstractions for one-time operations
❌ Inline styles (CSS in canvas.css)
❌ Magic numbers without explanation
❌ `any` type (exception: Svelte 5 AnyComponent)
```

### Import Conventions

```typescript
// Svelte components: PascalCase import
import LfoUi from "./lfo_ui.svelte";

// Lucide icons
import { Activity } from "lucide-svelte";

// Types: explicit with type keyword
import type { SignalDef } from "../graph/types";
import { clampSignal } from "../graph/types";
```
