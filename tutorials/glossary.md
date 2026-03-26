# 📚 Glossar

> Kurze Erklärungen für Begriffe, die in den Setup- und Einsteiger-Tutorials vorkommen.

Du musst nicht alles auswendig lernen. Suche einfach den Begriff und lies die Kurzdefinition.

Nutze diese Seite, wenn dir in diesen Anleitungen ein Begriff unklar ist:
- [Setup-Tutorials Übersicht](README.md)
- [Erste Schritte](first-steps.md)
- [Terminal-Grundlagen](terminal-basics.md)
- [GitHub-Grundlagen](github-basics.md)

## Schnell suchen:

Nutze die Suchfunktion deines Editors oder Browsers, um Begriffe schneller zu finden:
- **macOS:** `Cmd + F`
- **Windows / Linux:** `Ctrl + F`

Gib dann einfach den gesuchten Begriff ein, zum Beispiel `Branch`, `Commit` oder `WebSocket`.

## Häufig verwechselt

### Git oder GitHub?
- **Git** ist das Werkzeug, das deine Änderungen speichert.
- **GitHub** ist die Website, auf der das Team diese Änderungen teilt und überprüft.

### Commit oder Push?
- **Commit** bedeutet: Änderungen lokal auf deinem Computer speichern.
- **Push** bedeutet: diese gespeicherten Änderungen zu GitHub hochladen.

### Branch oder Pull Request?
- **Branch** ist dein eigener Arbeitsbereich für Änderungen.
- **Pull Request** ist die Anfrage, diese Änderungen prüfen und übernehmen zu lassen.

---

## A

### ADB
**Android Debug Bridge.** Ein Kommandozeilen-Werkzeug, mit dem dein Computer über USB mit einer Meta Quest kommunizieren kann.
**Bereich:** Quest, Terminal

### API key
Ein geheimer Schlüssel, mit dem ein Programm beweist, dass es einen Onlinedienst benutzen darf.
**Bereich:** Online-Dienste, Tools

---

## B

### Branch
Ein separater Arbeitszweig in Git. Du erstellst einen Branch, damit du Änderungen machen kannst, ohne `main` sofort zu beeinflussen.
**Merkhilfe:** eigener Arbeitszweig
**Bereich:** Git, GitHub
**Beispiel:** Du baust auf deinem eigenen Branch eine neue Erfahrung, ohne die Hauptversion des Projekts direkt zu ändern.
**Siehe auch:** `Commit`, `main`, `Pull Request (PR)`

### Browser
Das Programm, mit dem du Websites öffnest, zum Beispiel Chrome, Edge oder Firefox.
**Bereich:** Web, Alltag

### Bun
Das Hauptwerkzeug dieses Projekts für JavaScript. Damit installierst du Zusatzpakete und startest den lokalen Entwicklungsserver.
**Bereich:** Projekt-Tools, Terminal
**Siehe auch:** `Dependency`, `Dev server`, `Package manager`, `Runtime`

---

## C

### Certificate
Eine Datei, die deinem Browser sagt, dass eine Verbindung sicher ist. In diesem Projekt werden solche lokalen Sicherheitsdateien benötigt, damit WebXR im Browser funktioniert.
**Bereich:** Sicherheit, Browser
**Siehe auch:** `HTTPS`, `mkcert`

### Clone
Eine Kopie eines Projekts von GitHub auf deinen Computer herunterladen.
**Merkhilfe:** Projekt herunterladen
**Bereich:** Git, GitHub
**Siehe auch:** `Repository`, `Remote`

### Command
Eine Anweisung, die du im Terminal eingibst, damit der Computer eine Aufgabe ausführt.
**Bereich:** Terminal

### Commit
Ein gespeicherter Zwischenstand deiner Änderungen in Git.
**Merkhilfe:** lokal speichern
**Bereich:** Git
**Beispiel:** Nach einer kleinen Änderung an einer Datei machst du einen Commit, damit dieser Stand festgehalten ist.
**Siehe auch:** `Commit message`, `Push`, `Stage`

