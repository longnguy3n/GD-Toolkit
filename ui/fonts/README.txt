Manrope Variable — local UI font

Project: https://github.com/sharanda/manrope
Recorded upstream source: https://github.com/google/fonts/tree/main/ofl/manrope
Local source: LongVest/web/fonts/Manrope.ttf and its accompanying OFL-Manrope.txt.
LongVest's README documents the Google Fonts source and SIL OFL license.
Bundled file: Manrope.ttf (165,420 bytes, unmodified)
SHA-256: d0639be45d0af36e798172419d7bd173c4bd4f29e2b76cbb69db1d11bf8b0a40
License: SIL Open Font License 1.1; see OFL-Manrope.txt.
License SHA-256: e01b637272e0cbdfb240184dd98ea5cc671556d9894dae2668d92ab2c906787c
Both files have the same SHA-256 as their LongVest originals.

Load fonts.css and use font-family: 'Manrope', 'Segoe UI', sans-serif.
Normal variable weights: 200–800, verified from the font's fvar table.
The font is local: displaying the app does not request Google Fonts or another CDN.

The actual TTF cmap was checked for 196 Latin/Vietnamese uppercase/lowercase
letters and digits. Every tested code point maps to a nonzero glyph. The
calculation symbols minus, multiply, divide, greater/less-or-equal and right arrow
are also present.

A real Electron/Chromium shaping check rendered Vietnamese text in both NFC and
NFD form. CSS.getPlatformFontsForNode reported only this custom Manrope font for
both paragraphs, with identical glyph counts and no fallback font. Standalone
combining marks are not claimed as separate cmap entries: Chromium composes the
Vietnamese sequences into the supported glyphs when shaping text.
