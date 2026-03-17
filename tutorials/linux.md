# 🐧 Linux Complete Setup

> From zero to a running development environment on Linux (Ubuntu/Debian).

```mermaid
flowchart LR
    A[📦 apt] --> B[🖥️ Ghostty]
    B --> C[✏️ Zed]
    C --> D[🔧 Git + GitHub]
    D --> E[⚡ Bun]
    E --> F[🔒 mkcert]
    F --> G[📱 ADB]
    G --> H[🤖 OpenCode]
    H --> I[🚀 Ready!]
```

⏱️ **Estimated time:** ~30 minutes
📋 **Prerequisites:** Ubuntu 22.04+ or Debian 12+, nothing else

---

## ⚠️ Linux Gotchas — Read this first!

> **🔑 sudo:** Many commands start with `sudo` — this means **"Super User Do"**, giving admin rights for one command. Linux will ask for your **password** each time.
>
> **⌨️ Password in terminal:** When you type your password, **no characters appear** — not even dots. This is normal! Just type your password and press Enter.
>
> **📱 USB Access:** To connect a Meta Quest via USB, your user may need to be in the `plugdev` group (covered in Step 7).

---

## Step 1 — 📦 apt (Package Manager)

apt is like an **app store for developer tools** — built right into Ubuntu/Debian. Instead of downloading installers from websites, you type one command and apt handles the rest.

**Good news:** apt is already installed! Let's make sure it's up to date:

```bash
# Update package lists (like refreshing the app store)
sudo apt update
```

**✅ Verify:**
```bash
apt --version
```

You should see something like:
```
apt 2.x.x
```

---

## Step 2 — 🖥️ Ghostty (Terminal)

A terminal is your **command center** — it's where you type commands to install tools, run your project, and interact with your code. Ghostty is a modern, fast terminal app.

```bash
# Install Ghostty (Ubuntu 24.10+ / Debian Sid)
sudo apt install ghostty
```

