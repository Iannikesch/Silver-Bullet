/* ==========================================================
   Silver Bullet — the bullet intro

   Deliberately free of dependencies, and loaded BEFORE the motion
   libraries so it never waits on a CDN. As a deferred script placed
   after them it would only start once GSAP, ScrollTrigger and Lenis
   had all downloaded — the page would sit in its finished
   state and then suddenly play the intro.

   The sequence itself is CSS, orchestrated by .is-intro on <body>.
   ========================================================== */

(function () {
  'use strict';

  /* The bullet flies on every ARRIVAL - a fresh visit, a refresh, a typed
     URL, a link from anywhere else - and not on a click between pages of
     this site.

     It used to be once per browser session, held in sessionStorage. That
     was to fix a real thing: every page carries .intro-layer, and replayed
     on every internal click the sequence read as the banner glitching -
     click a case card and the ticker rides out and back for no reason. But
     "once per session" also meant a refresh never showed it again, and the
     bullet is the one thing this site does that nobody else's does.

     So the gate is now WHERE YOU CAME FROM, read off the Navigation Timing
     entry and the referrer, and it stores nothing:

       reload        -> play. A refresh always gets the bullet.
       back_forward  -> skip. Going back should restore scroll, not replay.
       navigate      -> play unless the referrer is this site, which means
                        an internal link. Typed, bookmarked, external,
                        no referrer at all: play.

     This also removed the site's only client-side storage - the cookie
     policy used to describe that flag, and has been updated. */
  function arrivedFromInside() {
    var entry = (performance.getEntriesByType &&
                 performance.getEntriesByType('navigation')[0]) || null;
    var type = entry ? entry.type : 'navigate';
    if (type === 'reload') return false;
    if (type === 'back_forward') return true;
    try {
      if (!document.referrer) return false;
      return new URL(document.referrer).origin === location.origin;
    } catch (e) { return false; }
  }

  var TOTAL_MS = 2400;         // full sequence, including the page fade

  var body = document.body;
  var layer = document.querySelector('.intro-layer');
  var logo = document.querySelector('.logo');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var skip = arrivedFromInside();

  if (reduced || skip || !layer || !logo) {
    if (layer) layer.remove();
    return;   /* scrollRestoration deliberately left alone — see below */
  }

  /* ---- the page must be at the top for any of this to make sense ----
     Browsers restore the previous scroll position on reload, and the
     intro assumes it is playing at the top of the document: the bullet
     crosses the viewport, draws the nav rule and hands off to the logo,
     while <main> fades up underneath. Reload while scrolled down and
     all of that plays over the middle of the page, which reads as the
     animation glitching rather than as the page being scrolled.

     It only looks broken SOME of the time, which is what makes it hard
     to place: it depends entirely on where you happened to be when you
     hit reload.

     Taken over only on the path where the intro actually runs. The
     early return above leaves scrollRestoration at 'auto', so an
     internal click or a back/forward that skips the intro keeps normal
     browser behaviour and lands where it should.

     The cost worth knowing: a REFRESH now plays the intro, and the intro
     needs the top of the page, so refreshing while scrolled down brings
     you back to the top. That is the trade for the bullet on every
     refresh, and it is deliberate.

     Set before .is-intro is added, and before Lenis exists — motion.js
     loads after this file, so Lenis reads a document already at 0. */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  /* Measure the logo where it naturally sits, then work out how far right
     it would have to start to be dead centre. The animation runs that in
     reverse: centre -> resting place. */
  var box = logo.getBoundingClientRect();
  var shift = (window.innerWidth / 2) - (box.left + box.width / 2);
  document.documentElement.style.setProperty('--logo-shift', shift + 'px');

  var done = false;
  function finish() {
    if (done) return;
    done = true;
    body.classList.remove('is-intro');
    if (layer) layer.remove();
    window.removeEventListener('wheel', finish);
    window.removeEventListener('touchstart', finish);
    window.removeEventListener('keydown', finish);
    window.removeEventListener('pointerdown', finish);
  }

  body.classList.add('is-intro');

  /* Any sign of impatience skips straight to the finished state. */
  window.addEventListener('wheel', finish, { passive: true, once: true });
  window.addEventListener('touchstart', finish, { passive: true, once: true });
  window.addEventListener('keydown', finish, { once: true });
  window.addEventListener('pointerdown', finish, { once: true });

  setTimeout(finish, TOTAL_MS);
})();
