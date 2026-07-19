# Repository rules for agents

## Interactive poker tables

Whenever a learner is asked to choose a poker action — fold, check, call, raise, or all-in — the table shown for that decision must be functional.

- Use the shared simulator snapshot (`FFTrainerSimulatorSnapshot`) or the full simulator instead of drawing a static table.
- Put the action controls into the functional table and make a click update the rendered answer state and feedback.
- Do not pair a decorative/static table illustration with separate poker-action buttons.
- A static table is allowed only when it is purely explanatory, offers no poker decision, and is marked as decorative where appropriate.
- Keep a focused contract test for every lesson that introduces an interactive table.

## Standalone lesson header

Every root `*-lesson.html` page must use the shared lesson header contract in
`docs/lesson-header-contract.md`.

- Load `assets/poker-kit/lesson-header.css` after route styles and load
  `assets/poker-kit/lesson-header.js` with a current content-hash token.
- Keep one `[data-lesson-header].lesson-chrome` with the shared identity, title,
  back control, and step-rail classes.
- Do not add route-specific header geometry or a new lesson-header component.
- Full-viewport practices use `body.practice-is-running`; do not replace the
  shared header with a route-specific sticky or compact header.
- Run `node scripts/check-lesson-header-contract.mjs`; new standalone lessons
  are intentionally discovered by filename and fail the repository check until
  they adopt the shared shell.
