# GitHub Pages — CareBridge Lab synthetic demo
- Site entry: `index.html` (role selection)
- Side-by-side comparison: `compare.html`
- A2/A3: `a2/`, `a3/` from validated integration commit `0bd2692ee73e360c7c5a2f5396468c5d33000cbe`
- Patient B v1.3: `patient/index.html` from Draft PR #2 `80e2455f5ad3fdf88170152f7332f84082684fc6`, standalone preview **not integrated with A3**
- No real patient data, medical institution credentials, external back-end or AI clinical predictions.

## Publishing
Repository metadata now reports `has_pages: true` after creating the `gh-pages` branch, but successful public HTTP delivery has **not** been independently confirmed. Expected address: `https://pchjesus.github.io/ai-care-transition-platform/`. If it does not load, check **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, **`gh-pages`**, **`/(root)`**, then Save and inspect deployment status. Do not claim the site is live until an external HTTP check succeeds.

## Isolation
Deployment assets are copied as existing Git blob objects from the reviewed branches; no implementation repository source paths were modified. `gh-pages` contains only required static runtime files and synthetic example PDFs.
