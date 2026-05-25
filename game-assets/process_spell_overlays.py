"""
Spell-overlay pipeline — produces the transparent ring PNGs the renderer
overlays on a targeted node for the starve + sabotage spells.

Each source (game-assets/<spell>-effect.png) is a glowing wreath/ring on
an opaque gray vignette background. rembg (u2net) cleanly removes the gray
background AND the hollow center, leaving just the ring with alpha. The
result is cropped to its bbox and downscaled to TARGET_LE.

  starve   : thorn-and-skull wreath (purple/green)
  sabotage : gold-coin wreath (yellow/green sparks)

Output: src/render/sprites/spells/{starve,sabotage}.png
(freeze.png already ships from an earlier slice and is left untouched.)

Run via: python game-assets/process_spell_overlays.py
"""
import sys
from pathlib import Path
from PIL import Image
from rembg import remove, new_session

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "game-assets"
OUT_DIR = ROOT / "src" / "render" / "sprites" / "spells"
TARGET_LE = 256  # overlay renders at ~120 px; 256 px source keeps the
                 # ring's wispy edges crisp without bundle bloat.

SOURCES = {
    "starve": "starve-effect.png",
    "sabotage": "sabotage-effect.png",
}


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    session = new_session("u2net")

    for spell, fname in SOURCES.items():
        src = SRC_DIR / fname
        if not src.exists():
            print(f"ERROR: source missing: {src}")
            return 1
        print(f"-> rembg {fname}")
        with Image.open(src) as im:
            cut = remove(im.convert("RGBA"), session=session)

        bbox = cut.getbbox()
        if bbox is None:
            print(f"ERROR: rembg produced fully-transparent output for {fname}")
            return 1
        cropped = cut.crop(bbox)

        w, h = cropped.size
        scale = TARGET_LE / max(w, h)
        if scale < 1.0:
            cropped = cropped.resize(
                (int(round(w * scale)), int(round(h * scale))),
                Image.LANCZOS,
            )

        dst = OUT_DIR / f"{spell}.png"
        cropped.save(dst, "PNG", optimize=True)
        print(f"  saved {dst.relative_to(ROOT)}  {cropped.size}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
