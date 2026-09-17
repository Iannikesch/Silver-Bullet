---
name: audit
description: Audit the site against the owner's recorded feedback using the site-auditor subagent. Reports every feedback item as Done / Partial / Not done / Declined / Blocked with file:line evidence.
disable-model-invocation: true
---

Launch the `site-auditor` subagent with the Agent tool. Its instructions are
in `.claude/agents/site-auditor.md`; do not restate them, just run it.

Prompt to give it: "Audit the site against docs/feedback/sba-site-feedback-9-16.md
per your instructions. Report in full."

When it returns, print its report verbatim. Do not summarise it, do not soften
a Not done, do not act on anything it found. Then add one line: which item you
would take first, and why.
