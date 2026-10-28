/* ==========================================================
   Silver Bullet: cookie consent

   A bottom banner and a settings panel, after the structure of
   epsilon.com's OneTrust banner (scouted 2026-10-27), with the parts
   that make theirs a notice rather than a gate taken out:

   - The accept button says "Accept all". Theirs says "Close".
   - Reject and Accept are the same button, same weight. Neither is the
     amber CTA: the hero already has the viewport's one amber element.
   - Nothing optional is switched on until someone switches it on.
   - It is a gate, not a notice. tracking.js loads nothing until this
     file records a yes; see the consent check there.
   - A Global Privacy Control signal keeps Advertising off whatever the
     visitor clicks, since that is the signal's whole meaning.
   - It is on screen as soon as the page is parsed, not three seconds
     and five network hops later, because it is local and builds itself.

   The choice is kept in localStorage under sb:consent:
     { v: 1, analytics: bool, ads: bool, at: ISO date }
   Raise VERSION when the categories change and everyone is asked again.

   Talks to the rest of the site two ways: a 'sb:consent' event on
   document (detail is the stored record), and window.sbConsent with
   get() and open(). The footer's "Cookie settings" button is added to
   .foot-legal by this file, so it only exists where it can work.

   Self-contained, no dependencies. Under reduced motion the panel and
   its backdrop appear without the fade.
   ========================================================== */

