"""
Projectile sprite pipeline — rembg → crop → downscale → write
src/render/sprites/projectiles/{arrow,ballista-bolt,cannonball}.png.

Projectiles render small (~28-40 px on screen). Source resolution
downsample target is 128 px long edge — keeps fletching detail
without burning bundle weight.

Run via: python game-assets/process_projectiles.py
"""
import sys
from pathlib import Path
from PIL import Image
from rembg import remove, new_session

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "game-assets"
OUT_DIR = ROOT / "src" / "render" / "sprites" / "projectiles"
TARGET_LE = 128

# Per-projectile config:
#   src         = source JPEG filename in game-assets/
#   out         = sprite filename (without .png)
#   flip_h      = horizontal-mirror before saving so all projectiles
#                 natural-face right. PixiRenderer.drawTowerBeams rotates
#                 the sprite by atan2(dy, dx) — works only if the source
#                 already points in +x at angle 0. ballista.jpg has the
#                 arrowhead on the LEFT, so without a pre-flip it flies
#                 tail-first. arrow.jpg has the head on the right and
#                 needs no flip; cannonball is spherical, no orientation.
PROJECTILES = [
    {"src": "arrow.jpg",      "out": "arrow",         "flip_h": False},
    {"src": "ballista.jpg",   "out": "ballista-bolt", "flip_h": True},
    {"src": "cannonball.jpg", "out": "cannonball",    "flip_h": False},
]


def main() -> int:
    if not SRC_DIR.exists():
        print(f"ERROR: source dir missing: {SRC_DIR}")
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    session = new_session("u2net")

    for cfg in PROJECTILES:
        src_name = cfg["src"]
        out_name = cfg["out"]
        flip_h = cfg["flip_h"]
        src = SRC_DIR / src_name
        if not src.exists():
            print(f"SKIP (no source): {src}")
            continue

        print(f"-> {src_name}  ->  projectiles/{out_name}.png  (flip_h={flip_h})")
        with Image.open(src) as im:
            im = im.convert("RGBA")
            cut = remove(im, session=session)

        bbox = cut.getbbox()
        if bbox is None:
            print(f"  WARN: rembg produced fully-transparent output for {src_name}")
            continue
        cropped = cut.crop(bbox)

        if flip_h:
            cropped = cropped.transpose(Image.FLIP_LEFT_RIGHT)

        w, h = cropped.size
        scale = TARGET_LE / max(w, h)
        if scale < 1.0:
            cropped = cropped.resize(
                (int(round(w * scale)), int(round(h * scale))),
                Image.LANCZOS,
            )

        dst = OUT_DIR / f"{out_name}.png"
        cropped.save(dst, "PNG", optimize=True)
        print(f"  saved {dst.relative_to(ROOT)}  {cropped.size}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
