/* ==========================================================
   Silver Bullet — the hero reel

   Two short clips take turns in one portrait window. The cycle:

     arrive   the clip slides up into the frame and eases to a stop
     hold     it plays through - the frame is the clip, nothing else
     leave    it slides up and out, a touch quicker than it came
     ...and the other clip is already sliding in underneath.

   The cycle is driven by each clip's own `ended` event, so a clip always
   plays out in full before it goes, whatever its length. The slides are
   CSS transitions on two classes (see .hero__clip in site.css); this file
   only decides when to add them.

   Same doctrine as nav.js and the slider: self-initialising, no GSAP, and
   the page is correct without it - a <noscript> rule removes the window
   entirely, so a no-JS visitor gets a one-column hero rather than an
   empty frame.

   It also decides what gets DOWNLOADED. The clips carry preload="none"
   and no autoplay attribute, so nothing is fetched until this file says
   so - and it never says so under 760px (the window is display:none
   there) or under prefers-reduced-motion, where the first clip is asked
   for its first frame only and left as a still.
   ========================================================== */

(function () {
  'use strict';

  var reel = document.querySelector('[data-reel]');
  if (!reel) return;
  var clips = Array.prototype.slice.call(reel.querySelectorAll('.hero__clip'));
  if (clips.length < 2) return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NARROW  = window.matchMedia('(max-width: 760px)');

  /* A clip that cannot play (autoplay refused, decode error, a stalled
     network) must not stall the reel. If `ended` has not arrived this
     long after the hold began, move on anyway. Both clips are ~5s. */
  var HOLD_CEILING_MS = 9000;
  /* How far into the exit the next clip starts its arrival, so the two
     overlap and the window is never empty. */
  var HANDOFF_MS = 120;

  if (REDUCED) {
    /* A still, not a reel: first frame of the first clip, nothing plays. */
    clips[0].preload = 'metadata';
    clips[0].load();
    return;
  }

  var current = -1;
  var holdTimer = null;
  var onstage = true;
  var started = false;

  function next(i) { return (i + 1) % clips.length; }

  function afterTransition(el, fn) {
    var done = false;
    function h(e) { if (e.target !== el || done) return; done = true; el.removeEventListener('transitionend', h); fn(); }
    el.addEventListener('transitionend', h);
    /* transitionend can be lost if the tab is hidden mid-slide; do not
       let that freeze the reel. */
    setTimeout(function () { if (!done) { done = true; el.removeEventListener('transitionend', h); fn(); } }, 1400);
  }

  function park(clip) {
    clip.classList.add('is-reset');
    clip.classList.remove('is-in', 'is-out');
    try { clip.pause(); clip.currentTime = 0; } catch (e) {}
    /* two frames, so the reset lands before transitions come back on */
    requestAnimationFrame(function () { requestAnimationFrame(function () { clip.classList.remove('is-reset'); }); });
  }

  function arrive(i) {
    current = i;
    var clip = clips[i];
    var following = clips[next(i)];

    /* The one after this needs to be ready by the time this one leaves. */
    if (following.preload !== 'auto') { following.preload = 'auto'; following.load(); }

    clip.classList.add('is-in');
    afterTransition(clip, function () {
      if (current !== i || !onstage) return;
      hold(i);
    });
  }

  function hold(i) {
    var clip = clips[i];
    clearTimeout(holdTimer);
    holdTimer = setTimeout(function () { if (current === i) leave(i); }, HOLD_CEILING_MS);

    clip.addEventListener('ended', function onEnd() {
      clip.removeEventListener('ended', onEnd);
      if (current === i) leave(i);
    });

    var p = clip.play();
    if (p && p.catch) {
      p.catch(function () {
        /* Refused. Leave the first frame up for a beat, then move on. */
        clearTimeout(holdTimer);
        holdTimer = setTimeout(function () { if (current === i) leave(i); }, 2500);
      });
    }
  }

  function leave(i) {
    clearTimeout(holdTimer);
    var clip = clips[i];
    clip.classList.add('is-out');
    afterTransition(clip, function () { park(clip); });
    /* The handoff: the next one starts coming in while this one is on
       its way out, so the window never sits empty. */
    setTimeout(function () { if (onstage) arrive(next(i)); }, HANDOFF_MS);
  }

  /* ---- start, and only when it is worth starting ------------------ */

  function start() {
    if (started || NARROW.matches) return;
    started = true;
    clips[0].preload = 'auto';
    clips[0].load();
    arrive(0);
  }

  /* Off screen or in a background tab, the current clip pauses and the
     cycle simply waits - `ended` cannot fire while paused, so nothing
     advances behind the visitor's back. Back on, it resumes where it was. */
  function pauseAll() {
    onstage = false;
    clearTimeout(holdTimer);
    clips.forEach(function (c) { try { c.pause(); } catch (e) {} });
  }
  function resume() {
    onstage = true;
    if (!started) { start(); return; }
    if (current < 0) return;
    var clip = clips[current];
    if (clip.classList.contains('is-in') && !clip.classList.contains('is-out')) {
      hold(current);
    }
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !document.hidden) resume(); else pauseAll();
    }, { threshold: 0.2 }).observe(reel);
  } else {
    start();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pauseAll(); else resume();
  });

  /* Crossing the breakpoint with the reel running: stop it and drop the
     buffers. Crossing back: it starts again from the top. */
  NARROW.addEventListener('change', function (e) {
    if (e.matches) { pauseAll(); started = false; current = -1; clips.forEach(park); }
    else resume();
  });
})();
