# 🐙 GitHub Basics — Team Workflow 1×1

> GitHub is where your team shares code, reviews changes, and collaborates. This guide explains the concepts and commands you'll use daily.

📋 **Prerequisites:** Git and GitHub CLI (`gh`) installed and authenticated (see your [OS setup guide](README.md))

---

## 🧠 Key Concepts

### What is GitHub?

Think of it like this:
- **Git** = save system on your computer (local)
- **GitHub** = cloud storage where the team shares saves (remote)

```
💻 Your Computer ── git push ──► 🐙 GitHub ◄── git push ── 💻 Teammate
                 ◄── git pull ──           ── git pull ──►
```

### Branches — Parallel Universes

A **branch** is like a parallel universe of the code. You work on your own branch without affecting others, then merge your changes when you're done.

```
main:        ●───────────────────●  (merge!)
              \                 /
my-feature:    ●── add terrain ──● add clouds
```

| Term | Analogy | Meaning |
|------|---------|---------|
| `main` | The "official" version | Default branch, always working |
| Branch | Parallel universe | Your isolated workspace |
| Commit | Save point | Snapshot of your changes |
| Push | Upload | Send your saves to GitHub |
| Pull | Download | Get the team's latest saves |
| Pull Request (PR) | "Please review my work" | Ask the team to merge your branch |
| Merge | Combine universes | Add your changes to `main` |

---

## 🎓 Your First Pull Request — Walkthrough

This is the exact workflow you'll follow in class. You clone the project, make changes, and send a Pull Request to David for review.

```
📂 Clone → 🌿 Branch → ✏️ Edit → 💾 Commit → 🚀 Push → 📝 PR → 👀 Review → ✅ Merged!
```

### 1. 📂 Clone the project (one time only)

```bash
# Download the project from GitHub
git clone https://github.com/dweigend/simple_flight.git
cd simple_flight

# Install dependencies
bun install
```

You now have a copy of the project on your computer. You only do this once!

### 2. 🌿 Create your own branch

**Important:** Never work directly on `main`! Always create your own branch first.

**In Zed:**
`Cmd + Shift + P` → type `git branch` → Enter → name it, e.g.:
```
add-my-experience
```

**Or in terminal:**
```bash
git checkout -b add-my-experience
```

**✅ Verify:** The bottom-left of Zed's Git Panel now shows `simple_flight / add-my-experience` instead of `main`.

### 3. ✏️ Make your changes

Edit files, create your experience, modify shaders — whatever your task is.

> ⚠️ **This is the critical step!** If you skip this and push an empty branch, your PR will have no changes and GitHub will say _"There isn't anything to compare"_. You **must** change or add at least one file.

### 4. 💾 Commit your changes

**In Zed (Git Panel):**
1. Open Git Panel: `Cmd + Shift + G`
2. You'll see your changed files listed
3. Click **"Stage All"** (top right) — or check individual files
4. Type a commit message in the text field at the bottom:
   ```
   feat: ✨ add underwater experience with coral reef
   ```
5. Press `Cmd + Enter` to commit

**Or in terminal:**
```bash
# See what you changed
git status

# Stage all changes
git add .

# Commit with a message
git commit -m "feat: ✨ add underwater experience with coral reef"
```

**✅ Verify:** The Git Panel shows your commit at the bottom (with an "Uncommit" button).

> ⚠️ **"Nothing to commit"?** You haven't changed any files yet. Go back to step 3 and make some changes first!

### 5. 🚀 Push to GitHub

**In Zed:**
Click the **"Publish"** dropdown (bottom of Git Panel) → **Push**

Or: `Ctrl + G` → `↑` (arrow up)

**Or in terminal:**
```bash
git push -u origin add-my-experience
```

**✅ Verify:** No errors. Your branch is now on GitHub!

### 6. 📝 Create the Pull Request

**In Zed:**
`Cmd + Shift + P` → type `git create pull request` → Enter
→ GitHub opens in your browser with a pre-filled PR form

**Or in terminal:**
```bash
gh pr create --title "feat: ✨ add underwater experience" --body "My first VR experience with a coral reef and fish."
```

