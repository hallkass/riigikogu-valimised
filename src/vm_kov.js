  // ===================================================================
  // Kohaliku omavalitsuse volikogude valimised
  // ===================================================================
  var KS = { id: null, E: null, tab: 'eesti', unit: null, d: null, zp: null, q: '', county: '', err: null, loading: false };
  var KOV_TABS = [['eesti', 'Kogu Eesti'], ['ov', 'Omavalitsus'], ['kontroll', 'Kontroll'], ['reeglid', 'Reeglid']];
  var KTYPE = { 1: 'Isikumandaat', 2: 'Nimekirjamandaat', 3: 'Kompensatsioonimandaat', 4: 'Valitud' };
  var KTYPE_T = { 1: 'Isikumandaat', 2: 'Ringkonnamandaat', 3: 'Kompensatsioonimandaat', 4: 'Valitud' };
  var KGLYPH = { 1: 'P', 2: 'D', 3: 'C', 4: 'D' };
  function ktype(E, u, t) { return (E.units[u].tallinn ? KTYPE_T : KTYPE)[t] || 'Valitud'; }
  function latestId(type) { var xs = elections(type).filter(function (e) { return e.builtin; }).sort(function (a, b) { return b.year - a.year; }); return xs.length ? xs[0].id : (elections(type)[0] || {}).id; }
  function kovRules(E, U) { return E.user && E.raw.rulesYear == null ? X.KOV_RULES : X.kovRulesFor(E.raw.rulesYear != null ? E.raw.rulesYear : E.year, U); }
  function gkey(E, l) { var L = E.lists[l]; return L.kind === 'P' ? 'P' + L.party : L.kind; }
  function kovEnsure(E) {
    if (E.res) return;
    E.unitByCode = new Map(E.units.map(function (U) { return [U.code || ('u' + U.i), U.i]; }));
    E.res = E.units.map(function (U) { return X.kovUnit(E, U.i, kovRules(E, U)); });
    E.nat = null;
  }
  function kovRecalc(E, units) {
    (units || E.units.map(function (U) { return U.i; })).forEach(function (u) { E.res[u] = X.kovUnit(E, u, kovRules(E, E.units[u])); });
    E.nat = null;
  }
  function unitCode(E, u) { return E.units[u].code || ('u' + u); }
  function countyName(E, U) { return U.county >= 0 && E.counties[U.county] ? E.counties[U.county].name : ''; }
  function kovNat(E) {
    if (E.nat) return E.nat;
    var g = new Map(), T = 0, S = 0;
    function grp(k, l) {
      var o = g.get(k);
      if (!o) {
        var info = k === 'A' ? { name: 'Valimisliidud kokku', short: 'Valimisliidud', color: '#5f8fa8' } : k === 'I' ? { name: 'Üksikkandidaadid kokku', short: 'Üksikkand.', color: C.IND_COLOR } : listInfo(E, l);
        o = { k: k, name: info.name, short: info.short, color: info.color, votes: 0, v0: 0, seats: 0, off: 0, councils: 0, maj: 0, lists: 0, t: [0, 0, 0, 0, 0] };
        g.set(k, o);
      }
      return o;
    }
    E.res.forEach(function (r, u) {
      T += r.T; if (!/kordush/i.test(E.units[u].name)) S += E.units[u].seats; // kordushääletamine täidab esimese vooru täitmata kohad
      var per = new Map();
      r.lists.forEach(function (x, l) {
        var k = gkey(E, l), o = grp(k, l);
        o.votes += x.votes; o.seats += x.seats; o.lists++;
        for (var t = 1; t <= 4; t++) o.t[t] += x.t[t];
        per.set(k, (per.get(k) || 0) + x.seats);
        if (k !== 'P' + E.lists[l].party && x.seats * 2 > E.units[u].seats) o.maj++;
      });
      per.forEach(function (s, k) { var o = g.get(k); if (s > 0) o.councils++; if (k.charAt(0) === 'P' && s * 2 > E.units[u].seats) o.maj++; });
    });
    E.cands.forEach(function (c) { var o = grp(gkey(E, c.list), c.list); o.v0 += c.v0; if (c.el) o.off++; });
    var rows = Array.from(g.values()).sort(function (a, b) { return b.votes - a.votes; });
    E.nat = { rows: rows, T: T, S: S };
    return E.nat;
  }
  function kovSeatsFor(E, o) {
    var keep = E.cands.map(function (c) { return c.votes; });
    E.cands.forEach(function (c) { var k = voteKey(E, c); c.votes = o[k] != null ? Math.max(0, +o[k] || 0) : c.votes; });
    var out = {};
    E.units.forEach(function (U) {
      var r = X.kovUnit(E, U.i, kovRules(E, U));
      r.lists.forEach(function (x, l) { if (!x.seats) return; var k = gkey(E, l), nm = k === 'A' ? 'Valimisliidud' : k === 'I' ? 'Üksikkand.' : listInfo(E, l).short; out[nm] = (out[nm] || 0) + x.seats; });
    });
    E.cands.forEach(function (c, i) { c.votes = keep[i]; });
    return out;
  }

  // ---------- marsruut
  function kovRoute(parts) {
    var list = elections('kov');
    if (!list.length) { byId('kovMain').innerHTML = '<p class="muted" style="padding:20px 0">Kohalike valimiste andmed puuduvad.</p>'; return; }
    var id = parts[0] && list.some(function (e) { return e.id === parts[0]; }) ? parts[0] : (KS.id && list.some(function (e) { return e.id === KS.id; }) ? KS.id : latestId('kov'));
    var sub = parts[1] || '', d = parts[2] ? +parts[2] : null;
    function apply(E) {
      KS.E = E; KS.id = E.eid; KS.err = null;
      if (sub === 'eesti' || sub === 'kontroll' || sub === 'reeglid') KS.tab = sub;
      else if (sub) {
        var u = E.unitByCode.get(sub);
        if (u != null) { KS.tab = 'ov'; if (KS.unit !== u) { KS.unit = u; KS.d = null; } if (d) KS.d = d; }
      } else if (!parts[0]) { /* jäta eelmine vaade */ }
      else KS.tab = KS.tab || 'eesti';
      renderKov();
    }
    if (KS.E && KS.E.eid === id) { apply(KS.E); return; }
    KS.loading = true; KS.err = null; renderKov();
    var prevU = KS.E && KS.unit != null ? KS.E.units[KS.unit] : null;
    loadElection(id).then(function (E) {
      KS.loading = false; kovEnsure(E);
      if (KS.E !== E) {
        // sama omavalitsus teistel valimistel (nime või koodi järgi)
        var nu = -1;
        if (prevU) { nu = E.units.findIndex(function (U) { return U.name === prevU.name; }); if (nu < 0 && prevU.code) nu = E.units.findIndex(function (U) { return U.code === prevU.code; }); }
        KS.unit = nu >= 0 ? nu : null; KS.d = null; KS.zp = null; unfreezeAll();
        if (KS.tab === 'ov' && KS.unit == null) KS.tab = 'eesti';
      }
      apply(E);
    }, function (e) { KS.loading = false; KS.err = e; KS.id = id; renderKov(); });
  }
  function kovHash() {
    if (!KS.E) return 'kov';
    var s = KS.tab === 'ov' && KS.unit != null ? unitCode(KS.E, KS.unit) + (KS.d ? '/' + KS.d : '') : KS.tab;
    return 'kov/' + KS.E.eid + '/' + s;
  }

  // ---------- joonistamine
  function renderKov() {
    var tools = byId('kovTools'), main = byId('kovMain');
    var E = KS.E;
    var opts = elections('kov').map(function (e) { return '<option value="' + esc(e.id) + '"' + (e.id === KS.id ? ' selected' : '') + '>' + esc(e.builtin ? 'Kohalikud ' + e.year : e.name + ' (oma)') + '</option>'; }).join('');
    var n = E ? changedCount(E) : 0;
    tools.innerHTML = '<label class="vh" for="kovSel">Valimised</label><select class="inp yearsel" id="kovSel" data-vsel="kov">' + opts + '</select>' +
      (E ? '<span class="badge' + (n ? ' is-mod' : '') + '">' + (n ? 'Muudetud: ' + plural(n, 'kandidaat', 'kandidaati') : (E.user ? 'Oma andmed' : 'Ametlikud hääled')) + '</span>' +
        '<button type="button" class="btn" data-vkov="reset"' + (n ? '' : ' disabled') + '>Taasta hääled</button><button type="button" class="btn" data-vkov="zero">Nulli kõik hääled</button><button type="button" class="btn" data-vsnaps="kov">Vahetulemused</button>' : '');
    if (KS.loading) { main.innerHTML = loadingHTML('Laadin ' + elLabel(KS.id) + ' andmeid…'); return; }
    if (KS.err) { main.innerHTML = errorHTML(KS.err); return; }
    if (!E) { main.innerHTML = ''; return; }
    var h = '<nav class="tabs" role="tablist" aria-label="Kohalike valimiste vaated">' + KOV_TABS.map(function (t) {
      var on = t[0] === KS.tab;
      return '<button type="button" class="tab" role="tab" aria-selected="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-vktab="' + t[0] + '">' + t[1] + (t[0] === 'ov' && KS.unit != null ? ': ' + esc(E.units[KS.unit].name) : '') + '</button>';
    }).join('') + '</nav><section class="panel" id="kovPanel">';
    if (KS.tab === 'eesti') h += kovEestiHTML(E);
    else if (KS.tab === 'ov') h += kovUnitPageHTML(E);
    else if (KS.tab === 'kontroll') h += kovCheckHTML(E);
    else h += kovRulesHTML(E);
    main.innerHTML = h + '</section>';
  }
  function rerenderKovKeepFocus() {
    var a = document.activeElement, id = a && a.id, s = null, e = null;
    if (a && a.tagName === 'INPUT') { try { s = a.selectionStart; e = a.selectionEnd; } catch (x) { s = null; } }
    renderKov();
    if (id) { var b = byId(id); if (b) { b.focus({ preventScroll: true }); if (s != null) try { b.setSelectionRange(s, e); } catch (x) { /* pole tekstiväli */ } } }
  }

  // ---------- Kogu Eesti
  function kovEestiHTML(E) {
    var nat = kovNat(E), rows = nat.rows, st = E.raw.stats || {};
    var nC = E.cands.length, maxV = rows.length ? rows[0].votes : 1;
    var off = 0; E.cands.forEach(function (c) { if (c.el) off++; });
    var bar = '<div class="seatstack" role="img" aria-label="Volikogude kohtade jaotus">' + rows.filter(function (r) { return r.seats; }).map(function (r) {
      return '<i style="flex:' + r.seats + ';background:' + r.color + '" title="' + esc(r.short + ': ' + r.seats) + '"></i>';
    }).join('') + '</div>';
    var h = '<div class="summary"><div class="card hemi-card kov-sum">' +
      '<div><p class="eyebrow">' + esc(E.name) + (E.date ? ' · ' + fmtDate(E.date) : '') + '</p><p class="bigline"><b>' + nf0.format(nat.S) + '</b> volikogu kohta <b>' + E.units.filter(function (U) { return !/kordush/i.test(U.name); }).length + '</b> omavalitsuses</p></div>' + bar +
      '<div class="legend">' + rows.filter(function (r) { return r.seats; }).slice(0, 10).map(function (r) { return '<span><span class="sw" style="--pc:' + r.color + '"></span>' + esc(r.short) + ' ' + r.seats + '</span>'; }).join('') + '</div>' +
      '<div class="kpis">' + kpi('Kehtivaid hääli', nf0.format(nat.T), st.valid && st.valid !== nat.T ? 'ametlikult ' + nf0.format(st.valid) : '') +
      kpi('Kandidaate', nf0.format(nC), plural(E.lists.filter(function (L) { return L.kind !== 'I'; }).length, 'nimekiri', 'nimekirja')) +
      kpi('Osalus', st.eligible && st.voted ? pct1(st.voted / st.eligible) : '–', st.eligible ? nf0.format(st.voted || 0) + ' / ' + nf0.format(st.eligible) : '') +
      kpi('E-hääletanuid', st.evoted ? nf0.format(st.evoted) : '–', st.evoted && st.voted ? pct1(st.evoted / st.voted) + ' hääletanutest' : '') + '</div>' +
      (E.partial ? '<div class="warn">Andmed on osalised: ' + esc(E.notes || 'osa omavalitsusi või kandidaate puudub.') + '</div>' : '') + '</div>';
    var fk = 'kn', ho = hasOff(E);
    var ord = frozen(fk, rows, function (r) { return r.k; });
    h += '<div class="card vparty-card" data-vfrz="' + fk + '"><div class="ptools"><span>Erakondade, valimisliitude ja üksikkandidaatide hääled kokku. Mandaadid jaotatakse igas omavalitsuses eraldi (5% künnis kehtib omavalitsuse piires). ± muudab rühma hääli kõigis omavalitsustes; nimi avab tulemused omavalitsuste kaupa. ' + frzNote(fk) + '</span>' + stepperHTML() + '</div>' +
      '<div class="scroll-x"><table class="tbl ptable kovnat"><colgroup><col><col style="width:6.6em"><col style="width:4em"><col style="width:4.4em">' + (ho ? '<col style="width:4.6em">' : '') + '<col style="width:5.2em"><col style="width:4.6em"><col style="width:13.6em"></colgroup><thead><tr><th>Erakond / rühm</th><th class="num">Hääli</th><th class="num">%</th><th class="num" title="Mudeli järgi jaotatud volikogu kohti">Kohti</th>' + (ho ? '<th class="num" title="Ametlik tulemus">Ametlik</th>' : '') + '<th class="num" title="Volikogusid, kuhu pääses vähemalt üks liige">Volikogus</th><th class="num" title="Volikogusid, kus on üksi enamus">Enamus</th><th>Hääled ±</th></tr></thead><tbody>';
    ord.forEach(function (r) {
      var dlt = r.seats - r.off;
      h += '<tr style="--pc:' + r.color + '"><td><div class="pname"><span class="sw"></span><button type="button" class="plink" data-vkzp="' + r.k + '">' + esc(r.name) + '</button></div></td><td class="num">' + nf0.format(r.votes) + '</td><td class="num">' + nf1.format(nat.T ? r.votes / nat.T * 100 : 0) + '</td>' +
        '<td class="num"><span class="total">' + nf0.format(r.seats) + '</span>' + (ho && dlt ? '<span class="delta ' + (dlt > 0 ? 'up' : 'down') + '">' + (dlt > 0 ? '+' : '−') + Math.abs(dlt) + '</span>' : '') + '</td>' + (ho ? '<td class="num muted">' + nf0.format(r.off) + '</td>' : '') + '<td class="num">' + (r.councils || '·') + '</td><td class="num">' + (r.maj || '·') + '</td><td>' + adjHTML('kn:' + r.k, r.short, r.votes, r.v0) + '</td></tr>';
    });
    h += '</tbody><tfoot><tr><td>Kokku</td><td class="num">' + nf0.format(nat.T) + '</td><td class="num">100,0</td><td class="num">' + nf0.format(rows.reduce(function (s, r) { return s + r.seats; }, 0)) + '</td>' + (ho ? '<td class="num muted">' + nf0.format(off) + '</td>' : '') + '<td></td><td></td><td></td></tr></tfoot></table></div></div></div>';
    if (KS.zp) h += kovGroupZoomHTML(E, KS.zp);
    h += kovUnitsTableHTML(E);
    return h;
  }
  function kovGroupZoomHTML(E, k) {
    var rows = [], name = '', color = '';
    E.res.forEach(function (r, u) {
      r.lists.forEach(function (x, l) {
        if (gkey(E, l) !== k) return;
        var info = listInfo(E, l); name = name || (k === 'A' ? 'Valimisliidud' : k === 'I' ? 'Üksikkandidaadid' : info.name); color = color || info.color;
        var rank = 1; r.lists.forEach(function (y) { if (y.votes > x.votes) rank++; });
        rows.push({ u: u, l: l, x: x, rank: rank, off: E.offList.get(l) || 0, info: info });
      });
    });
    rows.sort(function (a, b) { return b.x.share - a.x.share || b.x.votes - a.x.votes; });
    var tv = rows.reduce(function (s, r) { return s + r.x.votes; }, 0), ts = rows.reduce(function (s, r) { return s + r.x.seats; }, 0);
    var mx = rows.length ? rows[0].x.share : 1;
    var h = '<section class="zsec" style="margin-top:22px"><div class="zhead"><h2><span class="sw" style="--pc:' + color + ';width:14px;height:14px"></span>' + esc(name) + ' omavalitsuste kaupa</h2><dl class="comp-row">' + stat('Nimekirju', rows.length) + stat('Hääli', nf0.format(tv)) + stat('Kohti', nf0.format(ts)) + '</dl><button type="button" class="btn btn-sm" data-vkzp="">Sulge</button></div>' +
      '<div class="card scroll-x"><table class="tbl"><thead><tr><th>Omavalitsus</th>' + (k === 'P' || k.charAt(0) === 'P' ? '' : '<th>Nimekiri</th>') + '<th class="num">Hääli</th><th class="num">%</th><th class="num" title="Koht nimekirjade seas häälte arvult">Koht</th><th class="num">Kohti</th><th class="num">Ametlik</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var U = E.units[r.u];
      h += '<tr class="rowlink" data-vkunit="' + esc(unitCode(E, r.u)) + '"><td><button type="button" class="plink" data-vkunit="' + esc(unitCode(E, r.u)) + '">' + esc(U.name) + '</button> <span class="small muted">' + esc(countyName(E, U)) + '</span></td>' +
        (k.charAt(0) === 'P' ? '' : '<td>' + esc(r.info.name) + '</td>') +
        '<td class="num">' + nf0.format(r.x.votes) + '</td><td class="num">' + nf1.format(r.x.share * 100) + shareBar(r.x.share, mx, color) + '</td><td class="num rk">' + r.rank + '.</td><td class="num"><b>' + r.x.seats + '</b> / ' + U.seats + '</td><td class="num muted">' + r.off + '</td></tr>';
    });
    return h + '</tbody></table></div></section>';
  }
  function kovUnitsTableHTML(E) {
    var q = C.norm(KS.q || ''), cs = KS.county;
    var h = '<section class="zsec" style="margin-top:22px"><div class="zsec-h"><h2>Omavalitsused</h2><span class="small muted">Vali omavalitsus, et näha volikogu koosseisu, ringkondi ja kandidaate.</span></div>' +
      '<div class="tools"><div class="grow"><label class="vh" for="kovQ">Otsi omavalitsust</label><input class="inp" id="kovQ" type="search" placeholder="Otsi omavalitsust" value="' + esc(KS.q) + '" autocomplete="off"></div>' +
      '<label for="kovCounty">Maakond</label><select class="inp" id="kovCounty"><option value="">Kõik</option>' + E.counties.map(function (c, i) { return '<option value="' + i + '"' + (String(i) === cs ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div>';
    h += '<div class="card scroll-x" id="kovUnitsBox">' + kovUnitsRowsHTML(E, q, cs) + '</div></section>';
    return h;
  }
  function kovUnitsRowsHTML(E, q, cs) {
    var h = '<table class="tbl kovunits"><thead><tr><th>Omavalitsus</th><th>Maakond</th><th class="num">Kohti</th><th class="num">Kehtivaid</th><th>Suurim nimekiri</th><th class="num" title="Mudeli ja ametliku tulemuse erinevus (erinevalt valitud liikmeid)">Erinevus</th></tr></thead><tbody>';
    var n = 0;
    E.units.forEach(function (U, u) {
      if (q && C.norm(U.name).indexOf(q) < 0) return;
      if (cs !== '' && String(U.county) !== cs) return;
      n++;
      var r = E.res[u], best = null;
      r.lists.forEach(function (x) { if (!best || x.seats > best.seats || (x.seats === best.seats && x.votes > best.votes)) best = x; });
      var info = best ? listInfo(E, best.l) : null, diff = unitDiff(E, u);
      if (!hasOff(E)) diff = { n: 0 };
      h += '<tr class="rowlink" data-vkunit="' + esc(unitCode(E, u)) + '"><td><button type="button" class="plink" data-vkunit="' + esc(unitCode(E, u)) + '">' + esc(U.name) + '</button>' + (U.districts.length > 1 ? ' <span class="tag">' + U.districts.length + ' ringkonda</span>' : '') + '</td><td class="small muted">' + esc(countyName(E, U)) + '</td><td class="num">' + U.seats + '</td><td class="num">' + nf0.format(r.T) + '</td>' +
        '<td>' + (info ? '<div class="pname" style="--pc:' + info.color + '"><span class="sw"></span><span>' + esc(info.short) + ' <b>' + best.seats + '</b>' + (best.seats * 2 > U.seats ? ' <span class="tag ok-tag">enamus</span>' : '') + '</span></div>' : '') + '</td>' +
        '<td class="num">' + (diff.n ? '<span class="tag warn-tag">' + diff.n + '</span>' : '<span class="muted">–</span>') + '</td></tr>';
    });
    if (!n) h += '<tr><td colspan="6" class="muted">Ei leitud.</td></tr>';
    return h + '</tbody></table>';
  }
  function unitDiff(E, u) {
    var r = E.res[u], extra = [], miss = [], typ = 0, ok = 0;
    E.units[u].cands.forEach(function (ci) {
      var c = E.cands[ci], m = r.el.get(ci) || 0;
      if (m && c.el) { ok++; if (c.el === m || c.el === 4 || m === 4) typ++; }
      else if (m) extra.push(ci);
      else if (c.el) miss.push(ci);
    });
    return { n: extra.length, extra: extra, miss: miss, ok: ok, typ: typ };
  }

  // ---------- omavalitsus
  function kovUnitPageHTML(E) {
    if (KS.unit == null || !E.units[KS.unit]) {
      return '<p class="panel-intro">Vali omavalitsus.</p>' + kovPickerHTML(E) + kovUnitsTableHTML(E);
    }
    var u = KS.unit, U = E.units[u], r = E.res[u];
    if (!KS.d || !U.dIdx.has(KS.d)) KS.d = U.districts[0].nr;
    var h = kovPickerHTML(E);
    h += '<div class="summary">' + kovUnitHemiHTML(E, u) + kovUnitListsHTML(E, u) + '</div>';
    if (r.warn.length) h += '<div class="warns" style="margin-top:12px">' + r.warn.map(function (w) { return '<div class="warn">' + esc(w) + '</div>'; }).join('') + '</div>';
    if (U.districts.length > 1) {
      h += '<div class="dchips" role="group" aria-label="Valimisringkond">' + U.districts.map(function (d) {
        return '<button type="button" class="pchip" data-vkd="' + d.nr + '" aria-pressed="' + (d.nr === KS.d) + '">nr ' + d.nr + ' · ' + esc(d.name) + ' <span class="muted">' + d.seats + ' kohta</span></button>';
      }).join('') + '</div>';
    }
    h += kovDistrictHTML(E, u, KS.d);
    if (r.tallinn) h += kovCompHTML(E, u);
    return h;
  }
  function kovPickerHTML(E) {
    var byC = new Map();
    E.units.forEach(function (U, u) { var k = countyName(E, U) || 'Muu'; if (!byC.has(k)) byC.set(k, []); byC.get(k).push(u); });
    var keys = Array.from(byC.keys()).sort(function (a, b) { return a.localeCompare(b, 'et'); });
    var h = '<div class="tools kovpick"><button type="button" class="link" data-vktab="eesti">← Kogu Eesti</button><label for="kovUnitSel">Omavalitsus</label><select class="inp" id="kovUnitSel"><option value="">— vali —</option>' + keys.map(function (k) {
      return '<optgroup label="' + esc(k) + '">' + byC.get(k).sort(function (a, b) { return E.units[a].name.localeCompare(E.units[b].name, 'et'); }).map(function (u) {
        return '<option value="' + esc(unitCode(E, u)) + '"' + (u === KS.unit ? ' selected' : '') + '>' + esc(E.units[u].name) + '</option>';
      }).join('') + '</optgroup>';
    }).join('') + '</select>';
    if (KS.unit != null) {
      var U = E.units[KS.unit];
      h += '<span class="small muted">' + esc(countyName(E, U)) + ' · ' + plural(U.seats, 'koht', 'kohta') + ' volikogus' + (U.tallinn ? ' · kompensatsioonimandaatidega süsteem (KOVVS § 56¹)' : '') + '</span>';
    }
    return h + '</div>';
  }
  function kovUnitHemiHTML(E, u) {
    var U = E.units[u], r = E.res[u];
    var lists = Array.from(r.lists.values()).sort(function (a, b) { return b.votes - a.votes; });
    var members = [];
    lists.forEach(function (x) {
      var info = listInfo(E, x.l);
      var els = [];
      r.el.forEach(function (t, ci) { if (E.cands[ci].list === x.l) els.push({ ci: ci, t: t }); });
      els.sort(function (a, b) { return a.t - b.t || E.cands[b.ci].votes - E.cands[a.ci].votes; });
      els.forEach(function (e) { var c = E.cands[e.ci]; members.push({ color: info.color, kind: KGLYPH[e.t], title: c.name + ' — ' + info.short + ', ' + ktype(E, u, e.t).toLowerCase(), attrs: ' data-kc="' + e.ci + '"' }); });
    });
    var st = U.eligible && U.voted ? pct1(U.voted / U.eligible) : '–';
    var thr = Math.ceil(r.T * r.thr / 100);
    var lg = '<span>' + C.glyph('P', 'var(--ink-3)') + 'isikumandaat</span><span>' + C.glyph('D', 'var(--ink-3)') + (r.tallinn ? 'ringkonnamandaat' : 'nimekirjamandaat') + '</span>' + (r.tallinn ? '<span>' + C.glyph('C', 'var(--ink-3)') + 'kompensatsioonimandaat</span>' : '');
    return '<div class="card hemi-card"><svg class="hemi" viewBox="-1.1 -1.1 2.2 1.17" role="img" aria-label="' + esc(U.name) + ' volikogu kohtade jaotus">' + C.hemiSVG(members, U.seats) + '</svg><div class="legend">' + lg + '</div>' +
      '<div class="kpis">' + kpi('Kehtivaid hääli', nf0.format(r.T)) + kpi('5% künnis', nf0.format(thr) + ' häält', 'üle omavalitsuse') + kpi('Osalus', st, U.eligible ? nf0.format(U.voted) + ' / ' + nf0.format(U.eligible) : '') + kpi('Ringkondi', U.districts.length, U.districts.length > 1 ? U.districts.map(function (d) { return d.seats; }).join(' + ') + ' kohta' : '') + '</div></div>';
  }
  function kovUnitListsHTML(E, u) {
    var U = E.units[u], r = E.res[u], fk = 'ku:' + u;
    var rows = Array.from(r.lists.values()).sort(function (a, b) { return b.votes - a.votes; });
    var fz = FREEZE.get(fk);
    rows = frozen(fk, rows, function (x) { return x.l; });
    var tall = r.tallinn, ho = hasOff(E);
    var h = '<div class="card vparty-card" data-vfrz="' + fk + '"><div class="ptools"><span>Nimekirjade hääled omavalitsuses. ± jagab muutuse nimekirja kandidaatidele proportsionaalselt. ' + frzNote(fk) + '</span>' + stepperHTML() + '</div><div class="scroll-x"><table class="tbl ptable kovlists"><colgroup><col><col style="width:6.2em"><col style="width:4em"><col style="width:3.6em"><col style="width:4.2em">' + (tall ? '<col style="width:3.8em">' : '') + '<col style="width:4.8em">' + (ho ? '<col style="width:4.2em">' : '') + '<col style="width:13.6em"></colgroup><thead><tr><th>Nimekiri</th><th class="num">Hääli</th><th class="num">%</th><th class="num" title="Isikumandaadid (lihtkvoot)">Isiku</th><th class="num" title="' + (tall ? 'Ringkonnamandaadid' : 'Nimekirjamandaadid') + '">' + (tall ? 'Ringk.' : 'Nimek.') + '</th>' + (tall ? '<th class="num" title="Kompensatsioonimandaadid">Komp.</th>' : '') + '<th class="num">Kokku</th>' + (ho ? '<th class="num" title="Ametlik tulemus">Ametlik</th>' : '') + '<th>Hääled ±</th></tr></thead><tbody>';
    var thrDone = false, sep = fz ? fz.sep : -1;
    rows.forEach(function (x, idx) {
      var info = listInfo(E, x.l), L = E.lists[x.l];
      if (!thrDone && (fz ? idx === sep : !x.q && L.kind !== 'I')) {
        thrDone = true;
        h += '<tr class="thr"><td colspan="' + ((tall ? 9 : 8) - (ho ? 0 : 1)) + '" class="small muted">5% künnis: ' + nf0.format(Math.ceil(r.T * r.thr / 100)) + ' häält (nimekirjamandaate saavad ainult künnise ületanud erakonnad ja valimisliidud)</td></tr>';
      }
      var off = E.offList.get(x.l) || 0, dlt = x.seats - off;
      var base = 0; L.cands.forEach(function (ci) { base += E.cands[ci].v0; });
      h += '<tr class="' + (x.q || L.kind === 'I' ? '' : 'below') + '" style="--pc:' + info.color + '"><td><div class="pname"><span class="sw"></span><div><button type="button" class="plink" data-vkl="' + x.l + '">' + esc(info.name) + '</button> ' + KIND_TAG[L.kind] + '</div></div></td>' +
        '<td class="num">' + nf0.format(x.votes) + '</td><td class="num">' + (x.q || L.kind === 'I' ? nf1.format(x.share * 100) : '<span class="pct-below" title="alla 5% künnise">' + nf1.format(x.share * 100) + '</span>') + '</td>' +
        '<td class="num">' + (x.t[1] || '·') + '</td><td class="num">' + ((x.t[2] + x.t[4]) || '·') + '</td>' + (tall ? '<td class="num">' + (x.t[3] || '·') + '</td>' : '') +
        '<td class="num"><span class="total">' + x.seats + '</span>' + (ho && dlt ? '<span class="delta ' + (dlt > 0 ? 'up' : 'down') + '">' + (dlt > 0 ? '+' : '−') + Math.abs(dlt) + '</span>' : '') + '</td>' + (ho ? '<td class="num muted">' + off + '</td>' : '') +
        '<td>' + (L.kind === 'I' ? '' : adjHTML('ku:' + u + ':' + x.l, info.short, x.votes, base)) + '</td></tr>';
    });
    var offT = 0; U.cands.forEach(function (ci) { if (E.cands[ci].el) offT++; });
    var seatsT = 0; r.el.forEach(function () { seatsT++; });
    h += '</tbody><tfoot><tr><td>Kokku</td><td class="num">' + nf0.format(r.T) + '</td><td class="num">100,0</td><td></td><td></td>' + (tall ? '<td></td>' : '') + '<td class="num">' + seatsT + ' / ' + U.seats + '</td>' + (ho ? '<td class="num muted">' + offT + '</td>' : '') + '<td></td></tr></tfoot></table></div></div>';
    return h;
  }
  function kovDistrictHTML(E, u, dnr) {
    var U = E.units[u], r = E.res[u], d = U.districts[U.dIdx.get(dnr)], D = r.dist[U.dIdx.get(dnr)];
    var fk = 'kd:' + u + ':' + dnr;
    var h = '<section class="dsec card" id="kovDist" data-vfrz="' + fk + '"><div class="dsec-h"><div class="dhead-t"><p class="eyebrow">Valimisringkond nr ' + d.nr + '</p><h2>' + esc(d.name) + '</h2></div><dl class="dstats">' +
      stat('Mandaate', d.seats) + stat('Kehtivaid hääli', nf0.format(D.T)) + stat('Lihtkvoot', D.M ? nf2.format(D.Q) : '–', 'häält') + '</dl></div>';
    // nimekirjad ringkonnas
    var lists = Array.from(D.lists.values()).sort(function (a, b) { return b.v - a.v; });
    lists = frozen(fk, lists, function (x) { return x.l; });
    var subsRank = new Map();
    r.subsD.forEach(function (arr, key) { if (key.split('|')[1] === String(dnr)) arr.forEach(function (ci, k) { subsRank.set(ci, k + 1); }); });
    var subsU = new Map();
    r.subsU.forEach(function (arr) { arr.forEach(function (ci, k) { subsU.set(ci, k + 1); }); });
    h += '<div class="pblocks kovblocks">';
    lists.forEach(function (x) {
      var info = listInfo(E, x.l), L = E.lists[x.l], q = r.lists.get(x.l).q;
      var ord = FREEZE.get(fk + ':c' + x.l) ? frozen(fk + ':c' + x.l, x.cands, function (ci) { return ci; }) : x.cands;
      var base = 0; x.cands.forEach(function (ci) { base += E.cands[ci].v0; });
      var nEl = 0; x.cands.forEach(function (ci) { if (r.el.has(ci)) nEl++; });
      h += '<article class="pblock" style="--pc:' + info.color + '"><div class="pblock-head"><div class="pname"><span class="sw"></span><b>' + esc(info.name) + '</b> ' + KIND_TAG[L.kind] + '</div><div class="pscale">' + (L.kind === 'I' ? '' : adjHTML('kd:' + u + ':' + dnr + ':' + x.l, info.short, x.v, base)) + '</div>' +
        '<div class="pcalc">' + nf0.format(x.v) + ' häält (' + pct1(D.T ? x.v / D.T : 0) + ' ringkonnast)' + (L.kind === 'I' ? '' : ' · ' + (q ? 'ületas künnise' : '<span class="pct-below">alla 5% künnise</span>')) + ' · valitud <b>' + nEl + '</b>' + (x.p ? ' (isikumandaate ' + x.p + ')' : '') + '</div></div><ol class="clist">';
      ord.forEach(function (ci, k) {
        var c = E.cands[ci], t = r.el.get(ci) || 0;
        var st = '';
        if (t) st += '<span class="chip chip-el">' + C.glyph(KGLYPH[t], info.color) + ktype(E, u, t) + '</span>';
        if (hasOff(E) && t && !c.el) st += '<span class="tag warn-tag" title="Ametlikult ei osutunud valituks">ametlikult mitte</span>';
        if (hasOff(E) && !t && c.el) st += '<span class="tag warn-tag" title="Ametlikult osutus valituks">ametlikult valitud</span>';
        if (!t && subsRank.has(ci)) st += '<span class="chip chip-sub">' + subsRank.get(ci) + '. asendusliige</span>';
        if (!t && subsU.has(ci)) st += '<span class="chip chip-sub" title="Ülelinnalise nimekirja asendusliige">' + subsU.get(ci) + '. ülelinn.</span>';
        var qq = D.T > 0 ? c.votes * D.M / D.T : 0;
        h += '<li class="crow kc-row"><span class="numbox' + (t ? ' is-el' : '') + '">' + c.nr + '</span><div class="cmain"><button type="button" class="cname" data-kc="' + ci + '">' + esc(c.name) + '</button><span class="cmeta">' + (L.kind === 'I' ? 'üksikkandidaat' : 'nimekirjas ' + (c.pos || '–') + '.' + (c.upos ? ', ülelinnalises ' + c.upos + '.' : '')) + (c.birth ? ' · s. ' + esc(fmtBirth(c.birth)) : '') + '</span></div>' +
          '<label class="cvotes"><span class="lbl">Hääled</span><input type="text" inputmode="numeric" id="kv-' + ci + '" data-kv="' + ci + '" value="' + c.votes + '" aria-label="' + esc(c.name) + ' hääled"></label>' +
          '<div class="cq"><span class="qv">' + nf1.format(qq * 100) + '%</span><span class="sub">lihtkvoodist</span></div><div class="cst">' + st + '</div></li>';
      });
      h += '</ol></article>';
    });
    h += '</div>';
    // jaotuse käik
    h += '<div class="dalloc">' + kovAllocHTML(E, u, D) + '</div></section>';
    return h;
  }
  function kovAllocHTML(E, u, D) {
    var r = E.res[u], h = '';
    if (r.tallinn) {
      h += '<h3>Ringkonnamandaadid (KOVVS § 56¹ lg 3)</h3><p class="small muted">Künnise ületanud nimekiri saab ringkonnas nii mitu mandaati, mitu korda tema hääled ületavad lihtkvoodi (isikumandaadid arvatakse sisse); mandaadid saavad häälte arvult eespool olevad kandidaadid.</p><div class="figs">';
      Array.from(D.lists.values()).sort(function (a, b) { return b.v - a.v; }).forEach(function (x) {
        if (!r.lists.get(x.l).q) return;
        var info = listInfo(E, x.l);
        h += '<span class="fig" style="--pc:' + info.color + '">' + esc(info.short) + ': ' + nf0.format(x.v) + ' / ' + nf2.format(D.Q) + ' = ' + nf2.format(D.Q ? x.v / D.Q : 0) + ' → <b>' + Math.floor(D.Q ? x.v * D.M / D.T : 0) + '</b></span>';
      });
      return h + '</div>';
    }
    if (!D.steps.length && !D.lisa.length) return '<p class="small muted">Kõik mandaadid jaotati lihtkvoodi alusel või nimekirjamandaate ei jaotatud.</p>';
    h += '<h3>Nimekirjamandaadid d’Hondti meetodil (KOVVS § 56 lg 5)</h3><p class="small muted">Iga künnise ületanud nimekirja võrdlusarvud on tema ringkonna häälte summa jagatud 1, 2, 3 …; esimesed jagajad jäetakse vahele nii mitme võrra, kui palju nimekiri sai isikumandaate. Värvilised said mandaadi, punktiirjoonega on lisamandaatide tabeli (§ 70) järgmised.</p>';
    var byL = new Map();
    D.steps.forEach(function (s, i) { if (!byL.has(s.l)) byL.set(s.l, []); byL.get(s.l).push({ s: s, n: i + 1, used: true }); });
    D.lisa.slice(0, 5).forEach(function (s, i) { if (!byL.has(s.l)) byL.set(s.l, []); byL.get(s.l).push({ s: s, n: i + 1, used: false }); });
    h += '<div class="figrows">';
    Array.from(D.lists.values()).sort(function (a, b) { return b.v - a.v; }).forEach(function (x) {
      if (!r.lists.get(x.l).q) return;
      var info = listInfo(E, x.l), arr = byL.get(x.l) || [];
      h += '<div class="figrow" style="--pc:' + info.color + '"><span class="pname"><span class="sw"></span>' + esc(info.short) + '</span><span class="figs">' + (x.p ? '<span class="fig district" title="Isikumandaadid">' + x.p + '× isiku</span>' : '') + arr.map(function (a) {
        return '<span class="fig ' + (a.used ? 'comp' : 'next') + '" title="' + (a.used ? a.n + '. nimekirjamandaat' : a.n + '. lisamandaat') + '" style="' + (a.used ? 'color:' + C.textOn(info.color) : '') + '">' + nf0.format(x.v) + '/' + a.s.div + ' = ' + nf2.format(a.s.v / a.s.div) + '</span>';
      }).join('') + '</span></div>';
    });
    return h + '</div>';
  }
  function kovCompHTML(E, u) {
    var r = E.res[u];
    if (!r.comp) return '';
    var h = '<section class="step card" style="padding:14px 16px;margin-top:16px"><div class="step-h"><h2>Kompensatsioonimandaadid</h2><span class="law">KOVVS § 56¹ lg 4–8</span></div><p class="note">Ringkondades jaotamata ' + plural(r.comp.C, 'mandaat', 'mandaati') + ' jaotatakse künnise ületanud nimekirjade vahel d’Hondti meetodil (jagajad 1, 2, 3 …), jättes vahele nii mitu esimest jagajat, kui palju mandaate nimekiri ringkondades sai. Mandaadi saab ülelinnalises nimekirjas eespool olev valimata kandidaat.</p><div class="figrows">';
    var byL = new Map();
    r.comp.steps.forEach(function (s, i) { if (!byL.has(s.l)) byL.set(s.l, []); byL.get(s.l).push({ s: s, n: i + 1, used: true }); });
    r.lisaU.slice(0, 5).forEach(function (s, i) { if (!byL.has(s.l)) byL.set(s.l, []); byL.get(s.l).push({ s: s, n: i + 1, used: false }); });
    Array.from(r.lists.values()).filter(function (x) { return x.q; }).sort(function (a, b) { return b.votes - a.votes; }).forEach(function (x) {
      var info = listInfo(E, x.l), arr = byL.get(x.l) || [];
      var inD = x.t[1] + x.t[2];
      h += '<div class="figrow" style="--pc:' + info.color + '"><span class="pname"><span class="sw"></span>' + esc(info.short) + '</span><span class="figs">' + (inD ? '<span class="fig district">' + inD + '× ringkondades</span>' : '') + arr.map(function (a) {
        return '<span class="fig ' + (a.used ? 'comp' : 'next') + '" style="' + (a.used ? 'color:' + C.textOn(info.color) : '') + '" title="' + (a.used ? a.n + '. kompensatsioonimandaat' : a.n + '. lisamandaat') + '">' + nf0.format(x.votes) + '/' + a.s.div + ' = ' + nf2.format(a.s.v / a.s.div) + '</span>';
      }).join('') + '</span></div>';
    });
    return h + '</div></section>';
  }

  // ---------- kandidaadi kaart
  function kovCandDlg(ci) {
    var E = KS.E, c = E.cands[ci], u = c.unit, U = E.units[u], r = E.res[u], L = E.lists[c.list], info = listInfo(E, c.list);
    var d = U.districts[U.dIdx.get(c.d)], D = r.dist[U.dIdx.get(c.d)], t = r.el.get(ci) || 0;
    var x = D.lists.get(c.list), rank = x ? x.cands.indexOf(ci) + 1 : 0;
    var dlg = byId('vmDlg');
    dlg.style.setProperty('--pc', info.color);
    var h = '<div class="dlg"><div class="dlg-h"><span class="numbox' + (t ? ' is-el' : '') + '" style="--pc:' + info.color + '">' + c.nr + '</span><div style="min-width:0"><h2>' + esc(c.name) + '</h2><p class="small muted">' + esc(info.name) + ' · ' + esc(U.name) + (U.districts.length > 1 ? ', ringkond nr ' + d.nr + ' (' + esc(d.name) + ')' : '') + ' · ' + esc(E.label) + '</p></div><button type="button" class="btn btn-ghost" data-vclose>Sulge</button></div><div class="dlg-b">';
    h += '<dl class="facts"><div><dt>Hääli</dt><dd>' + nf0.format(c.votes) + (c.votes !== c.v0 ? ' <span class="small muted">(ametlik ' + nf0.format(c.v0) + ')</span>' : '') + '</dd></div><div><dt>Lihtkvoodist</dt><dd>' + pct1(D.T ? c.votes * D.M / D.T : 0) + '</dd></div>' +
      (L.kind !== 'I' ? '<div><dt>Ringkonnanimekirjas</dt><dd>' + (c.pos || '–') + '.</dd></div>' : '') + (c.upos ? '<div><dt>Ülelinnalises nimekirjas</dt><dd>' + c.upos + '.</dd></div>' : '') +
      (rank && L.kind !== 'I' ? '<div><dt>Nimekirjas häälte arvult</dt><dd>' + rank + '.</dd></div>' : '') + (c.birth ? '<div><dt>Sünniaeg</dt><dd>' + esc(fmtBirth(c.birth)) + '</dd></div>' : '') + '</dl>';
    h += '<div class="cst">' + (t ? '<span class="chip chip-el">' + C.glyph(KGLYPH[t], info.color) + ktype(E, u, t) + '</span>' : '<span class="chip chip-none">ei osutu valituks</span>') +
      (!hasOff(E) ? '' : c.el ? '<span class="tag">ametlikult: ' + esc(ktype(E, u, c.el).toLowerCase()) + '</span>' : '<span class="tag">ametlikult ei osutunud valituks</span>') + '</div>';
    // asendusliikmed
    if (t && L.kind !== 'I' && r.lists.get(c.list).q) {
      var sd = r.subsD.get(c.list + '|' + c.d) || [], su = r.subsU.get(c.list) || [];
      h += '<div class="chainlist"><h3>Asendusliikmete järjekord</h3>';
      if (t === 3) h += '<div><h4>Ülelinnalise nimekirja valimata kandidaadid (KOVVS § 69 lg 4)</h4>' + candOl(E, su.slice(0, 8), 1) + '</div>';
      else h += '<div><h4>Sama nimekirja ringkonna nr ' + c.d + ' asendusliikmed häälte arvu järgi (KOVVS § 69 lg 3)</h4>' + (sd.length ? candOl(E, sd.slice(0, 8), 1) : '<p class="small muted">Puuduvad — koht täidetakse lisamandaadiga (§ 70).</p>') + '</div>';
      h += '</div>';
    } else if (t) {
      h += '<p class="small muted">' + (L.kind === 'I' ? 'Üksikkandidaadil asendusliikmeid ei ole; koht täidetakse lisamandaadi alusel (KOVVS § 70).' : 'Nimekiri jäi alla 5% künnise, seega asendusliikmeid ei registreerita (KOVVS § 69 lg 2); koht täidetakse lisamandaadiga.') + '</p>';
    } else {
      var sd2 = r.subsD.get(c.list + '|' + c.d) || [], k2 = sd2.indexOf(ci), su2 = r.subsU.get(c.list) || [], k3 = su2.indexOf(ci);
      if (k2 >= 0 || k3 >= 0) h += '<p class="small">Asendusliikmena: ' + (k2 >= 0 ? '<b>' + (k2 + 1) + '.</b> ringkonna nr ' + c.d + ' nimekirjas' : '') + (k3 >= 0 ? (k2 >= 0 ? '; ' : '') + '<b>' + (k3 + 1) + '.</b> ülelinnalises nimekirjas' : '') + '.</p>';
      else if (L.kind !== 'I' && !r.lists.get(c.list).q) h += '<p class="small muted">Nimekiri jäi alla 5% künnise: asendusliikmeid ei registreerita.</p>';
    }
    h += '<div id="kStations"></div>';
    h += '</div><div class="dlg-f"><button type="button" class="btn" data-vhist="' + esc(c.name) + '" data-vhistb="' + (c.birth || '') + '">Kandideerimise ajalugu</button><button type="button" class="btn btn-primary" data-vclose>Valmis</button></div></div>';
    dlg.innerHTML = h;
    openDlg(dlg);
    loadStations(E).then(function (st) {
      var box = byId('kStations'); if (!box || !st || !st.units) return;
      var su = st.units[String(u)]; if (!su || !su.cv || !su.cv[String(ci)]) return;
      var arr = su.cv[String(ci)], tot = arr.reduce(function (s, v) { return s + v; }, 0), sc = tot ? c.votes / tot : 0;
      box.innerHTML = '<h3>Hääled jaoskondade kaupa</h3>' + (c.votes !== tot ? '<p class="small muted">Ametlik jaotus, skaleeritud praeguste häältega.</p>' : '') + '<div class="scroll-x"><table class="tbl hmini"><thead><tr><th>Jaoskond</th><th class="num">Hääli</th><th class="num">%</th></tr></thead><tbody>' +
        arr.map(function (v, i) { return { v: v, i: i }; }).filter(function (o) { return o.v > 0; }).sort(function (a, b) { return b.v - a.v; }).map(function (o) {
          return '<tr><td>' + esc(su.st[o.i] || ('#' + (o.i + 1))) + '</td><td class="num">' + nf0.format(Math.round(o.v * sc)) + '</td><td class="num">' + pct1(tot ? o.v / tot : 0) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    });
  }
  function candOl(E, ids, start) {
    return '<ol start="' + start + '">' + ids.map(function (ci) { var c = E.cands[ci]; return '<li><button type="button" class="cname" data-kc="' + ci + '">' + esc(c.name) + '</button> <span class="small muted tnum">' + nf0.format(c.votes) + ' häält</span></li>'; }).join('') + '</ol>';
  }

  // ---------- kontroll
  function kovCheckHTML(E) {
    if (!hasOff(E)) return '<p class="panel-intro">Need on sinu loodud valimised, millel ametlikku tulemust pole. Võrdle tulemusi vahetulemuste abil (nupp „Vahetulemused“).</p>';
    var units = 0, ok = 0, typ = 0, off = 0, mod = 0, rows = [];
    E.units.forEach(function (U, u) {
      var d = unitDiff(E, u), o = 0;
      U.cands.forEach(function (ci) { if (E.cands[ci].el) o++; });
      off += o; ok += d.ok; typ += d.typ; mod += d.ok + d.extra.length;
      if (!d.extra.length && !d.miss.length) units++;
      else rows.push({ u: u, d: d });
    });
    var n = changedCount(E);
    var h = '<p class="panel-intro">Mudel arvutab iga omavalitsuse tulemuse ' + (E.user ? 'oma andmetega' : 'ametlike häältega') + ' ja võrdleb seda ametliku tulemusega (kes osutus valituks ja millise mandaadiga).' + (n ? ' <b>Hääli on muudetud (' + n + ' kandidaati), seega erinevused tulenevad osaliselt muudatustest.</b>' : '') + '</p>';
    var checks = [['Omavalitsused, kus valitute koosseis ühtib', units, E.units.length], ['Valituks osutunud kandidaadid', ok, off], ['Mandaadi liik', typ, ok]];
    h += '<div class="checks">' + checks.map(function (x) { var good = x[1] === x[2]; return '<div class="check' + (good ? '' : ' bad') + '"><span class="mark">' + (good ? '✓' : '!') + '</span><span>' + x[0] + '</span><span class="cnt">' + nf0.format(x[1]) + ' / ' + nf0.format(x[2]) + '</span></div>'; }).join('') + '</div>';
    if (rows.length) {
      h += '<h3 style="margin-top:18px">Erinevused (' + rows.length + ' omavalitsust)</h3><div class="card scroll-x"><table class="tbl"><thead><tr><th>Omavalitsus</th><th>Mudelis valitud, ametlikult mitte</th><th>Ametlikult valitud, mudelis mitte</th></tr></thead><tbody>' + rows.map(function (x) {
        var nm = function (ci) { var c = E.cands[ci]; return esc(c.name) + ' <span class="small muted">(' + esc(listInfo(E, c.list).short) + ', ' + nf0.format(c.votes) + ')</span>'; };
        return '<tr><td><button type="button" class="plink" data-vkunit="' + esc(unitCode(E, x.u)) + '">' + esc(E.units[x.u].name) + '</button></td><td class="small">' + x.d.extra.map(nm).join('<br>') + '</td><td class="small">' + x.d.miss.map(nm).join('<br>') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    }
    if (E.notes) h += '<details class="hdet"><summary>Andmete märkused</summary><p class="small muted">' + esc(E.notes) + '</p></details>';
    var m = maniOf(E.eid);
    if (m && m.src) h += '<p class="small muted" style="margin-top:12px">Allikad: ' + m.src.map(function (s) { return '<a href="' + esc(s) + '" target="_blank" rel="noopener">' + esc(s.replace(/^https?:\/\//, '')) + '</a>'; }).join(', ') + '</p>';
    return h;
  }
  function kovRulesHTML(E) {
    return '<div class="rules"><p class="panel-intro">Mudel arvutab tulemuse kohaliku omavalitsuse volikogu valimise seaduse (<a href="https://www.riigiteataja.ee/akt/KOVVS" target="_blank" rel="noopener">KOVVS</a>) järgi. Iga omavalitsus on eraldi valimine; mandaatide arv ja ringkonnad on volikogu otsustatud (§ 7–9).</p><ol>' +
      '<li><b>Lihtkvoot ja isikumandaat (§ 56 lg 1–2).</b><p>Ringkonna kehtivad hääled jagatakse ringkonna mandaatide arvuga. Valituks osutub kandidaat, kelle häälte arv on lihtkvoodist suurem või sellega võrdne (ka üksikkandidaat ja alla künnise jäänud nimekirja kandidaat).</p></li>' +
      '<li><b>5% künnis (§ 56 lg 3).</b><p>Nimekirjamandaate saavad ainult erakonnad ja valimisliidud, kelle kandidaadid kogusid kogu vallas või linnas kokku vähemalt 5% häältest.</p></li>' +
      '<li><b>Nimekirjamandaadid (§ 56 lg 4–7).</b><p>Ringkonnanimekirja kandidaadid reastatakse häälte arvu järgi (võrdse häälte arvu korral nimekirjas tagapool olev ettepoole) ja nimekirja hääled liidetakse. Ülejäänud mandaadid jaotatakse d’Hondti meetodil jagajatega 1, 2, 3 …, jättes vahele nii mitu esimest jagajat, kui palju isikumandaate nimekiri ringkonnas sai. Võrdsete võrdlusarvude korral saab mandaadi nimekiri, mille kandidaadid on koondnimekirjas tagapool. Nimekiri ei saa rohkem mandaate, kui tal on kandidaate.</p></li>' +
      '<li><b>Erijuhud (§ 56 lg 9–10).</b><p>Kui ringkonnas on ainult üksikkandidaadid, osutuvad valituks enim hääli saanud. Kui mandaate jääb jaotamata (nt keegi ei ületanud künnist), saavad need ülejäänud kandidaatidest enim hääli saanud.</p></li>' +
      '<li><b>Tallinn (§ 56¹).</b><p>Tallinnas on 8 ringkonda. Künnise ületanud nimekiri saab ringkonnas nii mitu mandaati, mitu korda tema hääled ületavad lihtkvoodi (isikumandaadid kaasa arvatud). Ülejäänud mandaadid jaotatakse kompensatsioonimandaatidena ülelinnaliste häälte põhjal d’Hondti meetodil, jättes vahele ringkondades saadud mandaatide arvu jagu jagajaid; mandaadi saab ülelinnalises nimekirjas eespool olev valimata kandidaat.</p></li>' +
      '<li><b>Asendusliikmed (§ 69).</b><p>Asendusliikmed registreeritakse ainult künnise ületanud erakondadele ja valimisliitudele ringkondade kaupa, häälte arvu järgi (võrdsuse korral ringkonnanimekirjas tagapool olev ettepoole). Tallinna kompensatsioonimandaadiga valitud liikmete asendusliikmed on ülelinnalise nimekirja valimata kandidaadid nimekirja järjekorras.</p></li>' +
      '<li><b>Lisamandaadid (§ 70).</b><p>Kui nimekirjas asendusliikmeid pole või asendada tuleb üksikkandidaati, läheb koht võrdlusarvude tabeli järgmisele nimekirjale (võrdsuse korral rohkem hääli saanud, seejärel koondnimekirjas tagapool olev).</p></li>' +
      '<li><b>Varasemad valimised.</b>' + kovHistNote(E) + '</li></ol></div>';
  }
  // tolleaegsed reeglid (leitud ametlike tulemuste põhjal; vt engine2.js KOV_YEAR)
  var KOV_HIST = [
    [2005, 'Alates 2005. aastast kehtivad samad reeglid nagu praegu: nimekirjamandaadid jaotatakse tavalise d’Hondti meetodiga ja võrdse häälte arvu korral jääb ringkonnanimekirjas ettepoole tagapool olev kandidaat. Tallinnas jaotatakse kompensatsioonimandaadid (§ 56¹).'],
    [2002, '2002. aastal jaotati nimekirjamandaadid modifitseeritud d’Hondti meetodil (jagajad 1; 2<sup>0,9</sup>; 3<sup>0,9</sup> …, isikumandaatide võrra nihutatud) ja võrdse häälte arvu korral jäi ettepoole nimekirjas eespool olev kandidaat.'],
    [1996, '1996. ja 1999. aastal jaotati nimekirjamandaadid modifitseeritud d’Hondti meetodil (jagajad 1; 2<sup>0,9</sup>; 3<sup>0,9</sup> …). Kui ringkonnas kandideerisid ainult üksikkandidaadid, said kohad ainult lihtkvoodi ületanud; ülejäänud kohad täideti kordushääletamisel, kus valituks osutusid enim hääli saanud (andmetes eraldi „kordushääletamine“).'],
    [1993, '1993. aastal isikumandaate ei olnud: kõik kohad jaotati modifitseeritud d’Hondti meetodil (jagajad 1; 2<sup>0,9</sup>; 3<sup>0,9</sup> …) 5% künnise ületanud nimekirjade ja üksikkandidaatide vahel. Täitmata kohtade jaoks korraldati kordushääletamine.']
  ];
  function kovHistNote(E) {
    var y = E.raw.rulesYear != null ? E.raw.rulesYear : E.year;
    return '<p>Mudel arvutab iga valimise tolleaegsete reeglitega, mis on leitud ametlike tulemuste põhjal (vahekaart „Kontroll“ võrdleb tulemust ametlikuga).</p><ul class="small">' + KOV_HIST.map(function (x) {
      var on = !E.user && (x[0] === 2005 ? y >= 2005 : x[0] === 1996 ? (y === 1996 || y === 1999) : y === x[0]);
      return '<li' + (on ? ' class="hl-now"' : '') + '>' + x[1] + (on ? ' <span class="tag ok-tag">see valimine</span>' : '') + '</li>';
    }).join('') + '</ul>';
  }
