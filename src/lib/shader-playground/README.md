# 🎨 Shader Playground

> Live TSL shader editor with 3D preview — learn shaders through experimentation.

## What is this?

An interactive teaching tool where students learn shader programming using Three.js Shading Language (TSL). Instead of writing raw GLSL, students manipulate visual modules and see instant 3D results. TSL provides a type-safe, composable node graph that compiles to optimized shader code.

## Pedagogical Concept

The learning journey follows a natural question flow:

```
1. "What comes out?"     → See the 3D result in the preview
2. "What goes in?"       → Discover parameters via sliders and controls
3. "How do I change it?" → Drag sliders, toggle modules, see instant feedback
4. "What happens without this?" → Bypass a module → understand dependencies
5. "Build my own"        → Combine modules, tweak parameters, create something new
```

**Output → Input → Manipulation → Understanding → Creation**

### Widgets as Hypothesis Machines

A slider is a hypothesis machine:

> *"What happens if I make this bigger?"* → Drag slider → 3D preview updates instantly → *"Ah, THAT controls the wave frequency!"*

Without sliders: find the value in code, change it, wait for recompile, compare results.
With sliders: instant feedback, 10x faster iteration, 10x more experiments.

## Signal System

Every module communicates through typed signals:

| Signal | Type | Color | Description |
|--------|------|-------|-------------|
| `color` | `vec4` | purple | RGBA color — primary signal |
| `scalar` | `float` | green | Single value — intensity, time |
| `uv` | `vec2` | blue | Texture coordinates |
| `normal` | `vec3` | orange | Surface direction |
| `sdf` | `float` | red | Signed Distance Field |

Modules have typed input/output ports. Connections are resolved automatically by type-matching in rack order.

## Modules

### Control Modules (4)
Slider, XY Pad, LFO, Noise — generate and modulate values

### Vertex Modules (10)
Twist, SineDisplace, Wave, NoiseDisplace, Explode, Wobble, Flatten, Spherize, Taper, ControlSliders — deform geometry

### Fragment Modules (10)
SolidColor, UVGradient, CosinePalette, Pattern, FragNoise, Mix, UVDistort, SDFCircle, Fresnel, PostProcess — color and shade surfaces

### Modulation Routing
LFO waveforms (sine, triangle, saw, square) can modulate any parameter. Live overlay shows modulation state.

## Pipeline

```
Module[] (Source of Truth)
    ↓ codegen.ts
TSL node composition
    ↓ renderer.ts
Three.js NodeMaterial → 3D Preview
```

Unidirectional flow: modules define the shader, TSL output is always derived — never parsed back.

## File Structure

```
src/lib/shader-playground/
├── modules/
│   ├── types.ts              ← SignalType, ModulePort, ModuleDefinition
│   ├── registry.ts           ← MODULE_REGISTRY (all 24 modules)
│   └── controls/             ← Module UI components (24 .svelte files)
├── components/
│   ├── Rack.svelte           ← Module stack + add button + drag & drop
│   ├── RackModule.svelte     ← Generic wrapper (header, collapse, bypass, ports)
│   ├── Preview.svelte        ← Three.js canvas
│   ├── PreviewToolbar.svelte ← Scene controls (rotation, lighting, geometry)
│   └── CodeView.svelte       ← Read-only TSL output display
├── engine/
│   └── renderer.ts           ← Three.js renderer + NodeMaterial
├── codegen.ts                ← Signal chain → TSL node assembly
├── state.svelte.ts           ← Reactive state (Svelte 5 Runes)
├── shader-playground.css     ← Central styles
└── index.ts
```

## Status

**Early stage / Experimental** — actively developed as part of the ICAROS VR Teaching Platform.

### Next Steps

- Code-slot modules (editable TSL directly in rack modules)
- Tutorial system (3 tracks: Fragment Basics → 3D/Lighting → Advanced, ~14 lessons)
- Experience integration (use playground shaders in VR scenes)
- More modules (SDF primitives, Math/Combine, Envelope)
