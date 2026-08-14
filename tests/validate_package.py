#!/usr/bin/env python3
"""Static release checks for the standalone V47A package."""
from __future__ import annotations
import hashlib,json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PIN="48ff1e50424da0a0546ade9039f00368073f56f2"
PAGES=("viewport.html","render.html","timeline.html")

def require(condition:bool,message:str)->None:
    if not condition: raise AssertionError(message)

def main()->int:
    package=json.loads((ROOT/"package.json").read_text(encoding="utf-8"))
    vercel=json.loads((ROOT/"vercel.json").read_text(encoding="utf-8"))
    require(package["version"]=="47.1.0","package version is not V47A 47.1.0")
    require(package.get("type")=="module","package must remain ESM")
    require(isinstance(vercel.get("headers"),list),"Vercel headers are missing")
    index=(ROOT/"index.html").read_text(encoding="utf-8")
    require("viewport.html" in index,"root must route to Viewport")
    require("V47A" in index,"root release label is stale")
    for name in PAGES:
        html=(ROOT/name).read_text(encoding="utf-8")
        require(PIN in html,f"{name}: frozen V45 commit pin missing")
        require('./css/v46.css' in html,f"{name}: V46 CSS missing")
        require('./css/v47.css' in html,f"{name}: V47A CSS missing")
        require(html.index('./css/v46.css')<html.index('./css/v47.css'),f"{name}: stylesheet order is incorrect")
        require('./src/v47/bootstrap.js' in html,f"{name}: V47A bootstrap missing")
        require('data-memento-build="v47a"' in html,f"{name}: build marker missing")
        require('v47-preboot' in html,f"{name}: preboot guard missing")
    delta=(ROOT/"src/v47/delta-engine.js").read_text(encoding="utf-8")
    foundation=(ROOT/"src/v47/foundation-controller.js").read_text(encoding="utf-8")
    for marker in ("generateCandidate","compareShots","candidateProfile","enforceGenerationRules"):
        require(marker in delta,f"Delta engine marker missing: {marker}")
    for marker in ("V47_PROCEDURAL_CYCLORAMA","v47.generation.byShot","GENERATE CANDIDATE","v47-timeline-instrument","grey-limbo"):
        require(marker in foundation,f"Foundation marker missing: {marker}")
    expected={
        "css/v46.css","css/v47.css","src/v46/polish-controller.js","src/v47/bootstrap.js","src/v47/local-bootstrap.js",
        "src/v47/delta-engine.js","src/v47/foundation-controller.js","docs/V47A_IMPLEMENTATION.md","docs/V47A_VALIDATION_REPORT.md",
        "docs/V36C_V47A_DONOR_MAP.md","tests/unit/delta-engine.mjs"
    }
    existing={str(path.relative_to(ROOT)) for path in ROOT.rglob("*") if path.is_file()}
    require(expected<=existing,f"release files missing: {sorted(expected-existing)}")
    readme=(ROOT/"README.md").read_text(encoding="utf-8")
    require("Current / Previous / Candidate" in readme,"README does not describe the candidate contract")
    require("6 / 6" in readme,"README validation result missing")
    manifest=ROOT/"MANIFEST.sha256"
    if manifest.exists():
        for line in manifest.read_text(encoding="utf-8").splitlines():
            if not line.strip(): continue
            digest,relative=line.split("  ",1);path=ROOT/relative
            require(path.exists(),f"manifest path missing: {relative}")
            require(hashlib.sha256(path.read_bytes()).hexdigest()==digest,f"manifest mismatch: {relative}")
    print("V47A static package validation: PASS")
    return 0

if __name__=="__main__": raise SystemExit(main())