(function () {
  'use strict';

  var KEY = 'sb:consent';
  var VERSION = 1;
  var gpc = navigator.globalPrivacyControl === true;

  function read() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY));
      return c && c.v === VERSION ? c : null;
    } catch (e) { return null; }
  }

  function write(analytics, ads) {
    var before = read();
    var c = { v: VERSION, analytics: !!analytics, ads: !!ads && !gpc, at: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* private mode: asked again next page */ }
    document.dispatchEvent(new CustomEvent('sb:consent', { detail: c }));
    /* Taking a yes back. Tags already running cannot be unloaded, so
       clear what they set and start the page again without them. */
    if (before && ((before.analytics && !c.analytics) || (before.ads && !c.ads))) {
      clearTrackingCookies();
      location.reload();
    }
    return c;
  }

  /* Google's own cookies (_ga, _ga_*, _gid, _gcl_*), on this host and
     on the registrable domain above it, which is where GA4 puts them. */
  function clearTrackingCookies() {
    var host = location.hostname;
    var domains = ['', host, '.' + host.split('.').slice(-2).join('.')];
    document.cookie.split(';').forEach(function (pair) {
      var name = pair.split('=')[0].trim();
      if (!/^(_ga|_gid|_gcl_)/.test(name)) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  /* ---- markup ---------------------------------------------------- */

  var banner, dialog, swAnalytics, swAds;

  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function buildBanner() {
    banner = el(
      '<div class="consent" role="region" aria-label="Cookie consent" hidden>' +
        '<div class="consent__inner wrap">' +
          '<p class="consent__text">We would like to use cookies to count visits and see which ads bring people here. ' +
          'None of that loads until you choose. <strong>Accept all</strong> allows both, ' +
          '<strong>Reject all</strong> keeps only what the site needs to run, and <strong>Customize</strong> lets you pick. ' +
          '<a href="cookies.html" data-track="consent-policy">Cookie policy</a></p>' +
          '<div class="consent__actions">' +
            '<button type="button" class="consent__btn" data-consent="customize" aria-haspopup="dialog" data-track="consent-customize">Customize</button>' +
            '<button type="button" class="consent__btn consent__btn--solid" data-consent="reject" data-track="consent-reject">Reject all</button>' +
            '<button type="button" class="consent__btn consent__btn--solid" data-consent="accept" data-track="consent-accept">Accept all</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
    document.body.appendChild(banner);
  }

  function category(id, name, body, locked) {
    var control = locked
      ? '<span class="consent-cat__always">Always active</span>'
      : '<input type="checkbox" role="switch" class="consent-cat__switch" id="consent-' + id + '" ' +
          'aria-label="' + name + '" data-track="consent-toggle-' + id + '">';
    /* The switch sits beside the summary, not inside it: a control in a
       <summary> would also open and close the row on every click. */
    return (
      '<div class="consent-cat">' +
        '<details>' +
          '<summary class="consent-cat__head" data-track="consent-expand-' + id + '">' +
            '<h4 class="consent-cat__name">' + name + '</h4>' +
          '</summary>' +
          '<div class="consent-cat__body">' + body + '</div>' +
        '</details>' +
        '<div class="consent-cat__control">' + control + '</div>' +
      '</div>'
    );
  }

  function buildDialog() {
    dialog = el(
      '<dialog class="consent-panel" aria-labelledby="consent-title">' +
        '<form method="dialog" class="consent-panel__form">' +
          '<header class="consent-panel__head">' +
            '<h2 id="consent-title">Cookie settings</h2>' +
            '<button type="submit" value="cancel" class="consent-panel__close" aria-label="Close without saving" data-track="consent-panel-close"></button>' +
          '</header>' +
          '<div class="consent-panel__scroll">' +
            '<p>The site runs without cookies of its own. The two kinds below are optional and stay off unless you switch them on. ' +
            'You can change your mind any time from <strong>Cookie settings</strong> at the foot of every page.</p>' +
            '<p class="consent-panel__links"><a href="privacy.html" data-track="consent-panel-privacy">Privacy policy</a>' +
            '<a href="cookies.html" data-track="consent-panel-cookies">Cookie policy</a></p>' +
            '<h3>Manage consent preferences</h3>' +
            '<div class="consent-cats">' +
              category('necessary', 'Strictly necessary',
                '<p>What the site needs to work, and nothing that follows you anywhere else. The campaign tags from the link you arrived on, ' +
                'and anything you have typed into the enquiry form, are kept in session storage and gone when you close the tab. ' +
                'This choice is kept in your browser so we do not ask again. None of it leaves your browser unless you send the form or book a call.</p>',
                true) +
              category('analytics', 'Analytics',
                '<p>Counts visits and shows which pages get read and where visitors came from, through Google Analytics. ' +
                'It sets cookies whose names start with _ga. We see totals and trends, not names.</p>') +
              category('ads', 'Advertising',
                '<p>Tells the ad platforms we run campaigns on that a visit came from one of their ads, so we can see which ads work. ' +
                'Those platforms may connect it with what they already know about you.</p>' +
                '<p>If you are in the United States, this is the switch for opting out of the sale or sharing of your personal information. ' +
                'A Global Privacy Control signal from your browser turns it off for you.</p>' +
                (gpc ? '<p class="consent-cat__note">Your browser is sending a Global Privacy Control signal, so this stays off.</p>' : '')) +
            '</div>' +
          '</div>' +
          '<footer class="consent-panel__foot">' +
            '<button type="submit" value="reject" class="consent__btn consent__btn--solid" data-track="consent-panel-reject">Reject all</button>' +
            '<button type="submit" value="save" class="consent__btn consent__btn--solid" data-track="consent-panel-save">Save my choices</button>' +
          '</footer>' +
        '</form>' +
      '</dialog>'
    );
    document.body.appendChild(dialog);
    swAnalytics = dialog.querySelector('#consent-analytics');
    swAds = dialog.querySelector('#consent-ads');
    if (gpc) swAds.disabled = true;

    dialog.addEventListener('close', function () {
      var v = dialog.returnValue;
      if (v === 'reject') decide(false, false);
      else if (v === 'save') decide(swAnalytics.checked, swAds.checked);
      /* cancel, Esc or the X: nothing is recorded, the banner stays if it was up */
    });
    /* A click on the backdrop is a click on the dialog element itself. */
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) dialog.close('cancel');
    });
  }

  /* ---- behaviour -------------------------------------------------- */

  function decide(analytics, ads) {
    write(analytics, ads);
    banner.hidden = true;
  }

  function open() {
    if (!dialog) buildDialog();
    var c = read();
    swAnalytics.checked = !!(c && c.analytics);
    swAds.checked = !!(c && c.ads) && !gpc;
    dialog.returnValue = '';
    dialog.showModal();
  }

  function addFooterLink() {
    document.querySelectorAll('.foot-legal').forEach(function (legal) {
      var b = el('<button type="button" class="foot-legal__btn" data-track="footer-cookie-settings">Cookie settings</button>');
      b.addEventListener('click', open);
      legal.appendChild(b);
    });
  }

  function init() {
    buildBanner();
    banner.addEventListener('click', function (e) {
      var b = e.target.closest('[data-consent]');
      if (!b) return;
      var act = b.getAttribute('data-consent');
      if (act === 'accept') decide(true, true);
      else if (act === 'reject') decide(false, false);
      else open();
    });
    addFooterLink();
    if (!read()) banner.hidden = false;
  }

  window.sbConsent = { get: read, open: open };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
