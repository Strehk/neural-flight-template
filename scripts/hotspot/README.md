# 📡 ICAROS Hotspot Setup

Run the entire ICAROS VR platform **offline** — no external Wi-Fi needed. The instructor's laptop creates a local hotspot, students connect phones (gyro controller) and Quest headsets via QR code scan.

## Quick Start

```bash
# 1. Copy config
cp scripts/hotspot/hotspot.conf.example scripts/hotspot/hotspot.conf

# 2. Generate TLS certificates (one-time)
bun run hotspot:setup

# 3. Start hotspot
bun run hotspot:start

# 4. Start dev server
bun run dev
```

Open the landing page — QR codes appear automatically when `hotspot.conf` exists.

---

## Config (`hotspot.conf`)

```bash
HOTSPOT_SSID="ICAROS-VR"        # Network name students see
HOTSPOT_PASSWORD="icaros2024"    # Network password
HOTSPOT_INTERFACE="en0"          # Wi-Fi interface (macOS: en0, Linux: wlan0)
```

This file is **gitignored** (contains password). Copy from `hotspot.conf.example` and adjust.

---

## HTTPS with mkcert

WebXR requires HTTPS — even on local networks. Self-signed certificates trigger browser warnings that block Quest access. **mkcert** solves this by creating a local Certificate Authority (CA) trusted by your OS and browsers.

### How it works

1. `mkcert -install` → creates a local CA in your system trust store
2. `mkcert localhost 192.168.x.x ...` → generates certs signed by that CA
3. Browsers on the **same machine** trust these certs automatically
4. Quest/phones need the CA cert installed manually (see below)

### Install mkcert

```bash
# macOS
brew install mkcert

# Linux (Debian/Ubuntu)
sudo apt install mkcert

# Windows
choco install mkcert
```

### Generate certificates

```bash
bun run hotspot:setup
```

This creates `localhost.pem` + `localhost-key.pem` (gitignored via `*.pem`).

---

## macOS Hotspot

### Via System Settings (recommended)

1. **System Settings → General → Sharing → Internet Sharing**
2. Share from: **Ethernet** or **Thunderbolt Bridge**
3. To: **Wi-Fi**
4. Click **Wi-Fi Options**: set Name + Password from your `hotspot.conf`
5. Enable Internet Sharing toggle

### Offline (no upstream connection)

If the laptop has **no internet** at all, macOS won't enable Internet Sharing. Workaround:

```bash
# Create a fake upstream interface
sudo ifconfig lo0 alias 10.0.0.1

# Then share from "Loopback" to Wi-Fi in System Settings
```

### Via Script

```bash
bun run hotspot:start   # Shows instructions for macOS
bun run hotspot:stop    # Shows how to disable
```

---

## Linux Hotspot

Uses NetworkManager (`nmcli`):

```bash
bun run hotspot:start
# Runs: nmcli device wifi hotspot ifname wlan0 ssid ICAROS-VR password icaros2024

bun run hotspot:stop
# Runs: nmcli connection down Hotspot
```

---

## Windows Hotspot

Run in PowerShell (Admin):

```powershell
netsh wlan set hostednetwork mode=allow ssid=ICAROS-VR key=icaros2024
netsh wlan start hostednetwork

# To stop:
netsh wlan stop hostednetwork
```

Or use **Settings → Network → Mobile Hotspot** (Windows 10/11 GUI).

---

## Connecting Devices

### Phones (Gyro Controller)

1. Open landing page on laptop
2. Student scans **WiFi QR code** → connects to hotspot
3. Student scans **Gyro QR code** → opens `/gyro` route
4. Done — phone sends orientation data via WebSocket

### Meta Quest 3

1. Connect Quest to hotspot Wi-Fi (Settings → Wi-Fi)
2. **Install CA certificate** for HTTPS:
   - Copy `~/Library/Application Support/mkcert/rootCA.pem` to Quest
   - Quest: Settings → Security → Install certificate
3. Open Quest Browser → navigate to `https://<laptop-ip>:5173/vr`
4. Or scan the **VR QR code** from the landing page (if Quest has camera passthrough)

---

## Troubleshooting

### Certificate warnings on Quest/Phone

The device doesn't trust your local CA. Install `rootCA.pem`:
- **Quest**: Copy via USB or adb, install in Security settings
- **Android**: Settings → Security → Install certificates → CA certificate
- **iOS**: AirDrop the `.pem`, install in Settings → Profile Downloaded

### Firewall blocking connections

```bash
# macOS: check if port 5173 is open
sudo lsof -i :5173

# Linux: allow port
sudo ufw allow 5173
```

### DNS resolution fails

Devices on the hotspot can't resolve hostnames. Always use **IP addresses** directly (the QR codes already do this).

### Quest can't reach the server

1. Verify Quest is on the hotspot network (same subnet)
2. Check laptop firewall allows incoming on port 5173
3. Try `https://<ip>:5173` in Quest Browser directly
4. Ensure mkcert CA is installed on Quest
