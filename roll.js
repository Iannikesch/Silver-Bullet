/* ==========================================================
   Silver Bullet — the text roll

   The Profectus nav hover, rebuilt without Framer: each label is
   clipped to one line and holds two copies of itself, the second
   sitting just below the clip. Hover (or keyboard focus) slides both
   up one line, so the label rolls out the top while its twin rolls in
   from below. Once per hover, then it rests; leave and it rolls back.

   All the motion is CSS (.roll in site.css). This file only builds the
   markup, so every label is written ONCE in the HTML and the duplicate
   is generated here. Without this file nothing rolls and every label
   is exactly what it was.

   Self-initialising, GSAP-free, same doctrine as nav.js.

   Two targets:
     - text:  .nav-link, .nav-dd__toggle, .nav .cta-secondary
     - marks: the client wall. An image cannot be split into letters,
              so those roll as one piece whatever STAGGER says.
   ========================================================== */

(function () {
  'use strict';

  /* ---- the option --------------------------------------------------
     true:  each letter rolls 20ms after the one before it, left to
            right, so the word ripples up like a row of slot reels.
     false: the word rolls as one piece.
     Flip this one value; nothing else changes. The delay per letter
     and the roll's duration live in site.css as --roll-step and
     --roll-dur. */
  var STAGGER = false;

  var NBSP = ' ';

  /* One line of the roll. With STAGGER the text is broken into per-letter
     spans carrying their index, which the CSS turns into a delay. Spaces
     become non-breaking so a letter span never collapses to nothing. */
  function line(text, hidden) {
    var el = document.createElement('span');
    el.className = 'roll__line';
    if (hidden) el.setAttribute('aria-hidden', 'true');

    if (!STAGGER) {
      el.textContent = text;
      return el;
    }
    Array.prototype.forEach.call(text, function (ch, i) {
      var c = document.createElement('span');
      c.className = 'roll__ch';
      c.style.setProperty('--i', i);
      c.textContent = ch === ' ' ? NBSP : ch;
      el.appendChild(c);
    });
    return el;
  }

  /* Wraps the element's first non-empty text node. Only that node, so
     the dropdown toggles keep their +/- sign exactly where it is. */
  function rollText(el) {
    if (el.querySelector('.roll')) return;

    var node = null;
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue.trim()) { node = n; break; }
    }
    if (!node) return;

    var text = node.nodeValue.trim();
    var roll = document.createElement('span');
    roll.className = 'roll' + (STAGGER ? ' roll--stagger' : '');
    roll.appendChild(line(text, false));
    roll.appendChild(line(text, true));

    el.replaceChild(roll, node);
    el.classList.add('has-roll');
  }

  /* Same shape around an image: the mark, and a clone of it underneath.
     The clone carries an empty alt and sits in an aria-hidden line, so
     assistive tech still sees one logo. */
  function rollMark(li) {
    var img = li.querySelector(':scope > img');
    if (!img || li.querySelector('.roll')) return;

    var twin = img.cloneNode(true);
    twin.alt = '';

    var roll = document.createElement('span');
    roll.className = 'roll roll--mark';

    var a = document.createElement('span');
    a.className = 'roll__line';
    a.appendChild(img);

    var b = document.createElement('span');
    b.className = 'roll__line';
    b.setAttribute('aria-hidden', 'true');
    b.appendChild(twin);

    roll.appendChild(a);
    roll.appendChild(b);
    li.appendChild(roll);
    li.classList.add('has-roll');
  }

  var text = document.querySelectorAll('.nav .nav-link, .nav .nav-dd__toggle, .nav .cta-secondary');
  Array.prototype.forEach.call(text, rollText);

  var marks = document.querySelectorAll('.client-wall > li');
  Array.prototype.forEach.call(marks, rollMark);
})();
