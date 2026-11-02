"""iOS launch screens for Ship Odditer installed to the home screen: the app icon's nested eggs, centred on the dark
page background. Without them iOS shows a white screen while the app starts. iOS picks the image whose size matches the
device exactly, so there's one per screen size (iPads also in landscape).

Usage:  python3 tools/make_launch_screens.py
Writes app/launch/ios-<width>x<height>@<scale>-<orientation>.png, named by the device's portrait size in CSS pixels;
tools/build_pwa.py adds a link for each file it finds. Needs Pillow and NumPy (it reuses make_icons.py's drawing).
Add a line to DEVICES when Apple ships a new screen size.
"""
import os
from PIL import Image
import make_icons

OUT = os.path.join(os.path.dirname(make_icons.HERE), "app", "launch")
BG = make_icons.THEMES["dark"]["bg"]  # the dark page background (installed apps use the dark icon)
# Portrait screen size in CSS pixels (points) and pixel ratio, checked Nov 2026: pixel resolutions from Apple's iPhone
# comparison page (apple.com/iphone/compare), points and scale from iosref.com/res, which agree with each other. The
# minis and Plus models render at the size listed and are downsampled to their panels, so their media queries use it.
IPHONES = [
    (440, 956, 3),   # 16 Pro Max, 17 Pro Max, 18 Pro Max
    (420, 912, 3),   # Air
    (402, 874, 3),   # 16 Pro, 17, 17 Pro, 18 Pro
    (430, 932, 3),   # 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
    (393, 852, 3),   # 14 Pro, 15, 15 Pro, 16
    (428, 926, 3),   # 12 Pro Max, 13 Pro Max, 14 Plus
    (390, 844, 3),   # 12, 12 Pro, 13, 13 Pro, 14, 16e, 17e
    (375, 812, 3),   # X, XS, 11 Pro, 12 mini, 13 mini
    (466, 678, 3),   # Duo, outer display
    (414, 896, 3),   # XS Max, 11 Pro Max
    (414, 896, 2),   # XR, 11
    (414, 736, 3),   # 6 Plus to 8 Plus
    (375, 667, 2),   # 6 to 8, SE (2nd and 3rd generation)
    (320, 568, 2),   # SE (1st generation)
]
IPADS = [
    (1032, 1376, 2),  # Pro 13" (M4 and later)
    (1024, 1366, 2),  # Pro 12.9", Air 13"
    (834, 1210, 2),   # Pro 11" (M4 and later)
    (834, 1194, 2),   # Pro 11"
    (820, 1180, 2),   # Air 10.9" and 11", iPad (10th generation and later)
    (834, 1112, 2),   # Air (3rd generation), Pro 10.5"
    (810, 1080, 2),   # iPad (7th to 9th generation)
    (768, 1024, 2),   # mini (5th generation), older iPads
    (744, 1133, 2),   # mini (6th generation and later)
]
# The iPhone Duo's inner (folding) display: Apple gives only its pixels (1878 × 2670), and sources disagree on its
# points: 669 × 951 rendered at 3× and downsampled (iosref.com, from App Store Connect's screenshot size) or 626 × 890 at
# a plain 3×. Both are here until one is confirmed; an image whose query matches no device costs nothing. It opens wide,
# so both orientations.
FOLDS = [(669, 951, 3), (626, 890, 3)]
DEVICES = ([(w, h, s, "portrait") for w, h, s in IPHONES]
           + [(w, h, s, o) for w, h, s in IPADS + FOLDS for o in ("portrait", "landscape")])

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith(".png"): os.remove(os.path.join(OUT, f))
    # The full-bleed icon (the eggs on the background colour, no rounded tile), so it melts into the screen
    egg = make_icons.render("dark", .36, False, "bands").convert("RGB")
    for w, h, s, o in DEVICES:
        size = (w * s, h * s) if o == "portrait" else (h * s, w * s)
        logo = round(min(w * .42, 200) * s)  # points: the eggs fill about half of the square
        im = Image.new("RGB", size, BG)
        im.paste(egg.resize((logo, logo), Image.LANCZOS), ((size[0] - logo) // 2, (size[1] - logo) // 2))
        # Four flat colours and their anti-aliased edges: a 64-colour palette looks the same at a fraction of the size
        im.quantize(64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(os.path.join(OUT, f"ios-{w}x{h}@{s}-{o}.png"), optimize=True)
    print("launch screens", len(DEVICES))
