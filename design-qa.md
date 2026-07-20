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

# Design QA — flop check-raise K92 value range

Source visual truth: `/var/folders/3x/hpz4jz_d1tb79j8fjbk1z0tw0000gn/T/TemporaryItems/NSIRD_screencaptureui_pKXGoJ/Снимок экрана — 2026-07-19 в 10.03.50 PM.png`

Implementation screenshot: `/private/tmp/checkraise-k92-final-1280x900.png`

Responsive screenshot: `/private/tmp/checkraise-k92-final-390x844.png`

Combined source/implementation comparison: `/private/tmp/checkraise-k92-source-final-comparison.png`

Viewport and state:

- Desktop: 1280 × 900, dark theme, «Главное», slide 2 of 3.
- Responsive: 390 × 844, the same slide and content state.
- The comparison is scale-normalized because the supplied source is a 1902 × 1270 browser capture.

## Findings

No actionable P0/P1/P2 mismatch remains.

- Typography and hierarchy: the existing eyebrow, display heading and lesson-copy scale remain unchanged; the new panel uses the same compact uppercase labels and tokenized typography as the lesson.
- Spacing and layout: the desktop panel remains inside the right visual column and does not overlap the copy. At 390 px it moves below the copy in normal flow; document horizontal overflow is `0`.
- Colors and tokens: the board uses the existing four-color deck. Thin value/mix uses the lesson yellow accent and strong value uses the existing green accent.
- Image and asset fidelity: K♣ 9♦ 2♥ is rendered by the existing PokerDeckKit card component. No placeholder, emoji card or synthetic image was introduced.
- Copy and content: all requested hands are present exactly once: `KQ`, `KJ`, `KT`, `K9`, `K2`, `92s`, `22`, `99`. KQ/KJ/KT are explicitly labeled as a mix rather than mandatory raises, with the blocker effect on later bluff barrels explained.
- Responsive behavior: at 1280 px and 390 px the panel is contained, all eight hand chips fit, the board contains three unique cards, and the former orbit/stat visual is absent. Browser console warnings/errors: none.

## Focused comparison evidence

The source's abstract `value + bluff` orbit has been replaced in the same visual slot by a concrete K92 rainbow board, a two-tier value range, and a blocker note. The surrounding lesson shell, copy column, carousel controls and dark visual language remain intact.

## Comparison history

1. The first pass replaced the abstract visual with a concrete board and the requested range.
2. The board suits were adjusted to K♣ 9♦ 2♥ so all three cards remain visually distinct in the four-color deck.
3. Final browser checks confirmed zero horizontal overflow, no copy/panel overlap, no clipped chips, and exact range membership at desktop and mobile widths.

final result: passed

## K92 value-range visual hierarchy follow-up

Source screenshot: `/private/tmp/checkraise-k92-before-952x895.png`

Implementation screenshot: `/private/tmp/checkraise-k92-after-952x895.png`

Responsive screenshot: `/private/tmp/checkraise-k92-after-390x844.png`

Combined source/implementation comparison: `/private/tmp/checkraise-k92-comparison-952x895.png`

Viewport and state:

- Desktop: 952 × 895, dark theme, «Главное», slide 2 of 3.
- Breakpoint probes: 821 × 895 and 820 × 895.
- Mobile: 390 × 844, the same slide and content state.

### Findings

No actionable P0/P1/P2 mismatch remains.

- Copy hierarchy: the misleading «Блефам нужна сильная пара» headline is replaced by «Рейзим не только блефы». The lead now states the value-range purpose directly.
- Card formatting: all eight requested hand classes render as real two-card PokerDeckKit examples. Strong value (`K9`, `K2`, `92s`, `22`, `99`) is separated from the selective Kx mix (`KQ`, `KJ`, `KT`) by label, color and grouping.
- Visual hierarchy: the hand classes now appear only once, in the compact range card with a board header, two named sections and a separate blocker explanation. The copy column keeps the headline and one-line teaching lead instead of duplicating the range.
- Responsive behavior: document horizontal overflow is `0` at 952, 821, 820 and 390 px. The desktop copy and card never overlap; at 820 px the card enters normal flow with a 24.6 px gap. At 390 px all eight combo tiles and all 19 rendered cards remain inside the active slide with zero tile overflow.
- Asset fidelity: the board and all combinations reuse PokerDeckKit; no placeholder or synthetic card asset was added.

The 2026-07-20 copy-deduplication follow-up keeps the explanatory sentence on the left and makes the illustrated card on the right the only visible hand list. At 953, 951, 821, 820, 390 and 389 px the duplicate list has zero rendered rectangles; the copy and visual have zero overlap, all eight combo tiles remain inside the card and document overflow stays zero. Evidence: `/private/tmp/checkraise-value-copy-deduped-952x895.png`.

### Focused comparison evidence

The side-by-side comparison shows the exact requested improvement: the old left column was one grey paragraph, while the old right card repeated abstract hand labels. The implementation turns the same information into a scan path — headline → one-line principle → two range buckets → real card examples → blocker reason — without changing the surrounding lesson shell or carousel controls.

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

- default 1280 px viewport: four real table columns, no raw sample counters, 76–90 px data rows and no document overflow;
- 390 px and 320 px: each structure becomes a card with three league rows and two KPI cells, no horizontal overflow;
- 320 px KPI row: `62 + 98 + 98` px children inside a 270 px grid, with no clipped percentage or label;
- all-size totals and matched-size K-high row changed to the expected counts after the toggle;
- console warnings/errors: none.

The first desktop pass exposed a real semantic-table layout defect: `display:grid` on `<td>` stacked all three leagues into one tall column. Grid ownership moved to an inner `.structure-league-cell-metrics` wrapper; the final rows measure as `[220, 337, 337, 337]` px at 1280 px.

