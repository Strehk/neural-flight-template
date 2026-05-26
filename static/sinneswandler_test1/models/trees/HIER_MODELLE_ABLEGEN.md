# Baummodelle

Lege hier deine 3D-Modelle für Bäume ab.

## Unterstützte Formate
- `.glb` / `.gltf` (empfohlen)
- `.obj`

## Kategorien
| Dateiname-Präfix | Verwendung |
|---|---|
| `trunk_*.glb` | Baumstamm (wird separat skaliert, ~1–3 m hoch) |
| `crown_*.glb` | Baumkrone (Kegel, Kugel, Icosaeder etc.) |
| Alles andere | Wird als kompletter Baum geladen (Stamm + Krone zusammen) |

## Tipps
- Modelle müssen **keine** Textur haben — das Shader-System (Echo-Reveal + Tagsicht) übernimmt die Farbe.
- Normalen sollten korrekt ausgerichtet sein (`computeVertexNormals` wird automatisch aufgerufen).
- Empfohlene Größe: Modelle auf ~1 m normalisieren — die Weltgenerierung skaliert automatisch.
- Mehrere Dateien = zufällige Auswahl pro Instanz (Variation).

## Aktivieren
Nach dem Ablegen die Dateinamen in `src/lib/experiences/sinneswandler_test1/world-models.ts`
unter `MODEL_PATHS.treeTrunk` und `MODEL_PATHS.treeCrown` eintragen.
