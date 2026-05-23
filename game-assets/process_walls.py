"""
Wall sprite pipeline — color-threshold slate knockout (NOT rembg).

v2.9.2 (initial): tried rembg's u2net model. It interpreted the
painterly water surface as "background" (water looks matte-like to
u2net's training distribution) and ate the river/canyon content,
leaving just stone-edge fragments. Unusable for these full-frame
environmental features.

v2.9.2 (recovery): replace ML segmentation with a corner-sampled
color-distance threshold. The Bing template per ASSET_PLAN §3.4
generates these on a uniform dark-slate background, so sampling
the top-left corner and knocking pixels within COLOR_DIST get the
painterly content out clean without touching the water/stone interior.

Run via: python game-assets/process_walls.py
"""
import sys
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "game-assets"
OUT_DIR = ROOT / "src" / "render" / "sprites" / "walls"
TARGET_LE = 384

# Threshold band. The slate is ~ #1f2530 in the dropped sources;
# painterly content is well above this in either RGB distance.
COLOR_DIST_HARD = 28   # pixels within this distance to corner → fully transparent
COLOR_DIST_SOFT = 56   # gradient feather to soft alpha at the boundary

WALLS = [
    ("grass-wall.jpg",  "grass",  None),
    ("grass-wall1.jpg", "grass",  "-1"),
    ("desert-wall.jpg", "desert", None),
    ("desert-wall1.jpg","desert", "-1"),
]


def slate_knockout(im: Image.Image) -> Image.Image:
    """Sample the four corners' average as the slate target, then
    alpha-knock any pixel within COLOR_DIST_HARD; feather the
    boundary between COLOR_DIST_HARD and COLOR_DIST_SOFT."""
    rgba = im.convert("RGBA")
    arr = np.array(rgba, dtype=np.float32)
    h, w, _ = arr.shape

    # Corner samples (8 px each) averaged together. Robust to a
    # single noisy pixel; the corners are guaranteed to be slate.
    pad = 8
    samples = [
        arr[0:pad, 0:pad, :3],
        arr[0:pad, w-pad:w, :3],
        arr[h-pad:h, 0:pad, :3],
        arr[h-pad:h, w-pad:w, :3],
    ]
    target = np.mean(
        np.concatenate([s.reshape(-1, 3) for s in samples], axis=0),
        axis=0,
    )

    # Per-pixel distance to slate.
    dist = np.sqrt(np.sum((arr[..., :3] - target) ** 2, axis=2))

    # Alpha map: 0 inside HARD, 1 outside SOFT, linear in between.
    alpha = np.clip((dist - COLOR_DIST_HARD) / (COLOR_DIST_SOFT - COLOR_DIST_HARD), 0, 1)
    arr[..., 3] = arr[..., 3] * alpha

    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def main() -> int:
    if not SRC_DIR.exists():
        print(f"ERROR: source dir missing: {SRC_DIR}")
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for src_name, biome, suffix in WALLS:
        src = SRC_DIR / src_name
        if not src.exists():
            print(f"SKIP (no source): {src}")
            continue

        print(f"-> {src_name}  ->  walls/wall-{biome}{suffix or ''}.png")
        with Image.open(src) as im:
            cut = slate_knockout(im)

        bbox = cut.getbbox()
        if bbox is None:
            print(f"  WARN: knockout produced fully-transparent output for {src_name}")
            continue
        cropped = cut.crop(bbox)

        w, h = cropped.size
        scale = TARGET_LE / max(w, h)
        if scale < 1.0:
            cropped = cropped.resize(
                (int(round(w * scale)), int(round(h * scale))),
                Image.LANCZOS,
            )

        dst = OUT_DIR / f"wall-{biome}{suffix or ''}.png"
        cropped.save(dst, "PNG", optimize=True)
        print(f"  saved {dst.relative_to(ROOT)}  {cropped.size}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
