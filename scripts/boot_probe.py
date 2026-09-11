# -*- coding: utf-8 -*-
"""Probe when hydration completes and when the boot splash mounts/plays."""
from playwright.sync_api import sync_playwright

BASE = "https://frostnova04.github.io/"

JS = """() => {
  const splash = document.querySelector('div[class*="z-[100]"]');
  const text = splash ? splash.innerText : document.body.innerText;
  return {
    splash: !!splash,
    lines: text ? text.split('\\n').filter(s => s.trim()).length : 0,
    sample: (text || '').replace(/\\s+/g, ' ').slice(0, 70),
  };
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    pg = ctx.new_page()
    pg.goto(BASE, wait_until="domcontentloaded")
    marks = [500, 1000, 1500, 2000, 3000, 4500, 6000]
    prev = 0
    for m in marks:
        pg.wait_for_timeout(m - prev)
        prev = m
        print(f"t={m}ms", pg.evaluate(JS))
    ctx.close()
    b.close()
