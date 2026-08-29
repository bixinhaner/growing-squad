# v0.5 Story Treehouse · ImageGen assets

All visible raster artwork in the reading module was created with ImageGen. UI text, controls, state, and responsive layout remain semantic HTML/CSS.

## UI references

- `01-story-treehouse-shelf.png`: child shelf, landscape iPad/web.
- `02-reading-mode.png`: book and companion-mode choice.
- `03-reading-active.png`: low-attention active-reading state.
- `04-reading-reflection.png`: difficulty and optional child reflection.
- `05-parent-reading.png`: parent Reading Bridge workspace.

## Production masters

- `assets/book-cover-atlas.png`: 4×3 atlas of 12 original cover illustrations without typography.
- `assets/story-treehouse-hero.png`: original treehouse library hero.
- `assets/reading-companion.png`: original moon-bear reading companion.

## Runtime derivatives

- `public/assets/reading/*.webp`: 12 cover skins plus two responsive hero assets.
- Cover titles are rendered in HTML rather than baked into images, so Chinese remains legible and books can be renamed.
- The generated covers are selectable artwork for household-owned book metadata; the app does not claim the generated stories are uploaded books and never stores copyrighted full text.

## Visual constraints used in prompts

- Premium calm watercolor and tactile storybook texture.
- Cream paper, midnight navy, forest sage, and warm amber palette.
- No emoji, logos, recognizable copyrighted characters, rankings, timers, stars, or reading-pressure metrics.
- Child screens fit a single viewport; the active-reading state deliberately reduces visual attention.
