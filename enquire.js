/* ==========================================================
   Silver Bullet — enquiry form

   The form is fully visible at the bottom of every page. This file
   does four things: fills the hidden attribution fields, trims and
   re-validates before anything is sent, screens out bots, and posts
   in place so the visitor is not dumped on a bare confirmation page.

   Self-initialising, GSAP-free, same as nav.js. Everything except
   the posting works with the endpoint still a placeholder, because
   attribution has to be captured on the page a visitor lands on,
   not on the page they submit from.
   ========================================================== */

(function () {
  'use strict';

  var reveal = document.querySelector('.cform-wrap');
  if (!reveal) return;

  var form = reveal.querySelector('.cform');
  if (!form) return;

  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
                  'utm_term', 'gclid', 'fbclid'];
  var STORE = 'sb:attribution';

  function field(name) { return form.querySelector('[name="' + name + '"]'); }
  function setHidden(name, value) { var el = field(name); if (el) el.value = value || ''; }


  /* ---- attribution -------------------------------------------------
     Captured once on arrival and kept for the session, because nobody
     enquires on the page they land on: they arrive on a campaign URL,
     read three pages, and submit from the last one, by which point the
     parameters are long gone from the address bar.

     Stored rather than read live for the same reason. A later page view
     with no parameters must not wipe the campaign that brought them in,
     so only a page that actually carries UTMs overwrites what is held.
     Direct and organic visits store nothing and send empty strings,
     which is correct and is what "direct" looks like in a CRM. */
  function readStore() {
    try { return JSON.parse(sessionStorage.getItem(STORE)) || {}; }
    catch (e) { return {}; }      /* Safari private mode throws rather than returning null */
  }

  function captureAttribution() {
    var stored = readStore();
    var params = new URLSearchParams(window.location.search);
    var found = {};

    UTM_KEYS.forEach(function (k) {
      var v = params.get(k);
      if (v) found[k] = v.slice(0, 255);
    });

    /* First touch wins for the campaign, but the landing page and referrer
       are only meaningful from the first page of the visit. */
    if (!stored.landing_page) {
      found.landing_page = (location.pathname + location.search).slice(0, 255);
      /* An internal referrer is just the previous page of this visit, not
         a source. Only an external one says where they came from. */
      var ref = document.referrer;
      try {
        found.referrer = (ref && new URL(ref).origin !== location.origin) ? ref.slice(0, 255) : '';
      } catch (e) { found.referrer = ''; }
    }

    if (Object.keys(found).length) {
      var merged = {};
      Object.keys(stored).forEach(function (k) { merged[k] = stored[k]; });
      Object.keys(found).forEach(function (k) { merged[k] = found[k]; });
      try { sessionStorage.setItem(STORE, JSON.stringify(merged)); } catch (e) {}
      stored = merged;
    }

    UTM_KEYS.forEach(function (k) { setHidden(k, stored[k]); });
    setHidden('landing_page', stored.landing_page);
    setHidden('referrer', stored.referrer);
    setHidden('page_url', (location.pathname + location.search).slice(0, 255));
    setHidden('form_render_ts', String(Date.now()));
  }

  captureAttribution();


  /* ---- trim and re-validate ----------------------------------------
     required only checks that a field is non-empty, and a single space
     is non-empty. Without this, a name of "   " and a goal of "\n \n"
     satisfy every constraint and arrive in the CRM as a blank lead that
     someone still has to work through. Trimming first means required
     means what everyone assumes it means.

     Written back into the field rather than only into the payload, so
     what the visitor sees is what gets sent, and so the browser's own
     validation runs against the trimmed value. */
  function trimFields() {
    var controls = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea');
    Array.prototype.forEach.call(controls, function (el) {
      if (el.name === 'company_url') return;          /* the trap keeps whatever it caught */
      var t = el.value.trim().replace(/\s{2,}/g, ' ');
      if (t !== el.value) el.value = t;
    });
  }


  /* ---- bot screening ------------------------------------------------
     Two cheap checks that between them stop the overwhelming majority of
     automated submissions, neither of which a real visitor can trip.

     Both are silent: a caught bot is shown the same confirmation as a
     real visitor and nothing is sent. Telling a bot it was caught only
     teaches whoever wrote it which check to defeat.

     Client-side only, so treat this as noise reduction rather than as
     security. The endpoint must run the same two checks, because a bot
     posting straight to the URL never executes any of this. */
  var MIN_FILL_MS = 3000;

  function looksAutomated() {
    var trap = field('company_url');
    if (trap && trap.value !== '') return true;

    var rendered = Number(field('form_render_ts') && field('form_render_ts').value);
    if (rendered && (Date.now() - rendered) < MIN_FILL_MS) return true;

    return false;
  }


  /* ---- submission ---------------------------------------------------
     Guarded on the endpoint: while action is still the REPLACE_WITH
     placeholder this binds nothing and the form falls through to a
     normal submit, which fails visibly, which is the point of the
     placeholder. The moment a real URL is in action, this is live with
     no other change. */
  var action = form.getAttribute('action') || '';
  if (!/^https?:\/\//.test(action)) return;

  var done = reveal.querySelector('.cform__done');
  var fail = reveal.querySelector('.cform__fail');
  var button = form.querySelector('button[type="submit"]');
  var sending = false;

  function showDone() {
    form.hidden = true;
    if (done) {
      done.hidden = false;
      done.setAttribute('tabindex', '-1');
      done.focus();
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    /* The disabled button already stops a click and an Enter, but not a
       programmatic submit. One flag closes that and costs nothing. */
    if (sending) return;

    trimFields();

    /* Re-check after trimming: a field that held only spaces is empty now,
       and the browser should say so in its own words rather than the post
       going out with it blank. */
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (looksAutomated()) { showDone(); return; }

    sending = true;
    if (fail) fail.hidden = true;
    if (button) { button.disabled = true; button.textContent = 'Sending…'; }

    fetch(action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      showDone();
      /* Tell anyone listening that the enquiry went through. tracking.js
         turns this into the dataLayer event; this file never pushes one
         itself, so the form has exactly one owner and reports once. */
      form.dispatchEvent(new CustomEvent('sb:enquiry-sent', { bubbles: true }));
    }).catch(function () {
      sending = false;
      if (fail) {
        fail.hidden = false;
        fail.setAttribute('tabindex', '-1');
        fail.focus();     /* role="alert" announces it; focus makes it findable again */
      }
      if (button) { button.disabled = false; button.textContent = 'Send it'; }
    });
  });
})();
