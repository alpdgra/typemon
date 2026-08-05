# Typebound

Typebound is a small pixel-inspired typing RPG. You power an original creature named Glyphling by typing short spells. Fast, accurate typing deals more damage to the boss, while mistakes weaken each hit.

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

## Check the project

```bash
pnpm test
pnpm lint
pnpm build
```

## Combat balance

Completed phrases are scored using three inputs:

- Speed increases attack power up to a sensible cap.
- Accuracy has the strongest effect, so mashing keys is not rewarded.
- Completion reduces damage if the casting timer expires early.

The first release intentionally keeps progress local to a single battle. Creature selection, more opponents, persistent records, and difficulty options can build on this loop later.
