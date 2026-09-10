# -*- coding: utf-8 -*-
"""Generate the 1200x630 og:image share card (dark geek style).

Run:  py scripts/gen_og_card.py
Output: public/og-image.png
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = (10, 15, 22)        # #0a0f16
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

# ---- subtle teal dot grid ----
grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(grid)
for gy in range(30, H, 42):
    for gx in range(30, W, 42):
        gd.ellipse([gx - 2, gy - 2, gx + 2, gy + 2], fill=TEAL + (16,))
img = Image.alpha_composite(img, grid)

d = ImageDraw.Draw(img)

# ---- left: terminal window ----
x0, y0, x1, y1 = 72, 116, 748, 512
d.rounded_rectangle([x0, y0, x1, y1], radius=18, fill=CARD, outline=TEAL + (70,), width=2)
# title bar dots
for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
    cx = x0 + 34 + i * 30
    d.ellipse([cx - 7, y0 + 24 - 7, cx + 7, y0 + 24 + 7], fill=c)
d.line([x0 + 2, y0 + 48, x1 - 2, y0 + 48], fill=BORDER, width=2)

def term(y, prompt, text, text_color, size=27, x=x0 + 32):
    f = mono(size)
    if prompt:
        d.text((x, y), prompt, font=f, fill=TEAL)
        x += d.textlength(prompt + " ", font=f)
    d.text((x, y), text, font=f, fill=text_color)

term(188, "$", "whoami", WHITE)
term(232, "", "tianyi-dong", WHITE, size=30)
term(300, "$", "cat role.txt", WHITE)
term(344, "", "Juris Master @ Tsinghua", TEAL, size=26)
term(382, "", "International Arbitration & Disputes", GRAY, size=26)
term(446, "$", "ls highlights/", WHITE)
term(490, "", "weiqi-5dan  cfa-l1  ielts-8.0", LGRAY, size=24)

# ---- right: avatar with teal ring ----
av = Image.open("public/bio.jpg").convert("RGBA")
s = 268
cx, cy = 995, 285
side = min(av.size)
left = (av.width - side) // 2
top = max(0, int((av.height - side) * 0.28))  # bias toward face
av = av.crop((left, top, left + side, top + side)).resize((s, s), Image.LANCZOS)
mask = Image.new("L", (s, s), 0)
ImageDraw.Draw(mask).ellipse([0, 0, s, s], fill=255)
img.paste(av, (cx - s // 2, cy - s // 2), mask)
d.ellipse([cx - s // 2 - 5, cy - s // 2 - 5, cx + s // 2 + 5, cy + s // 2 + 5], outline=TEAL, width=5)

# ---- right: name block ----
def center(y, text, font, color):
    w = d.textlength(text, font=font)
    d.text(((2 * cx - w) / 2, y), text, font=font, fill=color)

center(438, "Tianyi Dong", yhbd(46), WHITE)
center(500, "董天一 · 法律硕士", yh(28), TEAL)

# ---- footer url ----
d.text((72, 552), "https://frostnova04.github.io", font=mono(24), fill=LGRAY)

img.convert("RGB").save("public/og-image.png", "PNG")
print("saved public/og-image.png", img.size)
