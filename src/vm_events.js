  // ===================================================================
  // Sündmused ja käivitus
  // ===================================================================
  function kovAdjIds(E, scope) {
    var p = scope.split(':'), ids = [];
    if (p[0] === 'kn') {
      E.cands.forEach(function (c, i) { if (gkey(E, c.list) === p[1]) ids.push(i); });
    } else if (p[0] === 'ku') {
      E.lists[+p[2]].cands.forEach(function (ci) { ids.push(ci); });
    } else if (p[0] === 'kd') {
      E.lists[+p[3]].cands.forEach(function (ci) { if (E.cands[ci].d === +p[2]) ids.push(ci); });
    }
    return ids;
  }
  function kovFreezeFor(E, scope) {
    var p = scope.split(':');
    if (p[0] === 'kn') { var rows = kovNat(E).rows; freeze('kn', rows, function (r) { return r.k; }); }
    else if (p[0] === 'ku') {
      var u = +p[1], r = E.res[u], rows2 = Array.from(r.lists.values()).sort(function (a, b) { return b.votes - a.votes; });
      if (!FREEZE.has('ku:' + u)) { var arr = rows2.map(function (x) { return x.l; }); arr.sep = rows2.findIndex(function (x) { return !x.q && E.lists[x.l].kind !== 'I'; }); FREEZE.set('ku:' + u, arr); }
    } else if (p[0] === 'kd') {
      var u2 = +p[1], d = +p[2], U = E.units[u2], D = E.res[u2].dist[U.dIdx.get(d)];
      freeze('kd:' + u2 + ':' + d, Array.from(D.lists.values()).sort(function (a, b) { return b.v - a.v; }), function (x) { return x.l; });
      var x = D.lists.get(+p[3]); if (x) freeze('kd:' + u2 + ':' + d + ':c' + x.l, x.cands, function (ci) { return ci; });
    }
  }
  function kovUnitsOf(E, scope) {
    var p = scope.split(':');
    if (p[0] === 'kn') return null;
    return [+p[1]];
  }
  function onAdj(scope, f, reset) {
    if (scope.indexOf('ep:') === 0) {
      var E = ES.E, l = +scope.slice(3), L = E.lists[l];
      freeze('el', E.res.lists.slice().sort(function (a, b) { return b.votes - a.votes; }), function (x) { return x.l; });
      if (E.closed) L.lvotes = reset ? L.lv0 : Math.max(0, Math.round(L.lvotes * f));
      else if (reset) resetCands(E, L.cands); else scaleCands(E, L.cands, f);
      epRecalc(E); saveVotes(E); rerenderEpKeepFocus();
      return;
    }
    var K = KS.E;
    kovFreezeFor(K, scope);
    var ids = kovAdjIds(K, scope);
    if (reset) resetCands(K, ids); else scaleCands(K, ids, f);
    kovRecalc(K, kovUnitsOf(K, scope)); saveVotes(K); rerenderKovKeepFocus();
  }
  function frzRerender() { if (page === 'kov') rerenderKovKeepFocus(); else if (page === 'ep') rerenderEpKeepFocus(); }

  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-vktab],[data-vkzp],[data-vkunit],[data-vkd],[data-vkl],[data-kc],[data-vkov],[data-vadj],[data-vadjreset],[data-vstep],[data-vsnaps],[data-vsnapsave],[data-vsnapopen],[data-vsnapdl],[data-vsnapdel],[data-vsnapimport],[data-vsnapgo],[data-vclose],[data-vetab],[data-velist],[data-ec],[data-vep],[data-vhf],[data-vhnk],[data-vhpk],[data-vhist],[data-vhunlink],[data-vhlinkadd],[data-vhlinkdel],[data-vhctxall],[data-vhopen],[data-vopen],[data-vnew],[data-vudl],[data-vudel]');
    // järjestuse lukk vabaneb klõpsuga mujal
    if (FREEZE.size) {
      var inside = ev.target.closest('[data-vfrz]'), key = inside && inside.dataset.vfrz;
      var keep = key && Array.from(FREEZE.keys()).some(function (k) { return k === key || k.indexOf(key + ':') === 0; });
      if (!keep && !(t && (t.dataset.vadj || t.dataset.vadjreset))) { unfreezeAll(); if (!t) frzRerender(); }
    }
    if (!t) return;
    var ds = t.dataset;
    if (ds.vclose !== undefined) { var dlg = t.closest('dialog'); if (dlg) dlg.close(); return; }
    if (ds.vstep) { vstep = +ds.vstep; lsSet(STEP_KEY, vstep); frzRerender(); return; }
    if (ds.vadj) { onAdj(ds.vadj, 1 + (+ds.f) * vstep / 100, false); return; }
    if (ds.vadjreset) { onAdj(ds.vadjreset, 1, true); return; }
    // KOV
    if (ds.vktab) { KS.tab = ds.vktab; if (ds.vktab === 'ov' && KS.unit == null) { renderKov(); return; } pushHash(kovHash()); return; }
    if (ds.vkzp !== undefined) { KS.zp = ds.vkzp || null; renderKov(); if (KS.zp) setTimeout(function () { var z = document.querySelector('#kovPanel .zsec'); if (z) z.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 20); return; }
    if (ds.vkunit) { var u = KS.E.unitByCode.get(ds.vkunit); if (u != null) { KS.tab = 'ov'; KS.unit = u; KS.d = null; pushHash(kovHash()); } return; }
    if (ds.vkd) { KS.d = +ds.vkd; pushHash(kovHash()); return; }
    if (ds.vkl) { var L = KS.E.lists[+ds.vkl], U = KS.E.units[L.unit]; var c0 = L.cands.length ? KS.E.cands[L.cands[0]] : null; if (c0 && U.districts.length > 1 && c0.d !== KS.d) { KS.d = c0.d; pushHash(kovHash()); } setTimeout(function () { var el = document.querySelector('#kovDist'); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 30); return; }
    if (ds.kc) { kovCandDlg(+ds.kc); return; }
    if (ds.vkov) {
      var E = KS.E;
      if (ds.vkov === 'reset') { E.cands.forEach(function (c) { c.votes = c.v0; }); }
      else if (ds.vkov === 'zero') { if (!confirm('Nullin kõigi kandidaatide hääled kõigis omavalitsustes?')) return; E.cands.forEach(function (c) { c.votes = 0; }); }
      kovRecalc(E); saveVotesNow(E); renderKov(); return;
    }
    // EP
    if (ds.vetab) { ES.tab = ds.vetab; setHash(epHash()); var pnl = byId('epPanel'); if (pnl) { pnl.innerHTML = epPanelHTML(ES.E); Array.prototype.forEach.call(document.querySelectorAll('[data-vetab]'), function (b) { var on = b.dataset.vetab === ES.tab; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; }); } return; }
    if (ds.velist) { ES.tab = 'kandidaadid'; renderEp(); setHash(epHash()); return; }
    if (ds.ec) { epCandDlg(+ds.ec); return; }
    if (ds.vep) {
      var F = ES.E;
      if (ds.vep === 'reset') { F.cands.forEach(function (c) { c.votes = c.v0; }); F.lists.forEach(function (L2) { L2.lvotes = L2.lv0; }); }
      else if (ds.vep === 'zero') { if (!confirm('Nullin kõik hääled?')) return; F.cands.forEach(function (c) { c.votes = 0; }); F.lists.forEach(function (L2) { L2.lvotes = 0; }); }
      epRecalc(F); saveVotesNow(F); renderEp(); return;
    }
    // vahetulemused
    if (ds.vsnaps) { openSnaps(ds.vsnaps); return; }
    if (ds.vsnapsave !== undefined) { saveSnap(); return; }
    if (ds.vsnapopen) { var s = SNAP.list.filter(function (x) { return x.id === ds.vsnapopen; })[0]; if (s) { snapAdapter(SNAP.kind).set(s.votes, false); var d = byId('vmDlg'); if (d.open) d.close(); } return; }
    if (ds.vsnapdl) { Store.get('sn', ds.vsnapdl).then(function (s2) { if (s2) downloadJSON('vahetulemus-' + s2.name.replace(/[^\wäöüõ-]+/gi, '-') + '.json', s2); }); return; }
    if (ds.vsnapdel) { if (!confirm('Kustutan vahetulemuse?')) return; Store.del('sn', ds.vsnapdel).then(function () { if (byId('snapBody')) refreshSnaps(); else renderManage(); }); return; }
    if (ds.vsnapimport !== undefined) {
      var pr = parseVoteText(byId('snapText').value, SNAP.kind === 'kov' ? 'kov' : 'x'), msg = byId('snapMsg');
      if (!pr.n) { msg.innerHTML = '<span class="err">Ühtegi rida ei õnnestunud lugeda' + (pr.bad ? ' (' + pr.bad + ' vigast rida)' : '') + '.</span>'; return; }
      var ad = snapAdapter(SNAP.kind), cur = ad.get(), known = 0;
      Object.keys(pr.o).forEach(function (k) { if (cur[k] != null) known++; });
      ad.set(pr.o, byId('snapZero').checked);
      SNAP.msg = '<span class="okmsg">Rakendatud ' + known + ' kandidaadi hääled' + (known < pr.n ? '; ' + (pr.n - known) + ' numbrit ei leitud' : '') + (pr.bad ? '; ' + pr.bad + ' vigast rida' : '') + '.</span>';
      msg.innerHTML = SNAP.msg;
      refreshSnaps();
      return;
    }
    if (ds.vsnapgo) { goSnap(ds.vsnapgo); return; }
    // ajalugu
    if (ds.vhf) { HS.f = ds.vhf; hsSave(); renderCand(); return; }
    if (ds.vhnk) { HS.nk = ds.vhnk; HS.pk = null; hsSave(); var hp = byId('hxperson'); if (hp) { hp.innerHTML = hxPersonHTML(); hp.scrollIntoView({ block: 'start' }); } return; }
    if (ds.vhpk) { HS.pk = ds.vhpk; hsSave(); byId('hxperson').innerHTML = hxPersonHTML(); return; }
    if (ds.vhist !== undefined) { openHistory(ds.vhist, ds.vhistb || ''); return; }
    if (ds.vhunlink) { var kk = HS.nk + '|' + (HS.pk || '-'); HSEL[kk] = HSEL[kk] || {}; HSEL[kk][selKey(+ds.vhunlink)] = -1; hsave(); byId('hxperson').innerHTML = hxPersonHTML(); return; }
    if (ds.vhlinkadd || ds.vhlinkdel) { var kl = HS.nk + '|' + HS.pk; HSEL[kl] = HSEL[kl] || {}; var ls = HSEL[kl].links || []; if (ds.vhlinkadd) { if (ls.indexOf(ds.vhlinkadd) < 0) ls.push(ds.vhlinkadd); } else ls = ls.filter(function (x) { return x !== ds.vhlinkdel; }); HSEL[kl].links = ls; hsave(); byId('hxperson').innerHTML = hxPersonHTML(); return; }
    if (ds.vhctxall) { var dts = Array.prototype.slice.call(document.querySelectorAll('#hxperson details.hctx')); var anyClosed = dts.some(function (x) { return !x.open; }); dts.forEach(function (x) { x.open = anyClosed; }); return; }
    if (ds.vhopen) { var pp = ds.vhopen.split('|'); hxOpenInModel(+pp[0], +pp[1]); return; }
    // valimised
    if (ds.vopen) { openElection(ds.vopen); return; }
    if (ds.vnew !== undefined) { createElection(); return; }
    if (ds.vudl) { downloadUser(ds.vudl); return; }
    if (ds.vudel) { deleteUser(ds.vudel); return; }
  });
  document.addEventListener('submit', function (ev) {
    if (ev.target.matches('[data-vhomeq]')) { ev.preventDefault(); var q = byId('homeQ').value.trim(); HS.q = q; HS.nk = null; hsSave(); go('cand'); }
  });
  var kovCalc = debounce(function () { if (!KS.E) return; kovRecalc(KS.E, KS.pend ? Array.from(KS.pend) : null); KS.pend = null; saveVotes(KS.E); rerenderKovKeepFocus(); }, 160);
  var epCalc = debounce(function () { if (!ES.E) return; epRecalc(ES.E); saveVotes(ES.E); rerenderEpKeepFocus(); }, 160);
  document.addEventListener('input', function (ev) {
    var t = ev.target, v;
    if (t.matches('input[data-kv]')) {
      var c = KS.E.cands[+t.dataset.kv]; v = parseInt(String(t.value).replace(/\s/g, ''), 10);
      c.votes = isFinite(v) && v > 0 ? v : 0;
      var U = KS.E.units[c.unit], D = KS.E.res[c.unit].dist[U.dIdx.get(c.d)], x = D.lists.get(c.list);
      var fk = 'kd:' + c.unit + ':' + c.d;
      freeze(fk, Array.from(D.lists.values()).sort(function (a, b) { return b.v - a.v; }), function (y) { return y.l; });
      if (x) freeze(fk + ':c' + c.list, x.cands, function (ci) { return ci; });
      freeze('ku:' + c.unit, Array.from(KS.E.res[c.unit].lists.values()).sort(function (a, b) { return b.votes - a.votes; }), function (y) { return y.l; });
      KS.pend = KS.pend || new Set(); KS.pend.add(c.unit);
      kovCalc();
    } else if (t.matches('input[data-ev]')) {
      var e = ES.E.cands[+t.dataset.ev]; v = parseInt(String(t.value).replace(/\s/g, ''), 10);
      e.votes = isFinite(v) && v > 0 ? v : 0;
      freeze('ec:' + e.list, ES.E.res.order[e.list], function (ci) { return ci; });
      freeze('el', ES.E.res.lists.slice().sort(function (a, b) { return b.votes - a.votes; }), function (y) { return y.l; });
      epCalc();
    } else if (t.matches('input[data-elv]')) {
      var L = ES.E.lists[+t.dataset.elv]; v = parseInt(String(t.value).replace(/\s/g, ''), 10);
      L.lvotes = isFinite(v) && v > 0 ? v : 0;
      freeze('el', ES.E.res.lists.slice().sort(function (a, b) { return b.votes - a.votes; }), function (y) { return y.l; });
      epCalc();
    } else if (t.id === 'kovQ') { KS.q = t.value; var box = byId('kovUnitsBox'); if (box) box.innerHTML = kovUnitsRowsHTML(KS.E, C.norm(KS.q), KS.county); }
    else if (t.id === 'hxq') hxSearch(t.value);
  });
  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.matches('[data-vsel]')) { pushHash(SLUG[t.dataset.vsel] + '/' + t.value); return; }
    if (t.id === 'kovUnitSel') { if (t.value) { var u = KS.E.unitByCode.get(t.value); KS.tab = 'ov'; KS.unit = u; KS.d = null; pushHash(kovHash()); } return; }
    if (t.id === 'kovCounty') { KS.county = t.value; var box = byId('kovUnitsBox'); if (box) box.innerHTML = kovUnitsRowsHTML(KS.E, C.norm(KS.q), KS.county); return; }
    if (t.matches('select[data-vhsel]')) { var k2 = HS.nk + '|' + (HS.pk || '-'); HSEL[k2] = HSEL[k2] || {}; HSEL[k2][selKey(+t.dataset.vhsel)] = +t.value; hsave(); byId('hxperson').innerHTML = hxPersonHTML(); return; }
    if (t.matches('input[data-kv]')) { var c = KS.E.cands[+t.dataset.kv]; if (c && String(c.votes) !== t.value) t.value = c.votes; return; }
    if (t.matches('input[data-ev]')) { var e = ES.E.cands[+t.dataset.ev]; if (e && String(e.votes) !== t.value) t.value = e.votes; return; }
    if (t.id === 'nmType') { NM.type = t.value; NM.base = ''; NM.file = null; var f = document.querySelector('.mform'); if (f) renderManage(); return; }
    if (t.id === 'nmBase') { NM.base = t.value; NM.file = null; renderManage(); return; }
    if (t.matches('input[name="nmVotes"]')) { NM.votes = t.value; return; }
    if (t.id === 'nmFile' && t.files && t.files[0]) {
      var rd = new FileReader();
      rd.onload = function () { try { NM.file = JSON.parse(String(rd.result || '')); byId('nmMsg').innerHTML = '<span class="muted">Fail loetud. Vajuta „Loo valimised“.</span>'; } catch (e) { NM.file = null; byId('nmMsg').innerHTML = '<span class="err">Fail ei ole korrektne JSON.</span>'; } };
      rd.readAsText(t.files[0]);
      return;
    }
    if (t.id === 'snapFile' && t.files && t.files[0]) {
      var rd2 = new FileReader();
      rd2.onload = function () {
        var msg = byId('snapMsg');
        try {
          var o = JSON.parse(String(rd2.result || '')), votes = o && o.votes ? o.votes : o;
          if (!votes || typeof votes !== 'object') throw new Error('vorming');
          if (o.votes && o.eid && o.time) { o.id = 'sn' + Date.now().toString(36); o.eid = SNAP.eid; Store.put('sn', o).then(refreshSnaps); }
          snapAdapter(SNAP.kind).set(votes, false);
          if (msg) msg.innerHTML = '<span class="okmsg">Hääled loetud failist.</span>';
        } catch (e) { if (msg) msg.innerHTML = '<span class="err">Faili ei õnnestunud lugeda.</span>'; }
      };
      rd2.readAsText(t.files[0]);
    }
  });
  // järjestuse lukk vabaneb, kui hiir või fookus lahkub tabelist
  document.addEventListener('mouseleave', function (ev) {
    var t = ev.target;
    if (!t || !t.dataset || !t.dataset.vfrz || !FREEZE.size) return;
    if (t.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
    var key = t.dataset.vfrz, hit = false;
    Array.from(FREEZE.keys()).forEach(function (k) { if (k === key || k.indexOf(key + ':') === 0) { FREEZE.delete(k); hit = true; } });
    if (hit) frzRerender();
  }, true);
  document.addEventListener('focusout', function (ev) {
    var nt = ev.relatedTarget, t = ev.target;
    if (!FREEZE.size || !t.closest) return;
    var box = t.closest('[data-vfrz]');
    if (!box || (nt && box.contains(nt))) return;
    if (t.matches('input[data-kv],input[data-ev],input[data-elv]')) {
      var key = box.dataset.vfrz, hit = false;
      Array.from(FREEZE.keys()).forEach(function (k) { if (k === key || k.indexOf(key + ':') === 0 || k.indexOf('ku:') === 0 || k === 'el') { FREEZE.delete(k); hit = true; } });
      if (hit) setTimeout(frzRerender, 0);
    }
  });
  document.addEventListener('toggle', function (ev) {
    var dt = ev.target;
    if (!dt.matches || !dt.matches('details.hctx[data-vhctx]')) return;
    var p = dt.dataset.vhctx.split('|'), s = +p[0], i = +p[1], m = hxMetrics({ s: s, i: i }), ck = s + '|' + m.ctx;
    if (dt.open) { HCTX.add(ck); if (!dt.querySelector('.hctxgrid')) dt.insertAdjacentHTML('beforeend', hxCtxHTML(s, i)); }
    else HCTX.delete(ck);
  }, true);
  document.addEventListener('keydown', function (ev) {
    var t = ev.target;
    if (t.matches && (t.matches('[data-vktab]') || t.matches('[data-vetab]')) && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) {
      var kov = t.matches('[data-vktab]'), tabs = kov ? KOV_TABS : EP_TABS, cur = kov ? KS.tab : ES.tab;
      var i = tabs.map(function (x) { return x[0]; }).indexOf(cur) + (ev.key === 'ArrowRight' ? 1 : -1);
      i = (i + tabs.length) % tabs.length;
      var nb = document.querySelector((kov ? '[data-vktab="' : '[data-vetab="') + tabs[i][0] + '"]');
      if (nb) { nb.click(); setTimeout(function () { var b = document.querySelector((kov ? '[data-vktab="' : '[data-vetab="') + tabs[i][0] + '"]'); if (b) b.focus(); }, 30); }
      ev.preventDefault();
    }
  });
  var vmDlg = byId('vmDlg');
  vmDlg.addEventListener('click', function (ev) { if (ev.target === vmDlg) vmDlg.close(); });

  window.VM = {
    page: function () { return page; },
    setHash: setHash,
    go: go,
    openHistory: openHistory,
    openSnaps: openSnaps,
    userList: function (type) { return USER.filter(function (u) { return u.type === type; }); },
    loadUser: function (id) { return Store.get('el', id); }
  };
  window.addEventListener('hashchange', function () { if (started) { var prev = page; onRoute(); if (prev === page) { /* sama leht: ära keri */ } } });
  document.addEventListener('DOMContentLoaded', function () {
    userReady.then(function () {
      started = true;
      var a = rkApp(); if (a) a.refreshYearSel();
      onRoute();
    });
  });
