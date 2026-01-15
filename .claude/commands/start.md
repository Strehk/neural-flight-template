---
allowed-tools: Read, Glob, Grep
description: Start new session - reads Workflow, Handover, Plan
---

# Session Start

Prepare a new development session for WebXR VR/AR Starter Template.

## Steps

1. **Understand Workflow** - Read `dev/WORKFLOW.md`
   - Remember the verification steps
   - Remember issue tracking philosophy

2. **Load Context** - Read:
   - `dev/HANDOVER.md` - State from last session
   - `dev/PLAN.md` - Current phase, open tasks

3. **Research Phase** - Before planning:
   - Check if required functionality exists in codebase
   - Check Three.js examples for patterns

4. **Create Plan** - Present to David:
   - What was done last session
   - What's next from PLAN.md
   - Proposed tasks for this session

5. **Wait for Confirmation**
   - Do NOT start without explicit OK from David

---

## After Confirmation

1. **First action:** Checkpoint
   ```bash
   git add -A && git commit -m "checkpoint: 📍 before [task]"
   ```

2. **Follow** `dev/WORKFLOW.md` steps

3. **At session end:** Update `dev/HANDOVER.md`

---

## Quick Reference

### Quality Check

```bash
bunx biome check --write . && bunx tsc --noEmit
```

### Before Writing Code

```
1. Exists in codebase? → USE IT
2. Three.js has it? → USE IT
3. WebXR example? → ADAPT IT
4. Last resort → Write code
```

### WebXR Testing

```bash
# Generate HTTPS certs (once)
bunx mkcert localhost

# Start server
bun --hot ./server.ts

# Access from Quest
# https://[YOUR_IP]:3000
```

---

## Notes

- If $ARGUMENTS provided → focus on that task
- Priority unclear → Ask David
- Discover problem → Create Issue, don't fix immediately
- HTTPS is mandatory for WebXR!
