"""
Effects sprite pipeline — produces faction-recolored death-puff PNGs
from unit-death.jpg.

The source asset is a red blood-cloud + pool on a stone ground patch.
After rembg, the opaque content is the blood-themed cloud/pool (the
stone-ground halo gets some alpha residue but reads as a subtle
ground-shadow, which is desirable). Each opaque red pixel gets an
HSV hue rotation per faction so the puff matches the destroyed
group's banner color.

  azure   : red → blue   (+200° hue shift)
  crimson : red → red    (no shift — crimson IS red)
  verdant : red → green  (+110° hue shift)
  amethyst: red → purple (+250° hue shift)
  shadow  : red → near-black (desaturate + darken instead of hue)

Output: src/render/sprites/effects/death-puff-{faction}.png

Run via: python game-assets/process_effects.py
"""
import sys
import colorsys
from pathlib import Path
from PIL import Image
import numpy as np
from rembg import remove, new_session

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "game-assets"
OUT_DIR = ROOT / "src" / "render" / "sprites" / "effects"
TARGET_LE = 192  # death-puff renders at ~80-120 px on screen; 192 px
                 # source gives headroom for the cloud's wispy edges
                 # without bundle bloat.
SOURCE = "unit-death.jpg"

# Per-faction recolor: either hue rotation (in degrees, 0..360) OR
# a "shadow" sentinel that desaturates + darkens to near-black.
FACTIONS = {
    "azure":    {"hue_shift": 200},
    "crimson":  {"hue_shift": 0},      # red stays red
    "verdant":  {"hue_shift": 110},
    "amethyst": {"hue_shift": 250},
    "shadow":   {"shadow": True},
}

# A pixel is considered "red" (in-scope for recolor) when its hue is
# in the red wedge AND it's saturated/bright enough to be the cloud,
# not the dark stone ground.
RED_HUE_BAND = ((340.0, 360.0), (0.0, 35.0))  # two arcs around 0°
MIN_SAT = 0.20
MIN_VAL = 0.18


def in_red_band(h_deg: float, s: float, v: float) -> bool:
    if s < MIN_SAT or v < MIN_VAL:
        return False
    return (RED_HUE_BAND[0][0] <= h_deg <= RED_HUE_BAND[0][1]) or \
           (RED_HUE_BAND[1][0] <= h_deg <= RED_HUE_BAND[1][1])


def recolor_array(rgba: np.ndarray, faction_cfg: dict) -> np.ndarray:
    out = rgba.copy()
    h, w, _ = rgba.shape
    rgb = rgba[..., :3].astype(np.float32) / 255.0
    a = rgba[..., 3]

    # Vectorized RGB→HSV via Pillow's per-pixel colorsys equivalent.
    # numpy doesn't ship one, so unroll the loop. For a 192×192 sprite
    # that's ~37k pixels — fast enough offline.
    for y in range(h):
        for x in range(w):
            if a[y, x] == 0:
                continue
            r, g, b = rgb[y, x]
            hsv_h, hsv_s, hsv_v = colorsys.rgb_to_hsv(r, g, b)
            hsv_h_deg = hsv_h * 360.0
            if not in_red_band(hsv_h_deg, hsv_s, hsv_v):
                continue

            if faction_cfg.get("shadow"):
                # Desaturate + darken for House Shadow.
                new_r, new_g, new_b = colorsys.hsv_to_rgb(0, 0, hsv_v * 0.35)
            else:
                shift = faction_cfg["hue_shift"] / 360.0
                new_h = (hsv_h + shift) % 1.0
                new_r, new_g, new_b = colorsys.hsv_to_rgb(new_h, hsv_s, hsv_v)

            out[y, x, 0] = int(round(new_r * 255))
            out[y, x, 1] = int(round(new_g * 255))
            out[y, x, 2] = int(round(new_b * 255))

    return out


def main() -> int:
    src = SRC_DIR / SOURCE
    if not src.exists():
        print(f"ERROR: source missing: {src}")
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    session = new_session("u2net")

    print(f"-> rembg {SOURCE}")
    with Image.open(src) as im:
        im = im.convert("RGBA")
        cut = remove(im, session=session)

    bbox = cut.getbbox()
    if bbox is None:
        print(f"ERROR: rembg produced fully-transparent output")
        return 1
    cropped = cut.crop(bbox)

    w, h = cropped.size
    scale = TARGET_LE / max(w, h)
    if scale < 1.0:
        cropped = cropped.resize(
            (int(round(w * scale)), int(round(h * scale))),
            Image.LANCZOS,
        )

    base = np.array(cropped, dtype=np.uint8)

    for faction, cfg in FACTIONS.items():
        print(f"-> recolor {faction}")
        out = recolor_array(base, cfg)
        dst = OUT_DIR / f"death-puff-{faction}.png"
        Image.fromarray(out, "RGBA").save(dst, "PNG", optimize=True)
        print(f"  saved {dst.relative_to(ROOT)}  {cropped.size}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
