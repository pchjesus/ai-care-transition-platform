# CareBridge Lab — GitHub Pages deployment manifest (2026-10-21)
- Branch: `gh-pages`. Public expected address: `https://pchjesus.github.io/ai-care-transition-platform/`.
- Hospital unified source: `codex/hospital-unified-v1` **`de45e29c37da836286a64f7668129f4298f7bb91`**. Runtime preserved under `prototypes/integrated-v10/` for relative module and original A2 comparison paths.
- Former `a2/index.html` and `a3/index.html` URLs redirect into unified hospital app. `prototypes/integrated-v10/index.html` redirects to site role portal.
- Preserved standalone A2 needed for existing comparison iframe: `prototypes/hospital-a2/index.html`.
- Patient v1.3: `patient/index.html` **unchanged blob** from Draft PR #2 head `80e2455f5ad3fdf88170152f7332f84082684fc6`. This is independent synthetic demo, **NOT receiving A3 approvals**.
- Portal side-by-side view: `compare.html`; clinician iframe is unified A2/A3, patient iframe standalone.
- Tests already executed by Codex on source branch: Node **50/50**, unified HTTP **14/14**, Phase 1 HTTP **17/17**. **These do not constitute a direct GitHub Pages live HTTP E2E test.**
- `gh-pages` contains only static demo/runtime files and synthetic example PDFs; no real patient data, tokens or clinical deployment.
- `main`, existing Draft PR #1/#2 and original prototype folders are unchanged.

## Deployment check
The GitHub `has_pages` field is not equivalent to a confirmed successful live deployment. Check `Settings → Pages` for **Deploy from a branch → gh-pages → /(root)** and the latest Pages Actions run.
Open the expected public root and confirm links to A1, A2, A3, patient and compare. If not reachable, report NOT VERIFIED rather than claiming deployed/live.

## Next task
Connect only the current published A3 snapshot (with strict patient/encounter checks and revoke/revision states) to the **existing standalone B v1.3 design**. Use a new development branch, avoid changing `gh-pages` automatically, and retain independent UI testing.
