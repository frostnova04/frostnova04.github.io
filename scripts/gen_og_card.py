# -*- coding: utf-8 -*-
"""Generate the 1200x630 og:image share card (dark geek style, thumbnail-friendly).

WeChat/QQ thumbnails are ~60px; a near-black canvas reads as a black square at
that size. This version brightens the background a stop, adds teal glows and a
teal frame, and enlarges the avatar so any crop shows bright content.

Run:  py scripts/gen_og_card.py
Output: public/og-image.png (+ scripts/thumb_preview.png for small-size check)
"""
from PIL import Image, ImageDraw, ImageFont, ImageStat

W, H = 1200, 630
BG = (16, 25, 39)        # #101927 — navy, brighter than near-black
CARD = (13, 20, 32)      # #0d1420
TEAL = (100, 255, 218)   # #64ffda
WHITE = (214, 226, 240)  # #d6e2f0
GRAY = (124, 147, 171)   # #7c93ab
LGRAY = (158, 182, 210)  # brighter gray for small text
BORDER = (27, 39, 54)    # #1b2736

F = r"C:\Windows\Fonts"
mono = lambda s: ImageFont.truetype(F + r"\consola.ttf", s)
yh = lambda s: ImageFont.truetype(F + r"\msyh.ttc", s)
yhbd = lambda s: ImageFont.truetype(F + r"\msyhbd.ttc", s)

img = Image.new("RGBA", (W, H), BG)

def glow(cx, cy, r, color, max_alpha):
    """Soft radial glow via concentric ellipses on a separate layer."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(layer)
    steps = 24
    for i in range(steps):
        rr = r * (1 - i / steps)
        a = int(max_alpha * (i / steps) ** 1.6)
        gd.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=color + (a,))
    return layer

img = Image.alpha_composite(img, glow(400, 315, 360, TEAL, 26))   # behind terminal
img = Image.alpha_composite(img, glow(865, 268, 310, TEAL, 36))   # behind avatar

# ---- subtle teal dot grid ----
grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(grid)
for gy in range(30, H, 42):
    for gx in range(30, W, 42):
        gd.ellipse([gx - 2, gy - 2, gx + 2, gy + 2], fill=TEAL + (22,))
img = Image.alpha_composite(img, grid)

d = ImageDraw.Draw(img)

# ---- outer teal frame (reads as a designed card at thumbnail size) ----
d.rounded_rectangle([10, 10, W - 10, H - 10], radius=22, outline=TEAL + (110,), width=3)

# ---- left: terminal window ----
x0, y0, x1, y1 = 64, 110, 660, 520
d.rounded_rectangle([x0, y0, x1, y1], radius=18, fill=CARD + (225,), outline=TEAL + (90,), width=2)
# title bar dots
for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
    cx = x0 + 34 + i * 30
    d.ellipse([cx - 7, y0 + 24 - 7, cx + 7, y0 + 24 + 7], fill=c)
d.line([x0 + 2, y0 + 48, x1 - 2, y0 + 48], fill=BORDER, width=2)

def term(y, prompt, text, text_color, size=27, x=x0 + 30):
    f = mono(size)
    if prompt:
        d.text((x, y), prompt, font=f, fill=TEAL)
        x += d.textlength(prompt + " ", font=f)
    d.text((x, y), text, font=f, fill=text_color)

term(182, "$", "whoami", WHITE)
term(226, "", "tianyi-dong", WHITE, size=30)
term(296, "$", "cat role.txt", WHITE)
term(340, "", "Juris Master @ Tsinghua", TEAL, size=26)
term(378, "", "Int'l Arbitration & Disputes", LGRAY, size=26)
term(444, "$", "ls highlights/", WHITE)
term(488, "", "weiqi-5dan  cfa-l1  ielts-8.0", LGRAY, size=24)

# ---- right: avatar with teal ring (large — carries the thumbnail) ----
av = Image.open("public/bio.jpg").convert("RGBA")
s = 310
cx, cy = 865, 268
side = min(av.size)
left = (av.width - side) // 2
top = max(0, int((av.height - side) * 0.28))  # bias toward face
av = av.crop((left, top, left + side, top + side)).resize((s, s), Image.LANCZOS)
mask = Image.new("L", (s, s), 0)
ImageDraw.Draw(mask).ellipse([0, 0, s, s], fill=255)
img.paste(av, (cx - s // 2, cy - s // 2), mask)
d.ellipse([cx - s // 2 - 6, cy - s // 2 - 6, cx + s // 2 + 6, cy + s // 2 + 6], outline=TEAL, width=6)

# ---- right: name block ----
def center(y, text, font, color):
    w = d.textlength(text, font=font)
    d.text((cx - w / 2, y), text, font=font, fill=color)

center(448, "Tianyi Dong", yhbd(52), WHITE)
center(514, "董天一 · 法律硕士", yh(30), TEAL)

# ---- footer url ----
d.text((64, 556), "https://frostnova04.github.io", font=mono(24), fill=LGRAY)

img.convert("RGB").save("public/og-image.png", "PNG")
print("saved public/og-image.png", img.size)

# ---- thumbnail legibility check (WeChat-size) ----
thumb = img.convert("RGB").resize((360, 189), Image.LANCZOS)
thumb.save("scripts/thumb_preview.png")
sq = img.convert("RGB").resize((64, 64), Image.LANCZOS)
lum = sum(ImageStat.Stat(sq).mean) / 3
print(f"64x64 mean luminance: {lum:.1f} / 255  (was ~20 before, target >= 35)")
