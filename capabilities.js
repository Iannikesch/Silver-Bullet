/* ==========================================================
   Silver Bullet — capabilities: the one place they live

   Two things read from this file and nothing else does:

     - the Capabilities group links in the nav, on every page
     - the two-panel Capabilities section on capabilities.html

   Change a group's name, its one-line descriptor, or which
   capabilities sit under it HERE and both update. Nothing about
   the groups is written anywhere else.

   TO RENAME THE GROUPS: edit `label` on the two group entries
   below. Leave `key` alone — it is what data-track attributes,
   anchor IDs and the CSS are built from, so the GA4 event names
   survive a rename.

   The capability names and descriptions are the six the site
   already carried, unchanged. Do not add a seventh here without
   also giving it a page on capabilities.html, which is where the
   section links each one (further down the same page).

   No GSAP, no dependencies. Self-initialising, same doctrine as
   nav.js and testimonial-slider.js.
   ========================================================== */

(function () {
  'use strict';

  var CAPS = {

    /* ---- the groups ------------------------------------------------
       Order here is display order: first panel on the left, first
       column in the dropdown, first accordion on mobile. */
    groups: [
      {
        key:     'b2b',
        label:   'B2B',
        tagline: 'For businesses that sell to other businesses.',
        items:   ['paid-acquisition', 'landing-pages', 'offer-positioning', 'tracking-attribution']
      },
      {
        key:     'b2c',
        label:   'B2C',
        tagline: 'For businesses that sell direct to consumers.',
        items:   ['paid-acquisition', 'landing-pages', 'offer-positioning', 'tracking-attribution', 'creative-production', 'lifecycle-retention']
      },
      {
        /* Added with the inline nav. The four items are a first cut of
           what an agency would hand us - the buying, the pages, the
           measurement, the creative - and are a guess to be confirmed;
           the tagline likewise. Change either here and both the nav and
           the capabilities page follow. */
        key:     'agencies',
        label:   'Agencies',
        tagline: 'For agencies that need a performance partner behind them.',
        items:   ['paid-acquisition', 'landing-pages', 'tracking-attribution', 'creative-production']
      }
    ],

    /* ---- the capabilities ------------------------------------------
       Keyed by the slug capabilities.html already uses for each one, so
       the section can link straight to the fuller treatment. */
    capabilities: {
      'paid-acquisition':     { name: 'Paid acquisition',        desc: 'Search and social managed to pipeline and profit, not impressions.' },
      'landing-pages':        { name: 'Landing pages',           desc: 'Fast pages built to convert the traffic you are already paying for.' },
      'offer-positioning':    { name: 'Offer and positioning',   desc: 'Often the cheapest fix. What you sell and how you frame it beats ad spend.' },
      'tracking-attribution': { name: 'Tracking and attribution', desc: 'Clean measurement. Our compensation depends on it being honest.' },
      'creative-production':  { name: 'Creative production',     desc: 'Photo, video and ad creative built for the platform it runs on.' },
      'lifecycle-retention':  { name: 'Lifecycle and retention', desc: 'Email and follow-up, so acquisition spend compounds instead of leaking.' }
    }
  };

  window.SB_CAPS = CAPS;

  /* The section lives on capabilities.html. From any other page the
     dropdown has to cross to it first; on that page the links are
     in-page anchors and Lenis carries them. */
  var SECTION_PAGE = /(^|\/)capabilities\.html$/.test(location.pathname) ? '' : 'capabilities.html';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---- the nav: the groups, inline ----------------------------------
     No dropdown. The three group names sit in the bar itself after a
     "Capabilities:" label, so a reader sees B2B, B2C and Agencies without
     opening anything. Each links to its own panel on the capabilities
     page. The label is in the markup (it is the no-JS fallback and the
     link to the page as a whole); only the group links are rendered here,
     so the group names are still written in one place. */
  function renderNav(root) {
    var html = '';
    CAPS.groups.forEach(function (g) {
      html += '<a class="nav-caps__link" href="' + SECTION_PAGE + '#cap-' + esc(g.key) + '"' +
                ' data-track="nav-capabilities-' + esc(g.key) + '">' + esc(g.label) + '</a>';
    });
    root.insertAdjacentHTML('beforeend', html);
  }

  /* ---- the page section --------------------------------------------
     Two panels. Every capability gets an anchor of its own PER GROUP -
     cap-b2b-landing-pages and cap-b2c-landing-pages are different
     places on the page - so a dropdown link always lands in the column
     it was clicked from. */
  function renderSection(root) {
    var html = '';
    CAPS.groups.forEach(function (g) {
      html += '<div class="cap-panel" id="cap-' + esc(g.key) + '" data-group="' + esc(g.key) + '">' +
                '<h3 class="cap-panel__label">' + esc(g.label) + '</h3>' +
                '<p class="cap-panel__tag">' + esc(g.tagline) + '</p>' +
                '<ol class="cap-panel__list">';
      g.items.forEach(function (slug, i) {
        var c = CAPS.capabilities[slug];
        if (!c) return;
        html += '<li id="cap-' + esc(g.key) + '-' + esc(slug) + '">' +
                  '<span class="cap-num tx-etched">' + pad(i + 1) + '</span>' +
                  '<a class="cap-panel__name" href="#' + esc(slug) + '"' +
                    ' data-track="capability-' + esc(g.key) + '-' + esc(slug) + '">' + esc(c.name) + '</a>' +
                  '<p class="cap-panel__desc">' + esc(c.desc) + '</p>' +
                '</li>';
      });
      html += '</ol></div>';
    });
    root.innerHTML = html;
  }

  /* data-cap-nav, not the data-cap-menu the dropdown used. Deliberate:
     a browser that still holds the OLD version of this file from cache
     runs the old renderNav against the new markup, and that did
     root.innerHTML = <two open dropdown columns> - which wiped the label
     and dumped both lists into the bar. With a new hook name the stale
     script finds nothing and does nothing, and the bar shows the label
     alone until the fresh file arrives. Seen once; not again. */
  var nav = document.querySelector('[data-cap-nav]');
  if (nav) renderNav(nav);

  var section = document.querySelector('[data-cap-panels]');
  if (section) renderSection(section);
})();
