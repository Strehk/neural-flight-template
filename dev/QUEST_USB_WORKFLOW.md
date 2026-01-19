# Quest 3 USB-C Development Workflow

Kompletter Workflow für WebXR-Entwicklung mit Meta Quest 3 über USB-C.
Ideal für Büro/Firmen-Netzwerke wo die Quest kein WiFi nutzen kann.

## Warum USB-C statt WiFi?

| Aspekt | USB-C + ADB | WiFi |
|--------|-------------|------|
| Netzwerk nötig | ❌ Nein | ✅ Ja |
| Firmen-Firewall | ✅ Kein Problem | ❌ Oft blockiert |
| Latenz | ✅ Minimal | ⚠️ Variabel |
| Setup-Komplexität | ⚠️ Einmalig mehr | ✅ Einfacher |

---

## Einmaliges Setup

### 1. ADB installieren (Mac)

```bash
brew install android-platform-tools
```

### 2. Developer Mode auf Quest aktivieren

1. **Meta App** auf Smartphone öffnen
2. Geräte → Quest 3 auswählen
3. Einstellungen → **Developer Mode** aktivieren
4. Quest neustarten

### 3. USB Debugging erlauben

1. Quest per USB-C verbinden (Datenkabel!)
2. Quest aufsetzen
3. Dialog "USB Debugging erlauben?" erscheint
4. **"Immer erlauben"** aktivieren + bestätigen

### 4. Verbindung testen

```bash
adb devices
```

**Erwartete Ausgabe:**
```
List of devices attached
2G0YC5ZH750024    device
```

| Status | Bedeutung |
|--------|-----------|
| `device` | ✅ Verbunden und autorisiert |
| `unauthorized` | ⚠️ USB Debugging nicht bestätigt |
| `offline` | ⚠️ Verbindung instabil |
| (leer) | ❌ Kein Gerät erkannt |

---

## Session-Workflow

### Vor jeder Session

```bash
# 1. Verbindung prüfen
adb devices

# 2. Port Forwarding einrichten (WICHTIG: muss jede Session neu!)
adb reverse tcp:3000 tcp:3000

# 3. Server starten
bun --hot ./server.ts
```

### Quest Browser remote öffnen

```bash
# Browser mit URL starten
adb shell am start -a android.intent.action.VIEW \
  -d "https://localhost:3000" com.oculus.browser
```

### Quick One-Liner

```bash
# Alles in einem Befehl
adb devices && adb reverse tcp:3000 tcp:3000 && bun --hot ./server.ts
```

---

## ⚠️ Wichtige Learnings

### 1. Port Forwarding verschwindet!

**Problem:** `adb reverse` geht verloren wenn:
- Quest in Standby geht
- USB kurz getrennt wird
- Quest neustartet

**Lösung:** Immer prüfen vor dem Testen:
```bash
adb reverse --list
# Sollte "tcp:3000 tcp:3000" zeigen
```

**Fix:**
```bash
adb reverse tcp:3000 tcp:3000
```

### 2. Datenkabel vs. Ladekabel

USB-C Kabel ist nicht gleich USB-C Kabel!

| Kabeltyp | ADB funktioniert |
|----------|------------------|
| Datenkabel | ✅ Ja |
| Ladekabel (nur Strom) | ❌ Nein |

**Test:** Wenn `adb devices` nichts zeigt, anderes Kabel probieren.

### 3. HTTPS ist Pflicht

WebXR funktioniert nur über:
- `https://` (mit Zertifikat)
- `localhost` (Ausnahme für Dev)

**Zertifikate generieren:**
```bash
bunx mkcert localhost
```

### 4. WiFi-Fehler ignorieren

Quest zeigt "Keine WLAN-Verbindung" - **das ist OK!**
Der USB-Tunnel funktioniert unabhängig vom WiFi.

---

## Troubleshooting

### Seite lädt nicht (ERR_CONNECTION_REFUSED)

```bash
# 1. Port Forwarding prüfen
adb reverse --list

# 2. Falls leer: neu einrichten
adb reverse tcp:3000 tcp:3000

# 3. Server läuft?
curl -k https://localhost:3000

# 4. Port belegt?
lsof -i :3000
```

### Quest nicht erkannt

```bash
# 1. Verbindung prüfen
adb devices

# 2. ADB Server neustarten
adb kill-server && adb start-server

# 3. Quest: USB Debugging neu bestätigen
# (Quest abnehmen, Dialog erscheint)
```

### VR Button ausgegraut

- Normal auf Desktop (kein VR-Device)
- Auf Quest: Seite neu laden
- HTTPS Problem? Zertifikat akzeptieren

---

## Nützliche ADB Befehle

```bash
# Gerät info
adb devices -l

# Screenshot von Quest
adb exec-out screencap -p > quest_screenshot.png

# App starten
adb shell am start -n PACKAGE/.MainActivity

# Aktive Forwards anzeigen
adb reverse --list

# Alle Forwards entfernen
adb reverse --remove-all

# Wireless ADB (falls doch WiFi)
adb tcpip 5555
adb connect QUEST_IP:5555
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────┐
│  QUEST 3 USB-C WORKFLOW                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. adb devices          → Quest verbunden?     │
│  2. adb reverse tcp:3000 tcp:3000               │
│  3. bun --hot ./server.ts                       │
│  4. adb shell am start ... → Browser öffnen    │
│                                                 │
│  ⚠️  Port Forwarding verschwindet!              │
│      → Immer prüfen: adb reverse --list         │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

*Erstellt: 2026-01-19*
*Basierend auf: Session mit erfolgreichen VR-Test über USB-C*
