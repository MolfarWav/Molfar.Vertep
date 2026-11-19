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

## After the pictures exist (my side): done 2026-11-19, see `.fork/STATE.md`
- `scripts/place-icons.ts`: keys out the magenta (distance from the corner colour with a soft edge, then removes the magenta tint from the
  rim), crops to the content, pads to a square and writes WebP 128 and 256 px with alpha to `builtin-assets/place-icons/<id>.webp`.
- The engine serves them (`GET /v1/place-icons/<id>.webp`, a list at `GET /v1/place-icons`), the map draws them instead of the emoji, and
  Social City reads the same files. This needs an engine release.

---

# More sets (the owner's request, 2026-11-19: modern city, extra fantasy; more later, "our own sets")

The first set (above) is done: 52 kinds, four pictures each. New kinds are new files `<id>-<n>.webp` in the same folder: the app's icon picker lists every
kind the engine's `index.json` has, so a new kind shows up there at once. For a kind to also be picked **by name** (a place called "Police station"
gets its icon by itself), `PLACE_KINDS` in Roleplay's `src/lib/place-kinds.ts` gets the kind with its words (English whole words, Ukrainian and
Russian stems); I add that when the pictures arrive. The ids below are the file names to use (`<id>_1.jpg`, `<id>_2.jpg`, ...: any suffix is fine,
I map by looking as last time).

## Prompt for the new sets
Attach ONE finished icon of the first set (a tavern or a house) with the prompt, so the style matches. The first set came out isometric: the
object stands on a small cut-out piece of ground, seen from a raised three-quarter angle. Keep exactly that:

```
Same painting style, line weight, colours and isometric three-quarter angle as the attached icon: a single game-map icon, hand-painted, soft dark ink outline, warm muted colours, gentle light from the top left, a simple readable silhouette that still reads clearly when it is only 64 pixels wide. The object stands on a small cut-out piece of ground and is centred, filling about 80% of the square. The whole background is one flat solid pure magenta (#FF00FF), nothing else in that colour anywhere in the object, no shadow or gradient on the background, no frame, no border, no text, no letters, no logos, no UI.
Subject: SUBJECT
```
For the modern kinds add before "Subject": `A modern city, present day, believable real-world architecture, no fantasy elements.` Avoid pink in any subject (say "avoid pink").

## Modern city (34 kinds)
| id | subject |
|---|---|
| apartment-block | a six-storey residential apartment block with balconies, air-conditioner boxes and a small entrance canopy |
| skyscraper | a tall glass and steel skyscraper with a crown of antennas, a few lit windows |
| office | a mid-rise office building with a glass front and a revolving door |
| suburban-house | a detached suburban house with a garage, a pitched roof and a small lawn |
| cafe | a small corner cafe with an awning, outdoor tables and a menu board |
| restaurant | a restaurant front with a lit sign, a glass door and a few outdoor tables |
| supermarket | a supermarket: a wide low building with a big sign, a car park edge and a row of shopping trolleys |
| mall | a shopping mall: a large glass-fronted block with an arched entrance and flags |
| hospital | a hospital building with a blue cross sign, an ambulance bay and a helipad on the roof (avoid pink) |
| pharmacy | a small pharmacy shopfront with a green cross sign |
| university | a university campus building with a clock tower and wide steps |
| police-station | a police station: a plain civic building with a blue lamp over the door and a patrol car |
| fire-station | a fire station with two big garage doors open, a red fire engine and a hose tower |
| subway | a metro station entrance: a stair going down under a canopy with a round sign |
| bus-stop | a bus stop shelter with a bench, a sign pole and a city bus beside it |
| train-station | a railway station: a long hall with a clock tower, platforms and a train at the side |
| airport | an airport terminal with a control tower, a small passenger plane and a runway edge |
| parking | a multi-storey car park: open concrete decks with a few cars and a ramp |
| gas-station | a petrol station with a canopy, two pumps, a small shop and a price sign |
| city-street | a modern city street seen at an angle: asphalt with lane markings, a pavement, a traffic light, a street lamp and the fronts of two buildings |
| crossroads | a city crossroads seen at an angle: a pedestrian crossing, traffic lights and a corner kiosk |
| gym | a gym: a low building with large windows showing equipment and a big sign |
| cinema | a cinema with a lit marquee, poster boards and a ticket booth |
| nightclub | a nightclub entrance: a dark front with a neon sign (blue and violet, not pink), a velvet rope and a bouncer silhouette |
| hotel | a mid-size hotel with a lit canopy, a revolving door and a rooftop sign |
| bank | a bank: a stone-fronted building with columns, a small flag and a cash machine |
| factory | a factory: a long brick hall with a sawtooth roof, two tall chimneys and a loading dock |
| warehouse | a warehouse: a plain wide shed with roller doors, pallets and a forklift |
| construction-site | a construction site: a half-built frame, a yellow crane, a fence and stacked materials |
| stadium | a football stadium seen at an angle: an oval bowl of stands, floodlight towers and a green pitch |
| museum | a museum: a classical stone building with columns, wide steps and banners |
| post-office | a post office: a small civic building with a mail box and a delivery van |
| courthouse | a courthouse: a stone building with columns, a flag and a set of scales on the pediment |
| power-plant | a power plant: cooling towers with steam, a turbine hall and pylons |
| lab | a research laboratory: a modern low building with a glass atrium, a satellite dish and a small vent chimney |
| harbour-modern | a modern container port: stacked colourful containers, a gantry crane and a ship at the quay |

