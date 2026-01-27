# WORKFLOW — SvelteKit + WebXR

ICAROS VR Flight Sim development workflow.

## Principles

- **KISS** — Simplest solution wins
- **Separation of Concerns** — Route / Component / Three.js / WebSocket separate
- **Clean Code** — Readable > clever

---

## STEPS

### STEP: checkpoint

TRIGGER: Before risky changes OR start of new feature
ACTION: `git add -A && git commit -m "checkpoint: 📍 before [description]"`

---

### STEP: research

TRIGGER: Unclear requirements OR new SvelteKit/Three.js/WebXR feature

ACTIONS:
```
1. CODEBASE: Does this already exist?
   - Grep for similar functions/patterns
   - Read related files
   → If found: USE IT

2. SVELTEKIT / BITS-UI: Built-in solution?
   → If found: USE IT

3. THREE.JS: Built-in or examples/jsm?
   → If found: USE IT / ADAPT IT

4. ONLY THEN: Plan custom implementation
```

Tool priority: Codebase search > SvelteKit docs > Three.js examples > context7 > WebSearch

SKIP_IF: Requirements clear AND solution known

---

### STEP: plan

TRIGGER: Complex tasks (multiple files OR architectural decisions)
SKIP_IF: Trivial changes (typos, single-line fixes)

Use subagents for complex scope analysis:
- Explore agents (parallel, haiku) for finding files
- Plan agent (sonnet) for implementation strategy

---

### STEP: implement

TRIGGER: After plan OR after research
ACTIONS:
1. Small, focused changes
2. One feature per iteration
3. Follow rules from `.claude/rules/sveltekit-webxr.md`

---

### STEP: verify

TRIGGER: After implement

```bash
# Lint + Format
bunx biome check --write .

# Type check
bunx svelte-check --threshold warning

# Dev server
bun run dev
```

**Quest Testing (USB-C + ADB):**
```bash
adb devices
adb reverse tcp:5173 tcp:5173
bun run dev
# Quest Browser: https://localhost:5173/vr
```

**WebSocket Test:**
1. Open `/controller` on phone/laptop
2. Open `/vr` on Quest
3. Verify orientation data flows through

MAX_ITERATIONS: 3

---

### STEP: commit

TRIGGER: After verify
ACTIONS:
1. `git add [files]`
2. `git commit -m "type: ✨ description"`
3. Update `dev/HANDOVER.md`
4. Update `dev/PLAN.md` (check off tasks)

---

## COMMIT TYPES

| Type | Emoji | Use |
|------|-------|-----|
| feat | ✨ | New feature |
| fix | 🐛 | Bug fix |
| refactor | ♻️ | Restructure |
| style | 💄 | Formatting |
| docs | 📝 | Documentation |
| chore | 🔧 | Maintenance |
| test | ✅ | Tests |
| perf | ⚡ | Performance |
| checkpoint | 📍 | Stable state |

---

## ISSUE TRACKING

Don't fix problems immediately!
1. Discover problem → Note in PLAN.md Backlog
2. Continue current task
3. Fix in dedicated session

---

## CONSTRAINTS

- ❌ Never mention AI/Claude in commits
- ❌ Never use `any` type
- ❌ Never use `requestAnimationFrame` (use `renderer.setAnimationLoop`)
- ✅ Always test WebSocket flow before commit
- ✅ Always use HTTPS for WebXR testing
- ✅ Always update docs at session end
