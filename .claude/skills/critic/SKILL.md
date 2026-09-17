---
name: critic
description: Scan the CSS for anything bypassing the token system, plus per-section and per-page consistency checks, using the design-critic subagent.
disable-model-invocation: true
---

Launch the `design-critic` subagent with the Agent tool. Its instructions are
in `.claude/agents/design-critic.md`.

Prompt to give it: "Scan every .css file and every <style> block in *.html per
your instructions. Report in full."

Print its report verbatim. Do not fix anything it found. End with one line:
the single finding worth fixing first.
