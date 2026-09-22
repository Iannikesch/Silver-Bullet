/* ==========================================================
   Silver Bullet — tag loader

   Google Tag Manager and GA4, from one place. The two IDs below are
   the ONLY thing to change when the accounts exist; every page loads
   this file and nothing else knows the IDs.

   Inert until then. While an ID still reads as a placeholder (the X
   run) its loader does not run, so no request leaves the page, no
   cookie is set, and the cookie policy's "no analytics" stays true.
   The day the IDs go real, cookies.html and privacy.html must change
   with them: both currently say the site runs no analytics, and GA4
   through GTM sets _ga cookies. That is a copy job, not a code one,
   but it is not optional.

   Order of preference once live: GTM alone. GA4 belongs inside the
   container as a tag, so the gtag loader here is a fallback for a GA4
   ID with no container, and never runs alongside a real GTM ID -
   loading both would count every visit twice.

   What the page already pushes to the dataLayer, for GTM to pick up:
     contact_form_submit   the enquiry form went through (enquire.js
                           dispatches sb:enquiry-sent; this file turns
                           it into the event)
   Clicks are meant to be read off data-track="{section}-{element}"
   attributes by a GTM click trigger; see CLAUDE.md for the format.

   Loaded from <head> with async, as GTM's own snippet is, so it can
   start early without blocking paint. Self-contained, no dependencies.
   ========================================================== */

(function () {
  'use strict';

  var GTM_ID = 'GTM-XXXXXXX';      /* Tag Manager container */
  var GA4_ID = 'G-XXXXXXXXXX';     /* GA4 measurement ID, fallback only */

  var placeholder = /X{5,}/;
  var gtmLive = !placeholder.test(GTM_ID);
  var ga4Live = !placeholder.test(GA4_ID);

  window.dataLayer = window.dataLayer || [];

  /* The enquiry form reports its send here whatever the IDs say, so
     the event is queued and waiting the moment a container goes live. */
  document.addEventListener('sb:enquiry-sent', function () {
    window.dataLayer.push({ event: 'contact_form_submit' });
  });

  if (!gtmLive && !ga4Live) return;

  function script(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    var first = document.getElementsByTagName('script')[0];
    first.parentNode.insertBefore(s, first);
  }

  if (gtmLive) {
    /* Google's snippet, unminified. When the container is live, also
       add its <noscript> iframe just inside <body> on every page:
       <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
         height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript> */
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    script('https://www.googletagmanager.com/gtm.js?id=' + GTM_ID);
    return;
  }

  /* GA4 with no container: gtag directly. */
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA4_ID);
  script('https://www.googletagmanager.com/gtag/js?id=' + GA4_ID);
})();
