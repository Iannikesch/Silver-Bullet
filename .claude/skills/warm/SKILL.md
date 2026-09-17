---
name: warm
description: Apply the standard warm treatment to a named element using tokens only - soft border, rounded corners, warm tint, gradient edge masks, standard easing. Pass a CSS selector or class name.
argument-hint: <selector>
disable-model-invocation: true
---

Apply the warm treatment to `$ARGUMENTS`.

## First, find it

Grep the HTML for the selector. If it matches nothing, stop and say so; do
not guess at a similar name. If it matches more than one distinct element,
list them and ask which.

Read `tokens.css` so every value below resolves to a real token. Read the
`.site-header` and `.nav .cta-secondary` rules in `site.css`: that is the
warm treatment as it already exists on the site, and this must match it, not
invent a variant.

## The treatment, tokens only

```css
SELECTOR {
  background: color-mix(in srgb, var(--sand) var(--alpha-hair), transparent);
  border: 1px solid color-mix(in srgb, var(--sand) var(--alpha-mid), transparent);
  border-radius: var(--r-md);
  box-shadow: var(--rim-top-lit);
  transition:
    background-color var(--dur-hover) var(--ease-hover),
    border-color     var(--dur-hover) var(--ease-hover),
    transform        var(--dur-hover) var(--ease-enter);
}
SELECTOR:hover,
SELECTOR:focus-visible {
  background: color-mix(in srgb, var(--sand) var(--alpha-soft), transparent);
  border-color: color-mix(in srgb, var(--sand) var(--alpha-strong), transparent);
  transform: translateY(-1px);
}
@media (prefers-reduced-motion: reduce) {
  SELECTOR { transition: none; }
  SELECTOR:hover, SELECTOR:focus-visible { transform: none; }
}
```

If the element sits on a band that scrolls or clips at its edges, add the
gradient edge mask the ticker uses (grep `mask-image` in `site.css` and match
it). If it does not, leave the mask out; do not add one for decoration.

## Rules

- No raw hex, no raw px for radius or spacing, no raw `cubic-bezier`. If a
  value you need is not a token, stop and say which.
- Text colour does not change. Steel on warm is the whole idea (see the
  warm-darks comment in `tokens.css`).
- Put the rule next to the element's existing rules in `site.css`, with a
  one-line comment saying it is the warm treatment.
- Do not touch the HTML unless the element needs a `tx-halo` class to carry
  the glow, and say so if you add it.

## Report

The rule you added, where it went (`site.css:line`), and one sentence on
what the element looks like now. Then the one-line "feature you should have
used" note that CLAUDE.md rule 4 requires.
