# WORKFLOW

WebXR + Three.js development workflow for Meta Quest 3.

## Principles

- **KISS** - Simplest solution wins
- **Separation of Concerns** - Scene / Logic / Server separate
- **Clean Code** - Readable > clever

---

## STEPS

### STEP: checkpoint

TRIGGER: Before risky changes OR start of new feature
ACTION: `git add -A && git commit -m "checkpoint: 📍 before [description]"`

---

### STEP: research

TRIGGER: Unclear requirements OR new Three.js/WebXR feature

ACTIONS:
```
1. CODEBASE: Does this already exist here?
   - Grep for similar functions/patterns
   - Read related files
   → If found: USE IT

2. THREE.JS: Does Three.js have this built-in?
   - Check three/examples/jsm/ for existing modules
   - mcp__context7__ for Three.js docs
   → If found: USE IT

3. WEBXR: Check WebXR examples
   - Three.js WebXR examples: node_modules/three/examples/webxr/
   → If found: ADAPT IT

4. ONLY THEN: Plan custom implementation
```

Tool priority: Codebase search > Three.js examples > mcp__context7__ > WebSearch

SKIP_IF: Requirements clear AND solution approach known

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
2. One feature/fix per iteration
3. Follow WebXR rules from `.claude/rules/webxr-typescript.md`

---

### STEP: verify

TRIGGER: After implement

```bash
# Lint + Format
bunx biome check --write .

# Type check
bunx tsc --noEmit
```

**Quest Testing (USB-C + ADB):**
```bash
# 1. Ensure ADB connection
adb devices

# 2. Port forwarding (if not already done)
adb reverse tcp:3000 tcp:3000

# 3. Start server
bun --hot ./server.ts

# 4. Open in Quest Browser: https://localhost:3000
```

Browser verification checklist:
- [ ] `adb devices` shows Quest
- [ ] Page loads without console errors
- [ ] "Enter VR" button appears
- [ ] VR session starts on Quest
- [ ] Scene renders correctly in VR

MAX_ITERATIONS: 3

---

### STEP: commit

TRIGGER: After verify
ACTIONS:
1. `git add -A`
2. `git commit -m "type: emoji description"`
3. Update `dev/HANDOVER.md`
4. Update `dev/PLAN.md` (check off tasks)

---

## ISSUE TRACKING

**Don't fix problems immediately!**

```
1. Discover problem
2. Create Issue: gh issue create --title "..." OR note in PLAN.md Backlog
3. Continue current task
4. Fix in dedicated session
```

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
| checkpoint | 📍 | Stable state |

---

## CONSTRAINTS

- NEVER mention AI/Claude in commits
- ALWAYS check Three.js examples before custom code
- ALWAYS test in VR before commit
- ALWAYS update docs at session end
- ALWAYS use HTTPS for WebXR testing
