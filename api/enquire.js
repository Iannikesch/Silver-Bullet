/* ==========================================================
   Silver Bullet — enquiry endpoint

   Receives the contact form and forwards it to a GoHighLevel
   inbound webhook, which owns contact creation, the opportunity
   stage and who the lead is routed to.

   This sits between the browser and GHL for four reasons, none
   of them optional:

     1. The webhook URL stays in an environment variable. In the
        page it would be world readable, and an inbound webhook
        has no auth beyond being unguessable.
     2. The honeypot and the timing gate are re-checked here.
        Everything enquire.js does is advisory: a bot posting
        straight to this URL never runs a line of it.
     3. A value starting with = + - or @ becomes a live formula
        the moment someone exports contacts to a spreadsheet, so
        those are defused before they reach the CRM.
     4. Same origin, so the browser never needs CORS.

   CommonJS on purpose. The site has no package.json and no build
   step, and adding one only to say "type": "module" would buy
   nothing. Node 18+ supplies fetch globally.
   ========================================================== */

'use strict';

/* Exactly the keys GHL is mapped to. Nothing is renamed and nothing
   extra is sent: the workflow matches on these names, so an extra
   field is at best ignored and at worst a mapping conflict. */
var FIELDS = [
  'first_name', 'last_name', 'email', 'phone', 'website', 'company',
  'revenue', 'heard', 'goal', 'interest',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'gclid', 'fbclid', 'landing_page', 'referrer', 'page_url'
];

var REQUIRED = ['first_name', 'last_name', 'email', 'phone', 'website',
                'company', 'revenue', 'goal'];

/* Anti-spam only. Never forwarded. */
var TRAP = 'company_url';
var STAMP = 'form_render_ts';
var MIN_FILL_MS = 3000;

/* Mirrors the maxlength on each control, so a direct post cannot
   send a megabyte of prose into the CRM. */
var LIMITS = {
  first_name: 80, last_name: 80, email: 254, phone: 40, website: 255,
  company: 120, revenue: 40, heard: 120, goal: 2000,
  utm_source: 255, utm_medium: 255, utm_campaign: 255, utm_content: 255,
  utm_term: 255, gclid: 255, fbclid: 255,
  landing_page: 255, referrer: 255, page_url: 255
};

var INTEREST = ['paid-acquisition', 'landing-pages', 'offer-positioning',
                'tracking-attribution', 'creative-production', 'lifecycle-retention'];

var MAX_BODY = 64 * 1024;


/* ---- body ---------------------------------------------------------
   Vercel parses JSON and urlencoded into req.body, but that is a
   platform convenience rather than a guarantee, and once it has run
   the stream is spent. So take req.body when it is there and fall
   back to reading the stream when it is not. */
function readBody(req) {
  return new Promise(function (resolve, reject) {
    if (req.body !== undefined && req.body !== null && req.body !== '') {
      return resolve(req.body);
    }
    var data = '';
    var size = 0;
    req.on('data', function (chunk) {
      size += chunk.length;
      if (size > MAX_BODY) { reject(new Error('body too large')); req.destroy(); return; }
      data += chunk;
    });
    req.on('end', function () { resolve(data); });
    req.on('error', reject);
  });
}

function parseBody(raw, type) {
  if (raw && typeof raw === 'object') return raw;          /* already parsed */
  if (typeof raw !== 'string' || !raw) return null;
  if (type.indexOf('application/json') === 0) {
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  if (type.indexOf('application/x-www-form-urlencoded') === 0) {
    var params = new URLSearchParams(raw);
    var out = {};
    params.forEach(function (v, k) {
      if (k in out) { out[k] = [].concat(out[k], v); } else { out[k] = v; }
    });
    return out;
  }
  try { return JSON.parse(raw); } catch (e) { return null; }
}


/* ---- cleaning ------------------------------------------------------ */
function collapse(v) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
}

/* A leading = + - @ or a control character turns a cell into a formula
   in Excel, Sheets and Numbers. Prefixing with an apostrophe is the
   standard defusal, and it only fires on values that would be dangerous,
   so an ordinary lead is never altered. */
function defuse(v) {
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function clean(v, limit) {
  return defuse(collapse(v).slice(0, limit || 255));
}

function looksLikeEmail(v) {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v) && v.length <= 254;
}

/* Plain Node response API rather than the Express-shaped helpers Vercel adds
   to res. Those are one host's sugar: leaning on them would tie this file to
   Vercel and make it untestable against an ordinary http.createServer, which
   is exactly how it is tested. */
function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}



module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  var endpoint = process.env.GHL_WEBHOOK_URL;
  if (!endpoint) {
    /* Never name the variable in the response. The page shows its own
       failure message and the mailto fallback, so nothing is lost. */
    console.error('enquire: GHL_WEBHOOK_URL is not set');
    return send(res, 500, { ok: false, error: 'not_configured' });
  }

  var raw;
  try {
    raw = await readBody(req);
  } catch (e) {
    return send(res, 413, { ok: false, error: 'too_large' });
  }

  var type = String(req.headers['content-type'] || '').toLowerCase();
  var body = parseBody(raw, type);
  if (!body || typeof body !== 'object') {
    return send(res, 400, { ok: false, error: 'unreadable_body' });
  }

  /* ---- bot screening ------------------------------------------------
     Both answer 200. Telling an automated client which check caught it
     only teaches whoever wrote it what to change next time. */
  if (collapse(body[TRAP]) !== '') {
    return send(res, 200, { ok: true });
  }
  var stamp = Number(body[STAMP]);
  if (stamp && (Date.now() - stamp) < MIN_FILL_MS) {
    return send(res, 200, { ok: true });
  }

  /* ---- shape the payload -------------------------------------------- */
  var payload = {};

  FIELDS.forEach(function (key) {
    if (key === 'interest') return;
    payload[key] = clean(body[key], LIMITS[key]);
  });

  /* Checkboxes arrive as one value, several, or none. Always an array,
     and only values the form can actually produce. */
  var picked = body.interest;
  if (picked == null) picked = [];
  if (!Array.isArray(picked)) picked = [picked];
  payload.interest = picked
    .map(function (v) { return collapse(v); })
    .filter(function (v, i, a) { return INTEREST.indexOf(v) !== -1 && a.indexOf(v) === i; });

  /* ---- validate ------------------------------------------------------
     Repeated here rather than trusted from the page, for the same reason
     the honeypot is. required only means non-empty, and a field of spaces
     is non-empty, so this runs after collapsing whitespace. */
  var missing = REQUIRED.filter(function (k) { return !payload[k]; });
  if (missing.length) {
    return send(res, 400, { ok: false, error: 'missing_fields', fields: missing });
  }
  if (!looksLikeEmail(payload.email)) {
    return send(res, 400, { ok: false, error: 'invalid_email' });
  }

  /* ---- forward -------------------------------------------------------
     company_url and form_render_ts are absent by construction: the
     payload is built from FIELDS, so neither can reach the CRM even if
     this file is edited carelessly later. */
  try {
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 10000);
    var sent = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl.signal
    });
    clearTimeout(timer);

    if (!sent.ok) {
      console.error('enquire: GHL responded ' + sent.status);
      return send(res, 502, { ok: false, error: 'upstream_failed' });
    }
  } catch (e) {
    console.error('enquire: forward failed: ' + (e && e.name));
    return send(res, 502, { ok: false, error: 'upstream_unreachable' });
  }

  return send(res, 200, { ok: true });
};
