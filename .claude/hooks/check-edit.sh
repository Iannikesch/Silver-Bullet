#!/bin/bash
# PreToolUse hook for Edit and Write.
# Blocks (exit 2) three things CLAUDE.md forbids, with a one-line reason each,
# and warns (exit 0) about one more. Reads the tool call as JSON on stdin.
#
# What it checks is the INCOMING text only - new_string for Edit, content for
# Write - so an existing violation elsewhere in the file does not block an
# unrelated edit. The subagents (/critic, /ship) cover the whole file.

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
text=$(printf '%s' "$input" | jq -r '.tool_input.new_string // .tool_input.content // empty')
[ -z "$file" ] || [ -z "$text" ] && exit 0

base=$(basename "$file")
ext="${base##*.}"

block() { printf '%s\n' "$1" >&2; exit 2; }

# ---- (a) em dashes in site copy: any .html --------------------------------
if [ "$ext" = "html" ] && printf '%s' "$text" | grep -q $'\xe2\x80\x94'; then
  block "Blocked: that edit puts an em dash (—) into $base. Site copy uses a comma, a colon or a period instead (CLAUDE.md, Copy and content)."
fi

# ---- (b) hardcoded values in CSS, except tokens.css -----------------------
if [ "$ext" = "css" ] && [ "$base" != "tokens.css" ]; then
  # raw hex: allowed inside mask-image (opaque, not colour) and as a var() fallback
  stripped=$(printf '%s' "$text" \
    | sed -E 's/mask-image:[^;]*;//g' \
    | sed -E 's/var\(--[a-z0-9-]+, *#[0-9a-fA-F]{3,8}\)//g' \
    | sed -E 's|/\*[^*]*\*/||g')
  if printf '%s' "$stripped" | grep -qE '#[0-9a-fA-F]{3,8}\b'; then
    hit=$(printf '%s' "$stripped" | grep -oE '#[0-9a-fA-F]{3,8}\b' | head -1)
    block "Blocked: raw colour $hit in $base. Colours are tokens in tokens.css; use var(--token) (or var(--token, $hit) as a fallback). If no token fits, say so rather than adding one inline."
  fi
  # raw cubic-bezier outside a --ease-* definition
  if printf '%s' "$text" | grep -v -- '--ease-' | grep -q 'cubic-bezier('; then
    block "Blocked: raw cubic-bezier() in $base. Use --ease-enter, --ease-exit, --ease-hover or --ease-run from tokens.css. A new curve is a new token, not an inline value."
  fi
  # off-scale px in padding / gap / margin, outside clamp() and calc()
  offscale=$(printf '%s' "$text" \
    | grep -oE '(padding|gap|margin)(-[a-z]+)?\s*:[^;]+' \
    | grep -vE 'clamp\(|calc\(|var\(' \
    | grep -oE '\b[0-9]+px\b' | grep -oE '[0-9]+' \
    | awk '$1>2 && $1!=4 && $1!=8 && $1!=12 && $1!=16 && $1!=20 && $1!=24 && $1!=28 && $1!=32 && $1!=40 && $1!=48 && $1!=56 && $1!=64 && $1!=72 && $1!=88 && $1!=108 {print $1"px"; exit}')
  if [ -n "$offscale" ]; then
    block "Blocked: $offscale is not on the 4px spacing scale in $base. Use var(--s-N) from tokens.css (4 8 12 16 20 24 28 32 40 48 56 64 72 88 108). If the design genuinely needs $offscale, say so and we add a step."
  fi
fi

# ---- (c) cache-busters: warn, do not block --------------------------------
if printf '%s' "$text" | grep -qE '\?v=[0-9]+'; then
  jq -n '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"allow",
    permissionDecisionReason:"Warning: this edit adds a ?v= cache-buster. They were removed on purpose - Vercel revalidates every asset via ETag, so they do nothing except cause merge conflicts (TEXTURES.md rule 5). Allowed, but reconsider."}}'
  exit 0
fi

exit 0
