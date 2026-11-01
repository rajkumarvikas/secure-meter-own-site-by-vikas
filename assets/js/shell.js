/* Secure Meter shell: builds the header (assets/js/developer.js), the sidebar, the Home list and one frame per tool (assets/js/tools.js) */
(function () {
  var TOOLS = window.TOOLS || [];
  var ids = ['home'].concat(TOOLS.map(function (t) { return t.id; }));
  var made = {};
  var $ = function (id) { return document.getElementById(id); };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function toolById(id) { return TOOLS.filter(function (t) { return t.id === id; })[0]; }

  /* ---- developer info (top right) from assets/js/developer.js ---- */
  function renderDeveloper() {
    var d = window.DEVELOPER, host = $('who');
    if (!d || !host) return;
    var t = el('div', 'who-t');
    t.appendChild(el('b', null, d.name || ''));
    var lines = [];
    if (d.role) lines.push(d.role);
    if (d.employeeCode) lines.push('Employee code: ' + d.employeeCode);
    if (d.company) lines.push(d.company);
    (d.extra || []).forEach(function (x) { if (x) lines.push(x); });
    lines.forEach(function (text, i) {
      if (i) t.appendChild(document.createElement('br'));
      t.appendChild(document.createTextNode(text));
    });
    host.appendChild(t);
    if (d.photo) {
      var img = document.createElement('img');
      img.src = d.photo; img.alt = d.name || 'Developer';
      host.appendChild(img);
    }
  }

  var ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 15l2.5 2.5L16 13"/>'
  };
  function icon(name, size) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', String(size || 26)); s.setAttribute('height', String(size || 26));
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[name] || ICONS.file;
    return s;
  }

  function navTile(name) { var t = el('span', 'ni'); t.appendChild(icon(name, 19)); return t; }

  /* ---- build the sidebar, Home cards and tool frames ---- */
  function build() {
    var nav = $('nav'), list = $('tool-list'), views = $('views');
    var homeBtn = nav.querySelector('[data-nav="home"]');
    homeBtn.insertBefore(navTile('home'), homeBtn.firstChild); homeBtn.style.setProperty('--tc', '#e0902f');
    TOOLS.forEach(function (t) {
      var b = el('button', 'nav-i');
      b.setAttribute('data-go', t.id); b.setAttribute('data-nav', t.id); b.type = 'button';
      b.style.setProperty('--tc', t.color || '#17456f');
      b.appendChild(navTile(t.icon)); b.appendChild(el('span', 'lbl', t.name)); b.appendChild(el('span', 'chev', '\u203A'));
      nav.appendChild(b);

      var card = el('div', 'tcard');
      card.setAttribute('data-go', t.id); card.setAttribute('data-card', t.id);
      card.setAttribute('role', 'button'); card.tabIndex = 0;
      card.style.setProperty('--tc', t.color || '#17456f');
      var ic = el('div', 'ticon'); ic.appendChild(icon(t.icon)); card.appendChild(ic);
      var body = el('div', 'tbody');
      body.appendChild(el('h3', null, t.name));
      body.appendChild(el('p', null, t.description));
      card.appendChild(body);
      var open = el('button', 'open', t.button || 'Open'); open.setAttribute('data-go', t.id); open.type = 'button';
      card.appendChild(open);
      list.appendChild(card);

      var v = el('section', 'view frame'); v.id = 'view-' + t.id; v.hidden = true;
      v.setAttribute('aria-label', t.name); v.appendChild(el('div', 'loading', 'Loading ' + t.name + '\u2026'));
      views.appendChild(v);
    });
  }

  /* ---- load a tool into its own iframe the first time it is opened ---- */
  function mount(id) {
    if (made[id]) return; made[id] = true;
    var t = toolById(id), host = $('view-' + id), f = document.createElement('iframe');
    f.title = t.name;
    f.setAttribute('allow', 'clipboard-write; fullscreen');
    f.addEventListener('load', function () {
      var l = host.querySelector('.loading'); if (l) l.remove();
      var n = document.querySelector('[data-nav="' + id + '"]'); if (n) n.classList.add('loaded');
    });
    f.src = t.path;
    host.appendChild(f);
  }

  function show(id) {
    if (ids.indexOf(id) < 0) id = 'home';
    ids.forEach(function (x) { $('view-' + x).hidden = (x !== id); });
    document.querySelectorAll('[data-nav]').forEach(function (b) {
      var on = b.getAttribute('data-nav') === id;
      b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (id !== 'home') mount(id);
    var nm = id === 'home' ? 'Secure Meter' : toolById(id).name;
    $('ptitle').textContent = nm;
    document.title = id === 'home' ? nm : nm + ' | Secure Meter';
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]'); if (!b) return;
    var id = b.getAttribute('data-go');
    try { history.replaceState(null, '', '#' + id); } catch (_) { location.hash = id; }
    show(id);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var c = e.target.closest && e.target.closest('.tcard');
    if (c && e.target === c) { e.preventDefault(); c.click(); }
  });
  window.addEventListener('hashchange', function () { show(location.hash.slice(1)); });

  /* greeting and date on the Home banner */
  function renderGreeting() {
    var h = new Date().getHours(), g = $('hGreet'), d = $('hDate');
    if (g) g.textContent = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    if (d) d.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  window.addEventListener('focus', renderGreeting);
  renderGreeting();

  renderDeveloper();
  build();

  /* navigation: stagger-in, mouse glow, arrow-key movement */
  document.querySelectorAll('#nav .nav-i').forEach(function (b, i) { b.style.setProperty('--i', i); });
  $('nav').addEventListener('mousemove', function (e) {
    var b = e.target.closest && e.target.closest('.nav-i'); if (!b) return;
    var r = b.getBoundingClientRect();
    b.style.setProperty('--mx', (e.clientX - r.left) + 'px'); b.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
  $('nav').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    var items = Array.prototype.slice.call(document.querySelectorAll('#nav .nav-i')), i = items.indexOf(document.activeElement);
    if (i < 0) return; e.preventDefault();
    items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
  });
  show(location.hash.slice(1) || 'home');
})();
