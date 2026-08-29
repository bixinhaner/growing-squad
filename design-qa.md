# Story Treehouse v0.5 · Design QA

## Result

passed

## Source of truth

- ImageGen UI references: `design/v0.5/01-story-treehouse-shelf.png` through `design/v0.5/05-parent-reading.png`
- ImageGen production masters: `design/v0.5/assets/`
- Runtime artwork: `public/assets/reading/`
- Implementation: `src/pages/ReadingPage.jsx`, `src/pages/ReadingParentPage.jsx`, and the reading rules under `src/modules/reading/`

## Visual comparison

| State | Reference | Rendered implementation | Viewport |
| --- | --- | --- | --- |
| Child shelf | `design/v0.5/01-story-treehouse-shelf.png` (1543×1019) | `artifacts/visual-qa/93-reading-shelf-ipad.png` | 1366×900, DPR 1 |
| Mode choice | `design/v0.5/02-reading-mode.png` (1545×1018) | `artifacts/visual-qa/96-reading-mode-ipad.png` | 1366×900, DPR 1 |
| Active reading | `design/v0.5/03-reading-active.png` (1545×1018) | `artifacts/visual-qa/97-reading-active-ipad.png` | 1366×900, DPR 1 |
| Parent bridge | `design/v0.5/05-parent-reading.png` (1586×992) | `artifacts/visual-qa/98-reading-parent-desktop.png` | 1366×900, full page 1366×943 |
| Child reflection | responsive adaptation of `design/v0.5/04-reading-reflection.png` | `artifacts/visual-qa/94-reading-reflection-mobile.png` | 390×844, DPR 1 |

Combined side-by-side evidence is stored in `artifacts/visual-qa/comparisons/`. The final pass checked the shelf grid, cover proportions, companion mode selection, low-attention reading state, reflection controls, parent insights, and navigation.

## Browser and interaction checks

- Verified in the in-app browser against an isolated copy of the production SQLite database; production data was not changed during QA.
- Added six household books, selected a companionship mode, started a reading session, requested help, completed the session, chose difficulty, optionally reflected, and returned to Story Treehouse.
- Verified reading state survives reload and appears in the parent Reading Bridge.
- Verified the child shelf, mode choice, active session, and reflection each fit one viewport at the target sizes without horizontal overflow.
- Verified child reading routes hide star balance, timers, speed, ranks, and reward pressure.
- Verified the parent flow stores only book metadata, mode, help, difficulty, and optional reflection; no copyrighted full text is stored.
- Browser console was clean in the interaction pass. The in-app browser screenshot endpoint produced blank/cropped captures, so normalized screenshot evidence was taken from the same local build with Playwright after semantic in-app-browser verification.

## Issues found and fixed

1. Removed the star balance from reading routes to keep reading non-transactional.
2. Reworked an over-stretched single-card shelf into a stable two-row book grid.
3. Corrected portrait book-cover proportions instead of stretching generated artwork.
4. Compressed the mobile reflection layout so all decisions remain visible without scrolling.
5. Added persistent child navigation to prevent the Story Treehouse becoming a dead end.
6. Changed parent reading accents from reward purple to forest sage and navy.
7. Made the parent navigation independently scrollable and pinned “返回孩子模式”; this fixed the 720px-height full-suite regression.

## Automated verification

- ESLint: passed
- Vitest: 12 files, 71 tests passed
- Production build: passed
- Playwright: 14 end-to-end tests passed, including two dedicated reading tests
- `git diff --check`: passed
