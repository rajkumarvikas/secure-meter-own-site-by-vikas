/*
  Home page slider. Slides come from assets/js/slides.js.
  Auto-plays every 6 seconds; pauses when the mouse is over it, when it has keyboard focus,
  when the tab is hidden, or when the person's system asks for reduced motion.
  Arrows, dots, keyboard left/right and touch swipe all work. No internet needed.
*/
(function () {
  'use strict';
  var data = window.SLIDES || [], root = document.getElementById('slider');
  if (!root || !data.length) { if (root) root.hidden = true; return; }

  var DELAY = 6000, cur = 0, timer = null, paused = false, userPaused = false;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) userPaused = true;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function btn(cls, label, html) { var b = el('button', cls); b.type = 'button'; b.setAttribute('aria-label', label); b.innerHTML = html; return b; }

  root.setAttribute('role', 'region'); root.setAttribute('aria-roledescription', 'carousel');
  root.setAttribute('aria-label', 'About Secure Meters'); root.tabIndex = 0;

  var stage = el('div', 'sl-stage'), slides = [], dots = [];
  data.forEach(function (d, i) {
    var s = el('article', 'sl-slide'); s.setAttribute('role', 'group'); s.setAttribute('aria-label', (i + 1) + ' of ' + data.length);
    var img = el('img'); img.src = d.image; img.alt = ''; img.draggable = false; s.appendChild(img);
    var t = el('div', 'sl-text');
    t.appendChild(el('span', 'sl-tag', d.tag || ''));
    t.appendChild(el('h2', 'sl-title', d.title || ''));
    t.appendChild(el('p', 'sl-p', d.text || ''));
    if (d.cta) { var c = el('button', 'sl-cta', d.cta.label); c.type = 'button'; c.setAttribute('data-go', d.cta.go); t.appendChild(c); }
    s.appendChild(t); stage.appendChild(s); slides.push(s);
  });
  root.appendChild(stage);

  var prev = btn('sl-nav sl-prev', 'Previous slide', '&#8249;'), next = btn('sl-nav sl-next', 'Next slide', '&#8250;');
  root.appendChild(prev); root.appendChild(next);

  var bar = el('div', 'sl-ctrl'), dotBox = el('div', 'sl-dots');
  data.forEach(function (d, i) {
    var b = btn('sl-dot', 'Go to slide ' + (i + 1) + ': ' + (d.title || ''), ''); b.addEventListener('click', function () { go(i, true); });
    dotBox.appendChild(b); dots.push(b);
  });
  var pp = btn('sl-pp', 'Pause slideshow', '');
  bar.appendChild(dotBox); bar.appendChild(pp); root.appendChild(bar);
  var prog = el('div', 'sl-prog'); prog.appendChild(el('span')); root.appendChild(prog);

  function paint() {
    slides.forEach(function (s, i) { s.classList.toggle('on', i === cur); s.setAttribute('aria-hidden', i === cur ? 'false' : 'true'); });
    dots.forEach(function (b, i) { b.classList.toggle('on', i === cur); b.setAttribute('aria-current', i === cur ? 'true' : 'false'); });
    pp.classList.toggle('paused', userPaused);
    pp.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
    var bar = prog.firstChild; bar.style.animation = 'none'; void bar.offsetWidth;
    if (!userPaused) bar.style.animation = 'slprog ' + DELAY + 'ms linear forwards';
    root.classList.toggle('is-paused', paused || userPaused);
  }
  function homeVisible() { var h = document.getElementById('view-home'); return !h || !h.hidden; }
  function schedule() {
    clearTimeout(timer);
    if (userPaused || paused) return;
    timer = setTimeout(function () { if (homeVisible() && !document.hidden) go(cur + 1); else schedule(); }, DELAY);
  }
  function go(i, byUser) {
    cur = (i + data.length) % data.length; paint(); schedule();
  }
  function hold(v) { paused = v; root.classList.toggle('is-paused', paused || userPaused); if (v) clearTimeout(timer); else { paint(); schedule(); } }

  prev.addEventListener('click', function () { go(cur - 1, true); });
  next.addEventListener('click', function () { go(cur + 1, true); });
  pp.addEventListener('click', function () { userPaused = !userPaused; paint(); schedule(); });
  root.addEventListener('mouseenter', function () { hold(true); });
  root.addEventListener('mouseleave', function () { hold(false); });
  root.addEventListener('focusin', function () { hold(true); });
  root.addEventListener('focusout', function () { hold(false); });
  root.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1, true); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1, true); }
  });
  var x0 = null;
  root.addEventListener('pointerdown', function (e) { if (!e.target.closest('button')) x0 = e.clientX; });
  root.addEventListener('pointerup', function (e) {
    if (x0 === null) return; var dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 45) go(cur + (dx < 0 ? 1 : -1), true);
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { paint(); schedule(); } });
  window.addEventListener('hashchange', function () { if (homeVisible()) { paint(); schedule(); } });

  paint(); schedule();
})();
