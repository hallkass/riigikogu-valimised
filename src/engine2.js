/* Kohaliku omavalitsuse volikogu ja Euroopa Parlamendi valimiste arvutus.
   KOV: KOVVS § 56 (üldine), § 56¹ (Tallinn), § 69 (asendusliikmed), § 70 (lisamandaadid).
   EP: EPVS § 61 (mandaadid), § 73 (asendusliikmed), § 74 (lisamandaadid). */
(function (root) {
  'use strict';

  // ---------- andmete ettevalmistus (ühtne vorming v1, vt SCHEMA.md)
  function prep(raw) {
    var E = { raw: raw, id: raw.id, type: raw.type, year: raw.year, date: raw.date || '', name: raw.name || raw.id, notes: raw.notes || '', partial: !!raw.partial };
    E.parties = (raw.parties || []).map(function (p, i) { return { i: i, code: p[0] || '', name: p[1] || p[0] || ('Erakond ' + (i + 1)) }; });
    if (raw.type === 'kov') {
      E.counties = (raw.counties || []).map(function (c) { return { code: c[0], name: c[1] }; });
      E.units = raw.units.map(function (u, i) {
        var ds = (u.districts && u.districts.length ? u.districts : [{ nr: 1, name: u.name, seats: u.seats }]).map(function (d) {
          return { nr: d.nr, name: d.name || ('Ringkond nr ' + d.nr), seats: d.seats, valid0: d.valid || 0, eligible: d.eligible || 0, voted: d.voted || 0 };
        });
        return { i: i, code: u.code || '', name: u.name, county: u.county == null ? -1 : u.county, seats: u.seats, tallinn: !!u.tallinn,
          valid0: u.valid || 0, eligible: u.eligible || 0, voted: u.voted || 0, districts: ds,
          dIdx: new Map(ds.map(function (d, k) { return [d.nr, k]; })), lists: [], cands: [] };
      });
      E.lists = raw.lists.map(function (l, i) { return { i: i, unit: l[0], kind: l[1], party: l[2] == null ? -1 : l[2], name: l[3] || '', code: l[4] || '', cands: [] }; });
      E.cands = raw.cands.map(function (r, i) {
        var L = E.lists[r[0]];
        return { i: i, list: r[0], unit: L.unit, d: r[1], nr: r[2], name: r[3], votes: r[4] || 0, v0: r[4] || 0, pos: r[5] || 0, upos: r[6] || 0,
          el: r[7] || 0, birth: r[8] || 0, fpos: r[9] || 0, rsv: r[10] || 0 };
      });
      E.lists.forEach(function (L) { E.units[L.unit].lists.push(L.i); });
      E.cands.forEach(function (c) { E.lists[c.list].cands.push(c.i); E.units[c.unit].cands.push(c.i); });
    } else {
      E.seats = raw.seats;
      E.closed = !!raw.closed;
      E.lists = raw.lists.map(function (l, i) { return { i: i, kind: l[0], party: l[1] == null ? -1 : l[1], name: l[2] || '', code: l[3] || '', cands: [], lv0: 0, lvotes: 0 }; });
      E.cands = raw.cands.map(function (r, i) {
        return { i: i, list: r[0], nr: r[1], name: r[2], votes: r[3] || 0, v0: r[3] || 0, pos: r[4] || 0, el: r[5] || 0, birth: r[6] || 0 };
      });
      E.cands.forEach(function (c) { E.lists[c.list].cands.push(c.i); });
      E.areas = (raw.areas || []).map(function (a) { return { code: a[0], name: a[1], county: a[2] || '' }; });
      E.av = raw.av || null;
      if (E.closed && raw.lv) raw.lv.forEach(function (row, l) { var s = 0; row.forEach(function (x) { s += x; }); E.lists[l].lv0 = E.lists[l].lvotes = s; });
      if (E.closed && raw.lvotes) raw.lvotes.forEach(function (v, l) { E.lists[l].lv0 = E.lists[l].lvotes = v; });
    }
    return E;
  }

  // a/b > c/d  (kõik mittenegatiivsed täisarvud, b, d > 0)
  function cmpFrac(a, b, c, d) { var x = a * d, y = c * b; return x > y ? 1 : x < y ? -1 : 0; }

  // ---------- KOV
  var KOV_RULES = { thr: 5, gte: true, comp: true };

  function kovUnit(E, u, R) {
    R = R || KOV_RULES;
    var U = E.units[u], C = E.cands, L = E.lists;
    var T = 0, lv = new Map(), lmin = new Map();
    U.lists.forEach(function (l) { lv.set(l, 0); lmin.set(l, Infinity); });
    U.cands.forEach(function (ci) {
      var c = C[ci]; T += c.votes; lv.set(c.list, lv.get(c.list) + c.votes);
      if (c.nr < lmin.get(c.list)) lmin.set(c.list, c.nr);
    });
    function qual(l) { return L[l].kind !== 'I' && T > 0 && (R.thr <= 0 || lv.get(l) * 100 >= R.thr * T); }
    var el = new Map(), warn = [];
    // ringkondade kaupa
    var byD = new Map();
    U.districts.forEach(function (d) { byD.set(d.nr, []); });
    U.cands.forEach(function (ci) { var c = C[ci]; if (!byD.has(c.d)) byD.set(c.d, []); byD.get(c.d).push(ci); });
    function byVotes(laterFirst) {
      return function (a, b) { var x = C[a], y = C[b]; return y.votes - x.votes || (laterFirst ? y.pos - x.pos : x.pos - y.pos) || x.nr - y.nr; };
    }
    var dres = [], subsD = new Map(), order = new Map();
    var tall = U.tallinn && R.comp;
    U.districts.forEach(function (d) {
      var cs = byD.get(d.nr) || [], M = d.seats, Td = 0;
      cs.forEach(function (ci) { Td += C[ci].votes; });
      var D = { nr: d.nr, M: M, T: Td, Q: M > 0 ? Td / M : 0, steps: [], lisa: [], lists: new Map(), unalloc: 0 };
      dres.push(D);
      // nimekirjade andmed ringkonnas
      cs.forEach(function (ci) {
        var c = C[ci], x = D.lists.get(c.list);
        if (!x) { x = { l: c.list, v: 0, n: 0, p: 0, s: 0, cands: [] }; D.lists.set(c.list, x); }
        x.v += c.votes; x.n++; x.cands.push(ci);
      });
      D.lists.forEach(function (x) {
        // ümberreastamine häälte järgi; võrdsuse korral ringkonnanimekirjas tagapool olev ettepoole (§ 56 lg 4)
        x.cands.sort(byVotes(R.tieLater !== false));
        order.set(x.l + '|' + d.nr, x.cands);
      });
      if (Td <= 0 || M <= 0) { D.unalloc = M; return; }
      var onlyInd = cs.every(function (ci) { return L[C[ci].list].kind === 'I'; });
      if (onlyInd && R.r9 !== false) { // § 56 lg 9 (varasemate seaduste järgi jäid kohad täitmata ja korraldati kordushääletamine)
        cs.slice().sort(function (a, b) { return C[b].votes - C[a].votes || C[b].nr - C[a].nr; }).slice(0, M).forEach(function (ci) {
          el.set(ci, C[ci].votes * M >= Td ? 1 : 4);
        });
        D.lists.forEach(function (x) { x.s = x.cands.filter(function (ci) { return el.has(ci); }).length; });
        return;
      }
      // isikumandaadid (§ 56 lg 2); 1993. aastal neid ei olnud (R.quota === false)
      if (R.quota !== false) cs.forEach(function (ci) {
        var c = C[ci];
        if (c.votes > 0 && (R.gte ? c.votes * M >= Td : c.votes * M > Td)) { el.set(ci, 1); D.lists.get(c.list).p++; }
      });
      if (tall) {
        // § 56¹ lg 3: ringkonnamandaadid lihtkvoodi täiskordade järgi
        D.lists.forEach(function (x) {
          if (!qual(x.l)) return;
          var n = Math.floor(x.v * M / Td), extra = Math.min(n, x.n) - x.p;
          if (extra <= 0) return;
          var ord = x.cands.slice().sort(function (a, b) { var p = C[a], q = C[b]; return q.votes - p.votes || (p.upos || 1e6) - (q.upos || 1e6) || p.nr - q.nr; });
          for (var i = 0; i < ord.length && extra > 0; i++) if (!el.has(ord[i])) { el.set(ord[i], 2); x.s++; extra--; }
        });
        return;
      }
      // nimekirjamandaadid d'Hondti meetodil (§ 56 lg 3–7)
      var left = M - countEl(cs), qs = [];
      D.lists.forEach(function (x) {
        if (qual(x.l)) qs.push(x);
        // varasemad seadused: künnise ületanud üksikkandidaat osales võrdlusarvude jaotuses (üks koht)
        else if (R.indThr != null && L[x.l].kind === 'I' && !x.p && x.v * 100 >= R.indThr * (R.indScope === 'd' ? Td : T)) { x.single = true; qs.push(x); }
      });
      var dexp = R.dexp || 1;
      var cmpQ = dexp === 1 ? function (x, y) { return cmpFrac(x.v, x.p + x.s + 1, y.v, y.p + y.s + 1); } : function (x, y) {
        var a = x.v / Math.pow(x.p + x.s + 1, dexp), b = y.v / Math.pow(y.p + y.s + 1, dexp);
        return Math.abs(a - b) < 1e-9 * Math.max(1, a) ? 0 : (a > b ? 1 : -1);
      };
      while (left > 0 && qs.length) {
        var best = null;
        qs.forEach(function (x) {
          if (x.p + x.s >= x.n || (x.single && x.p + x.s >= 1)) return;
          if (!best) { best = x; return; }
          var k = cmpQ(x, best);
          if (k > 0 || (k === 0 && lmin.get(x.l) > lmin.get(best.l))) best = x;
        });
        if (!best) break;
        best.s++; left--;
        D.steps.push({ l: best.l, div: best.p + best.s, v: best.v });
      }
      D.lists.forEach(function (x) {
        var need = x.s;
        for (var i = 0; i < x.cands.length && need > 0; i++) if (!el.has(x.cands[i])) { el.set(x.cands[i], 2); need--; }
      });
      // § 56 lg 10: jaotamata mandaadid enim hääli saanud kandidaatidele
      left = M - countEl(cs);
      if (left > 0 && R.r10 === false) { D.unalloc = left; warn.push('Ringkonnas ' + d.nr + ' jäi ' + left + ' mandaati täitmata (tollase seaduse järgi kordushääletamine).'); }
      else if (left > 0) {
        D.unalloc = left;
        cs.filter(function (ci) { return !el.has(ci); }).sort(function (a, b) { return C[b].votes - C[a].votes || C[b].nr - C[a].nr; }).slice(0, left).forEach(function (ci) {
          el.set(ci, 4); var x = D.lists.get(C[ci].list); if (x) x.r10 = (x.r10 || 0) + 1;
        });
        warn.push('Ringkonnas ' + d.nr + ' jäi ' + left + ' mandaati nimekirjamandaatidena jaotamata (§ 56 lg 10).');
      }
      // lisamandaatide võrdlusarvude tabel (§ 70)
      D.lisa = lisaTable(qs.map(function (x) { return { l: x.l, v: x.v, k0: x.p + x.s, n: x.n, lot: lmin.get(x.l) }; }), M);
    });
    function countEl(cs) { var n = 0; cs.forEach(function (ci) { if (el.has(ci)) n++; }); return n; }

    // Tallinn: kompensatsioonimandaadid (§ 56¹ lg 4–8)
    var comp = null, lisaU = [];
    if (tall) {
      comp = { steps: [], C: 0 };
      var inD = new Map(), nU = new Map();
      U.lists.forEach(function (l) { inD.set(l, 0); nU.set(l, 0); });
      U.cands.forEach(function (ci) { var c = C[ci]; nU.set(c.list, nU.get(c.list) + 1); if (el.has(ci)) inD.set(c.list, inD.get(c.list) + 1); });
      var total = 0; el.forEach(function () { total++; });
      var left = U.seats - total; comp.C = Math.max(0, left);
      var qs = U.lists.filter(qual).map(function (l) { return { l: l, v: lv.get(l), k0: inD.get(l), s: 0, n: nU.get(l) }; });
      while (left > 0 && qs.length) {
        var best = null;
        qs.forEach(function (x) {
          if (x.k0 + x.s >= x.n) return;
          if (!best) { best = x; return; }
          var k = cmpFrac(x.v, x.k0 + x.s + 1, best.v, best.k0 + best.s + 1);
          if (k > 0 || (k === 0 && lmin.get(x.l) > lmin.get(best.l))) best = x;
        });
        if (!best) break;
        best.s++; left--;
        comp.steps.push({ l: best.l, div: best.k0 + best.s, v: best.v });
      }
      qs.forEach(function (x) {
        var need = x.s;
        var ord = L[x.l].cands.slice().sort(function (a, b) { var p = C[a], q = C[b]; return (p.upos || 1e6) - (q.upos || 1e6) || p.nr - q.nr; });
        for (var i = 0; i < ord.length && need > 0; i++) if (!el.has(ord[i])) { el.set(ord[i], 3); need--; }
      });
      if (left > 0) warn.push(left + ' kompensatsioonimandaati jäi jaotamata.');
      lisaU = lisaTable(qs.map(function (x) { return { l: x.l, v: x.v, k0: x.k0 + x.s, n: x.n, lot: lmin.get(x.l) }; }), U.seats);
    }

    // asendusliikmed (§ 69)
    var subsU = new Map();
    U.districts.forEach(function (d) {
      var D = dres.filter(function (x) { return x.nr === d.nr; })[0];
      var onlyInd = (byD.get(d.nr) || []).every(function (ci) { return L[C[ci].list].kind === 'I'; });
      if (onlyInd) {
        var rest = (byD.get(d.nr) || []).filter(function (ci) { return !el.has(ci); }).sort(function (a, b) { return C[b].votes - C[a].votes || C[b].nr - C[a].nr; });
        subsD.set('I|' + d.nr, rest);
        return;
      }
      D.lists.forEach(function (x) {
        if (!qual(x.l)) return;
        subsD.set(x.l + '|' + d.nr, x.cands.filter(function (ci) { return !el.has(ci); }));
      });
    });
    if (tall) {
      U.lists.filter(qual).forEach(function (l) {
        subsU.set(l, L[l].cands.filter(function (ci) { return !el.has(ci); }).sort(function (a, b) { var p = C[a], q = C[b]; return (p.upos || 1e6) - (q.upos || 1e6) || p.nr - q.nr; }));
      });
    }

    // kokkuvõte nimekirjade kaupa
    var lists = new Map();
    U.lists.forEach(function (l) { lists.set(l, { l: l, votes: lv.get(l), share: T > 0 ? lv.get(l) / T : 0, q: qual(l), seats: 0, t: [0, 0, 0, 0, 0] }); });
    el.forEach(function (t, ci) { var x = lists.get(C[ci].list); x.seats++; x.t[t]++; });
    return { u: u, T: T, S: U.seats, thr: R.thr, rules: R, tallinn: tall, lists: lists, dist: dres, el: el, order: order, subsD: subsD, subsU: subsU, comp: comp, lisaU: lisaU, warn: warn, lmin: lmin };
  }

  // järgmised võrdlusarvud suuruse järjekorras; võrdsuse korral rohkem hääli, siis koondnimekirjas tagapool (§ 70 lg 3, EPVS § 74 lg 4)
  function lisaTable(xs, count) {
    var out = [], st = xs.map(function (x) { return { x: x, k: x.k0 }; });
    for (var guard = 0; guard < count; guard++) {
      var best = null;
      st.forEach(function (s) {
        if (s.x.single && s.k >= 1) return;
        if (s.x.n != null && s.k >= s.x.n) return;
        if (!best) { best = s; return; }
        var k = cmpFrac(s.x.v, s.k + 1, best.x.v, best.k + 1);
        if (k > 0 || (k === 0 && (s.x.v > best.x.v || (s.x.v === best.x.v && s.x.lot > best.x.lot)))) best = s;
      });
      if (!best || best.x.v <= 0) break;
      best.k++;
      out.push({ l: best.x.l, div: best.k, v: best.x.v });
    }
    return out;
  }

  // kogu valimiste arvutus omavalitsuste kaupa
  function kovAll(E, rulesFor) {
    return E.units.map(function (U) { return kovUnit(E, U.i, rulesFor ? rulesFor(U) : KOV_RULES); });
  }

  // ---------- EP (EPVS § 61, § 73, § 74)
  function ep(E, R) {
    R = R || {};
    var C = E.cands, L = E.lists, S = R.seats || E.seats;
    var T = 0, lv = [], lmin = [];
    L.forEach(function (Li, l) {
      var v = 0, mn = Infinity;
      Li.cands.forEach(function (ci) { v += C[ci].votes; if (C[ci].nr < mn) mn = C[ci].nr; });
      if (E.closed) v = Li.lvotes;
      lv[l] = v; lmin[l] = mn; T += v;
    });
    var order = L.map(function (Li) {
      return Li.cands.slice().sort(function (a, b) {
        var x = C[a], y = C[b];
        if (E.closed) return x.pos - y.pos || x.nr - y.nr;
        return y.votes - x.votes || x.pos - y.pos || x.nr - y.nr; // võrdsuse korral nimekirjas eespool olev ettepoole (§ 61 lg 2)
      });
    });
    var st = L.map(function (Li, l) { return { l: l, v: lv[l], s: 0, n: Li.cands.length, single: Li.kind === 'I' }; });
    var steps = [], left = S;
    while (left > 0) {
      var best = null;
      st.forEach(function (x) {
        if (x.v <= 0 || x.s >= x.n || (x.single && x.s >= 1)) return;
        if (!best) { best = x; return; }
        var k = cmpFrac(x.v, x.s + 1, best.v, best.s + 1);
        if (k > 0 || (k === 0 && lmin[x.l] > lmin[best.l])) best = x;
      });
      if (!best) break;
      best.s++; left--;
      steps.push({ l: best.l, div: best.s, v: best.v });
    }
    var el = new Map(), subs = [];
    st.forEach(function (x) {
      order[x.l].forEach(function (ci, k) { if (k < x.s) el.set(ci, 1); });
      subs[x.l] = order[x.l].slice(x.s);
    });
    var lisa = lisaTable(st.map(function (x) { return { l: x.l, v: x.v, k0: x.s, n: x.n, single: x.single, lot: lmin[x.l] }; }), S + 3);
    var lists = st.map(function (x) { return { l: x.l, votes: x.v, share: T > 0 ? x.v / T : 0, seats: x.s }; });
    return { T: T, S: S, lists: lists, steps: steps, el: el, order: order, subs: subs, lisa: lisa, unalloc: left, lmin: lmin };
  }

  // Varasemate KOV valimiste reeglid (leitud ametlike tulemuste põhjal):
  // 1993: isikumandaate polnud; kõik kohad jaotati modifitseeritud d'Hondti meetodil (jagajad k^0,9) 5% künnise ületanud
  //       nimekirjade ja üksikkandidaatide vahel;
  //       täitmata kohtade jaoks korraldati kordushääletamine.
  // 1996: isikumandaadid lihtkvoodi järgi, nimekirjamandaadid modifitseeritud d'Hondti meetodil (k^0,9);
  //       ainult üksikkandidaatidega ringkonnas jäid lihtkvoodita kohad täitmata (kordushääletamine, kus valiti enim hääli saanud).
  // 2002: modifitseeritud d'Hondt (k^0,9); võrdse häälte arvu korral jäi ettepoole nimekirjas eespool olev kandidaat.
  var KOV_YEAR = {
    1993: { thr: 5, gte: true, comp: true, quota: false, dexp: 0.9, indThr: 5, r9: false, r10: false },
    1996: { thr: 5, gte: true, comp: true, dexp: 0.9, r9: false, r10: false },
    2002: { thr: 5, gte: true, comp: true, dexp: 0.9, tieLater: false }
  };
  function kovRulesFor(year, U) {
    var R = KOV_YEAR[year];
    if (!R) return KOV_RULES;
    if (U && /kordush/i.test(U.name) && year !== 1993) { var o = {}; for (var k in R) o[k] = R[k]; o.r9 = true; o.r10 = true; return o; }
    return R;
  }
  root.KovEp = { prep: prep, kovUnit: kovUnit, kovAll: kovAll, ep: ep, KOV_RULES: KOV_RULES, KOV_YEAR: KOV_YEAR, kovRulesFor: kovRulesFor, lisaTable: lisaTable };
  if (typeof module !== 'undefined') module.exports = root.KovEp;
})(typeof window !== 'undefined' ? window : globalThis);
