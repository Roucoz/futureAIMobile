#!/usr/bin/env python3
"""
Generates all app icon / splash assets for FutureAIMobile (brand: Tuxon)
from the source wordmark logo.

Usage:
    python3 scripts/generate-icons.py <path-to-source-logo.png>

Outputs (overwrites in place):
  - Android launcher + adaptive foreground mipmaps
  - Android splash logo (drawable)
  - iOS AppIcon.appiconset PNGs
  - iOS SplashLogo.imageset PNG
  - release-assets/icon-1024-master.png (store submission master)
"""
import os
import sys
from PIL import Image

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    PROJECT, "..", "future", "apps", "admin", "public", "tuxon-logo.png")

# Wordmark drawn on WHITE canvas at this fraction of the canvas width.
IOS_FRACTION = 0.84       # iOS app icons + marketing
LEGACY_FRACTION = 0.90    # Android legacy launcher icons + splash (square)
ADAPTIVE_FRACTION = 0.60  # Android adaptive foreground (kept in safe circle)

# Android legacy launcher sizes (px), per density bucket.
ANDROID_LEGACY = {
    "mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192,
}
# Android adaptive foreground canvas is 108dp -> px per density.
ANDROID_ADAPTIVE = {
    "mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432,
}
# iOS app icon pixel sizes, keyed by existing Contents.json filename.
IOS_ICONS = {
    "Icon-App-20x20@1x.png": 20,
    "Icon-App-20x20@2x.png": 40,
    "Icon-App-20x20@3x.png": 60,
    "Icon-App-29x29@1x.png": 29,
    "Icon-App-29x29@2x.png": 58,
    "Icon-App-29x29@3x.png": 87,
    "Icon-App-40x40@1x.png": 40,
    "Icon-App-40x40@2x.png": 80,
    "Icon-App-40x40@3x.png": 120,
    "Icon-App-60x60@2x.png": 120,
    "Icon-App-60x60@3x.png": 180,
    "Icon-App-76x76@1x.png": 76,
    "Icon-App-76x76@2x.png": 152,
    "Icon-App-83.5x83.5@2x.png": 167,
    "ItunesArtwork@2x.png": 1024,
}

RES = os.path.join(PROJECT, "android", "app", "src", "main", "res")
XC = os.path.join(PROJECT, "ios", "FutureAIMobile", "Images.xcassets")


def glyph_from(source):
    """Extract the transparent wordmark glyph (alpha bbox) from the source."""
    img = Image.open(source).convert("RGBA")
    bbox = img.split()[3].getbbox()  # alpha bounding box
    if bbox is None:
        raise SystemExit("No opaque content found in source image")
    pad = 4
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(img.width, right + pad)
    bottom = min(img.height, bottom + pad)
    return img.crop((left, top, right, bottom))


def square_icon(glyph, size, fraction):
    """White square with the wordmark centered at `fraction` of the width."""
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    gw = int(round(size * fraction))
    gh = int(round(gw * glyph.height / glyph.width))
    scaled = glyph.resize((gw, gh), Image.LANCZOS)
    canvas.paste(scaled, ((size - gw) // 2, (size - gh) // 2), scaled)
    return canvas


def adaptive_foreground(glyph, size, fraction):
    """Transparent 108dp-canvas with the wordmark centered (safe-zone safe)."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gw = int(round(size * fraction))
    gh = int(round(gw * glyph.height / glyph.width))
    scaled = glyph.resize((gw, gh), Image.LANCZOS)
    canvas.paste(scaled, ((size - gw) // 2, (size - gh) // 2), scaled)
    return canvas


def main():
    if not os.path.exists(SRC):
        raise SystemExit("Source logo not found: " + SRC)
    glyph = glyph_from(SRC)
    print("glyph size:", glyph.size)

    # --- Android legacy launcher icons ---
    for density, px in ANDROID_LEGACY.items():
        icon = square_icon(glyph, px, LEGACY_FRACTION)
        folder = os.path.join(RES, "mipmap-%s" % density)
        for name in ("ic_launcher.png", "ic_launcher_round.png"):
            icon.save(os.path.join(folder, name))
        print("  legacy %s" % density)

    # --- Android adaptive foregrounds ---
    for density, px in ANDROID_ADAPTIVE.items():
        fg = adaptive_foreground(glyph, px, ADAPTIVE_FRACTION)
        fg.save(os.path.join(RES, "mipmap-%s" % density, "ic_launcher_foreground.png"))
        print("  adaptive %s" % density)

    # --- Android splash logo (square icon on white, 512px at mdpi default) ---
    splash = square_icon(glyph, 512, LEGACY_FRACTION)
    splash.save(os.path.join(RES, "drawable", "splash_logo.png"))
    print("  android splash_logo.png")

    # --- iOS app icons ---
    appicon_dir = os.path.join(XC, "AppIcon.appiconset")
    os.makedirs(appicon_dir, exist_ok=True)
    for filename, px in IOS_ICONS.items():
        icon = square_icon(glyph, px, IOS_FRACTION)
        icon.save(os.path.join(appicon_dir, filename))
        print("  ios %-32s %d" % (filename, px))

    # --- iOS splash logo ---
    ios_splash = square_icon(glyph, 1024, IOS_FRACTION)
    ios_splash.save(os.path.join(XC, "SplashLogo.imageset", "splash_logo.png"))
    print("  ios splash_logo.png")

    # --- Store master copy ---
    store = os.path.join(PROJECT, "release-assets")
    os.makedirs(store, exist_ok=True)
    master = square_icon(glyph, 1024, IOS_FRACTION)
    master.save(os.path.join(store, "icon-1024-master.png"))
    print("  store icon-1024-master.png")
    print("DONE")


if __name__ == "__main__":
    main()
