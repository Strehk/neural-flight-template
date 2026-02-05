# Node Editor Architecture

> Inspired by [Strudel-Flow](https://github.com/xyflow/strudel-flow)

## Core Principle

Two separate layers, simply connected:

```
┌─────────────────────────────────────────────────────────────┐
│  Svelte Flow (UI Layer)                                      │
│  - Nodes: Position, Rendering, Handles                       │
│  - Edges: Connection lines                                   │
│  - Interaction: Drag, Connect, Select                        │
└──────────────────────────┬──────────────────────────────────┘
                           │ sync()
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  SignalGraph (Compute Layer)                                 │
│  - Nodes: ID, Type, State, Outputs                           │
│  - Edges: Source → Target Port                               │
│  - evaluate(dt): Topological sort + computation              │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/lib/node-editor/
├── README.md                     # This file
├── index.ts                      # Public exports
│
├── graph/                        # Compute Engine
│   ├── types.ts                  # Signal, Port, NodeDef, Edge
│   ├── engine.ts                 # SignalGraph class
│   └── index.ts
│
├── definitions/                  # Node Logic (pure functions)
│   ├── lfo.ts                    # compute(), createState()
│   ├── slider.ts
│   ├── gate.ts
│   ├── switch.ts
│   └── index.ts                  # Auto-registration
│
├── controls/                     # Reusable UI Controls
│   ├── Slider.svelte             # Range input
│   ├── WaveBar.svelte            # Vertical bar visualization (0-1)
│   ├── ColorPicker.svelte        # Color input + preview
│   ├── GateButton.svelte         # Trigger button with state
│   ├── ValueDisplay.svelte       # Formatted number display
│   └── index.ts
│
├── nodes/                        # Node Components (use controls/)
│   ├── LfoNode.svelte
│   ├── SliderNode.svelte
│   ├── GateNode.svelte
│   ├── SwitchNode.svelte
│   ├── ColorNode.svelte
│   ├── NodeCatalog.svelte        # Sidebar with drag & drop
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
   ├─> syncEdgesToGraph(edges, graph)
   └─> syncNodesToGraph(nodes, graph)

3. graph.evaluate(dt)
   ├─> Topological sort
   ├─> For each node: compute(inputs, state, dt)
   └─> Outputs stored

4. syncGraphToUI(nodes, graph)
   └─> node.data updated with output values

5. Svelte reactivity
   └─> UI components re-render (WaveBar, Slider, etc.)

6. Output nodes call bridge.sendSettings()
   └─> WebSocket → VR Scene
```

## Controls

| Control | Type | Input? | Visual? | Example |
|---------|------|--------|---------|---------|
| `Slider.svelte` | Range | ✅ | ✅ | Speed, Amplitude |
| `WaveBar.svelte` | Bar | ❌ | ✅ | LFO Output (0-1 as height) |
| `ColorPicker.svelte` | Color | ✅ | ✅ | Color selection + preview |
| `GateButton.svelte` | Button | ✅ | ✅ | HIGH/LOW state |
| `ValueDisplay.svelte` | Text | ❌ | ✅ | Numeric value |

## Node Categories

| Category | Border Color | Example Nodes |
|----------|--------------|---------------|
| Input | `--success` | LFO |
| Process | `--border` | Slider |
| Trigger | `--warning` | Gate |
| Logic | `--info` | Switch |
| Output | `--border` | Color |

## Import Example

```typescript
import {
  signalGraph,
  remap,
  PARAMETER_PRESETS,
  LfoNode,
  SliderNode,
  sendSettings,
} from "$lib/node-editor";
```

---

*Updated: 2026-02-04*
