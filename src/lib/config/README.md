# ⚙️ Config

Central configuration for all tuning values. Single source of truth — no magic numbers in modules.

## `flight.ts`

| Group | Key Values |
|-------|-----------|
| `FLIGHT` | Base/accel/brake speed, LERP alpha, roll-yaw multiplier |
| `CAMERA` | FOV, near/far clip planes |
| `CONTROLS` | Step degrees, pitch/roll ranges |
| `RINGS` | Per-chunk count, radius, colors, collection distance |
| `SCENE` | Sky color, fog range, sun intensity/color/position |
| `TERRAIN` | Chunk size (128), view radius, segments (32), noise params |
| `TERRAIN_COLORS` | Height-based gradient bands (grass → snow) |
| `DECORATIONS` | Trees/rocks per chunk, 10 crown colors |
| `SKY` | Dome radius, vertex-color gradient (top/horizon/bottom) |
| `CLOUDS` | Count, spread, height range, blob params, drift speed |

## Runtime Config

`runtimeConfig` is a mutable copy of defaults that can be changed at runtime via WebSocket `SettingsUpdate` messages from the controller sidebar. Call `resetRuntimeConfig()` to restore defaults.
