/* ==========================================================
   Silver Bullet — capabilities: the one place they live

   Everything on the site that shows a capability reads from the
   CAPS object below and nothing else does:

     - the Capabilities dropdown in the nav, on every page
     - the Capabilities section on the home page
     - the same section on capabilities.html
     - capability.html, the one template that renders every
       capability page from ?c={slug}

   Add, rename or move a capability HERE and all four update.

   ================== WHERE TO EDIT ==================

   A capability's NAME       -> its `name` in the group's `items` list.
   A capability's DESCRIPTION-> its `description` (empty string until
                                you write it; the page shows a
                                placeholder while it is empty).
   A group's DESCRIPTOR      -> `descriptor` on that group.
   A group's NAME            -> `name` on that group.
   The Shared group's LABEL  -> `label` on `shared` ("Underneath
                                everything").
   MOVE a capability         -> cut its { name, slug, description }
                                line out of one `items` list and paste
                                it into another.
   ADD one                   -> add a line to the right `items` list.
                                It gets a page automatically.

   Leave `slug` and `key` alone once live. The slug is the page URL
   (capability.html?c=the-slug) and the data-track name; the key is
   what the CSS and the tracking events are built from. Renaming
   either breaks links people may have saved and splits the
   analytics history for that item.

   Numbering (01 to 25) is derived from position: Agencies first,
   then B2B, then B2C, then Shared, in the order written. Reorder
   the lists and the numbers follow.

   No dependencies. Self-initialising: it looks for the three
   mount points ([data-cap-menu], [data-cap-section],
   [data-cap-page]) and renders into whichever exist on the page.
   ========================================================== */