### Commit message
Eine kurze Beschreibung dessen, was ein Commit geändert hat.
**Bereich:** Git
**Siehe auch:** `Commit`

---

## D

### Dependency
Zusätzlicher Code von anderen, den dein Projekt zum Laufen braucht.
**Merkhilfe:** Zusatzpaket
**Bereich:** Projekt-Tools
**Siehe auch:** `Package`, `node_modules`

### Dev server
Der lokale Server, den du während der Entwicklung startest. Er liefert die App im Browser aus, solange du daran arbeitest.
**Merkhilfe:** Entwicklungsserver
**Bereich:** Projekt, Browser
**Beispiel:** Wenn du `bun run dev` startest, läuft der Dev-Server und du kannst `https://localhost:5173` öffnen.
**Siehe auch:** `Local`, `localhost`, `Server`

### Directory
Ein anderes Wort für Ordner.
**Bereich:** Dateien, Terminal

---

## E

### Editor
Ein Programm zum Schreiben und Bearbeiten von Code. In diesen Tutorials ist das meistens Zed.
**Bereich:** Tools, Code

### Experience
Eine einzelne VR-Welt oder ein einzelnes Erlebnis innerhalb des Projekts.
**Merkhilfe:** VR-Erlebnis
**Bereich:** Projekt, VR
**Beispiel:** Auf der Startseite siehst du mehrere Experiences, aus denen du eine auswählen kannst.
**Siehe auch:** `VR`, `Experience Catalog`

### Experience Catalog
Die Übersichtsseite des Projekts, auf der alle verfügbaren Experiences angezeigt werden.
**Bereich:** Projekt, Browser
**Siehe auch:** `Experience`, `URL`

---

## F

### Fork
Eine persönliche Kopie eines Projekts auf GitHub. Der Begriff ist auf GitHub verbreitet, in diesen Tutorials arbeitest du aber meist mit Branches statt mit Forks.
**Bereich:** GitHub
**Siehe auch:** `Branch`, `Repository`

---

## G

### Git
Ein Werkzeug, das Änderungen an deinem Code speichert und nachvollziehbar macht.
**Bereich:** Versionskontrolle
**Siehe auch:** `Branch`, `Commit`, `Version control`

### GitHub
Die Website, auf der das Team Code teilt, Änderungen überprüft und gemeinsam an einem Projekt arbeitet.
**Bereich:** Zusammenarbeit, Website
**Siehe auch:** `Git`, `Pull Request (PR)`, `Repository`

### GitHub CLI
Das Kommandozeilen-Werkzeug `gh`, mit dem du GitHub aus dem Terminal heraus benutzen kannst.
**Bereich:** GitHub, Terminal
**Siehe auch:** `GitHub`, `Terminal`

### GUI
**Graphical User Interface.** Eine grafische Oberfläche mit Buttons, Fenstern und Panels statt getippter Befehle.
**Bereich:** Oberfläche, Tools

---

## H

### HTTPS
Die sichere Form einer Website-Verbindung. WebXR braucht HTTPS, auch bei Projekten, die nur lokal auf deinem Computer laufen.
**Bereich:** Browser, Sicherheit
**Siehe auch:** `Certificate`, `localhost`, `WebXR`

---

## I

### Install
Software herunterladen und so einrichten, dass sie auf deinem Computer verwendet werden kann.
**Bereich:** Software, Tools

---

## L

### Local
Läuft auf deinem eigenen Computer und nicht auf einem entfernten Server oder in der Cloud.
**Merkhilfe:** auf deinem Computer
**Bereich:** Entwicklung, Netzwerk
**Siehe auch:** `Remote`, `localhost`

### localhost
Ein spezieller Name für deinen eigenen Computer, wenn du im Browser oder in Programmen auf lokale Projekte zugreifst.
**Bereich:** Browser, Netzwerk, Projekt
**Beispiel:** `https://localhost:5173` bedeutet, dass die Website direkt auf deinem eigenen Computer läuft.
**Siehe auch:** `Dev server`, `Local`, `Port`, `URL`

