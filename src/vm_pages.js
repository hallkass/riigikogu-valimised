  // ===================================================================
  // Avaleht ja valimiste haldus (uued valimised, vahetulemused)
  // ===================================================================
  function renderHome() {
    var main = byId('homeMain'), a = rkApp(), H = a && a.hist;
    var cards = [];
    // Riigikogu
    if (H) {
      var y = Math.max.apply(null, H.y), E0 = H.e[y];
      var ps = E0.p.map(function (p, i) { var hp = C.hparty(p[0], p[1]); return { i: i, name: p[1], short: hp.short, color: hp.color, votes: p[3], seats: p[4] }; });
      var order = ps.slice().sort(function (x, z) { return z.seats - x.seats || z.votes - x.votes; });
      var mem = [], tr = { 1: 'P', 2: 'D', 3: 'C' };
      order.forEach(function (p) {
        E0.c.filter(function (r) { return r[7] && r[2] === p.i; }).sort(function (r1, r2) { return r1[7] - r2[7] || r2[4] - r1[4]; })
          .forEach(function (r) { mem.push({ color: p.color, kind: tr[r[7]], title: r[1] + ' — ' + p.short }); });
      });
      E0.c.filter(function (r) { return r[7] && r[2] < 0; }).forEach(function (r) { mem.push({ color: C.IND_COLOR, kind: 'P', title: r[1] }); });
      cards.push(homeCard('rk', 'Riigikogu', 'Riigikogu valimised ' + y, '101 kohta · 12 ringkonda · isiku-, ringkonna- ja kompensatsioonimandaadid',
        '<svg class="hemi" viewBox="-1.1 -1.1 2.2 1.17" role="img" aria-label="Riigikogu ' + y + '">' + C.hemiSVG(mem, 101, { label: 'liiget · ' + y }) + '</svg>',
        order.filter(function (p) { return p.seats; }).map(function (p) { return [p.short, p.color, p.votes / E0.valid, p.seats]; }),
        H.y.slice().sort(function (x, z) { return z - x; }).map(function (yy) { return ['rk' + yy, yy]; })));
    }
    // KOV ja EP manifestist
    ['kov', 'ep'].forEach(function (t) {
      var ms = MANI.elections.filter(function (m) { return m.type === t; }).sort(function (x, z) { return z.year - x.year; });
      if (!ms.length) return;
      var m = ms[0], s = m.sum || {};
      var ps = (s.parties || []).map(function (p) { var info = p[2] === 'A' ? { short: 'Valimisliidud', color: '#5f8fa8' } : p[2] === 'I' ? { short: 'Üksikkandidaadid', color: C.IND_COLOR } : C.hparty(p[1], p[0]); return { short: info.short, color: info.color, votes: p[3], seats: p[4] }; });
      var vis;
      if (t === 'ep') {
        var mem = [];
        ps.slice().sort(function (x, z) { return z.seats - x.seats; }).forEach(function (p) { for (var k = 0; k < p.seats; k++) mem.push({ color: p.color, kind: 'D', title: p.short }); });
        vis = '<svg class="hemi" viewBox="-1.1 -1.1 2.2 1.17" role="img" aria-label="Europarlament ' + m.year + '">' + C.hemiSVG(mem, s.seats || mem.length, { label: 'kohta · ' + m.year }) + '</svg>';
      } else {
        vis = '<div class="homebar"><p class="bigline"><b>' + nf0.format(s.seats || 0) + '</b> volikogu kohta <b>' + (s.units || 0) + '</b> omavalitsuses</p><div class="seatstack">' + ps.filter(function (p) { return p.seats; }).map(function (p) { return '<i style="flex:' + p.seats + ';background:' + p.color + '" title="' + esc(p.short + ': ' + p.seats) + '"></i>'; }).join('') + '</div></div>';
      }
      cards.push(homeCard(t, TYPES[t].name, TYPES[t].long + ' ' + m.year, t === 'kov' ? 'Iga omavalitsus eraldi · 5% künnis omavalitsuses · Tallinnas kompensatsioonimandaadid' : 'Üks üleriigiline ringkond · d’Hondti meetod · ' + (s.seats || '') + ' kohta',
        vis, ps.filter(function (p) { return p.seats; }).map(function (p) { return [p.short, p.color, s.valid ? p.votes / s.valid : null, p.seats]; }),
        ms.map(function (x) { return [x.id, x.year]; })));
    });
    var h = '<section class="hero"><div><h1>Eesti valimiste mudel</h1><p class="lede">Riigikogu, kohalike volikogude ja Euroopa Parlamendi valimiste tulemused, mandaatide jaotus seaduse järgi ja asendusliikmed. Muuda hääli, lisa uusi valimisi või vahetulemusi ning vaata, kuidas koosseis muutub.</p></div>' +
      '<form class="hsearch" data-vhomeq><label class="vh" for="homeQ">Otsi kandidaati</label><input class="inp" id="homeQ" type="search" placeholder="Otsi kandidaati kõigilt valimistelt" autocomplete="off"><button type="submit" class="btn btn-primary">Otsi</button></form></section>';
    h += '<section class="hcards">' + cards.join('') + '</section>';
    h += '<section class="hgrid2">' + (editOn() ? '' : '<article class="card hinfo"><h2>Hääled on muudetavad</h2><p class="muted">Lülita lehe ülaosas sisse „Muutmine“, et muuta erakondade ja kandidaatide hääli, luua uusi valimisi (nt Riigikogu 2027) ja salvestada vahetulemusi. Vaikimisi näitab leht ametlikke tulemusi.</p><div><button type="button" class="btn" data-vedit>Lülita muutmine sisse</button></div></article>') + '<article class="card hinfo edit-only"><h2>Uued valimised ja vahetulemused</h2><p class="muted">Loo olemasolevate valimiste põhjal uued (nt Riigikogu 2027), sisesta valimisõhtul laekuvaid vahetulemusi ja võrdle hetkeseise. Andmed jäävad sinu brauserisse; faili saab alla laadida.</p><div><a class="btn" href="#valimised">Ava valimiste haldus</a></div></article>' +
      '<article class="card hinfo"><h2>Kandidaatide ajalugu</h2><p class="muted">Iga kandidaadi kõik kandideerimised ajalises järjekorras: Riigikogu, kohalikud ja Europarlament, nimekirja koht, hääled ja osakaalud. Sama nimega isikud eristatakse sünniaja järgi.</p><div><a class="btn" href="#kandidaadid">Ava kandidaatide otsing</a></div></article></section>';
    main.innerHTML = h;
  }
  function homeCard(t, eyebrow, title, sub, vis, rows, chips) {
    return '<article class="card tcard t-' + t + '"><div class="tcard-h"><p class="eyebrow">' + esc(eyebrow) + '</p><h2>' + esc(title) + '</h2><p class="small muted">' + esc(sub) + '</p></div>' + vis +
      '<table class="tbl tmini"><tbody>' + rows.slice(0, 7).map(function (r) { return '<tr style="--pc:' + r[1] + '"><td><div class="pname"><span class="sw"></span>' + esc(r[0]) + '</div></td><td class="num">' + (r[2] != null ? pct1(r[2]) : '') + '</td><td class="num"><b>' + nf0.format(r[3]) + '</b></td></tr>'; }).join('') + '</tbody></table>' +
      '<div class="tcard-f"><div class="pchips">' + chips.slice(0, 12).map(function (c) { return '<button type="button" class="pchip" data-vopen="' + esc(c[0]) + '">' + c[1] + '</button>'; }).join('') + '</div><a class="btn btn-primary" href="#' + SLUG[t] + '">Ava mudel</a></div></article>';
  }
  // valimiste avamine id järgi (ka oma valimised)
  function openElection(id) {
    if (/^rk\d{4}$/.test(id)) { var a = rkApp(); if (a) a.loadYear(+id.slice(2)); go('rk'); return; }
    if (id.indexOf('u:') === 0) {
      var u = USER.filter(function (x) { return 'u:' + x.id === id; })[0];
      if (!u) return;
      if (u.type === 'rk') { var err = rkApp().applyUser(u); if (err) alert(err); go('rk'); return; }
      pushHash(SLUG[u.type] + '/' + id); return;
    }
    var m = maniOf(id); if (m) pushHash(SLUG[m.type] + '/' + id);
  }

  // ---------- haldus
  var NM = { type: 'rk', base: '', votes: 'zero', file: null, msg: '' };
  function renderManage() {
    var main = byId('manageMain');
    if (!editOn()) {
      main.innerHTML = '<div class="card hinfo" style="margin-top:20px;max-width:60ch"><h2>Muutmine on väljas</h2><p class="muted">Uute valimiste lisamine ja vahetulemuste haldamine on muutmise režiimis. Lülita lehe ülaosas sisse „Muutmine“.</p><div><button type="button" class="btn btn-primary" data-vedit>Lülita muutmine sisse</button></div></div>';
      return;
    }
    main.innerHTML = loadingHTML();
    Promise.all([userReady, Store.all('sn')]).then(function (res) {
      var snaps = (res[1] || []).sort(function (a, b) { return a.time < b.time ? 1 : -1; });
      var h = '<div class="mgrid"><section class="card mform"><h2>Lisa uued valimised</h2><p class="small muted">Uued valimised luuakse olemasolevate põhjal (sama ülesehitus, nimekirjad ja kandidaadid) või loetakse failist. Hääli saab seejärel muuta, sisestada tekstina ja salvestada vahetulemustena.</p>' + newFormHTML() + '</section>' +
        '<section class="card mhelp"><h2>Andmed ja vorming</h2><p class="small muted">Oma valimised ja vahetulemused hoitakse ainult selles brauseris' + (Store.persistent() ? '' : ' (praegu ainult lehe sulgemiseni, sest brauseri andmehoidla pole saadaval)') + '. Teise seadmesse viimiseks või alles hoidmiseks laadi need alla ja loe hiljem failist sisse.</p>' +
        '<ul class="small"><li><b>Riigikogu</b>: sama JSON, mida näitab Riigikogu lehe nupp „Andmed (JSON)“ (<span class="mono">districts</span>, <span class="mono">parties</span>, <span class="mono">candidates</span>).</li><li><b>Kohalikud ja Europarlament</b>: kompaktne JSON (<span class="mono">type</span>, <span class="mono">units</span>/<span class="mono">lists</span>/<span class="mono">cands</span>). Näidisena sobib iga ametliku valimise fail: ' + MANI.elections.slice(0, 3).map(function (m) { return '<button type="button" class="link" data-vdlfile="' + esc(m.file) + '">' + esc(m.file) + '</button>'; }).join(', ') + '.</li>' +
        '<li>Vahetulemuse saab sisestada ka tekstina valimise lehe nupu „Vahetulemused“ kaudu (read kujul <span class="mono">kandidaadi nr;hääled</span>).</li></ul></section></div>';
      h += '<section class="zsec" style="margin-top:22px"><div class="zsec-h"><h2>Oma valimised (' + USER.length + ')</h2></div>' + (USER.length ? '<div class="card scroll-x"><table class="tbl"><thead><tr><th>Nimi</th><th>Liik</th><th>Kuupäev</th><th>Alus</th><th>Loodud</th><th></th></tr></thead><tbody>' + USER.map(function (u) {
        return '<tr><td><b>' + esc(u.name) + '</b></td><td>' + TYPES[u.type].name + '</td><td class="tnum">' + esc(fmtDate(u.date)) + '</td><td class="small muted">' + esc(u.baseLabel || '') + '</td><td class="small tnum">' + new Date(u.created).toLocaleString('et-EE') + '</td><td class="snapact"><button type="button" class="btn btn-sm btn-primary" data-vopen="u:' + esc(u.id) + '">Ava</button> <button type="button" class="btn btn-sm" data-vudl="' + esc(u.id) + '">Laadi alla</button> <button type="button" class="btn btn-sm btn-ghost" data-vudel="' + esc(u.id) + '">Kustuta</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="small muted">Oma valimisi pole veel loodud.</p>') + '</section>';
      h += '<section class="zsec" style="margin-top:22px"><div class="zsec-h"><h2>Vahetulemused (' + snaps.length + ')</h2><span class="small muted">Salvesta vahetulemusi valimise lehe nupuga „Vahetulemused“.</span></div>' + (snaps.length ? '<div class="card scroll-x"><table class="tbl"><thead><tr><th>Valimised</th><th>Nimi</th><th>Aeg</th><th>Mandaadid</th><th></th></tr></thead><tbody>' + snaps.map(function (s) {
        return '<tr><td>' + esc(s.label || elLabel(s.eid)) + '</td><td><b>' + esc(s.name) + '</b>' + (s.note ? '<div class="small muted">' + esc(s.note) + '</div>' : '') + '</td><td class="small tnum">' + new Date(s.time).toLocaleString('et-EE') + '</td><td>' + seatDiffHTML(s.seats || {}, s.seats || {}) + '</td><td class="snapact"><button type="button" class="btn btn-sm btn-primary" data-vsnapgo="' + esc(s.id) + '">Ava</button> <button type="button" class="btn btn-sm" data-vsnapdl="' + esc(s.id) + '">Laadi alla</button> <button type="button" class="btn btn-sm btn-ghost" data-vsnapdel="' + esc(s.id) + '">Kustuta</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="small muted">Vahetulemusi pole veel salvestatud.</p>') + '</section>';
      main.innerHTML = h;
    });
  }
  function newFormHTML() {
    var t = NM.type, list = elections(t);
    if (!NM.base || (NM.base !== 'file' && !list.some(function (e) { return e.id === NM.base; }))) NM.base = list.length ? list.slice().sort(function (a, b) { return (b.builtin - a.builtin) || b.year - a.year; })[0].id : 'file';
    var defName = { rk: 'Riigikogu 2027', kov: 'Kohalikud 2029', ep: 'Europarlament 2029' }[t];
    var h = '<div class="nmform"><label for="nmType">Liik</label><select class="inp" id="nmType">' + ['rk', 'kov', 'ep'].map(function (x) { return '<option value="' + x + '"' + (x === t ? ' selected' : '') + '>' + TYPES[x].long + '</option>'; }).join('') + '</select>' +
      '<label for="nmName">Nimi</label><input class="inp" id="nmName" value="' + esc(defName) + '">' +
      '<label for="nmDate">Valimispäev</label><input class="inp" id="nmDate" type="date">' +
      '<label for="nmBase">Alus</label><select class="inp" id="nmBase">' + list.map(function (e) { return '<option value="' + esc(e.id) + '"' + (e.id === NM.base ? ' selected' : '') + '>' + esc(e.builtin ? e.name + ' (ametlik)' : e.name + ' (oma)') + '</option>'; }).join('') + '<option value="file"' + (NM.base === 'file' ? ' selected' : '') + '>Loe failist (JSON)</option></select>';
    if (NM.base === 'file') h += '<label for="nmFile">Fail</label><input type="file" id="nmFile" accept=".json,application/json">';
    else h += '<span>Hääled</span><div class="nmradio" role="radiogroup" aria-label="Hääled">' + [['zero', 'nullid (sisestan ise)'], ['official', 'aluse ametlikud'], ['current', 'aluse praegused (minu muudatustega)']].map(function (o) {
      return '<label class="small"><input type="radio" name="nmVotes" value="' + o[0] + '"' + (NM.votes === o[0] ? ' checked' : '') + '> ' + o[1] + '</label>';
    }).join('') + '</div>';
    return h + '</div><div class="nmact"><button type="button" class="btn btn-primary" data-vnew>Loo valimised</button><span id="nmMsg" class="small" role="status">' + NM.msg + '</span></div>';
  }
  function createElection() {
    var msg = byId('nmMsg');
    var name = (byId('nmName').value || '').trim().slice(0, 80) || 'Uued valimised';
    var date = byId('nmDate').value || '';
    var year = date ? +date.slice(0, 4) : (+((name.match(/(19|20)\d{2}/) || [])[0]) || new Date().getFullYear());
    var vr = document.querySelector('input[name="nmVotes"]:checked'); NM.votes = vr ? vr.value : 'zero';
    var t = NM.type, base = NM.base;
    var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    var u = { id: id, type: t, name: name, year: year, date: date, created: new Date().toISOString(), base: base, baseLabel: base === 'file' ? 'fail' : elLabel(base) };
    var p;
    if (base === 'file') {
      if (!NM.file) { msg.innerHTML = '<span class="err">Vali fail.</span>'; return; }
      p = Promise.resolve(NM.file).then(function (o) {
        if (t === 'rk') { if (!o || !Array.isArray(o.candidates)) throw new Error('Riigikogu andmetes peavad olema districts, parties ja candidates.'); u.model = o; return; }
        if (!o || o.type !== t || !Array.isArray(o.cands) || !Array.isArray(o.lists)) throw new Error('Fail ei ole ' + TYPES[t].long.toLowerCase() + ' vormingus (type: "' + t + '", lists, cands).');
        X.prep(o); u.raw = o;
      });
    } else if (t === 'rk') {
      p = (base.indexOf('u:') === 0 ? Store.get('el', base.slice(2)).then(function (b) { return JSON.parse(JSON.stringify(b.model)); }) : Promise.resolve(rkApp().modelJSON(+base.slice(2), NM.votes === 'current')))
        .then(function (mdl) { if (NM.votes === 'zero') mdl.candidates.forEach(function (c) { c.votes = 0; }); u.model = mdl; });
    } else {
      p = loadElection(base).then(function (E) {
        var raw = JSON.parse(JSON.stringify(E.raw));
        var vi = t === 'kov' ? 4 : 3;
        if (NM.votes === 'current') E.cands.forEach(function (c, i) { raw.cands[i][vi] = c.votes; });
        if (NM.votes === 'zero') raw.cands.forEach(function (r) { r[vi] = 0; });
        if (E.closed) { raw.lvotes = E.lists.map(function (L) { return NM.votes === 'zero' ? 0 : NM.votes === 'current' ? L.lvotes : L.lv0; }); delete raw.lv; delete raw.av; }
        raw.cands.forEach(function (r) { if (t === 'kov') { r[7] = 0; r[9] = 0; r[10] = 0; } else r[5] = 0; });
        raw.noOfficial = true;
        raw.id = 'u-' + id; raw.name = name; raw.year = year; raw.date = date; raw.src = []; raw.notes = 'Loodud valimiste „' + elLabel(base) + '“ põhjal.';
        if (raw.stats) { delete raw.stats.voted; delete raw.stats.valid; delete raw.stats.evoted; }
        u.raw = raw;
      });
    }
    msg.innerHTML = '<span class="muted">Loon…</span>';
    p.then(function () { return Store.put('el', u); }).then(function () {
      USER.unshift(u); NM.msg = '';
      var a = rkApp(); if (a) a.refreshYearSel();
      openElection('u:' + id);
    }).catch(function (e) { msg.innerHTML = '<span class="err">' + esc(e && e.message ? e.message : e) + '</span>'; });
  }
  function deleteUser(id) {
    var u = USER.filter(function (x) { return x.id === id; })[0];
    if (!u || !confirm('Kustutan oma valimised „' + u.name + '“ ja nende vahetulemused? Seda ei saa tagasi võtta.')) return;
    Store.del('el', id).then(function () { return Store.all('sn'); }).then(function (xs) {
      return Promise.all((xs || []).filter(function (s) { return s.eid === 'u:' + id; }).map(function (s) { return Store.del('sn', s.id); }));
    }).then(function () {
      USER = USER.filter(function (x) { return x.id !== id; });
      LOADED.delete('u:' + id); lsSet('vm-v-u:' + id, null);
      if (KS.id === 'u:' + id) { KS.id = null; KS.E = null; }
      if (ES.id === 'u:' + id) { ES.id = null; ES.E = null; }
      var a = rkApp(); if (a) a.refreshYearSel(id);
      renderManage();
    });
  }
  function downloadUser(id) {
    var u = USER.filter(function (x) { return x.id === id; })[0]; if (!u) return;
    var fn = u.name.replace(/[^\wäöüõšžÄÖÜÕŠŽ -]/g, '').replace(/\s+/g, '-').toLowerCase() || 'valimised';
    if (u.type === 'rk') downloadJSON(fn + '.json', Object.assign({ format: 'riigikogu-valimismudel/1' }, u.model));
    else {
      var E = LOADED.get('u:' + id), raw = JSON.parse(JSON.stringify(u.raw));
      if (E) E.cands.forEach(function (c, i) { raw.cands[i][u.type === 'kov' ? 4 : 3] = c.votes; });
      downloadJSON(fn + '.json', raw);
    }
  }
  function goSnap(sid) {
    Store.get('sn', sid).then(function (s) {
      if (!s) return;
      var eid = s.eid;
      if (/^rk\d{4}$/.test(eid) || (eid.indexOf('u:') === 0 && (USER.filter(function (x) { return 'u:' + x.id === eid; })[0] || {}).type === 'rk')) {
        openElection(eid); var a = rkApp(); if (a) setTimeout(function () { a.setVotes(s.votes, false); }, 30);
        return;
      }
      loadElection(eid).then(function (E) {
        E.cands.forEach(function (c) { var k = voteKey(E, c); if (s.votes[k] != null) c.votes = +s.votes[k] || 0; });
        if (E.closed && s.votes.__lists) s.votes.__lists.forEach(function (v, l) { if (E.lists[l]) E.lists[l].lvotes = +v || 0; });
        saveVotesNow(E);
        if (E.type === 'kov') { kovEnsure(E); kovRecalc(E); } else { epEnsure(E); epRecalc(E); }
        openElection(eid);
      });
    });
  }
