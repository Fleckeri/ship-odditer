"""Print the inline SVG logo used next to the page title (three nested eggs filled with the page's
--rare / --epic / --legend colour tokens, so it follows the light/dark theme by itself).

Usage:  python3 tools/make_logo_svg.py > /tmp/logo.svg   then paste it over the <svg class="logo"> in app/ship-odditer.html
"""
import json, math, os
sh = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "egg_shape.json")))
b = 46; a = sh["a_over_b"] * b; k = sh["k"]; cx, cy = 50, 50; oy = cy + b * 0.06
def egg(scale, n=72):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n; Yn = -math.cos(t)
        x = cx + a * (1 + k * Yn) * math.sin(t) * scale; y = oy + (cy + Yn * b - oy) * scale
        pts.append(f"{x:.1f} {y:.1f}")
    return "M" + " L".join(pts) + "Z"
print(f'<svg class="logo" viewBox="0 0 100 100" aria-hidden="true"><path fill="var(--rare)" d="{egg(1.0)}"/>'
      f'<path fill="var(--epic)" d="{egg(.78)}"/><path fill="var(--legend)" d="{egg(.56)}"/></svg>')
