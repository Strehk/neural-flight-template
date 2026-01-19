#!/bin/bash
# ==============================================================================
# WebXR Development Startup Script
# ==============================================================================
#
# Automates the complete WebXR development workflow:
# 1. ADB port forwarding (USB-C connection)
# 2. HTTPS server startup
# 3. Controller UI in Mac browser
# 4. Scene launch in Quest browser
#
# Usage:
#   ./start.sh         # VR mode (default)
#   ./start.sh vr      # VR mode (explicit)
#   ./start.sh ar      # AR passthrough mode
#
# Prerequisites:
#   - Bun installed (bun.sh)
#   - ADB installed (brew install android-platform-tools)
#   - Quest in Developer Mode
#   - Quest connected via USB-C data cable
#
# ==============================================================================

set -e

# Configuration
MODE=${1:-vr}
PORT=3000
QUEST_URL="https://localhost:$PORT/?mode=$MODE"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           WebXR Development Environment                      ║"
echo "║                 Mode: ${MODE^^}                                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ==============================================================================
# Step 1: ADB Setup
# ==============================================================================

QUEST_CONNECTED=false

if command -v adb &> /dev/null; then
    echo "📱 Checking Quest connection..."

    if adb devices | grep -q "device$"; then
        # Port forwarding
        adb reverse tcp:$PORT tcp:$PORT > /dev/null 2>&1
        echo "   ✅ Port forwarding: Quest localhost:$PORT → Mac :$PORT"
        QUEST_CONNECTED=true
    else
        echo "   ⚠️  No Quest connected via USB"
        echo "   💡 WiFi mode: Use https://[YOUR_IP]:$PORT on Quest"
    fi
else
    echo "   ⚠️  ADB not found"
    echo "   💡 Install with: brew install android-platform-tools"
fi

echo ""

# ==============================================================================
# Step 2: Start Server
# ==============================================================================

echo "🖥️  Starting HTTPS server..."
bun --hot ./server.ts &
SERVER_PID=$!

# Wait for server to be ready
sleep 2

# Verify server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "   ❌ Server failed to start"
    exit 1
fi

echo "   ✅ Server running on https://localhost:$PORT"
echo ""

# ==============================================================================
# Step 3: Open Controller in Mac Browser
# ==============================================================================

echo "🎮 Opening Controller..."
open "https://localhost:$PORT/controller.html"
echo "   ✅ Controller opened in browser"
echo ""

# ==============================================================================
# Step 4: Launch Quest Browser (if connected)
# ==============================================================================

if [ "$QUEST_CONNECTED" = true ]; then
    echo "🥽 Launching Quest browser..."
    adb shell am start -a android.intent.action.VIEW \
        -d "$QUEST_URL" com.oculus.browser > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        echo "   ✅ Quest browser opened with ${MODE^^} scene"
    else
        echo "   ⚠️  Could not auto-launch Quest browser"
        echo "   💡 Manually open: $QUEST_URL"
    fi
    echo ""
fi

# ==============================================================================
# Status Summary
# ==============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   🎮 Controller:  https://localhost:$PORT/controller.html"
echo "   🥽 Quest URL:   $QUEST_URL"
echo ""
echo "   📖 Controls:"
echo "      Arrow Keys / D-Pad  →  Move cube (X/Z)"
echo "      W / S               →  Move up/down (Y)"
echo "      R / G / B           →  Change color"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   Press Ctrl+C to stop server"
echo ""

# ==============================================================================
# Wait for Server
# ==============================================================================

# Trap Ctrl+C to clean up
trap 'echo ""; echo "👋 Shutting down..."; kill $SERVER_PID 2>/dev/null; exit 0' INT

wait $SERVER_PID
