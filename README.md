# GitHub Pages — CareBridge Lab synthetic demo
- Site entry: `index.html` (role selection)
- Side-by-side comparison: `compare.html`
- A2/A3: `a2/`, `a3/` from validated integration commit `0bd2692ee73e360c7c5a2f5396468c5d33000cbe`
- Patient B v1.3: `patient/index.html` from Draft PR #2 `80e2455f5ad3fdf88170152f7332f84082684fc6`, standalone preview **not integrated with A3**
- No real patient data, medical institution credentials, external back-end or AI clinical predictions.

## Publishing
The branch alone does not automatically enable Pages. Repository administrator:
Settings → Pages → Build and deployment: Deploy from a branch → `gh-pages` → `/(root)` → Save.
Expected project site address after successful build: `https://pchjesus.github.io/ai-care-transition-platform/`.
Until GitHub reports build success, do not say it is live.

## Isolation
Deployment assets are copied as existing Git blob objects from the reviewed branches; no implementation repository source paths were modified. `gh-pages` contains only required static runtime files and synthetic example PDFs.
