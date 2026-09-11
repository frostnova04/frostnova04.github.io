# -*- coding: utf-8 -*-
"""Objective mobile audit: horizontal overflow, tiny tap targets, tiny fonts.

Also grabs a mid-boot screenshot (t~1600ms) to visually verify the splash.
Run: "D:/desktop/Vibe Coding/每日简报/app/.venv/Scripts/python.exe" scripts/mobile_audit.py
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "https://frostnova04.github.io"
OUT = Path(__file__).parent / "mobile-check"
OUT.mkdir(exist_ok=True)

PAGES = [
    ("home", "/"),
    ("education", "/education/"),
    ("work", "/work/"),
    ("awards", "/awards/"),
    ("cv", "/cv/"),
    ("message", "/message/"),
    ("weiqi", "/weiqi/"),
    ("weiqi-kifu", "/weiqi/20221108-66f5/"),
    ("404", "/this-page-does-not-exist/"),
]

AUDIT = """() => {
  const out = {issues: []};
  const de = document.documentElement;
  out.vw = window.innerWidth;
  out.scrollW = de.scrollWidth;
  if (de.scrollWidth > window.innerWidth + 1) {
    out.issues.push('H-OVERFLOW +' + (de.scrollWidth - window.innerWidth) + 'px');
    const culprits = [];
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth + 8 && r.width > 40 && r.height > 0) {
        culprits.push(el.tagName + '[' + String(el.className).slice(0, 50) + '] right=' + Math.round(r.right));
      }
    });
    out.culprits = culprits.slice(0, 8);
  }
  const tiny = [];
  document.querySelectorAll('a, button').forEach(el => {
    const r = el.getBoundingClientRect();
    const label = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 18);
    if (r.height > 0 && r.height < 30 && label) tiny.push(label + ' h=' + Math.round(r.height));
  });
  if (tiny.length) out.tinyTargets = tiny.slice(0, 12);
  const tinyFonts = new Set();
  document.querySelectorAll('h1,h2,h3,h4,p,li,a,span,td,th').forEach(el => {
    if (!el.textContent.trim() || el.children.length > 0) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) tinyFonts.add(el.textContent.trim().slice(0, 22) + ' [' + fs.toFixed(1) + 'px]');
  });
  if (tinyFonts.size) out.tinyFonts = [...tinyFonts].slice(0, 12);
  return out;
}"""

with sync_playwright() as p:
    b = p.chromium.launch()

    # boot splash mid-play
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    pg = ctx.new_page()
    pg.goto(BASE + "/", wait_until="domcontentloaded")
    pg.wait_for_timeout(1650)
    pg.screenshot(path=str(OUT / "00-boot-splash-mid.png"))
    print("shot boot-splash-mid")
    ctx.close()

    ctx = b.new_context(
        viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True
    )
    ctx.add_init_script("try{sessionStorage.setItem('tianyi-boot-v1','1')}catch(e){}")
    pg = ctx.new_page()
    for name, path in PAGES:
        pg.goto(BASE + path, wait_until="networkidle")
        pg.wait_for_timeout(900)
        res = pg.evaluate(AUDIT)
        flag = "OK " if not res.get("issues") and not res.get("culprits") else "!! "
        print(flag + name, json.dumps(res, ensure_ascii=False))
    ctx.close()
    b.close()
print("done")
