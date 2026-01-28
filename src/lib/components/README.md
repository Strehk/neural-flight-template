# 🧩 UI Components

Svelte components for the ICAROS controller interface.

## Components

| File | Purpose |
|------|---------|
| `ControlPad.svelte` | D-Pad (3×3 grid) for pitch/roll input via arrow keys + pointer events |
| `SpeedButtons.svelte` | Accelerate (⚡) / Brake (🛑) buttons with press-and-hold |
| `IcarosPreview.svelte` | 3D preview canvas — loads ICAROS GLB model, reacts to pitch/roll |
| `SettingsSidebar.svelte` | Slide-out settings panel with sliders, switches, color pickers |

## Styling

All components use the brutalist dark theme from `app.css`:
- CSS custom properties (`--bg`, `--surface`, `--accent`, etc.)
- `JetBrains Mono` for labels, `Inter` for body text
- 44px minimum touch targets for mobile
