#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF_FILE="${SCRIPT_DIR}/hotspot.conf"

# ── Load config ──

load_config() {
  if [[ ! -f "$CONF_FILE" ]]; then
    echo "❌ No hotspot.conf found. Copy the example:"
    echo "   cp scripts/hotspot/hotspot.conf.example scripts/hotspot/hotspot.conf"
    exit 1
  fi
  # shellcheck source=/dev/null
  source "$CONF_FILE"
}

# ── OS detection ──

detect_os() {
  case "$(uname -s)" in
    Darwin) echo "macos" ;;
    Linux)  echo "linux" ;;
    MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
    *) echo "unknown" ;;
  esac
}

# ── Start ──

cmd_start() {
  load_config
  local os
  os="$(detect_os)"

  echo "📡 Starting hotspot: ${HOTSPOT_SSID}"

  case "$os" in
    macos)
      echo "ℹ️  macOS Internet Sharing must be enabled via System Settings."
      echo ""
      echo "   System Settings → General → Sharing → Internet Sharing"
      echo "   - Share from: Ethernet / Thunderbolt"
      echo "   - To: Wi-Fi"
      echo "   - Wi-Fi Options: Name=${HOTSPOT_SSID}, Password=${HOTSPOT_PASSWORD}"
      echo ""
      echo "   For offline (no upstream): create a loopback first:"
      echo "   sudo ifconfig lo0 alias 10.0.0.1"
      echo ""
      echo "   Then share from 'Loopback' to Wi-Fi."
      ;;
    linux)
      nmcli device wifi hotspot \
        ifname "${HOTSPOT_INTERFACE:-wlan0}" \
        ssid "$HOTSPOT_SSID" \
        password "$HOTSPOT_PASSWORD"
      echo "✅ Hotspot active on ${HOTSPOT_INTERFACE:-wlan0}"
      ;;
    windows)
      echo "ℹ️  Run these commands in PowerShell (Admin):"
      echo ""
      echo "   netsh wlan set hostednetwork mode=allow ssid=${HOTSPOT_SSID} key=${HOTSPOT_PASSWORD}"
      echo "   netsh wlan start hostednetwork"
      ;;
    *)
      echo "❌ Unsupported OS: $(uname -s)"
      exit 1
      ;;
  esac
}

# ── Stop ──

cmd_stop() {
  load_config
  local os
  os="$(detect_os)"

  echo "🛑 Stopping hotspot..."

  case "$os" in
    macos)
      echo "ℹ️  Disable Internet Sharing in System Settings."
      ;;
    linux)
      nmcli connection down Hotspot 2>/dev/null || true
      echo "✅ Hotspot stopped"
      ;;
    windows)
      echo "ℹ️  Run in PowerShell (Admin):"
      echo "   netsh wlan stop hostednetwork"
      ;;
    *)
      echo "❌ Unsupported OS"
      exit 1
      ;;
  esac
}

# ── Setup (mkcert) ──

cmd_setup() {
  if ! command -v mkcert &>/dev/null; then
    echo "❌ mkcert not found. Install it first:"
    echo "   brew install mkcert    # macOS"
    echo "   sudo apt install mkcert  # Linux"
    exit 1
  fi

  echo "🔐 Installing local CA..."
  mkcert -install

  echo "📜 Generating certificates..."
  mkcert \
    -key-file localhost-key.pem \
    -cert-file localhost.pem \
    localhost 127.0.0.1 ::1 \
    192.168.2.1 10.0.0.1

  echo "✅ Certificates ready: localhost.pem + localhost-key.pem"
  echo "   These are gitignored (*.pem)."
}

# ── Main ──

case "${1:-help}" in
  start) cmd_start ;;
  stop)  cmd_stop ;;
  setup) cmd_setup ;;
  *)
    echo "Usage: $0 {start|stop|setup}"
    echo ""
    echo "  start  — Start Wi-Fi hotspot"
    echo "  stop   — Stop Wi-Fi hotspot"
    echo "  setup  — Install mkcert CA + generate TLS certificates"
    exit 1
    ;;
esac
