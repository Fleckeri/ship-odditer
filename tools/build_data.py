"""Build app/data.json: drop shares, mission parameters and item metadata for Ship Odditer.

Usage:  python3 tools/build_data.py          (expects a clone of carpetsage/egg at vendor/egg,
                                              or set EGG_REPO=/path/to/egg)

Inputs (from github.com/carpetsage/egg):
  egg/wasmegg/artifact-explorer/data/loot.json      player-submitted drop counts
  egg/wasmegg/_common/eiafx/eiafx-config.json       mission parameters
  egg/wasmegg/_common/eiafx/eiafx-data.json         item names, tiers, icons, qualities
Output: app/data.json and app/targeted/<ship>.json
"""
import datetime
import json
import os
import re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # repo root
EGG = os.path.join(os.environ.get("EGG_REPO", os.path.join(ROOT, "vendor", "egg")), "wasmegg")
OUT = os.path.join(ROOT, "app")
os.makedirs(OUT, exist_ok=True)

loot = json.load(open(os.path.join(EGG, "artifact-explorer/data/loot.json")))
config = json.load(open(os.path.join(EGG, "_common/eiafx/eiafx-config.json")))
afx = json.load(open(os.path.join(EGG, "_common/eiafx/eiafx-data.json")))

# In the game's own order. A ship's place in this list is its code in the app's share links and home-screen shortcuts
# (linkCode in app/ship-odditer.html), so add new ships at the end and never reorder or remove any.
SHIPS = [  # config id, display name, icon file, loot mission prefix
    ("CHICKEN_ONE", "Chicken One", "afx_ship_chicken_1.webp", "chicken-one"),
    ("CHICKEN_NINE", "Chicken Nine", "afx_ship_chicken_9.webp", "chicken-nine"),
    ("CHICKEN_HEAVY", "Chicken Heavy", "afx_ship_chicken_heavy.webp", "chicken-heavy"),
    ("BCR", "BCR", "afx_ship_bcr.webp", "bcr"),
    ("MILLENIUM_CHICKEN", "Quintillion Chicken", "afx_ship_millenium_chicken.webp", "millenium-chicken"),
    ("CORELLIHEN_CORVETTE", "Cornish-Hen Corvette", "afx_ship_corellihen_corvette.webp", "corellihen-corvette"),
    ("GALEGGTICA", "Galeggtica", "afx_ship_galeggtica.webp", "galeggtica"),
    ("CHICKFIANT", "Defihent", "afx_ship_defihent.webp", "chickfiant"),
    ("VOYEGGER", "Voyegger", "afx_ship_voyegger.webp", "voyegger"),
    ("HENERPRISE", "Henerprise", "afx_ship_henerprise.webp", "henerprise"),
    ("ATREGGIES", "Atreggies Henliner", "afx_ship_atreggies.webp", "atreggies"),
]
# FTL Drive Upgrades applies to the Quintillion Chicken and later ships (Egg Inc wiki, Spaceships).
FTL_FROM = "MILLENIUM_CHICKEN"
DURATIONS = [("SHORT", "short", "Short"), ("LONG", "standard", "Standard"), ("EPIC", "extended", "Extended")]
UNTARGETED = 10000

# Items
items = {}
for fam in afx["artifact_families"]:
    for t in fam["tiers"]:
        typ = t["type"]
        cat = "art" if typ == "Artifact" else "ing" if typ == "Ingredient" else "stone"
        items[t["id"]] = {
            "n": t["name"],
            "f": fam["name"],
            "t": t["tier_number"],
            "c": cat,
            "i": t["icon_filename"].replace(".png", ".webp"),
            "q": t["quality"],
            # Per-rarity effect: [rarity index 0-3, effect text, stone slots or null]
            "e": [[e["afx_rarity"], e["effect"], e["slots"]] for e in (t.get("effects") or [])],
            "fe": fam.get("effect") or "",
        }

params = {m["ship"]: m for m in config["missionParameters"]}
missions = {m["missionId"]: m for m in loot["missions"]}

def dump(obj, path):
    """Readable JSON: indented, but each list of numbers (a drop row) stays on one line. build_pwa.py minifies
    these for the site, so the formatting costs nothing at runtime."""
    s = json.dumps(obj, indent=1)
    s = re.sub(r"\[\s+([-0-9.e+,\s]+?)\s+\]", lambda m: "[" + ", ".join(x.strip() for x in m.group(1).split(",")) + "]", s)
    with open(path, "w") as fh:
        fh.write(s + "\n")

ships_out = []
used_items = set()
used_targets = set()
targets_out = {}  # {ship id: per-ship targeted shares}
ftl_on = False

def shares(t):
    """{n: total drops, d: {itemId: [count common, rare, epic, legendary]}} for one target's drop counts.
    Raw counts are exact and much smaller than shares; trailing zero rarities are dropped ([12, 3] = 12 common,
    3 rare). The page divides by n."""
    total = t["totalDrops"]
    rows = {}
    for it in t["items"]:
        if it["itemId"] not in items:
            continue
        counts = list(it["counts"])
        while counts and not counts[-1]:
            counts.pop()
        if counts:
            rows[it["itemId"]] = counts
            used_items.add(it["itemId"])
    return {"n": total, "d": rows}

