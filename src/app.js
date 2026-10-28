(function () {
  'use strict';
  var E = window.RKEngine;
  var RAW = JSON.parse(document.getElementById('rk-data').textContent);

  // ---------- abifunktsioonid
  function NF(d) { return new Intl.NumberFormat('et-EE', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  var nf0 = NF(0), nf1 = NF(1), nf2 = NF(2), nf4 = NF(4);
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function $(s, el) { return (el || document).querySelector(s); }
  function byId(id) { return document.getElementById(id); }
  function ratioOf(c) { return c.T > 0 ? c.votes * c.M / c.T : 0; }
  function pctQ(c) { return nf1.format(ratioOf(c) * 100) + '%'; }
  function reach(c, k) { return c.T > 0 && c.votes > 0 && k * c.votes * c.M >= c.T; }
  function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  var TYPE = { P: 'Isikumandaat', D: 'Ringkonnamandaat', C: 'Kompensatsioonimandaat' };
  var TYPE_LC = { P: 'isikumandaat', D: 'ringkonnamandaat', C: 'kompensatsioonimandaat' };
  var SHORT_D = { 1: 'Haabersti, Põhja-Tallinn, Kristiine', 2: 'Kesklinn, Lasnamäe, Pirita', 3: 'Mustamäe, Nõmme', 4: 'Harju- ja Raplamaa', 5: 'Hiiu-, Lääne-, Saaremaa', 6: 'Lääne-Virumaa', 7: 'Ida-Virumaa', 8: 'Järva- ja Viljandimaa', 9: 'Jõgeva- ja Tartumaa', 10: 'Tartu linn', 11: 'Võru-, Valga-, Põlvamaa', 12: 'Pärnumaa' };
  var IND = { id: 0, name: 'Üksikkandidaadid', short: 'Üksik', color: '#8a94a3', lot: 1e9 };
  var TABS = ['haaled', 'syvavaade', 'ehaaled', 'liikmed', 'jaotus', 'asendusliikmed', 'kontroll', 'reeglid'];
  var LS_KEY = 'rk-valimismudel-v1';
  var HEX = /^#[0-9a-fA-F]{3,8}$/;
  var EMETRICS = [
    ['eshare', 'E-häälte osakaal erakonna häältest'],
    ['all', 'Erakonna osakaal kõigist häältest'],
    ['paper', 'Erakonna osakaal paberhäältest'],
    ['e', 'Erakonna osakaal e-häältest'],
    ['votes', 'Hääled (paber / e)']
  ];

  // loetav tekstivärv erakonna värvi taustal (WCAG kontrasti järgi)
  function textOn(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(function (x) { return x + x; }).join('');
    h = h.slice(0, 6);
    var ch = [0, 2, 4].map(function (i) { var v = parseInt(h.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    var L = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    return 1.05 / (L + 0.05) >= (L + 0.05) / 0.0583 ? '#ffffff' : '#10161e';
  }

  function glyph(t, color) {
    if (t === 'P') return '<svg class="g" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.3" style="fill:' + color + ';stroke:var(--ink);stroke-width:1.7"/></svg>';
    if (t === 'D') return '<svg class="g" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5" style="fill:' + color + ';stroke:var(--seat-edge);stroke-width:.8"/></svg>';
    return '<svg class="g" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.2" style="fill:var(--surface);stroke:' + color + ';stroke-width:2.2"/></svg>';
  }

  // ---------- mudel
  function baseModel() {
    return {
      districts: RAW.districts.map(function (d) { return { nr: d.nr, name: d.name, short: SHORT_D[d.nr] || d.name, mandates: d.mandates, voters: d.eligible }; }),
      parties: RAW.parties.map(function (p) { return { id: p.id, name: p.name, short: p.short, color: p.color, lot: p.lot }; }),
      candidates: RAW.candidates.map(function (r) { return { nr: r[0], name: r[1], district: r[2], party: r[3], natPos: r[4], distPos: r[5], votes: r[6], out: false }; })
    };
  }
  // ---------- andmestikud: 2023 täielikult, varasemad valimised ajalooandmetest
  var HIST = RAW.hist || null; // { y: [aastad], e: { aasta: { date, valid, notes, d, p, c } } }
  var hparty = window.VMC.hparty;
  function histModel(y) {
    var E = HIST.e[y];
    var minNr = E.p.map(function () { return Infinity; });
    E.c.forEach(function (r) { if (r[2] >= 0 && r[0] < minNr[r[2]]) minNr[r[2]] = r[0]; });
    var lot = [];
    E.p.map(function (p, i) { return i; }).sort(function (a, b) { return minNr[a] - minNr[b]; }).forEach(function (pi, k) { lot[pi] = k + 1; });
    var d23 = new Map(RAW.districts.map(function (d) { return [d.name, SHORT_D[d.nr]]; }));
    return {
      districts: E.d.map(function (d) { return { nr: d[0], name: d[1], short: d23.get(d[1]) || d[1], mandates: d[2], voters: 0 }; }),
      parties: E.p.map(function (p, i) { var hp = hparty(p[0], p[1]); return { id: i + 1, name: p[1], short: hp.short, color: hp.color, lot: lot[i] }; }),
      candidates: E.c.map(function (r) { return { nr: r[0], name: r[1], district: r[3], party: r[2] >= 0 ? r[2] + 1 : 0, natPos: r[6] || 0, distPos: r[5] || 0, votes: r[4], out: false }; })
    };
  }
  function yearOK(y) { return y === 2023 || !!(HIST && HIST.e[y]); }
  function datasetModel(y) { return y === 2023 || !yearOK(y) ? baseModel() : histModel(y); }
  var BASE23 = baseModel(); // 2023 kontrolli jaoks
  var baseYear = 2023, BASE, BASE_VOTES, BASE_MAND, BASE_VOTERS, BASE_CAND, OFF_TYPE, OFF_SEATS, DET = null;
  function setBase(y) {
    if (!yearOK(y)) y = 2023;
    baseYear = y;
    BASE = datasetModel(y);
    BASE_VOTES = new Map(BASE.candidates.map(function (c) { return [c.nr, c.votes]; }));
    BASE_MAND = new Map(BASE.districts.map(function (d) { return [d.nr, d.mandates]; }));
    BASE_VOTERS = new Map(BASE.districts.map(function (d) { return [d.nr, d.voters]; }));
    BASE_CAND = new Map(BASE.candidates.map(function (c) { return [c.nr, c]; }));
    OFF_TYPE = new Map();
    if (y === 2023) RAW.official.elected.forEach(function (e) { OFF_TYPE.set(e[0], e[1]); });
    else HIST.e[y].c.forEach(function (r) { if (r[7]) OFF_TYPE.set(r[0], 'PDC'.charAt(r[7] - 1)); });
    OFF_SEATS = new Map();
    OFF_TYPE.forEach(function (t, nr) { var b = BASE_CAND.get(nr), p = b ? b.party : 0; OFF_SEATS.set(p, (OFF_SEATS.get(p) || 0) + 1); });
    DET = y === 2023 ? (RAW.detail || null) : null; // jaoskondade ja e-häälte jaotus on ainult 2023 kohta
  }
  setBase(2023);

  var model, isBase = true, userEl = null; // userEl: brauseris loodud oma valimised { id, name }
  var state = { tab: 'haaled', district: 1, leaves: [], subsParty: null, struct: 0, step: 10, zoom: { p: null, d: null, u: null, c: null }, zsort: 'share', emetric: 'eshare', hist: { nk: null, pk: null }, hyear: null, ruleset: 'auto' };
  var partyMap, candMap, distMap;
  var res, sim, seatedNow = new Set(), byOrig = new Map();

  function index() {
    partyMap = new Map(model.parties.map(function (p) { return [p.id, p]; }));
    candMap = new Map(model.candidates.map(function (c) { return [c.nr, c]; }));
    distMap = new Map(model.districts.map(function (d) { return [d.nr, d]; }));
    if (!distMap.has(state.district)) state.district = model.districts[0].nr;
  }
  function partyOf(id) {
    if (!id) return IND;
    return partyMap.get(id) || { id: id, name: 'Erakond ' + id, short: String(id), color: '#999999', lot: 0 };
  }
  function pname(id) { return id ? partyOf(id).name : 'Üksikkandidaat'; }
  function cname(nr) { var c = candMap.get(nr); return c ? c.name : String(nr); }
  function dname(nr) { var d = distMap.get(nr); return d ? (d.short || d.name) : String(nr); }

  function sameAsBase(m) {
    if (m.candidates.length !== BASE.candidates.length || m.districts.length !== BASE.districts.length) return false;
    for (var i = 0; i < m.candidates.length; i++) {
      var c = m.candidates[i], b = BASE_CAND.get(c.nr);
      if (!b || b.party !== c.party || b.district !== c.district || b.natPos !== c.natPos || b.distPos !== c.distPos) return false;
    }
    return m.districts.every(function (d) { return BASE_MAND.has(d.nr); });
  }

  function validateModel(o) {
    function int(x, min) { var n = Number(x); return Number.isInteger(n) && n >= min ? n : null; }
    if (!o || typeof o !== 'object') return { error: 'Andmed peavad olema JSON-objekt.' };
    if (!Array.isArray(o.districts) || !o.districts.length) return { error: 'Puudub „districts“ massiiv.' };
    if (!Array.isArray(o.parties)) return { error: 'Puudub „parties“ massiiv.' };
    if (!Array.isArray(o.candidates) || !o.candidates.length) return { error: 'Puudub „candidates“ massiiv.' };
    var districts = [], dset = new Set();
    for (var i = 0; i < o.districts.length; i++) {
      var d = o.districts[i], nr = int(d && d.nr, 1), m = int(d && d.mandates, 0);
      if (nr === null || m === null) return { error: 'Ringkond nr ' + (i + 1) + ': nr ja mandates peavad olema täisarvud.' };
      if (dset.has(nr)) return { error: 'Ringkonna number ' + nr + ' kordub.' };
      dset.add(nr);
      var dn = String(d.name || 'Ringkond ' + nr);
      var baseD = BASE.districts.filter(function (x) { return x.nr === nr; })[0];
      var short = d.short ? String(d.short) : (baseD && baseD.name === dn ? baseD.short : dn);
      districts.push({ nr: nr, name: dn, short: short, mandates: m, voters: int(d.voters, 0) || 0 });
    }
    var parties = [], pset = new Set();
    for (var j = 0; j < o.parties.length; j++) {
      var p = o.parties[j], id = int(p && p.id, 1);
      if (id === null) return { error: 'Erakond nr ' + (j + 1) + ': id peab olema positiivne täisarv.' };
      if (pset.has(id)) return { error: 'Erakonna id ' + id + ' kordub.' };
      pset.add(id);
      parties.push({ id: id, name: String(p.name || 'Erakond ' + id), short: String(p.short || p.name || id), color: HEX.test(p.color) ? p.color : '#888888', lot: Number.isFinite(+p.lot) ? +p.lot : j + 1 });
    }
    var cands = [], cset = new Set();
    for (var k = 0; k < o.candidates.length; k++) {
      var c = o.candidates[k], cnr = int(c && c.nr, 1), cd = int(c && c.district, 1), cp = int(c && (c.party || 0), 0), v = int(c && (c.votes || 0), 0);
      if (cnr === null || cd === null || cp === null || v === null) return { error: 'Kandidaat ' + (k + 1) + ': nr, district, party ja votes peavad olema mittenegatiivsed täisarvud.' };
      if (cset.has(cnr)) return { error: 'Kandidaadi number ' + cnr + ' kordub.' };
      if (!dset.has(cd)) return { error: 'Kandidaat ' + cnr + ': tundmatu ringkond ' + cd + '.' };
      if (cp && !pset.has(cp)) return { error: 'Kandidaat ' + cnr + ': tundmatu erakond ' + cp + '.' };
      cset.add(cnr);
      cands.push({ nr: cnr, name: String(c.name || 'Kandidaat ' + cnr), district: cd, party: cp, natPos: int(c.natPos, 0) || 0, distPos: int(c.distPos, 0) || 0, votes: v, out: !!c.out });
    }
    return { ok: true, model: { districts: districts, parties: parties, candidates: cands } };
  }

  // ---------- salvestamine (ainult selle brauseri mugavuseks)
  function save() {
    try {
      var payload = { v: 1, user: userEl ? userEl.id : null, userName: userEl ? userEl.name : null, baseYear: baseYear, ruleset: state.ruleset, tab: state.tab, district: state.district, leaves: state.leaves, subsParty: state.subsParty, step: state.step, zoom: state.zoom, zsort: state.zsort, emetric: state.emetric, hist: state.hist, hyear: state.hyear };
      if (isBase) {
        var votes = {}, out = [], mand = {}, voters = {};
        model.candidates.forEach(function (c) { if (c.votes !== BASE_VOTES.get(c.nr)) votes[c.nr] = c.votes; if (c.out) out.push(c.nr); });
        model.districts.forEach(function (d) { if (d.mandates !== BASE_MAND.get(d.nr)) mand[d.nr] = d.mandates; if (d.voters !== BASE_VOTERS.get(d.nr)) voters[d.nr] = d.voters; });
        payload.base = { votes: votes, out: out, mand: mand, voters: voters };
      } else payload.model = model;
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch (e) { /* salvestus pole saadaval */ }
  }
  var saveT = 0;
  function saveSoon() { clearTimeout(saveT); saveT = setTimeout(save, 400); }
  function load() {
    var p = null;
    try { p = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { p = null; }
    setBase(p && p.v === 1 && Number.isInteger(p.baseYear) ? p.baseYear : 2023);
    model = datasetModel(baseYear); isBase = true;
    if (p && p.v === 1) {
      if (p.hist && typeof p.hist === 'object' && (p.hist.nk == null || typeof p.hist.nk === 'string')) state.hist = { nk: p.hist.nk || null, pk: typeof p.hist.pk === 'string' ? p.hist.pk : null };
      if (Number.isInteger(p.hyear)) state.hyear = p.hyear;
      if (p.ruleset === 'current') state.ruleset = 'current';
      if (p.model) {
        var v = validateModel(p.model);
        if (v.ok) { model = v.model; isBase = sameAsBase(model); }
      } else if (p.base) {
        var cm = new Map(model.candidates.map(function (c) { return [c.nr, c]; }));
        Object.keys(p.base.votes || {}).forEach(function (k) { var c = cm.get(+k), x = Math.floor(+p.base.votes[k]); if (c && x >= 0) c.votes = x; });
        (p.base.out || []).forEach(function (k) { var c = cm.get(+k); if (c) c.out = true; });
        model.districts.forEach(function (d) {
          if (p.base.mand && p.base.mand[d.nr] != null && +p.base.mand[d.nr] >= 0) d.mandates = Math.floor(+p.base.mand[d.nr]);
          if (p.base.voters && p.base.voters[d.nr] != null && +p.base.voters[d.nr] >= 0) d.voters = Math.floor(+p.base.voters[d.nr]);
        });
      }
      if (TABS.indexOf(p.tab) >= 0) state.tab = p.tab;
      if (p.user && p.model) userEl = { id: String(p.user), name: String(p.userName || 'Oma valimised') };
      if (p.district) state.district = +p.district;
      if (Array.isArray(p.leaves)) state.leaves = p.leaves.map(Number).filter(Number.isInteger);
      if (p.subsParty) state.subsParty = +p.subsParty;
      if ([1, 5, 10].indexOf(p.step) >= 0) state.step = p.step;
      if (p.zoom && typeof p.zoom === 'object') {
        var zn = function (x) { return x == null || x === '' ? null : (Number.isInteger(+x) ? +x : null); };
        state.zoom = { p: zn(p.zoom.p), d: zn(p.zoom.d), u: zn(p.zoom.u), c: zn(p.zoom.c) };
      }
      if (p.zsort === 'share' || p.zsort === 'votes') state.zsort = p.zsort;
      if (EMETRICS.some(function (m) { return m[0] === p.emetric; })) state.emetric = p.emetric;
    }
    var h = (location.hash || '').replace('#', '').replace(/^rk\//, '');
    if (TABS.indexOf(h) >= 0) state.tab = h;
    index();
  }

  // ---------- arvutus
  function oldRules() { return baseYear < 2003 && state.ruleset !== 'current'; }
  function yearRules(y) { // 1992: RKVS 1992; 1995 ja 1999: RKVS 1994; alates 2003: RKVS 2002
    if (y >= 2003) return null;
    return y >= 1995 ? { bonus75: false, min10: true, comp5: false } : { bonus75: false, min10: false, comp5: false };
  }
  function rulesText(y) {
    return y >= 1995 ? 'puudus 75% jäägi reegel, ringkonnamandaadiks oli vaja vähemalt 10% lihtkvoodist ja kompensatsioonimandaadid jagati üleriigilise nimekirja järjekorras (kandidaadi 5% nõuet polnud)' : 'puudusid 75% jäägi reegel ning kandidaadi 10% ja 5% nõue; kompensatsioonimandaadid jagati üleriigilise nimekirja järjekorras';
  }
  function activeRules() { return oldRules() ? yearRules(baseYear) : null; }
  function recompute() {
    res = E.compute(model, activeRules());
    state.leaves = state.leaves.filter(function (nr) { return candMap.has(nr); });
    sim = E.simulate(res, state.leaves);
    seatedNow = new Set(); byOrig = new Map();
    sim.seats.forEach(function (s) { if (s.holder) seatedNow.add(s.holder); byOrig.set(s.orig, s); });
  }
  function changedCount() {
    if (!isBase) return -1;
    var n = 0;
    model.candidates.forEach(function (c) { if (c.votes !== BASE_VOTES.get(c.nr) || c.out) n++; });
    model.districts.forEach(function (d) { if (d.mandates !== BASE_MAND.get(d.nr)) n++; });
    return n;
  }

  // ---------- kokkuvõte
  var hemiCache = { S: -1 };
  function hemiLayout(S) {
    if (S <= 0) return { seats: [], rs: 0.05 };
    var rows = Math.max(2, Math.round(Math.sqrt(S) * 0.6)), r0 = 0.42, r1 = 1;
    var radii = [];
    for (var i = 0; i < rows; i++) radii.push(r0 + (r1 - r0) * i / (rows - 1));
    var sumR = radii.reduce(function (a, b) { return a + b; }, 0);
    var counts = radii.map(function (r) { return Math.floor(S * r / sumR); });
    var left = S - counts.reduce(function (a, b) { return a + b; }, 0);
    var fr = radii.map(function (r, i) { return { i: i, f: S * r / sumR - counts[i] }; }).sort(function (a, b) { return b.f - a.f; });
    for (var k = 0; k < left; k++) counts[fr[k % rows].i]++;
    var seats = [];
    radii.forEach(function (r, i) {
      var n = counts[i];
      for (var j = 0; j < n; j++) {
        var a = n === 1 ? Math.PI / 2 : Math.PI * (1 - j / (n - 1));
        seats.push({ x: r * Math.cos(a), y: -r * Math.sin(a), a: a, r: r });
      }
    });
    seats.sort(function (s, t) { return (t.a - s.a) || (s.r - t.r); });
    var gap = (r1 - r0) / (rows - 1), minArc = Infinity;
    radii.forEach(function (r, i) { if (counts[i] > 1) minArc = Math.min(minArc, Math.PI * r / (counts[i] - 1)); });
    return { seats: seats, rs: 0.43 * Math.min(gap, minArc) };
  }
  function partiesByVotes() {
    var list = res.parties.slice().sort(function (a, b) { return (b.total - a.total) || (b.votes - a.votes); });
    return list;
  }
  function renderHemi() {
    if (hemiCache.S !== res.S) hemiCache = { S: res.S, L: hemiLayout(res.S) };
    var L = hemiCache.L, rs = L.rs;
    var typeRank = { P: 0, D: 1, C: 2 };
    var members = [];
    partiesByVotes().forEach(function (p) {
      res.elected.filter(function (c) { return c.party === p.id; })
        .sort(function (a, b) { return (typeRank[a.elected] - typeRank[b.elected]) || (a.orderNr - b.orderNr); })
        .forEach(function (c) { members.push(c); });
    });
    res.elected.filter(function (c) { return !c.party; }).forEach(function (c) { members.push(c); });
    var out = [];
    L.seats.forEach(function (s, i) {
      var c = members[i], x = s.x.toFixed(4), y = s.y.toFixed(4);
      if (!c) { out.push('<circle cx="' + x + '" cy="' + y + '" r="' + (rs * 0.8).toFixed(4) + '" style="fill:none;stroke:var(--rule-2);stroke-width:' + (rs * 0.2).toFixed(4) + ';stroke-dasharray:' + (rs * 0.35).toFixed(4) + '"><title>Jaotamata mandaat</title></circle>'); return; }
      var col = partyOf(c.party).color, st;
      if (c.elected === 'P') st = 'fill:' + col + ';stroke:var(--ink);stroke-width:' + (rs * 0.36).toFixed(4);
      else if (c.elected === 'D') st = 'fill:' + col + ';stroke-width:' + (rs * 0.12).toFixed(4);
      else st = 'fill:var(--surface);stroke:' + col + ';stroke-width:' + (rs * 0.46).toFixed(4);
      var r = c.elected === 'D' ? rs : rs * 0.82;
      out.push('<circle class="seat seat-' + c.elected + '" data-open="' + c.nr + '" cx="' + x + '" cy="' + y + '" r="' + r.toFixed(4) + '" style="' + st + '"><title>' + esc(c.name + ' — ' + partyOf(c.party).short + ', ' + TYPE_LC[c.elected]) + '</title></circle>');
    });
    out.push('<text class="hemi-n" x="0" y="-0.13">' + res.elected.length + '</text>');
    out.push('<text class="hemi-l" x="0" y="-0.02">liiget · enamus ' + (Math.floor(res.S / 2) + 1) + '</text>');
    byId('hemi').innerHTML = out.join('');
    var lg = '<span>' + glyph('P', 'var(--ink-3)') + 'isikumandaat</span><span>' + glyph('D', 'var(--ink-3)') + 'ringkonnamandaat</span><span>' + glyph('C', 'var(--ink-3)') + 'kompensatsioonimandaat</span>';
    if (res.unallocated) lg += '<span><svg class="g" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.4" style="fill:none;stroke:var(--rule-2);stroke-width:1.4;stroke-dasharray:2"/></svg>jaotamata</span>';
    byId('legend').innerHTML = lg;
  }
  function kpi(label, value, sub) { return '<div class="kpi"><span class="eyebrow">' + label + '</span><b>' + value + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; }
  function renderSummary() {
    renderHemi();
    var nP = 0, nD = 0, nC = 0;
    res.elected.forEach(function (c) { if (c.elected === 'P') nP++; else if (c.elected === 'D') nD++; else nC++; });
    var nQ = res.parties.filter(function (p) { return p.qualifies; }).length;
    byId('kpis').innerHTML =
      kpi('Kehtivaid hääli', nf0.format(res.N)) +
      kpi('5% künnis', nf0.format(Math.ceil(res.N / 20)) + ' häält', 'künnise ületas ' + plural(nQ, 'erakond', 'erakonda')) +
      kpi('Ringkondades', plural(nP + nD, 'mandaat', 'mandaati'), nP + ' isiku- ja ' + nD + ' ringkonnamandaati') +
      kpi('Kompensatsioon', plural(nC, 'mandaat', 'mandaati'), 'modifitseeritud d’Hondt, jagajad k^0,9');
    var w = [];
    if (res.N === 0) w.push('Hääli ei ole. Sisesta kandidaatidele hääli vahekaardil „Hääled ringkonniti“.');
    if (res.S !== 101) w.push('Ringkondade mandaate on kokku ' + res.S + '; seaduse järgi on Riigikogus 101 liiget.');
    if (res.unallocated > 0) w.push(plural(res.unallocated, 'mandaat jäi', 'mandaati jäi') + ' jaotamata: ' + (nQ ? 'künnise ületanud erakondadel ei jätkunud kandidaate.' : 'ükski erakond ei ületanud 5% künnist.'));
    res.districts.forEach(function (d) { if (d.T === 0 && res.N > 0) w.push('Ringkonnas nr ' + d.nr + ' ei ole hääli — selle mandaadid lähevad kompensatsiooniks.'); });
    byId('warns').innerHTML = w.map(function (x) { return '<div class="warn">' + esc(x) + '</div>'; }).join('');
    renderPartyTable();
    updateBadge();
  }
  function renderPartyTable() {
    var showOff = isBase;
    var cols = showOff ? 9 : 8;
    byId('ptools').innerHTML = '<span>Muuda erakonna hääli kõigis ringkondades. Klõpsa erakonna nimel, et näha tulemust ringkondade ja kandidaatide kaupa. <span class="frz' + (freezeN ? '' : ' off') + '">Järjestus on muutmise ajaks lukus ja uueneb, kui liigud tabelist välja.</span></span>' + stepperHTML();
    var rows = orderBy(res.parties.slice().sort(function (a, b) { return b.votes - a.votes; }), freezeN, function (r) { return r.id; });
    var cg = '<colgroup><col><col style="width:6.4em"><col style="width:3.8em"><col style="width:3.6em"><col style="width:3.9em"><col style="width:3.9em"><col style="width:4.9em">' + (showOff ? '<col style="width:3.8em">' : '') + '<col style="width:13.6em"></colgroup>';
    var h = cg + '<thead><tr><th>Erakond</th><th class="num">Hääli</th><th class="num">%</th><th class="num" title="Isikumandaadid">Isiku</th><th class="num" title="Ringkonnamandaadid">Ringk.</th><th class="num" title="Kompensatsioonimandaadid">Komp.</th><th class="num">Kokku</th>' + (showOff ? '<th class="num" title="' + baseYear + ' ametlik tulemus">' + baseYear + '</th>' : '') + '<th>Hääled ±</th></tr></thead><tbody>';
    var thrDone = false;
    rows.forEach(function (r, idx) {
      var p = partyOf(r.id);
      if (!thrDone && (freezeN ? idx === freezeSep : !r.qualifies)) {
        thrDone = true;
        h += '<tr class="thr"><td colspan="' + cols + '" class="small muted">5% künnis: ' + nf0.format(Math.ceil(res.N / 20)) + ' häält</td></tr>';
      }
      var off = OFF_SEATS.get(r.id) || 0, dlt = r.total - off;
      h += '<tr class="' + (r.qualifies ? '' : 'below') + '" style="--pc:' + p.color + '"><td><div class="pname"><span class="sw"></span><div><button type="button" class="plink" data-zp="' + r.id + '">' + esc(p.name) + '</button></div></div></td>' +
        '<td class="num">' + nf0.format(r.votes) + '</td><td class="num">' + (r.qualifies ? nf1.format(r.share * 100) : '<span class="pct-below" title="alla 5% künnise">' + nf1.format(r.share * 100) + '</span>') + '</td>' +
        '<td class="num">' + (r.personal || '·') + '</td><td class="num">' + (r.district || '·') + '</td><td class="num">' + (r.comp || '·') + '</td>' +
        '<td class="num"><span class="total">' + r.total + '</span>' + (showOff && dlt ? '<span class="delta ' + (dlt > 0 ? 'up' : 'down') + '">' + (dlt > 0 ? '+' : '−') + Math.abs(dlt) + '</span>' : '') + '</td>' +
        (showOff ? '<td class="num muted">' + off + '</td>' : '') + '<td>' + adjHTML('n', r.id, null) + '</td></tr>';
    });
    var hasInd = model.candidates.some(function (c) { return !c.party; });
    if (hasInd) {
      var offI = OFF_SEATS.get(0) || 0;
      h += '<tr style="--pc:' + IND.color + '"><td><div class="pname"><span class="sw"></span><div class="pfull">Üksikkandidaadid</div></div></td><td class="num">' + nf0.format(res.indVotes) + '</td><td class="num">' + nf1.format(res.N ? res.indVotes / res.N * 100 : 0) + '</td><td class="num">' + (res.indElected || '·') + '</td><td class="num">·</td><td class="num">·</td><td class="num"><span class="total">' + res.indElected + '</span></td>' + (showOff ? '<td class="num muted">' + offI + '</td>' : '') + '<td></td></tr>';
    }
    h += '</tbody><tfoot><tr><td>Kokku</td><td class="num">' + nf0.format(res.N) + '</td><td class="num">100,0</td><td class="num">' + sumBy('personal') + '</td><td class="num">' + sumBy('district') + '</td><td class="num">' + sumBy('comp') + '</td><td class="num">' + res.elected.length + '</td>' + (showOff ? '<td class="num muted">101</td>' : '') + '<td></td></tr></tfoot>';
    byId('ptable').innerHTML = h;
    function sumBy(k) { return res.parties.reduce(function (a, p) { return a + p[k]; }, 0) + (k === 'personal' ? res.indElected : 0); }
  }

  // ---------- häälte protsendiline muutmine
  function stepperHTML() {
    return '<div class="stepper" role="group" aria-label="Muutmise samm"><span>Samm</span>' + [1, 5, 10].map(function (s) {
      return '<button type="button" data-step="' + s + '" aria-pressed="' + (state.step === s) + '">' + s + '%</button>';
    }).join('') + '</div>';
  }
  function sumVotes(list, pid, d) {
    var s = 0;
    list.forEach(function (c) { if (c.party === pid && (!d || c.district === d)) s += c.votes; });
    return s;
  }
  function adjHTML(scope, pid, d) {
    var p = partyOf(pid), st = state.step, idb = 'adj-' + scope + '-' + pid;
    var where = d ? 'selles ringkonnas' : 'kõigis ringkondades';
    var h = '<span class="adj"><button type="button" class="adjb" id="' + idb + '-m" data-adj="' + scope + '" data-pid="' + pid + '" data-f="-1" aria-label="' + esc(p.short) + ' hääled −' + st + '% ' + where + '">−' + st + '%</button>' +
      '<button type="button" class="adjb" id="' + idb + '-p" data-adj="' + scope + '" data-pid="' + pid + '" data-f="1" aria-label="' + esc(p.short) + ' hääled +' + st + '% ' + where + '">+' + st + '%</button>';
    if (isBase) {
      var cur = sumVotes(model.candidates, pid, d), base = sumVotes(BASE.candidates, pid, d);
      if (cur !== base) {
        var txt = base > 0 ? ((cur > base ? '+' : '−') + nf1.format(Math.abs(cur / base - 1) * 100) + '%') : '+' + nf0.format(cur);
        h += '<span class="adjd ' + (cur > base ? 'up' : 'down') + '" title="Muutus võrreldes ' + baseYear + '. aasta häältega">' + txt + '</span>' +
          '<button type="button" class="adjb adjr" id="' + idb + '-r" data-adjreset="' + scope + '" data-pid="' + pid + '" title="Taasta ' + baseYear + '. aasta hääled" aria-label="Taasta ' + esc(p.short) + ' ' + baseYear + '. aasta hääled ' + where + '">↺</button>';
      }
    }
    return h + '</span>';
  }
  // Erakondade järjestus lukustatakse muutmise ajaks, et read ei liiguks klõpsude vahel
  var freezeN = null, freezeSep = -1, freezeD = null, freezeDKey = null;
  function orderBy(rows, order, key) {
    if (!order) return rows;
    var pos = new Map(order.map(function (id, i) { return [id, i]; }));
    return rows.sort(function (a, b) { var x = pos.has(key(a)) ? pos.get(key(a)) : 1e9, y = pos.has(key(b)) ? pos.get(key(b)) : 1e9; return x - y; });
  }
  function freezeFor(scope) {
    if (scope === 'n' && !freezeN) {
      var srt = res.parties.slice().sort(function (a, b) { return b.votes - a.votes; });
      freezeN = srt.map(function (r) { return r.id; });
      freezeSep = srt.findIndex(function (r) { return !r.qualifies; });
    }
    if (scope === 'd' && (!freezeD || freezeDKey !== state.district)) {
      var dr = res.districts.filter(function (x) { return x.nr === state.district; })[0];
      freezeD = dr ? dr.parties.map(function (e) { return e.party; }) : null; freezeDKey = state.district;
    }
  }
  function unfreezeN() { if (freezeN) { freezeN = null; renderPartyTable(); } }
  function unfreezeD() { if (freezeD) { freezeD = null; freezeDKey = null; renderDistrictParties(); } }
  function scaleParty(pid, f, d) {
    var changed = [];
    model.candidates.forEach(function (c) {
      if (c.party !== pid || (d && c.district !== d)) return;
      var nv = Math.max(0, Math.round(c.votes * f));
      if (nv !== c.votes) { c.votes = nv; changed.push(c); }
    });
    afterVotesChange(changed);
  }
  function resetParty(pid, d) {
    var changed = [];
    model.candidates.forEach(function (c) {
      if (c.party !== pid || (d && c.district !== d)) return;
      var b = BASE_VOTES.get(c.nr);
      if (b != null && c.votes !== b) { c.votes = b; changed.push(c); }
    });
    afterVotesChange(changed);
  }
  function afterVotesChange(changed) {
    var fid = document.activeElement && document.activeElement.id;
    recompute();
    renderSummary();
    if (state.tab === 'haaled' && votesKey === state.district + '|' + state.struct) {
      changed.forEach(function (c) { var i = byId('v-' + c.nr); if (i) i.value = c.votes; });
      patchVotes();
    } else renderActive(true);
    refreshDialog();
    saveSoon();
    if (fid && fid.indexOf('adj-') === 0) {
      var el = byId(fid) || byId(fid.replace(/-r$/, '-p'));
      if (el) el.focus({ preventScroll: true });
    }
  }
  function renderDistrictParties() {
    var box = byId('dparties'); if (!box) return;
    var fid = document.activeElement && document.activeElement.id;
    var d = distMap.get(state.district);
    var dr = res.districts.filter(function (x) { return x.nr === d.nr; })[0];
    var T = dr ? dr.T : 0;
    var h = '<div class="ptools"><span>Erakondade hääled ringkonnas. Muutus jaguneb erakonna kandidaatidele proportsionaalselt; erakonna nimi avab süvavaate. <span class="frz' + (freezeD && freezeDKey === d.nr ? '' : ' off') + '">Järjestus on muutmise ajaks lukus ja uueneb, kui liigud tabelist välja.</span></span>' + stepperHTML() + '</div>' +
      '<div class="scroll-x"><table class="tbl dptable"><colgroup><col><col style="width:6.4em"><col style="width:4em"><col style="width:5.8em"><col style="width:9.5em"><col style="width:13.6em"></colgroup><thead><tr><th>Erakond</th><th class="num">Hääli</th><th class="num">%</th><th class="num" title="Erakonna hääled lihtkvootides">Lihtkvoote</th><th class="num" title="Ringkonnas saadud isiku- ja ringkonnamandaadid">Mandaate</th><th>Hääled ±</th></tr></thead><tbody>';
    orderBy((dr ? dr.parties : []).slice(), freezeD && freezeDKey === d.nr ? freezeD : null, function (e) { return e.party; }).forEach(function (e) {
      var p = partyOf(e.party), mand;
      if (e.qualifies) mand = '<b>' + e.filled + '</b>' + (e.bonus ? '<sup title="Jääk vähemalt 75% lihtkvoodist">+</sup>' : '') + (e.filled < e.won ? ' <span class="tag warn-tag" title="Kandidaatidel alla 10% lihtkvoodist">' + (e.won - e.filled) + ' täitmata</span>' : '');
      else mand = e.personal ? '<b>' + e.personal + '</b> <span class="small muted">isiku-</span>' : '<span class="small muted">alla 5%</span>';
      h += '<tr style="--pc:' + p.color + '"><td><div class="pname"><span class="sw"></span><button type="button" class="plink" data-zp="' + e.party + '" data-zd="' + d.nr + '">' + esc(p.short) + '</button></div></td>' +
        '<td class="num">' + nf0.format(e.votes) + '</td><td class="num">' + (T ? nf1.format(e.votes / T * 100) : '–') + '</td><td class="num">' + nf2.format(e.quotas) + '</td><td class="num">' + mand + '</td><td>' + adjHTML('d', e.party, d.nr) + '</td></tr>';
    });
    if (dr && dr.independents.length) {
      var iv = 0, ie = 0;
      dr.independents.forEach(function (nr) { var c = res.byNr.get(nr); if (c.counted) iv += c.votes; if (c.elected) ie++; });
      h += '<tr style="--pc:' + IND.color + '"><td><div class="pname"><span class="sw"></span>Üksikkandidaadid</div></td><td class="num">' + nf0.format(iv) + '</td><td class="num">' + (T ? nf1.format(iv / T * 100) : '–') + '</td><td class="num">' + (T ? nf2.format(iv * d.mandates / T) : '–') + '</td><td class="num">' + (ie ? '<b>' + ie + '</b> <span class="small muted">isiku-</span>' : '·') + '</td><td></td></tr>';
    }
    box.innerHTML = h + '</tbody></table></div>';
    if (fid && fid.indexOf('adj-d-') === 0) { var el = byId(fid) || byId(fid.replace(/-r$/, '-p')); if (el) el.focus({ preventScroll: true }); }
  }
  function updateBadge() {
    var b = byId('dataBadge'), n = changedCount();
    if (userEl) { b.textContent = 'Oma valimised: ' + userEl.name; b.className = 'badge is-mod'; }
    else if (!isBase) { b.textContent = 'Imporditud andmed'; b.className = 'badge is-mod'; }
    else if (n === 0) { b.textContent = baseYear + ' ametlikud hääled'; b.className = 'badge'; }
    else { b.textContent = 'Muudetud: ' + plural(n, 'kirje', 'kirjet'); b.className = 'badge is-mod'; }
    byId('btnReset').textContent = userEl ? 'Taasta salvestatud hääled' : 'Taasta ' + baseYear + ' andmed';
    var ys = byId('yearSel'), yv = userEl ? 'u:' + userEl.id : String(baseYear);
    if (ys && ys.value !== yv) ys.value = yv;
  }

  // ---------- vahekaardid
  function setTab(t) {
    if (TABS.indexOf(t) < 0) t = 'haaled';
    state.tab = t;
    TABS.forEach(function (x) {
      var tab = byId('tab-' + x), p = byId('panel-' + x);
      tab.setAttribute('aria-selected', String(x === t));
      tab.tabIndex = x === t ? 0 : -1;
      p.hidden = x !== t;
    });
    renderActive(true);
    if (window.VM && VM.page() === 'rk') VM.setHash('rk/' + t);
    saveSoon();
  }
  var votesKey = '';
  function renderActive(full) {
    switch (state.tab) {
      case 'haaled': if (full || votesKey !== state.district + '|' + state.struct) renderVotes(); else patchVotes(); break;
      case 'syvavaade': renderZoom(); break;
      case 'ehaaled': renderEvotes(); break;
      case 'liikmed': renderMembers(); break;
      case 'jaotus': renderAlloc(); break;
      case 'asendusliikmed': renderSubs(); break;
      case 'kontroll': renderCheck(); break;
    }
  }

  // ---------- hääled ringkonniti
  function renderVotes() {
    var el = byId('panel-haaled');
    var d = distMap.get(state.district);
    var h = '<p class="panel-intro">Vali ringkond. Erakondade tabelis saad muuta erakonna hääli protsendi kaupa, allpool iga kandidaadi hääli eraldi. Tulemus arvutatakse kohe ümber. Kandidaadid on registreerimisnumbrite järjekorras nagu ringkonna koondnimekirjas; nimel klõpsates näed kandidaadi nimekirjakohti ja asendusliikmeid.</p>';
    h += '<div class="dpicker" role="group" aria-label="Valimisringkond">' + model.districts.map(function (x) {
      var on = x.nr === d.nr;
      return '<button type="button" class="dpick' + (on ? ' is-on' : '') + '" data-district="' + x.nr + '" aria-pressed="' + on + '"><span class="dp-top"><span class="dp-nr">' + x.nr + '</span><span class="dp-m">' + plural(x.mandates, 'mandaat', 'mandaati') + '</span></span><span class="dp-name">' + esc(x.short || x.name) + '</span><span class="dp-bar" id="dpbar-' + x.nr + '"></span></button>';
    }).join('') + '</div>';
    h += '<section class="card dsec"><div class="dsec-h"><div class="dhead-t"><p class="eyebrow">Valimisringkond nr ' + d.nr + '</p><h2>' + esc(d.name) + '</h2></div><dl class="dstats" id="dstats"></dl></div><div id="dparties"></div></section>';
    h += '<div class="tools"><div class="grow"><label class="vh" for="q">Otsi kandidaati</label><input class="inp" id="q" type="search" placeholder="Otsi kandidaati nime või numbri järgi (kõik ringkonnad)" autocomplete="off"><div class="qres" id="qres" hidden></div></div>' +
      '<button type="button" class="btn btn-sm btn-ghost" id="zeroDistrict">Nulli selle ringkonna hääled</button></div>';
    var groups = new Map();
    model.candidates.forEach(function (c) { if (c.district !== d.nr) return; var k = c.party || 0; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c); });
    var keys = Array.from(groups.keys()).sort(function (a, b) { return partyOf(a).lot - partyOf(b).lot; });
    h += '<div class="pblocks">' + keys.map(function (pid) {
      var p = partyOf(pid);
      var list = groups.get(pid).slice().sort(function (a, b) { return a.nr - b.nr; });
      return '<section class="pblock" style="--pc:' + p.color + '"><header class="pblock-head"><div class="pname"><span class="sw"></span><h3>' + esc(p.name) + '</h3></div><span></span>' +
        '<div class="pcalc" id="pc-' + pid + '"></div></header><ol class="clist">' + list.map(rowHTML).join('') + '</ol></section>';
    }).join('') + '</div>';
    el.innerHTML = h;
    votesKey = state.district + '|' + state.struct;
    patchVotes();
  }
  function rowHTML(c) {
    return '<li class="crow" id="row-' + c.nr + '" style="--pc:' + partyOf(c.party).color + '">' +
      '<span class="numbox" id="nb-' + c.nr + '" title="Registreerimisnumber">' + c.nr + '</span>' +
      '<div class="cmain"><button type="button" class="cname" data-open="' + c.nr + '">' + esc(c.name) + '</button>' +
      '<span class="cmeta">' + (c.party ? 'ringkonnanimekirjas ' + c.distPos + '. · üleriigilises ' + c.natPos + '.' : 'üksikkandidaat') + '<span id="rk-' + c.nr + '"></span></span></div>' +
      '<label class="cvotes" for="v-' + c.nr + '"><span class="lbl">Hääli</span><input id="v-' + c.nr + '" data-v="' + c.nr + '" type="number" min="0" step="1" inputmode="numeric" value="' + c.votes + '" aria-label="' + esc(c.name) + ', hääli"></label>' +
      '<div class="cq" id="cq-' + c.nr + '"></div><div class="cst" id="st-' + c.nr + '"></div></li>';
  }
  function stat(label, value, sub) { return '<div><dt>' + label + '</dt><dd>' + value + (sub ? '<small>' + sub + '</small>' : '') + '</dd></div>'; }
  function pcalcHTML(e) {
    var s = nf0.format(e.votes) + ' häält = ' + nf2.format(e.quotas) + ' lihtkvooti';
    if (!e.qualifies) return s + ' · erakond jäi üleriigiliselt alla 5% künnise' + (e.personal ? ' — kehtib ainult isikumandaat' : ', ringkonnamandaate ei saa');
    s += ' → <b>' + plural(e.won, 'mandaat', 'mandaati') + '</b>';
    if (e.bonus) s += ' <span class="tag ok-tag">jääk ≥ 75% lihtkvoodist, +1</span>';
    if (e.personal) s += ' · neist ' + plural(e.personal, 'isikumandaat', 'isikumandaati');
    if (e.filled < e.won) s += ' · <span class="tag warn-tag">' + (e.won - e.filled) + ' jäi täitmata</span> kandidaatidel alla 10% lihtkvoodist → kompensatsiooniks';
    return s;
  }
  function pill(t, on, cls, title) { return '<span class="pill' + (on ? ' on' : '') + (cls ? ' ' + cls : '') + '" title="' + title + '">' + t + '</span>'; }
  function statusHTML(c) {
    if (c.out) return '<span class="chip chip-out">Välja langenud (§ 62 lg 9)</span>';
    if (c.elected) {
      var s = '<span class="chip chip-el">' + glyph(c.elected, partyOf(c.party).color) + TYPE[c.elected] + '</span>';
      if (c.elected === 'C') s += '<span class="sub">võrdlusarv ' + nf1.format(c.compFigure) + (c.compBelow5 ? ', § 62 lg 7' : '') + '</span>';
      var seat = byOrig.get(c.nr);
      if (seat && seat.holder !== c.nr) s += '<span class="sub">lahkunud, asemel ' + esc(seat.holder ? cname(seat.holder) : '—') + '</span>';
      return s;
    }
    if (!c.party) return '<span class="chip chip-none">Ei osutunud valituks</span>';
    if (!res.qualifies.get(c.party)) return '<span class="chip chip-none">Erakond alla 5% künnise</span>';
    var parts = [];
    if (c.distSubRank) parts.push('ringkonnas ' + c.distSubRank + '.');
    if (c.natSubRank) parts.push('üleriigiliselt ' + c.natSubRank + '.');
    var extra = seatedNow.has(c.nr) ? '<span class="sub">Riigikogus asendusliikmena</span>' : (sim.gone.has(c.nr) ? '<span class="sub">loobunud</span>' : '');
    return '<span class="chip chip-sub">Asendusliige</span><span class="sub">' + parts.join(' · ') + '</span>' + extra;
  }
  function patchVotes() {
    var d = distMap.get(state.district);
    var dr = res.districts.filter(function (x) { return x.nr === d.nr; })[0];
    var T = dr ? dr.T : 0, M = d.mandates, Q = M ? T / M : 0;
    var dst = byId('dstats');
    if (!dst) return;
    dst.innerHTML = stat('Mandaate', M) + stat('Kehtivaid hääli', nf0.format(T)) +
      stat('Lihtkvoot', T && M ? nf2.format(Q) : '–', 'isikumandaat') +
      stat('10% lihtkvoodist', T && M ? nf2.format(Q / 10) : '–', 'ringkonnamandaat, ringkonna asendusliige') +
      stat('5% lihtkvoodist', T && M ? nf2.format(Q / 20) : '–', 'kompensatsioonimandaat');
    var rankOf = new Map();
    if (dr) {
      dr.parties.forEach(function (e) {
        var pc = byId('pc-' + e.party);
        if (pc) pc.innerHTML = pcalcHTML(e);
        e.ranked.forEach(function (nr, i) { rankOf.set(nr, i + 1); });
      });
    }
    var pc0 = byId('pc-0');
    if (pc0) pc0.textContent = 'Üksikkandidaat saab mandaadi ainult siis, kui tema häälte arv on vähemalt lihtkvoot (' + (T && M ? nf2.format(Q) : '–') + ').';
    model.candidates.forEach(function (m) {
      if (m.district !== d.nr) return;
      var c = res.byNr.get(m.nr);
      var nb = byId('nb-' + m.nr); if (!nb) return;
      nb.className = 'numbox' + (c.elected ? ' is-el' : '');
      byId('cq-' + m.nr).innerHTML = '<span class="qv">' + pctQ(c) + '</span><span class="meter">' +
        pill('5', reach(c, 20), '', 'vähemalt 5% lihtkvoodist: kompensatsioonimandaadi eelisjärjekord') +
        pill('10', reach(c, 10), '', 'vähemalt 10% lihtkvoodist: ringkonnamandaat ja ringkonna asendusliige') +
        pill('Q', reach(c, 1), 'q', 'vähemalt lihtkvoot: isikumandaat') + '</span>';
      byId('st-' + m.nr).innerHTML = statusHTML(c);
      var rk = rankOf.get(m.nr);
      byId('rk-' + m.nr).textContent = rk ? ' · häälte arvult ' + rk + '.' : '';
    });
    renderDistrictParties();
    patchPicker();
  }
  function patchPicker() {
    var counts = new Map();
    res.cands.forEach(function (c) {
      if (c.elected !== 'P' && c.elected !== 'D') return;
      if (!counts.has(c.district)) counts.set(c.district, new Map());
      var m = counts.get(c.district);
      m.set(c.party, (m.get(c.party) || 0) + 1);
    });
    model.districts.forEach(function (d) {
      var bar = byId('dpbar-' + d.nr); if (!bar) return;
      var m = counts.get(d.nr) || new Map(), used = 0, segs = [], tip = [];
      Array.from(m.entries()).sort(function (a, b) { return b[1] - a[1]; }).forEach(function (e) {
        used += e[1];
        segs.push('<i style="flex:' + e[1] + ';background:' + partyOf(e[0]).color + '"></i>');
        tip.push(partyOf(e[0]).short + ' ' + e[1]);
      });
      var rest = Math.max(0, d.mandates - used);
      if (rest) { segs.push('<i class="comp" style="flex:' + rest + '"></i>'); tip.push(rest + ' kompensatsiooniks'); }
      bar.innerHTML = segs.join('');
      bar.title = 'Ringkonnas jaotatud: ' + tip.join(', ');
    });
  }
  var calcRaf = 0;
  function scheduleCalc() {
    if (calcRaf) return;
    calcRaf = setTimeout(function () {
      calcRaf = 0;
      recompute();
      renderSummary();
      if (state.tab === 'haaled') patchVotes(); else renderActive(true);
      refreshDialog();
      saveSoon();
    }, 30);
  }
  function refresh() {
    recompute();
    renderSummary();
    renderActive(true);
    refreshDialog();
    saveSoon();
  }
  function search(q) {
    var box = byId('qres'); if (!box) return;
    q = norm(q.trim());
    if (!q) { box.hidden = true; box.innerHTML = ''; return; }
    var hits = model.candidates.filter(function (c) { return String(c.nr).indexOf(q) === 0 || norm(c.name).indexOf(q) >= 0; }).slice(0, 30);
    box.innerHTML = hits.length ? hits.map(function (c) {
      return '<button type="button" data-jump="' + c.nr + '"><span class="mono">' + c.nr + '</span><span>' + esc(c.name) + '</span><span class="qm">' + esc(partyOf(c.party).short) + ' · ringkond ' + c.district + ' · ' + nf0.format(c.votes) + ' häält</span></button>';
    }).join('') : '<p class="small muted" style="padding:8px">Ei leitud.</p>';
    box.hidden = false;
  }
  function jumpTo(nr) {
    var c = candMap.get(nr); if (!c) return;
    closeDialogs();
    state.district = c.district;
    if (state.tab !== 'haaled') setTab('haaled'); else renderVotes();
    var row = byId('row-' + nr), inp = byId('v-' + nr);
    if (row) {
      row.scrollIntoView({ block: 'center' });
      row.classList.remove('is-hl'); void row.offsetWidth; row.classList.add('is-hl');
    }
    if (inp) inp.focus({ preventScroll: true });
  }

  // ---------- valitud ja asendajad
  function chainEntries(nr) {
    var ch = E.substituteChain(res, nr);
    return ch.district.map(function (x, i) { return { nr: x, k: 'R' + (i + 1) }; })
      .concat(ch.national.map(function (x) { return { nr: x, k: 'Ü' + res.byNr.get(x).natSubRank }; }));
  }
  function isAvail(nr) { return !seatedNow.has(nr) && !sim.gone.has(nr); }
  function viaText(h) {
    if (!h) return '';
    if (h.via === 'ringkond') return 'ringkonna asendusliige ' + h.rank + '.';
    if (h.via === 'üleriigiline') return 'üleriigilise nimekirja asendusliige ' + h.rank + '.';
    if (h.via === 'lisamandaat') return 'lisamandaat (§ 76), ' + partyOf(h.figure.party).short + ' võrdlusarv ' + nf1.format(h.figure.value);
    return '';
  }
  function oldSubsNote() {
    return baseYear < 2019 ? '<p class="znote">Asendusliikmed on arvutatud kehtiva seaduse järgi. ' + baseYear + '. aasta valimiste ajal kehtisid asendusliikmete registreerimiseks mõnevõrra teised reeglid, seega tegelik järjekord võis erineda.</p>' : '';
  }
  function renderMembers() {
    var el = byId('panel-liikmed');
    var h = '<p class="panel-intro">Iga valitud liikme juures on tema asendusliikmete järjekord Riigikogu liikme staatuse seaduse § 12 järgi. <b>R</b> tähistab sama erakonna sama ringkonna asendusliikmeid (RKVS § 75 lg 3), <b>Ü</b> erakonna üleriigilist asendusliikmete nimekirja (§ 75 lg 4). Sama erakonna samas ringkonnas valitud liikmetel on ühine järjekord, seega tegelik asendaja sõltub lahkumiste järjekorrast. Vajuta „Lahkub“, et simuleerida volituste peatumist või lõppemist, näiteks ministriks nimetamist.</p>';
    var log = sim.log;
    h += oldSubsNote();
    h += '<div class="simbar"><div><b>' + (log.length ? plural(log.length, 'muudatus', 'muudatust') + ' koosseisus' : 'Koosseis vastab valimistulemusele') + '</b>' +
      (log.length ? '<ol class="simlog">' + log.map(function (l) {
        if (l.type === 'loobus') return '<li>' + esc(cname(l.nr)) + ' loobus asendusliikme kohast</li>';
        return '<li>' + esc(cname(l.nr)) + ' lahkus → ' + (l.by ? '<b>' + esc(cname(l.by.nr)) + '</b> (' + esc(viaText(l.by)) + ')' : 'kohta ei saanud täita') + '</li>';
      }).join('') + '</ol>' : '<p class="small muted">Lahkumisi pole märgitud.</p>') + '</div>' +
      (log.length ? '<button type="button" class="btn" id="simClear">Tühista kõik muudatused</button>' : '') + '</div>';
    if (!res.elected.length) { el.innerHTML = h + '<p class="muted">Keegi ei osutunud valituks.</p>'; return; }
    var order = partiesByVotes().filter(function (p) { return p.total > 0; }).map(function (p) { return p.id; });
    if (res.indElected) order.push(0);
    var typeRank = { P: 0, D: 1, C: 2 };
    h += '<div class="mgroups">' + order.map(function (pid) {
      var p = partyOf(pid);
      var list = res.elected.filter(function (c) { return c.party === pid; }).sort(function (a, b) { return (typeRank[a.elected] - typeRank[b.elected]) || (a.orderNr - b.orderNr); });
      var cnt = { P: 0, D: 0, C: 0 }; list.forEach(function (c) { cnt[c.elected]++; });
      return '<section class="mgroup" style="--pc:' + p.color + '"><header><div class="pname"><span class="sw"></span><h3>' + esc(p.name) + '</h3></div><span class="small muted">' + plural(list.length, 'mandaat', 'mandaati') + ' · ' + cnt.P + ' isiku-, ' + cnt.D + ' ringkonna-, ' + cnt.C + ' kompensatsioonimandaati</span></header><ol class="mlist">' + list.map(memberRow).join('') + '</ol></section>';
    }).join('') + '</div>';
    el.innerHTML = h;
  }
  function memberRow(c) {
    var p = partyOf(c.party), seat = byOrig.get(c.nr);
    var replaced = seat && seat.holder !== c.nr;
    var info = 'ringkond ' + c.district + ' · ' + nf0.format(c.votes) + ' häält · ' + pctQ(c) + ' lihtkvoodist';
    if (c.elected === 'C') info += ' · üleriigilises nimekirjas ' + c.natPos + '. · võrdlusarv ' + nf1.format(c.compFigure);
    var entries = chainEntries(c.nr), chainHTML;
    if (!entries.length) chainHTML = '<span class="lab">Asendaja</span><span>lisamandaadi alusel (§ 76)' + (c.party && !res.qualifies.get(c.party) ? ' — erakond alla 5%, asendusliikmeid ei registreerita' : (!c.party ? ' — üksikkandidaadil asendusliikmeid ei ole' : ' — nimekirjas asendusliikmeid pole')) + '</span>';
    else {
      var next = -1;
      for (var i = 0; i < entries.length; i++) if (isAvail(entries[i].nr)) { next = i; break; }
      var upto = Math.min(entries.length, Math.max(3, next + 2));
      chainHTML = '<span class="lab">Asendusliikmed</span>' + entries.slice(0, upto).map(function (e, i) {
        var cls = i === next ? ' next' : (isAvail(e.nr) ? '' : ' used');
        return '<button type="button" class="sb' + cls + '" data-open="' + e.nr + '" title="' + (i === next ? 'Järgmine vaba asendusliige' : (isAvail(e.nr) ? '' : 'Juba Riigikogus või loobunud')) + '"><span class="k">' + e.k + '</span><b>' + esc(cname(e.nr)) + '</b></button>';
      }).join('') + (entries.length > upto ? '<button type="button" class="link small" data-open="' + c.nr + '">kõik ' + entries.length + '</button>' : '');
    }
    var holderHTML = '';
    if (replaced) {
      var last = seat.history[seat.history.length - 1];
      holderHTML = seat.holder ? '<div class="holder"><span>Asemel <button type="button" class="cname" data-open="' + seat.holder + '">' + esc(cname(seat.holder)) + '</button></span><span class="small muted">' + esc(viaText(last)) + '</span></div>'
        : '<div class="holder vacant">Kohta ei saanud täita — asendusliikmeid ega lisamandaate ei ole</div>';
    }
    var act = replaced
      ? (seat.holder ? '<button type="button" class="btn btn-sm" data-leave="' + seat.holder + '">Asendaja lahkub</button>' : '') + '<button type="button" class="btn btn-sm btn-ghost" data-restore="' + c.nr + '">Taasta</button>'
      : '<button type="button" class="btn btn-sm" data-leave="' + c.nr + '">Lahkub</button>';
    return '<li class="mrow' + (replaced ? ' is-left' : '') + '" style="--pc:' + p.color + '"><span class="numbox is-el">' + c.nr + '</span><div class="mmain"><div class="mline"><button type="button" class="cname" data-open="' + c.nr + '">' + esc(c.name) + '</button><span class="chip chip-el">' + glyph(c.elected, p.color) + TYPE[c.elected] + '</span></div><span class="cmeta">' + info + '</span><div class="chain">' + chainHTML + '</div>' + holderHTML + '</div><div class="mact">' + act + '</div></li>';
  }
  function restoreSeat(orig) {
    var seat = byOrig.get(orig); if (!seat) return;
    var holders = new Set(seat.history.map(function (x) { return x.nr; }).filter(Boolean));
    for (var i = state.leaves.length - 1; i >= 0; i--) {
      if (holders.has(state.leaves[i])) { state.leaves.splice(i, 1); break; }
    }
  }

  // ---------- mandaatide jaotus
  function seats7(list, S) {
    var V = list.reduce(function (a, d) { return a + d.v; }, 0);
    if (!V) return null;
    var rows = list.map(function (d) { var whole = Math.floor(d.v * S / V); return { nr: d.nr, whole: whole, rem: d.v * S - whole * V, seats: whole }; });
    var left = S - rows.reduce(function (a, r) { return a + r.whole; }, 0);
    rows.slice().sort(function (a, b) { return (b.rem - a.rem) || (a.nr - b.nr); }).slice(0, left).forEach(function (r) { r.seats++; });
    return { V: V, rows: new Map(rows.map(function (r) { return [r.nr, r]; })) };
  }
  function renderAlloc() {
    var el = byId('panel-jaotus');
    var h = '<p class="panel-intro">Siin on kogu arvutuskäik samm-sammult. Ringkondade mandaatide arvu ja valijate arvu saab muuta; ülejäänu järgneb häältest.</p>' + (oldRules() ? '<p class="znote">Arvutus kasutab ' + baseYear + '. aasta reegleid: ' + rulesText(baseYear) + '. Allolevad selgitused kirjeldavad kehtivat seadust.</p>' : '') + '<div class="steps">';
    // 1
    var s7 = seats7(model.districts.map(function (d) { return { nr: d.nr, v: d.voters || 0 }; }), 101);
    var diff7 = s7 && model.districts.some(function (d) { return s7.rows.get(d.nr).seats !== d.mandates; });
    h += '<section class="step"><div class="step-h"><h2>1. Ringkonnad ja lihtkvoodid</h2><span class="law">RKVS § 7, § 62 lg 1–2</span></div>' +
      '<p class="note">Lihtkvoot = ringkonna kehtivad hääled ÷ mandaadid. Isikumandaadi saab iga kandidaat, kellel on vähemalt lihtkvoot. Veerg „§ 7 järgi“ näitab, kuidas 101 mandaati jaotuksid sisestatud valijate arvu põhjal suurimate jääkide meetodil. 2023. aasta ametlik jaotus põhines rahvastikuregistri andmetel 1.11.2022 seisuga; siin on eeltäidetud valimispäeva valijate nimekirjade arv, mistõttu tulemus võib ametlikust erineda.' + (baseYear !== 2023 ? ' Varasemate valimiste valijate arvu andmeid mudelis ei ole.' : '') + '</p>' +
      '<div class="card scroll-x"><table class="tbl"><thead><tr><th>Nr</th><th>Ringkond</th><th class="num">Valijaid</th><th class="num">§ 7 järgi</th><th class="num">Mandaate</th><th class="num">Kehtivaid hääli</th><th class="num">Lihtkvoot</th><th class="num">Isiku</th><th class="num">Ringk.</th><th class="num">Kompensatsiooniks</th></tr></thead><tbody>';
    var tot = { v: 0, m: 0, T: 0, P: 0, D: 0, r: 0 };
    res.districts.forEach(function (dr) {
      var d = distMap.get(dr.nr), P = 0, D = 0;
      res.cands.forEach(function (c) { if (c.district === dr.nr) { if (c.elected === 'P') P++; else if (c.elected === 'D') D++; } });
      var r7 = s7 ? s7.rows.get(dr.nr).seats : '–';
      tot.v += d.voters || 0; tot.m += d.mandates; tot.T += dr.T; tot.P += P; tot.D += D; tot.r += d.mandates - P - D;
      h += '<tr><td>' + dr.nr + '</td><td>' + esc(d.short || d.name) + '</td>' +
        '<td class="num"><label class="vh" for="vv-' + dr.nr + '">Ringkonna ' + dr.nr + ' valijate arv</label><input class="inp" type="number" min="0" step="1" id="vv-' + dr.nr + '" data-vv="' + dr.nr + '" value="' + (d.voters || 0) + '"></td>' +
        '<td class="num' + (s7 && r7 !== d.mandates ? '' : ' muted') + '">' + r7 + '</td>' +
        '<td class="num"><label class="vh" for="m-' + dr.nr + '">Ringkonna ' + dr.nr + ' mandaadid</label><input class="inp" type="number" min="0" step="1" id="m-' + dr.nr + '" data-m="' + dr.nr + '" value="' + d.mandates + '"></td>' +
        '<td class="num">' + nf0.format(dr.T) + '</td><td class="num">' + (dr.M && dr.T ? nf2.format(dr.T / dr.M) : '–') + '</td><td class="num">' + P + '</td><td class="num">' + D + '</td><td class="num">' + (d.mandates - P - D) + '</td></tr>';
    });
    h += '</tbody><tfoot><tr><td></td><td>Kokku</td><td class="num">' + nf0.format(tot.v) + '</td><td class="num">' + (s7 ? 101 : '–') + '</td><td class="num">' + tot.m + '</td><td class="num">' + nf0.format(tot.T) + '</td><td></td><td class="num">' + tot.P + '</td><td class="num">' + tot.D + '</td><td class="num">' + tot.r + '</td></tr></tfoot></table></div>' +
      '<div><button type="button" class="btn"' + (diff7 ? '' : ' disabled') + ' data-apply7>Rakenda § 7 jaotus</button> ' + (s7 ? '<span class="small muted">Valijaid ühe mandaadi kohta: ' + nf2.format(s7.V / 101) + '</span>' : '') + '</div></section>';

    // 2
    var qp = res.parties.filter(function (p) { return p.qualifies; }).sort(function (a, b) { return b.votes - a.votes; });
    h += '<section class="step"><div class="step-h"><h2>2. Ringkonnamandaadid</h2><span class="law">RKVS § 62 lg 3</span></div>' +
      '<p class="note">Lahtris on erakonna mandaatide arv ringkonnas (koos isikumandaatidega) ja selle all häälte arv lihtkvootides. Täisosa annab mandaadid; jääk vähemalt 0,75 annab ühe juurde (märk +). Kui kandidaate, kellel on vähemalt 10% lihtkvoodist, ei jätku, jääb mandaat täitmata ja läheb kompensatsiooniks.</p>';
    if (!qp.length) h += '<p class="muted">Ükski erakond ei ületanud 5% künnist.</p>';
    else {
      h += '<div class="card scroll-x"><table class="tbl mx"><thead><tr><th>Ringkond</th>' + qp.map(function (p) { return '<th style="--pc:' + partyOf(p.id).color + '"><span class="pname" style="justify-content:center"><span class="sw"></span>' + esc(partyOf(p.id).short) + '</span></th>'; }).join('') + '<th>Muud isikumandaadid</th></tr></thead><tbody>';
      res.districts.forEach(function (dr) {
        h += '<tr><td><b>' + dr.nr + '</b> <span class="small muted">' + esc(dname(dr.nr)) + '</span></td>';
        qp.forEach(function (p) {
          var e = dr.parties.filter(function (x) { return x.party === p.id; })[0];
          if (!e) { h += '<td class="muted">–</td>'; return; }
          h += '<td><span class="cell' + (e.won ? '' : ' zero') + '"><b>' + e.filled + (e.bonus ? '<sup>+</sup>' : '') + '</b><small>' + nf2.format(e.quotas) + '</small>' + (e.filled < e.won ? '<span class="lost">−' + (e.won - e.filled) + ' täitmata</span>' : '') + '</span></td>';
        });
        var other = res.cands.filter(function (c) { return c.district === dr.nr && c.elected === 'P' && !(c.party && res.qualifies.get(c.party)); });
        h += '<td>' + (other.length ? other.map(function (c) { return esc(c.name); }).join(', ') : '<span class="muted">–</span>') + '</td></tr>';
      });
      h += '</tbody><tfoot><tr><td>Kokku</td>' + qp.map(function (p) { return '<td class="num" style="text-align:center">' + (p.personal + p.district) + '</td>'; }).join('') + '<td></td></tr></tfoot></table></div>';
    }
    h += '</section>';

    // 3
    h += '<section class="step"><div class="step-h"><h2>3. Kompensatsioonimandaadid</h2><span class="law">RKVS § 62 lg 4–8</span></div>' +
      '<p class="note">Jaotada jäi ' + plural(res.pool, 'mandaat', 'mandaati') + '. Iga künnise ületanud erakonna üleriigiline häälte summa jagatakse arvudega 1, 2<sup>0,9</sup>, 3<sup>0,9</sup> … Esimesed jagajad, mille arv võrdub ringkondades saadud mandaatidega, jäetakse vahele (läbi kriipsutatud). Mandaadid saavad suurimad võrdlusarvud kõigi erakondade peale kokku (värvilised).</p>';
    if (qp.length) {
      var used = res.compList.map(function (x) { return x.figure; });
      var lastUsed = res.compList[res.compList.length - 1];
      var nextBest = null;
      res.figures.forEach(function (f) { if (f.state === 'next' && (!nextBest || f.value > nextBest.value)) nextBest = f; });
      h += '<div class="card scroll-x"><table class="tbl"><thead><tr><th>Erakond</th><th class="num">Hääli</th><th class="num">Ringk.</th><th class="num">Komp.</th><th>Võrdlusarvud (häälte summa ÷ k<sup>0,9</sup>)</th></tr></thead><tbody>' +
        qp.map(function (p) {
          var pp = partyOf(p.id), fs = res.figures.filter(function (f) { return f.party === p.id; });
          var dN = p.personal + p.district;
          var chips = (dN ? '<span class="fig district" title="k = 1…' + dN + ' kasutati ringkonnamandaatideks">k 1–' + dN + '</span>' : '') +
            fs.filter(function (f) { return f.state !== 'district'; }).map(function (f) {
              return '<span class="fig ' + f.state + '"' + (f.state === 'comp' ? ' style="color:' + textOn(pp.color) + '"' : '') + ' title="k = ' + f.k + ', jagaja ' + nf4.format(f.divisor) + '">' + nf1.format(f.value) + '</span>';
            }).join('');
          return '<tr style="--pc:' + pp.color + '"><td><div class="pname"><span class="sw"></span>' + esc(pp.short) + '</div></td><td class="num">' + nf0.format(p.votes) + '</td><td class="num">' + dN + '</td><td class="num"><b>' + p.comp + '</b></td><td><div class="figs">' + chips + '</div></td></tr>';
        }).join('') + '</tbody></table></div>';
      h += '<div class="cut">' + (lastUsed ? '<span>Viimane jaotatud võrdlusarv: <b class="tnum">' + nf4.format(lastUsed.figure) + '</b> (' + esc(partyOf(lastUsed.party).short) + ')</span>' : '') + (nextBest ? '<span>Suurim jaotamata võrdlusarv: <b class="tnum">' + nf4.format(nextBest.value) + '</b> (' + esc(partyOf(nextBest.party).short) + ')</span>' : '') + '</div>';
      // saajad
      h += '<h3>Kompensatsioonimandaatide saajad</h3><p class="note">Erakonna sees saavad mandaadi üleriigilises nimekirjas eespool olevad valimata kandidaadid, kellele anti vähemalt 5% oma ringkonna lihtkvoodist; kui neid ei jätku, suurima lihtkvoodi-protsendiga kandidaadid (§ 62 lg 7).</p>' +
        '<div class="card scroll-x"><table class="tbl"><thead><tr><th class="num">Jrk</th><th class="num">Võrdlusarv</th><th>Erakond</th><th>Kandidaat</th><th class="num">Üleriig. koht</th><th class="num">Ringkond</th><th class="num">Hääli</th><th class="num">% lihtkvoodist</th></tr></thead><tbody>' +
        res.compList.map(function (x, i) {
          var c = res.byNr.get(x.nr), pp = partyOf(x.party);
          return '<tr style="--pc:' + pp.color + '"><td class="num">' + (i + 1) + '</td><td class="num">' + nf4.format(x.figure) + '</td><td><div class="pname"><span class="sw"></span>' + esc(pp.short) + '</div></td><td><button type="button" class="cname" data-open="' + c.nr + '">' + esc(c.name) + '</button>' + (c.compBelow5 ? ' <span class="tag warn-tag">alla 5%, § 62 lg 7</span>' : '') + '</td><td class="num">' + c.natPos + '</td><td class="num">' + c.district + '</td><td class="num">' + nf0.format(c.votes) + '</td><td class="num">' + pctQ(c) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    h += '</section>';

    // 4 lisamandaadid
    h += '<section class="step"><div class="step-h"><h2>4. Lisamandaatide võrdlusarvude tabel</h2><span class="law">RKVS § 76, RKLS § 12 lg 4</span></div>' +
      '<p class="note">Tabel algab esimesest võrdlusarvust, mis kompensatsioonimandaatide jaotamisel jäi kasutamata. Seda kasutatakse siis, kui üksikkandidaadina või alla künnise erakonnast valitud liige lahkub või kui erakonna nimekirjas asendusliikmeid enam ei ole. Mandaadi saab selle erakonna järgmine üleriigiline asendusliige.</p>';
    if (res.lisa.length) {
      h += '<div class="card scroll-x"><table class="tbl"><thead><tr><th class="num">Jrk</th><th>Erakond</th><th class="num">k</th><th class="num">Võrdlusarv</th><th>Asendusliige</th></tr></thead><tbody>' +
        res.lisa.slice(0, 15).map(function (x) {
          var pp = partyOf(x.party);
          return '<tr style="--pc:' + pp.color + '"><td class="num">' + x.rank + '</td><td><div class="pname"><span class="sw"></span>' + esc(pp.short) + '</div></td><td class="num">' + x.k + '</td><td class="num">' + nf4.format(x.value) + '</td><td><button type="button" class="cname" data-open="' + x.sub + '">' + esc(cname(x.sub)) + '</button> <span class="small muted">üleriigiline asendusliige ' + x.j + '.</span></td></tr>';
        }).join('') + '</tbody></table></div><p class="small muted">Näidatud on 15 esimest ' + nf0.format(res.lisa.length) + '-st.</p>';
    } else h += '<p class="muted">Lisamandaatide tabel on tühi.</p>';
    h += '</section></div>';
    el.innerHTML = h;
  }

  // ---------- asendusliikmete nimekirjad
  function renderSubs() {
    var el = byId('panel-asendusliikmed');
    var qs = res.parties.filter(function (p) { return p.qualifies; }).sort(function (a, b) { return (b.total - a.total) || (b.votes - a.votes); });
    var h = '<p class="panel-intro">Asendusliikmed registreeritakse ainult 5% künnise ületanud erakondadele (RKVS § 75). Ringkonna nimekirjad on ringkondades valitud liikmetele, üleriigiline nimekiri kompensatsioonimandaadiga valitud liikmetele ning ringkonna nimekirja ammendumisel ka ringkondades valitutele (RKLS § 12).</p>' + oldSubsNote();
    if (!qs.length) { el.innerHTML = h + '<p class="muted">Ükski erakond ei ületanud 5% künnist.</p>'; return; }
    if (!qs.some(function (p) { return p.id === state.subsParty; })) state.subsParty = qs[0].id;
    var pid = state.subsParty, pp = partyOf(pid);
    h += '<div class="pchips" role="group" aria-label="Erakond">' + qs.map(function (p) {
      var x = partyOf(p.id);
      return '<button type="button" class="pchip" style="--pc:' + x.color + '" data-sp="' + p.id + '" aria-pressed="' + (p.id === pid) + '"><span class="sw"></span>' + esc(x.short) + ' <span class="muted">' + p.total + '</span></button>';
    }).join('') + '</div>';
    // ringkonnad
    var dm = res.subs.district.get(pid);
    var withEl = res.districts.map(function (dr) {
      return { dr: dr, el: res.elected.filter(function (c) { return c.party === pid && c.district === dr.nr && c.elected !== 'C'; }) };
    }).filter(function (x) { return x.el.length; });
    h += '<section class="step" style="--pc:' + pp.color + '"><div class="step-h"><h2>' + esc(pp.name) + ': ringkondades valitute asendusliikmed</h2><span class="law">RKVS § 75 lg 3</span></div>' +
      '<p class="note">Valimata jäänud kandidaadid, kellele anti vähemalt 10% ringkonna lihtkvoodist, häälte arvu järjekorras (võrdsuse korral ringkonnanimekirjas eespool olev).</p>';
    if (!withEl.length) h += '<p class="muted">Erakonnal ei ole ringkondades valitud liikmeid.</p>';
    else h += '<div class="dsubs">' + withEl.map(function (x) {
      var l = dm.get(x.dr.nr) || [];
      return '<div class="dsub"><h3>Ringkond ' + x.dr.nr + ' <span class="small muted">' + esc(dname(x.dr.nr)) + '</span></h3><p class="el">Valitud: ' + x.el.map(function (c) { return esc(c.name) + ' (' + (c.elected === 'P' ? 'isiku' : 'ringk.') + ')'; }).join(', ') + '</p>' +
        (l.length ? '<ol>' + l.map(function (nr) { var c = res.byNr.get(nr); return '<li><button type="button" class="cname" data-open="' + nr + '">' + esc(c.name) + '</button> <span class="small muted tnum">' + nf0.format(c.votes) + ' · ' + pctQ(c) + '</span></li>'; }).join('') + '</ol>'
          : '<p class="small muted">Nimekiri on tühi — asendaja tuleb üleriigilisest nimekirjast.</p>') + '</div>';
    }).join('') + '</div>';
    h += '</section>';
    // üleriigiline
    var nat = res.subs.national.get(pid) || [];
    var lisaRank = new Map(res.lisa.filter(function (x) { return x.party === pid; }).map(function (x) { return [x.sub, x.rank]; }));
    h += '<section class="step" style="margin-top:26px"><div class="step-h"><h2>Üleriigiline asendusliikmete nimekiri</h2><span class="law">RKVS § 75 lg 4</span></div>' +
      '<p class="note">Esmalt kandidaadid, kellele anti vähemalt 5% oma ringkonna lihtkvoodist, erakonna üleriigilise nimekirja järjekorras; seejärel ülejäänud valimata kandidaadid lihtkvoodi-protsendi järgi. Viimane veerg näitab kohta lisamandaatide tabelis (§ 76), mida kasutab ka ametlik väljund.</p>';
    var aCount = nat.filter(function (nr) { return reach(res.byNr.get(nr), 20); }).length;
    h += '<div class="card scroll-x"><table class="tbl"><thead><tr><th class="num">Jrk</th><th>Kandidaat</th><th class="num">Üleriig. koht</th><th class="num">Ringkond</th><th class="num">Hääli</th><th class="num">% lihtkvoodist</th><th class="num">§ 76 koht</th></tr></thead><tbody>' +
      nat.map(function (nr, i) {
        var c = res.byNr.get(nr);
        var st = seatedNow.has(nr) ? ' <span class="tag ok-tag">Riigikogus</span>' : (sim.gone.has(nr) ? ' <span class="tag">loobunud</span>' : '');
        return '<tr class="' + (i >= aCount ? 'grp-b' : '') + (i === aCount && i > 0 ? ' split' : '') + '"><td class="num">' + (i + 1) + '</td><td><button type="button" class="cname" data-open="' + nr + '">' + esc(c.name) + '</button>' + st + '</td><td class="num">' + c.natPos + '</td><td class="num">' + c.district + '</td><td class="num">' + nf0.format(c.votes) + '</td><td class="num">' + pctQ(c) + '</td><td class="num muted">' + (lisaRank.get(nr) || '–') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    if (aCount < nat.length) h += '<p class="small muted">Jooneni ' + aCount + ' kandidaati ≥ 5% lihtkvoodist (nimekirja järjekorras), pärast joont ' + (nat.length - aCount) + ' kandidaati alla 5% (protsendi järgi).</p>';
    h += '</section>';
    el.innerHTML = h;
  }

  // ---------- kontroll
  var VER = null;
  function verify() {
    var r = E.compute(BASE23), off = RAW.official;
    var om = new Map(off.elected.map(function (e) { return [e[0], e]; }));
    var el = 0, ty = 0, ra = 0, fig = 0, figT = 0, ord = 0;
    r.elected.forEach(function (c) {
      var o = om.get(c.nr); if (!o) return;
      el++;
      if (o[1] === c.elected) ty++;
      if ((c.votes * c.M / c.T).toFixed(4) === o[3]) ra++;
      if (o[2] === c.orderNr) ord++;
      if (c.elected === 'C') { figT++; if (c.compFigure.toFixed(4) === o[4]) fig++; }
    });
    var natT = 0, natOk = 0, lisaOk = 0, dl = 0, dlOk = 0, dn = 0;
    Object.keys(off.substitutes).forEach(function (pid) {
      var s = off.substitutes[pid], mine = r.subs.national.get(+pid) || [];
      s.national.forEach(function (x, i) { natT++; if (mine[i] === x[0]) natOk++; });
      var lr = new Map(r.lisa.filter(function (x) { return x.party === +pid; }).map(function (x) { return [x.sub, x.rank]; }));
      s.national.forEach(function (x) { if (lr.get(x[0]) === x[1]) lisaOk++; });
      var dmap = r.subs.district.get(+pid) || new Map(), keys = new Set(Object.keys(s.districts).map(Number));
      dmap.forEach(function (l, d) { if (l.length) keys.add(d); });
      keys.forEach(function (d) { dl++; var a = dmap.get(d) || [], b = s.districts[String(d)] || []; dn += b.length; if (JSON.stringify(a) === JSON.stringify(b)) dlOk++; });
    });
    VER = [
      { t: 'Valituks osutunud kandidaadid', a: el, b: off.elected.length, n: r.elected.length === off.elected.length },
      { t: 'Mandaadi liik (isiku-, ringkonna-, kompensatsioonimandaat)', a: ty, b: off.elected.length },
      { t: 'Mandaatide järjekord ametlikus väljundis', a: ord, b: off.elected.length },
      { t: 'Häälte suhe lihtkvooti (4 komakohta)', a: ra, b: off.elected.length },
      { t: 'Kompensatsioonimandaatide võrdlusarvud (4 komakohta)', a: fig, b: figT },
      { t: 'Ringkondade asendusliikmete nimekirjad (' + dn + ' nime)', a: dlOk, b: dl },
      { t: 'Üleriigilised asendusliikmed õiges järjekorras', a: natOk, b: natT },
      { t: 'Asendusliikmete kohad lisamandaatide tabelis (§ 76)', a: lisaOk, b: natT }
    ];
  }
  function renderCheck() {
    var el = byId('panel-kontroll');
    if (!VER) verify();
    var allOk = VER.every(function (x) { return x.a === x.b && x.n !== false; });
    var h = '<p class="panel-intro">Arvutusmootor käivitatakse lehe avamisel 2023. aasta ametlike häältega ja tulemust võrreldakse Vabariigi Valimiskomisjoni avaldatud andmetega (rk2023.valimised.ee: „Mandaatide omandamise viis“ ja „Riigikogu asendusliikmed“, seisuga 20.04.2023). See kontroll ei sõltu sinu muudatustest.</p>';
    h += '<div class="checks">' + VER.map(function (x) {
      var ok = x.a === x.b && x.n !== false;
      return '<div class="check' + (ok ? '' : ' bad') + '"><span class="mark">' + (ok ? '✓' : '!') + '</span><span>' + esc(x.t) + '</span><span class="cnt">' + x.a + ' / ' + x.b + '</span></div>';
    }).join('') + '</div>';
    h += '<p class="' + (allOk ? 'okmsg' : 'err') + '" style="margin-top:10px">' + (allOk ? 'Mudel annab 2023. aasta andmetega täpselt ametliku tulemuse.' : 'Mudel erineb ametlikust tulemusest.') + '</p>';
    // stsenaarium
    if (baseYear !== 2023) h += histCheckHTML();
    h += '<section class="step" style="margin-top:28px"><div class="step-h"><h2>Sinu stsenaarium võrreldes ' + baseYear + '. aasta tegeliku tulemusega</h2></div>';
    if (!isBase) h += '<p class="muted">Imporditud andmeid ei saa ' + baseYear + '. aasta tulemusega võrrelda.</p>';
    else {
      var now = new Map(res.elected.map(function (c) { return [c.nr, c.elected]; }));
      var inn = [], outn = [], typ = [];
      now.forEach(function (t, nr) { if (!OFF_TYPE.has(nr)) inn.push(nr); else if (OFF_TYPE.get(nr) !== t) typ.push(nr); });
      OFF_TYPE.forEach(function (t, nr) { if (!now.has(nr)) outn.push(nr); });
      if (!inn.length && !outn.length && !typ.length) h += '<p class="muted">Koosseis on sama mis ' + baseYear + '. aastal' + (changedCount() ? ', kuigi hääli on muudetud.' : '.') + '</p>';
      else {
        var li = function (nr, extra) { var c = candMap.get(nr); return '<li><button type="button" class="cname" data-open="' + nr + '">' + esc(c.name) + '</button> <span class="small muted">' + esc(partyOf(c.party).short) + ', ringkond ' + c.district + (extra ? ', ' + extra : '') + '</span></li>'; };
        h += '<div class="diffcols"><div class="card" style="padding:12px 14px"><h3>Pääsevad Riigikokku (' + inn.length + ')</h3>' + (inn.length ? '<ul>' + inn.map(function (nr) { return li(nr, TYPE_LC[now.get(nr)]); }).join('') + '</ul>' : '<p class="small muted">—</p>') + '</div>' +
          '<div class="card" style="padding:12px 14px"><h3>Jäävad välja (' + outn.length + ')</h3>' + (outn.length ? '<ul>' + outn.map(function (nr) { return li(nr, 'oli ' + TYPE_LC[OFF_TYPE.get(nr)]); }).join('') + '</ul>' : '<p class="small muted">—</p>') + '</div></div>';
        if (typ.length) h += '<div class="card" style="padding:12px 14px;margin-top:12px"><h3>Muutus mandaadi liigis (' + typ.length + ')</h3><ul>' + typ.map(function (nr) { return li(nr, TYPE_LC[OFF_TYPE.get(nr)] + ' → ' + TYPE_LC[now.get(nr)]); }).join('') + '</ul></div>';
      }
    }
    h += '</section>';
    el.innerHTML = h;
  }

  // ---------- detailandmed: jaoskonnad, omavalitsused, e-hääled (2023)
  function hasDetail() { return !!DET && isBase; }
  function scaleOf(nr) { // kandidaadi praegused hääled / 2023 hääled; null = jaotus puudub
    var c = candMap.get(nr); if (!c) return 0;
    var b = BASE_VOTES.get(nr);
    if (!b) return c.votes ? null : 0;
    return c.votes / b;
  }
  function sumArr(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; }
  function n0(x) { return nf0.format(Math.round(x)); }
  function pct1(x) { return x != null && isFinite(x) ? nf1.format(x * 100) + '%' : '–'; }
  function distIdx(d) {
    var dd = DET.dist[d]; if (!dd) return null;
    if (!dd.uPos) {
      dd.uPos = new Map(dd.u.map(function (ui, i) { return [ui, i]; }));
      dd.stU = dd.s.map(function (s) { return dd.uPos.get(s[0]); });
    }
    return dd;
  }
  // Ringkonna d hääled filtrile vastavate kandidaatide kaupa jaoskondadesse ja omavalitsustesse
  function breakdown(d, filter) {
    var dd = distIdx(d); if (!dd) return null;
    var S = dd.s.length, U = dd.u.length, i;
    var r = { st: new Array(S).fill(0), up: new Array(U).fill(0), ue: new Array(U).fill(0), foreign: 0, other: 0, eAbroad: 0, unknown: 0, total: 0 };
    model.candidates.forEach(function (c) {
      if (c.district !== d || !filter(c)) return;
      r.total += c.votes;
      var raw = DET.cand[c.nr], f = scaleOf(c.nr);
      if (!raw || f === null) { r.unknown += c.votes; return; }
      if (!f) return;
      for (i = 0; i < S; i++) if (raw[0][i]) { r.st[i] += raw[0][i] * f; r.up[dd.stU[i]] += raw[0][i] * f; }
      for (i = 0; i < U; i++) if (raw[1][i]) r.ue[i] += raw[1][i] * f;
      r.foreign += raw[2] * f; r.other += raw[3] * f; r.eAbroad += raw[4] * f;
    });
    r.paper = sumArr(r.up) + r.foreign + r.other;
    r.e = sumArr(r.ue) + r.eAbroad;
    return r;
  }
  function eShareOf(filter) {
    var e = 0, t = 0;
    model.candidates.forEach(function (c) {
      if (!filter(c)) return;
      var raw = DET.cand[c.nr], f = scaleOf(c.nr);
      if (!raw || f === null || !f) return;
      e += (sumArr(raw[1]) + raw[4]) * f; t += c.votes;
    });
    return t ? e / t : null;
  }
  function stName(ui, nm) {
    var lab = '';
    DET.units[ui][5].forEach(function (x) { if (x[0] === nm) lab = x[1]; });
    return 'Jaoskond nr ' + nm + (lab ? ' · ' + lab : '');
  }
  function unitName(ui) { var u = DET.units[ui]; return u[4] + (u[1] !== '0784' && u[3] !== u[1] ? ', ' + u[2] : ''); }
  function scenarioNote() {
    return changedCount() > 0 ? '<p class="znote">Hääli on muudetud. Jaoskondade, omavalitsuste ning paber- ja e-häälte jaotus on arvutatud 2023. aasta jaotuse põhjal proportsionaalselt kandidaatide uute häältega.</p>' : '';
  }
  function sortbarHTML() {
    return '<div class="sortbar" role="group" aria-label="Järjestus"><span>Järjesta</span><button type="button" data-zsort="share" aria-pressed="' + (state.zsort === 'share') + '">osakaalu järgi</button><button type="button" data-zsort="votes" aria-pressed="' + (state.zsort === 'votes') + '">häälte järgi</button></div>';
  }
  function sortRows(rows) {
    var k = state.zsort === 'votes' ? 'votes' : 'share';
    return rows.sort(function (a, b) { return ((b[k] || 0) - (a[k] || 0)) || (b.votes - a.votes); });
  }
  function shareBar(v, max) { return '<span class="bar"><i style="width:' + (max > 0 ? Math.min(100, v / max * 100) : 0).toFixed(1) + '%"></i></span>'; }
  function resultChip(c) {
    if (c.out) return '<span class="chip chip-out">välja langenud</span>';
    if (c.elected) return '<span class="chip chip-el">' + glyph(c.elected, partyOf(c.party).color) + TYPE[c.elected] + '</span>';
    if (c.party && res.qualifies.get(c.party)) return '<span class="small muted">asendusliige' + (c.distSubRank ? ' R' + c.distSubRank : '') + (c.natSubRank ? ' Ü' + c.natSubRank : '') + '</span>';
    return '<span class="small muted">–</span>';
  }
  function pv(pid, d) { // arvesse läinud hääled (§ 62 lg 9 välja langenud üksikkandidaadi hääli ei arvestata)
    var s = 0;
    res.cands.forEach(function (c) { if (c.counted && c.party === pid && (!d || c.district === d)) s += c.votes; });
    return s;
  }
  function isP(pid) { return function (c) { return (c.party || 0) === pid; }; }
  function pshort(pid) { return pid ? partyOf(pid).short : 'Üksikkandidaadid'; }

  // ---------- süvavaade
  function goZoom() {
    if (state.tab !== 'syvavaade') setTab('syvavaade'); else { renderZoom(); saveSoon(); }
    var nav = document.querySelector('.tabs'), r = nav.getBoundingClientRect();
    if (r.top < 0 || r.top > innerHeight * 0.6) nav.scrollIntoView({ block: 'start' });
  }
  function zoomCrumbs() {
    var z = state.zoom, items = [{ label: 'Kõik erakonnad', attrs: 'data-zroot="1"' }];
    if (z.p != null) items.push({ label: partyOf(z.p).name, attrs: 'data-zp="' + z.p + '"' });
    if (z.d != null) items.push({ label: 'Ringkond ' + z.d + ' · ' + dname(z.d), attrs: 'data-zp="' + z.p + '" data-zd="' + z.d + '"' });
    if (z.u != null) items.push({ label: DET.units[z.u][4] });
    if (z.c != null) items.push({ label: cname(z.c) });
    return '<nav class="crumbs" aria-label="Asukoht süvavaates">' + items.map(function (it, i) {
      return i === items.length - 1 ? '<span class="crumb-cur" aria-current="page">' + esc(it.label) + '</span>' : '<button type="button" class="crumb" ' + it.attrs + '>' + esc(it.label) + '</button>';
    }).join('<span class="sep" aria-hidden="true">›</span>') + '</nav>';
  }
  function renderZoom() {
    var el = byId('panel-syvavaade'), z = state.zoom;
    if (z.c != null) { var zc = candMap.get(z.c); if (zc) { z.p = zc.party || 0; z.d = zc.district; z.u = null; } else z.c = null; }
    if (z.p != null && z.p !== 0 && !partyMap.has(z.p)) z.p = null;
    if (z.p === 0 && !model.candidates.some(function (c) { return !c.party; })) z.p = null;
    if (z.p == null) { z.d = null; z.u = null; z.c = null; }
    if (z.d != null && !distMap.has(z.d)) { z.d = null; z.u = null; }
    if (z.u != null && (!hasDetail() || !DET.units[z.u] || DET.units[z.u][0] !== z.d)) z.u = null;
    var h = '<p class="panel-intro">' + (hasDetail() ? 'Vaata tulemust lähemalt: erakond → ringkondade edetabel → kandidaatide ja omavalitsuste edetabel → jaoskonnad. Ridadel saab klõpsata.' : 'Vaata tulemust lähemalt: erakond → ringkondade edetabel → kandidaatide edetabel. Ridadel saab klõpsata. Omavalitsuste, jaoskondade ja e-häälte jaotus on olemas ainult 2023. aasta valimiste kohta.') + '</p>' + zoomCrumbs();
    if (hasDetail()) h += scenarioNote();
    if (z.c != null) h += zoomCandHTML(z.c);
    else if (z.p == null) h += zoomRootHTML();
    else if (z.d == null) h += zoomPartyHTML(z.p);
    else if (z.u == null) h += zoomDistrictHTML(z.p, z.d);
    else h += zoomUnitHTML(z.p, z.d, z.u);
    el.innerHTML = h;
  }
  function zoomRootHTML() {
    var det = hasDetail();
    var rows = res.parties.filter(function (p) { return p.votes > 0; }).map(function (p) { return { id: p.id, votes: p.votes, share: p.share, seats: p.total }; });
    if (res.indVotes > 0) rows.push({ id: 0, votes: res.indVotes, share: res.N ? res.indVotes / res.N : 0, seats: res.indElected });
    rows.sort(function (a, b) { return b.votes - a.votes; });
    var h = '<section class="zsec"><div class="zsec-h"><h2>Erakonnad</h2><span class="small muted">Vali erakond, et näha ringkondade edetabelit</span></div><div class="card scroll-x"><table class="tbl"><thead><tr><th>Erakond</th><th class="num">Hääli</th><th class="num">%</th><th class="num">Mandaate</th><th>Tugevaim ringkond</th>' + (det ? '<th class="num">E-häälte osakaal</th>' : '') + '</tr></thead><tbody>';
    rows.forEach(function (r) {
      var p = partyOf(r.id), best = null;
      res.districts.forEach(function (dr) { var s = dr.T ? pv(r.id, dr.nr) / dr.T : 0; if (!best || s > best.s) best = { d: dr.nr, s: s }; });
      h += '<tr class="rowlink" data-zp="' + r.id + '" style="--pc:' + p.color + '"><td><div class="pname"><span class="sw"></span><button type="button" class="plink" data-zp="' + r.id + '">' + esc(p.name) + '</button></div></td><td class="num">' + nf0.format(r.votes) + '</td><td class="num">' + pct1(r.share) + '</td><td class="num"><b>' + r.seats + '</b></td><td>' + (best && best.s ? best.d + ' · ' + esc(dname(best.d)) + ' <span class="muted tnum">' + pct1(best.s) + '</span>' : '–') + '</td>' + (det ? '<td class="num">' + pct1(eShareOf(isP(r.id))) + '</td>' : '') + '</tr>';
    });
    return h + '</tbody></table></div></section>';
  }
  function zoomPartyHTML(pid) {
    var p = partyOf(pid), det = hasDetail();
    var ps = pid ? res.parties.filter(function (x) { return x.id === pid; })[0] : { votes: res.indVotes, share: res.N ? res.indVotes / res.N : 0, personal: res.indElected, district: 0, comp: 0, total: res.indElected, qualifies: false };
    var h = '<div class="zhead" style="--pc:' + p.color + '"><h2><span class="sw"></span>' + esc(p.name) + '</h2><dl class="comp-row">' +
      stat('Hääli', nf0.format(ps.votes), pct1(ps.share) + ' kehtivatest') +
      stat('Mandaate', ps.total, ps.personal + ' isiku-, ' + ps.district + ' ringkonna-, ' + ps.comp + ' kompensatsiooni-') +
      (pid ? stat('5% künnis', ps.qualifies ? 'ületatud' : 'ei ületanud') : '') +
      (det ? stat('E-häälte osakaal', pct1(eShareOf(isP(pid)))) : '') + '</dl></div>';
    var rows = res.districts.map(function (dr) {
      if (!model.candidates.some(function (c) { return (c.party || 0) === pid && c.district === dr.nr; })) return null;
      var v = pv(pid, dr.nr), pd = 0, cc = 0;
      res.elected.forEach(function (c) { if ((c.party || 0) === pid && c.district === dr.nr) { if (c.elected === 'C') cc++; else pd++; } });
      return {
        d: dr.nr, votes: v, share: dr.T ? v / dr.T : 0, quotas: dr.T ? v * dr.M / dr.T : 0, pd: pd, cc: cc,
        rank: 1 + dr.parties.filter(function (e) { return e.party !== pid && e.votes > v; }).length, n: dr.parties.length + (pid ? 0 : 1),
        es: det ? eShareOf(function (c) { return (c.party || 0) === pid && c.district === dr.nr; }) : null
      };
    }).filter(Boolean);
    sortRows(rows);
    var mx = Math.max.apply(null, rows.map(function (r) { return r.share; }).concat([0]));
    h += '<div class="zgrid zgrid-2"><section class="zsec"><div class="zsec-h"><h3>Ringkondade edetabel</h3>' + sortbarHTML() + '</div><div class="card scroll-x"><table class="tbl"><thead><tr><th class="num">#</th><th>Ringkond</th><th class="num">Hääli</th><th class="num">% ringkonnas</th><th class="num" title="Koht erakondade seas ringkonnas">Koht</th><th class="num">Lihtkvoote</th><th class="num" title="Isiku- ja ringkonnamandaadid">Ringk. mand.</th><th class="num" title="Selle ringkonna kandidaatide kompensatsioonimandaadid">Komp.</th>' + (det ? '<th class="num">E-osakaal</th>' : '') + '</tr></thead><tbody>' +
      rows.map(function (r, i) {
        return '<tr class="rowlink" data-zp="' + pid + '" data-zd="' + r.d + '" style="--pc:' + p.color + '"><td class="num rk">' + (i + 1) + '</td><td><button type="button" class="plink" data-zp="' + pid + '" data-zd="' + r.d + '">' + r.d + ' · ' + esc(dname(r.d)) + '</button></td><td class="num">' + nf0.format(r.votes) + '</td><td class="num">' + pct1(r.share) + shareBar(r.share, mx) + '</td><td class="num">' + r.rank + '/' + r.n + '</td><td class="num">' + nf2.format(r.quotas) + '</td><td class="num">' + (r.pd || '·') + '</td><td class="num">' + (r.cc || '·') + '</td>' + (det ? '<td class="num">' + pct1(r.es) + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div></section>';
    var top = model.candidates.filter(isP(pid)).sort(function (a, b) { return b.votes - a.votes; }).slice(0, 15);
    h += '<section class="zsec"><div class="zsec-h"><h3>Enim hääli saanud kandidaadid</h3><span class="small muted">15 esimest üle Eesti</span></div><div class="card scroll-x"><table class="tbl"><thead><tr><th class="num">#</th><th>Kandidaat</th><th>Ringkond</th><th class="num">Hääli</th><th class="num">% lihtkvoodist</th><th>Tulemus</th></tr></thead><tbody>' +
      top.map(function (m, i) {
        var c = res.byNr.get(m.nr);
        return '<tr class="rowlink" data-zc="' + m.nr + '"><td class="num rk">' + (i + 1) + '</td><td><span class="nb-sm">' + m.nr + '</span><button type="button" class="plink" data-zc="' + m.nr + '">' + esc(m.name) + '</button></td><td>' + m.district + ' · ' + esc(dname(m.district)) + '</td><td class="num">' + nf0.format(m.votes) + '</td><td class="num">' + pctQ(c) + '</td><td>' + resultChip(c) + '</td></tr>';
      }).join('') + '</tbody></table></div></section></div>';
    return h;
  }
  function zoomDistrictHTML(pid, d) {
    var p = partyOf(pid), det = hasDetail();
    var dr = res.districts.filter(function (x) { return x.nr === d; })[0];
    var e = dr.parties.filter(function (x) { return x.party === pid; })[0];
    var list = model.candidates.filter(function (c) { return (c.party || 0) === pid && c.district === d; }).sort(function (a, b) { return (b.votes - a.votes) || (a.natPos - b.natPos); });
    var v = pv(pid, d);
    var mand = e ? (e.qualifies ? e.filled + (e.bonus ? ' (jääk ≥ 75%)' : '') + (e.filled < e.won ? ', ' + (e.won - e.filled) + ' täitmata' : '') : (e.personal ? e.personal + ' isikumandaat' : 'alla 5% künnise')) : res.elected.filter(function (c) { return !c.party && c.district === d; }).length;
    var h = '<div class="zhead" style="--pc:' + p.color + '"><h2><span class="sw"></span>' + esc(pshort(pid)) + ' ringkonnas nr ' + d + '</h2><dl class="comp-row">' +
      stat('Hääli', nf0.format(v), pct1(dr.T ? v / dr.T : 0) + ' ringkonna häältest') +
      stat('Lihtkvoote', nf2.format(dr.T ? v * dr.M / dr.T : 0), 'lihtkvoot ' + (dr.T && dr.M ? nf2.format(dr.T / dr.M) : '–')) +
      stat('Mandaate ringkonnas', mand) +
      (det ? stat('E-häälte osakaal', pct1(eShareOf(function (c) { return (c.party || 0) === pid && c.district === d; }))) : '') + '</dl></div>';
    h += '<div class="zgrid zgrid-2"><section class="zsec"><div class="zsec-h"><h3>Kandidaatide edetabel</h3><span class="small muted">' + esc(dname(d)) + '</span></div><div class="card scroll-x"><table class="tbl"><thead><tr><th class="num">#</th><th>Kandidaat</th><th class="num">Hääli</th><th class="num">% erakonna häältest</th><th class="num">% lihtkvoodist</th>' + (det ? '<th class="num">E-osakaal</th>' : '') + '<th>Tulemus</th></tr></thead><tbody>' +
      list.map(function (m, i) {
        var c = res.byNr.get(m.nr), raw = det ? DET.cand[m.nr] : null, b = BASE_VOTES.get(m.nr);
        var es = raw && b ? (sumArr(raw[1]) + raw[4]) / b : null;
        return '<tr class="rowlink" data-zc="' + m.nr + '"><td class="num rk">' + (i + 1) + '</td><td><span class="nb-sm">' + m.nr + '</span><button type="button" class="plink" data-zc="' + m.nr + '">' + esc(m.name) + '</button></td><td class="num">' + nf0.format(m.votes) + '</td><td class="num">' + pct1(v ? m.votes / v : 0) + '</td><td class="num">' + pctQ(c) + '</td>' + (det ? '<td class="num">' + pct1(es) + '</td>' : '') + '<td>' + resultChip(c) + '</td></tr>';
      }).join('') + '</tbody></table></div></section>';
    if (det) {
      var dd = distIdx(d), r = breakdown(d, isP(pid)), tot = breakdown(d, function () { return true; });
      var rows = dd.u.map(function (ui, j) {
        var pv2 = r.up[j] + r.ue[j], tv = tot.up[j] + tot.ue[j];
        return { ui: ui, votes: pv2, share: tv ? pv2 / tv : 0, paper: r.up[j], e: r.ue[j], ns: dd.stU.filter(function (x) { return x === j; }).length };
      });
      sortRows(rows);
      var mx = Math.max.apply(null, rows.map(function (x) { return x.share; }).concat([0]));
      var ov = r.foreign + r.other + r.eAbroad, ot = tot.foreign + tot.other + tot.eAbroad;
      h += '<section class="zsec"><div class="zsec-h"><h3>Omavalitsused ja linnaosad</h3>' + sortbarHTML() + '</div><p class="small muted">Omavalitsuse hääled = seal asuvates jaoskondades antud paberhääled + selle elanike e-hääled. Klõpsa real, et näha jaoskondi.</p><div class="card scroll-x"><table class="tbl"><thead><tr><th class="num">#</th><th>Omavalitsus</th><th class="num">Hääli</th><th class="num">% kehtivatest</th><th class="num">Paber</th><th class="num">E</th><th class="num">E-osakaal</th></tr></thead><tbody>' +
        rows.map(function (x, i) {
          return '<tr class="rowlink" data-zu="' + x.ui + '" style="--pc:' + p.color + '"><td class="num rk">' + (i + 1) + '</td><td><button type="button" class="plink" data-zu="' + x.ui + '">' + esc(unitName(x.ui)) + '</button> <span class="small muted">' + plural(x.ns, 'jaoskond', 'jaoskonda') + '</span></td><td class="num">' + n0(x.votes) + '</td><td class="num">' + pct1(x.share) + shareBar(x.share, mx) + '</td><td class="num">' + n0(x.paper) + '</td><td class="num">' + n0(x.e) + '</td><td class="num">' + pct1(x.votes ? x.e / x.votes : null) + '</td></tr>';
        }).join('') +
        '<tr><td></td><td class="muted">Välisriik ja väljaspool ringkonda</td><td class="num">' + n0(ov) + '</td><td class="num">' + pct1(ot ? ov / ot : null) + '</td><td class="num">' + n0(r.foreign + r.other) + '</td><td class="num">' + n0(r.eAbroad) + '</td><td class="num">' + pct1(ov ? r.eAbroad / ov : null) + '</td></tr>' +
        '</tbody></table></div>' + (r.unknown ? '<p class="small muted">' + n0(r.unknown) + ' häält on lisatud kandidaatidele, kellel 2023. aastal hääli polnud; nende jaotus pole teada.</p>' : '') + '</section>';
    }
    return h + '</div>';
  }
  function zoomUnitHTML(pid, d, ui) {
    var p = partyOf(pid), dd = distIdx(d), j = dd.uPos.get(ui), u = DET.units[ui];
    var r = breakdown(d, isP(pid)), tot = breakdown(d, function () { return true; });
    var cands = model.candidates.filter(function (c) { return (c.party || 0) === pid && c.district === d; });
    var idx = []; dd.stU.forEach(function (x, i) { if (x === j) idx.push(i); });
    var pvU = r.up[j] + r.ue[j], tvU = tot.up[j] + tot.ue[j];
    var h = '<div class="zhead" style="--pc:' + p.color + '"><h2><span class="sw"></span>' + esc(pshort(pid)) + ': ' + esc(u[4]) + '</h2><dl class="comp-row">' +
      stat('Hääli', n0(pvU), pct1(tvU ? pvU / tvU : null) + ' kehtivatest') +
      stat('Paberhääled jaoskondades', n0(r.up[j]), pct1(tot.up[j] ? r.up[j] / tot.up[j] : null) + ' paberhäältest') +
      stat('E-hääled (elanikud)', n0(r.ue[j]), pct1(tot.ue[j] ? r.ue[j] / tot.ue[j] : null) + ' e-häältest') +
      stat('Maakond', esc(u[2])) + '</dl></div>';
    var rows = idx.map(function (i) {
      var best = null;
      cands.forEach(function (c) { var raw = DET.cand[c.nr], f = scaleOf(c.nr); if (!raw || !f) return; var x = raw[0][i] * f; if (x > 0 && (!best || x > best.v)) best = { nr: c.nr, v: x }; });
      return { i: i, votes: r.st[i], share: tot.st[i] ? r.st[i] / tot.st[i] : 0, all: tot.st[i], best: best };
    });
    sortRows(rows);
    var mx = Math.max.apply(null, rows.map(function (x) { return x.share; }).concat([0]));
    h += '<div class="zgrid zgrid-2"><section class="zsec"><div class="zsec-h"><h3>Jaoskondade edetabel</h3>' + sortbarHTML() + '</div><p class="small muted">Jaoskonnas on ainult seal antud paberhääled (sh eelhääletus); e-hääli arvestatakse omavalitsuse tasemel.</p><div class="card scroll-x"><table class="tbl"><thead><tr><th class="num">#</th><th>Jaoskond</th><th class="num">Erakonna hääli</th><th class="num">% jaoskonna häältest</th><th class="num">Jaoskonna hääli</th><th>Erakonna enim hääli saanud kandidaat</th></tr></thead><tbody>' +
      rows.map(function (x, k) {
        return '<tr style="--pc:' + p.color + '"><td class="num rk">' + (k + 1) + '</td><td>' + esc(stName(ui, dd.s[x.i][1])) + '</td><td class="num">' + n0(x.votes) + '</td><td class="num">' + pct1(x.share) + shareBar(x.share, mx) + '</td><td class="num muted">' + n0(x.all) + '</td><td>' + (x.best ? '<button type="button" class="plink" data-zc="' + x.best.nr + '">' + esc(cname(x.best.nr)) + '</button> <span class="small muted tnum">' + n0(x.best.v) + '</span>' : '–') + '</td></tr>';
      }).join('') + '</tbody></table></div></section>';
    var crows = cands.map(function (c) {
      var raw = DET.cand[c.nr], f = scaleOf(c.nr);
      if (!raw || !f) return { nr: c.nr, votes: 0, paper: 0, e: 0 };
      var pp = 0; idx.forEach(function (i) { pp += raw[0][i] * f; });
      return { nr: c.nr, votes: pp + raw[1][j] * f, paper: pp, e: raw[1][j] * f };
    }).filter(function (x) { return x.votes > 0; }).sort(function (a, b) { return b.votes - a.votes; });
    h += '<section class="zsec"><div class="zsec-h"><h3>Kandidaadid selles omavalitsuses</h3></div><div class="card scroll-x"><table class="tbl"><thead><tr><th class="num">#</th><th>Kandidaat</th><th class="num">Hääli</th><th class="num">% erakonna häältest</th><th class="num">Paber</th><th class="num">E</th></tr></thead><tbody>' +
      crows.map(function (x, k) {
        return '<tr class="rowlink" data-zc="' + x.nr + '"><td class="num rk">' + (k + 1) + '</td><td><span class="nb-sm">' + x.nr + '</span><button type="button" class="plink" data-zc="' + x.nr + '">' + esc(cname(x.nr)) + '</button></td><td class="num">' + n0(x.votes) + '</td><td class="num">' + pct1(pvU ? x.votes / pvU : null) + '</td><td class="num">' + n0(x.paper) + '</td><td class="num">' + n0(x.e) + '</td></tr>';
      }).join('') + '</tbody></table></div></section></div>';
    return h;
  }
  function zoomCandHTML(nr) {
    var m = candMap.get(nr), c = res.byNr.get(nr), p = partyOf(m.party), d = m.district, det = hasDetail();
    var dr = res.districts.filter(function (x) { return x.nr === d; })[0];
    var e = dr && m.party ? dr.parties.filter(function (x) { return x.party === m.party; })[0] : null;
    var rank = e ? e.ranked.indexOf(nr) + 1 : 0;
    var h = '<div class="zhead" style="--pc:' + p.color + '"><h2><span class="numbox' + (c.elected ? ' is-el' : '') + '">' + nr + '</span>' + esc(m.name) + '</h2><dl class="comp-row">' +
      stat('Hääli', nf0.format(m.votes), pctQ(c) + ' lihtkvoodist') +
      stat('Erakond', esc(m.party ? p.short : 'üksikkandidaat'), rank ? 'ringkonnas häälte arvult ' + rank + '.' : '') +
      stat('Tulemus', resultChip(c)) + '</dl><button type="button" class="btn btn-sm" data-open="' + nr + '">Kandidaadi kaart ja asendusliikmed</button></div>';
    var raw = det ? DET.cand[nr] : null, f = scaleOf(nr);
    if (!raw || f === null) return h + '<p class="muted">' + (det ? 'Selle kandidaadi häälte jaotus pole teada (2023. aastal hääli polnud).' : 'Jaoskondade ja e-häälte jaotus on olemas ainult 2023. aasta andmestikul.') + '</p>';
    var dd = distIdx(d), tot = breakdown(d, function () { return true; });
    var paperSt = sumArr(raw[0]) * f, eU = sumArr(raw[1]) * f;
    h += '<div class="zgrid zgrid-2"><section class="zsec"><h3>Häälte koosseis</h3><dl class="comp-row">' +
      stat('Paberhääled jaoskondades', n0(paperSt), pct1(m.votes ? paperSt / m.votes : null)) +
      stat('E-hääled (elukoha järgi)', n0(eU), pct1(m.votes ? eU / m.votes : null)) +
      stat('Välisriigis antud', n0(raw[2] * f)) + stat('Väljaspool ringkonda', n0(raw[3] * f)) + stat('Välismaalt e-hääled', n0(raw[4] * f)) + '</dl></section>';
    var urows = dd.u.map(function (ui, j) {
      var pp = 0; dd.stU.forEach(function (x, i) { if (x === j) pp += raw[0][i] * f; });
      var tv = tot.up[j] + tot.ue[j], v = pp + raw[1][j] * f;
      return { ui: ui, votes: v, share: tv ? v / tv : 0, paper: pp, e: raw[1][j] * f };
    });
    sortRows(urows);
    var mx = Math.max.apply(null, urows.map(function (x) { return x.share; }).concat([0]));
    h += '<section class="zsec"><div class="zsec-h"><h3>Omavalitsused</h3>' + sortbarHTML() + '</div><div class="card scroll-x"><table class="tbl"><thead><tr><th class="num">#</th><th>Omavalitsus</th><th class="num">Hääli</th><th class="num">% kehtivatest</th><th class="num">% kandidaadi häältest</th><th class="num">Paber</th><th class="num">E</th></tr></thead><tbody>' +
      urows.map(function (x, k) {
        return '<tr><td class="num rk">' + (k + 1) + '</td><td>' + esc(unitName(x.ui)) + '</td><td class="num">' + n0(x.votes) + '</td><td class="num">' + pct1(x.share) + shareBar(x.share, mx) + '</td><td class="num">' + pct1(m.votes ? x.votes / m.votes : null) + '</td><td class="num">' + n0(x.paper) + '</td><td class="num">' + n0(x.e) + '</td></tr>';
      }).join('') + '</tbody></table></div></section>';
    var srows = [];
    raw[0].forEach(function (x, i) { if (x) srows.push({ i: i, votes: x * f, share: tot.st[i] ? x * f / tot.st[i] : 0 }); });
    sortRows(srows);
    var mx2 = Math.max.apply(null, srows.map(function (x) { return x.share; }).concat([0]));
    h += '<section class="zsec"><div class="zsec-h"><h3>Jaoskondade edetabel</h3><span class="small muted">' + plural(srows.length, 'jaoskond', 'jaoskonda') + ', kus kandidaat sai paberhääli</span></div><div class="card scroll-x"><table class="tbl"><thead><tr><th class="num">#</th><th>Jaoskond</th><th>Omavalitsus</th><th class="num">Hääli</th><th class="num">% jaoskonna häältest</th></tr></thead><tbody>' +
      srows.map(function (x, k) {
        var ui = dd.s[x.i][0];
        return '<tr><td class="num rk">' + (k + 1) + '</td><td>' + esc(stName(ui, dd.s[x.i][1])) + '</td><td>' + esc(DET.units[ui][4]) + '</td><td class="num">' + n0(x.votes) + '</td><td class="num">' + pct1(x.share) + shareBar(x.share, mx2) + '</td></tr>';
      }).join('') + '</tbody></table></div></section></div>';
    return h;
  }

  // ---------- paber- ja e-hääled
  function countyAgg() {
    var units = DET.units, cIdx = new Map(), counties = [];
    units.forEach(function (u) { if (!cIdx.has(u[1])) { cIdx.set(u[1], counties.length); counties.push({ code: u[1], name: u[2] }); } });
    var X = counties.length;
    counties.push({ code: 'X', name: 'Välisriik ja väljaspool ringkonda' });
    var cells = new Map(), unknown = 0;
    function cell(pid) { if (!cells.has(pid)) cells.set(pid, counties.map(function () { return [0, 0]; })); return cells.get(pid); }
    model.candidates.forEach(function (c) {
      if (c.out && !c.party) return;
      var pid = c.party || 0, raw = DET.cand[c.nr], f = scaleOf(c.nr);
      if (!raw || f === null) { unknown += c.votes; return; }
      if (!f) return;
      var dd = DET.dist[c.district], arr = cell(pid), i;
      for (i = 0; i < raw[0].length; i++) if (raw[0][i]) arr[cIdx.get(units[dd.s[i][0]][1])][0] += raw[0][i] * f;
      for (i = 0; i < raw[1].length; i++) if (raw[1][i]) arr[cIdx.get(units[dd.u[i]][1])][1] += raw[1][i] * f;
      arr[X][0] += (raw[2] + raw[3]) * f;
      arr[X][1] += raw[4] * f;
    });
    return { counties: counties, cells: cells, unknown: unknown };
  }
  function renderEvotes() {
    var el = byId('panel-ehaaled');
    var h = '<p class="panel-intro">Paberhääled on antud valimisjaoskonnas (sh eelhääletus ja kodus hääletamine), välisriigis või väljaspool elukohajärgset ringkonda. E-hääled on omistatud valija elukoha omavalitsusele; välismaal elavate valijate e-hääled ning välisriigis ja väljaspool ringkonda antud paberhääled on eraldi real.</p>';
    if (!DET) { el.innerHTML = h + '<p class="muted">Paber- ja e-häälte jaotus on olemas ainult 2023. aasta valimiste kohta. Vali päisest 2023.</p>'; return; }
    if (!isBase) { el.innerHTML = h + '<p class="muted">Paber- ja e-häälte jaotus on olemas ainult 2023. aasta andmestikul.</p>'; return; }
    h += scenarioNote();
    var A = countyAgg(), K = A.counties.length;
    var pids = Array.from(A.cells.keys());
    var tot = {}; pids.forEach(function (pid) { var a = A.cells.get(pid), pp = 0, ee = 0; a.forEach(function (x) { pp += x[0]; ee += x[1]; }); tot[pid] = [pp, ee]; });
    pids.sort(function (a, b) { if (!a) return 1; if (!b) return -1; return (tot[b][0] + tot[b][1]) - (tot[a][0] + tot[a][1]); });
    var P = 0, Ee = 0; pids.forEach(function (pid) { P += tot[pid][0]; Ee += tot[pid][1]; });
    h += '<dl class="comp-row" style="margin-bottom:18px">' + stat('Kehtivaid hääli', n0(P + Ee)) + stat('Paberhääled', n0(P), pct1(P + Ee ? P / (P + Ee) : null)) + stat('E-hääled', n0(Ee), pct1(P + Ee ? Ee / (P + Ee) : null)) + '</dl>';
    // erakonnad
    var mxE = Math.max.apply(null, pids.map(function (pid) { var t = tot[pid][0] + tot[pid][1]; return t ? tot[pid][1] / t : 0; }).concat([0]));
    h += '<div class="zgrid"><section class="zsec"><div class="zsec-h"><h2>Erakonnad</h2><span class="small muted">Vahe = osakaal e-häältes miinus osakaal paberhäältes (protsendipunktides)</span></div><div class="card scroll-x"><table class="tbl"><thead><tr><th>Erakond</th><th class="num">Hääli</th><th class="num">Paberhääli</th><th class="num">E-hääli</th><th class="num">E-osakaal</th><th class="num">% paberhäältest</th><th class="num">% e-häältest</th><th class="num">Vahe</th></tr></thead><tbody>' +
      pids.map(function (pid) {
        var p = partyOf(pid), pp = tot[pid][0], ee = tot[pid][1], t = pp + ee;
        var sp = P ? pp / P : 0, se = Ee ? ee / Ee : 0, df = (se - sp) * 100;
        return '<tr style="--pc:' + p.color + '"><td><div class="pname"><span class="sw"></span>' + (pid ? '<button type="button" class="plink" data-zp="' + pid + '">' + esc(p.name) + '</button>' : esc(p.name)) + '</div></td><td class="num">' + n0(t) + '</td><td class="num">' + n0(pp) + '</td><td class="num">' + n0(ee) + '</td><td class="num">' + pct1(t ? ee / t : null) + shareBar(t ? ee / t : 0, mxE) + '</td><td class="num">' + pct1(sp) + '</td><td class="num">' + pct1(se) + '</td><td class="num"><span class="diffp ' + (df >= 0 ? 'up' : 'down') + '">' + (df >= 0 ? '+' : '−') + nf1.format(Math.abs(df)) + '</span></td></tr>';
      }).join('') + '</tbody></table></div></section>';
    // maakonnad
    var met = state.emetric;
    h += '<section class="zsec"><div class="zsec-h"><h2>Maakonnad</h2></div><div class="sortbar mselect" role="group" aria-label="Näitaja">' + EMETRICS.map(function (mm) {
      return '<button type="button" data-emetric="' + mm[0] + '" aria-pressed="' + (met === mm[0]) + '">' + mm[1] + '</button>';
    }).join('') + '</div>';
    var ctot = A.counties.map(function (x, k) { var pp = 0, ee = 0; pids.forEach(function (pid) { pp += A.cells.get(pid)[k][0]; ee += A.cells.get(pid)[k][1]; }); return [pp, ee]; });
    function val(pid, k) {
      var c = A.cells.get(pid)[k], t = c[0] + c[1];
      if (met === 'eshare') return t ? c[1] / t : null;
      if (met === 'paper') return ctot[k][0] ? c[0] / ctot[k][0] : null;
      if (met === 'e') return ctot[k][1] ? c[1] / ctot[k][1] : null;
      if (met === 'all') return ctot[k][0] + ctot[k][1] ? t / (ctot[k][0] + ctot[k][1]) : null;
      return null;
    }
    var colMax = {}; pids.forEach(function (pid) { var mx = 0; for (var k = 0; k < K; k++) { var v = val(pid, k); if (v != null && v > mx) mx = v; } colMax[pid] = mx; });
    h += '<div class="card scroll-x"><table class="tbl heat"><thead><tr><th>Maakond</th><th class="num">Kehtivaid hääli</th><th class="num">E-osakaal</th>' + pids.map(function (pid) { var p = partyOf(pid); return '<th class="pcol" style="--pc:' + p.color + '"><span class="pname"><span class="sw"></span>' + esc(p.short) + '</span></th>'; }).join('') + '</tr></thead><tbody>' +
      A.counties.map(function (cn, k) {
        var t = ctot[k][0] + ctot[k][1];
        return '<tr><td>' + esc(cn.name) + '</td><td class="num">' + n0(t) + '</td><td class="num">' + pct1(t ? ctot[k][1] / t : null) + '</td>' + pids.map(function (pid) {
          var c = A.cells.get(pid)[k];
          if (met === 'votes') return '<td class="hv">' + n0(c[0]) + ' / ' + n0(c[1]) + '</td>';
          var v = val(pid, k), a = v != null && colMax[pid] ? v / colMax[pid] : 0;
          return '<td class="hv" style="background:color-mix(in srgb, var(--accent) ' + Math.round(a * 42) + '%, transparent)">' + pct1(v) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div><p class="small muted">Värvi tugevus näitab väärtust erakonna veeru suurima väärtuse suhtes. Tallinn on eraldi, Harju ja Tartu maakonna ridades pole Tallinna ega Tartu linna.' + (A.unknown ? ' ' + n0(A.unknown) + ' häält on lisatud kandidaatidele, kellel 2023. aastal hääli polnud; neid ei saa maakondadesse jaotada.' : '') + '</p></section></div>';
    el.innerHTML = h;
  }

  // ---------- valimiste aasta vahetamine
  function loadYear(y) {
    if (!yearOK(y)) return;
    setBase(y);
    model = datasetModel(y); isBase = true; userEl = null;
    state.ruleset = 'auto';
    freezeN = freezeD = freezeDKey = null;
    state.leaves = []; state.struct++; state.subsParty = null;
    state.zoom = { p: null, d: null, u: null, c: null };
    hemiCache = { S: -1 };
    index();
    byId('yearSelBox').innerHTML = yearSelHTML();
    refresh();
  }
  function yearSelHTML() {
    var ys = [2023].concat(HIST ? HIST.y.filter(function (y) { return y !== 2023; }) : []);
    var us = window.VM ? VM.userList('rk') : [];
    if (userEl && !us.some(function (u) { return u.id === userEl.id; })) us = [{ id: userEl.id, name: userEl.name }].concat(us);
    return '<label class="vh" for="yearSel">Valimised</label><select class="inp yearsel" id="yearSel" title="Mudelis arvutatavad valimised">' + ys.map(function (y) {
      return '<option value="' + y + '"' + (!userEl && y === baseYear ? ' selected' : '') + '>Riigikogu ' + y + '</option>';
    }).join('') + us.map(function (u) { return '<option value="u:' + esc(u.id) + '"' + (userEl && userEl.id === u.id ? ' selected' : '') + '>' + esc(u.name) + ' (oma)</option>'; }).join('') + '</select>' + (baseYear < 2003 && !userEl ? ' <label class="vh" for="ruleSel">Reeglid</label><select class="inp yearsel" id="ruleSel" title="Mandaatide jaotamise reeglid"><option value="auto"' + (state.ruleset !== 'current' ? ' selected' : '') + '>' + baseYear + '. aasta reeglid</option><option value="current"' + (state.ruleset === 'current' ? ' selected' : '') + '>Kehtivad reeglid</option></select>' : '');
  }
  function histCheckHTML() {
    var E0 = HIST.e[baseYear], r = E.compute(BASE, activeRules()), ok = 0, typ = 0, extra = [], miss = [];
    r.elected.forEach(function (c) { if (OFF_TYPE.has(c.nr)) { ok++; if (OFF_TYPE.get(c.nr) === c.elected) typ++; } else extra.push(c.nr); });
    OFF_TYPE.forEach(function (t, nr) { if (!r.byNr.get(nr) || !r.byNr.get(nr).elected) miss.push(nr); });
    var cnt = { P: 0, D: 0, C: 0 }, oc = { P: 0, D: 0, C: 0 };
    r.elected.forEach(function (c) { cnt[c.elected]++; });
    OFF_TYPE.forEach(function (t) { oc[t]++; });
    var natMissing = BASE.candidates.filter(function (c) { return c.party && !c.natPos; }).length;
    var old = baseYear < 2003, useOld = oldRules();
    var h = '<section class="step" style="margin-top:24px"><div class="step-h"><h2>Mudel ' + baseYear + '. aasta ametlike häältega</h2><span class="law">' + (useOld ? baseYear + '. aasta reeglid' : (old ? 'kehtivad reeglid, mitte tolleaegsed' : 'RKVS § 62 (sama sisuga alates 2003)')) + '</span></div>' +
      '<p class="note">' + (useOld ? 'Arvutus kasutab tolleaegseid reegleid: ' + rulesText(baseYear) + '. Nii peaks mudel andma ametliku tulemuse.' : (old ? 'Arvutus kasutab praegu kehtivaid reegleid, mitte ' + baseYear + '. aasta omi, seega erinevus ametlikust tulemusest on ootuspärane. Tolleaegsete reeglite kasutamiseks vali päisest „' + baseYear + '. aasta reeglid“.' : 'Mandaatide jaotamise reeglid on alates 2002. aasta seadusest sisult samad (ainult võrdsete võrdlusarvude reegel on muutunud), seega peaks mudel andma ametliku tulemuse.')) + '</p>' +
      '<div class="checks">' +
      [['Valituks osutunud kandidaadid', ok, OFF_TYPE.size], ['Mandaadi liik', typ, OFF_TYPE.size], ['Isiku- / ringkonna- / kompensatsioonimandaadid', cnt.P + ' / ' + cnt.D + ' / ' + cnt.C, oc.P + ' / ' + oc.D + ' / ' + oc.C]].map(function (x) {
        var good = String(x[1]) === String(x[2]);
        return '<div class="check' + (good ? '' : ' bad') + '"><span class="mark">' + (good ? '✓' : '!') + '</span><span>' + x[0] + '</span><span class="cnt">' + x[1] + (typeof x[1] === 'number' ? ' / ' + x[2] : ' vs ' + x[2]) + '</span></div>';
      }).join('') + '</div>';
    if (natMissing) h += '<p class="small muted">' + plural(natMissing, 'erakonna kandidaadil', 'erakonna kandidaadil') + ' puudub üleriigilise nimekirja koht; kompensatsioonimandaadi saajad võivad seetõttu erineda.</p>';
    if (extra.length || miss.length) {
      var li = function (nr) { var c = BASE_CAND.get(nr); return '<li>' + esc(c ? c.name : nr) + ' <span class="small muted">' + esc(c ? partyOf(c.party).short : '') + ', ringkond ' + (c ? c.district : '') + '</span></li>'; };
      h += '<div class="diffcols" style="margin-top:10px"><div class="card" style="padding:12px 14px"><h3>Mudelis valitud, tegelikult mitte (' + extra.length + ')</h3><ul>' + extra.map(li).join('') + '</ul></div><div class="card" style="padding:12px 14px"><h3>Tegelikult valitud, mudelis mitte (' + miss.length + ')</h3><ul>' + miss.map(li).join('') + '</ul></div></div>';
    }
    if (E0.notes && E0.notes.length) h += '<details style="margin-top:8px"><summary class="small">Andmete märkused (' + E0.notes.length + ')</summary><ul class="small muted">' + E0.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></details>';
    return h + '</section>';
  }

  function birthOf(nr) { // praeguse andmestiku kandidaadi sünniaeg ajalooandmetest
    if (!HIST || !HIST.e[baseYear]) return '';
    var r = HIST.e[baseYear].c.filter(function (x) { return x[0] === nr; })[0];
    return r ? r[8] : '';
  }

  // ---------- kandidaadi kaart
  var dlgNr = null;
  function li2(nr, cls, extra) {
    var c = res.byNr.get(nr);
    return '<li class="' + cls + '"><button type="button" class="cname" data-open="' + nr + '">' + esc(c.name) + '</button> <span class="small muted tnum">' + esc(partyOf(c.party).short) + ', ringk. ' + c.district + ', ' + nf0.format(c.votes) + ' häält, ' + pctQ(c) + (extra || '') + '</span></li>';
  }
  function chainListHTML(list, startNo) {
    var firstFree = -1;
    list.forEach(function (nr, i) { if (firstFree < 0 && isAvail(nr)) firstFree = i; });
    return '<ol start="' + (startNo || 1) + '">' + list.map(function (nr, i) {
      var cls = !isAvail(nr) ? 'used' : (i === firstFree ? 'next' : '');
      var extra = seatedNow.has(nr) ? ' — Riigikogus' : (sim.gone.has(nr) ? ' — loobunud' : '');
      return li2(nr, cls, extra);
    }).join('') + '</ol>';
  }
  function lisaPreview() {
    var x = res.lisa.slice(0, 3);
    if (!x.length) return 'Lisamandaatide tabel on tühi.';
    return 'Järgmised lisamandaadid: ' + x.map(function (f) { return partyOf(f.party).short + ' (võrdlusarv ' + nf1.format(f.value) + ') → ' + cname(f.sub); }).join('; ') + '.';
  }
  function openCand(nr) {
    var c = res.byNr.get(nr), m = candMap.get(nr);
    if (!c || !m) return;
    dlgNr = nr;
    var p = partyOf(c.party), d = distMap.get(c.district), dlg = byId('candDlg');
    dlg.style.setProperty('--pc', p.color);
    var dr = res.districts.filter(function (x) { return x.nr === c.district; })[0];
    var e = dr && c.party ? dr.parties.filter(function (x) { return x.party === c.party; })[0] : null;
    var rank = e ? e.ranked.indexOf(nr) + 1 : 0;
    var h = '<div class="dlg"><div class="dlg-h"><span class="numbox' + (c.elected ? ' is-el' : '') + '" style="--pc:' + p.color + '">' + c.nr + '</span><div style="min-width:0"><h2 id="candDlgTitle">' + esc(c.name) + '</h2><p class="small muted">' + esc(c.party ? p.name : 'Üksikkandidaat') + ' · valimisringkond nr ' + c.district + ' (' + esc(d.short || d.name) + ')</p></div><button type="button" class="btn btn-ghost" data-close>Sulge</button></div><div class="dlg-b">';
    h += '<dl class="facts"><div><dt>Hääli</dt><dd>' + nf0.format(c.votes) + '</dd></div><div><dt>Lihtkvoodist</dt><dd>' + pctQ(c) + '</dd></div>' +
      (c.party ? '<div><dt>Ringkonnanimekirjas</dt><dd>' + c.distPos + '.</dd></div><div><dt>Üleriigilises nimekirjas</dt><dd>' + c.natPos + '.</dd></div>' : '') +
      (rank ? '<div><dt>Erakonna ringkonnas häälte arvult</dt><dd>' + rank + '.</dd></div>' : '') +
      (c.elected === 'C' ? '<div><dt>Võrdlusarv</dt><dd>' + nf4.format(c.compFigure) + '</dd></div><div><dt>Jagaja</dt><dd>' + c.compK + '<sup>0,9</sup> = ' + nf4.format(E.divisor(c.compK)) + '</dd></div>' : '') + '</dl>';
    h += '<div class="cst">' + statusHTML(c) + '</div>';
    if (c.elected) {
      var seat = byOrig.get(nr);
      if (seat && seat.holder !== nr) h += '<div class="holder' + (seat.holder ? '' : ' vacant') + '">' + (seat.holder ? 'Praegu asemel: <b>' + esc(cname(seat.holder)) + '</b> — ' + esc(viaText(seat.history[seat.history.length - 1])) : 'Kohta ei saanud täita') + '</div>';
      h += '<div class="chainlist"><h3>Asendusliikmete järjekord</h3>';
      if (!c.party || !res.qualifies.get(c.party)) {
        h += '<p class="small muted">' + (c.party ? 'Erakond jäi alla 5% künnise, seega asendusliikmeid ei registreerita (RKVS § 75 lg 2).' : 'Üksikkandidaadil asendusliikmeid ei ole.') + ' Koha täidab lisamandaadi alusel määratud asendusliige (RKLS § 12 lg 4). ' + esc(lisaPreview()) + '</p>';
      } else {
        var ch = E.substituteChain(res, nr);
        if (c.elected !== 'C') {
          h += '<div><h4>1) Sama erakonna ringkonna nr ' + c.district + ' asendusliikmed (RKLS § 12 lg 1)</h4>' + (ch.district.length ? chainListHTML(ch.district, 1) : '<p class="small muted">Puuduvad — ükski valimata kandidaat ei saanud vähemalt 10% lihtkvoodist.</p>') + '</div>';
          h += '<div><h4>2) Seejärel erakonna üleriigiline nimekiri (RKLS § 12 lg 3)</h4>' + (ch.national.length ? chainListHTML(ch.national, ch.district.length + 1) : '<p class="small muted">Puuduvad.</p>') + '</div>';
        } else {
          h += '<div><h4>1) Erakonna üleriigiline asendusliikmete nimekiri (RKLS § 12 lg 2)</h4>' + (ch.national.length ? chainListHTML(ch.national, 1) : '<p class="small muted">Puuduvad.</p>') + '</div>';
        }
        h += '<p class="small muted">Kui nimekirjas asendusliikmeid enam pole, täidetakse koht lisamandaadiga (RKLS § 12 lg 4). ' + esc(lisaPreview()) + '</p>';
      }
      h += '</div>';
    } else if (c.party && res.qualifies.get(c.party) && !c.out) {
      var hasDistEl = res.elected.some(function (x) { return x.party === c.party && x.district === c.district && x.elected !== 'C'; });
      var lr = res.lisa.filter(function (x) { return x.sub === nr; })[0];
      h += '<div class="chainlist"><h3>Asendusliikme kohad</h3><ul class="small" style="margin:0;padding-left:1.2em;display:grid;gap:3px">' +
        '<li>Ringkonna nr ' + c.district + ' asendusliikmete nimekirjas: ' + (c.distSubRank ? '<b>' + c.distSubRank + '.</b>' : (hasDistEl ? 'ei ole (alla 10% lihtkvoodist)' : 'ei registreerita (erakonnal pole selles ringkonnas ringkonnas valitud liikmeid)')) + '</li>' +
        '<li>Üleriigilises asendusliikmete nimekirjas: <b>' + c.natSubRank + '.</b>' + (reach(c, 20) ? ' (≥ 5% lihtkvoodist, nimekirja järjekorras)' : ' (alla 5% lihtkvoodist, protsendi järgi)') + '</li>' +
        (lr ? '<li>Lisamandaatide tabelis (§ 76): ' + lr.rank + '.</li>' : '') + '</ul></div>';
    }
    h += '<div style="display:grid;gap:8px"><label class="small"><input type="checkbox" id="outToggle" data-out="' + nr + '"' + (m.out ? ' checked' : '') + '> Kandidaat langes välja: suri või registreerimine tühistati (RKVS § 62 lg 9)</label>';
    if (seatedNow.has(nr)) h += '<div><button type="button" class="btn btn-sm" data-leave="' + nr + '">Lahkub Riigikogust (volitused peatuvad või lõpevad)</button></div>';
    else if (sim.gone.has(nr)) h += '<div><button type="button" class="btn btn-sm" data-unleave="' + nr + '">Tühista lahkumine või loobumine</button></div>';
    else if (c.party && res.qualifies.get(c.party) && !c.elected && !c.out) h += '<div><button type="button" class="btn btn-sm" data-leave="' + nr + '">Loobub asendusliikme kohast</button></div>';
    h += '</div></div><div class="dlg-f">' + (hasDetail() && DET.cand[nr] ? '<button type="button" class="btn" data-zc="' + nr + '">Hääled jaoskonniti</button>' : '') + (HIST ? '<button type="button" class="btn" data-hist="' + nr + '">Kandideerimise ajalugu</button>' : '') + '<button type="button" class="btn" data-jump="' + nr + '">Muuda hääli</button><button type="button" class="btn btn-primary" data-close>Valmis</button></div></div>';
    dlg.innerHTML = h;
    if (!dlg.open) { try { dlg.showModal(); } catch (err) { dlg.setAttribute('open', ''); } }
  }
  function refreshDialog() {
    var dlg = byId('candDlg');
    if (dlg.open && dlgNr != null) { if (res.byNr.has(dlgNr)) openCand(dlgNr); else dlg.close(); }
  }
  function closeDialogs() {
    ['candDlg', 'dataDlg'].forEach(function (id) { var d = byId(id); if (d.open) d.close(); });
  }

  // ---------- andmete dialoog
  function exportModel() {
    var L = ['{', '"format": "riigikogu-valimismudel/1",', '"districts": ['];
    model.districts.forEach(function (d, i) { L.push('  ' + JSON.stringify({ nr: d.nr, name: d.name, mandates: d.mandates, voters: d.voters || 0 }) + (i < model.districts.length - 1 ? ',' : '')); });
    L.push('],', '"parties": [');
    model.parties.forEach(function (p, i) { L.push('  ' + JSON.stringify({ id: p.id, name: p.name, short: p.short, color: p.color, lot: p.lot }) + (i < model.parties.length - 1 ? ',' : '')); });
    L.push('],', '"candidates": [');
    model.candidates.forEach(function (c, i) { L.push('  ' + JSON.stringify({ nr: c.nr, name: c.name, district: c.district, party: c.party, natPos: c.natPos, distPos: c.distPos, votes: c.votes, out: !!c.out }) + (i < model.candidates.length - 1 ? ',' : '')); });
    L.push(']', '}');
    return L.join('\n');
  }
  function openData() {
    byId('dataText').value = exportModel();
    byId('dataMsg').innerHTML = '';
    var dlg = byId('dataDlg');
    if (!dlg.open) { try { dlg.showModal(); } catch (err) { dlg.setAttribute('open', ''); } }
  }
  function applyData() {
    var msg = byId('dataMsg'), o;
    try { o = JSON.parse(byId('dataText').value); } catch (e) { msg.innerHTML = '<p class="err">JSON ei ole korrektne: ' + esc(e.message) + '</p>'; return; }
    var v = validateModel(o);
    if (!v.ok) { msg.innerHTML = '<p class="err">' + esc(v.error) + '</p>'; return; }
    model = v.model; isBase = sameAsBase(model);
    state.leaves = []; state.struct++; state.subsParty = null;
    hemiCache = { S: -1 };
    index();
    refresh();
    msg.innerHTML = '<p class="okmsg">Rakendatud: ' + model.candidates.length + ' kandidaati, ' + model.parties.length + ' erakonda, ' + model.districts.length + ' ringkonda.</p>';
  }

  // ---------- sündmused
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-open],[data-district],[data-tab],[data-step],[data-adj],[data-adjreset],[data-zroot],[data-zc],[data-zu],[data-zp],[data-zsort],[data-emetric],[data-hist],[data-leave],[data-unleave],[data-restore],[data-sp],[data-jump],[data-close],[data-apply7],#simClear,#zeroDistrict,#btnReset,#btnZero,#btnData,#dataCopy,#dataApply');
    if (!t) {
      if (!ev.target.closest('.party-card')) unfreezeN();
      if (!ev.target.closest('#dparties')) unfreezeD();
      var qr = byId('qres');
      if (qr && !qr.hidden && !ev.target.closest('.grow')) qr.hidden = true;
      return;
    }
    var ds = t.dataset;
    if (!ev.target.closest('.party-card')) unfreezeN();
    if (!ev.target.closest('#dparties')) unfreezeD();
    if (ds.close !== undefined) { var dlg = t.closest('dialog'); if (dlg) dlg.close(); return; }
    if (ds.open) { openCand(+ds.open); return; }
    if (ds.jump) { jumpTo(+ds.jump); return; }
    if (ds.tab) { setTab(ds.tab); return; }
    if (ds.district) { state.district = +ds.district; renderVotes(); saveSoon(); return; }
    if (ds.step) { state.step = +ds.step; renderPartyTable(); renderDistrictParties(); saveSoon(); return; }
    if (ds.adj) { freezeFor(ds.adj); scaleParty(+ds.pid, 1 + (+ds.f) * state.step / 100, ds.adj === 'd' ? state.district : null); return; }
    if (ds.adjreset) { freezeFor(ds.adjreset); resetParty(+ds.pid, ds.adjreset === 'd' ? state.district : null); return; }
    if (ds.zroot !== undefined) { state.zoom = { p: null, d: null, u: null, c: null }; goZoom(); return; }
    if (ds.zc) { var zc = candMap.get(+ds.zc); if (zc) { closeDialogs(); state.zoom = { p: zc.party || 0, d: zc.district, u: null, c: zc.nr }; goZoom(); } return; }
    if (ds.zu) { state.zoom.u = +ds.zu; state.zoom.c = null; goZoom(); return; }
    if (ds.zp !== undefined) { state.zoom = { p: +ds.zp, d: ds.zd ? +ds.zd : null, u: null, c: null }; goZoom(); return; }
    if (ds.zsort) { state.zsort = ds.zsort; renderZoom(); saveSoon(); return; }
    if (ds.emetric) { state.emetric = ds.emetric; renderEvotes(); saveSoon(); return; }
    if (ds.hist) { var hc = candMap.get(+ds.hist); if (hc) { closeDialogs(); if (window.VM) VM.openHistory(hc.name, birthOf(hc.nr)); } return; }
    if (ds.leave) { var n = +ds.leave; if (state.leaves.indexOf(n) < 0) state.leaves.push(n); refresh(); return; }
    if (ds.unleave) { var u = +ds.unleave; state.leaves = state.leaves.filter(function (x) { return x !== u; }); refresh(); return; }
    if (ds.restore) { restoreSeat(+ds.restore); refresh(); return; }
    if (ds.sp) { state.subsParty = +ds.sp; renderSubs(); saveSoon(); return; }
    if (ds.apply7 !== undefined) {
      var s7 = seats7(model.districts.map(function (d) { return { nr: d.nr, v: d.voters || 0 }; }), 101);
      if (s7) { model.districts.forEach(function (d) { d.mandates = s7.rows.get(d.nr).seats; }); hemiCache = { S: -1 }; state.struct++; refresh(); }
      return;
    }
    switch (t.id) {
      case 'simClear': state.leaves = []; refresh(); break;
      case 'zeroDistrict': model.candidates.forEach(function (c) { if (c.district === state.district) c.votes = 0; }); state.struct++; refresh(); break;
      case 'btnReset':
        if (userEl && window.VM) { VM.loadUser(userEl.id).then(function (u) { if (u) applyUser(u); }); break; }
        model = datasetModel(baseYear); isBase = true; state.leaves = []; state.struct++; hemiCache = { S: -1 }; index(); refresh(); break;
      case 'btnZero': model.candidates.forEach(function (c) { c.votes = 0; }); state.leaves = []; state.struct++; refresh(); break;
      case 'btnData': openData(); break;
      case 'dataCopy':
        var ta = byId('dataText'), msg = byId('dataMsg');
        var fallback = function () { ta.focus(); ta.select(); msg.innerHTML = '<p class="small muted">Tekst on valitud — kopeeri see klahvidega Ctrl+C / ⌘C.</p>'; };
        try { navigator.clipboard.writeText(ta.value).then(function () { msg.innerHTML = '<p class="okmsg">Kopeeritud lõikelauale.</p>'; }, fallback); } catch (e) { fallback(); }
        break;
      case 'dataApply': applyData(); break;
    }
  });
  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.matches('input[data-v]')) {
      var c = candMap.get(+t.dataset.v), v = parseInt(t.value, 10);
      if (c) { c.votes = isFinite(v) && v > 0 ? v : 0; scheduleCalc(); }
    } else if (t.id === 'q') search(t.value);
  });
  document.addEventListener('mouseleave', function (ev) {
    var t = ev.target;
    if (!t || !t.classList) return;
    if (t.classList.contains('party-card')) unfreezeN();
    else if (t.id === 'dparties') unfreezeD();
  }, true);
  document.addEventListener('focusout', function (ev) {
    var nt = ev.relatedTarget;
    if (!nt || !ev.target.closest) return;
    var pc = ev.target.closest('.party-card'), dp = ev.target.closest('#dparties');
    if (pc && !pc.contains(nt)) unfreezeN();
    if (dp && !dp.contains(nt)) unfreezeD();
  });
  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.matches('input[data-v]')) { var c = candMap.get(+t.dataset.v); if (c && String(c.votes) !== t.value) t.value = c.votes; }
    else if (t.matches('input[data-m]')) { var d = distMap.get(+t.dataset.m), v = parseInt(t.value, 10); if (d) { d.mandates = isFinite(v) && v > 0 ? v : 0; hemiCache = { S: -1 }; state.struct++; refresh(); } }
    else if (t.matches('input[data-vv]')) { var d2 = distMap.get(+t.dataset.vv), v2 = parseInt(t.value, 10); if (d2) { d2.voters = isFinite(v2) && v2 > 0 ? v2 : 0; refresh(); } }
    else if (t.id === 'yearSel') {
      if (t.value.indexOf('u:') === 0) { if (window.VM) VM.loadUser(t.value.slice(2)).then(function (u) { if (u) applyUser(u); }); }
      else loadYear(+t.value);
    }
    else if (t.id === 'ruleSel') { state.ruleset = t.value === 'current' ? 'current' : 'auto'; refresh(); }
    else if (t.id === 'outToggle') { var m = candMap.get(+t.dataset.out); if (m) { m.out = t.checked; refresh(); } }
    else if (t.id === 'dataFile' && t.files && t.files[0]) {
      var rd = new FileReader();
      rd.onload = function () { byId('dataText').value = String(rd.result || ''); byId('dataMsg').innerHTML = '<p class="small muted">Fail loetud. Vajuta „Rakenda andmed“.</p>'; };
      rd.readAsText(t.files[0]);
    }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.target.matches && ev.target.matches('#page-rk [role="tab"]') && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) {
      var i = TABS.indexOf(state.tab) + (ev.key === 'ArrowRight' ? 1 : -1);
      i = (i + TABS.length) % TABS.length;
      setTab(TABS[i]); byId('tab-' + TABS[i]).focus();
    }
    if (ev.key === 'Escape' && byId('qres') && !byId('qres').hidden) byId('qres').hidden = true;
  });
  ['candDlg', 'dataDlg'].forEach(function (id) {
    var d = byId(id);
    d.addEventListener('click', function (ev) { if (ev.target === d) d.close(); });
    d.addEventListener('close', function () { if (id === 'candDlg') dlgNr = null; });
  });

  // ---------- liides valimiste mudeli kestale (vm.js)
  function applyUser(u) {
    var v = validateModel(u.model);
    if (!v.ok) return v.error;
    userEl = { id: u.id, name: u.name };
    model = v.model; isBase = false;
    state.ruleset = 'auto'; freezeN = freezeD = freezeDKey = null;
    state.leaves = []; state.struct++; state.subsParty = null;
    state.zoom = { p: null, d: null, u: null, c: null };
    hemiCache = { S: -1 };
    index();
    byId('yearSelBox').innerHTML = yearSelHTML();
    refresh();
    return null;
  }
  function modelJSON(y, current) {
    var m = current && !userEl && y === baseYear ? model : datasetModel(y);
    return JSON.parse(JSON.stringify({ format: 'riigikogu-valimismudel/1', districts: m.districts.map(function (d) { return { nr: d.nr, name: d.name, mandates: d.mandates, voters: d.voters || 0 }; }), parties: m.parties, candidates: m.candidates }));
  }
  window.RKApp = {
    hist: HIST,
    years: function () { return [2023].concat(HIST ? HIST.y.filter(function (y) { return y !== 2023; }) : []).sort(function (x, z) { return z - x; }); },
    eid: function () { return userEl ? 'u:' + userEl.id : 'rk' + baseYear; },
    label: function () { return userEl ? userEl.name : 'Riigikogu ' + baseYear; },
    getVotes: function () { var o = {}; model.candidates.forEach(function (c) { o[c.nr] = c.votes; }); return o; },
    setVotes: function (o, zero) {
      model.candidates.forEach(function (c) { if (o[c.nr] != null && isFinite(+o[c.nr])) c.votes = Math.max(0, Math.floor(+o[c.nr])); else if (zero) c.votes = 0; });
      state.struct++; refresh();
    },
    seatsFor: function (o) {
      var m = { districts: model.districts, parties: model.parties, candidates: model.candidates.map(function (c) { var x = Object.assign({}, c); if (o[c.nr] != null) x.votes = Math.max(0, +o[c.nr] || 0); return x; }) };
      var r = E.compute(m, activeRules()), out = {};
      r.parties.forEach(function (p) { if (p.total) out[partyOf(p.id).short] = p.total; });
      if (r.indElected) out['Üksik'] = r.indElected;
      return out;
    },
    loadYear: function (y) { loadYear(y); },
    applyUser: applyUser,
    modelJSON: modelJSON,
    openCandidate: function (nr) { if (candMap.has(nr)) openCand(nr); },
    refreshYearSel: function (deleted) {
      if (deleted && userEl && userEl.id === deleted) { loadYear(baseYear); return; }
      byId('yearSelBox').innerHTML = yearSelHTML();
    },
    onShow: function (t) { if (t && TABS.indexOf(t) >= 0 && t !== state.tab) setTab(t); else { renderSummary(); setTab(state.tab); } }
  };

  // ---------- käivitus
  load();
  if (HIST) byId('yearSelBox').innerHTML = yearSelHTML();
  recompute();
  verify();
  renderSummary();
  setTab(state.tab);
})();
