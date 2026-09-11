# -*- coding: utf-8 -*-
"""Mobile (390x844) full-page screenshots of every live page for review.

Run with the playwright-equipped interpreter:
  "D:/desktop/Vibe Coding/每日简报/app/.venv/Scripts/python.exe" scripts/mobile_check.py

Output: scripts/mobile-check/*.png
"""
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

# scroll to the bottom so lazy-loaded images render, then back to top
SCROLL = """async () => {
  await new Promise(r => {
    let y = 0;
    const step = () => {
      y += 700; window.scrollTo(0, y);
      if (y < document.body.scrollHeight) setTimeout(step, 100); else r();
    };
    step();
  });
}"""

with sync_playwright() as p:
    browser = p.chromium.launch()

    # 1) boot splash mid-play (fresh context, no skip flag)
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    pg = ctx.new_page()
    pg.goto(BASE + "/", wait_until="domcontentloaded")
    pg.wait_for_timeout(900)
    pg.screenshot(path=str(OUT / "00-boot-splash.png"))
    print("shot boot-splash")
    ctx.close()

    # 2) every page, boot skipped via sessionStorage preload
    ctx = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
    )
    ctx.add_init_script("try{sessionStorage.setItem('tianyi-boot-v1','1')}catch(e){}")
    pg = ctx.new_page()
    for name, path in PAGES:
        pg.goto(BASE + path, wait_until="networkidle")
        pg.wait_for_timeout(800)
        pg.evaluate(SCROLL)
        pg.wait_for_timeout(300)
        pg.evaluate("window.scrollTo(0, 0)")
        pg.wait_for_timeout(300)
        pg.screenshot(path=str(OUT / f"{name}.png"), full_page=True)
        print("shot", name)
    ctx.close()
    browser.close()

print("done ->", OUT)
