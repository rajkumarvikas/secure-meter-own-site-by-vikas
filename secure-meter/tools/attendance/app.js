/* Attendance Record: employees, daily marking, monthly grid, Excel/CSV export and backup.
   Data is kept in this browser (localStorage). Use Export & Backup to keep a copy. */
(function () {
  'use strict';

  /* ---------- settings you may want to change ---------- */
  var STORE_KEY = 'secure-meter.attendance.v1';
  var STATUS = [                       // code, label  (order = order of cycling in the monthly grid)
    ['P', 'Present'], ['A', 'Absent'], ['L', 'Leave'],
    ['HD', 'Half Day'], ['WO', 'Week Off'], ['H', 'Holiday']
  ];
  var WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  /* ---------- small helpers ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function labelOf(code) { for (var i = 0; i < STATUS.length; i++) if (STATUS[i][0] === code) return STATUS[i][1]; return ''; }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('on'); }, 2600); }
  function download(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  function daysIn(ym) { var p = ym.split('-'); return new Date(+p[0], +p[1], 0).getDate(); }

  /* ---------- storage ---------- */
  var S = { employees: [], records: {} };   // records[date][empId] = {s, in, out, r}
  var memoryOnly = false;
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) { var d = JSON.parse(raw); S.employees = d.employees || []; S.records = d.records || {}; }
    } catch (e) { memoryOnly = true; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
    catch (e) { if (!memoryOnly) { memoryOnly = true; toast('Browser storage is unavailable. Download a backup so you do not lose data.'); } }
  }
  function rec(date, id) { return (S.records[date] || {})[id]; }
  function setRec(date, id, patch) {
    var day = S.records[date] || (S.records[date] = {});
    var r = day[id] || (day[id] = { s: '', in: '', out: '', r: '' });
    for (var k in patch) r[k] = patch[k];
    if (!r.s && !r.in && !r.out && !r.r) delete day[id];
    if (!Object.keys(day).length) delete S.records[date];
    save();
  }

  /* ---------- tabs ---------- */
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === name); });
    document.querySelectorAll('.panel').forEach(function (p) { p.hidden = p.id !== 'tab-' + name; });
    if (name === 'daily') renderDaily();
    if (name === 'monthly') renderMonthly();
    if (name === 'employees') renderEmployees();
    if (name === 'backup') $('bMonth').textContent = $('mMonth').value || '-';
  }
  document.querySelector('.tabs').addEventListener('click', function (e) {
    var b = e.target.closest('.tab'); if (b) showTab(b.dataset.tab);
  });

  /* ---------- daily ---------- */
  function statusSelect(val) {
    return '<select data-f="s"><option value="">-</option>' + STATUS.map(function (s) {
      return '<option value="' + s[0] + '"' + (val === s[0] ? ' selected' : '') + '>' + s[1] + '</option>';
    }).join('') + '</select>';
  }
  function renderDaily() {
    var date = $('dDate').value, body = $('dBody'), html = '';
    S.employees.forEach(function (e) {
      var r = rec(date, e.id) || { s: '', in: '', out: '', r: '' };
      html += '<tr data-id="' + esc(e.id) + '"><td>' + esc(e.code) + '</td><td>' + esc(e.name) + '</td><td>' + esc(e.dept) + '</td>' +
        '<td>' + statusSelect(r.s) + '</td>' +
        '<td><input type="time" data-f="in" value="' + esc(r.in) + '"></td>' +
        '<td><input type="time" data-f="out" value="' + esc(r.out) + '"></td>' +
        '<td class="rem"><input type="text" data-f="r" value="' + esc(r.r) + '" placeholder="Remark"></td></tr>';
    });
    body.innerHTML = html;
    $('dEmpty').hidden = S.employees.length > 0;
    $('dTable').hidden = S.employees.length === 0;
    dayChips();
  }
  function dayChips() {
    var date = $('dDate').value, count = {}, marked = 0;
    S.employees.forEach(function (e) { var r = rec(date, e.id); if (r && r.s) { count[r.s] = (count[r.s] || 0) + 1; marked++; } });
    var h = '<span class="chip">Not marked: ' + (S.employees.length - marked) + '</span>';
    STATUS.forEach(function (s) { if (count[s[0]]) h += '<span class="chip st-' + s[0] + '">' + s[1] + ': ' + count[s[0]] + '</span>'; });
    $('dChips').innerHTML = h;
  }
  $('dDate').addEventListener('change', renderDaily);
  $('dBody').addEventListener('change', function (e) {
    var f = e.target.dataset.f, tr = e.target.closest('tr'); if (!f || !tr) return;
    var p = {}; p[f] = e.target.value; setRec($('dDate').value, tr.dataset.id, p); dayChips();
  });
  $('dBody').addEventListener('input', function (e) {
    if (e.target.dataset.f !== 'r') return;
    setRec($('dDate').value, e.target.closest('tr').dataset.id, { r: e.target.value });
  });
  $('dAllP').addEventListener('click', function () {
    var date = $('dDate').value;
    S.employees.forEach(function (e) { var r = rec(date, e.id); if (!r || !r.s) setRec(date, e.id, { s: 'P' }); });
    renderDaily(); toast('Unmarked employees set to Present.');
  });
  $('dClear').addEventListener('click', function () {
    if (!confirm('Clear all attendance for ' + $('dDate').value + '?')) return;
    delete S.records[$('dDate').value]; save(); renderDaily();
  });

  /* ---------- monthly ---------- */
  function renderMonthly() {
    var ym = $('mMonth').value, n = daysIn(ym), t = $('mTable'), p = ym.split('-');
    $('mEmpty').hidden = S.employees.length > 0;
    t.hidden = S.employees.length === 0;
    $('legend').innerHTML = STATUS.map(function (s) { return '<span><b class="st-' + s[0] + '">' + s[0] + '</b> = ' + s[1] + '</span>'; }).join('');
    var h = '<thead><tr><th class="sticky">Employee</th>';
    for (var d = 1; d <= n; d++) {
      var wd = new Date(+p[0], +p[1] - 1, d).getDay();
      h += '<th class="' + (wd === 0 ? 'sun' : '') + '">' + d + '<small>' + WEEKDAY[wd] + '</small></th>';
    }
    h += '<th>Present</th><th>Absent</th><th>Leave</th><th>Off</th></tr></thead><tbody>';
    S.employees.forEach(function (e) {
      var tot = totals(e.id, ym);
      h += '<tr data-id="' + esc(e.id) + '"><td class="sticky">' + esc(e.name) + '<br><small>' + esc(e.code) + '</small></td>';
      for (var d = 1; d <= n; d++) {
        var date = ym + '-' + pad(d), r = rec(date, e.id), wd = new Date(+p[0], +p[1] - 1, d).getDay();
        h += '<td class="cell ' + (r && r.s ? 'st-' + r.s : '') + (wd === 0 ? ' sun' : '') + '" data-d="' + date + '">' + (r && r.s ? r.s : '') + '</td>';
      }
      h += '<td class="tot">' + tot.present + '</td><td class="tot">' + tot.absent + '</td><td class="tot">' + tot.leave + '</td><td class="tot">' + tot.off + '</td></tr>';
    });
    t.innerHTML = h + '</tbody>';
  }
  function totals(id, ym) {
    var n = daysIn(ym), t = { present: 0, absent: 0, leave: 0, off: 0 };
    for (var d = 1; d <= n; d++) {
      var r = rec(ym + '-' + pad(d), id); if (!r) continue;
      if (r.s === 'P') t.present += 1; else if (r.s === 'HD') t.present += 0.5;
      else if (r.s === 'A') t.absent += 1; else if (r.s === 'L') t.leave += 1;
      else if (r.s === 'WO' || r.s === 'H') t.off += 1;
    }
    return t;
  }
  $('mMonth').addEventListener('change', renderMonthly);
  $('mTable').addEventListener('click', function (e) {
    var c = e.target.closest('td.cell'); if (!c) return;
    var id = c.parentNode.dataset.id, date = c.dataset.d, cur = (rec(date, id) || {}).s || '';
    var codes = [''].concat(STATUS.map(function (s) { return s[0]; }));
    setRec(date, id, { s: codes[(codes.indexOf(cur) + 1) % codes.length] });
    renderMonthly();
  });
  $('mSundays').addEventListener('click', function () {
    var ym = $('mMonth').value, n = daysIn(ym), p = ym.split('-'), c = 0;
    for (var d = 1; d <= n; d++) {
      if (new Date(+p[0], +p[1] - 1, d).getDay() !== 0) continue;
      S.employees.forEach(function (e) { var date = ym + '-' + pad(d); if (!(rec(date, e.id) || {}).s) { setRec(date, e.id, { s: 'WO' }); c++; } });
    }
    renderMonthly(); toast(c ? 'Marked ' + c + ' empty Sunday cells as Week Off.' : 'No empty Sundays to mark.');
  });

  /* ---------- employees ---------- */
  function renderEmployees() {
    $('eBody').innerHTML = S.employees.map(function (e) {
      return '<tr data-id="' + esc(e.id) + '"><td>' + esc(e.code) + '</td><td>' + esc(e.name) + '</td><td>' + esc(e.dept) + '</td><td><button class="del" title="Delete" aria-label="Delete ' + esc(e.name) + '">&times;</button></td></tr>';
    }).join('');
    $('eEmpty').hidden = S.employees.length > 0;
  }
  function uid() { return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function addEmployee(code, name, dept) {
    code = (code || '').trim(); name = (name || '').trim(); dept = (dept || '').trim();
    if (!name) return false;
    if (code && S.employees.some(function (e) { return e.code.toLowerCase() === code.toLowerCase(); })) return false;
    S.employees.push({ id: uid(), code: code, name: name, dept: dept });
    return true;
  }
  $('eAdd').addEventListener('click', function () {
    if (!$('eName').value.trim()) { toast('Please type the employee name.'); $('eName').focus(); return; }
    if (!addEmployee($('eCode').value, $('eName').value, $('eDept').value)) { toast('That employee code already exists.'); return; }
    save(); $('eCode').value = $('eName').value = $('eDept').value = ''; renderEmployees(); $('eCode').focus();
  });
  $('eBody').addEventListener('click', function (e) {
    if (!e.target.closest('.del')) return;
    var id = e.target.closest('tr').dataset.id, emp = S.employees.filter(function (x) { return x.id === id; })[0];
    if (!confirm('Delete ' + emp.name + ' and all of their attendance records?')) return;
    S.employees = S.employees.filter(function (x) { return x.id !== id; });
    Object.keys(S.records).forEach(function (d) { delete S.records[d][id]; if (!Object.keys(S.records[d]).length) delete S.records[d]; });
    save(); renderEmployees();
  });
  function parseCsv(text) {
    var rows = [], row = [], cur = '', q = false;
    text = text.replace(/^\uFEFF/, '');
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return c.trim(); }); });
  }
  $('eFile').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      var rows = parseCsv(String(rd.result)), added = 0, skipped = 0;
      if (rows.length && /code|name/i.test(rows[0].join(','))) rows.shift();
      rows.forEach(function (r) { if (addEmployee(r[0], r[1], r[2])) added++; else skipped++; });
      save(); renderEmployees(); e.target.value = '';
      toast('Imported ' + added + ' employee(s)' + (skipped ? ', skipped ' + skipped + ' (empty name or duplicate code).' : '.'));
    };
    rd.readAsText(f);
  });

  /* ---------- export ---------- */
  function monthRows() {
    var ym = $('mMonth').value, n = daysIn(ym), head = ['Code', 'Name', 'Department'];
    for (var d = 1; d <= n; d++) head.push(d);
    head.push('Present', 'Absent', 'Leave', 'Week Off / Holiday');
    var rows = [head];
    S.employees.forEach(function (e) {
      var r = [e.code, e.name, e.dept];
      for (var d = 1; d <= n; d++) r.push((rec(ym + '-' + pad(d), e.id) || {}).s || '');
      var t = totals(e.id, ym); r.push(t.present, t.absent, t.leave, t.off); rows.push(r);
    });
    return rows;
  }
  function logRows() {
    var ym = $('mMonth').value, rows = [['Date', 'Code', 'Name', 'Department', 'Status', 'In', 'Out', 'Remark']];
    Object.keys(S.records).sort().forEach(function (date) {
      if (date.slice(0, 7) !== ym) return;
      S.employees.forEach(function (e) {
        var r = S.records[date][e.id]; if (r) rows.push([date, e.code, e.name, e.dept, labelOf(r.s), r.in, r.out, r.r]);
      });
    });
    return rows;
  }
  function needEmployees() { if (!S.employees.length) { toast('Add employees first.'); return true; } return false; }
  $('xXlsx').addEventListener('click', function () {
    if (needEmployees()) return;
    var m = monthRows(), w = [10, 26, 18]; for (var i = 3; i < m[0].length; i++) w.push(i < m[0].length - 4 ? 4 : 12);
    window.makeXlsx([{ name: 'Monthly', rows: m, widths: w }, { name: 'Daily log', rows: logRows(), widths: [12, 10, 26, 18, 12, 8, 8, 30] }])
      .then(function (b) { download(b, 'attendance-' + $('mMonth').value + '.xlsx'); });
  });
  $('xCsv').addEventListener('click', function () {
    if (needEmployees()) return;
    var csv = monthRows().map(function (r) { return r.map(function (c) { c = String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\r\n');
    download(new Blob(['\uFEFF' + csv], { type: 'text/csv' }), 'attendance-' + $('mMonth').value + '.csv');
  });
  $('bSave').addEventListener('click', function () {
    download(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }), 'attendance-backup-' + ymd(new Date()) + '.json');
  });
  $('bFile').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var d = JSON.parse(String(rd.result));
        if (!Array.isArray(d.employees) || typeof d.records !== 'object') throw new Error('bad');
        if (!confirm('Replace everything currently saved with this backup?')) { e.target.value = ''; return; }
        S = { employees: d.employees, records: d.records }; save(); showTab('daily'); toast('Backup restored.');
      } catch (err) { toast('That file is not a valid attendance backup.'); }
      e.target.value = '';
    };
    rd.readAsText(f);
  });

  /* ---------- start ---------- */
  load();
  var now = new Date();
  $('dDate').value = ymd(now);
  $('mMonth').value = now.getFullYear() + '-' + pad(now.getMonth() + 1);
  showTab('daily');
  if (memoryOnly) toast('Browser storage is unavailable. Download a backup so you do not lose data.');
})();
