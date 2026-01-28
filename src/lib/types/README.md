# 📐 TypeScript Types

Shared interfaces for the WebSocket protocol and connection management.

## Files

| File | Types |
|------|-------|
| `orientation.ts` | `OrientationData`, `SpeedCommand`, `SettingsUpdate`, `ControllerMessage` |
| `websocket.ts` | `ConnectionStatus`, `WebSocketClientOptions` |

## Message Flow

All messages between controller and VR scene are typed as `ControllerMessage`:
- `OrientationData` — pitch/roll input (60Hz)
- `SpeedCommand` — accelerate/brake toggle
- `SettingsUpdate` — runtime config changes from settings sidebar
