"""App icons for Ship Odditer: the game's egg silhouette (fitted from egg_edible.png, see fit_egg.py) as concentric
egg-shaped rings in the rarity colours, blue outside, then purple, then orange, on the page background.
Dark and light variants use each theme's own background and rarity colours.

Usage:  python3 tools/make_icons.py [bands|rings]   (default "bands", the chosen design)
Writes app/app-icons/*.png and tools/icon-preview-<style>.png. Needs Pillow and NumPy.
"""
import json, os, numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "app", "app-icons"); os.makedirs(OUT, exist_ok=True)
shape = json.load(open(os.path.join(HERE, "egg_shape.json")))
THEMES = {
  "dark":  {"bg": (15, 20, 27),   "rings": [(106, 174, 245), (185, 138, 240), (240, 181, 74)]},
  "light": {"bg": (243, 245, 248), "rings": [(47, 127, 214), (138, 79, 209), (201, 134, 18)]},
}
SS = 2048  # working resolution
def egg_points(cx, cy, b, n=720):
    a, k = shape["a_over_b"] * b, shape["k"]
    pts = []
    for i in range(n):
        t = 2 * np.pi * i / n
        Yn = -np.cos(t)                      # -1 top … +1 bottom
        X = a * (1 + k * Yn) * np.sin(t)
        pts.append((cx + X, cy + Yn * b))
    return pts
def render(theme, b_frac, rounded, style):
    T = THEMES[theme]
    im = Image.new("RGBA", (SS, SS), (0, 0, 0, 0))
    bgmask = Image.new("L", (SS, SS), 0)
    if rounded: ImageDraw.Draw(bgmask).rounded_rectangle([0, 0, SS - 1, SS - 1], radius=int(SS * .225), fill=255)
    else: bgmask.paste(255, [0, 0, SS, SS])
    im.paste(T["bg"] + (255,), (0, 0), bgmask)
    b = SS * b_frac
    # Nested copies of the same egg, scaled about a point a little below centre (where the egg is widest),
    # so every ring keeps the game egg's shape
    ox, oy = SS / 2, SS / 2 + b * 0.06
    def egg(scale):
        return [(ox + (x - SS / 2) * scale, oy + (y - SS / 2 - b * 0.06) * scale) for x, y in egg_points(SS / 2, SS / 2 + b * 0.06 - b * 0.06, b)]
    steps = [(1.0, .855), (.785, .64), (.57, .425)] if style == "rings" else [(1.0, .78), (.78, .56), (.56, 0)]
    layer = Image.new("RGBA", (SS, SS), (0, 0, 0, 0)); dr = ImageDraw.Draw(layer)
    for (so, si), col in zip(steps, T["rings"]):
        dr.polygon(egg(so), fill=col + (255,))
        if si > 0: dr.polygon(egg(si), fill=T["bg"] + (255,))
    im.alpha_composite(layer)
    arr = np.array(im)
    return Image.fromarray(arr)
def save(img, name, size): img.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name))
def build(style="rings", out=True):
    imgs = {}
    for theme in THEMES:
        imgs[(theme, "any")] = render(theme, .36, True, style)       # rounded tile for browsers/desktops
        imgs[(theme, "full")] = render(theme, .32, False, style)     # full-bleed: maskable + Apple (OS rounds it)
    if out:
        for s in (192, 512):
            save(imgs[("dark", "any")], f"icon-{s}.png", s)
            save(imgs[("dark", "full")], f"maskable-{s}.png", s)
            save(imgs[("light", "any")], f"icon-light-{s}.png", s)
        save(imgs[("dark", "full")].convert("RGB"), "apple-touch-icon.png", 180)
        save(imgs[("dark", "any")], "favicon-dark-64.png", 64)
        save(imgs[("light", "any")], "favicon-light-64.png", 64)
    return imgs
if __name__ == "__main__":
    import sys
    style = sys.argv[1] if len(sys.argv) > 1 else "bands"
    imgs = build(style)
    # Preview sheet: dark & light, rounded tile, maskable with safe-zone circle, and small sizes
    P = Image.new("RGB", (1500, 520), (128, 132, 140)); dr = ImageDraw.Draw(P)
    x = 20
    for theme in ("dark", "light"):
        a = imgs[(theme, "any")].resize((340, 340), Image.LANCZOS); P.paste(a, (x, 20), a)
        f = imgs[(theme, "full")].resize((340, 340), Image.LANCZOS)
        cm = Image.new("L", (340, 340), 0); ImageDraw.Draw(cm).ellipse([0, 0, 339, 339], fill=255)  # Android circle mask
        P.paste(f, (x + 360, 20), cm)
        for j, s in enumerate((96, 48, 32, 16)):
            t = imgs[(theme, "any")].resize((s, s), Image.LANCZOS); P.paste(t, (x + j * 110, 400 + (96 - s) // 2), t)
        x += 740
    P.save(os.path.join(HERE, f"icon-preview-{style}.png"))
    print("ok", style)
