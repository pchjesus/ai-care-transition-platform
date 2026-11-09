# CareBridgeLab · Hospital UX 2.0 v0.1

**Independent hospital UI/UX information-architecture prototype.** This branch does not alter the production hospital UI, patient app B, assessment engine, publication, or local storage.

## Preview

Open `prototypes/hospital-ux2-v01/index.html` directly in a browser, or from a local HTTP server:

```sh
python3 -m http.server 5500
# http://localhost:5500/prototypes/hospital-ux2-v01/
```

No dependencies, API keys, or network access are needed.

## Scenario

1. **업무 홈** — read the purpose and four-step workflow.
2. **환자 목록** — search `윤미경` or `SYN-002`, then click the task link (search alone does not select a patient).
3. **환자 개요** — verify patient context and next action.
4. **돌봄 필요도 평가** — navigate six domains and 30 illustrative fields; selections remain in memory only, no scoring.
5. **퇴원계획 작성** — edit an illustrative patient-facing sentence and check the preview.
6. **검토·승인·발행** — navigate to unresolved work and read the approval flow; no approval or publication is performed.
7. **사용법·체험 안내** — repeat the task flow with the guide.

## Design principles

- Main task navigation and patient-scoped work navigation are separate.
- White, neutral, and blue information-dense professional interface, independent from the green patient B app.
- Lists/tables for comparison, limited cards for summary, persistent labels for form inputs.
- Navigation links vs. action buttons; inline status/error guidance vs. explanatory dialogs.
- No avatar photos; actions tell users their next step; mobile responsive menu.
- Reference: `Universal_Visual_Design_UI_UX_Guidelines_v1.2.md`, `REFERENCE_ANALYSIS_v0.1_20261015.md` (REF-008/014), and provided component-semantics screenshot.

## Scope and verification

This v0.1 is a **visual/flow candidate**. It uses synthetic sample patients. All inputs are transient, with no backend, no storage, and no patient B integration. The 6×5 labels are illustrative and do not replace the authoritative A2 source.

Node syntax and lightweight screen-generation assertions were checked on the prototype before commit. Browser/visual and device checks are **NOT VERIFIED** because the available container Chromium blocks navigation. Do not mistake this for a clinical, integrated, or approved release.

Safe next step: gather visual/user feedback before wiring the existing assessment engine, source records, role review, approval, publication, revision, retraction, and patient publication contract. Existing `main` and `gh-pages` must remain unchanged pending separate approval.
