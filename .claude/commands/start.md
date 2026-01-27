---
allowed-tools: Read, Glob, Grep
description: Start new session — reads Workflow, Handover, Plan
---

# Session Start — ICAROS VR Flight Sim

Prepare a new development session.

## Steps

1. **Understand Workflow** — Read `dev/WORKFLOW.md`
   - Remember the verification steps
   - Remember issue tracking philosophy

2. **Load Context** — Read:
   - `dev/HANDOVER.md` — State from last session
   - `dev/PLAN.md` — Current phase, open tasks

3. **Research Phase** — Before planning:
   - Check if required functionality exists in codebase
   - Check if libraries are available

4. **Present Status** to David:
   - What was done last session
   - Current phase + open tasks from PLAN.md
   - Proposed focus for this session

5. **Wait for Confirmation**
   - Do NOT start without explicit OK from David

---

## After Confirmation

1. **Checkpoint:**
   ```bash
   git add -A && git commit -m "checkpoint: 📍 before [task]"
   ```

2. **Follow** `dev/WORKFLOW.md` steps

3. **At session end:** Update `dev/HANDOVER.md`

---

## Quick Reference

### Quality Check

```bash
bunx biome check --write . && bunx svelte-check --threshold warning
```

### Decision Tree

```
1. Exists in codebase? → USE IT
2. SvelteKit / bits-ui has it? → USE IT
3. Three.js has it? → USE IT / ADAPT
4. Last resort → Write code
```

### WebXR Testing (Quest)

```bash
adb devices && adb reverse tcp:5173 tcp:5173
bun run dev
# Quest Browser: https://localhost:5173/vr
```

### WebSocket Testing

1. `/controller` on phone → sends OrientationData
2. `/vr` on Quest → receives + applies to flight

---

## Notes

- If $ARGUMENTS provided → focus on that task
- Priority unclear → Ask David
- Discover problem → Note in PLAN.md Backlog, don't fix immediately
