# Node Editor Architecture

> Inspired by [Strudel-Flow](https://github.com/xyflow/strudel-flow)
> 📐 **Full Architecture:** [`dev/ARCHITECTURE_NODE_EDITOR.md`](../../../dev/ARCHITECTURE_NODE_EDITOR.md)

## Core Principle

Three layers, unified by NodeDef:

```
┌─────────────────────────────────────────────────────────────┐
│  Svelte Flow (UI Layer)                                      │
│  - Nodes: Position, Rendering, Handles                       │
│  - Edges: Connection lines                                   │
│  - Interaction: Drag, Connect, Select                        │
└──────────────────────────┬──────────────────────────────────┘
                           │ sync via NodeDef.syncOutputs/syncInputs
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  NodeDef (Unified Layer)                                     │
│  - 1 registration = Signal + Module + Sync                   │
│  - Naming: LFO_SIGNAL + LFO_MODULE → LFO_NODE               │
└──────────────┬────────────────────────┬─────────────────────┘
               ▼                        ▼
┌──────────────────────┐  ┌──────────────────────────────────┐
│ SignalDef (Compute)   │  │  ModuleDef (UI)                  │
│ - Headless compute    │  │  - Svelte widget, ports, icon    │
│ - evaluate(dt)        │  │  - bits-ui controls              │
└──────────────────────┘  └──────────────────────────────────┘
```

## Naming Convention

| Layer | Suffix | Type | Example Variable | Example File |
|-------|--------|------|-----------------|--------------|
| Compute | `_SIGNAL` | `SignalDef` | `LFO_SIGNAL` | `components/lfo.ts` |
| UI | `_MODULE` | `ModuleDef` | `LFO_MODULE` | `components/lfo_ui.ts` |
| Unified | `_NODE` | `NodeDef` | `LFO_NODE` | `nodes/lfo_node.ts` |

## Directory Structure

```
src/lib/node-editor/
├── README.md                     # This file
├── index.ts                      # Public exports + node registration imports
│
├── graph/                        # Compute Engine (headless)
│   ├── types.ts                  # SignalDef, SignalPort, SignalEdge
│   ├── engine.ts                 # SignalGraph class + signal registry
│   └── index.ts
│
├── components/                   # Bausteine (Logic + UI)
│   ├── lfo.ts                    # LFO_SIGNAL: SignalDef
│   ├── lfo_ui.ts                 # LFO_MODULE: ModuleDef
│   ├── LfoContent.svelte         # Svelte content component
│   ├── slider.ts / param_slider_ui.ts / SliderContent.svelte
│   ├── gate.ts / gate_ui.ts / GateContent.svelte
│   ├── switch.ts / switch_ui.ts / SwitchContent.svelte
│   ├── color.ts / color_ui.ts / ColorContent.svelte
│   ├── registry.ts               # Module registry (populated by NodeDef)
│   ├── types.ts                  # ModuleDef, AnyComponent
│   └── index.ts                  # Barrel exports (no auto-registration)
│
├── controls/                     # Reusable UI Controls (bits-ui)
│   ├── Slider.svelte             # Range input
│   ├── WaveBar.svelte            # Vertical bar visualization (0-1)
│   ├── ColorPicker.svelte        # Color input + preview
│   ├── GateButton.svelte         # Trigger button with state
│   ├── ValueDisplay.svelte       # Formatted number display
│   └── index.ts
│
├── nodes/                        # Unified NodeDef (TypeScript only)
│   ├── types.ts                  # NodeDef interface
│   ├── registry.ts               # registerNode(), getNodeDef(), getAllNodeDefs()
│   ├── lfo_node.ts               # LFO_NODE: NodeDef (Signal + Module + Sync)
│   ├── gate_node.ts              # GATE_NODE: NodeDef
│   ├── switch_node.ts            # SWITCH_NODE: NodeDef
│   ├── color_node.ts             # COLOR_NODE: NodeDef
│   ├── param_nodes.ts            # Dynamic: 1 NodeDef per PARAMETER_PRESET
│   └── index.ts
│
├── canvas/                       # SvelteFlow infrastructure
│   ├── EditorCanvas.svelte       # Canvas wrapper (drag & drop)
│   ├── ModuleRenderer.svelte     # Generic renderer for all modules
│   ├── NodeShell.svelte          # Shared node wrapper (header + content)
│   ├── NodeCatalog.svelte        # Dynamic sidebar (reads from registry)
│   ├── canvas.css                # Global node + handle styles
│   └── index.ts
│
├── parameters/                   # VR Parameter Registry
│   └── registry.ts               # { fogNear, terrainAmplitude, ... }
│
└── bridge.ts                     # WebSocket → VR
```

## Data Flow

```
1. User drags cable in Svelte Flow
   └─> edges array updates

2. Sync Loop (requestAnimationFrame):
   ├─> syncNodesToGraph() + NodeDef.syncInputs()
   └─> syncEdgesToGraph()

3. signalGraph.evaluate(dt)
   ├─> Topological sort
   ├─> For each node: compute(inputs, state, dt)
   └─> Outputs stored

4. syncGraphToUI() + NodeDef.syncOutputs()
   ├─> node.data updated with output values
   └─> Changed params batched → bridge.sendSettings()

5. Svelte reactivity
   └─> UI components re-render (WaveBar, Slider, etc.)
```

## Adding a New Node

**Custom node (new behavior):**
1. Create `components/my_thing.ts` → export `MY_THING_SIGNAL: SignalDef`
2. Create `components/my_thing_ui.ts` → export `MY_THING_MODULE: ModuleDef`
3. Create `nodes/my_thing_node.ts` → export `MY_THING_NODE: NodeDef` + `registerNode()`
4. Add side-effect import in `index.ts`: `import "./nodes/my_thing_node"`

**VR parameter node (slider):**
1. Add entry to `PARAMETER_PRESETS` in `parameters/registry.ts`
2. Done — `param_nodes.ts` auto-generates the NodeDef + catalog entry

Zero changes to `+page.svelte`, `NodeCatalog`, or sync logic.

## Import Example

```typescript
import {
  signalGraph,
  getNodeDef,
  getAllNodeDefs,
  PARAMETER_PRESETS,
  ModuleRenderer,
  sendSettings,
} from "$lib/node-editor";
```

---

*Updated: 2026-02-07*
