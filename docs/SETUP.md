# 🔧 Setup Guide

> 🆕 **Complete beginner?** Looking for a full guide including editor, terminal, and AI tools? → [tutorials/](../tutorials/README.md)

Complete setup instructions for Mac, Windows, and Linux.

---

## Prerequisites

### 1. Bun (Runtime)

**Mac/Linux:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows:**
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Verify: `bun --version` (should be 1.0+)

### 2. Android Debug Bridge (ADB)

Required to connect Quest via USB.

**Mac:**
```bash
brew install android-platform-tools
```

**Windows:**
1. Download [Android SDK Platform Tools](https://developer.android.com/tools/releases/platform-tools)
2. Extract to `C:\adb\`
3. Add `C:\adb\` to your PATH

**Linux (Debian/Ubuntu):**
```bash
sudo apt install adb
```

Verify: `adb version`

### 3. mkcert (HTTPS Certificates)

WebXR requires HTTPS. mkcert creates locally-trusted certificates.

**Mac:**
```bash
brew install mkcert
mkcert -install
```

**Windows:**
```powershell
choco install mkcert
mkcert -install
```

**Linux:**
```bash
sudo apt install libnss3-tools
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
mkcert -install
```

---

## HTTPS Certificate Setup

Generate certificates for local development:

```bash
cd /path/to/project
mkcert localhost
```

This creates `localhost.pem` and `localhost-key.pem` in the project root. The dev server automatically uses these certificates when present.

---

## Quest Developer Mode

1. **Create Developer Account** at [developer.oculus.com](https://developer.oculus.com)
2. **Enable Developer Mode** in Oculus mobile app:
   - Devices → Select Quest → Settings → Developer Mode → Enable
3. **Allow USB Debugging** when prompted on Quest

---

## Connect Quest to Dev Server

### USB Connection (Recommended)

```bash
# 1. Connect Quest via USB-C
adb devices
# Should show: XXXXXXXX device

# 2. Create reverse tunnel
adb reverse tcp:5173 tcp:5173

# 3. Start dev server
bun run dev

# 4. Open on Quest Browser
# https://localhost:5173/vr
```

### Wi-Fi Connection (Alternative)

```bash
# 1. Get Quest IP from Settings → Wi-Fi → Connected network
# 2. Start dev server on 0.0.0.0
bun run dev --host

# 3. Open on Quest Browser
# https://YOUR_PC_IP:5173/vr
```

> ⚠️ Wi-Fi has higher latency. USB is recommended for development.

---

## Troubleshooting

### "Device unauthorized"

```bash
adb kill-server
adb start-server
adb devices
```

Then check Quest for USB debugging permission popup.

### "Connection refused" on Quest

```bash
# Re-establish tunnel
adb reverse tcp:5173 tcp:5173

# Verify tunnel
adb reverse --list
```

### Certificate errors in Quest Browser

1. Ensure `localhost.pem` and `localhost-key.pem` exist in project root
2. Restart dev server after generating certs
3. If still failing, use `adb reverse` method (avoids cert issues)

### WebXR not available

- Ensure using HTTPS (not HTTP)
- Quest Browser requires HTTPS for WebXR
- Localhost with valid cert should work

### Device Orientation not working (Controller)

- Mobile browsers require HTTPS for Device Orientation API
- Some browsers require user gesture to enable sensors
- iOS Safari: Settings → Safari → Motion & Orientation Access → Enable

### High latency in VR

- Use USB connection instead of Wi-Fi
- Close other tabs on Quest
- Check `adb reverse --list` shows active tunnel

---

## Verified Setups

| OS | Browser | Status |
|----|---------|--------|
| Mac (Apple Silicon) | Quest Browser | ✅ |
| Mac (Intel) | Quest Browser | ✅ |
| Windows 11 | Quest Browser | ✅ |
| Ubuntu 22.04 | Quest Browser | ✅ |

---

## Next Steps

Once connected:
1. Open `/vr` on Quest → Click "Enter VR"
2. Open `/controller` on laptop/phone
3. Use D-Pad or tilt device to control flight
4. Adjust settings via sidebar (☰ menu)

See [CUSTOMIZATION.md](CUSTOMIZATION.md) for modifying the VR world.
