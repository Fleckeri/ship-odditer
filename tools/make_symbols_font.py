#!/usr/bin/env python3
"""Draw the few symbols the page uses that Atkinson Hyperlegible and Chakra Petch don't have (★ → ≥ ≈ ᴇ), as a
tiny font in two weights: app/fonts/odditer-symbols-400.woff2 and -700.woff2.

Without it each device draws these from whatever system font has them, so "8★" or "0★ → 8★" looks different on
a Mac, an iPhone, Windows, and Android. The glyphs use Atkinson Hyperlegible's metrics (1000 units per em,
cap height 668, x-height 496, maths axis 248) and stroke weights (its minus is 79 units thick in regular, 128 in
bold), so they sit on the same baseline and size as the text around them.

Only needed to regenerate the font files: python3 tools/make_symbols_font.py (needs fontTools and brotli).
"""
import math, os
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

UPM, ASC, DESC = 1000, 950, -290
AXIS, CAP, XH = 248, 668, 496
OUT = os.path.join(os.path.dirname(__file__), "..", "app", "fonts")


def poly(pen, pts):
    # Contours run clockwise (TrueType's filled direction); overlapping ones simply merge
    if sum((b[0] - a[0]) * (b[1] + a[1]) for a, b in zip(pts, pts[1:] + pts[:1])) < 0:
        pts = pts[::-1]
    pen.moveTo(pts[0])
    for p in pts[1:]:
        pen.lineTo(p)
    pen.closePath()


def bar(pen, a, b, t):
    """A straight stroke of thickness t from a to b, with square ends."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dy)
    ox, oy = -dy / n * t / 2, dx / n * t / 2
    poly(pen, [(round(a[0] + ox), round(a[1] + oy)), (round(b[0] + ox), round(b[1] + oy)),
               (round(b[0] - ox), round(b[1] - oy)), (round(a[0] - ox), round(a[1] - oy))])


def chevron(pen, tip, dx, dy, t, right=True):
    """Two strokes meeting at a sharp point (for > and the arrowhead), mitred at the tip."""
    s = 1 if right else -1
    x, y = tip
    # Outer and inner outline of a mitred chevron with arms (−dx, ±dy) from the tip
    n = math.hypot(dx, dy)
    off = t / 2 / (dy / n)  # horizontal distance from the stroke's centre line to its edge at a given height
    poly(pen, [(round(x + s * off), y), (round(x - s * dx + s * off), y + dy), (round(x - s * dx - s * off), y + dy),
               (round(x - s * off), y), (round(x - s * dx - s * off), y - dy), (round(x - s * dx + s * off), y - dy)])


def star(pen, t):
    # Five points, from the baseline to just under the cap height, like a figure
    top, bottom = CAP - 8, -4
    R = (top - bottom) / (1 + math.cos(math.radians(36)))
    cx, cy, r = 400, top - R, R * (0.47 + t / 2000)  # a slightly fuller star in bold
    pts = []
    for i in range(10):
        a = math.radians(90 + 36 * i)
        rr = R if i % 2 == 0 else r
        pts.append((round(cx + rr * math.cos(a)), round(cy + rr * math.sin(a))))
    poly(pen, pts)
    return 800


def arrow(pen, t):
    left, tip, head = 70, 760, 250
    bar(pen, (left, AXIS), (tip - t * 0.6, AXIS), t)
    chevron(pen, (tip, AXIS), head, head, t)
    return 830


def geq(pen, t):
    # ">" over a bar, the chevron raised so the pair spans the cap height
    w, lo = 430, 0
    bar(pen, (75, lo + t / 2), (75 + w, lo + t / 2), t)
    mid, half = 420, 205
    chevron(pen, (75 + w, mid), w - 10, half, t)
    return 580


def approx(pen, t):
    # Two gentle waves around the maths axis
    x0, x1, amp, gap = 70, 530, 38, 92
    for yc in (AXIS + gap, AXIS - gap):
        n = 24
        top = [(x0 + (x1 - x0) * i / n, yc + amp * math.sin(2 * math.pi * i / n) + t / 2) for i in range(n + 1)]
        bot = [(x, y - t) for x, y in top]
        poly(pen, [(round(x), round(y)) for x, y in top + bot[::-1]])
    return 600


def small_e(pen, t):
    # Small capital E: x-height tall
    x, w = 75, 360
    poly(pen, [(x, 0), (x + t, 0), (x + t, XH), (x, XH)])
    bar(pen, (x, XH - t / 2), (x + w, XH - t / 2), t)
    bar(pen, (x, XH / 2), (x + w - 50, XH / 2), t)
    bar(pen, (x, t / 2), (x + w, t / 2), t)
    return 500


GLYPHS = {"uni2605": (0x2605, star), "uni2192": (0x2192, arrow), "uni2265": (0x2265, geq),
          "uni2248": (0x2248, approx), "uni1D07": (0x1D07, small_e)}


def build(weight, t):
    order = [".notdef"] + list(GLYPHS)
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap({cp: name for name, (cp, _) in GLYPHS.items()})
    glyphs, metrics = {".notdef": TTGlyphPen(None).glyph()}, {".notdef": (500, 0)}
    for name, (_, draw) in GLYPHS.items():
        pen = TTGlyphPen(None)
        adv = draw(pen, t)
        g = pen.glyph()
        g.recalcBounds(None)
        glyphs[name], metrics[name] = g, (adv, g.xMin)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=ASC, descent=DESC)
    style = "Bold" if weight == 700 else "Regular"
    fb.setupNameTable({"familyName": "Odditer Symbols", "styleName": style})
    fb.setupOS2(sTypoAscender=ASC, sTypoDescender=DESC, usWinAscent=ASC, usWinDescent=-DESC,
                sxHeight=XH, sCapHeight=CAP, usWeightClass=weight, fsSelection=0x20 if weight == 700 else 0x40)
    fb.setupPost()
    fb.font.flavor = "woff2"
    path = os.path.join(OUT, f"odditer-symbols-{weight}.woff2")
    fb.save(path)
    print(path, os.path.getsize(path), "bytes")


if __name__ == "__main__":
    build(400, 80)
    build(700, 128)
