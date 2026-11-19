# Place icons for the map (#454, step M1): prompts for the image model

51 icons, one per kind of place. The kind ids are the ones in Roleplay `src/lib/place-kinds.ts` (`PLACE_KINDS`); the file name of each
picture is its id. Until the files land in the engine the map draws an emoji per kind, so nothing waits on this.

## How to make them
1. One picture per prompt, 1:1 (square), any size from 512 up. Keep the **same** text for every icon, only the line after "Subject:" changes.
   If the model drifts in style between runs, paste the first good icon as a style reference ("same style as the attached icon").
2. The model gives a plain JPEG, so the background is a flat magenta, which a script turns into transparency. Do not ask for
   a transparent background.
3. Save each result as `<id>.jpg` (for example `tavern.jpg`, `smithy.jpg`) in one folder and give me the folder. I run the script, look at
   every icon on a contact sheet, and name the ones to redo (usually 3 to 6 have a dirty edge or a pink halo).

## The prompt (replace SUBJECT with the line of the kind)
```
A single game-map icon in a hand-painted fantasy illustration style: soft dark ink outline, warm muted colours, gentle light from the
top left, simple readable silhouette that still reads clearly when it is only 64 pixels wide. The object is centred and fills about
80% of the square, seen from a slightly raised front angle. The whole background is one flat solid pure magenta (#FF00FF), nothing
else in that colour anywhere in the object, no shadow or gradient on the background, no ground plane, no frame, no border, no text,
no letters, no UI.
Subject: SUBJECT
```
Notes: the object must not contain magenta or pink (a rose-coloured roof or a pink flower would be cut out); if a kind needs pink, say
"avoid pink" in its line. A cast shadow under the object is fine only if it is dark and small; no soft glow.

## Subjects (one line each)
| id | Subject |
|---|---|
| smithy | a blacksmith's forge: stone hearth with a glowing chimney, an anvil in front, a hammer leaning on it |
| bakery | a small bakery shopfront with a striped awning, loaves of bread in the window and a chimney with smoke |
| library | a tall stone library building with arched windows and a stack of books on the steps |
| school | a school or academy building with a bell tower and a wide front door |
| temple | an ancient stone temple with columns and a gently glowing doorway |
| church | a small village church with a steeple, a round window and a wooden door |
| graveyard | a small graveyard: three weathered gravestones, a stone cross, bare twisted tree behind |
| tavern | a cosy timber tavern with a hanging sign with a beer mug, warm lit windows, smoke from the chimney |
| inn | a two-storey roadside inn with a signboard with a bed, lanterns by the door |
| shop | a market shop front with a striped awning and a crate of goods and a hanging scale |
| market | a market square stall with a striped canopy, baskets of fruit and cloth |
| mill | a wooden windmill with four sails on a small hill |
| farm | a farmhouse with a red barn, a haystack and a short wooden fence |
| lighthouse | a tall white and red lighthouse on a rock, with a beam of light |
| ship | a wooden sailing ship with two masts and furled sails, seen from the side |
| port | a wooden harbour pier with a mooring post, a coil of rope and a small boat |
| bridge | an arched stone bridge with low walls, seen from the side |
| gate | a stone city gate with an arched wooden double door and two small towers |
| castle | a stone castle with two round towers, battlements and a flag |
| fortress | a heavy square stone fortress with thick walls and a gatehouse, no flag |
| tower | a single tall round stone tower with a conical roof and one lit window |
| palace | a grand palace with a golden dome, a wide staircase and two flags |
| dungeon | an iron-barred prison cell door set in a rough stone wall with a chain and a torch |
| cellar | a stone cellar hatch with open wooden doors and steps going down, a barrel beside it |
| cave | a dark cave mouth in a rocky hill with a few stones and a glimmer inside |
| mine | a wooden mine entrance in a hillside with a mine cart on rails and a lantern |
| ruins | broken stone ruins: a crumbling arch and a fallen column overgrown with moss |
| camp | a small camp: a canvas tent and a campfire with logs, a bedroll beside it |
| portal | a standing stone ring with a swirling blue-violet magical gateway inside it (avoid pink) |
| street | a short cobbled street with a lamp post and the fronts of two houses, seen at an angle |
| road | a winding dirt road with a wooden signpost at a crossing |
| forest | three tall dark-green trees with a few bushes at their feet |
| meadow | a green meadow patch with wildflowers in white and yellow (avoid pink) |
| field | a golden wheat field with a scarecrow |
| mountain | a tall grey mountain with a snow-covered peak |
| hills | rolling green hills with a stream and a few small trees |
| river | a short stretch of river with two banks, stones and reeds |
| lake | a round blue lake with reeds and a small wooden jetty |
| sea | a patch of deep blue sea with a few white-capped waves and a distant sail |
| beach | a sandy beach with a palm tree, a wave line and a shell |
| swamp | a murky green swamp with dead trees, reeds and floating lily pads |
| desert | sand dunes with a cactus and a dry bush, a bleached skull |
| snow | a snowy field with two snow-covered fir trees and an icicle-hung rock |
| garden | a walled garden with a trimmed hedge, a flowerbed in red and yellow and an arch (avoid pink) |
| park | a town park with a bench, a lamp post and two round trees |
| cottage | a tiny wooden cottage with a thatched roof, a round door and a chimney |
| house | a small stone and timber house with a tiled roof, two windows and a door |
| village | three small houses clustered together with a well in front |
| town | a cluster of houses around a small tower, with a road leading into it |
| city | a dense city skyline: many houses and towers behind a wall |
| room | a cosy room interior cut-away: a bed, a table with a candle and a window |
| place | a round brass map pin with a small white flag |

