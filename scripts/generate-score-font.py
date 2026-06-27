#!/usr/bin/env python3
"""Generate the condensed/compressed score font used for Apple Sports-style
match score digits.

Instances the macOS system variable font (SFNS.ttf) at a narrow `wdth` axis
value ("Compressed" = 47 in Apple's width scale), subsets it to just the
glyphs we render (digits + score symbols), and writes an optimized WOFF2.

Apple's SF Pro width scale (from the fvar `wdth` axis named instances):
  Ultra Compressed = 30, Extra Compressed = 38, Compressed = 47,
  Condensed = 60, Semi Condensed = 80, Standard = 100.
"""
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.subset import Subsetter, Options

SRC = "/System/Library/Fonts/SFNS.ttf"
OUT = "src/app/fonts/SFScore-Compressed.woff2"

# Apple Sports scoreboard digits: Compressed width, bold-ish, display optical size.
AXES = {"wdth": 47.0, "wght": 700.0, "opsz": 96.0, "GRAD": 400.0}
KEEP = "0123456789:-+ "


def main() -> None:
    font = TTFont(SRC)
    instantiateVariableFont(font, AXES, inplace=True)

    options = Options()
    options.flavor = "woff2"
    options.desubroutinize = True
    options.name_IDs = []
    options.recalc_bounds = True
    options.glyph_names = False
    options.notdef_outline = True
    options.layout_features = ["kern", "tnum", "calt"]

    subsetter = Subsetter(options=options)
    subsetter.populate(text=KEEP)
    subsetter.subset(font)

    font.save(OUT)

    upm = font["head"].unitsPerEm
    glyf = font["glyf"]
    cmap = font.getBestCmap()
    # Measure the rendered height of a representative digit ("8").
    gname = cmap[ord("8")]
    g = glyf[gname]
    g.recalcBounds(glyf)
    digit_h = g.yMax - g.yMin
    print(f"saved {OUT}")
    print(f"unitsPerEm={upm}")
    print(f"digit '8' yMin={g.yMin} yMax={g.yMax} height={digit_h}")
    print(f"DIGIT_HEIGHT_RATIO = {digit_h / upm:.4f}")
    try:
        cap = font["OS/2"].sCapHeight
        print(f"capHeight={cap} ratio={cap / upm:.4f}")
    except Exception:
        pass


if __name__ == "__main__":
    main()
