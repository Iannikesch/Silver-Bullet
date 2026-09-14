/* ==========================================================
   Silver Bullet — Calendly booking

   Opens a booking popup from any anchor carrying data-book,
   carries UTM attribution through to the booking record, and
   reports the booking to the dataLayer for GTM to pick up.

   Same doctrine as nav.js and vertical-rail.js: self-
   initialising, no GSAP, and the markup works with this file
   absent. Every data-book anchor keeps a real href, so with
   the script blocked the CTA still goes somewhere useful
   rather than being a dead button.

   WHY data-book AND NOT .cta: the contact form's submit
   button is also class="cta". Binding the popup to that class
   would hijack form submission - the visitor would click
   "Send it" and get a booking popup instead of sending their
   enquiry. The attribute is explicit, greppable, and changing
   which CTAs book is one attribute, not a selector rewrite.
   ========================================================== */

(function () {
  'use strict';

  /* Swap this one line when the Silver Bullet account exists.
     Nothing else in the file knows the URL. */
  var CALENDLY_URL = 'https://calendly.com/inikesch-theprofectusagency/30min';

  var WIDGET_JS  = 'https://assets.calendly.com/assets/external/widget.js';
  var UTM_KEYS   = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var UTM_STORE  = 'sb:utm';
  var LEAD_STORE = 'sb:lead';

  /* Step 5 of the brief - turning a form fill into a booked call - is
     switched off deliberately. The form still posts to a placeholder
     endpoint, so there is no successful submit to hang this off. Turning
     it on now would mean the enquiry is silently never sent while the
     visitor sees a booking popup, which looks like it worked and is worse
     than the current failure. Flip this the day the endpoint is real. */
  var FORM_HANDOFF = false;

  var booking = document.querySelectorAll('a[data-book]');
  if (!booking.length) return;


  /* ---- storage ----------------------------------------------------
     Wrapped because Safari's private mode throws on sessionStorage
     rather than returning null, and a booking CTA must never be taken
     down by a storage failure. */
  function read(key) {
    try { return JSON.parse(sessionStorage.getItem(key)) || {}; }
    catch (e) { return {}; }
  }

  function write(key, obj) {
    try { sessionStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
  }


  /* ---- UTM capture ------------------------------------------------
     Read once on load and persist, because the visitor almost never
     books on the landing page - they arrive on a campaign URL, browse,
     and click the CTA three pages later, by which point the params are
     long gone from the address bar. Direct and organic sessions store
     nothing and pass nothing, which is correct. */
  function captureUtms() {
    var found = {};
    var params = new URLSearchParams(window.location.search);
    UTM_KEYS.forEach(function (k) {
      var v = params.get(k);
      if (v) found[k] = v;
    });
    /* Only overwrite when this page actually carries UTMs. A later
       page view with no params must not wipe the campaign that brought
       them in. */
    if (Object.keys(found).length) write(UTM_STORE, found);
  }


  /* ---- prefill ----------------------------------------------------
     If the visitor typed into the contact form, carry it over so they
     are not asked twice. Read live from the fields first, then fall
     back to anything stored from an earlier page. */
  function lead() {
    var stored = read(LEAD_STORE);
    var name  = document.getElementById('cf-name');
    var email = document.getElementById('cf-email');
    var live  = {};
    if (name  && name.value.trim())  live.name  = name.value.trim();
    if (email && email.value.trim()) live.email = email.value.trim();
    if (Object.keys(live).length) {
      write(LEAD_STORE, live);
      return live;
    }
    return stored;
  }


  /* ---- the URL ----------------------------------------------------
     Built with URL/URLSearchParams so a value containing & or a space
     is encoded rather than breaking the query string. */
  function bookingUrl() {
    var url = new URL(CALENDLY_URL);
    var utms = read(UTM_STORE);

    Object.keys(utms).forEach(function (k) { url.searchParams.set(k, utms[k]); });

    var who = lead();
    if (who.name)  url.searchParams.set('name', who.name);
    if (who.email) url.searchParams.set('email', who.email);

    /* Calendly shows a GDPR banner inside the popup by default; the
       site carries its own cookie policy, so this is one consent
       prompt too many. */
    url.searchParams.set('hide_gdpr_banner', '1');

    return url.toString();
  }


  /* ---- the widget script -------------------------------------------
     Loaded on intent - first hover or focus of a booking CTA - not on
     page load. The site already pulls GSAP, ScrollTrigger and Lenis
     from CDN and has measured LCP problems before; adding ~40KB on
     every page for something most visitors never open is the wrong
     trade. Hovering buys roughly 200ms before the click lands, and the
     fallback below covers the case where it does not arrive in time. */
  var loading = false;

  function loadWidget() {
    if (loading || window.Calendly) return;
    loading = true;
    var s = document.createElement('script');
    s.src = WIDGET_JS;
    s.async = true;
    document.head.appendChild(s);
  }


  /* ---- opening ----------------------------------------------------- */
  function open(e) {
    var url = bookingUrl();

    /* Script not here yet - a fast click, a blocked CDN, an extension
       eating third-party scripts. Let the browser do what the href
       already says rather than swallowing the click and leaving a
       button that does nothing. */
    if (!window.Calendly || typeof window.Calendly.initPopupWidget !== 'function') {
      window.open(url, '_blank', 'noopener');
      return;
    }

    e.preventDefault();
    window.Calendly.initPopupWidget({ url: url });
  }

  Array.prototype.forEach.call(booking, function (a) {
    /* The href is the no-JS answer and the fallback target both. */
    a.addEventListener('pointerenter', loadWidget);
    a.addEventListener('focus', loadWidget);
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; /* let modified clicks through */
      open(e);
    });
  });


  /* ---- conversion tracking -----------------------------------------
     Calendly posts messages to the parent window from inside its
     iframe. The origin check is not optional: without it any page in
     any other frame could post a fake booking and inflate the numbers
     that ad spend is optimised against. Exact host match, not a
     substring test - "calendly.com.evil.example" contains the string. */
  function isCalendly(origin) {
    return origin === 'https://calendly.com' ||
           /^https:\/\/[a-z0-9-]+\.calendly\.com$/.test(origin);
  }

  window.dataLayer = window.dataLayer || [];

  window.addEventListener('message', function (e) {
    if (!isCalendly(e.origin)) return;
    if (!e.data || typeof e.data.event !== 'string') return;
    if (e.data.event.indexOf('calendly.') !== 0) return;

    var utms = read(UTM_STORE);

    /* The booking itself. This is the conversion of record. */
    if (e.data.event === 'calendly.event_scheduled') {
      window.dataLayer.push({
        event: 'calendly_booking_complete',
        booking_source: 'popup',
        utm_source:   utms.utm_source   || null,
        utm_medium:   utms.utm_medium   || null,
        utm_campaign: utms.utm_campaign || null,
        utm_content:  utms.utm_content  || null,
        utm_term:     utms.utm_term     || null
      });
    }

    /* Funnel step: the popup opened and rendered a real calendar.
       Useful as the denominator for the booking rate. */
    if (e.data.event === 'calendly.event_type_viewed') {
      window.dataLayer.push({
        event: 'calendly_event_type_viewed',
        utm_source:   utms.utm_source   || null,
        utm_campaign: utms.utm_campaign || null
      });
    }
  });


  /* ---- form handoff (off until the endpoint exists) ----------------- */
  var form = document.querySelector('form.cform');

  if (form) {
    /* Capture what they typed even without the handoff, so a visitor who
       fills the form and then clicks a booking CTA is not asked twice. */
    form.addEventListener('input', function () { lead(); });

    if (FORM_HANDOFF) {
      form.addEventListener('submit', function (e) {
        window.dataLayer.push({ event: 'contact_form_submit' });
        e.preventDefault();
        open(e);
      });
    }
  }


  captureUtms();
})();
