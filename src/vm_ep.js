  // ===================================================================
  // Euroopa Parlamendi valimised
  // ===================================================================
  var ES = { id: null, E: null, tab: 'kandidaadid', err: null, loading: false };
  var EP_TABS = [['kandidaadid', 'Kandidaadid'], ['jaotus', 'Mandaatide jaotus'], ['asendus', 'Asendusliikmed'], ['piirkonnad', 'Piirkonnad'], ['kontroll', 'Kontroll'], ['reeglid', 'Reeglid']];
  function epEnsure(E) { if (!E.res) E.res = X.ep(E); }
  function epRecalc(E) { E.res = X.ep(E); }
  function epListVotes(E, l) { var L = E.lists[l]; if (E.closed) return L.lvotes; var s = 0; L.cands.forEach(function (ci) { s += E.cands[ci].votes; }); return s; }
  function epListBase(E, l) { var L = E.lists[l]; if (E.closed) return L.lv0; var s = 0; L.cands.forEach(function (ci) { s += E.cands[ci].v0; }); return s; }
  function epSeatsFor(E, o) {
    var keep = E.cands.map(function (c) { return c.votes; }), keepL = E.lists.map(function (L) { return L.lvotes; });
    E.cands.forEach(function (c) { var k = voteKey(E, c); if (o[k] != null) c.votes = Math.max(0, +o[k] || 0); });
    if (E.closed && o.__lists) o.__lists.forEach(function (v, l) { if (E.lists[l]) E.lists[l].lvotes = +v || 0; });
    var r = X.ep(E), out = {};
    r.lists.forEach(function (x) { if (x.seats) { var nm = listInfo(E, x.l).short; out[nm] = (out[nm] || 0) + x.seats; } });
    E.cands.forEach(function (c, i) { c.votes = keep[i]; });
    E.lists.forEach(function (L, l) { L.lvotes = keepL[l]; });
    return out;
  }
  function epRoute(parts) {
    var list = elections('ep');
    if (!list.length) { byId('epMain').innerHTML = '<p class="muted" style="padding:20px 0">Euroopa Parlamendi valimiste andmed puuduvad.</p>'; return; }
    var id = parts[0] && list.some(function (e) { return e.id === parts[0]; }) ? parts[0] : (ES.id && list.some(function (e) { return e.id === ES.id; }) ? ES.id : latestId('ep'));
    var sub = parts[1];
    function apply(E) {
      ES.E = E; ES.id = E.eid; ES.err = null;
      if (sub && EP_TABS.some(function (t) { return t[0] === sub; })) ES.tab = sub;
      renderEp();
    }
    if (ES.E && ES.E.eid === id) { apply(ES.E); return; }
    ES.loading = true; ES.err = null; renderEp();
    loadElection(id).then(function (E) { ES.loading = false; epEnsure(E); unfreezeAll(); apply(E); }, function (e) { ES.loading = false; ES.err = e; ES.id = id; renderEp(); });
  }
  function epHash() { return ES.E ? 'ep/' + ES.E.eid + '/' + ES.tab : 'ep'; }
  function renderEp() {
    var tools = byId('epTools'), main = byId('epMain'), E = ES.E;
    var opts = elections('ep').map(function (e) { return '<option value="' + esc(e.id) + '"' + (e.id === ES.id ? ' selected' : '') + '>' + esc(e.builtin ? 'Europarlament ' + e.year : e.name + ' (oma)') + '</option>'; }).join('');
    var n = E ? changedCount(E) : 0;
    tools.innerHTML = '<label class="vh" for="epSel">Valimised</label><select class="inp yearsel" id="epSel" data-vsel="ep">' + opts + '</select>' +
      (E ? '<span class="badge' + (n ? ' is-mod' : '') + '">' + (n ? 'Muudetud: ' + plural(n, 'kirje', 'kirjet') : (E.user ? 'Oma andmed' : 'Ametlikud hääled')) + '</span>' +
        (editOn() ? '<button type="button" class="btn" data-vep="reset"' + (n ? '' : ' disabled') + '>Taasta hääled</button><button type="button" class="btn" data-vep="zero">Nulli kõik hääled</button><button type="button" class="btn" data-vsnaps="ep">Vahetulemused</button>' : '') : '');
    if (ES.loading) { main.innerHTML = loadingHTML('Laadin ' + elLabel(ES.id) + ' andmeid…'); return; }
    if (ES.err) { main.innerHTML = errorHTML(ES.err); return; }
    if (!E) { main.innerHTML = ''; return; }
    var h = '<div class="summary">' + epHemiHTML(E) + epListsHTML(E) + '</div>';
    h += '<nav class="tabs" role="tablist" aria-label="Europarlamendi valimiste vaated">' + EP_TABS.map(function (t) {
      var on = t[0] === ES.tab;
      return '<button type="button" class="tab" role="tab" aria-selected="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-vetab="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</nav><section class="panel" id="epPanel">' + epPanelHTML(E) + '</section>';
    main.innerHTML = h;
  }
  function rerenderEpKeepFocus() {
    var a = document.activeElement, id = a && a.id, s = null, e = null;
    if (a && a.tagName === 'INPUT') { try { s = a.selectionStart; e = a.selectionEnd; } catch (x) { s = null; } }
    renderEp();
    if (id) { var b = byId(id); if (b) { b.focus({ preventScroll: true }); if (s != null) try { b.setSelectionRange(s, e); } catch (x) { /* pole tekstiväli */ } } }
  }
  function epPanelHTML(E) {
    switch (ES.tab) {
      case 'jaotus': return epAllocHTML(E);
      case 'asendus': return epSubsHTML(E);
      case 'piirkonnad': return epAreasHTML(E);
      case 'kontroll': return epCheckHTML(E);
      case 'reeglid': return epRulesHTML(E);
      default: return epCandsHTML(E);
    }
  }
  function epHemiHTML(E) {
    var r = E.res, st = E.raw.stats || {}, members = [];
    r.lists.slice().sort(function (a, b) { return b.votes - a.votes; }).forEach(function (x) {
      var info = listInfo(E, x.l);
      r.order[x.l].slice(0, x.seats).forEach(function (ci) { members.push({ color: info.color, kind: 'D', title: E.cands[ci].name + ' — ' + info.short, attrs: ' data-ec="' + ci + '"' }); });
    });
    return '<div class="card hemi-card"><svg class="hemi" viewBox="-1.1 -1.1 2.2 1.17" role="img" aria-label="Eestile jaotatud Euroopa Parlamendi kohad">' + C.hemiSVG(members, r.S, { label: 'kohta' }) + '</svg>' +
      '<div class="kpis">' + kpi('Kehtivaid hääli', nf0.format(r.T)) + kpi('Osalus', st.eligible && st.voted ? pct1(st.voted / st.eligible) : '–', st.eligible ? nf0.format(st.voted || 0) + ' / ' + nf0.format(st.eligible) : '') +
      kpi('Nimekirju', E.lists.filter(function (L) { return L.kind === 'P'; }).length, plural(E.lists.filter(function (L) { return L.kind === 'I'; }).length, 'üksikkandidaat', 'üksikkandidaati')) +
      kpi('Kandidaate', E.cands.length, E.closed ? 'suletud nimekirjad' : 'hääled kandidaatidele') + '</div></div>';
  }
  function epListsHTML(E) {
    var r = E.res, fk = 'el';
    var rows = frozen(fk, r.lists.slice().sort(function (a, b) { return b.votes - a.votes; }), function (x) { return x.l; });
    var off = new Map(); E.cands.forEach(function (c) { if (c.el) off.set(c.list, (off.get(c.list) || 0) + 1); });
    var ho = hasOff(E), ed = editOn();
    var h = '<div class="card vparty-card" data-vfrz="' + fk + '"><div class="ptools"><span>Erakondade ja üksikkandidaatide hääled. Mandaadid jaotatakse d’Hondti meetodil üle Eesti; künnist ei ole.' + (ed ? ' ± jagab muutuse kandidaatidele proportsionaalselt. ' + frzNote(fk) : '') + '</span>' + stepperHTML() + '</div><div class="scroll-x"><table class="tbl ptable epl"><colgroup><col><col style="width:6.6em"><col style="width:4em"><col style="width:4.8em">' + (ho ? '<col style="width:4.4em">' : '') + (ed ? '<col style="width:13.6em">' : '') + '</colgroup><thead><tr><th>Nimekiri</th><th class="num">Hääli</th><th class="num">%</th><th class="num">Kohti</th>' + (ho ? '<th class="num" title="Ametlik tulemus">Ametlik</th>' : '') + (ed ? '<th>Hääled ±</th>' : '') + '</tr></thead><tbody>';
    rows.forEach(function (x) {
      var info = listInfo(E, x.l), L = E.lists[x.l], o = off.get(x.l) || 0, dlt = x.seats - o;
      h += '<tr style="--pc:' + info.color + '"' + (x.seats ? '' : ' class="below"') + '><td><div class="pname"><span class="sw"></span><div><button type="button" class="plink" data-velist="' + x.l + '">' + esc(info.name) + '</button> ' + KIND_TAG[L.kind] + '</div></div></td><td class="num">' + nf0.format(x.votes) + '</td><td class="num">' + nf1.format(x.share * 100) + '</td>' +
        '<td class="num"><span class="total">' + x.seats + '</span>' + (ho && dlt ? '<span class="delta ' + (dlt > 0 ? 'up' : 'down') + '">' + (dlt > 0 ? '+' : '−') + Math.abs(dlt) + '</span>' : '') + '</td>' + (ho ? '<td class="num muted">' + o + '</td>' : '') + (ed ? '<td>' + adjHTML('ep:' + x.l, info.short, x.votes, epListBase(E, x.l)) + '</td>' : '') + '</tr>';
    });
    var seats = r.lists.reduce(function (s, x) { return s + x.seats; }, 0), offT = 0; off.forEach(function (v) { offT += v; });
    return h + '</tbody><tfoot><tr><td>Kokku</td><td class="num">' + nf0.format(r.T) + '</td><td class="num">100,0</td><td class="num">' + seats + '</td>' + (ho ? '<td class="num muted">' + offT + '</td>' : '') + (ed ? '<td></td>' : '') + '</tr></tfoot></table></div></div>';
  }
  function epCandsHTML(E) {
    var r = E.res;
    var ed = editOn();
    var h = '<p class="panel-intro">' + (E.closed ? 'Neil valimistel olid nimekirjad suletud: valija hääletas erakonna nimekirja poolt ja mandaadid said nimekirja järjekorras eespool olevad kandidaadid.' + (ed ? ' Muuta saab nimekirjade hääli.' : '') : 'Erakonna nimekirja kandidaadid reastatakse ümber saadud häälte järgi (võrdsuse korral nimekirjas eespool olev ettepoole) ja mandaadid saavad eespool olevad kandidaadid (EPVS § 61 lg 2).' + (ed ? ' Muuda kandidaadi hääli väljal; erakonna nimekiri järjestub ümber, kui liigud väljalt edasi.' : '')) + '</p><div class="pblocks">';
    r.lists.slice().sort(function (a, b) { return b.votes - a.votes; }).forEach(function (x) {
      var info = listInfo(E, x.l), L = E.lists[x.l], fk = 'ec:' + x.l;
      var ord = frozen(fk, r.order[x.l], function (ci) { return ci; });
      h += '<article class="pblock" style="--pc:' + info.color + '" data-vfrz="' + fk + '"><div class="pblock-head"><div class="pname"><span class="sw"></span><b>' + esc(info.name) + '</b> ' + KIND_TAG[L.kind] + '</div><div class="pscale">' +
        (E.closed && ed ? '<label class="cvotes"><span class="lbl">Nimekirja hääled</span><input type="text" inputmode="numeric" id="elv-' + x.l + '" data-elv="' + x.l + '" value="' + L.lvotes + '"></label>' : '') + '</div>' +
        '<div class="pcalc">' + nf0.format(x.votes) + ' häält (' + pct1(x.share) + ') · ' + plural(x.seats, 'mandaat', 'mandaati') + '</div></div><ol class="clist">';
      ord.forEach(function (ci) {
        var c = E.cands[ci], el = r.el.has(ci), sk = r.subs[x.l].indexOf(ci);
        var st = el ? '<span class="chip chip-el">' + C.glyph('D', info.color) + 'Valitud</span>' : (sk >= 0 && L.kind === 'P' ? '<span class="chip chip-sub">' + (sk + 1) + '. asendusliige</span>' : '');
        if (hasOff(E) && el && !c.el) st += '<span class="tag warn-tag">ametlikult mitte</span>';
        if (hasOff(E) && !el && c.el) st += '<span class="tag warn-tag">ametlikult valitud</span>';
        h += '<li class="crow"><span class="numbox' + (el ? ' is-el' : '') + '"' + (E.closed ? ' title="Koht nimekirjas"' : '') + '>' + (E.closed ? c.pos : c.nr) + '</span><div class="cmain"><button type="button" class="cname" data-ec="' + ci + '">' + esc(c.name) + '</button><span class="cmeta">' + (L.kind === 'I' ? 'üksikkandidaat' : 'nimekirjas ' + (c.pos || '–') + '.') + (c.birth ? ' · s. ' + esc(fmtBirth(c.birth)) : '') + '</span></div>' +
          (E.closed ? '<div class="cvotes"><span class="lbl">Koht</span><b>' + (c.pos || '–') + '.</b></div>' : ed ? '<label class="cvotes"><span class="lbl">Hääled</span><input type="text" inputmode="numeric" id="ev-' + ci + '" data-ev="' + ci + '" value="' + c.votes + '" aria-label="' + esc(c.name) + ' hääled"></label>' : '<div class="cvotes"><span class="lbl">Hääled</span><b class="vstatic">' + nf0.format(c.votes) + '</b></div>') +
          '<div class="cq"><span class="qv">' + (E.closed ? '–' : pct1(x.votes ? c.votes / x.votes : 0)) + '</span><span class="sub">' + (E.closed ? '' : 'nimekirja häältest') + '</span></div><div class="cst">' + st + '</div></li>';
      });
      h += '</ol></article>';
    });
    return h + '</div>';
  }
  function epAllocHTML(E) {
    var r = E.res, S = r.S, K = S + 1;
    var lists = r.lists.slice().sort(function (a, b) { return b.votes - a.votes; }).filter(function (x, i) { return x.votes > 0 && (i < 8 || x.seats); });
    var used = new Map(); r.steps.forEach(function (s, i) { used.set(s.l + '|' + s.div, i + 1); });
    var nxt = new Map(); r.lisa.forEach(function (s, i) { nxt.set(s.l + '|' + s.div, i + 1); });
    var h = '<div class="steps"><section class="step"><div class="step-h"><h2>d’Hondti meetod</h2><span class="law">EPVS § 61 lg 1</span></div><p class="note">Iga erakonna hääled jagatakse 1, 2, 3 … ja ' + plural(S, 'mandaat', 'mandaati') + ' saavad suurimad võrdlusarvud. Üksikkandidaadi võrdlusarv on tema häälte arv (ta saab ühe mandaadi). Võrdsete võrdlusarvude korral saab mandaadi koondnimekirjas tagapool olev. Number lahtris näitab, mitmes mandaat; punktiirjoonega on lisamandaatide tabeli (§ 74) järgmised.</p>' +
      '<div class="card scroll-x"><table class="tbl mx"><thead><tr><th>Nimekiri</th>' + Array.from({ length: K }, function (_, i) { return '<th>÷' + (i + 1) + '</th>'; }).join('') + '</tr></thead><tbody>';
    lists.forEach(function (x) {
      var info = listInfo(E, x.l), L = E.lists[x.l];
      h += '<tr><td><div class="pname" style="--pc:' + info.color + '"><span class="sw"></span>' + esc(info.short) + '</div></td>';
      for (var k = 1; k <= K; k++) {
        if (L.kind === 'I' && k > 1) { h += '<td></td>'; continue; }
        var u = used.get(x.l + '|' + k), n = nxt.get(x.l + '|' + k);
        h += '<td><div class="cell' + (u ? '' : ' zero') + '"' + (u ? ' style="color:inherit"' : '') + '><b' + (u ? ' style="color:var(--accent)"' : '') + '>' + nf0.format(Math.round(x.votes / k)) + '</b><small>' + (u ? u + '. mandaat' : n ? '<span class="lost">' + n + '. lisa</span>' : '&nbsp;') + '</small></div></td>';
      }
      h += '</tr>';
    });
    h += '</tbody></table></div></section>';
    h += '<section class="step"><div class="step-h"><h2>Lisamandaatide tabel</h2><span class="law">EPVS § 74</span></div><p class="note">Kui lahkuv liige oli üksikkandidaat või tema nimekirjas pole enam kandidaate, saab koha võrdlusarvude tabeli järgmine nimekiri.</p><ol class="small">' + r.lisa.slice(0, 6).map(function (s) {
      var info = listInfo(E, s.l), next = r.subs[s.l] && r.subs[s.l][0] != null ? E.cands[r.subs[s.l][0]].name : '';
      return '<li>' + esc(info.short) + ' — võrdlusarv ' + nf0.format(Math.round(s.v / s.div)) + ' (' + nf0.format(s.v) + ' ÷ ' + s.div + ')' + (next && E.lists[s.l].kind === 'P' ? ' → ' + esc(next) : '') + '</li>';
    }).join('') + '</ol></section></div>';
    return h;
  }
  function epSubsHTML(E) {
    var r = E.res;
    var h = '<p class="panel-intro">Euroopa Parlamendi liikme asendusliikmed on sama erakonna nimekirjas valimata jäänud kandidaadid häälte arvu järjekorras (EPVS § 73).</p><div class="dsubs">';
    r.lists.slice().sort(function (a, b) { return b.seats - a.seats || b.votes - a.votes; }).forEach(function (x) {
      var info = listInfo(E, x.l), L = E.lists[x.l];
      if (L.kind !== 'P' || (!x.seats && x.votes < r.T * 0.01)) return;
      h += '<div class="dsub" style="border-left:4px solid ' + info.color + '"><b>' + esc(info.name) + '</b><span class="el">Valitud: ' + (x.seats ? r.order[x.l].slice(0, x.seats).map(function (ci) { return esc(E.cands[ci].name); }).join(', ') : '–') + '</span><ol>' +
        r.subs[x.l].slice(0, 10).map(function (ci) { return '<li><button type="button" class="cname" data-ec="' + ci + '">' + esc(E.cands[ci].name) + '</button> <span class="small muted tnum">' + (E.closed ? '' : nf0.format(E.cands[ci].votes)) + '</span></li>'; }).join('') + '</ol>' + (r.subs[x.l].length > 10 ? '<span class="small muted">… ja veel ' + (r.subs[x.l].length - 10) + '</span>' : '') + '</div>';
    });
    return h + '</div>';
  }
  function epAreaTotals(E) {
    if (!E.areas || !E.areas.length || (!E.av && !E.raw.lv)) return null;
    if (E._at) return E._at;
    var A = E.areas.length, tot = new Array(A).fill(0), byL = E.lists.map(function () { return new Array(A).fill(0); });
    if (E.closed && E.raw.lv) E.raw.lv.forEach(function (row, l) { row.forEach(function (v, a) { byL[l][a] += v; tot[a] += v; }); });
    else E.cands.forEach(function (c, i) { var row = E.av[i]; if (!row) return; row.forEach(function (v, a) { byL[c.list][a] += v; tot[a] += v; }); });
    E._at = { tot: tot, byL: byL };
    return E._at;
  }
  function epAreasHTML(E) {
    var at = epAreaTotals(E);
    if (!at) return '<p class="muted">Selle valimise kohta pole piirkondade kaupa andmeid.</p>';
    var r = E.res, lists = r.lists.slice().sort(function (a, b) { return b.votes - a.votes; }).slice(0, 7);
    var h = '<p class="panel-intro">Ametlikud hääled piirkondade kaupa (protsent piirkonna kehtivatest häältest). Kui hääli on muudetud, on see vaade ikkagi ametliku jaotuse järgi. Klõpsa kandidaadi nimel kandidaatide vaates, et näha tema hääli piirkondade kaupa.</p><div class="card scroll-x"><table class="tbl heat"><thead><tr><th>Piirkond</th><th class="num">Kehtivaid</th>' + lists.map(function (x) { var info = listInfo(E, x.l); return '<th class="pcol"><div class="pname" style="--pc:' + info.color + '"><span class="sw"></span>' + esc(info.short) + '</div></th>'; }).join('') + '</tr></thead><tbody>';
    var order = E.areas.map(function (a, i) { return i; }).filter(function (i) { return at.tot[i] > 0; });
    order.sort(function (a, b) { var ca = E.areas[a].county || E.areas[a].name, cb = E.areas[b].county || E.areas[b].name; return ca.localeCompare(cb, 'et') || (E.areas[a].county ? 1 : 0) - (E.areas[b].county ? 1 : 0) || E.areas[a].name.localeCompare(E.areas[b].name, 'et'); });
    var mx = lists.map(function (x) { var m = 0; order.forEach(function (a) { var s = at.tot[a] ? at.byL[x.l][a] / at.tot[a] : 0; if (s > m) m = s; }); return m; });
    order.forEach(function (a) {
      var A = E.areas[a];
      h += '<tr><td>' + (A.county ? '<span class="muted small">' + esc(A.county.replace(' maakond', 'm.')) + ' · </span>' : '') + esc(A.name) + '</td><td class="num">' + nf0.format(at.tot[a]) + '</td>' + lists.map(function (x, k) {
        var s = at.tot[a] ? at.byL[x.l][a] / at.tot[a] : 0, info = listInfo(E, x.l);
        return '<td class="hv" style="background:color-mix(in srgb, ' + info.color + ' ' + Math.round((mx[k] ? s / mx[k] : 0) * 45) + '%, transparent)">' + nf1.format(s * 100) + '</td>';
      }).join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
  }
  function epCheckHTML(E) {
    if (!hasOff(E)) return '<p class="panel-intro">Need on sinu loodud valimised, millel ametlikku tulemust pole. Võrdle tulemusi vahetulemuste abil (nupp „Vahetulemused“).</p>';
    var r = E.res, ok = 0, extra = [], miss = [], off = 0;
    E.cands.forEach(function (c, i) { var m = r.el.has(i); if (c.el) off++; if (m && c.el) ok++; else if (m) extra.push(i); else if (c.el) miss.push(i); });
    var n = changedCount(E);
    var h = '<p class="panel-intro">Mudeli tulemus ' + (E.user ? 'oma andmetega' : 'ametlike häältega') + ' võrrelduna ametliku tulemusega.' + (n ? ' <b>Hääli on muudetud, seega erinevused tulenevad osaliselt muudatustest.</b>' : '') + '</p><div class="checks">' +
      [['Valituks osutunud kandidaadid', ok, off]].map(function (x) { var good = x[1] === x[2] && !extra.length; return '<div class="check' + (good ? '' : ' bad') + '"><span class="mark">' + (good ? '✓' : '!') + '</span><span>' + x[0] + '</span><span class="cnt">' + x[1] + ' / ' + x[2] + '</span></div>'; }).join('') + '</div>';
    if (extra.length || miss.length) {
      var li = function (i) { return '<li>' + esc(E.cands[i].name) + ' <span class="small muted">' + esc(listInfo(E, E.cands[i].list).short) + '</span></li>'; };
      h += '<div class="diffcols" style="margin-top:10px"><div class="card" style="padding:12px 14px"><h3>Mudelis valitud, tegelikult mitte (' + extra.length + ')</h3><ul>' + extra.map(li).join('') + '</ul></div><div class="card" style="padding:12px 14px"><h3>Tegelikult valitud, mudelis mitte (' + miss.length + ')</h3><ul>' + miss.map(li).join('') + '</ul></div></div>';
    }
    if (E.notes) h += '<details class="hdet"><summary>Andmete märkused</summary><p class="small muted">' + esc(E.notes) + '</p></details>';
    var m = maniOf(E.eid);
    if (m && m.src) h += '<p class="small muted" style="margin-top:12px">Allikad: ' + m.src.map(function (s) { return '<a href="' + esc(s) + '" target="_blank" rel="noopener">' + esc(s.replace(/^https?:\/\//, '')) + '</a>'; }).join(', ') + '</p>';
    return h;
  }
  function epRulesHTML(E) {
    return '<div class="rules"><p class="panel-intro">Mudel arvutab tulemuse Euroopa Parlamendi valimise seaduse (<a href="https://www.riigiteataja.ee/akt/EPVS" target="_blank" rel="noopener">EPVS</a>) järgi. Eesti on üks üleriigiline valimisringkond (§ 6).</p><ol>' +
      '<li><b>Mandaatide jaotus (§ 61 lg 1).</b><p>Mandaadid jaotatakse d’Hondti meetodil jagajatega 1, 2, 3 … Üksikkandidaadi võrdlusarv on tema häälte arv. Võrdsete võrdlusarvude korral saab mandaadi erakond või üksikkandidaat, kes on koondnimekirjas tagapool. Läve (künnist) ei ole.</p></li>' +
      '<li><b>Kandidaatide järjestus (§ 61 lg 2–3).</b><p>Erakonna nimekirja kandidaadid reastatakse ümber häälte arvu järgi; võrdse häälte arvu korral jääb ettepoole nimekirjas eespool olev. Mandaadid saavad ümberreastatud nimekirjas eespool olevad. Erakond ei saa rohkem mandaate, kui tal on kandidaate.</p></li>' +
      '<li><b>Asendusliikmed (§ 73).</b><p>Asendusliikmed on sama nimekirja valimata kandidaadid ümberreastatud järjekorras.</p></li>' +
      '<li><b>Lisamandaadid (§ 74).</b><p>Kui lahkunud liige oli üksikkandidaat või tema nimekirjas pole enam kandidaate, saab koha võrdlusarvude tabelis järgmine erakond (võrdsuse korral rohkem hääli saanu, seejärel koondnimekirjas tagapool olev).</p></li>' +
      '<li><b>Varasemad valimised.</b><p>2009. aastal olid nimekirjad suletud: valija hääletas nimekirja poolt ja mandaadid said nimekirja järjekorras eespool olevad kandidaadid. Mandaatide arv: 2004–2014 kuus, 2019 kuus (pärast Brexitit lisandus seitsmes koht järgmisele võrdlusarvule), 2024 seitse.</p></li></ol></div>';
  }
  function epCandDlg(ci) {
    var E = ES.E, c = E.cands[ci], r = E.res, L = E.lists[c.list], info = listInfo(E, c.list), x = r.lists[c.list];
    var el = r.el.has(ci), rank = r.order[c.list].indexOf(ci) + 1, sk = r.subs[c.list].indexOf(ci);
    var dlg = byId('vmDlg');
    dlg.style.setProperty('--pc', info.color);
    var h = '<div class="dlg"><div class="dlg-h"><span class="numbox' + (el ? ' is-el' : '') + '" style="--pc:' + info.color + '">' + (E.closed ? c.pos : c.nr) + '</span><div style="min-width:0"><h2>' + esc(c.name) + '</h2><p class="small muted">' + esc(info.name) + ' · ' + esc(E.label) + '</p></div><button type="button" class="btn btn-ghost" data-vclose>Sulge</button></div><div class="dlg-b">';
    h += '<dl class="facts">' + (E.closed ? '' : '<div><dt>Hääli</dt><dd>' + nf0.format(c.votes) + (c.votes !== c.v0 ? ' <span class="small muted">(ametlik ' + nf0.format(c.v0) + ')</span>' : '') + '</dd></div><div><dt>Nimekirja häältest</dt><dd>' + pct1(x.votes ? c.votes / x.votes : 0) + '</dd></div><div><dt>Kõigist häältest</dt><dd>' + pct1(r.T ? c.votes / r.T : 0) + '</dd></div>') +
      (L.kind === 'P' ? '<div><dt>Esitatud nimekirjas</dt><dd>' + (c.pos || '–') + '.</dd></div><div><dt>Ümberreastatud nimekirjas</dt><dd>' + rank + '.</dd></div>' : '') + (c.birth ? '<div><dt>Sünniaeg</dt><dd>' + esc(fmtBirth(c.birth)) + '</dd></div>' : '') + '</dl>';
    h += '<div class="cst">' + (el ? '<span class="chip chip-el">' + C.glyph('D', info.color) + 'Valitud</span>' : (sk >= 0 && L.kind === 'P' ? '<span class="chip chip-sub">' + (sk + 1) + '. asendusliige</span>' : '<span class="chip chip-none">ei osutu valituks</span>')) + (!hasOff(E) ? '' : c.el ? '<span class="tag">ametlikult valitud</span>' : '<span class="tag">ametlikult ei osutunud valituks</span>') + '</div>';
    if (el && L.kind === 'P') h += '<div class="chainlist"><h3>Asendusliikmed (EPVS § 73)</h3>' + (r.subs[c.list].length ? '<ol>' + r.subs[c.list].slice(0, 6).map(function (k) { return '<li><button type="button" class="cname" data-ec="' + k + '">' + esc(E.cands[k].name) + '</button></li>'; }).join('') + '</ol>' : '<p class="small muted">Nimekirjas pole rohkem kandidaate — koht täidetakse lisamandaadiga (§ 74).</p>') + '</div>';
    if (E.av && E.av[ci] && E.areas.length) {
      var row = E.av[ci], tot = row.reduce(function (s, v) { return s + v; }, 0), at = epAreaTotals(E);
      var items = row.map(function (v, a) { return { v: v, a: a }; }).filter(function (o) { return o.v > 0; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 25);
      h += '<div><h3>Hääled piirkondade kaupa (ametlik)</h3><div class="scroll-x"><table class="tbl hmini"><thead><tr><th>Piirkond</th><th class="num">Hääli</th><th class="num">% kandidaadi häältest</th><th class="num">% piirkonnast</th></tr></thead><tbody>' + items.map(function (o) {
        var A = E.areas[o.a];
        return '<tr><td>' + esc(A.name) + (A.county ? ' <span class="muted">' + esc(A.county) + '</span>' : '') + '</td><td class="num">' + nf0.format(o.v) + '</td><td class="num">' + pct1(tot ? o.v / tot : 0) + '</td><td class="num">' + pct1(at && at.tot[o.a] ? o.v / at.tot[o.a] : 0) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
    }
    h += '</div><div class="dlg-f"><button type="button" class="btn" data-vhist="' + esc(c.name) + '" data-vhistb="' + (c.birth || '') + '">Kandideerimise ajalugu</button><button type="button" class="btn btn-primary" data-vclose>Valmis</button></div></div>';
    dlg.innerHTML = h;
    openDlg(dlg);
  }
