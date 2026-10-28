  // ===================================================================
  // Valimiste mudeli kest: lehed, andmed, hoidla, vahetulemused
  // ===================================================================
  var C = window.VMC, X = window.KovEp;
  var esc = C.esc, nf0 = C.NF(0), nf1 = C.NF(1), nf2 = C.NF(2), nf3 = C.NF(3);
  function byId(id) { return document.getElementById(id); }
  function plural(n, one, many) { return nf0.format(n) + ' ' + (n === 1 ? one : many); }
  function pct1(x) { return x != null && isFinite(x) ? nf1.format(x * 100) + '%' : '–'; }
  function fmtDate(s) { return s ? String(s).split('-').reverse().join('.') : ''; }
  function fmtBirth(b) {
    b = String(b || ''); if (!b || b === '0') return '';
    if (b.length === 8) return b.slice(4) === '0000' ? b.slice(0, 4) : b.slice(6, 8) + '.' + b.slice(4, 6) + '.' + b.slice(0, 4);
    return b;
  }
  function stat(label, value, sub) { return '<div><dt>' + label + '</dt><dd>' + value + (sub ? '<small>' + sub + '</small>' : '') + '</dd></div>'; }
  function kpi(label, value, sub) { return '<div class="kpi"><span class="eyebrow">' + label + '</span><b>' + value + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; }
  function openDlg(d) { if (!d.open) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } } }
  function shareBar(v, max, color) { return '<span class="bar"' + (color ? ' style="--pc:' + color + '"' : '') + '><i style="width:' + (max > 0 ? Math.min(100, v / max * 100) : 0).toFixed(1) + '%"></i></span>'; }
  function debounce(fn, ms) { var t = 0; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  var TYPES = {
    rk: { name: 'Riigikogu', long: 'Riigikogu valimised', short: 'RK' },
    kov: { name: 'Kohalikud', long: 'Kohaliku omavalitsuse volikogude valimised', short: 'KOV' },
    ep: { name: 'Europarlament', long: 'Euroopa Parlamendi valimised', short: 'EP' }
  };
  var MANI = (function () { try { return JSON.parse(byId('vm-manifest').textContent); } catch (e) { return { elections: [] }; } })();
  function maniOf(id) { return MANI.elections.filter(function (m) { return m.id === id; })[0] || null; }
  function rkApp() { return window.RKApp || null; }

  // ---------- lehed ja aadressiriba
  var PAGES = ['home', 'rk', 'kov', 'ep', 'cand', 'manage'];
  var SLUG = { home: 'avaleht', rk: 'rk', kov: 'kov', ep: 'ep', cand: 'kandidaadid', manage: 'valimised' };
  var RK_TABS = ['haaled', 'syvavaade', 'ehaaled', 'liikmed', 'jaotus', 'asendusliikmed', 'kontroll', 'reeglid'];
  function parseHash() {
    var h = (location.hash || '').replace(/^#/, ''), parts;
    try { h = decodeURIComponent(h); } catch (e) { /* jäta nii */ }
    parts = h.split('/');
    var p = parts[0];
    if (!p || p === 'avaleht') return { page: 'home', parts: [] };
    if (RK_TABS.indexOf(p) >= 0 || p === 'ajalugu') return p === 'ajalugu' ? { page: 'cand', parts: [] } : { page: 'rk', parts: [p] };
    for (var k in SLUG) if (SLUG[k] === p) return { page: k, parts: parts.slice(1) };
    return { page: 'home', parts: [] };
  }
  var route = parseHash(), page = route.page, started = false;
  function setHash(h) {
    var nh = '#' + h;
    if (location.hash === nh) return;
    try { history.replaceState(null, '', nh); } catch (e) { /* ei toetata */ }
  }
  function pushHash(h) {
    var nh = '#' + h;
    if (location.hash === nh) { onRoute(); return; }
    location.hash = nh;
  }
  function go(p, sub) { pushHash(SLUG[p] + (sub ? '/' + sub : '')); }
  function showPage(p) {
    page = p;
    PAGES.forEach(function (x) { var el = byId('page-' + x); if (el) el.hidden = x !== p; });
    Array.prototype.forEach.call(document.querySelectorAll('.snav a'), function (a) {
      if (a.dataset.vpage === p) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = (p === 'home' ? 'Eesti valimiste mudel' : (p === 'cand' ? 'Kandidaadid' : p === 'manage' ? 'Valimised' : TYPES[p].long) + ' · valimiste mudel');
  }
  var shownPage = null;
  function onRoute() {
    route = parseHash();
    var p = route.page, changed = shownPage !== p;
    shownPage = p;
    showPage(p);
    if (p === 'home') renderHome();
    else if (p === 'rk') { var a = rkApp(); if (a) a.onShow(route.parts[0]); }
    else if (p === 'kov') kovRoute(route.parts);
    else if (p === 'ep') epRoute(route.parts);
    else if (p === 'cand') histRoute(route.parts);
    else if (p === 'manage') renderManage();
    if (changed) window.scrollTo(0, 0);
  }

  // ---------- brauseri hoidla: oma valimised ja vahetulemused (IndexedDB, varuks mälu)
  var Store = (function () {
    var dbp = null, mem = { el: new Map(), sn: new Map() }, persistent = true;
    function open() {
      if (dbp) return dbp;
      dbp = new Promise(function (res, rej) {
        try {
          var r = indexedDB.open('valimiste-mudel', 1);
          r.onupgradeneeded = function () {
            var db = r.result;
            if (!db.objectStoreNames.contains('el')) db.createObjectStore('el', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('sn')) db.createObjectStore('sn', { keyPath: 'id' });
          };
          r.onsuccess = function () { res(r.result); };
          r.onerror = function () { rej(r.error); };
          r.onblocked = function () { rej(new Error('blocked')); };
        } catch (e) { rej(e); }
      }).catch(function () { persistent = false; return null; });
      return dbp;
    }
    function memStore(st) {
      var m = mem[st];
      return {
        getAll: function () { return { result: Array.from(m.values()) }; },
        get: function (id) { return { result: m.get(id) }; },
        put: function (o) { m.set(o.id, o); return { result: o.id }; },
        delete: function (id) { m.delete(id); return { result: undefined }; }
      };
    }
    function req(st, mode, op) {
      return open().then(function (db) {
        if (!db) return op(memStore(st)).result;
        return new Promise(function (res, rej) {
          var t, r;
          try { t = db.transaction(st, mode); r = op(t.objectStore(st)); } catch (e) { rej(e); return; }
          t.oncomplete = function () { res(r ? r.result : undefined); };
          t.onerror = t.onabort = function () { rej(t.error); };
        });
      });
    }
    return {
      all: function (st) { return req(st, 'readonly', function (s) { return s.getAll(); }); },
      get: function (st, id) { return req(st, 'readonly', function (s) { return s.get(id); }); },
      put: function (st, o) { return req(st, 'readwrite', function (s) { return s.put(o); }); },
      del: function (st, id) { return req(st, 'readwrite', function (s) { return s.delete(id); }); },
      persistent: function () { return persistent; }
    };
  })();
  // ---------- muutmise režiim: vaikimisi väljas, siis on leht ainult tulemuste vaatamiseks
  var EDIT = false;
  try { EDIT = localStorage.getItem('vm-edit') === 'true'; } catch (e) { EDIT = false; }
  function editOn() { return EDIT; }
  function applyEditUI() {
    document.body.classList.toggle('edit-on', EDIT);
    var b = byId('editSw');
    if (b) {
      b.setAttribute('aria-checked', String(EDIT));
      b.title = EDIT ? 'Muutmine on sees: hääli saab muuta, uusi valimisi lisada ja vahetulemusi salvestada. Klõpsa, et välja lülitada.' : 'Muutmine on väljas: leht näitab tulemusi. Klõpsa, et hääli muuta, uusi valimisi lisada ja vahetulemusi salvestada.';
    }
  }
  function setEdit(on) {
    EDIT = !!on;
    try { localStorage.setItem('vm-edit', String(EDIT)); } catch (e) { /* pole saadaval */ }
    applyEditUI();
    unfreezeAll();
    var d = byId('vmDlg'); if (d && d.open) d.close();
    var a = rkApp(); if (a && a.refreshEdit) a.refreshEdit();
    if (page === 'kov' && KS.E) rerenderKovKeepFocus();
    else if (page === 'ep' && ES.E) rerenderEpKeepFocus();
    else if (page === 'home') renderHome();
    else if (page === 'manage') renderManage();
  }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  // ---------- valimiste register
  var USER = []; // oma valimised: { id, type, name, year, date, created, base, raw | model }
  var userReady = Store.all('el').then(function (xs) { USER = (xs || []).sort(function (a, b) { return a.created < b.created ? 1 : -1; }); }, function () { USER = []; });
  function rkYears() { var a = rkApp(); return a ? a.years() : [2023]; }
  function elections(type) {
    var out = [];
    if (!type || type === 'rk') rkYears().forEach(function (y) { out.push({ id: 'rk' + y, type: 'rk', year: y, name: 'Riigikogu ' + y, builtin: true }); });
    MANI.elections.forEach(function (m) { if (!type || m.type === type) out.push({ id: m.id, type: m.type, year: m.year, date: m.date, name: m.name, builtin: true, m: m }); });
    USER.forEach(function (u) { if (!type || u.type === type) out.push({ id: 'u:' + u.id, type: u.type, year: u.year, date: u.date, name: u.name, builtin: false, u: u }); });
    return out;
  }
  function elLabel(id) {
    if (/^rk\d{4}$/.test(id)) return 'Riigikogu ' + id.slice(2);
    var m = maniOf(id); if (m) return TYPES[m.type].name + ' ' + m.year;
    var u = USER.filter(function (x) { return 'u:' + x.id === id; })[0];
    return u ? u.name : id;
  }

  // ---------- KOV ja EP andmete laadimine
  var LOADED = new Map(), LOADING = new Map();
  function voteKey(E, c) { return E.type === 'kov' ? (E.units[c.unit].code || ('u' + c.unit)) + ':' + c.nr : (E.closed ? c.nr + ':' + c.pos : String(c.nr)); }
  function applyStoredVotes(E) {
    var o = lsGet('vm-v-' + E.eid, null);
    if (o && typeof o === 'object') {
      E.cands.forEach(function (c) { var k = voteKey(E, c); if (o[k] != null && isFinite(+o[k])) c.votes = Math.max(0, Math.floor(+o[k])); });
      if (E.type === 'ep' && E.closed && o.__lists) o.__lists.forEach(function (v, l) { if (E.lists[l] && isFinite(+v)) E.lists[l].lvotes = Math.max(0, Math.floor(+v)); });
    }
  }
  function saveVotesNow(E) {
    var o = {}, n = 0;
    E.cands.forEach(function (c) { if (c.votes !== c.v0) { o[voteKey(E, c)] = c.votes; n++; } });
    if (E.type === 'ep' && E.closed && E.lists.some(function (L) { return L.lvotes !== L.lv0; })) { o.__lists = E.lists.map(function (L) { return L.lvotes; }); n++; }
    lsSet('vm-v-' + E.eid, n ? o : null);
  }
  var saveTimers = new Map();
  function saveVotes(E) { clearTimeout(saveTimers.get(E.eid)); saveTimers.set(E.eid, setTimeout(function () { saveVotesNow(E); }, 500)); }
  function changedCount(E) {
    var n = 0; E.cands.forEach(function (c) { if (c.votes !== c.v0) n++; });
    if (E.type === 'ep' && E.closed) E.lists.forEach(function (L) { if (L.lvotes !== L.lv0) n++; });
    return n;
  }
  function loadElection(id) {
    if (LOADED.has(id)) return Promise.resolve(LOADED.get(id));
    if (LOADING.has(id)) return LOADING.get(id);
    var p;
    if (id.indexOf('u:') === 0) {
      p = userReady.then(function () { return Store.get('el', id.slice(2)); }).then(function (u) { if (!u || !u.raw) throw new Error('Oma valimisi ei leitud.'); return u.raw; });
    } else {
      var m = maniOf(id);
      if (!m) return Promise.reject(new Error('Tundmatud valimised: ' + id));
      p = fetch('data/' + m.file).then(function (r) { if (!r.ok) throw new Error('Andmefaili laadimine ebaõnnestus (HTTP ' + r.status + ').'); return r.json(); });
    }
    p = p.then(function (raw) {
      var E = X.prep(raw);
      E.eid = id; E.user = id.indexOf('u:') === 0; E.label = elLabel(id);
      offPrep(E);
      applyStoredVotes(E);
      LOADED.set(id, E); LOADING.delete(id);
      return E;
    }, function (e) {
      LOADING.delete(id);
      if (location.protocol === 'file:') throw new Error('Kohalike ja Euroopa Parlamendi valimiste andmed loetakse eraldi failidest, mida brauser kohalikult avatud lehel ei luba. Ava leht veebiaadressilt (nt GitHub Pages).');
      throw e;
    });
    LOADING.set(id, p);
    return p;
  }
  function loadStations(E) {
    if (E.st !== undefined) return Promise.resolve(E.st);
    var m = maniOf(E.eid);
    if (!m || !m.stfile) { E.st = null; return Promise.resolve(null); }
    return fetch('data/' + m.stfile).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { E.st = j; return j; }, function () { E.st = null; return null; });
  }
  // ametliku tulemuse kokkuvõtted (ei muutu häälte muutmisel)
  function hasOff(E) { return !(E.raw && E.raw.noOfficial); }
  function offPrep(E) {
    E.offList = new Map();
    E.cands.forEach(function (c) { if (c.el) E.offList.set(c.list, (E.offList.get(c.list) || 0) + 1); });
  }
  function loadingHTML(msg) { return '<div class="loading" role="status"><span class="spin" aria-hidden="true"></span>' + esc(msg || 'Laadin andmeid…') + '</div>'; }
  function errorHTML(e) { return '<div class="warn" role="alert">' + esc(e && e.message ? e.message : String(e)) + '</div>'; }

  // ---------- nimekirjade nimed ja värvid
  function listInfo(E, l) {
    var L = E.lists[l];
    if (L.kind === 'P') {
      var p = E.parties[L.party] || { code: L.code, name: L.name };
      var hp = C.hparty(p.code, p.name);
      return { name: p.name || L.name, short: hp.short, color: hp.color, kind: 'P' };
    }
    if (L.kind === 'A') return { name: L.name, short: shortAlliance(L.name), color: C.allianceColor(L.name), kind: 'A' };
    return { name: L.name, short: L.name, color: C.IND_COLOR, kind: 'I' };
  }
  function shortAlliance(n) { var s = String(n).replace(/^valimisliit\s*/i, ''); return s.length > 26 ? s.slice(0, 25) + '…' : s; }
  var KIND_TAG = { P: '', A: '<span class="tag">valimisliit</span>', I: '<span class="tag">üksikkandidaat</span>' };

  // ---------- häälte protsendiline muutmine (ühine KOV ja EP lehele)
  var STEP_KEY = 'vm-step';
  var vstep = lsGet(STEP_KEY, 10); if ([1, 5, 10].indexOf(vstep) < 0) vstep = 10;
  function stepperHTML() {
    if (!EDIT) return '';
    return '<div class="stepper" role="group" aria-label="Muutmise samm"><span>Samm</span>' + [1, 5, 10].map(function (s) {
      return '<button type="button" data-vstep="' + s + '" aria-pressed="' + (vstep === s) + '">' + s + '%</button>';
    }).join('') + '</div>';
  }
  // adjHTML: scope = sõne, mis määrab muudetava hulga (nt "kn:P3", "ku:12:45", "ep:4"); cur ja base = praegused ja ametlikud hääled
  function adjHTML(scope, label, cur, base) {
    if (!EDIT) return '';
    var idb = 'vadj-' + scope.replace(/[^a-zA-Z0-9]/g, '_');
    var h = '<span class="adj"><button type="button" class="adjb" id="' + idb + '-m" data-vadj="' + esc(scope) + '" data-f="-1" aria-label="' + esc(label) + ' hääled −' + vstep + '%">−' + vstep + '%</button>' +
      '<button type="button" class="adjb" id="' + idb + '-p" data-vadj="' + esc(scope) + '" data-f="1" aria-label="' + esc(label) + ' hääled +' + vstep + '%">+' + vstep + '%</button>';
    if (cur !== base) {
      var txt = base > 0 ? ((cur > base ? '+' : '−') + nf1.format(Math.abs(cur / base - 1) * 100) + '%') : '+' + nf0.format(cur);
      h += '<span class="adjd ' + (cur > base ? 'up' : 'down') + '" title="Muutus võrreldes ametlike häältega">' + txt + '</span>' +
        '<button type="button" class="adjb adjr" id="' + idb + '-r" data-vadjreset="' + esc(scope) + '" title="Taasta ametlikud hääled" aria-label="Taasta ' + esc(label) + ' ametlikud hääled">↺</button>';
    }
    return h + '</span>';
  }
  function scaleCands(E, ids, f) {
    var ch = 0;
    ids.forEach(function (ci) { var c = E.cands[ci], nv = Math.max(0, Math.round(c.votes * f)); if (nv !== c.votes) { c.votes = nv; ch++; } });
    return ch;
  }
  function resetCands(E, ids) { ids.forEach(function (ci) { E.cands[ci].votes = E.cands[ci].v0; }); }
  // järjestuse lukustamine muutmise ajaks (read ei liigu klõpsude vahel)
  var FREEZE = new Map(); // tabeli võti -> järjestus
  function frozen(key, rows, idOf) {
    var ord = FREEZE.get(key);
    if (!ord) return rows;
    var pos = new Map(ord.map(function (id, i) { return [id, i]; }));
    return rows.slice().sort(function (a, b) { var x = pos.has(idOf(a)) ? pos.get(idOf(a)) : 1e9, y = pos.has(idOf(b)) ? pos.get(idOf(b)) : 1e9; return x - y; });
  }
  function freeze(key, rows, idOf) { if (!FREEZE.has(key)) FREEZE.set(key, rows.map(idOf)); }
  function unfreezeAll() { if (!FREEZE.size) return false; FREEZE.clear(); return true; }
  function frzNote(key) { return '<span class="frz' + (FREEZE.has(key) ? '' : ' off') + '">Järjestus on muutmise ajaks lukus ja uueneb, kui liigud tabelist välja.</span>'; }

  // ---------- vahetulemused (häälte hetkeseisud) ja häälte import
  var SNAP = { eid: null, kind: null, list: [] };
  function snapAdapter(kind) {
    if (kind === 'rk') {
      var a = rkApp();
      return {
        eid: a.eid(), label: a.label(),
        get: function () { return a.getVotes(); },
        set: function (o, zero) { a.setVotes(o, zero); },
        seats: function (o) { return a.seatsFor(o); },
        keyHelp: 'kandidaadi number; hääled'
      };
    }
    var E = kind === 'kov' ? KS.E : ES.E;
    return {
      eid: E.eid, label: E.label,
      get: function () { var o = {}; E.cands.forEach(function (c) { o[voteKey(E, c)] = c.votes; }); if (E.closed) o.__lists = E.lists.map(function (L) { return L.lvotes; }); return o; },
      set: function (o, zero) {
        E.cands.forEach(function (c) { var k = voteKey(E, c); if (o[k] != null && isFinite(+o[k])) c.votes = Math.max(0, Math.floor(+o[k])); else if (zero) c.votes = 0; });
        if (E.closed && o.__lists) o.__lists.forEach(function (v, l) { if (E.lists[l]) E.lists[l].lvotes = Math.max(0, Math.floor(+v) || 0); });
        saveVotes(E);
        if (kind === 'kov') { kovRecalc(E); renderKov(); } else { epRecalc(E); renderEp(); }
      },
      seats: function (o) { return kind === 'kov' ? kovSeatsFor(E, o) : epSeatsFor(E, o); },
      keyHelp: kind === 'kov' ? 'omavalitsuse EHAK-kood:kandidaadi number; hääled (nt 0784:378;26526)' : 'kandidaadi number; hääled'
    };
  }
  function openSnaps(kind) {
    var ad = snapAdapter(kind);
    SNAP = { eid: ad.eid, kind: kind, list: [], msg: '' };
    var dlg = byId('vmDlg');
    dlg.style.removeProperty('--pc');
    dlg.innerHTML = '<div class="dlg"><div class="dlg-h"><span></span><div><h2>Vahetulemused</h2><p class="small muted">' + esc(ad.label) + '</p></div><button type="button" class="btn btn-ghost" data-vclose>Sulge</button></div><div class="dlg-b" id="snapBody">' + loadingHTML() + '</div></div>';
    openDlg(dlg);
    refreshSnaps();
  }
  function refreshSnaps() {
    var ad = snapAdapter(SNAP.kind);
    Store.all('sn').then(function (xs) {
      SNAP.list = (xs || []).filter(function (s) { return s.eid === ad.eid; }).sort(function (a, b) { return a.time < b.time ? 1 : -1; });
      var now = new Date();
      var def = 'Vahetulemus ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      var cur = ad.seats(ad.get());
      var h = '<p class="small muted">Vahetulemus on häälte hetkeseis, mille saab hiljem uuesti avada või praegusega võrrelda — näiteks valimisõhtul pärast iga laekunud tulemust. Need salvestatakse ainult selles brauseris' + (Store.persistent() ? '' : ' (seekord ainult kuni lehe sulgemiseni, sest brauseri andmehoidla pole saadaval)') + '; alles hoidmiseks laadi alla.</p>' +
        '<div class="snapform"><label class="small" for="snapName">Nimi</label><input class="inp" id="snapName" value="' + esc(def) + '"><label class="small" for="snapNote">Märkus</label><input class="inp" id="snapNote" placeholder="nt loetud 45% jaoskondadest"><button type="button" class="btn btn-primary" data-vsnapsave>Salvesta praegused hääled</button></div>';
      h += '<h3>Salvestatud (' + SNAP.list.length + ')</h3>';
      if (!SNAP.list.length) h += '<p class="small muted">Selle valimise kohta pole veel vahetulemusi.</p>';
      else {
        h += '<div class="scroll-x"><table class="tbl snaptbl"><thead><tr><th>Nimi</th><th>Aeg</th><th>Mandaadid (vahetulemus → praegu)</th><th></th></tr></thead><tbody>';
        SNAP.list.forEach(function (s) {
          var t = new Date(s.time);
          h += '<tr><td><b>' + esc(s.name) + '</b>' + (s.note ? '<div class="small muted">' + esc(s.note) + '</div>' : '') + '</td><td class="small tnum">' + t.toLocaleString('et-EE') + '</td><td>' + seatDiffHTML(s.seats || ad.seats(s.votes), cur) + '</td><td class="snapact"><button type="button" class="btn btn-sm" data-vsnapopen="' + esc(s.id) + '">Ava</button> <button type="button" class="btn btn-sm" data-vsnapdl="' + esc(s.id) + '">Laadi alla</button> <button type="button" class="btn btn-sm btn-ghost" data-vsnapdel="' + esc(s.id) + '">Kustuta</button></td></tr>';
        });
        h += '</tbody></table></div>';
      }
      h += '<h3>Sisesta hääled tekstina</h3><p class="small muted">Kleebi read kujul <span class="mono">' + esc(ad.keyHelp) + '</span> (eraldaja semikoolon, koma, tabulaator või tühik). Nii saab sisestada näiteks valimisõhtu vahetulemusi tabelist.</p>' +
        '<textarea class="inp snapta" id="snapText" spellcheck="false" placeholder="101;523&#10;102;87"></textarea><label class="small"><input type="checkbox" id="snapZero"> Nulli kandidaadid, keda tekstis pole</label><div><button type="button" class="btn" data-vsnapimport>Rakenda hääled</button> <span id="snapMsg" class="small" role="status">' + (SNAP.msg || '') + '</span></div>' +
        '<h3>Või loe vahetulemus failist</h3><input type="file" id="snapFile" accept=".json,application/json">';
      var b = byId('snapBody'); if (b) b.innerHTML = h;
    });
  }
  function seatDiffHTML(a, b) {
    var keys = Array.from(new Set(Object.keys(a).concat(Object.keys(b)))).filter(function (k) { return (a[k] || 0) || (b[k] || 0); });
    keys.sort(function (x, y) { return (b[y] || 0) - (b[x] || 0) || (a[y] || 0) - (a[x] || 0); });
    return '<span class="sdiff">' + keys.map(function (k) {
      var x = a[k] || 0, y = b[k] || 0;
      return '<span>' + esc(k) + ' <b>' + x + '</b>' + (x !== y ? '→<b class="' + (y > x ? 'up' : 'down') + '">' + y + '</b>' : '') + '</span>';
    }).join('') + '</span>';
  }
  function saveSnap() {
    var ad = snapAdapter(SNAP.kind), votes = ad.get();
    var s = { id: 'sn' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), eid: ad.eid, label: ad.label, name: (byId('snapName').value || 'Vahetulemus').slice(0, 80), note: (byId('snapNote').value || '').slice(0, 200), time: new Date().toISOString(), votes: votes, seats: ad.seats(votes) };
    Store.put('sn', s).then(refreshSnaps, function (e) { alert('Salvestamine ebaõnnestus: ' + e); });
  }
  function parseVoteText(txt, kind) {
    var o = {}, n = 0, bad = 0;
    String(txt).split(/\r?\n/).forEach(function (line) {
      line = line.trim(); if (!line) return;
      var parts = line.split(/[;,\t ]+/).filter(Boolean);
      if (parts.length < 2) { bad++; return; }
      var v = parseInt(parts[parts.length - 1].replace(/\s/g, ''), 10), k = parts.slice(0, parts.length - 1).join(':');
      if (!isFinite(v) || v < 0) { bad++; return; }
      if (kind === 'kov') {
        var m = k.match(/^(\d{1,4}):(\d+)$/);
        if (!m) { bad++; return; }
        k = m[1].padStart(4, '0') + ':' + (+m[2]);
      } else if (!/^\d+$/.test(k)) { bad++; return; }
      else k = String(+k);
      o[k] = v; n++;
    });
    return { o: o, n: n, bad: bad };
  }
  // faili pakkumine: claude.ai artefaktis allalaadimise võimekuse kaudu, mujal tavalise allalaadimisena
  var dlCapP = null;
  function inViewer() { return !!(window.claude && typeof window.claude.use === 'function'); }
  function saveFile(name, text) {
    if (inViewer()) {
      if (!dlCapP) dlCapP = window.claude.use('downloads').then(function (d) { return d; }, function () { return null; });
      dlCapP.then(function (d) {
        if (!d) { alert('Failide salvestamine pole selles vaates saadaval.'); return; }
        d.save({ filename: name, data: text }).catch(function (e) {
          var c = e && e.code;
          if (c === 'declined') return;
          if (c === 'rate_limited') { alert('Salvestamise aken on juba avatud — proovi hetke pärast uuesti.'); return; }
          alert('Faili salvestamine ei õnnestunud' + (e && e.message ? ': ' + e.message : '') + '.');
        });
      });
      return;
    }
    var blob = new Blob([text], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function downloadJSON(name, obj) { saveFile(name, JSON.stringify(obj)); }
  function downloadDataFile(fn) {
    fetch('data/' + fn).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (t) { saveFile(fn, t); }, function (e) { alert('Faili laadimine ebaõnnestus: ' + e.message); });
  }
