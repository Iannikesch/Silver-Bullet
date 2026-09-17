---
name: explain
description: Explain what just happened in the last change in plain English for someone who is not a developer, and name the Claude Code feature that should have been used.
disable-model-invocation: true
---

Explain the most recent change in this session to someone who runs a
business and does not write code.

Rules:
- Plain English. When a technical term is unavoidable, define it in half a
  sentence, inline, the first time.
- What changed, in terms of what the visitor sees or what the site does. Not
  which functions were edited.
- Why it was done that way, in one or two sentences.
- What could go wrong with it, if anything, in one sentence.
- Then one line: which Claude Code feature (plan mode, /rewind, /clear, a
  subagent, a slash command, a hook, a worktree) would have made this faster
  or safer, and why. If none would have, say so.

Under 200 words. No lecture, no list of everything that was considered.
