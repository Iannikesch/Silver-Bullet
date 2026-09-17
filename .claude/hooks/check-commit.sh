#!/bin/bash
# PreToolUse hook for Bash, gated on `git commit` by the "if" in settings.json.
# Blocks (exit 2) any commit with a staged file over 3MB and prints the
# re-encode command. Claude Code has no git-level hook event, so this catches
# commits Claude makes; .githooks/pre-commit catches ones typed in a terminal.

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
limit=3000000
over=""
while IFS= read -r f; do
  [ -f "$f" ] || continue
  sz=$(stat -f %z "$f" 2>/dev/null || stat -c %s "$f" 2>/dev/null)
  [ "$sz" -gt "$limit" ] && over="$over$f ($(( sz / 1048576 ))MB)
"
done < <(git diff --cached --name-only --diff-filter=AM)

[ -z "$over" ] && exit 0

{
  printf 'Blocked: commit has a staged file over 3MB. Re-encode first, then re-stage:\n%s' "$over"
  printf '%s\n' "$over" | while IFS= read -r line; do
    f="${line%% (*}"; [ -z "$f" ] && continue
    case "${f##*.}" in
      mp4|mov|webm) printf '  ffmpeg -i "%s" -c:v libx264 -preset slow -crf 26 -maxrate 2M -bufsize 4M -vf "scale=-2:960" -an -movflags +faststart "%s.small.mp4"\n' "$f" "${f%.*}";;
      png|jpg|jpeg) printf '  cwebp -q 82 "%s" -o "%s.webp"\n' "$f" "${f%.*}";;
      *)            printf '  (no standard re-encode for .%s - shrink it or do not commit it)\n' "${f##*.}";;
    esac
  done
} >&2
exit 2