---

## M

### main
Der Standard-Branch in Git. Er gilt als die gemeinsame Hauptversion des Projekts.
**Merkhilfe:** Hauptversion
**Bereich:** Git
**Siehe auch:** `Branch`, `Merge`

### Merge
Änderungen aus einem Branch in einen anderen übernehmen, meist nach `main`.
**Bereich:** Git
**Siehe auch:** `Branch`, `main`, `Pull Request (PR)`

### mkcert
Ein Werkzeug, das die lokalen Sicherheitsdateien für HTTPS erstellt.
**Bereich:** Sicherheit, Projekt-Tools
**Siehe auch:** `Certificate`, `HTTPS`

---

## N

### `node_modules`
Der Ordner, in dem die zusätzlich installierten Pakete nach `bun install` gespeichert werden.
**Bereich:** Projekt, Dateien
**Siehe auch:** `Dependency`, `Package`

### Node Editor
Eine Projektseite, auf der du Werte und Verbindungen visuell bearbeiten kannst.
**Bereich:** Projekt, Oberfläche
**Beispiel:** Im Node Editor kannst du Einstellungen nicht nur per Code, sondern über grafische Elemente anpassen.
**Siehe auch:** `GUI`, `URL`

---

## P

### Package
Ein fertiges Stück Code, das du in dein Projekt einbauen kannst.
**Bereich:** Projekt-Tools
**Siehe auch:** `Dependency`, `Package manager`

### Package manager
Ein Werkzeug zum Installieren und Aktualisieren solcher Zusatzpakete. In diesem Projekt übernimmt Bun diese Aufgabe.
**Bereich:** Projekt-Tools, Terminal
**Siehe auch:** `Bun`, `Package`

### Path
Der Speicherort einer Datei oder eines Ordners, zum Beispiel `src/routes/+page.svelte`.
**Bereich:** Dateien, Terminal
**Merkhilfe:** Dateipfad

### Port
Eine Zahl in einer Webadresse, über die ein Programm erreichbar ist. In der lokalen Entwicklung läuft dieses Projekt typischerweise über `5173`.
**Bereich:** Netzwerk, Browser
**Siehe auch:** `localhost`, `URL`

### Pull
Die neuesten Git-Änderungen von GitHub auf deinen Computer herunterladen.
**Merkhilfe:** herunterladen
**Bereich:** Git, GitHub
**Siehe auch:** `Push`, `Remote`

### Pull Request (PR)
Eine Anfrage auf GitHub, mit der du andere bittest, deine Änderungen anzuschauen und in das Hauptprojekt zu übernehmen.
**Merkhilfe:** Bitte prüfen und übernehmen
**Bereich:** GitHub, Zusammenarbeit
**Beispiel:** Nachdem du deine Änderungen hochgeladen hast, erstellst du einen Pull Request, damit jemand sie reviewen kann.
**Siehe auch:** `Branch`, `Merge`, `Push`

### Push
Deine lokalen Git-Commits zu GitHub hochladen.
**Merkhilfe:** hochladen
**Bereich:** Git, GitHub
**Siehe auch:** `Commit`, `Pull`, `Remote`

---

## Q

### Quest
Die Meta Quest ist das VR-Headset, auf dem du die VR-Seite dieses Projekts öffnest.
**Bereich:** Gerät, VR
**Beispiel:** Die Route `/vr` öffnest du im Browser der Quest, um die Experience im Headset zu sehen.
**Siehe auch:** `ADB`, `Experience`, `VR`, `WebXR`

---

## R

### Remote
Die Version eines Projekts, die nicht auf deinem eigenen Computer liegt, sondern zum Beispiel auf GitHub.
**Merkhilfe:** entfernte Version
**Bereich:** Git, GitHub, Netzwerk
**Siehe auch:** `Local`, `Repository`

### Repository
Ein Projektordner mit allen Dateien und der zugehörigen Git-Historie. Oft wird das zu **Repo** abgekürzt.
**Merkhilfe:** Projektordner mit Verlauf
**Bereich:** Git, GitHub
**Siehe auch:** `Clone`, `Remote`