(function () {
  'use strict';

  /* ---- helper: a capability line, so the lists below stay short ---- */
  function cap(name, slug, description) {
    return { name: name, slug: slug, description: description || '' };
  }

  var CAPS = {

    /* ---- the three groups. Display order is this order. ---- */
    groups: [
      {
        key:        'agencies',
        name:       'Agencies',
        descriptor: 'Capability and capacity you can put your own name on.',
        items: [
          cap('White-label fulfillment',       'white-label-fulfillment'),
          cap('Overflow capacity',             'overflow-capacity'),
          cap('Data and enrichment access',    'data-and-enrichment-access'),
          cap('Identity resolution',           'identity-resolution'),
          cap('Attribution infrastructure',    'attribution-infrastructure'),
          cap('Reporting dashboards',          'reporting-dashboards'),
          cap('Technical tracking builds',     'technical-tracking-builds')
        ]
      },
      {
        key:        'b2b',
        name:       'B2B',
        parent:     'Brands',      /* rendered as the small label over B2B + B2C */
        descriptor: 'Longer cycles, fewer leads, higher value per close.',
        items: [
          cap('Demand generation',               'demand-generation'),
          cap('Pipeline acceleration',           'pipeline-acceleration'),
          cap('Lead scoring and qualification',  'lead-scoring-and-qualification'),
          cap('Account-based targeting',         'account-based-targeting'),
          cap('CRM and sales ops',               'crm-and-sales-ops'),
          cap('Offline conversion tracking',     'offline-conversion-tracking'),
          cap('Long-cycle nurture',              'long-cycle-nurture')
        ]
      },
      {
        key:        'b2c',
        name:       'B2C',
        parent:     'Brands',
        descriptor: 'Volume, speed, and the repeat purchase.',
        items: [
          cap('Paid acquisition',        'paid-acquisition'),
          cap('Lifecycle and retention', 'lifecycle-and-retention'),
          cap('Creative production',     'creative-production'),
          cap('CRO and checkout',        'cro-and-checkout'),
          cap('Audience building',       'audience-building'),
          cap('Marketplace (Amazon)',    'marketplace-amazon'),
          cap('Loyalty and referral',    'loyalty-and-referral')
        ]
      }
    ],

    /* ---- the shared set: runs under every engagement ---- */
    shared: {
      key:        'shared',
      name:       'Shared',
      label:      'Underneath everything',
      descriptor: 'Runs on every engagement regardless of who you are.',
      items: [
        cap('Offer and positioning',    'offer-and-positioning'),
        cap('Landing pages',            'landing-pages'),
        cap('Tracking and attribution', 'tracking-and-attribution'),
        cap('Data layer architecture',  'data-layer-architecture')
      ]
    }
  };

  /* ================= nothing below here is content ================= */

  /* ---- derived views ----------------------------------------------- */

  /* Every group in display order, shared last. */
  function allGroups() { return CAPS.groups.concat([CAPS.shared]); }

  /* Every capability in display order, each knowing its group and its
     1-based number across the whole set. This is where 01 to 25 comes
     from, so the nav, the section and the page can never disagree. */
  function allItems() {
    var out = [], n = 0;
    allGroups().forEach(function (g) {
      g.items.forEach(function (c) {
        n += 1;
        out.push({ name: c.name, slug: c.slug, description: c.description, group: g, number: n });
      });
    });
    return out;
  }

  function find(slug) {
    var items = allItems();
    for (var i = 0; i < items.length; i++) if (items[i].slug === slug) return items[i];
    return null;
  }

  function pageUrl(slug) { return 'capability.html?c=' + encodeURIComponent(slug); }

  /* Exposed for anything else that ever needs the list. */
  window.SB_CAPS = CAPS;
  window.SB_CAPS.all = allItems;
  window.SB_CAPS.find = find;
  window.SB_CAPS.url = pageUrl;

  /* ---- small utilities ---------------------------------------------- */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* One list of links. `track` is the data-track prefix, so the nav and
     the section report as different things in analytics. */
  function itemList(items, track, cls) {
    return '<ul class="' + cls + '">' + items.map(function (c) {
      return '<li><a href="' + pageUrl(c.slug) + '" data-track="' + track + '-' + esc(c.slug) + '">' +
               '<span class="cap-n" aria-hidden="true">' + pad(c.number) + '</span>' +
               '<span class="cap-name">' + esc(c.name) + '</span></a></li>';
    }).join('') + '</ul>';
  }

  /* Split the numbered flat list back out by group key. */
  function itemsOf(groupKey) {
    return allItems().filter(function (c) { return c.group.key === groupKey; });
  }

  /* ---- 1. the nav dropdown ------------------------------------------
     Three <details> columns under a "Brands" label that spans the two
     brand columns, then the Shared set as a full-width strip. Each
     group is a <details> so that on a phone, where the dropdown is an
     accordion inside the menu, tapping a group opens its list; on
     desktop nav.js holds every group open and they read as columns.
     Numbering runs 01 to 25 across the whole thing. */
  function renderNav(root) {
    var html = '';
    CAPS.groups.forEach(function (g) {
      html += '<details class="nav-dd__group' + (g.parent ? ' nav-dd__group--brand' : '') +
                '" data-group="' + esc(g.key) + '" open>' +
                '<summary class="nav-dd__group-head" data-track="nav-' + esc(g.key) + '">' +
                  '<span class="nav-dd__group-name">' + esc(g.name) + '</span>' +
                  '<span class="nav-dd__sign" aria-hidden="true"></span>' +
                '</summary>' +
                '<p class="nav-dd__group-tag">' + esc(g.descriptor) + '</p>' +
                itemList(itemsOf(g.key), 'nav-capability', 'nav-dd__list') +
              '</details>';
    });

    /* The parent label sits in the grid above the brand columns; on a
       phone it becomes a small heading before the first brand group. */
    var parents = [];
    CAPS.groups.forEach(function (g) { if (g.parent && parents.indexOf(g.parent) < 0) parents.push(g.parent); });
    var label = parents.map(function (p) {
      return '<p class="nav-dd__parent" data-parent="' + esc(p) + '" aria-hidden="true">' + esc(p) + '</p>';
    }).join('');

    var s = CAPS.shared;
    var shared = '<details class="nav-dd__group nav-dd__group--shared" data-group="' + esc(s.key) + '" open>' +
                   '<summary class="nav-dd__group-head" data-track="nav-' + esc(s.key) + '">' +
                     '<span class="nav-dd__group-name">' + esc(s.label) + '</span>' +
                     '<span class="nav-dd__sign" aria-hidden="true"></span>' +
                   '</summary>' +
                   '<p class="nav-dd__group-tag">' + esc(s.descriptor) + '</p>' +
                   itemList(itemsOf(s.key), 'nav-capability', 'nav-dd__list nav-dd__list--row') +
                 '</details>';

    root.innerHTML = label + html + shared;
    root.classList.add('nav-dd__cols');
  }

  /* ---- 2. the section (home page and capabilities.html) -------------
     Same three columns, same Brands label, same shared strip, at
     section scale. Every name links to its page. */
  function renderSection(root) {
    var parents = [];
    CAPS.groups.forEach(function (g) { if (g.parent && parents.indexOf(g.parent) < 0) parents.push(g.parent); });
    var html = parents.map(function (p) {
      return '<p class="cap-parent" data-parent="' + esc(p) + '">' + esc(p) + '</p>';
    }).join('');

    CAPS.groups.forEach(function (g) {
      html += '<div class="cap-panel' + (g.parent ? ' cap-panel--brand' : '') + '" data-group="' + esc(g.key) + '">' +
                '<h3 class="cap-panel__label">' + esc(g.name) + '</h3>' +
                '<p class="cap-panel__tag">' + esc(g.descriptor) + '</p>' +
                itemList(itemsOf(g.key), 'capabilities-' + g.key, 'cap-panel__list') +
              '</div>';
    });

    var s = CAPS.shared;
    html += '<div class="cap-shared" data-group="' + esc(s.key) + '">' +
              '<h3 class="cap-shared__label">' + esc(s.label) + '</h3>' +
              '<p class="cap-shared__tag">' + esc(s.descriptor) + '</p>' +
              itemList(itemsOf(s.key), 'capabilities-' + s.key, 'cap-shared__list') +
            '</div>';

    root.innerHTML = html;
  }

  /* ---- 3. the capability page (capability.html?c=slug) -------------- */
  function setMeta(title, desc, slug) {
    document.title = title;
    var m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute('content', desc);
    /* Canonical and og:url follow the slug, so if the robots noindex on
       capability.html is ever removed, each page already declares its
       own URL rather than all 25 collapsing onto the bare template. */
    var here = location.origin + location.pathname + (slug ? '?c=' + encodeURIComponent(slug) : '');
    ['link[rel="canonical"]', 'meta[property="og:url"]'].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) el.setAttribute(el.tagName === 'LINK' ? 'href' : 'content', here);
    });
    ['meta[property="og:title"]', 'meta[name="twitter:title"]'].forEach(function (sel) {
      var el = document.querySelector(sel); if (el) el.setAttribute('content', title);
    });
    ['meta[property="og:description"]', 'meta[name="twitter:description"]'].forEach(function (sel) {
      var el = document.querySelector(sel); if (el) el.setAttribute('content', desc);
    });
  }

  function renderPage(root) {
    var slug = new URLSearchParams(location.search).get('c') || '';
    var c = find(slug);

    if (!c) {
      /* Missing or unknown slug: the full list, grouped, not an error. */
      setMeta('Capabilities | Silver Bullet',
              'Every capability Silver Bullet runs, grouped by who it is for.');
      var html = '<h1 class="cap-page__title">Every capability.</h1>' +
                 '<p class="cap-page__tag">' + (slug ? 'There is no capability called “' + esc(slug) + '”. ' : '') +
                 'Here is everything we run, grouped by who it is for.</p>' +
                 '<div class="cap-page__all">';
      allGroups().forEach(function (g) {
        html += '<div class="cap-page__group">' +
                  '<h2 class="cap-page__group-name">' + esc(g.label || g.name) + '</h2>' +
                  '<p class="cap-page__group-tag">' + esc(g.descriptor) + '</p>' +
                  itemList(itemsOf(g.key), 'capability-all', 'cap-page__list') +
                '</div>';
      });
      root.innerHTML = html + '</div>';
      return;
    }

    var g = c.group;
    var groupName = g.parent ? g.parent + ': ' + g.name : (g.label || g.name);
    var desc = c.description
      ? '<div class="cap-page__body"><p>' + esc(c.description).replace(/\n\n+/g, '</p><p>') + '</p></div>'
      : '<div class="cap-page__body cap-page__body--empty"><p>A fuller description of ' + esc(c.name.toLowerCase()) +
        ' is on its way. In the meantime, the short version: it is one of the ' +
        (g.label ? 'things that run on every engagement'
                 : 'things we run for ' + esc(g.parent ? g.name + ' brands' : g.name.toLowerCase())) +
        ', and the fastest way to find out whether it fits is a call.</p></div>';

    var siblings = itemsOf(g.key).filter(function (x) { return x.slug !== c.slug; });

    /* A one-line description while the real one is empty. Acronyms stay
       as written: "B2B brands", never "b2b". */
    var forWhom = g.label ? 'on every Silver Bullet engagement'
                : g.parent ? 'for ' + g.name + ' brands' : 'for ' + g.name.toLowerCase();
    setMeta(c.name + ' | Silver Bullet',
            c.description
              ? c.description.split(/\.\s/)[0].slice(0, 155)
              : c.name + ': what Silver Bullet runs ' + forWhom + '. ' + g.descriptor,
            c.slug);

    root.innerHTML =
      '<p class="cap-page__group"><span class="cap-n" aria-hidden="true">' + pad(c.number) + '</span> ' +
        esc(groupName) + '</p>' +
      '<h1 class="cap-page__title">' + esc(c.name) + '</h1>' +
      '<p class="cap-page__tag">' + esc(g.descriptor) + '</p>' +
      desc +
      '<div class="cap-page__cta">' +
        '<a class="cta" href="index.html#contact" data-track="capability-' + esc(c.slug) + '-contact">Talk to us about ' + esc(c.name.toLowerCase()) + '</a>' +
      '</div>' +
      (siblings.length
        ? '<div class="cap-page__more">' +
            '<h2 class="cap-page__more-head">Also ' + esc(forWhom) + '</h2>' +
            itemList(siblings, 'capability-related', 'cap-page__list') +
          '</div>'
        : '');
  }

  /* ---- mount ------------------------------------------------------- */
  var nav = document.querySelector('[data-cap-menu]');
  if (nav) renderNav(nav);

  Array.prototype.forEach.call(document.querySelectorAll('[data-cap-section]'), renderSection);

  var page = document.querySelector('[data-cap-page]');
  if (page) renderPage(page);
})();
