# Design QA — BB call defense lesson

> 2026-07-12 practice-polish addendum: the earlier manual seven-seat coordinates and mobile Hero-marker workaround described in comparison-history item 5 are superseded. BB call and resteal now consume the shared `simulator-slot-v1` marker contract, keep opponent bets direct on the felt, color graded actions through the shared shell, and show the answered BB chart with the current hand highlighted. Current cross-lesson evidence and the latest `final result: passed` report are in `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/design-qa.md`.

## Findings

- No actionable P0/P1/P2 findings remain.
- P3 accessibility follow-up: every range image has a descriptive scenario alt label and nearby aggregate text, but the complete 169-cell matrix is not duplicated as a screen-reader table.

## Source visual truth

- Neighbor lesson route: `http://127.0.0.1:8782/resteal-lesson.html`
- Intro: `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/source-resteal-intro-1180x849.png`
- First decision: `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/source-resteal-encounter-1180x849.png`
- Wisdom carousel: `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/source-resteal-wisdom-1180x849.png`
- Details: `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/source-resteal-deep-1180x849.png`
- Practice setup: `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/source-resteal-practice-setup-1180x849.png`
- Content truth: physical pages 10–11 of `/Users/loremcdmx/Downloads/Telegram Desktop/часть методички для аишки (1) (2).pdf` and `/Users/loremcdmx/Downloads/Telegram Desktop/покерный урок 2.txt`.

## Implementation evidence

- Local route: `http://127.0.0.1:8782/bb-call-defense-lesson.html`
- Intro: `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/final-intro-1180x849.png`
- First K4o decision: `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/final-encounter-1180x849.png`
- Wisdom, price: `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/final-wisdom-1180x849.png`
- Wisdom, repeated overfold leak: `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/prototype-wisdom-compounding-final-1180x849.png`
- Details, BTN 2x: `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/final-details-1180x849.png`
- Practice setup: `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/final-practice-setup-1180x849.png`
- Perfect-session result: `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/final-practice-perfect-1180x849.png`
- Tablet intro: `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/prototype-intro-tablet-820x1000.png`
- Mobile intro: `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/prototype-intro-mobile-final-390x844.png`
- Mobile decision: `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/prototype-encounter-mobile-clean-final-390x844.png`

## Viewports and states

- Desktop: `1180 × 849`; intro, decision, wisdom, details, practice setup, error counters, and perfect completion.
- Tablet: `820 × 1000`; intro copy, CTA, and table continuation.
- Mobile: `390 × 844`; two-row step navigation, intro, decision table, action rail, and stacked coach panel.
- Theme and density match the dark neighboring lesson. Browser zoom and device scale were unchanged.

## Full-view comparison evidence

Each file contains source on the left and final implementation on the right at the same `1180 × 849` viewport.

- `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/compare-intro-final.png`
- `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/compare-encounter-final.png`
- `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/compare-wisdom-final.png`
- `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/compare-deep-final.png`
- `/Users/loremcdmx/Documents/фф старт + путь игрока/.claude/worktrees/happy-colden-62f257/tmp/design-qa/bb-call/compare-practice-final.png`

The implementation preserves the source lesson's large display hierarchy, four-step header, dark panels, yellow actions, purple felt, carousel peek, compact simulator, and setup density. Topic-driven differences are intentional: the details screen shows source matrices rather than an EV simulator, and practice measures missed/wide calls rather than bot play.

## Required fidelity surfaces

