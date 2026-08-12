#!/usr/bin/env python3
"""Run the V46 DOM/controller acceptance fixture without network access."""

from __future__ import annotations

import asyncio
import json
import re
import shutil
import sys
from pathlib import Path

try:
    from playwright.async_api import async_playwright
except ImportError as exc:  # pragma: no cover - environment guidance
    raise SystemExit("Python Playwright is required: pip install playwright") from exc

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests" / "browser-mock" / "index.html"
CSS = ROOT / "css" / "v46.css"
CONTROLLER = ROOT / "src" / "v46" / "polish-controller.js"


def build_fixture() -> str:
    fixture = FIXTURE.read_text(encoding="utf-8")
    css = CSS.read_text(encoding="utf-8")
    controller = CONTROLLER.read_text(encoding="utf-8").replace(
        "export function installV46Polish", "function installV46Polish"
    )
    controller = (
        "(function(){\n"
        + controller
        + "\nglobalThis.installV46Polish=installV46Polish;\n})();"
    )

    match = re.search(r'<script type="module">(.*)</script>', fixture, re.S)
    if not match:
        raise RuntimeError("Browser fixture module was not found")
    mock = re.sub(
        r"^\s*import \{installV46Polish\} from .*?;\s*", "", match.group(1)
    )

    html = re.sub(r"<link[^>]+>", "", fixture)
    html = re.sub(r'<script type="module">.*</script>', "", html, flags=re.S)
    html = html.replace("</head>", f"<style>{css}</style></head>")
    return html.replace(
        "</body>", f"<script>{controller}</script><script>{mock}</script></body>"
    )


STORAGE_POLYFILL = """
(() => {
  const make = () => {
    const data = new Map();
    return {
      getItem: key => data.has(String(key)) ? data.get(String(key)) : null,
      setItem: (key, value) => data.set(String(key), String(value)),
      removeItem: key => data.delete(String(key)),
      clear: () => data.clear(),
      key: index => [...data.keys()][index] ?? null,
      get length(){ return data.size; }
    };
  };
  Object.defineProperty(window, "localStorage", {value: make(), configurable: true});
  Object.defineProperty(window, "sessionStorage", {value: make(), configurable: true});
})();
"""


async def run() -> int:
    base = build_fixture()
    chromium = shutil.which("chromium") or shutil.which("chromium-browser") or shutil.which("google-chrome")
    cases: list[dict[str, object]] = []
    errors: list[tuple[object, ...]] = []

    async with async_playwright() as playwright:
        launch_kwargs: dict[str, object] = {"headless": True, "args": ["--no-sandbox"]}
        if chromium:
            launch_kwargs["executable_path"] = chromium
        browser = await playwright.chromium.launch(**launch_kwargs)

        for workspace in ("viewport", "render", "timeline"):
            for custom in (0, 1):
                page = await browser.new_page()
                page.on(
                    "console",
                    lambda message, w=workspace, c=custom: errors.append(
                        (w, c, "console", message.type, message.text)
                    )
                    if message.type == "error"
                    else None,
                )
                page.on(
                    "pageerror",
                    lambda error, w=workspace, c=custom: errors.append(
                        (w, c, "pageerror", str(error))
                    ),
                )
                await page.evaluate(STORAGE_POLYFILL)
                html = base.replace(
                    'const params=new URLSearchParams(location.search),workspace=params.get("workspace")||"render",custom=params.get("custom")==="1";',
                    f'const workspace="{workspace}",custom={str(bool(custom)).lower()};',
                )
                await page.set_content(html, wait_until="load")
                await page.wait_for_function(
                    "document.body.dataset.testStatus", timeout=10_000
                )
                status = await page.get_attribute("body", "data-test-status")
                results = json.loads(await page.locator("#results").inner_text())
                cases.append(
                    {
                        "workspace": workspace,
                        "customHero": bool(custom),
                        "status": status,
                        "results": results,
                    }
                )
                await page.close()

        await browser.close()

    print(json.dumps({"cases": cases, "errors": errors}, indent=2))
    if errors or any(case["status"] != "PASS" for case in cases):
        return 1
    print("\nV46 browser mock: 6/6 PASS")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(asyncio.run(run()))
    except KeyboardInterrupt:
        raise SystemExit(130)
