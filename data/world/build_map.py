"""Builds the v0 master map: slices.json and reference/master-map-v0.png.
Schematic only. Placement is NOT canon-accurate; verify against UESP and ESO maps in Phase 0."""
import json
from PIL import Image, ImageDraw, ImageFont

COLS, ROWS = 12, 9
# rows 1..9 north to south, columns 1..12 west to east
GRID = [
 "MMMMMMMMMMMM",
 "RRMMRRRMMMMM",
 "SRRDDDRRMMMM",
 "SJRDDDDRRMMM",
 "SJJDDDDDRRMM",
 "SJJCDDDDDRRM",
 "SSCCCDDDDDRR",
 "SSCCCCDDDCCC",
 "SSSSSSSSSSSS",
]
BIOME = {"S":"sea","C":"coastal grassland","J":"jungle","D":"desert","R":"rocky badlands","M":"highlands and mountains"}
COLOR = {"S":(86,128,170),"C":(150,180,110),"J":(52,120,70),"D":(226,196,130),"R":(176,140,104),"M":(140,140,150)}

REGION = {}
def region(name, band, cells):
    for c in cells: REGION[c] = (name, band)
region("Sentinel Coast", "1-10", [(3,8),(4,8),(5,8),(3,7),(4,7),(5,7),(6,8)])
region("Greenwater", "10-20", [(2,4),(2,5),(3,5),(2,6),(3,6),(4,6)])
region("Rustwater Coast", "10-22", [(7,8),(8,8),(9,8),(10,8),(11,8),(12,8)])
region("Alik'r Desert", "12-30", [(4,3),(7,3),(4,4),(7,4),(4,5),(6,5),(7,5),(8,5),(5,6),(6,6),(7,6),(8,6),(9,6),(6,7),(7,7),(8,7),(9,7),(10,7),(3,3)])
region("Hegathe Reach", "24-35", [(5,3),(6,3),(5,4),(6,4),(5,5)])
region("Fallen Wastes", "25-40", [(2,3),(3,4),(8,4),(8,3),(9,4),(9,5),(10,5),(10,6),(11,7),(12,7),(11,6),(1,2),(2,2),(5,2),(6,2),(7,2),(9,3)])
region("Craglorn Highlands", "25-40", [(3,2),(4,2),(8,2),(9,2),(10,2),(11,2),(12,2),(10,3),(11,3),(12,3),(10,4),(11,4),(12,4),(11,5),(12,5),(12,6)])
region("Northern Marches", "30+", [(c,1) for c in range(1,13)])
SEA = (0, 0)

LOCS = {
 (4,8):  ["Farm valley (start)", "Saltreach village"],
 (3,8):  ["Drowned Stair ruin (Name 2)"],
 (3,7):  ["Khadija's cove"],
 (4,7):  ["Zeyna's cottage"],
 (5,8):  ["Sentinel (city, separate area, gates here)"],
 (6,8):  ["Redtide Anchorage (Wreckers market)"],
 (2,5):  ["Greenwater river fort and auction (Name 3)"],
 (2,6):  ["Drum village"],
 (4,5):  ["Ayleid ruin"],
 (7,5):  ["Mother Anwar's camp"],
 (7,6):  ["Seven Wells, Sulayman's table (Name 4)"],
 (8,3):  ["Dwemer ruin"],
 (8,4):  ["Yokudan necropolis"],
 (6,3):  ["Hegathe (city, separate area) and the keep beneath (Name 7)"],
 (10,2): ["Thalmor outpost in a Dwemer ruin (Name 6)"],
 (8,7):  ["Duneripper nest (deadly zone)"],
 (9,5):  ["Giants' camp (deadly zone)"],
 (10,6): ["Giant scorpion lands (deadly zone)"],
 (6,1):  ["North pass (sealed)"],
 (12,3): ["East pass (sealed)"],
}
ROADS = {
 "Coast Road": [(3,8),(4,8),(5,8),(6,8),(7,8),(8,8),(9,8),(10,8),(11,8),(12,8)],
 "Hegathe Road": [(5,8),(5,7),(5,6),(5,5),(5,4),(6,3)],
 "Jungle Road": [(4,8),(3,7),(3,6),(2,5)],
 "Caravan Road": [(5,6),(6,6),(7,6),(8,6),(9,6),(10,6)],
 "Highland Road": [(9,6),(9,5),(9,4),(10,3),(10,2)],
}
WADI = [(7,3),(7,4),(7,5),(7,6),(7,7),(7,8)]  # seasonal river, flows south to the sea

slices = []
for y in range(1, ROWS+1):
    for x in range(1, COLS+1):
        b = GRID[y-1][x-1]
        reg, band = REGION.get((x,y), ("Open sea" if b=="S" else "Unassigned", "-" if b=="S" else "TBD"))
        slices.append({"x":x,"y":y,"biome":BIOME[b],"region":reg,"level_band":band,
                       "locations":LOCS.get((x,y),[]),
                       "roads":[n for n,p in ROADS.items() if (x,y) in p],
                       "wadi": (x,y) in WADI})
json.dump({"cols":COLS,"rows":ROWS,"tiles_per_slice":128,"slices":slices}, open("data/world/slices.json","w"), indent=1)

# ---- render
S = 84
W, H = COLS*S, ROWS*S + 70
im = Image.new("RGB", (W, H), (245,240,230))
d = ImageDraw.Draw(im)
try:
    f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
    fb = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 11)
except Exception:
    f = fb = ImageFont.load_default()
for y in range(ROWS):
    for x in range(COLS):
        d.rectangle([x*S, y*S, (x+1)*S, (y+1)*S], fill=COLOR[GRID[y][x]], outline=(60,60,60))
        d.text((x*S+3, y*S+2), f"{x+1},{y+1}", fill=(40,40,40), font=f)
def ctr(c): return ((c[0]-1)*S + S//2, (c[1]-1)*S + S//2)
d.line([ctr(c) for c in WADI], fill=(70,110,190), width=3)
for n,p in ROADS.items():
    d.line([ctr(c) for c in p], fill=(95,60,30), width=3)
marks = {
 (4,8):"Farm", (5,8):"Sentinel", (6,3):"Hegathe", (2,5):"Fort", (7,6):"Wells", (7,5):"Anwar", (10,2):"Thalmor",
 (3,8):"Stair", (6,8):"Redtide", (8,7):"Duneripper", (9,5):"Giants", (10,6):"Scorpions", (8,4):"Necropolis",
}
for c,label in marks.items():
    cx,cy = ctr(c)
    d.ellipse([cx-5,cy-5,cx+5,cy+5], fill=(200,30,60), outline=(255,255,255))
    d.text((cx-len(label)*3, cy+7), label, fill=(20,20,20), font=fb)
d.text((6, ROWS*S+6), "Master map v0: 12 x 9 slices of 128 x 128 tiles. Schematic, not canon-accurate. West at left, north at top.", fill=(20,20,20), font=fb)
d.text((6, ROWS*S+24), "Brown: roads.  Blue: Wadi Anjar (seasonal river).  Red dots: story and landmark slices.  Sea: row 9 and west edge.", fill=(20,20,20), font=f)
d.text((6, ROWS*S+40), "Biomes: green coast, dark green jungle, sand desert, tan badlands, grey highlands, blue sea.", fill=(20,20,20), font=f)
import os
os.makedirs("reference", exist_ok=True)
im.save("reference/master-map-v0.png")
land = sum(1 for s in slices if s["biome"]!="sea")
print("slices", len(slices), "land", land)
unassigned = [ (s["x"],s["y"]) for s in slices if s["region"]=="Unassigned"]
print("unassigned", unassigned)
