  // ===================================================================
  // Kandidaatide ajalugu kõigil valimistel (Riigikogu, kohalikud, Europarlament)
  // ===================================================================
  var HX = { src: [], idx: null, bidx: null, state: 'idle', done: 0, total: 0, err: [] };
  var HS = lsGet('vm-hist', null) || {}; HS = { nk: HS.nk || null, pk: HS.pk || null, f: HS.f || 'all', q: HS.q || '' };
  var HSEL_KEY = 'rk-ajalugu-valikud-v1', HSEL = lsGet(HSEL_KEY, {}) || {};
  function hsave() { lsSet(HSEL_KEY, HSEL); }
  function hsSave() { lsSet('vm-hist', { nk: HS.nk, pk: HS.pk, f: HS.f, q: HS.q }); }
  var RK_TYPE = { 1: 'Isikumandaat', 2: 'Ringkonnamandaat', 3: 'Kompensatsioonimandaat' };
  function birthStr(b) {
    b = String(b || ''); if (!b || b === '0') return '';
    if (b.length === 8 && b.slice(4) === '0000') return b.slice(0, 4);
    return b;
  }
  function hamming1(a, b) { if (a.length !== 8 || b.length !== 8) return false; var d = 0; for (var i = 0; i < 8; i++) if (a[i] !== b[i] && ++d > 1) return false; return d === 1; }
  function editDist2(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 3;
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i]; var mn = i;
      for (j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); if (cur[j] < mn) mn = cur[j]; }
      if (mn > 2) return 3;
      prev = cur;
    }
    return prev[b.length];
  }
  function autoAlias(a, b) {
    if (a === b) return true;
    var A = a.split(' '), B = b.split(' '), sa = new Set(A), sb = new Set(B);
    return A.every(function (t) { return sb.has(t); }) || B.every(function (t) { return sa.has(t); }) || editDist2(a, b) <= 2;
  }
  function shareToken(a, b) { var A = a.split(' '), B = b.split(' '); return A[0] === B[0] || A[A.length - 1] === B[B.length - 1]; }

  // allikad: Riigikogu ajalooandmed (lehel) + KOV/EP failid (laaditakse)
  function hxSources() {
    var out = [], a = rkApp(), H = a && a.hist;
    if (H) H.y.forEach(function (y) { out.push({ eid: 'rk' + y, type: 'rk', year: y, date: H.e[y].date || (y + '-03-01'), short: 'RK ' + y, label: 'Riigikogu ' + y, H: H.e[y] }); });
    MANI.elections.forEach(function (m) { out.push({ eid: m.id, type: m.type, year: m.year, date: m.date || (m.year + '-10-01'), short: TYPES[m.type].short + ' ' + m.year, label: TYPES[m.type].name + ' ' + m.year, E: null }); });
    out.sort(function (x, y) { return x.date < y.date ? -1 : 1; });
    return out;
  }
  function hxStart() {
    if (HX.state !== 'idle') return;
    HX.src = hxSources();
    HX.state = 'loading';
    var todo = HX.src.filter(function (s) { return s.type !== 'rk'; });
    HX.total = todo.length; HX.done = 0;
    hxIndex();
    if (!todo.length) { HX.state = 'ready'; return; }
    var queue = todo.slice(), running = 0;
    function next() {
      while (running < 3 && queue.length) {
        var s = queue.shift(); running++;
        (function (s) {
          loadElection(s.eid).then(function (E) { s.E = E; }, function (e) { HX.err.push(s.label + ': ' + (e && e.message ? e.message : e)); })
            .then(function () { running--; HX.done++; if (HX.done === HX.total) { HX.state = 'ready'; hxIndex(); if (page === 'cand') renderCand(); } else { updHxProgress(); next(); } });
        })(s);
      }
    }
    next();
  }
  function updHxProgress() { var p = byId('hxprog'); if (p) p.innerHTML = hxProgressHTML(); }
  function hxProgressHTML() {
    if (HX.state === 'ready') return HX.err.length ? '<div class="warn">' + esc(HX.err.join(' · ')) + '</div>' : '';
    return '<div class="loading small" role="status"><span class="spin" aria-hidden="true"></span>Laadin kohalike ja Euroopa Parlamendi valimiste andmeid (' + HX.done + ' / ' + HX.total + ')… Riigikogu valimistest saab otsida kohe.</div>';
  }
  function hxIndex() {
    var idx = new Map(), bidx = new Map();
    HX.src.forEach(function (s, si) {
      var add = function (i, name, birth) {
        var nk = C.hkey(name), b = birthStr(birth), ref = { s: si, i: i, nk: nk, b: b };
        if (!idx.has(nk)) idx.set(nk, []);
        idx.get(nk).push(ref);
        if (b.length === 8) { if (!bidx.has(b)) bidx.set(b, []); bidx.get(b).push(ref); }
      };
      if (s.type === 'rk') s.H.c.forEach(function (r, i) { add(i, r[1], r[8]); });
      else if (s.E) s.E.cands.forEach(function (c, i) { add(i, c.name, c.birth); });
    });
    HX.idx = idx; HX.bidx = bidx;
  }
  function hxName(x) { var s = HX.src[x.s]; return s.type === 'rk' ? s.H.c[x.i][1] : s.E.cands[x.i].name; }
  // ühe kandideerimise näitajad
  function hxAgg(s) {
    if (s.agg) return s.agg;
    var a = {};
    if (s.type === 'rk') {
      var E0 = s.H; a.pd = new Map(); a.dv = new Map(E0.d.map(function (d) { return [d[0], d[3]]; })); a.dn = new Map(E0.d.map(function (d) { return [d[0], d[1]]; }));
      E0.c.forEach(function (r) { var k = r[2] + '|' + r[3]; a.pd.set(k, (a.pd.get(k) || 0) + r[4]); });
    } else if (s.type === 'kov') {
      var E = s.E; a.ld = new Map(); a.dv = new Map(); a.lv = new Array(E.lists.length).fill(0); a.uv = new Array(E.units.length).fill(0);
      E.cands.forEach(function (c) {
        var k = c.list + '|' + c.d, k2 = c.unit + '|' + c.d;
        a.ld.set(k, (a.ld.get(k) || 0) + c.v0); a.dv.set(k2, (a.dv.get(k2) || 0) + c.v0); a.lv[c.list] += c.v0; a.uv[c.unit] += c.v0;
      });
    } else {
      var F = s.E; a.lv = new Array(F.lists.length).fill(0); a.T = 0;
      F.cands.forEach(function (c) { a.lv[c.list] += c.v0; a.T += c.v0; });
      if (F.closed) F.lists.forEach(function (L, l) { a.lv[l] = L.lv0; }), a.T = F.lists.reduce(function (t, L) { return t + L.lv0; }, 0);
    }
    s.agg = a;
    return a;
  }
  function hxMetrics(x) {
    var s = HX.src[x.s], a = hxAgg(s);
    if (s.type === 'rk') {
      var E0 = s.H, r = E0.c[x.i], pi = r[2], pv0 = pi >= 0 ? E0.p[pi][3] : null, pdv = pi >= 0 ? a.pd.get(pi + '|' + r[3]) : null, dv = a.dv.get(r[3]);
      var rank = 0;
      if (pi >= 0) { rank = 1; E0.c.forEach(function (o) { if (o !== r && o[2] === pi && o[3] === r[3] && o[4] > r[4]) rank++; }); }
      var hp = pi >= 0 ? C.hparty(E0.p[pi][0], E0.p[pi][1]) : { color: C.IND_COLOR };
      return { list: pi >= 0 ? E0.p[pi][1] : 'Üksikkandidaat', color: hp.color, area: 'ringkond ' + r[3] + ' · ' + (a.dn.get(r[3]) || ''), pos: (r[5] || '–') + ' / ' + (r[6] || '–'), votes: r[4], rank: rank,
        sLA: pdv ? r[4] / pdv : null, sA: dv ? r[4] / dv : null, sL: pv0 ? r[4] / pv0 : null, sT: E0.valid ? r[4] / E0.valid : null,
        el: r[7] ? { g: 'PDC'.charAt(r[7] - 1), t: RK_TYPE[r[7]] } : null, ctx: 'd' + r[3], name: r[1] };
    }
    if (s.type === 'kov') {
      var E = s.E, c = E.cands[x.i], U = E.units[c.unit], info = listInfo(E, c.list), L = E.lists[c.list];
      var rk2 = 0;
      if (L.kind !== 'I') { rk2 = 1; L.cands.forEach(function (k) { var o = E.cands[k]; if (o !== c && o.d === c.d && o.v0 > c.v0) rk2++; }); }
      var ldv = a.ld.get(c.list + '|' + c.d), ddv = a.dv.get(c.unit + '|' + c.d);
      return { list: info.name + (L.kind === 'A' ? ' (valimisliit)' : ''), color: info.color, area: U.name + (U.districts.length > 1 ? ', ringk. ' + c.d : ''), pos: L.kind === 'I' ? '–' : (c.pos || '–') + (c.upos ? ' / ' + c.upos : ''), votes: c.v0, rank: rk2,
        sLA: L.kind !== 'I' && ldv ? c.v0 / ldv : null, sA: ddv ? c.v0 / ddv : null, sL: L.kind !== 'I' && a.lv[c.list] ? c.v0 / a.lv[c.list] : null, sT: a.uv[c.unit] ? c.v0 / a.uv[c.unit] : null,
        el: c.el ? { g: KGLYPH[c.el], t: ktype(E, c.unit, c.el) } : null, ctx: 'u' + c.unit + '|' + c.d, name: c.name, unit: c.unit };
    }
    var F = s.E, e = F.cands[x.i], inf = listInfo(F, e.list), LL = F.lists[e.list];
    var rk3 = 0;
    if (LL.kind === 'P' && !F.closed) { rk3 = 1; LL.cands.forEach(function (k) { if (F.cands[k].v0 > e.v0) rk3++; }); }
    return { list: inf.name, color: inf.color, area: 'Eesti', pos: LL.kind === 'I' ? '–' : (e.pos || '–'), votes: F.closed ? null : e.v0, rank: rk3,
      sLA: !F.closed && a.lv[e.list] ? e.v0 / a.lv[e.list] : null, sA: !F.closed && a.T ? e.v0 / a.T : null, sL: null, sT: null,
      el: e.el ? { g: 'D', t: 'Valitud' } : null, ctx: 'all', name: e.name };
  }
  // sama nimega kandideerimised -> isikud
  function hxGroup(nk) {
    var list = (HX.idx.get(nk) || []).slice();
    if (!list.length) return null;
    var persons = [];
    list.forEach(function (x) {
      var b = x.b; if (b.length !== 8) return;
      var p = persons.filter(function (q) { return q.keys.some(function (k) { return k === b || hamming1(k, b); }); })[0];
      if (!p) { p = { key: b, keys: [b], rows: [] }; persons.push(p); } else if (p.keys.indexOf(b) < 0) p.keys.push(b);
      p.rows.push(x);
    });
    list.forEach(function (x) {
      var b = x.b; if (b.length !== 4) return;
      var m = persons.filter(function (p) { return p.keys.some(function (k) { return k.slice(0, 4) === b; }); });
      if (m.length === 1) { m[0].rows.push(x); return; }
      var p = persons.filter(function (q) { return q.key === b; })[0];
      if (!p) { p = { key: b, keys: [b], rows: [] }; persons.push(p); }
      p.rows.push(x);
    });
    persons.sort(function (a, b) { return a.key < b.key ? -1 : 1; });
    persons.forEach(function (p) {
      p.label = 's. ' + p.keys.map(fmtBirth).join(' / ');
      var linked = (HSEL[nk + '|' + p.key] || {}).links || [];
      p.alias = []; p.sugg = [];
      p.keys.forEach(function (k) {
        if (k.length !== 8) return;
        (HX.bidx.get(k) || []).forEach(function (x) {
          if (x.nk === nk) return;
          if (autoAlias(nk, x.nk) || linked.indexOf(x.nk) >= 0) p.alias.push(x);
          else if (shareToken(nk, x.nk)) p.sugg.push(x);
        });
      });
    });
    var perE = new Map();
    list.forEach(function (x) { perE.set(x.s, (perE.get(x.s) || 0) + 1); });
    var latest = list.slice().sort(function (a, b) { return b.s - a.s; })[0];
    return {
      nk: nk, name: hxName(latest), list: list, persons: persons,
      srcs: Array.from(perE.keys()).sort(function (a, b) { return b - a; }),
      undated: list.filter(function (x) { return !x.b; }),
      dup: Array.from(perE.values()).some(function (n) { return n > 1; })
    };
  }
  function selKey(s) { var src = HX.src[s]; return src.eid; }
  function selGet(sel, s) { var k = selKey(s); if (sel[k] !== undefined) return sel[k]; var src = HX.src[s]; if (src.type === 'rk' && sel[src.year] !== undefined) return sel[src.year]; return undefined; }
  function hxRows(g, pk) {
    var sel = HSEL[g.nk + '|' + (pk || '-')] || {}, out = [];
    if (pk === '*') {
      g.srcs.forEach(function (s) {
        var opts = g.list.filter(function (x) { return x.s === s; }), v = selGet(sel, s);
        var chosen = v !== undefined ? v : (opts.length === 1 ? opts[0].i : -1);
        out.push({ s: s, fixed: false, opts: opts, x: opts.filter(function (o) { return o.i === chosen; })[0] || null });
      });
      return out;
    }
    var person = g.persons.filter(function (p) { return p.key === pk; })[0] || null;
    var fixed = person ? person.rows.concat(person.alias) : [];
    var srcs = new Set(g.srcs); fixed.forEach(function (x) { srcs.add(x.s); });
    var multi = g.persons.length > 1;
    Array.from(srcs).sort(function (a, b) { return b - a; }).forEach(function (s) {
      var fx = fixed.filter(function (x) { return x.s === s; });
      if (fx.length) { fx.forEach(function (x) { out.push({ s: s, fixed: true, x: x, alias: x.nk !== g.nk }); }); return; }
      var opts = g.undated.filter(function (x) { return x.s === s; });
      if (!opts.length) return;
      var v = selGet(sel, s), chosen = v !== undefined ? v : (opts.length === 1 && !multi ? opts[0].i : -1);
      out.push({ s: s, fixed: false, opts: opts, x: opts.filter(function (o) { return o.i === chosen; })[0] || null });
    });
    return out;
  }

  // ---------- leht
  function histRoute(parts) {
    hxStart();
    if (parts[0]) { var nk = C.hkey(parts[0]); if (HX.idx && HX.idx.has(nk)) { HS.nk = nk; HS.pk = parts[1] || null; } }
    renderCand();
  }
  function renderCand() {
    var main = byId('candMain');
    var types = [['all', 'Kõik valimised'], ['rk', 'Riigikogu'], ['kov', 'Kohalikud'], ['ep', 'Europarlament']];
    var h = '<div class="tools"><div class="grow"><label class="vh" for="hxq">Otsi kandidaati</label><input class="inp" id="hxq" type="search" placeholder="Otsi nime järgi (vähemalt 3 tähte)" autocomplete="off" value="' + esc(HS.q) + '"></div>' +
      '<div class="sortbar" role="group" aria-label="Valimiste liik"><span>Näita</span>' + types.map(function (t) { return '<button type="button" data-vhf="' + t[0] + '" aria-pressed="' + (HS.f === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div></div>' +
      '<div id="hxprog">' + hxProgressHTML() + '</div><div id="hxres"></div><div id="hxperson">' + hxPersonHTML() + '</div>';
    h += '<section class="zsec" style="margin-top:26px"><div class="zsec-h"><h2>Valimised</h2><span class="small muted">Ava valimiste tulemus mudelis</span></div><div class="elgrid">' + ['rk', 'kov', 'ep'].filter(function (t) { return HS.f === 'all' || HS.f === t; }).map(function (t) {
      return '<div class="card elcol"><h3>' + TYPES[t].long + '</h3><div class="pchips">' + elections(t).filter(function (e) { return e.builtin; }).sort(function (a, b) { return b.year - a.year; }).map(function (e) {
        return '<button type="button" class="pchip" data-vopen="' + esc(e.id) + '">' + e.year + '</button>';
      }).join('') + '</div></div>';
    }).join('') + '</div></section>';
    main.innerHTML = h;
    if (HS.q) hxSearch(HS.q);
  }
  function hxSearch(q) {
    HS.q = q; hsSave();
    var box = byId('hxres'); if (!box) return;
    var k = C.hkey(q);
    if (k.length < 3 || !HX.idx) { box.innerHTML = ''; return; }
    var hits = [];
    HX.idx.forEach(function (list, nk) {
      var i = nk.indexOf(k); if (i < 0) return;
      var n = HS.f === 'all' ? list.length : list.filter(function (x) { return HX.src[x.s].type === HS.f; }).length;
      if (!n) return;
      hits.push({ nk: nk, pos: i === 0 || nk.charAt(i - 1) === ' ' ? 0 : 1, n: n });
    });
    hits.sort(function (a, b) { return (a.pos - b.pos) || (b.n - a.n) || a.nk.localeCompare(b.nk, 'et'); });
    box.innerHTML = hits.length ? '<div class="hlist">' + hits.slice(0, 40).map(function (hh) {
      var g = hxGroup(hh.nk);
      var tag = g.persons.length > 1 || g.dup ? ' <span class="tag warn-tag">mitu sama nimega isikut</span>' : '';
      var births = g.persons.map(function (p) { return p.label; }).join(', ');
      var by = { rk: [], kov: [], ep: [] };
      g.srcs.slice().sort(function (a, b) { return a - b; }).forEach(function (s) { var src = HX.src[s]; by[src.type].push(src.year); });
      var summ = ['rk', 'kov', 'ep'].filter(function (t) { return by[t].length && (HS.f === 'all' || HS.f === t); }).map(function (t) { return TYPES[t].short + ' ' + by[t].join(', '); }).join(' · ');
      return '<button type="button" class="hitem" data-vhnk="' + esc(hh.nk) + '"><b>' + esc(g.name) + '</b>' + tag + '<span class="small muted">' + (births ? births + ' · ' : '') + esc(summ) + '</span></button>';
    }).join('') + (hits.length > 40 ? '<p class="small muted">Näidatud 40 esimest ' + hits.length + '-st.</p>' : '') + '</div>' : '<p class="small muted">Ei leitud.</p>';
  }
  var HCTX = new Set();
  function hxPersonHTML() {
    if (!HS.nk) return '<p class="small muted" style="margin-top:8px">Näiteks: Kallas, Ratas, Kõlvart, Helme, Savisaar, Tarand.</p>';
    if (!HX.idx) return '';
    var g = hxGroup(HS.nk);
    if (!g) return HX.state === 'ready' ? '<p class="small muted">Kandidaati ei leitud.</p>' : '';
    var ambiguous = g.persons.length > 1 || g.dup;
    if (HS.pk !== '*' && HS.pk && !g.persons.some(function (p) { return p.key === HS.pk; })) HS.pk = null;
    if (!HS.pk) HS.pk = g.persons.length ? g.persons[0].key : (g.dup ? '*' : null);
    var person = g.persons.filter(function (p) { return p.key === HS.pk; })[0] || null;
    var all = hxRows(g, HS.pk);
    var rows = all.filter(function (x) { return HS.f === 'all' || HX.src[x.s].type === HS.f; });
    var chosen = rows.filter(function (x) { return x.x; });
    var nEl = chosen.filter(function (x) { return hxMetrics(x.x).el; }).length;
    var mx = Math.max.apply(null, chosen.map(function (x) { return hxMetrics(x.x).votes || 0; }).concat([1]));
    var byT = { rk: 0, kov: 0, ep: 0 }; all.forEach(function (x) { if (x.x) byT[HX.src[x.s].type]++; });
    var h = '<div class="card hcard"><div class="zhead"><h2>' + esc(g.name) + '</h2><dl class="comp-row">' +
      (person ? stat('Sünniaeg', esc(person.keys.map(fmtBirth).join(' / '))) : '') +
      stat('Kandideerimisi', chosen.length, ['rk', 'kov', 'ep'].filter(function (t) { return byT[t]; }).map(function (t) { return TYPES[t].short + ' ' + byT[t]; }).join(' · ')) +
      stat('Valitud', nEl + ' korral') + '</dl></div>';
    if (ambiguous) {
      h += '<div class="pchips" role="group" aria-label="Sama nimega isik">' + g.persons.map(function (p) {
        return '<button type="button" class="pchip" data-vhpk="' + esc(p.key) + '" aria-pressed="' + (p.key === HS.pk) + '">' + esc(p.label) + ' <span class="muted">' + p.rows.map(function (x) { return HX.src[x.s].short; }).join(', ') + '</span></button>';
      }).join('') + '<button type="button" class="pchip" data-vhpk="*" aria-pressed="' + (HS.pk === '*') + '">Vali valimiste kaupa ise</button></div>';
    }
    var notes = [];
    if (person && person.keys.length > 1) notes.push('Selle isiku sünniaeg on eri valimistel kirjas ühe numbri võrra erinevalt (tõenäoliselt andmeviga), seega on kandideerimised seotud.');
    if (g.persons.length > 1) notes.push('Selle nimega on mitu kandidaati, keda eristab sünniaeg. Vali ülal isik või „Vali valimiste kaupa ise“.');
    if (HS.pk === '*') notes.push('Vali iga valimise reale, milline sama nimega kandideerimine sellele isikule kuulub. Valik jääb selles brauseris meelde.');
    else if (g.undated.length) notes.push('Sünniajata kandideerimised (eelkõige vanematel valimistel) on seotud nime järgi' + (ambiguous ? '; kui samadel valimistel on mitu sama nimega kandidaati, vali rea juures õige' : '') + '.');
    if (rows.some(function (x) { return x.alias; })) notes.push('Osa kandideerimisi on teise nimekujuga, kuid sama sünniajaga; nende juures on näidatud tollane nimi.');
    if (notes.length) h += '<p class="small muted hnote">' + notes.join(' ') + '</p>';
    h += '<div class="hctxbar"><button type="button" class="link small" data-vhctxall="1">Ava või sulge kõigi valimiste võrdlus</button></div>';
    h += '<div class="scroll-x"><table class="tbl htable"><thead><tr><th>Valimised</th><th>Nimekiri</th><th>Piirkond</th><th class="num" title="Koht nimekirjas (Riigikogu: ringkonna / üleriigilises; Tallinn: ringkonna / ülelinnalises)">Koht nimek.</th><th class="num">Hääli</th><th class="num" title="Koht oma nimekirja kandidaatide seas samas ringkonnas häälte arvult">Häälte arvult</th><th class="num" title="Osakaal oma nimekirja häältest ringkonnas (EP: nimekirja häältest)">% nimekirjast</th><th class="num" title="Osakaal ringkonna kehtivatest häältest (EP: kõigist häältest)">% ringkonnast</th><th class="num" title="Riigikogu: erakonna häältest üle Eesti; kohalikud: nimekirja häältest omavalitsuses">% nimekirjast kokku</th><th class="num" title="Riigikogu: kõigist häältest Eestis; kohalikud: omavalitsuse häältest">% kõigist</th><th>Tulemus</th></tr></thead><tbody>';
    if (!rows.length) h += '<tr><td colspan="11" class="muted">Valitud liigi valimistel see kandidaat ei kandideerinud.</td></tr>';
    rows.forEach(function (row) {
      var src = HX.src[row.s], selHTML = '';
      if (!row.fixed) {
        var sid = 'hxs-' + row.s;
        selHTML = '<label class="vh" for="' + sid + '">' + esc(src.label) + ' kandideerimine</label><select class="inp hsel" id="' + sid + '" data-vhsel="' + row.s + '"><option value="-1">— ei ole see isik —</option>' + row.opts.map(function (o) {
          var m = hxMetrics(o);
          return '<option value="' + o.i + '"' + (row.x && row.x.i === o.i ? ' selected' : '') + '>' + esc(m.list + ', ' + m.area + (m.votes != null ? ', ' + nf0.format(m.votes) + ' häält' : '') + (o.b ? ', s. ' + fmtBirth(o.b) : '')) + '</option>';
        }).join('') + '</select>';
      }
      var tl = '<span class="ttag t-' + src.type + '">' + TYPES[src.type].short + '</span> <b>' + src.year + '</b>';
      if (!row.x) { h += '<tr class="hrow-empty"><td>' + tl + '</td><td colspan="10">' + selHTML + '</td></tr>'; return; }
      var m = hxMetrics(row.x);
      var el = m.el ? '<span class="chip chip-el">' + C.glyph(m.el.g, m.color) + esc(m.el.t) + '</span>' : '<span class="small muted">ei osutunud valituks</span>';
      var extra = '';
      if (row.alias) extra = '<span class="tag">nime all ' + esc(m.name) + '</span>';
      else if (!row.fixed && HS.pk !== '*') extra = '<span class="tag">seotud nime järgi</span>';
      var ctl = selHTML ? (row.opts.length > 1 || HS.pk === '*' ? selHTML : '<button type="button" class="link small" data-vhunlink="' + row.s + '">pole see isik</button>') : '';
      h += '<tr class="hdata"><td>' + tl + '<div><button type="button" class="link small" data-vhopen="' + row.s + '|' + row.x.i + '">ava mudelis</button></div></td><td><div class="pname" style="--pc:' + m.color + '"><span class="sw"></span><span>' + esc(m.list) + '</span></div>' + extra + ctl + '</td><td>' + esc(m.area) + '</td><td class="num">' + m.pos + '</td><td class="num">' + (m.votes != null ? nf0.format(m.votes) + '<span class="bar" style="--pc:' + m.color + '"><i style="width:' + ((m.votes || 0) / mx * 100).toFixed(1) + '%"></i></span>' : '–') + '</td><td class="num">' + (m.rank || '–') + '</td><td class="num">' + pct1(m.sLA) + '</td><td class="num">' + pct1(m.sA) + '</td><td class="num">' + pct1(m.sL) + '</td><td class="num">' + (m.sT != null ? nf2.format(m.sT * 100) + '%' : '–') + '</td><td>' + el + '</td></tr>';
      var ck = row.s + '|' + m.ctx, op = HCTX.has(ck);
      h += '<tr class="hctxrow"><td colspan="11"><details class="hctx" data-vhctx="' + row.s + '|' + row.x.i + '"' + (op ? ' open' : '') + '><summary>' + esc(ctxTitle(row.s, m)) + ': iga nimekirja 7 enim hääli saanut</summary>' + (op ? hxCtxHTML(row.s, row.x.i) : '') + '</details></td></tr>';
    });
    h += '</tbody></table></div>';
    if (person) {
      var linked = (HSEL[g.nk + '|' + person.key] || {}).links || [];
      var byNk = new Map();
      person.sugg.forEach(function (x) { if (!byNk.has(x.nk)) byNk.set(x.nk, []); byNk.get(x.nk).push(x); });
      var lk = linked.filter(function (nk) { return person.alias.some(function (x) { return x.nk === nk; }); });
      if (byNk.size || lk.length) {
        h += '<div class="hsugg"><p class="small"><b>Sama sünniajaga kandidaadid teise nimega</b>: võib olla sama isik, näiteks pärast nimevahetust.</p><ul class="small">';
        byNk.forEach(function (xs, nk) { h += '<li>' + esc(hxName(xs[0])) + ' <span class="muted">(' + xs.map(function (x) { return HX.src[x.s].short; }).join(', ') + ')</span> <button type="button" class="link" data-vhlinkadd="' + esc(nk) + '">lisa selle isiku ajalukku</button></li>'; });
        lk.forEach(function (nk) { var xs = person.alias.filter(function (x) { return x.nk === nk; }); h += '<li>' + esc(hxName(xs[0])) + ' <span class="muted">(lisatud)</span> <button type="button" class="link" data-vhlinkdel="' + esc(nk) + '">eemalda</button></li>'; });
        h += '</ul></div>';
      }
    }
    return h + '</div>';
  }
  function ctxTitle(s, m) { var src = HX.src[s]; return src.label + ', ' + (src.type === 'ep' ? 'kogu Eesti' : m.area); }
  // ringkonna (või omavalitsuse ringkonna) võrdlus: iga nimekirja 7 enim hääli saanut
  function hxCtxHTML(s, selfI) {
    var src = HX.src[s], groups = new Map(), dv = 0, rows = [];
    if (src.type === 'rk') {
      var E0 = src.H, d = E0.c[selfI][3];
      E0.c.forEach(function (r, i) { if (r[3] !== d) return; dv += r[4]; rows.push({ i: i, k: r[2], v: r[4], pos: r[5], name: r[1], b: r[8], el: r[7] ? 'PDC'.charAt(r[7] - 1) : '' }); });
    } else if (src.type === 'kov') {
      var E = src.E, c0 = E.cands[selfI];
      E.units[c0.unit].cands.forEach(function (ci) { var c = E.cands[ci]; if (c.d !== c0.d) return; dv += c.v0; rows.push({ i: ci, k: E.lists[c.list].kind === 'I' ? -1 : c.list, v: c.v0, pos: c.pos, name: c.name, b: c.birth, el: c.el ? KGLYPH[c.el] : '' }); });
    } else {
      var F = src.E;
      F.cands.forEach(function (c, ci) { dv += F.closed ? 0 : c.v0; rows.push({ i: ci, k: F.lists[c.list].kind === 'I' ? -1 : c.list, v: F.closed ? 0 : c.v0, pos: c.pos, name: c.name, b: c.birth, el: c.el ? 'D' : '' }); });
    }
    rows.forEach(function (r) { if (!groups.has(r.k)) groups.set(r.k, []); groups.get(r.k).push(r); });
    var gs = Array.from(groups.keys()).map(function (k) {
      var list = groups.get(k).sort(function (a, b) { return (b.v - a.v) || ((a.pos || 1e9) - (b.pos || 1e9)); });
      return { k: k, list: list, votes: list.reduce(function (t, r) { return t + r.v; }, 0) };
    }).sort(function (a, b) { return (a.k < 0) - (b.k < 0) || (b.votes - a.votes); });
    return '<div class="hctxgrid">' + gs.map(function (g) {
      var info;
      if (g.k < 0) info = { short: 'Üksikkandidaadid', name: 'Üksikkandidaadid', color: C.IND_COLOR };
      else if (src.type === 'rk') { var p = src.H.p[g.k], hp = C.hparty(p[0], p[1]); info = { short: hp.short, name: p[1], color: hp.color }; }
      else info = listInfo(src.E, g.k);
      var selfPos = -1; g.list.forEach(function (r, k) { if (r.i === selfI) selfPos = k; });
      var row = function (r, rank) {
        var self = r.i === selfI;
        var nm = self ? '<b>' + esc(r.name) + '</b>' : '<button type="button" class="plink" data-vhist="' + esc(r.name) + '" data-vhistb="' + esc(r.b || '') + '">' + esc(r.name) + '</button>';
        return '<tr class="' + (self ? 'self' : '') + (rank > 7 ? ' gap' : '') + '"><td class="num">' + rank + '.</td><td>' + (r.el ? C.glyph(r.el, info.color) + ' ' : '') + nm + '</td><td class="num">' + (r.pos || '–') + '</td><td class="num">' + nf0.format(r.v) + '</td><td class="num">' + pct1(dv ? r.v / dv : null) + '</td><td class="num">' + (g.k >= 0 ? pct1(g.votes ? r.v / g.votes : null) : '–') + '</td></tr>';
      };
      var body = g.list.slice(0, 7).map(function (r, k) { return row(r, k + 1); }).join('');
      if (selfPos >= 7) body += row(g.list[selfPos], selfPos + 1);
      return '<div class="hpcard" style="--pc:' + info.color + '"><div class="hpc-h"><span class="pname" title="' + esc(info.name) + '"><span class="sw"></span><b>' + esc(info.short) + '</b></span><span class="small muted tnum">' + nf0.format(g.votes) + ' häält · ' + pct1(dv ? g.votes / dv : null) + '</span></div>' +
        '<table class="tbl hmini"><thead><tr><th class="num">#</th><th>Kandidaat</th><th class="num" title="Koht nimekirjas">Nimek.</th><th class="num">Hääli</th><th class="num" title="Osakaal ringkonna kehtivatest häältest">% ringk.</th><th class="num" title="Osakaal nimekirja häältest">% nimek.</th></tr></thead><tbody>' + body + '</tbody></table></div>';
    }).join('') + '</div>';
  }
  function openHistory(name, birth) {
    hxStart();
    HS.nk = C.hkey(name); HS.pk = null;
    var b = birthStr(String(birth || '').replace(/-/g, ''));
    if (HX.idx) {
      var g = hxGroup(HS.nk);
      if (g && b) { var p = g.persons.filter(function (q) { return q.key === b || q.key === b.slice(0, 4) || q.keys.indexOf(b) >= 0; })[0]; if (p) HS.pk = p.key; }
    }
    HS.q = name; hsSave();
    var d = byId('vmDlg'); if (d && d.open) d.close();
    var d2 = byId('candDlg'); if (d2 && d2.open) d2.close();
    if (page !== 'cand') go('cand'); else renderCand();
    setTimeout(function () { var hp = byId('hxperson'); if (hp) hp.scrollIntoView({ block: 'start' }); }, 30);
  }
  function hxOpenInModel(s, i) {
    var src = HX.src[s];
    if (src.type === 'rk') { var a = rkApp(); if (a) { a.loadYear(src.year); var r = src.H.c[i]; go('rk'); setTimeout(function () { a.openCandidate(r[0]); }, 50); } return; }
    if (src.type === 'kov') { var E = src.E, c = E.cands[i]; pushHash('kov/' + E.eid + '/' + unitCode(E, c.unit) + '/' + c.d); return; }
    pushHash('ep/' + src.eid + '/kandidaadid');
  }