- Fonts and typography: the same local Aptos/Segoe UI/system stack, weight hierarchy, display scale, tight heading tracking, uppercase eyebrow treatment, and small-control density are retained. Wrapping is clean at all checked widths. The blue heading outline is the shared keyboard focus treatment and appears in both source and implementation.
- Spacing and layout rhythm: desktop frame, header spacing, panel radii, table/coach split, carousel controls, and setup rails align with the source. Tablet stacks the hero copy before the visual. Mobile uses a visible two-by-two step grid and has no document-level horizontal overflow.
- Colors and visual tokens: shared dark background, violet felt, yellow primary state, green call state, pink 3-bet state, white fold state, borders, shadows, and muted-copy contrast are consistent with the source.
- Image quality and asset fidelity: cards and chips use the existing poker-kit assets. All 15 range images are direct 470 × 470 RGB crops from page 10, not reconstructed SVG/CSS art. Images keep their aspect ratio and remain legible in the details workspace.
- Copy and content: the transcript is integrated as concise learner guidance. Coach estimates are explicitly labeled as estimates, not measured EV. The lesson states its heads-up scope, separates postflop skill, explains repeated marginal overfolds, and does not invent an exact 3-bet size.
- Icons and controls: the source arrow controls, tabs, buttons, dealer marker, cards, and chips retain their visual family. Focus rings, disabled states, selected tabs, result states, and restart/exit controls were exercised.

## Focused comparison evidence

- The repeated-overfold wisdom capture verifies the longest transcript-specific copy, five hand cards, estimate qualifier, carousel counter, and both arrows without clipping.
- The details capture verifies the physical BTN 2x matrix, 81/9/10 aggregates, 18.2% price, and readable control states.
- The perfect-session capture verifies the 2.5 BB decimal rendering, correct one-blind hero commitment, `10 / 10`, zero leak counters, and the `Защитник большого блайнда` medal.

## Primary interactions tested

- Intro → K4o choice → answer feedback → all four steps unlocked.
- Nine wisdom slides via dots and arrows.
- Pot-odds tabs for 2 / 2.5 / 3 BB.
- Range tabs across size and EP/MP/HJ/CO/BTN; image source, alt label, opener width, aggregates, and price update together.
- Practice length toggles 10 ↔ 25.
- Wrong fold increments only `Пропущенные коллы`; wrong call increments only `Лишние коллы`.
- Full deterministic 10-hand run completed twice: `8 / 10` with one error of each type, then `10 / 10` with the defender medal.
- The 2.5 BB spot renders opener commitment `2,5 BB`, hero commitment `1 BB`, hero stack `39 BB`, and no phantom `5 BB` hero action.
- Desktop, tablet, and mobile document widths match their viewports. Console warning/error log is empty.

## Comparison history

1. Early intro pass used `1280 × 720`, pushing the CTA below the intended frame. The layout was tightened and recaptured at the source `1180 × 849` viewport.
2. The first integrated pass exposed P2 dependency, scoring, and focus issues: an untracked neighboring stylesheet, a medal despite extra calls, and lost focus after rerender. The lesson now owns a frozen local shell stylesheet, requires a genuinely perfect session for the medal, and restores progression focus.
3. The first practice pass exposed P2 desktop and narrow-screen progression issues. Running mode was fitted to the desktop viewport; narrow mode scrolls the active control into view.
4. Transcript/content audit found P2 issues: invented 8/9/10 BB 3-bet sizes, mixed EP/UTG learner labels, and omitted repeated-error compounding. Exact 3-bet sizing was removed, EP is translated at the renderer boundary while retaining its geometry key, and the compounding lesson was added. Post-fix evidence: `final-encounter-1180x849.png` and `prototype-wisdom-compounding-final-1180x849.png`.
5. Seven-seat desktop labels and the mobile felt initially overlapped (P2). All seven desktop slots now have explicit lesson geometry; mobile hides irrelevant folded seats and the redundant hero blind marker. Post-fix evidence: `final-encounter-1180x849.png` and `prototype-encounter-mobile-clean-final-390x844.png`.
6. A machine-readable `2,5 BB` action was split on the comma, creating a phantom BB `5 BB` action and wrong hero stack (P1 correctness). Internal action rows now use decimal points, presentation localizes them after rendering, and `test-room.mjs` protects the boundary. Browser evidence shows `2,5 BB` for MP, `1 BB` for hero, and `39 BB` remaining in `final-practice-perfect-1180x849.png`.

## Implementation checklist

- [x] Source and implementation captured at matching desktop viewport.
- [x] Required fidelity surfaces reviewed.
- [x] P0/P1/P2 findings fixed and recaptured.
- [x] Desktop, tablet, and mobile overflow checked.
- [x] Core lesson and full practice journey exercised.
- [x] Console errors checked.

final result: passed
