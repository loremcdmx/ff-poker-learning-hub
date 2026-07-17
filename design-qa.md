# Design QA — flop check-raise size-matched fold card

Source visual truth: `/var/folders/3x/hpz4jz_d1tb79j8fjbk1z0tw0000gn/T/TemporaryItems/NSIRD_screencaptureui_tcJyEI/Снимок экрана — 2026-07-16 в 2.43.52 AM.png`

Implementation screenshot: `/tmp/flop-checkraise-size-matched-implementation.png`

Responsive screenshots: `/tmp/flop-checkraise-size-card-590.jpg`, `/tmp/flop-checkraise-size-card-390.jpg`

Combined source/implementation comparison: `/tmp/flop-checkraise-size-card-comparison.png`

Viewport and state:

- Source: 938 × 490 content crop, dark theme, wisdom slide 3.
- Implementation: 870 × 891 in-app browser viewport, dark theme, wisdom slide 3.
- The full slide regions were normalized side by side for comparison because the supplied source is a cropped region rather than a full browser viewport.
- Responsive frames: 590 px and 390 px wide, wisdom slide 3.

## Findings

No actionable P0/P1/P2 mismatch remains.

- Typography: the existing display family, weights, line height, eyebrow treatment, and hierarchy remain intact. The new league rates retain the large numeric emphasis of the source stat card.
- Spacing and layout rhythm: the original two-column slide, copy width, rule block, panel radius, and visual-column footprint are preserved. The new card stays inside the right track and becomes a normal-flow block below 820 px.
- Colors and tokens: yellow, violet, green, panel, border, and muted-text tokens reuse the existing lesson palette. Rate color is reinforced by text and sample counts, not color alone.
- Image and asset fidelity: the board uses the existing PokerDeckKit card assets. No placeholder, custom SVG, emoji card, or CSS-drawn playing card was introduced.
- Copy and content: the abstract aggregate comparison was replaced by one explicitly scoped CO/BTN-vs-BB K-high-dry sample, one common sizing window, all three league rates, numerators/denominators, player counts, the 43% threshold, and a visible representative-board caveat.
- Responsive behavior: measured horizontal overflow is zero at 590 px (`scrollWidth = clientWidth = 590`) and 390 px (`scrollWidth = clientWidth = 390`). The card widths are 460 px and 328 px respectively and remain within their active slides.

## Focused comparison evidence

The combined comparison shows that the source's right-side abstract `≈43%` block is replaced in the same visual slot by a concrete K♣ 8♥ 2♠ example, shared sizing, and League 1–3 fold rows. The shell, left-hand hierarchy, rule block, dark palette, and slide proportions remain recognizably the same. A focused comparison was required because the changed board cards, sizing labels, percentages, sample counts, and threshold are too small to judge from a full-page screenshot alone.

## Comparison history

1. Initial implementation replaced the orbit/stat with the board-and-rates card and preserved the two-column layout. Data review found that the first candidate slice included all IP RFI positions, so the UI was not handed off.
2. The evidence was narrowed to CO/BTN and then to the same practical sizing window for every league: c-bet 30–36% of the starting pot and check-raise-to 95–105% of the starting pot. Copy, counts, samples, and provenance were updated.
3. Final browser capture confirmed the three rows and sample Ns, no horizontal overflow at desktop/590/390 px, working carousel navigation, and no visible overlap or clipped primary content.

## Follow-up polish

- P3: the methodology footer is intentionally compact. It remains readable in the live browser, while the main rates and Ns keep priority.

final result: passed

---

# Design QA — RFI practice card pocket

Source visual truth: `/var/folders/3x/hpz4jz_d1tb79j8fjbk1z0tw0000gn/T/TemporaryItems/NSIRD_screencaptureui_hXJVxP/Снимок экрана — 2026-07-17 в 1.19.44 PM.png`

Implementation screenshot: `/tmp/rfi-practice-cards-final-1704.png`

Responsive screenshot: `/tmp/rfi-practice-cards-final-390.png`

Combined source/implementation comparison: `/tmp/rfi-practice-cards-comparison.png`

Viewport and state:

- Source and implementation: 1704 × 1100, dark theme, RFI «Практика» after the first decision with revealed opponent cards.
- Responsive checks: 390 × 844, 620 × 900 and 621 × 900.
- The source represents the former enlarged table composition. The scoped visual target was the card-to-player-box docking relationship, not the surrounding coach layout or overall table scale.

## Findings

No actionable P0/P1/P2 mismatch remains.

- Fonts and typography: unchanged; the patch touches only positional custom properties.
- Spacing and layout rhythm: every revealed pair is horizontally centered on its owner plate with a measured centre delta of 0 px. Hero and all opponent pairs overlap their plate by 19.9–20.0%.
- Colors and visual tokens: unchanged; existing deck, felt, plate and state colors remain intact.
- Image and asset fidelity: existing PokerDeckKit cards are reused without replacement, cropping or synthetic assets.
- Copy and content: unchanged.
- Responsive behavior: 390, 620, 621 and 1704 px all retain 19.9–20.0% overlap, zero card-to-card collisions and zero document horizontal overflow.

## Focused comparison evidence

The combined comparison exposes the changed relationship clearly: the source has side hands displaced toward the centre of the felt and inconsistent plate overlap, while the implementation centres every hand on the plate. Non-top hands open upward; top-row hands open downward. A focused numeric geometry pass was also required because the exact 20% tuck cannot be judged reliably from the full-page image alone.

## Comparison history

1. Initial measurement found 0–74% overlap depending on seat and horizontal card-centre errors up to roughly 79 px.
2. The first normalized pass produced exact centring and 19.9–20.0% overlap everywhere except top seats, which still measured 24.6%.
3. The top-row offset was recalibrated; the final browser pass measured 19.9–20.0% on every visible hand at desktop and responsive widths.

## Follow-up polish

- No P3 issue is required for this scoped card-pocket change.

final result: passed

## Field-tab structure matrix follow-up

The field tab now renders the eight exclusive flop structures against League 1–3. Every league cell keeps two independent rates and samples: CO/BTN c-bet after the BB check, then the same aggressor's fold after facing X/R. The fold control switches between all observed sizes and one shared `30–36% c-bet → 95–105% starting-pot X/R-to` window.

Browser QA covered the exact `/flop-checkraise-lesson` route and both fold views:

- default 1280 px viewport: four real table columns, 101 px data rows, no document overflow;
- 390 px and 320 px: each structure becomes a card with three league rows and two KPI cells, no horizontal overflow;
- 320 px KPI row: `62 + 98 + 98` px children inside a 270 px grid, with no clipped sample count;
- all-size totals and matched-size K-high row changed to the expected counts after the toggle;
- console warnings/errors: none.

The first desktop pass exposed a real semantic-table layout defect: `display:grid` on `<td>` stacked all three leagues into one tall column. Grid ownership moved to an inner `.structure-league-cell-metrics` wrapper; the final rows measure as `[220, 337, 337, 337]` px at 1280 px.

final result: passed