## More fantasy (28 kinds)
| id | subject |
|---|---|
| battlefield | a battlefield: churned mud, broken spears and banners, a fallen shield, smoke, two small opposing flags |
| army-camp | an army camp: rows of canvas tents, a large command tent with a banner, a palisade and campfires |
| siege-camp | a siege camp: a trebuchet, a battering ram and a few tents before a short stretch of stone wall |
| watchtower | a wooden watchtower on stilts with a ladder, a roofed platform and a lit brazier |
| wizard-tower | a tall twisting wizard tower with a crooked roof, round windows lit violet and floating books (avoid pink) |
| dragon-lair | a dragon lair: a cave mouth in a rocky mountain, a heap of gold at the entrance and scorched ground |
| elven-grove | an elven grove: a slender white-barked tree with a carved platform and a small hanging lantern |
| dwarven-hall | a dwarven hall: a carved stone gate in a mountainside with a great anvil sign and forge glow |
| haunted-house | a haunted house: a crooked dark manor with broken shutters, a dead tree and a pale light in one window |
| shipwreck | a shipwreck: a broken hull on a sandy shore with a snapped mast and torn sails |
| crystal-cave | a crystal cave: a rocky arch glowing with blue and teal crystals |
| volcano | a volcano with a glowing crater, smoke and slow lava streams |
| floating-island | a small floating island with a waterfall off its edge, a few trees and a tiny tower |
| tree-village | a village in giant trees: houses on platforms joined by rope bridges |
| giant-tree | a single enormous ancient tree with a door in its trunk and roots like walls |
| arena | an arena: a round sand-floored fighting pit with stone seating and banners |
| bandit-camp | a bandit camp: ragged tents, a stolen cart, a fire and a skull-topped post |
| hermit-hut | a hermit hut: a tiny stone and turf hut with a crooked chimney, a herb patch and a lantern |
| witch-hut | a witch hut on chicken-like stilts in a swamp, with a cauldron and hanging herbs (avoid pink) |
| crypt | a crypt: a stone mausoleum with a heavy door, steps and ivy |
| oasis | a desert oasis: a small pool, a few palms and a striped tent |
| ice-fortress | a fortress of ice and blue stone with sharp spires |
| lava-fields | a field of black rock cracked with glowing orange lava, a few charred trees |
| sunken-city | a sunken city: broken towers and an arch under clear shallow water, seen at an angle |
| fairy-ring | a fairy ring: a circle of mushrooms and small stones with a soft teal glow (avoid pink) |
| trade-caravan | a trade caravan: two covered wagons, a few mules and a lantern |
| pirate-cove | a pirate cove: a hidden bay with a small ship, a wooden dock and a treasure chest on the sand |
| mountain-pass | a mountain pass: a narrow rocky road between two steep walls with a small stone gatehouse |
| waterfall | a waterfall: a cliff with a river falling into a pool, rocks and mist |

More kinds later in the same way (a space, a post-apocalypse or a cyberpunk set, say): each set is a list like these, one prompt, four pictures
each. When a set is large enough to be its own pack (the owner's plan: "our own sets of icons"), it gets its own folder and a name in the picker
(#373 style packs); until then they all live in the one list.
