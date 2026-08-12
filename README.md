# Typemon

Typemon is a small pixel-inspired typing RPG. You power an original creature named Glyphling by typing short spells. Fast, accurate typing deals more damage to the boss, while mistakes weaken each hit.

**[Play Typemon](https://alpdgra.github.io/typemon/)**

## Current prototype

- One complete boss battle against Mossmaw
- Damage based on words per minute, accuracy, and phrase completion
- Twelve-second casting window that starts on the first key
- Boss counterattacks, health bars, combat feedback, and battle results
- Keyboard, touch, screen reader, and reduced-motion support
- Responsive layout for desktop and mobile

## Run locally

Requires Node.js 22.12 or newer and pnpm.

```bash
pnpm install
pnpm dev
```

Then open the local URL shown in the terminal.

Do not open `index.html` directly. The development version needs to run through Vite using `pnpm dev`.

## Check the project

```bash
pnpm test
pnpm lint
pnpm build
```

## Publish to GitHub Pages

```bash
pnpm deploy:pages
```

This builds the game and publishes `dist` to the `gh-pages` branch.

## Combat balance

Completed phrases are scored using three inputs:

- Speed increases attack power up to a sensible cap.
- Accuracy has the strongest effect, so mashing keys is not rewarded.
- Completion reduces damage if the casting timer expires early.

The first release intentionally keeps progress local to a single battle. Creature selection, more opponents, persistent records, and difficulty options can build on this loop later.
