# Launch — what stands between this site and the live domain

Internal. Excluded from the deploy by `.vercelignore` like the other docs.

Every item here was verified against the working tree on the date shown, not
carried over from memory. Re-verify before trusting a status older than a day —
three sessions edit this repo concurrently and things move without warning.

**Last verified: 16 September 2026, `feat/work-2` at `668e194`.**

The domain currently serves a GoDaddy "coming soon" page (title "Silver Bullet
Ads", generator "Go Daddy Website Builder"). Our site is not public. That is
breathing room on the legal items, not a reprieve.

---

## 1. Legal — decide before the domain goes public

| | Status | Owner |
|---|---|---|
| Client wall shows **OpenAI, Smoothie King, Skyrizi** (AbbVie) | 🔴 unchanged | owner |
| Testimonials attributed to **named people with job titles** | 🔴 unchanged | owner |
| Privacy / Terms / Cookies pages | 🟡 exist, full of placeholders | owner + whoever holds the facts |

**Client wall.** Three real, heavily-lawyered organisations under "Companies who
trust us." Published, that is a false-endorsement claim and a trademark
exposure. Either written permission from each, or swap for invented names —
Oakmont Roofing, Evertrail, Blackridge and the rest already prove the section
works with zero risk. The swap is ten minutes. The decision is not mine.

**Testimonials.** Placeholder *numbers* were signed off for the prototype.
Since then the quotes acquired names and titles: "Dana, owner, Mantis Moving &
Storage", "Robert Ainsley, president, Vitality Mechanical". Named individuals
saying specific things is a different category from a placeholder figure. If
invented, drop to unattributed or role-only before public.

**Legal pages.** `privacy.html`, `terms.html` and `cookies.html` now exist and
are linked from the footer of every page. They carry these placeholders, every
one of which is a fact only the business can supply:

```
REPLACE_WITH_LEGAL_ENTITY        x4   the registered company name
REPLACE_WITH_BUSINESS_ADDRESS    x4   a real postal address
REPLACE_WITH_GOVERNING_STATE     x2   which state's law governs the terms
REPLACE_WITH_EFFECTIVE_DATE      x3
REPLACE_WITH_PRIVACY_EMAIL       x5   probably contact@, needs confirming
REPLACE_WITH_FORM_PROCESSOR      x1   depends on the form decision below
REPLACE_WITH_EMAIL_PROVIDER      x1   Google Workspace — confirmed via DNS
REPLACE_WITH_RETENTION_PERIOD    x1   how long form submissions are kept
```

Google Ads and Meta both require a reachable privacy policy on the landing
domain before they will run traffic. For a performance agency that gates our
own advertising, not just compliance.

---

## 2. Conversion plumbing — the site currently converts at zero

| | Status | Needs |
|---|---|---|
| Calendly | 🟢 wired — `calendly.com/inikesch-theprofectusagency/30min` | see note |
| Enquiry form endpoint | 🔴 `REPLACE_WITH_FORM_ENDPOINT` on 7 pages | a decision |
| Social links | 🔴 6 icons × every page → `href="#"` | which are real |
| VSL video | 🔴 "VSL goes here" placeholder in the hero | the video |
| Contact email | 🟢 `contact@silverbulletagency.com` on 7 pages + schema | — |

**Calendly note.** The booking URL is under `inikesch-theprofectusagency`. If
that Calendly account is branded "The Profectus Agency", the visitor clicks
"Book a call" on Silver Bullet and lands on a page for a different company.
Worth checking what the booking page actually shows before it goes live.

**Form endpoint.** Today a submit navigates to a relative path that 404s *and
loses everything the person typed*. Worse than a dead link. Three routes, and
each trips a "don't touch without asking" rule in CLAUDE.md:

1. **Form service** (Formspree, Basin, Web3Forms). Paste one URL into
   `action` on 7 pages. Buildless, works on static Vercel unchanged, two
   minutes once the URL exists. Third party sees the data. *Recommended.*
2. **Vercel serverless function** + Resend/SendGrid. Nothing third-party sees
   it. Adds a function and an env var — changes the deploy setup.
3. **`mailto:` action.** Zero services, and genuinely bad: opens the visitor's
   mail client, blocked by several browsers, often does nothing on mobile.
   Looks wired while being worse than the plain email link under the form.

Whichever is chosen also answers `REPLACE_WITH_FORM_PROCESSOR` on the privacy
page, and needs a success state — even a working endpoint today would dump
people on a bare confirmation.

**Socials.** Delete the platforms we are not on. An icon linking nowhere is
worse than no icon.

**VSL.** The placeholder text is currently the element Google measures for
page-speed scoring (LCP). The number changes when the real embed lands.
Re-measure then.

---

## 3. Email — contact@silverbulletagency.com

Verified by DNS lookup, 10 September:

| Record | Status |
|---|---|
| MX | 🟢 Google Workspace (`smtp.google.com`) |
| DKIM | 🟢 `google` selector present |
| DMARC | 🟡 present, `p=quarantine`, reports → GoDaddy default address |
| **SPF** | 🔴 **missing entirely** |

**The gap.** DMARC is set to quarantine failures, and SPF — one of the two
checks that prevents failures — does not exist. Replies sent from Gmail pass
on DKIM alone and are fine. **Anything else sending as contact@ — a form
service, an autoresponder, a newsletter — fails both checks and lands in
spam.** That is exactly the form-notification scenario above, already primed
to fail silently.

**The fix** is one DNS TXT record on the root domain, at GoDaddy, not in the
site:

```
v=spf1 include:_spf.google.com ~all
```

Any later sending service adds its own `include:` to that same line.

**Also ask:** point DMARC's `rua=` at a real inbox instead of
`dmarc_rua@onsecureserver.net` — that is how you find out someone is forging
the address, and right now nobody at Silver Bullet would ever see it.

**Still undecided — these change what gets built:**
- Do form leads go to contact@, or a separate inbox?
- One email per lead, or a daily digest?
- Set the lead's address as reply-to, so Reply just works? (almost certainly yes)
- Auto-confirmation to the lead? (instinct: no — it contradicts the not-a-pitch tone; a fast human reply instead, if "we read every one" is true)
- Do leads also need to land in a CRM / sheet / Slack?
- Where do Calendly's own booking notifications go?
- Is the mailbox a real inbox or a forwarding alias? (an alias can't reply *from* contact@)

---

## 4. Facts that stop the guessing

- **Public address and phone?** Feeds the legal pages *and* the homepage
  schema, which declares `ProfessionalService` — a local-business type — with
  neither. If there is no public address, change the type to plain
  `Organization`. Either answer is fine; it just needs one.
- **Which analytics?** None is installed. We cannot measure a visit. Note this
  interacts with the cookie page: analytics plus EU visitors means the cookie
  banner has to actually do something.

---

## 5. Open, not urgent

- Brand colours, typography and logo are marked undecided in CLAUDE.md, yet
  the site is fully built on a specific palette and type. Is that the brand
  now, or still a placeholder?
- Copy is marked provisional in CLAUDE.md. It is written and shipping-quality.
  Final, or not?
- One page plus sub-pages, or split further?

---

## 6. Known regressions — mine to report, someone's to decide

- **The capabilities arrival sweep is dead site-wide.** `fbb09e9` replaced the
  homepage capabilities grid with the verticals rail, so `boot.js` calls
  `initGridSweep('.cap-grid')` against nothing. It fails silently. DESIGN.md
  still cites the sweep as precedent for the client-wall reveal. Options:
  re-point it at a surface it wasn't designed for, or delete it and correct
  DESIGN.md. Not re-pointed — a design decision.
- **Rail cards 3–4 fail WCAG AA contrast** while dimmed by the depth falloff.
  Deliberate design, and `prefers-reduced-motion` flattens it to full opacity.
  Recorded, not changed.
- `.cap-row__num` on capabilities.html is `--steel-900` at 3.11:1. An existing
  token doing what DESIGN.md sanctions. Recorded, not changed.

---

## Fastest unblocks, in order

1. **SPF record** — one line at GoDaddy, prevents the form from silently failing later.
2. **Which socials are real** — answer in a sentence, fixed in minutes.
3. **Form endpoint decision** — the site converts at zero until this lands.
4. **Client wall permission or swap** — gates public launch.
5. **Legal-page facts** — entity, address, state. Gates ads.
