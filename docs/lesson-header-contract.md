# Shared lesson header contract

Every standalone `*-lesson.html` page uses the same lesson chrome. The shared
header prevents a lesson title and 4–7 navigation steps from competing for the
same row, and gives every lesson the same responsive and accessible behavior.

## Required assets

Load these assets with their content-hash version. The stylesheet must be the
last lesson stylesheet so route-specific legacy CSS cannot change the shell.

```html
<link rel="stylesheet" href="assets/poker-kit/lesson-header.css?v=CONTENT_HASH">
<script defer src="assets/poker-kit/lesson-header.js?v=CONTENT_HASH"></script>
```

Run `node scripts/cache-bust.mjs assets/poker-kit/lesson-header.css
assets/poker-kit/lesson-header.js` after changing either asset.

## Required markup

Keep existing route-specific classes and data attributes on the header, tabs,
and buttons. Add the shared classes without replacing navigation behavior.

```html
<header class="topline lesson-chrome" data-lesson-header>
  <div class="lesson-brand lesson-chrome__identity">
    <a class="lesson-home lesson-chrome__back" href="/">← В обучающий хаб</a>
    <div class="lesson-chrome__copy">
      <p class="eyebrow lesson-chrome__eyebrow">Префлоп · большой блайнд</p>
      <h1 class="lesson-chrome__title">Защита BB коллом</h1>
    </div>
  </div>
  <nav class="step-tabs lesson-chrome__steps" role="tablist" aria-label="Шаги урока">
    <button class="step-tab" type="button" role="tab" aria-selected="true">1. Раздача</button>
  </nav>
</header>
```

## Invariants

- Identity and step navigation always occupy separate rows.
- Desktop steps form one count-aware row; they never use `flex-wrap`.
- At 860px and below, steps become an internal horizontal rail. The page itself
  must not gain horizontal overflow.
- The shared runtime derives the real step count and brings a newly selected
  step into view.
- The shared runtime owns roving tab stops and `ArrowLeft`, `ArrowRight`,
  `Home`, and `End` navigation across every lesson.
- Back and step controls retain at least a 44px hit target and visible focus.
- A full-viewport practice toggles `body.practice-is-running`; the shared header
  then leaves the layout completely so the table keeps the full viewport.
- Route styles may override semantic color tokens, but not header geometry.
- Simulator HUD/topbar is outside this contract; it is not a lesson header.

`node scripts/check-lesson-header-contract.mjs` discovers every root
`*-lesson.html` automatically. A new lesson cannot pass `npm run check` until it
adopts this contract.