### Runtime
Die Software, die deinen Code startet und ausführt. In diesem Projekt übernimmt Bun diese Aufgabe für JavaScript und die dazugehörigen Werkzeuge.
**Bereich:** Projekt-Tools
**Siehe auch:** `Bun`, `TypeScript`

---

## S

### Server
Ein Programm, das auf Anfragen anderer Geräte oder Apps antwortet. In diesen Tutorials läuft der lokale Server auf deinem Laptop.
**Bereich:** Netzwerk, Projekt
**Siehe auch:** `Dev server`, `Local`

### Shader
Ein kleines Programm, das bestimmt, wie etwas in 3D dargestellt oder eingefärbt wird.
**Bereich:** 3D, Grafik, Projekt
**Beispiel:** Im Shader Playground kannst du verändern, wie eine Oberfläche aussieht oder sich bewegt.
**Siehe auch:** `Shader Playground`

### Shader Playground
Eine Projektseite, auf der du Shader ausprobieren und direkt eine Vorschau sehen kannst.
**Bereich:** Projekt, 3D
**Siehe auch:** `Shader`, `URL`

### Stage
Geänderte Dateien so markieren, dass sie in den nächsten Git-Commit aufgenommen werden.
**Merkhilfe:** zum Commit vormerken
**Bereich:** Git
**Siehe auch:** `Commit`

### `src`
Der Hauptordner mit dem Quellcode des Projekts.
**Bereich:** Dateien, Projekt

### SvelteKit
Das Werkzeug-Set, mit dem diese Website beziehungsweise Web-App gebaut wurde.
**Bereich:** Webentwicklung, Projekt

---

## T

### Terminal
Eine textbasierte Oberfläche, in die du Befehle eingibst.
**Bereich:** Tools, Alltag
**Siehe auch:** `Command`, `Working directory`

### Type-check
Prüfen, ob der Code logisch zu den erwarteten Daten passt, damit bestimmte Fehler schon vor dem Start gefunden werden.
**Bereich:** Code, Prüfung

### TypeScript
JavaScript mit zusätzlichen Prüfregeln, die helfen, Fehler früher zu erkennen.
**Bereich:** Code, Sprache
**Siehe auch:** `Type-check`

---

## U

### URL
Eine Webadresse, zum Beispiel `https://localhost:5173`.
**Bereich:** Browser, Web
**Siehe auch:** `localhost`, `Port`

### USB debugging
Eine Geräteeinstellung, die Werkzeugen wie ADB erlaubt, über USB mit einem Headset oder Smartphone zu kommunizieren.
**Bereich:** Quest, Geräte
**Siehe auch:** `ADB`

---

## V

### Version control
Ein System, das speichert, was sich an Dateien wann geändert hat. In diesem Projekt wird dafür Git verwendet.
**Bereich:** Git
**Siehe auch:** `Git`, `Commit`

### VR
**Virtual Reality.** Eine digitale 3D-Umgebung, die mit einem Headset wie der Meta Quest betrachtet wird.
**Bereich:** 3D, Quest
**Siehe auch:** `Experience`, `Quest`, `WebXR`

---

## W

### WebXR
Die Technik im Browser, mit der Webseiten VR- oder AR-Erlebnisse anzeigen können.
**Bereich:** Browser, VR
**Siehe auch:** `HTTPS`, `VR`

### WebSocket
Eine dauerhaft offene Verbindung, über die Geräte schnell Daten hin- und herschicken können.
**Bereich:** Netzwerk, Projekt
**Siehe auch:** `Server`

### Workflow
Die übliche Abfolge von Arbeitsschritten, zum Beispiel pull, branch erstellen, bearbeiten, committen, pushen und einen PR anlegen.
**Bereich:** Zusammenarbeit, Git

### Working directory
Dein aktueller Ort im Terminal.
**Merkhilfe:** aktueller Ordner
**Bereich:** Terminal, Dateien
