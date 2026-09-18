# Learning log

What I tried, what went wrong, what would have prevented it, the lesson.
Chronological. Entries are never rewritten. Each one stays under five lines.
When the same mistake shows up three times it goes under "Still not learned"
at the top, and stays there until it stops.

## Still not learned

*(nothing yet - the seed entries below each happened once, or were fixed
structurally before they could recur)*

---

## 2026-09-07 to 2026-09-17: cache-busters, four rounds

Tried: hand-bump `?v=N` on every asset tag to defeat stale caches. Wrong: every
branch bumped the same lines, so every merge conflicted on 13 pages, four
rounds running. Then `curl -I` showed Vercel revalidates via ETag on every load;
the strings never did anything. Prevented by: checking what the host sends
before building a workaround. Lesson: measure the problem before solving it.

## 2026-09-16: five branches on shared CSS

Tried: five worktrees in parallel to go faster. Wrong: all five edited
`site.css` and `index.html`; every merge was a resolution session and the fifth
landed on a base the first never saw. Prevented by: the file ownership map now
in CLAUDE.md, and `/branches` before starting. Lesson: parallel is only faster
when the work does not share files.

## 2026-09-17: a 13MB video above the fold

Tried: land the hero reel. Wrong: `hero-reel-1.mp4` committed at 13.1MB and
21.7 Mbps for a slot that needs ~2; its sibling was 1.7MB. Nobody checked
because nobody was looking. Prevented by: a hook blocking commits over 3MB,
and `asset-cop` in `/ship`. Lesson: the repo should refuse the file, not rely
on someone noticing.

## 2026-09-17: motion built from a vague description, rebuilt

Tried: fix "the page it lands on is disgusting" by guessing which part. Wrong:
guessed the header, reverted four commits of nav work the owner liked, then
reversed it all once "the page it lands on" turned out to be a section titled
exactly that. Prevented by: CLAUDE.md rule 1 (ask concrete questions first)
and rule 3 (ask for the screenshot). Lesson: a vague brief is a question.

## 2026-09-17: a new file never staged

Tried: commit work-5's text roll and merge it. Wrong: `roll.js` was new, and
`git add -u` only stages files git already tracks, so main shipped a script
tag pointing at a 404 on every page. A missing deferred script fails silently;
a browser probe found zero rolled labels. Prevented by: `git status` before
every commit, `/ship` verifying in a browser. Lesson: `-u` is not "all".

## 2026-09-17: the shorthand that zeroes a gutter, again

Tried: a capability page template. Wrong: `.cap-page { padding: X 0 Y }` on an
element that is also `.wrap`, so the horizontal gutter went to 0 and the title
sat on the viewport edge. capabilities.html has a comment warning about this
exact rule two screens up. Also: a Playwright touch-emulation call stuck after
a thrown test and made the next three desktop runs report hover as broken.
Prevented by: reading the comment, and a fresh page per test run. Lesson:
`padding-block` on anything that is also `.wrap`; never trust a probe after a
throw.

## 2026-09-18: a chart that rendered black

Tried: replace the bore band with three SVG charts. Wrong: the first render
was all default-black SVG in normal flow, and I spent a pass suspecting a CSS
parse error before finding it was the browser's cached site.css. The `?v=`
busters are gone by design, and `Network.setCacheDisabled` does nothing
unless `Network.enable` was sent first on that session. Prevented by: a fresh
page with the cache actually cleared before judging any CSS change. Lesson:
when every new rule fails at once, suspect the cache before the code.
