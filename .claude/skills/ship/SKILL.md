---
name: ship
description: Pre-commit pass. Runs copy-cop, then tracking-tagger, then design-critic, then asset-cop, in that order, and reports everything before anything is committed.
disable-model-invocation: true
---

Run four subagents with the Agent tool, one after another, in this order.
Each one's instructions are in its file under `.claude/agents/`. Wait for
each to finish before starting the next; the two that edit run first so the
two that only read see the result.

1. `copy-cop`: "Scan all *.html per your instructions and fix what you are
   allowed to fix."
2. `tracking-tagger`: "Add or correct data-track on every interactive element
   per your instructions."
3. `design-critic`: "Scan every .css file and <style> block per your
   instructions."
4. `asset-cop`: "Scan committed media per your instructions."

Then ONE combined report, in this shape:

**Changed by copy-cop** (file:line, before, after)
**Changed by tracking-tagger** (file:line, element, value)
**Reported, not changed** (from copy-cop: placeholders, client claims)
**Design findings** (design-critic's table)
**Asset findings** (asset-cop's table and commands)

Then `git status --short` so the owner sees exactly what the two editing
agents touched.

Do NOT commit. Do NOT push. The owner reads this and decides.