# Mission targets, keyed by afx id (ei.ArtifactSpec.Name): one per artifact or ingredient family, one for
# a stone's tiers 2-4 and one for its fragments (tier 1). Shown with the icon of the highest tier sharing
# that id that also drops somewhere (some top tiers are craft-only).
TARGET_KIND = {"Artifact": "art", "Stone": "stone", "Stone ingredient": "frag", "Ingredient": "ing"}
target_ids = {}
for fam in afx["artifact_families"]:
    for t in fam["tiers"]:
        kind = TARGET_KIND[t["type"]]
        name = t["name"] if kind == "frag" else fam["name"]
        target_ids.setdefault(t["afx_id"], {"n": name, "k": kind, "tiers": []})["tiers"].append((t["tier_number"], t["id"]))
# Stone fragments can be targeted, but it's almost never worthwhile (poor return, and it lowers tier 2-4 stone
# odds; consuming artifacts is the better source), so the app leaves them out, as the wasmegg artifact explorer
# does (noFragTargets). Their ids stay in target_ids only to name them.
OFFERED_KINDS = {"art", "stone", "ing"}
for sid, name, icon, prefix in SHIPS:
    if sid == FTL_FROM:
        ftl_on = True
    p = params[sid]
    durs = {d["durationType"]: d for d in p["durations"]}
    ship = {"id": prefix, "name": name, "icon": icon, "ftl": ftl_on,
            "maxStars": len(p["levelMissionRequirements"]),
            # Launch points needed for each next star (per-level increments, not cumulative)
            "req": p["levelMissionRequirements"],
            "missions": []}
    ship_targets = {}  # {mission index: {star: {afxId: {n, d}}}}
    for dtype, slug, label in DURATIONS:
        d = durs[dtype]
        mid = f"{prefix}-{slug}"
        levels = {}
        for lv in missions.get(mid, {}).get("levels", []):
            tgt = next((t for t in lv["targets"] if t["targetAfxId"] == UNTARGETED), None)
            if not tgt or not tgt["totalDrops"]:
                continue
            entry = shares(tgt)
            # Targeted drops, keyed by target afx id. Only FTL ships can set a target (pre-FTL ships log
            # a few hundred stray drops at most, so they're left out). The counts go to targeted/<ship>.json,
            # loaded on demand; data.json keeps just the drop counts ("tn") so the target list can be built.
            if ftl_on:
                tg = {str(t["targetAfxId"]): shares(t) for t in lv["targets"]
                      if t["targetAfxId"] != UNTARGETED and t["targetAfxId"] in target_ids
                      and target_ids[t["targetAfxId"]]["k"] in OFFERED_KINDS and t["totalDrops"]}
                if tg:
                    entry["tn"] = {a: v["n"] for a, v in tg.items()}
                    ship_targets.setdefault(str(len(ship["missions"])), {})[str(lv["level"])] = tg
                    used_targets.update(tg)
            levels[str(lv["level"])] = entry
        ship["missions"].append({
            "id": mid, "label": label, "seconds": d["seconds"],
            "cap": d["capacity"], "capBump": d["levelCapacityBump"],
            "qMin": d["minQuality"], "qMax": d["maxQuality"], "qBump": d["levelQualityBump"],
            "levels": levels,
        })
    if ship_targets:
        targets_out[prefix] = ship_targets
    ships_out.append(ship)

data = {
    "source": "Player-submitted drop data (Menno's drop data tool) via the wasmegg-carpet artifact explorer; repo github.com/carpetsage/egg",
    "dataUpdated": os.environ.get("DATA_DATE", datetime.date.today().isoformat()),
    "items": {k: v for k, v in items.items() if k in used_items},
    # Mission targets: {afxId: {n: name, k: "art"|"stone"|"frag"|"ing", i: icon item id,
    #                           it: {tier: item id}, including tiers that never drop}}
    "targets": {str(a): {"n": t["n"], "k": t["k"], "i": max((x for x in t["tiers"] if x[1] in used_items), default=max(t["tiers"]))[1],
                         "it": {str(tier): iid for tier, iid in t["tiers"]}}
                for a, t in sorted(target_ids.items()) if str(a) in used_targets},
    "ships": ships_out,
}
# Names and effect texts are written into the page as HTML. Upstream text has none of these characters; if that
# ever changes, stop here rather than ship markup into the page.
unsafe = [s for it in data["items"].values() for s in [it["n"], it["f"], it["fe"]] + [e[1] for e in it["e"]]
          if re.search(r'[<>&"]', s)] + [t["n"] for t in target_ids.values() if re.search(r'[<>&"]', t["n"])]
assert not unsafe, f"HTML-special characters in item text: {unsafe[:5]}"
missing_icons = [t["i"] for t in data["targets"].values() if t["i"] not in data["items"]]
assert not missing_icons, f"target icon items not in data: {missing_icons}"
path = os.path.join(OUT, "data.json")
dump(data, path)
print("items", len(data["items"]), "bytes", os.path.getsize(path))
# Targeted counts, one file per FTL ship: {mission index: {star: {afxId: {n, d}}}}
tdir = os.path.join(OUT, "targeted")
os.makedirs(tdir, exist_ok=True)
for f in os.listdir(tdir):
    if f.endswith(".json"): os.remove(os.path.join(tdir, f))
for sid, t in targets_out.items():
    tpath = os.path.join(tdir, f"{sid}.json")
    dump(t, tpath)
    print("targets", sid, "bytes", os.path.getsize(tpath))
for s in ships_out:
    print(s["name"], s["maxStars"], [(m["label"], sorted(int(k) for k in m["levels"])) for m in s["missions"]])
