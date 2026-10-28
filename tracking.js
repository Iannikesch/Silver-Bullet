/* ==========================================================
   Silver Bullet — tag loader

   Google Tag Manager and GA4, from one place. The two IDs below are
   the ONLY thing to change when the accounts exist; every page loads
   this file and nothing else knows the IDs.

   Inert until then. While an ID still reads as a placeholder (the X
   run) its loader does not run, so no request leaves the page and no
   cookie is set.

   Gated on consent once the IDs are real. Nothing loads until the
   visitor has said yes to Analytics or Advertising in the cookie
   banner (consent.js, which stores the answer in localStorage under
   sb:consent and announces it with a 'sb:consent' event). Then the
   container loads with Google's Consent Mode set to exactly what was
   accepted, so an ad tag inside GTM stays off for someone who only
   accepted analytics. Taking a yes back reloads the page (consent.js
   does that), because a running tag cannot be unloaded. cookies.html
   and privacy.html describe this; keep them in step with it.

   Order of preference once live: GTM alone. GA4 belongs inside the
   container as a tag, so the gtag loader here is a fallback for a GA4
   ID with no container, and never runs alongside a real GTM ID -
   loading both would count every visit twice.

   What the page already pushes to the dataLayer, for GTM to pick up:
     contact_form_submit   the enquiry form went through (enquire.js
                           dispatches sb:enquiry-sent; this file turns
                           it into the event)
     calendly_event_type_viewed / calendly_booking_complete
                           the booking popup rendered / a call was
                           booked, with the visit's UTMs (booking.js)
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

  /* Google's queue function, which Consent Mode commands go through as
     well as gtag's. It has to push the arguments object itself, not an
     array: that is how the libraries tell a command from an event. */
  function gtag() { window.dataLayer.push(arguments); }

  /* consent.js's record. VERSION there and the 1 here move together. */
  function stored() {
    try {
      var c = JSON.parse(localStorage.getItem('sb:consent'));
      return c && c.v === 1 ? c : null;
    } catch (e) { return null; }
  }

  function modes(c) {
    var ads = c.ads ? 'granted' : 'denied';
    return {
      analytics_storage: c.analytics ? 'granted' : 'denied',
      ad_storage: ads, ad_user_data: ads, ad_personalization: ads
    };
  }

  function script(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    var first = document.getElementsByTagName('script')[0];
    first.parentNode.insertBefore(s, first);
  }

  var loaded = false;

  function load(c) {
    if (!c || !(c.analytics || c.ads)) return;
    /* Already running and the visitor allowed more: say so. Allowing
       less never arrives here, consent.js reloads the page instead. */
    if (loaded) { gtag('consent', 'update', modes(c)); return; }
    loaded = true;
    gtag('consent', 'default', modes(c));

    if (gtmLive) {
      /* Google's snippet, unminified. Do NOT add the container's
         <noscript> iframe: with no JavaScript there is no banner, so
         it would track visitors who were never asked. */
      window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      script('https://www.googletagmanager.com/gtm.js?id=' + GTM_ID);
      return;
    }

    /* GA4 with no container: gtag directly. */
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA4_ID);
    script('https://www.googletagmanager.com/gtag/js?id=' + GA4_ID);
  }

  load(stored());
  document.addEventListener('sb:consent', function (e) { load(e.detail); });
})();
