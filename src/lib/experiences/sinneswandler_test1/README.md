# Bat Echolocation

Poetische First-Person-Experience in einer nahezu schwarzen, prozeduralen Landschaft. Ein sehr dunkler Mond liegt permanent über der Welt, während hohe Gebirgsketten, dichte Waldzonen, offene Grasflächen, Sümpfe und karge Regionen erst durch seltene Echoimpulse wirklich lesbar werden.

## Architektur

- `manifest.ts` definiert Metadaten, Parameter und die Trigger-Schnittstelle.
- `flight-controller.ts` enthält die leichte, schwebende Bat-Flugphysik.
- `world.ts` streamt Terrain-Chunks mit schärferen Bergen, tieferen Tälern, biomabhängiger Vegetationsverteilung und deterministischen Nachtfalter-Schwärmen.
- `audio.ts` erzeugt eine aus Echo-Treffern gebaute Klangtextur mit Distanz-, Dichte-, Material- und Relief-Mapping plus kurzen materialabhängigen Hit-Bling-Transienten; Motten haben dabei einen eigenen helleren Chirp.
- `shaders.ts` bündelt die Echo-Reveal-Materialien und die kurze Ping-Logik der Wellen-Uniforms.
- `scene.ts` verwaltet Pulsrhythmus, Mond, Blindphasen, Audio-Kopplung, Collection-Bursts und den minimalistischen Motten-Counter.

## Controls

- `Arrow Keys` im Controller: Blick-/Flugorientierung
- `Accelerate` / `Brake`: Vorwärts-Boost bzw. Rückwärtsflug
- `Space` oder `Pulse`-Button im Controller: aktiven Echoimpuls auslösen
- Nachtfalter werden eingesammelt, sobald du nah genug an ihnen vorbeifliegst

## Wichtige Parameter

- `Echo Range`, `Wave Speed`, `Pulse Cooldown`, `Auto Pulse`: Reichweite und Rhythmus der Wahrnehmung
- `Ping Tail`, `Reveal Intensity`, `Wire Strength`: Kürze und Lesbarkeit des visuellen Pings
- `Pitch Curve`, `Distance Volume`, `Max Layers`, `Density Complexity`: wie stark sich Echo-Hits klanglich nach Distanz und Fülle auffächern
- `Audio Decay`, `Drone Intensity`, `Material Influence`, `Stereo Width`, `Audio Level`: Form, Ausklingen und Räumlichkeit der akustischen Wahrnehmung
- `Biome Scale`, `Mountain Height`, `Tree Density`, `Grass Density`: Charakter der unendlichen Welt
- `Mist Density`, `Base Visibility`: wie nah die Szene an vollständiger Blindheit bleibt

## Hinweis

Die Reveal-Darstellung ist bewusst stilisiert: statt echtem Voll-Wireframe auf allen Assets nutzt die Experience kantenbetonte Shader mit kurzem Ping, schnellem Fade-out und sehr dunklem permanentem Mondlicht. Audio wird aus denselben Welt-Treffern gebildet und nicht aus losgelösten UI-Sounds. Nachtfalter hängen vollständig im selben Echo-System, bleiben aber durch stärkere Reveal-Materialien, eigene Chirps und den dezenten Counter lesbar. Das bleibt auf Quest deutlich günstiger als flächendeckendes geometrisches Wireframe oder pro Treffer eigene Audioquellen.
