# Master Map v0 (Hammerfell)

Image: `reference/master-map-v0.png`. Data: `data/world/slices.json`. Generator: `data/world/build_map.py` (edit the grid and rerun).

**Status: PROPOSED schematic.** The grid is 12 x 9 slices of 128 x 128 tiles (1,536 x 1,152 tiles including sea). Only 88 slices are land, about 1.44 million tiles, a little under the 1.61 million tiles of the Skyrim-sized target (1,428 x 1,128). That is a deliberate buffer. Add slices at the edges if testing shows the world feels small. Placement of regions is **not canon-accurate**. In Phase 0, compare against UESP and ESO maps and adjust. Lore notes: the Alik'r Desert takes up most of Hammerfell with fertile grassland on the coasts, and Hegathe sits in the greater Alik'r. Stros M'Kai is an island reached by ferry and is outside this grid.

## Orientation
West is left, north is up. Sea along the south edge (row 9) and west edge. Highlands in the north and east. The north and east passes to other provinces are **sealed in v1** (Thalmor-held passes and a closed Cyrodiil road), which keeps the world a closed Hammerfell.

## Regions and level bands (provisional)
| Region | Slices | Level band | Character |
|---|---|---|---|
| Sentinel Coast | 7 | 1 to 10 | Grassland, salt pans, farms, the first ruins. The start. |
| Greenwater | 6 | 10 to 20 | Humid jungle, river forts, drums at night |
| Rustwater Coast | 6 | 10 to 22 | The Wreckers' coast, anchorages, dry cliffs |
| Alik'r Desert | 19 | 12 to 30 | Dunes, wells, caravans, ruins of three ages |
| Hegathe Reach | 5 | 24 to 35 | The old Crown heartland, walls and farms, Relief Day banners |
| Fallen Wastes | 18 | 25 to 40 | Rocky badlands, many deadly zones |
| Craglorn Highlands | 16 | 25 to 40 | Mountains, Dwemer ruins, the Thalmor outpost |
| Northern Marches | 12 | 30 and up | Sealed border mountains, optional endgame hunting |
88 land slices in all. Level bands guide leveled lists. Fixed deadly zones override them.

## Key locations
| Place | Slice | Notes |
|---|---|---|
| Farm valley and Saltreach village | 4,8 | Prologue. Village is a loading-screen town area. |
| Zeyna's cottage | 4,7 | Act One |
| Khadija's cove | 3,7 | Sword-singers' first contact |
| Drowned Stair (Name 2) | 3,8 | Three-age ruin on the shore |
| Sentinel (city) | 5,8 | Separate area, gates on this slice |
| Redtide Anchorage | 6,8 | Wreckers' floating market |
| Greenwater fort and auction (Name 3) | 2,5 | River fort |
| Mother Anwar's camp | 7,5 | Alik'r elder, Folio Two |
| Seven Wells, Sulayman's table (Name 4) | 7,6 | Caravan hub |
| Yokudan necropolis | 8,4 | Ancient Dead |
| Dwemer ruin | 8,3 | Automatons |
| Ayleid ruin | 4,5 | Ghosts, a necromancer |
| Hegathe and the keep beneath (Name 7) | 6,3 | Separate areas |
| Thalmor outpost (Name 6) | 10,2 | In a Dwemer ruin |
| Duneripper nest | 8,7 | Deadly zone |
| Giants' camp | 9,5 | Deadly zone |
| Giant scorpion lands | 10,6 | Deadly zone |

## Roads and water (edge contracts)
Each road is a list of slices. Every slice on a road must meet its neighbours at the same edge position (a tile column or row per road, set in the slice contract).
- Coast Road: 3,8 to 12,8 (east-west).
- Hegathe Road: 5,8 north to 5,4, then to 6,3.
- Jungle Road: 4,8, 3,7, 3,6, 2,5.
- Caravan Road: 5,6 east to 10,6.
- Highland Road: 9,6 north to 9,4, then 10,3, 10,2.
- Wadi Anjar (seasonal river): 7,3 south to 7,8 and the sea. Crossings at roads. Dry in summer, flooding rarely, a travel hazard.

## Travel
Fast travel only to discovered places, costs game time, and is blocked while enemies are near. Horse speeds overland travel. Carriages between Sentinel, Hegathe, Seven Wells and the Anchorage. Ferry to Stros M'Kai from Sentinel (post-main-quest content).

## Authoring order
1. Sentinel Coast (7 slices) for the vertical slice.
2. Hegathe Road corridor so the main quest is walkable end to end.
3. Greenwater, then Alik'r, then Highlands, then Hegathe Reach.
4. Fill with the three-tier content plan.