The compact-table follow-up removes the 48 visible numerator/denominator lines and the obsolete `Как читать N` footer from the structure table while retaining every percentage and the sizing toggle. Table height at 1280 px fell from 845.5 px to 655 px. Exact-width checks at 951–953 px and 389–391 px found zero document overflow and no clipped KPI cards. Evidence: `/private/tmp/checkraise-field-table-compact-952.png` and `/private/tmp/checkraise-field-table-compact-1280.png`.

The 2026-07-20 horizontal-density follow-up also checks the table's own scroll container, not only document overflow. The prior `min-width: 980px` floor made a 980 px table inside a 916 px viewport and hid 64 px of League 3 behind inner scrolling at 952 px. The table now follows the available width, gives 20% to the structure column and divides the remaining 80% evenly across all three leagues; only table-local gaps and padding tighten, while the percentage type scale remains unchanged at the target desktop width. Final 952 px geometry is `916 / 916` client/scroll width with columns `[183, 244, 244, 244]`; 953, 951, 821, 820, 591, 590, 390 and 389 px checks all report zero inner scroll, document overflow, KPI overflow and row overflow. Evidence: `/private/tmp/checkraise-field-matrix-final-952x895.png`.

final result: passed

---

# Design QA — vs-3bet defense action-colored range chart

Problem screenshot: `/var/folders/3x/hpz4jz_d1tb79j8fjbk1z0tw0000gn/T/TemporaryItems/NSIRD_screencaptureui_KQdAvp/Снимок экрана — 2026-07-20 в 1.24.22 AM.png`

Existing product reference: `/private/tmp/vs3-range-chart-reference-rfi-20260720.png`

Implementation screenshots: `/private/tmp/vs3-range-chart-after-20260720.png` and `/private/tmp/vs3-range-chart-after-focused-1280x720.jpg`

Viewport and state:

- Reference and focused implementation: 1280 × 720, dark theme, 13 × 13 range matrix.
- Implementation route: `/vs-3bet-defense-lesson.html`, tab «Чарты», CO, in position, 31–50 BB, 3x, «Методичка».
- The reference is the existing RFI field-range pattern: one dominant full-cell action color plus a precise mixed-frequency strip.

## Findings

No actionable P0/P1/P2 mismatch remains.

- Action hierarchy: all 169 cells use their dominant action as the full surface, matching the established RFI chart treatment. The exact four-action mix remains visible in the bottom strip and in the accessible hand label.
- Fold semantics: fold now has a dedicated cool slate-blue token and is visibly distinct from the neutral/no-data state. Missing cells are disabled and use a dark hashed surface instead of impersonating a 100% fold.
- Color system: call remains green, 4-bet magenta and 4-bet push orange. The same action classes also style the field/wisdom range cells, so the lesson no longer has two competing range-chart dialects.
- Interaction: selected hands keep the yellow product focus border; hover and keyboard focus strengthen the existing action color without changing the matrix geometry.
- Layout: the exact browser pass rendered all 169 cells with zero document-level horizontal overflow. Purposeful matrix-local scrolling remains available at narrow widths.
- Scope: no range percentages, filters, normalization or grading behavior changed.

## Focused comparison evidence

The reference and implementation were inspected together at 1280 × 720. The old chart encoded most decisions as nearly identical dark tiles with only a faint bottom marker. The implementation restores the product's established scan path: action surface first, hand label second, exact mixed-frequency strip third. Fold is now a first-class action color rather than the chart background.

The in-app viewport override did not change the active browser's reported 1280 × 720 viewport, so this pass does not claim a fresh mobile screenshot. Existing narrow-screen overflow remains explicitly contained by `.vs3-matrix-scroll`, and the exact desktop route has zero document overflow.

final result: passed

---

# Design QA — check-raise field table league grouping

Problem screenshot: `/var/folders/3x/hpz4jz_d1tb79j8fjbk1z0tw0000gn/T/TemporaryItems/NSIRD_screencaptureui_H7eDqD/Снимок экрана — 2026-07-20 в 2.37.48 AM.png`

Implementation screenshot: `/private/tmp/checkraise-field-league-groups-after-1280x720.png`

Viewport and state:

- Exact local route: `/flop-checkraise-lesson.html?incoming-cbet-labels-0720`, tab «3. Поле».
- Focused implementation capture: 1280 × 720, dark theme, structure table scrolled into view.
- Responsive geometry checks: 820 × 900 and 590 × 900, then reset to the default viewport.

## Findings

No actionable P0/P1/P2 mismatch remains.

- League hierarchy: each two-metric pair now sits inside one shared framed surface, so «Нам ставят» and «Фолд на X/R» read as children of one league rather than six equivalent cards.
- Column identity: League 1, 2 and 3 receive restrained blue, violet and amber accents in both the header cap and the paired row surface. Yellow/green KPI colors remain reserved for metric semantics.
- Density: the table keeps its existing 20% structure column and three equal 26.6667% league columns; no extra column or text was introduced.
- Layout: at 1280 px the first-row league groups measure 312 px each and their KPI cards remain fully contained. Table and document horizontal overflow both equal zero.
- Responsive behavior: 820 px keeps the desktop matrix with 200 px league groups and no child overflow. At 590 px the existing stacked-card layout activates, keeps visible League labels, and reports zero inner or document overflow.
- Runtime: the exact route produced no console warnings or errors.

## Focused comparison evidence

The source and implementation were inspected together. In the source, metric borders and row lines have equal weight, so the eye reads six repeated cards. The implementation adds a shared perimeter, low-contrast league lane and matching header underline around each pair; the three league groups are now distinguishable before reading their labels, while the numbers and table geometry remain unchanged.

final result: passed
