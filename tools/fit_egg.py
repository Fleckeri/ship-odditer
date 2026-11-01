"""Fit a smooth parametric egg to the game's egg silhouette (alpha mask of egg_edible.png).

Usage:  python3 tools/fit_egg.py   (reads vendor/eggincassets/256/egginc/egg_edible.png; writes tools/egg_shape.json)
Only needed if you want to re-derive the shape; tools/egg_shape.json is checked in.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.environ.get("ASSETS_REPO", os.path.join(os.path.dirname(HERE), "vendor", "eggincassets"))
import numpy as np, json
from PIL import Image, ImageDraw
from scipy.optimize import minimize
A = np.array(Image.open(os.path.join(ASSETS, "256", "egginc", "egg_edible.png")).split()[-1]).astype(float) / 255
H, W = A.shape
ys, xs = np.mgrid[0:H, 0:W] + 0.5
def egg_mask(p, n=W):
    cx, cy, a, b, k, ang = p
    # point-in-egg test in the egg's own frame: rotate by -ang about centre
    c, s = np.cos(-ang), np.sin(-ang)
    X = (xs - cx) * c - (ys - cy) * s; Y = (xs - cx) * s + (ys - cy) * c
    # egg: (X / (a*(1 + k*Yn)))^2 + (Y/b)^2 <= 1 with Yn = Y/b (top is Y<0, narrower when k>0 => use (1 + k*Y/b))
    Yn = np.clip(Y / b, -1, 1)
    half = a * (1 + k * Yn) * np.sqrt(np.clip(1 - Yn**2, 0, 1))
    inside = (np.abs(Y) <= b)
    # soft edge for smooth optimisation
    d = np.where(inside, half - np.abs(X), -np.abs(np.abs(Y) - b) - 1)
    return 1 / (1 + np.exp(-d * 1.5))
def loss(p): return np.mean((egg_mask(p) - A) ** 2)
p0 = [126, 127, 84, 112, 0.12, np.radians(12)]
r = minimize(loss, p0, method="Nelder-Mead", options={"maxiter": 4000, "xatol": 1e-3, "fatol": 1e-9})
cx, cy, a, b, k, ang = r.x
iou = ((egg_mask(r.x) > .5) & (A > .5)).sum() / ((egg_mask(r.x) > .5) | (A > .5)).sum()
print("fit", dict(cx=cx, cy=cy, a=a, b=b, k=k, tilt_deg=np.degrees(ang)), "IoU", round(iou, 4), "aspect", round(a/b, 3))
json.dump({"a_over_b": a / b, "k": k, "tilt_deg": float(np.degrees(ang))}, open(os.path.join(HERE, "egg_shape.json"), "w"))
