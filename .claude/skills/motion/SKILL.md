---
name: motion
description: Scaffold a motion effect on a named element with the token easing and duration, prefers-reduced-motion handled, mobile behaviour stated, and the motion inventory updated. Pass a selector and, optionally, what should happen.
argument-hint: <selector> [what it does]
disable-model-invocation: true
---

Scaffold motion on `$ARGUMENTS`.

## Before writing anything

1. Read `MOTION.md` (the inventory) and the Motion section of `DESIGN.md`.
   Count the ambient movers. There are five, and DESIGN.md says there is no
   sixth without re-opening the argument.
2. Decide which kind this is:
   - **Answers input** (hover, focus, click, scroll position): allowed.
     Uses `--ease-hover` or `--ease-enter`, `--dur-hover` or `--dur-base`.
   - **Ambient** (moves on its own, on a clock): this is a new mover. STOP.
     Tell the owner it would be the sixth, what the doctrine says, and ask
     whether to re-open the argument in DESIGN.md. Do not build it until
     they say yes, and if they do, the DESIGN.md entry is part of the work.
3. Grep the HTML for the selector. If it matches nothing, stop.

## The scaffold

Only `transform` and `opacity` animate unless there is a written reason in
the comment for anything else. Start state set from JS if the effect is an
entrance, so a blocked script or reduced motion leaves the element simply
visible; never hide something in CSS waiting for JS.

```css
/* MOTION: SELECTOR. <what it does, one line>. <kind: answers input | ambient>.
   Mobile: <what happens under 760px - runs / holds / not bound>. */
SELECTOR {
  transition: transform var(--dur-base) var(--ease-enter),
              opacity   var(--dur-base) var(--ease-enter);
  will-change: transform, opacity;
}
@media (prefers-reduced-motion: reduce) {
  SELECTOR { transition: none; transform: none; opacity: 1; }
}
```

If it needs JS, it goes in its own self-initialising file on the pattern of
`nav.js` or `vertical-rail.js`: no GSAP unless it is scroll-linked, bails
under reduced motion before touching anything, and the markup works with the
file absent.

## Report

What you added and where. Which kind it is. What it does on mobile. Whether
`MOTION.md`'s inventory needed a line, and if so the line you added. Then
the one-line "feature you should have used" note that CLAUDE.md rule 4
requires.
