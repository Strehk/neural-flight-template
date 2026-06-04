Original prompt: nice, jetzt müssen wir die ebenen verschönern, die chemische wahnehmung (die bunten pointclouds) sehen noch doof aus. die partickel müssen mehr und kleiner. und mehr um dinge die wirklich das austrahlen. wie büsche, manche gräser, baumkronen etc. (die müssen je nach gegenstand unterschiedliche knallige farben haben)

## Notes

- Replaced the old generic grid-based chemosense hotspots with real sources attached to generated world decorations.
- Sources are emitted from tree crowns, bushes, flowers, selected grass clumps, snow plants, palm/cactus vegetation, moss rocks, and forest props.
- Chemosense particles are now smaller and use a larger particle budget.
- `bun run check` passed with 0 errors and 0 warnings after the first implementation pass.
- Switched chemosense particles from additive blending to normal transparent blending and added a soft round texture so colors remain visible on white perception layers.
- Final browser smoke test showed readable cyan/green scent particles around terrain vegetation; console had 0 errors after reload. Screenshot artifacts were removed from the working tree.
- Updated chemosense particles to use depth testing again, so they no longer render through terrain or objects.
- Increased particle screen size and attached sources to every generated plant instance, including every grass clump. Plant categories now use distinct bright colors.
- Browser smoke test after this pass: `/vr`, `sinneswandler_test1`, key `4`; console had 0 errors.
- Network perception now uses denser cells, more visible nodes, a larger connection radius, and up to five nearest-neighbor links per node. Browser smoke test with key `5` showed a much denser web; console had 0 errors.
- Infrarot now uses explicit material tones instead of guessing organic material from object color: living crowns/grass/moths are very dark, trunks are mid-dark, dead wood is mid-gray, rocks and terrain are bright. Browser smoke test with key `3` showed vegetation readable against light terrain; console had 0 errors.

## TODO

- No known TODOs for this change.
