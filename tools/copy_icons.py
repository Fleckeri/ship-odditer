"""Copy the item and ship icons that app/data.json refers to into app/icons/.

Usage:  python3 tools/copy_icons.py   (expects a clone of carpetsage/eggincassets at vendor/eggincassets,
                                       or set ASSETS_REPO=/path/to/eggincassets)
Items use the 64 px WebP set, ships the 128 px set. Run after tools/build_data.py.
"""
import json, os, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.environ.get("ASSETS_REPO", os.path.join(ROOT, "vendor", "eggincassets"))
OUT = os.path.join(ROOT, "app", "icons")
os.makedirs(OUT, exist_ok=True)
data = json.load(open(os.path.join(ROOT, "app", "data.json")))
want = {(it["i"], 64) for it in data["items"].values()} | {(sh["icon"], 128) for sh in data["ships"]}
missing = []
for name, size in sorted(want):
    src = os.path.join(ASSETS, str(size), "egginc", name)
    if os.path.exists(src): shutil.copy(src, os.path.join(OUT, name))
    else: missing.append(src)
print(f"copied {len(want) - len(missing)} icons to app/icons")
if missing: print("missing:", *missing, sep="\n  ")
