/* ==========================================================
   Silver Bullet — enquiry form

   The form is fully visible at the bottom of every page. This file
   adds exactly one thing: posting in place and showing the done /
   fail block, so the visitor is not dumped on a bare confirmation
   page. It binds nothing until action is a real endpoint - see the
   guard below - so while the placeholder is in place the form falls
   through to a normal submit, which fails visibly, as intended.

   Self-initialising, GSAP-free, same as nav.js.
   ========================================================== */

(function () {
  'use strict';

  var reveal = document.querySelector('.cform-wrap');
  if (!reveal) return;

  /* ---- submission ------------------------------------------------
     Posts in place and shows the done / fail block, so the visitor is
     not dumped on a bare confirmation page. Guarded on the endpoint:
     while action is still the REPLACE_WITH placeholder this binds
     nothing, and the form falls through to a normal submit - which
     fails visibly, which is the point of the placeholder. The moment
     a real URL is in action, this is live with no other change. */
  var form = reveal.querySelector('.cform');
  if (!form) return;
  var action = form.getAttribute('action') || '';
  if (!/^https?:\/\//.test(action)) return;

  var done = reveal.querySelector('.cform__done');
  var fail = reveal.querySelector('.cform__fail');
  var button = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (fail) fail.hidden = true;
    if (button) { button.disabled = true; button.textContent = 'Sending\u2026'; }

    fetch(action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      form.hidden = true;
      if (done) { done.hidden = false; done.focus && done.setAttribute('tabindex', '-1'); done.focus(); }
    }).catch(function () {
      if (fail) fail.hidden = false;
      if (button) { button.disabled = false; button.textContent = 'Send it'; }
    });
  });
})();