## Map pictures (the board behind the icons)

A second, separate set: a picture that goes under the places (gear in the map header, "Upload a map picture"). It is an ordinary
opaque picture, no magenta. The icons stand on top of it and the owner drags each place to its spot, so the picture must be a calm,
empty ground with the roads and the land, not a finished scene.

Rules that matter for the board: landscape 16:9 (the board is 16:10, the picture is fitted with its aspect kept); mid-tone and low
contrast, so a round icon and its name stay readable on top; no text, no labels, no compass, no scale bar, no frame, no pins, no
icons, no buildings drawn in detail (at most flat roof footprints or empty plots where an icon can stand). Light from the top left,
same hand-painted fantasy look as the icons. Attach one finished icon as a style reference ("same painting style as the attached icon").

### The map prompt (replace SUBJECT)

```
A top-down hand-painted fantasy map background in the style of an old illustrated game map: soft dark ink outlines, warm muted colours, gentle light from the top left, visible painted texture. Seen straight from above like a plan. It is only the ground: land, water, roads and open empty spaces where buildings could stand later, because small icons will be placed on top of it. Calm, low-contrast, mid-tone colours, no strong dark or white areas. No text, no letters, no labels, no compass, no scale bar, no border, no frame, no pins, no markers, no icons, no characters. Wide landscape 16:9.
Subject: SUBJECT
```

| file | subject |
|---|---|
| map-city.jpg | a medieval walled town plan: a ring wall with a gate on each side, a main street crossing in the middle to a central open square, narrow side streets in a loose grid, a river along one edge with a stone bridge, empty cobbled blocks and small green gardens between the streets where houses can stand |
| map-city-port.jpg | a harbour town plan: a curved quay and wooden piers on the lower side, a market square behind the harbour, streets climbing in a fan to a hill with an empty plateau on top, a stream through the middle with one bridge, empty plots between the streets |
| map-village.jpg | a small village plan: one dirt road through the middle with a green common and a well in the centre, footpaths branching to empty plots, fenced gardens and fields around, a pond and a few round trees at the edge |
| map-region.jpg | a fantasy region: a forest in the north-west, a mountain range in the north, rolling hills and meadows in the middle, a river from the mountains to a lake and on to a sea coast in the south-east, a winding dirt road between clearings, plenty of open ground |
| map-wilds.jpg | wild country with no towns: dense forest with a few clearings, a stream with a ford, a rocky ridge, marsh patches and one old dirt track, a small lake, mostly open ground |
| map-coast.jpg | a coast and islands: a curved shoreline, a bay, three small islands, shallow turquoise water near the land and deep blue farther out, a sandy beach strip, cliffs on one side, no ships |
| map-underground.jpg | an underground cavern system seen from above: winding tunnels and wider chambers cut into dark grey-brown rock, a small underground stream, empty floor space in the chambers, soft warm torch-lit tone, readable, not black |
| map-interior.jpg | the floor plan of a large house or inn: wooden plank floors, rooms and a corridor and a hall divided by thin walls, a staircase, empty rooms with no furniture, seen straight from above |

Two or three runs of each is normal: pick the one with the most open ground. If the model draws houses anyway, add: "leave all
building plots empty, no houses, no roofs" and run again.

## After the pictures exist (my side)
- `scripts/place-icons.ts`: keys out the magenta (distance from the corner colour with a soft edge, then removes the magenta tint from the
  rim), crops to the content, pads to a square and writes WebP 128 and 256 px with alpha to `builtin-assets/place-icons/<id>.webp`.
- The engine serves them (`GET /v1/place-icons/<id>.webp`, a list at `GET /v1/place-icons`), the map draws them instead of the emoji, and
  Social City reads the same files. This needs an engine release.
