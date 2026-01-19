# ⚠️ Common Pitfalls & Solutions

> **Troubleshooting-Guide** für häufige Probleme bei WebXR-Entwicklung mit Meta Quest 3

---

## 📖 Table of Contents

1. [VR/AR Button Problems](#-vrar-button-problems)
2. [Connection Issues](#-connection-issues)
3. [Visual Problems](#-visual-problems)
4. [Quest-Specific Issues](#-quest-specific-issues)
5. [Development Workflow](#-development-workflow)

---

## 🔘 VR/AR Button Problems

### Problem: "VR Button is Greyed Out"

**Symptom:** Der VR-Button erscheint, ist aber nicht klickbar (ausgegraut).

```
┌─────────────────────┐
│  ENTER VR (grau)    │  ← Nicht klickbar!
└─────────────────────┘
```

**Ursache:** Browser hat kein WebXR-Device erkannt.

**Lösungen:**

| Wenn | Dann |
|------|------|
| **Desktop-Browser** | Normal! Desktop hat kein VR-Headset |
| **Quest Browser** | 1. HTTPS prüfen (nicht HTTP!) |
| **Quest Browser + HTTPS** | 2. Seite neu laden |
| **Immernoch grau** | 3. Quest neu starten |

```bash
# Check: Läuft der Server wirklich über HTTPS?
curl -I https://localhost:3000  # Muss "200 OK" zeigen
```

### Problem: "WebXR not available"

**Symptom:** Fehlermeldung statt VR-Button.

**Ursache:** HTTP statt HTTPS.

```bash
# ❌ Falsch
http://192.168.1.10:3000

# ✅ Richtig
https://localhost:3000
```

**Fix:** HTTPS-Zertifikate generieren und Server mit TLS starten:

```bash
bunx mkcert localhost
bun --hot ./server.ts
```

---

## 🔌 Connection Issues

### Problem: "Port Forwarding Disappeared"

**Symptom:** Quest kann nicht mehr auf `https://localhost:3000` zugreifen.

**Ursache:** ADB Port-Forwarding geht verloren bei:
- Quest geht in Standby
- USB-Kabel wird kurz getrennt
- ADB-Daemon wird neu gestartet

**Diagnose:**

```bash
# Aktives Forwarding prüfen
adb reverse --list

# Wenn leer → Forwarding ist weg!
```

**Fix:**

```bash
# Forwarding neu einrichten
adb reverse tcp:3000 tcp:3000

# Prüfen
adb reverse --list
# → tcp:3000 → tcp:3000
```

**Pro-Tip:** In `start.sh` ist das Forwarding automatisch eingebaut.

### Problem: "WebSocket Connection Refused"

**Symptom:** Controller zeigt 🔴 Disconnected, Quest-Console zeigt WebSocket-Fehler.

**Mögliche Ursachen:**

| Ursache | Diagnose | Fix |
|---------|----------|-----|
| Server nicht gestartet | Terminal prüfen | `bun --hot ./server.ts` |
| Server gecrasht | Error-Log im Terminal | Fehler beheben, neu starten |
| Port blockiert | `lsof -i :3000` | Anderen Port verwenden |
| Firewall | macOS-Popup | "Erlauben" klicken |

**Debug:**

```bash
# Server-Status prüfen
lsof -i :3000

# WebSocket testen (im Browser-Console)
new WebSocket('wss://localhost:3000')
```

### Problem: "Mixed Content" Warnung

**Symptom:** WebSocket verbindet nicht, Browser-Console zeigt "Mixed Content".

**Ursache:** HTTPS-Seite versucht HTTP-WebSocket zu nutzen.

```javascript
// ❌ Falsch (http:// → ws://)
new WebSocket('ws://localhost:3000')

// ✅ Richtig (https:// → wss://)
new WebSocket('wss://localhost:3000')
```

Unser Code macht das automatisch richtig:

```javascript
// Dynamisch: wss:// wenn HTTPS, sonst ws://
new WebSocket(`wss://${location.host}`)
```

---

## 👁️ Visual Problems

### Problem: "Scene Looks Wrong in AR"

**Symptom:** Schwarzer/farbiger Hintergrund statt Passthrough.

**Ursache:** Renderer nicht für Transparenz konfiguriert.

**Fix:**

```typescript
// 1. Renderer mit alpha: true
const renderer = new THREE.WebGLRenderer({
  alpha: true  // ← MUSS für AR!
});

// 2. Kein scene.background setzen
scene.background = null;  // oder einfach weglassen
```

### Problem: "Cube ist unsichtbar in AR"

**Symptom:** AR-Session startet, aber kein Objekt sichtbar.

**Mögliche Ursachen:**

| Ursache | Fix |
|---------|-----|
| Position zu weit | `cube.position.z = -2` (2m vor Kamera) |
| Position zu nah | `cube.position.z = -1` (1m vor Kamera) |
| Objekt zu klein | `cubeSize = 0.3` (30cm für AR) |
| Objekt ist hinter Kamera | `position.z` muss NEGATIV sein! |

```typescript
// Gute AR-Werte
cube.position.set(0, 1.0, -2);  // Vor dir, auf Brusthöhe
```

### Problem: "Objects Don't Cast Shadows"

**Symptom:** Objekte haben keine Schatten.

**Fix:**

```typescript
// 1. Renderer
renderer.shadowMap.enabled = true;

// 2. Lichtquelle
directionalLight.castShadow = true;

// 3. Objekte
cube.castShadow = true;
floor.receiveShadow = true;
```

---

## 🥽 Quest-Specific Issues

### Problem: "Quest Browser Auto-Closes"

**Symptom:** Browser schließt sich nach kurzer Zeit.

**Ursache:** Quest Standby-Timeout.

**Fix:** Quest-Einstellungen anpassen:
1. Einstellungen → System → Power
2. "Auto Sleep" → "15 Minuten" oder "Nie"

### Problem: "ADB Device Not Found"

**Symptom:** `adb devices` zeigt keine Geräte.

**Diagnose-Schritte:**

```bash
# 1. USB-Verbindung prüfen
adb devices
# → "unauthorized" oder leer

# 2. Auf Quest prüfen
# Popup "Allow USB Debugging?" muss bestätigt werden!

# 3. ADB neu starten
adb kill-server
adb start-server
adb devices
```

**Checkliste:**

- [ ] Developer Mode aktiviert (Meta App)?
- [ ] USB-C **Daten**kabel (nicht Ladekabel)?
- [ ] "Allow USB Debugging" auf Quest bestätigt?
- [ ] ADB installiert (`brew install android-platform-tools`)?

### Problem: "Certificate Error in Quest Browser"

**Symptom:** Warnung über ungültiges Zertifikat.

**Lösung:** Das ist normal für selbst-signierte Zertifikate!

1. Auf "Erweitert" klicken
2. "Fortfahren zu localhost" wählen

**Alternative:** Zertifikat auf Quest installieren (aufwändig, nicht nötig für Entwicklung).

---

## 🔧 Development Workflow

### Problem: "Changes Not Visible"

**Symptom:** Code geändert, aber keine Auswirkung.

**Checkliste:**

| Prüfe | Fix |
|-------|-----|
| Server mit `--hot`? | `bun --hot ./server.ts` |
| Browser-Cache? | Hard-Refresh: `Cmd+Shift+R` |
| Richtige Datei? | Pfad prüfen |
| TypeScript-Error? | Terminal-Output prüfen |

### Problem: "Module Not Found"

**Symptom:** `Cannot find module 'three'`

**Fix:**

```bash
# Dependencies installieren
bun install

# Prüfen ob vorhanden
ls node_modules/three
```

### Problem: "Type Errors After Edit"

**Symptom:** TypeScript-Fehler beim Speichern.

**Diagnose:**

```bash
# Type-Check manuell ausführen
bunx tsc --noEmit

# Fehler werden mit Zeilen-Nummern angezeigt
```

**Häufige Fehler:**

```typescript
// ❌ Property doesn't exist
cube.position[axis] += value;  // axis ist string

// ✅ Fix: Type-Assertion oder Union Type
cube.position[axis as 'x' | 'y' | 'z'] += value;
```

---

## 🆘 Emergency Recovery

### "Alles kaputt, nichts geht mehr"

Komplett-Reset:

```bash
# 1. Server beenden
killall bun

# 2. Node Modules neu
rm -rf node_modules
bun install

# 3. ADB reset
adb kill-server
adb start-server
adb devices

# 4. Neu starten
./start.sh vr
```

### Quick Health-Check

```bash
# Alles in einem Befehl prüfen
echo "=== ADB ===" && adb devices && \
echo "=== Port ===" && adb reverse --list && \
echo "=== Server ===" && lsof -i :3000 | head -2
```

---

## 📊 Debugging Cheat Sheet

| Symptom | Erste Aktion |
|---------|--------------|
| Button grau | HTTPS prüfen |
| Kein WebSocket | Server-Log prüfen |
| Forwarding weg | `adb reverse tcp:3000 tcp:3000` |
| Nichts sichtbar | Cube-Position prüfen |
| AR schwarzer HG | `alpha: true` setzen |
| Quest findet Server nicht | IP/Port prüfen |

---

## 📚 Siehe auch

- [CONCEPTS.md](./CONCEPTS.md) - Grundlagen verstehen
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technischer Deep-Dive
- [TUTORIAL.md](./TUTORIAL.md) - Step-by-Step Anleitung

---

*Erstellt: 2026-01-19*
