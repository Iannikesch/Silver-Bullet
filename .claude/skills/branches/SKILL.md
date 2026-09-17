---
name: branches
description: Report the state of every branch and worktree - commits, uncommitted work, real vs mechanical conflicts, recommended merge order, stale branches - using the branch-warden subagent. Read-only.
disable-model-invocation: true
---

Launch the `branch-warden` subagent with the Agent tool. Its instructions are
in `.claude/agents/branch-warden.md`.

Prompt to give it: "Report the state of every branch and worktree per your
instructions."

Print its report verbatim. Do not merge, reset or resolve anything. If it
recommends an order, end with that order on one line so it is easy to act on.
