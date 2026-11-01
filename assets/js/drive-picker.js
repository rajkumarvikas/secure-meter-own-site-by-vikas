/*
  Google Drive picker for every file-upload box.

  How it works: for each <input type="file"> on the page it adds a "Pick from Google Drive"
  button. The chosen file is downloaded from Drive and handed to the same input, exactly as if
  it had been chosen from the computer, so the tool needs no changes.

  It does nothing unless assets/js/config.js has a clientId and apiKey, and the page is opened
  through http(s). Google Sheets are converted to .xlsx; other Google documents are not supported.
*/
(function () {
  'use strict';
  var cfg = (window.APP_CONFIG || {}).googleDrive || {};
  if (!cfg.clientId || !cfg.apiKey) { if (window.console) console.info('Google Drive picker is off: add clientId and apiKey in assets/js/config.js.'); return; }
  if (!/^https?:$/.test(location.protocol)) { if (window.console) console.info('Google Drive picker is off: open the project through http://, not file://.'); return; }

  var SCOPE = 'https://www.googleapis.com/auth/drive.file';
  var XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  var token = null, tokenExp = 0, tokenClient = null, ready = null;

  /* ---------- look ---------- */
  var st = document.createElement('style');
  st.textContent = '.gd-btn{display:inline-block;margin:8px 8px 0 0;padding:7px 12px;border-radius:6px;border:1px solid var(--ac,#17456f);background:transparent;color:var(--ac,#17456f);font:600 13px/1.2 system-ui,Segoe UI,Arial,sans-serif;cursor:pointer}' +
    '.gd-btn:hover{filter:brightness(1.15)}.gd-btn[disabled]{opacity:.6;cursor:wait}' +
    '.gd-toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#14202e;color:#fff;padding:9px 16px;border-radius:8px;font:600 13px system-ui,Segoe UI,Arial,sans-serif;z-index:99999;max-width:90vw}';
  document.head.appendChild(st);
  function say(msg, ms) {
    var t = document.createElement('div'); t.className = 'gd-toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 4000);
  }

  /* ---------- Google scripts, sign-in, picker ---------- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.async = true; s.onload = res;
      s.onerror = function () { rej(new Error('Could not reach Google. Check your internet connection.')); };
      document.head.appendChild(s);
    });
  }
  function init() {
    if (!ready) ready = Promise.all([loadScript('https://apis.google.com/js/api.js'), loadScript('https://accounts.google.com/gsi/client')])
      .then(function () { return new Promise(function (res) { window.gapi.load('picker', res); }); })
      .catch(function (e) { ready = null; throw e; });
    return ready;
  }
  function getToken() {
    return new Promise(function (res, rej) {
      if (token && Date.now() < tokenExp - 60000) return res(token);
      if (!tokenClient) tokenClient = window.google.accounts.oauth2.initTokenClient({ client_id: cfg.clientId, scope: SCOPE, callback: function () {} });
      tokenClient.callback = function (r) {
        if (r.error) return rej(new Error(r.error_description || r.error));
        token = r.access_token; tokenExp = Date.now() + (r.expires_in || 3600) * 1000; res(token);
      };
      tokenClient.error_callback = function (e) { rej(new Error(e && e.type === 'popup_closed' ? 'Google sign-in was closed.' : 'Google sign-in failed.')); };
      tokenClient.requestAccessToken();
    });
  }
  function pick(multi) {
    return getToken().then(function (t) {
      return new Promise(function (res) {
        var g = window.google.picker;
        var view = new g.DocsView(g.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(false);
        var b = new g.PickerBuilder().addView(view).addView(new g.DocsView().setEnableDrives(true).setIncludeFolders(true).setSelectFolderEnabled(false))
          .setOAuthToken(t).setDeveloperKey(cfg.apiKey)
          .setCallback(function (d) {
            if (d.action === g.Action.PICKED) res(d.docs);
            else if (d.action === g.Action.CANCEL) res([]);
          });
        if (cfg.appId) b.setAppId(cfg.appId);
        if (multi) b.enableFeature(g.Feature.MULTISELECT_ENABLED);
        b.build().setVisible(true);
      });
    });
  }

  /* ---------- download a picked file ---------- */
  function fetchFile(doc, t) {
    return Promise.resolve().then(function () {
      var id = encodeURIComponent(doc.id), name = doc.name, url, mime = doc.mimeType || '';
      if (mime === 'application/vnd.google-apps.spreadsheet') {
        url = 'https://www.googleapis.com/drive/v3/files/' + id + '/export?mimeType=' + encodeURIComponent(XLSX);
        if (!/\.xlsx$/i.test(name)) name += '.xlsx';
      } else if (mime.indexOf('application/vnd.google-apps.') === 0) {
        throw new Error('"' + doc.name + '" is a Google document. Open it in Drive and use File > Download instead.');
      } else url = 'https://www.googleapis.com/drive/v3/files/' + id + '?alt=media&supportsAllDrives=true';
      return fetch(url, { headers: { Authorization: 'Bearer ' + t } }).then(function (r) {
        if (!r.ok) throw new Error('Google Drive could not give "' + doc.name + '" (error ' + r.status + ').');
        return r.blob();
      }).then(function (b) { return new File([b], name, { type: b.type || mime }); });
    });
  }
  function accepted(input, file) {
    var acc = (input.getAttribute('accept') || '').toLowerCase().split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    if (!acc.length) return true;
    var n = file.name.toLowerCase();
    return acc.some(function (a) { return a.charAt(0) === '.' ? n.slice(-a.length) === a : (a.slice(-2) === '/*' ? file.type.indexOf(a.slice(0, -1)) === 0 : file.type === a); });
  }
  function apply(input, files) {
    var dt = new DataTransfer(); files.forEach(function (f) { dt.items.add(f); });
    input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* ---------- add a button next to every file input ---------- */
  function addButton(input) {
    if (input.dataset.gd) return; input.dataset.gd = '1';
    var anchor = input.closest('label') || input.closest('[id*="drop" i],[class*="drop" i]') || input;
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'gd-btn'; btn.textContent = 'Pick from Google Drive';
    btn.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      btn.disabled = true;
      init().then(function () { return pick(input.multiple); }).then(function (docs) {
        if (!docs.length) return;
        say('Downloading from Google Drive...', 3000);
        return getToken().then(function (t) { return Promise.all(docs.map(function (d) { return fetchFile(d, t); })); }).then(function (files) {
          var bad = files.filter(function (f) { return !accepted(input, f); });
          if (bad.length) throw new Error('This box accepts ' + input.getAttribute('accept') + ' only. Not accepted: ' + bad.map(function (f) { return f.name; }).join(', '));
          apply(input, files); say('Loaded: ' + files.map(function (f) { return f.name; }).join(', '));
        });
      }).catch(function (err) { say(err.message || 'Google Drive failed.', 6000); })
        .then(function () { btn.disabled = false; });
    });
    anchor.parentNode.insertBefore(btn, anchor.nextSibling);
  }
  function scan() { document.querySelectorAll('input[type="file"]').forEach(addButton); }
  scan();
  var timer; new MutationObserver(function () { clearTimeout(timer); timer = setTimeout(scan, 200); }).observe(document.body, { childList: true, subtree: true });
})();