> ⚠️ **On older Ubuntu (22.04, 24.04)?** Ghostty isn't in the default repos yet. You can use your system's built-in terminal (GNOME Terminal, Konsole) — it works just as well! Or install Ghostty from the [official instructions](https://ghostty.org/docs/install/binary#linux).

**✅ Verify:** Open Ghostty from your application launcher or type `ghostty` in your current terminal.

From now on, **use Ghostty** (or your preferred terminal) for all commands in this guide.

---

## Step 3 — ✏️ Zed (Code Editor)

Zed is where you'll **write and read code**. It's fast, has a built-in terminal, and supports all the languages we use.

```bash
# Install Zed (official install script)
curl -fsSL https://zed.dev/install.sh | bash
```

**✅ Verify:** Open Zed from your application launcher or type `zed` in your terminal.

**Quick settings (optional):**
- Open Settings: `Ctrl + ,`
- Increase font size: look for `"ui_font_size"` and `"buffer_font_size"`
- Change theme: `Ctrl + K`, then `Ctrl + T`

**💡 Built-in terminal:** Press `` Ctrl + ` `` (control + backtick) to open a terminal inside Zed. You can run commands right where you write code!

---

## Step 4 — 🔧 Git + GitHub (Version Control)

Git is like **save points in a video game** — it tracks every change you make to your code, so you can always go back if something breaks. **GitHub** is the online platform where the team shares code, reviews changes, and collaborates.

### 4a — Install Git

```bash
# Install Git
sudo apt install git
```

**Now configure Git with your name and email:**

```bash
# Set your name (replace with YOUR name)
git config --global user.name "Your Name"

# Set your email (replace with YOUR email — use the same one as your GitHub account!)
git config --global user.email "your.email@example.com"
```

**✅ Verify:**
```bash
git --version
```

You should see something like:
```
git version 2.x.x
```

### 4b — Create a GitHub account

If you don't have a GitHub account yet:

1. Go to [github.com](https://github.com) in your browser
2. Click **"Sign up"**
3. Use your **university email** (or any email)
4. Choose a username you'll be happy with — this is your developer identity!
5. Verify your email

> 💡 **Pro tip:** Apply for the [GitHub Student Developer Pack](https://education.github.com/pack) — it's free and includes Copilot, private repos, and more.

### 4c — Install GitHub CLI (`gh`)

The GitHub CLI lets you interact with GitHub **from your terminal** — create pull requests, review code, manage issues, all without leaving the command line.

```bash
# Install GitHub CLI (official repo)
sudo mkdir -p -m 755 /etc/apt/keyrings
wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

> 💡 That's a lot of commands! They just add GitHub's official package source so `apt` knows where to find `gh`. You only do this once.

**Now log in to your GitHub account:**

```bash
# Authenticate with GitHub
gh auth login
```

The CLI will guide you through the login:
1. **Where do you use GitHub?** → `GitHub.com`
2. **Preferred protocol?** → `HTTPS`
3. **Authenticate?** → `Login with a web browser`
4. It shows a **one-time code** — copy it
5. Your browser opens → paste the code → click **"Authorize"**

**✅ Verify:**
```bash
gh auth status
```

You should see something like:
```
✓ Logged in to github.com as YourUsername
```

> ⚠️ **Browser didn't open?** Copy the URL shown in the terminal and paste it into your browser manually.

> 📖 **Want to learn more?** See [GitHub Basics](github-basics.md) for branches, pull requests, and the team workflow.

---

## Step 5 — ⚡ Bun (JavaScript Runtime)

Bun is the **engine that runs your code**. Think of it like a car engine — your code is the steering wheel, but Bun is what actually makes things move.

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
```

> ⚠️ **Close and reopen your terminal** after installing Bun, or run `source ~/.bashrc` to load the new PATH.

**✅ Verify:**
```bash
bun --version
```

You should see something like:
```
1.x.x
```

> ⚠️ **"command not found: bun"?** Run `source ~/.bashrc` (or `source ~/.zshrc` if you use zsh) to reload your shell config.

---

## Step 6 — 🔒 mkcert (HTTPS Certificates)

VR in the browser (WebXR) only works over **HTTPS** — a secure connection. mkcert creates certificates that make your local computer trusted for HTTPS.

```bash
# Install dependencies for mkcert
sudo apt install libnss3-tools

# Download mkcert binary
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"

# Make it executable
chmod +x mkcert-v*-linux-amd64

# Move to system path
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# Install the local certificate authority (one-time setup)
mkcert -install
```

**✅ Verify:**
```bash
mkcert --version
```

You should see something like:
```
v1.x.x
```

> ⚠️ **"Permission denied"?** Make sure to use `sudo` for the `mv` command. The `mkcert -install` command should work without sudo.

---

## Step 7 — 📱 ADB (USB Bridge to Quest)

ADB (Android Debug Bridge) connects your computer to the **Meta Quest** headset via USB cable. This lets you test your VR worlds directly on the Quest.

> 💡 **Only needed if you have a Meta Quest.** You can skip this step and come back later.

```bash
# Install ADB
sudo apt install adb
```

**USB permissions — add your user to the plugdev group:**

```bash
# Allow your user to access USB devices
sudo usermod -aG plugdev $USER
```

> ⚠️ **You need to log out and log back in** for the group change to take effect.

**✅ Verify:**
```bash
adb version
```

You should see something like:
```
Android Debug Bridge version 1.0.x
```

---

## Step 8 — 🤖 OpenCode (AI Coding Assistant)

OpenCode is an **AI assistant that runs in your terminal**. You can ask it questions about the codebase, have it explain code, or even write code for you.

```bash
# Install OpenCode
curl -fsSL https://opencode.ai/install | bash
```

> ⚠️ If the install script doesn't work, install via npm instead:
> ```bash
> bun install -g opencode
> ```

**✅ Verify:**
```bash
opencode --version
```

> 📖 **API Key Setup:** OpenCode requires an API key to work. Follow the official setup guide: [opencode.ai/docs](https://opencode.ai/docs/)

---

## ✅ Final Checklist

Run all of these to confirm everything is installed:

```bash
git --version        # ✅ Git
gh auth status       # ✅ GitHub CLI (logged in)
bun --version        # ✅ Bun (1.0+)
mkcert --version     # ✅ mkcert
adb version          # ✅ ADB (optional)
opencode --version   # ✅ OpenCode
```

Open these apps to confirm they launch:
- ✅ **Ghostty** (or your terminal) — your command center
- ✅ **Zed** — your code editor

---

## 📺 Video Resources

Prefer watching? These videos cover the tools you just installed:

| Topic | Video | Duration |
|-------|-------|----------|
| ⌨️ Terminal | [Terminal Crash Course — For Absolute Beginners](https://www.youtube.com/watch?v=hREnP0HslK8) | 52 min |
| ✏️ Zed | [Zed Editor 101 — Ultimate Setup Guide](https://www.youtube.com/watch?v=NAk4tyfIM3A) | 28 min |
| 🔧 Git | [Git and GitHub Course For Beginners](https://www.youtube.com/watch?v=bFHwtm6FQ4c) | 30 min |

---

## 🚀 Next Step

Your development environment is ready! Continue with:

👉 [**First Steps — Clone, Run, Explore**](first-steps.md)
