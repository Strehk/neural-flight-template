# /lab/ — Visual Experiments

Temporary sandbox for Three.js shader and visual experiments.
**Not part of the production system.** Delete this folder when done.

## Rules

- Each subfolder = one isolated experiment
- No WebSocket, no controller integration
- Pure visuals: Three.js + Shaders + Post-Processing
- Self-contained `+page.svelte` per experiment (no shared state)

## Cleanup

```bash
rm -rf src/routes/lab/
```
