"""
UI sprite pipeline — rembg → crop → downscale → write
src/render/sprites/ui/{button-wood,parchment-banner}.png.

Both sources are painterly UI elements with dark-slate generation
backgrounds. rembg knocks the slate cleanly; the result is dropped
into the UI sprites folder for future CSS background-image use
(NodeInfoPanel / ObjectiveBanner / button restyle — see SPEC v2.9.2
notes for what's wired up vs. staged).

Run via: python game-assets/process_ui.py
"""
import sys
from pathlib import Path
from PIL import Image
from rembg import remove, new_session

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "game-assets"
OUT_DIR = ROOT / "src" / "render" / "sprites" / "ui"
TARGET_LE = 512  # UI sprites scale to whatever the host element is;
                 # 512 px gives crisp detail on retina at typical
                 # button/banner sizes (~200-400 px wide).

UI_SOURCES = [
    ("menu-button.jpg",  "button-wood"),
    ("scroll-banner.jpg","parchment-banner"),
]


def main() -> int:
    if not SRC_DIR.exists():
        print(f"ERROR: source dir missing: {SRC_DIR}")
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    session = new_session("u2net")

    for src_name, out_name in UI_SOURCES:
        src = SRC_DIR / src_name
        if not src.exists():
            print(f"SKIP (no source): {src}")
            continue

        print(f"-> {src_name}  ->  ui/{out_name}.png")
        with Image.open(src) as im:
            im = im.convert("RGBA")
            cut = remove(im, session=session)

        bbox = cut.getbbox()
        if bbox is None:
            print(f"  WARN: rembg produced fully-transparent output for {src_name}")
            continue
        cropped = cut.crop(bbox)

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