**Or on GitHub:**
1. Go to [github.com/dweigend/simple_flight](https://github.com/dweigend/simple_flight)
2. You'll see a yellow banner: _"add-my-experience had recent pushes"_
3. Click **"Compare & pull request"**
4. Write a title and description → Click **"Create pull request"**

**✅ Done!** David gets notified and will review your code. 🎉

### 7. 👀 Wait for review

David will look at your PR and either:
- ✅ **Approve & Merge** — your code is now in `main`!
- 💬 **Comment** — asks a question or suggests a change
- 🔄 **Request changes** — you need to fix something

**If you need to make changes after the PR:**
```bash
# Make your edits, then:
git add .
git commit -m "fix: 🐛 address review feedback"
git push
```
The PR updates automatically — no need to create a new one!

### 8. 🧹 After your PR is merged

```bash
# Go back to main and get the latest code
git checkout main
git pull

# Delete your old branch (it's merged, you don't need it)
git branch -d add-my-experience
```

Now start again from **Step 2** for your next task!

---

> ### ⚠️ The #1 Mistake: Push without Commit
>
> ```
> ❌ Branch → Push → PR    (PR is empty — "nothing to compare!")
> ✅ Branch → Edit → Commit → Push → PR    (PR shows your changes)
> ```
>
> A Pull Request compares your branch to `main`. If you haven't committed any changes, your branch is identical to `main` and GitHub has nothing to show. **Always commit before you push!**

---

## 🔄 The Daily Workflow (Summary)

Here's what a typical work session looks like:

```
🔄 Pull → 🌿 Branch → ✏️ Code → 💾 Commit → 🚀 Push → 📝 PR → 👀 Review → ✅ Merge
```

### 1. 🔄 Pull the latest changes

Always start by getting the team's latest code:

```bash
# Make sure you're on the main branch
git checkout main

# Download the latest changes
git pull
```

**What you should see:**
```
Already up to date.
```
Or a list of updated files if someone else pushed changes.

### 2. 🌿 Create a new branch

Never work directly on `main`! Create a branch for your feature:

```bash
# Create and switch to a new branch
git checkout -b my-terrain-feature
```

**Naming tips:**
- `add-ocean-experience` ✅ (describes what you're doing)
- `fix-clouds-not-rendering` ✅ (describes the problem)
- `update` ❌ (too vague)
- `test123` ❌ (meaningless)

**✅ Verify:**
```bash
# See which branch you're on
git branch
```

The active branch has a `*` next to it:
```
  main
* my-terrain-feature
```

### 3. ✏️ Write your code

This is where you do your actual work — edit files, create new experiences, modify shaders, etc.

### 4. 💾 Commit your changes

After making changes, save them as a commit:

```bash
# See what you changed
git status
```

You'll see something like:
```
Changes not staged for commit:
  modified:   src/lib/experiences/my-world/scene.ts
  modified:   src/lib/experiences/my-world/manifest.ts

Untracked files:
  src/lib/experiences/my-world/player.ts
```

```bash
# Stage the files you want to commit
git add src/lib/experiences/my-world/

# Create a commit with a descriptive message
git commit -m "feat: ✨ add terrain and clouds to my-world experience"
```

**Commit message format:**

```
type: emoji description

Examples:
feat: ✨ add ocean waves to underwater experience
fix: 🐛 fix clouds not rendering on Quest
refactor: ♻️ simplify player movement logic
docs: 📝 update experience README
style: 🎨 adjust sky gradient colors
```

| Type | Emoji | When to use |
|------|-------|-------------|
| `feat` | ✨ | New feature or functionality |
| `fix` | 🐛 | Bug fix |
| `refactor` | ♻️ | Code restructuring (no new features) |
| `docs` | 📝 | Documentation changes |
| `style` | 🎨 | Visual/style changes |

### 5. 🚀 Push to GitHub

Upload your branch to GitHub:

```bash
# First push of a new branch (sets up tracking)
git push -u origin my-terrain-feature
```

For subsequent pushes on the same branch:

```bash
git push
```

**✅ Verify:** Your branch is now visible on GitHub!

### 6. 📝 Create a Pull Request

A Pull Request (PR) says: _"Hey team, I finished this feature — please review and merge it."_

```bash
# Create a pull request using GitHub CLI
gh pr create --title "feat: ✨ add terrain to my-world" --body "Added procedural terrain and clouds to the my-world experience."
```

The CLI will show you a link to the PR on GitHub.

**Or do it on GitHub:**
1. Go to the repository on [github.com](https://github.com)
2. You'll see a yellow banner: _"my-terrain-feature had recent pushes"_
3. Click **"Compare & pull request"**
4. Add a title and description
5. Click **"Create pull request"**

### 7. 👀 Get a review

Your teammates (or David) will review your code:
- ✅ **Approved** — ready to merge!
- 💬 **Comment** — questions or suggestions
- ❌ **Changes requested** — fix something first

You can check the status:

```bash
# See your open pull requests
gh pr list
```

### 8. ✅ Merge to main

Once approved, merge your PR:

```bash
# Merge via CLI
gh pr merge
```

Or click **"Merge pull request"** on GitHub.

After merging, clean up:

```bash
# Switch back to main
git checkout main

# Get the merged changes
git pull

# Delete the old branch (optional)
git branch -d my-terrain-feature
```

---

## 🆘 Common Situations

### "I made changes on the wrong branch!"

```bash
# Stash (temporarily save) your changes
git stash

# Switch to the correct branch
git checkout correct-branch

# Apply the stashed changes
git stash pop
```

### "I want to undo my last commit"

```bash
# Undo the last commit but keep the changes
git reset --soft HEAD~1
```

### "Someone else changed the same file!"

This is called a **merge conflict**. Git can't automatically combine the changes, so you need to choose.

```bash
# Update your branch with the latest main
git checkout main
git pull
git checkout my-feature
git merge main
```

If there's a conflict, Git marks the file:
```
<<<<<<< HEAD
your version of the code
=======
their version of the code
>>>>>>> main
```

**Fix it by:**
1. Open the file in Zed
2. Choose which version to keep (or combine both)
3. Remove the `<<<<<<<`, `=======`, and `>>>>>>>` markers
4. Save the file
5. `git add .` → `git commit -m "fix: 🐛 resolve merge conflict"`

> 💡 **Don't panic!** Merge conflicts look scary but are normal. Ask for help if you're unsure.

### "I want to see what my teammates are working on"

```bash
# List all open pull requests
gh pr list

# View a specific PR in the terminal
gh pr view 42

# Open a PR in the browser
gh pr view 42 --web
```

---

## 📋 Quick Reference

### Daily Commands

```bash
# Start of session
git checkout main           # go to main branch
git pull                    # get latest changes
git checkout -b my-feature  # create new branch

# While working
git status                  # what changed?
git diff                    # see exact changes
git add .                   # stage all changes
git commit -m "feat: ✨ ..."  # save changes
git push                    # upload to GitHub

# When done
gh pr create                # create pull request
gh pr list                  # see open PRs
gh pr merge                 # merge after approval
```

### Useful `gh` Commands

```bash
gh pr list                  # list open pull requests
gh pr create                # create a new PR
gh pr view 42               # view PR #42
gh pr checkout 42           # switch to PR #42's branch
gh pr merge                 # merge current PR
gh issue list               # list open issues
gh issue create             # create a new issue
gh repo view --web          # open the repo in browser
```

---

## 📌 Cheat Sheet

```
BRANCHES              SAVING                 GITHUB
─────────             ─────────              ─────────
checkout -b = create  add .   = stage        push     = upload
checkout    = switch  commit  = save         pull     = download
branch      = list    status  = what changed gh pr    = pull request
branch -d   = delete  diff    = show changes gh issue = issues

WORKFLOW: pull → branch → code → add → commit → push → PR → merge
```

---

## 📺 Video Resources

Want to see this in action? These videos explain Git & GitHub visually:

| Video | Duration | What you'll learn |
|-------|----------|-------------------|
| [Git and GitHub Course For Beginners](https://www.youtube.com/watch?v=bFHwtm6FQ4c) | 30 min | ⭐ Best quick start — setup to Pull Requests |
| [Visualized Git Course](https://www.youtube.com/watch?v=S7XpTAnSDL4) | 1h 12min | Branches + PRs shown as visual diagrams |
| [Git & GitHub Crash Course](https://www.youtube.com/watch?v=l2yrJtwoC_E) | ~1h | CLI + GitHub UI, includes rebase |
| [Git Tutorial for Beginners](https://www.youtube.com/watch?v=5bVCXWGOJhM) | 40 min | Practical project + stash + PRs |

---

## 🔙 Back to tutorials

← [Setup Tutorials Overview](README.md) · [Terminal Basics](terminal-basics.md)
