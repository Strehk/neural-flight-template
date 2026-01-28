# 🔌 WebSocket

Real-time communication between controller (phone/laptop) and VR scene (Quest).

## Modules

| File | Purpose |
|------|---------|
| `client.svelte.ts` | Svelte 5 reactive client (`$state` runes, auto-reconnect) |
| `server.ts` | Server-side connection handler (broadcast-to-others pattern) |
| `protocol.ts` | Message serialization, parsing, and type guard validation |

## Protocol

### Message Types

- **`OrientationData`** — pitch/roll from controller (60Hz)
- **`SpeedCommand`** — accelerate/brake button press/release
- **`SettingsUpdate`** — runtime config changes from settings sidebar

### Data Flow

```
Controller UI → WebSocket → SvelteKit Server → broadcast → VR Scene
```

The server broadcasts to all clients except the sender (prevents echo).

## Client Features

- **SSR-safe**: returns no-op client on server
- **Auto-reconnect**: exponential backoff (1s → 2s → 4s, max 5 attempts)
- **Reactive**: `status` and `lastMessage` are Svelte 5 `$state` runes
