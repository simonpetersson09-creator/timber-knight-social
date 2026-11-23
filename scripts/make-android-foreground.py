#!/usr/bin/env python3
"""Build full-bleed Android adaptive foregrounds without visible layer seams.

The master artwork already keeps its subject and lettering inside the circular
mask-safe area, so the foreground can cover the complete 108dp layer.
"""
import sys
from pathlib import Path
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else "resources/icon.png"
DENSITIES = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
master = Image.open(SRC).convert("RGB")
for dpi, layer in DENSITIES.items():
    out = Path(f"resources/android/res/mipmap-{dpi}/ic_launcher_foreground.png")
    out.parent.mkdir(parents=True, exist_ok=True)
    master.resize((layer, layer), Image.Resampling.LANCZOS).save(out)
    print(f"[icons] {out}: {layer}px full-bleed foreground")
