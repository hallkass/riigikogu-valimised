/* Riigikogu valimistulemuse arvutus — RKVS § 62, § 75, § 76; RKLS § 12 */
(function (root) {
  'use strict';

  var EXP = 0.9; // modifitseeritud d'Hondt: jagajad 1, 2^0,9, 3^0,9, ...

  function divisor(k) { return Math.pow(k, EXP); }

  // Kandidaatide võrdlemine "häälte protsent lihtkvoodist" järgi (täpne, ristkorrutisega)
  // tagastab <0 kui a-l on suurem protsent
  function cmpRatioDesc(a, b) {
    var x = b.votes * b.M * a.T, y = a.votes * a.M * b.T;
    return x - y;
  }

  // rules: { bonus75, min10, comp5 } — vaikimisi kehtiv RKVS (2002+). 1992–1999 seaduses need puudusid.
  function compute(model, rules) {
    var R = { bonus75: true, min10: true, comp5: true };
    if (rules) Object.keys(R).forEach(function (k) { if (rules[k] === false) R[k] = false; });
    var S = 0;
    var dist = new Map();
    model.districts.forEach(function (d) {
      dist.set(d.nr, { nr: d.nr, name: d.name, M: d.mandates, T: 0, cands: [], party: new Map() });
      S += d.mandates;
    });
    var parties = model.parties.slice();
    var partyById = new Map(parties.map(function (p) { return [p.id, p]; }));

    // Sisemised kandidaadikirjed
    var cands = model.candidates.map(function (c) {
      return {
        nr: c.nr, name: c.name, district: c.district, party: c.party || 0,
        natPos: c.natPos || 0, distPos: c.distPos || 0,
        votes: Math.max(0, Math.floor(+c.votes || 0)), out: !!c.out,
        M: 0, T: 0, elected: null, compFigure: null, compK: null,
        distSubRank: null, natSubRank: null
      };
    });
    var byNr = new Map(cands.map(function (c) { return [c.nr, c]; }));

    // § 62 lg 9: välja langenud üksikkandidaadi hääli ei arvestata; erakonna kandidaadi hääled jäävad erakonnale
    cands.forEach(function (c) {
      var ds = dist.get(c.district);
      if (!ds) return;
      c.counted = !(c.out && !c.party);
      if (c.counted) ds.T += c.votes;
      ds.cands.push(c);
    });
    var N = 0;
    dist.forEach(function (ds) {
      N += ds.T;
      ds.cands.forEach(function (c) { c.M = ds.M; c.T = ds.T; });
    });

    // Erakondade häälte summad
    var pv = new Map();
    parties.forEach(function (p) { pv.set(p.id, 0); });
    var indVotes = 0;
    cands.forEach(function (c) {
      if (!c.counted) return;
      if (c.party) pv.set(c.party, (pv.get(c.party) || 0) + c.votes); else indVotes += c.votes;
    });
    // 5% künnis (§ 62 lg 3, lg 4): 20·V ≥ N
    var qualifies = new Map();
    parties.forEach(function (p) { qualifies.set(p.id, N > 0 && 20 * pv.get(p.id) >= N); });

    function ge(c, pctTimes) { // votes ≥ Q / pctTimes  ⇔  pctTimes·votes·M ≥ T
      return c.T > 0 && c.votes > 0 && pctTimes * c.votes * c.M >= c.T;
    }

    // 1. Isikumandaadid (§ 62 lg 2)
    cands.forEach(function (c) {
      if (!c.out && c.counted && ge(c, 1)) c.elected = 'P';
    });

    // 2. Ringkonnamandaadid (§ 62 lg 3)
    var districtRows = [];
    dist.forEach(function (ds) {
      var byParty = new Map();
      ds.cands.forEach(function (c) {
        if (!c.party) return;
        if (!byParty.has(c.party)) byParty.set(c.party, []);
        byParty.get(c.party).push(c);
      });
      var row = { nr: ds.nr, name: ds.name, M: ds.M, T: ds.T, parties: [], independents: [] };
      byParty.forEach(function (list, pid) {
        var V = 0;
        list.forEach(function (c) { V += c.votes; });
        // § 62 lg 3: järjestus häälte järgi, võrdsuse korral üleriigilises nimekirjas eespool olev
        var ranked = list.slice().sort(function (a, b) { return (b.votes - a.votes) || (a.natPos - b.natPos) || (a.nr - b.nr); });
        var entry = { party: pid, votes: V, quotas: ds.T > 0 ? V * ds.M / ds.T : 0, qualifies: qualifies.get(pid), whole: 0, bonus: false, won: 0, filled: 0, personal: 0, ranked: ranked.map(function (c) { return c.nr; }) };
        list.forEach(function (c) { if (c.elected === 'P') entry.personal++; });
        if (qualifies.get(pid) && ds.T > 0) {
          var whole = Math.floor(V * ds.M / ds.T);
          var rem = V * ds.M - whole * ds.T; // jääk ühikutes 1/M häält
          var n = whole;
          if (R.bonus75 && 4 * rem >= 3 * ds.T) { n++; entry.bonus = true; } // jääk ≥ 75% lihtkvoodist
          entry.whole = whole; entry.won = n;
          var seats = 0;
          for (var i = 0; i < ranked.length && seats < n; i++) {
            var c = ranked[i];
            if (c.elected === 'P') { seats++; continue; }
            if (c.out) continue;
            if (R.min10 ? ge(c, 10) : c.votes > 0) { c.elected = 'D'; seats++; } // vähemalt 10% lihtkvoodist
            else break; // edasi on kõigil veel vähem hääli
          }
          entry.filled = seats;
        } else {
          entry.filled = entry.personal; // alla künnise: ainult isikumandaadid
        }
        row.parties.push(entry);
      });
      row.parties.sort(function (a, b) { return b.votes - a.votes; });
      ds.cands.forEach(function (c) { if (!c.party) row.independents.push(c.nr); });
      districtRows.push(row);
    });
    districtRows.sort(function (a, b) { return a.nr - b.nr; });

    // Erakonna ringkondades saadud mandaadid
    var seatsD = new Map(), seatsP = new Map(), seatsC = new Map();
    parties.forEach(function (p) { seatsD.set(p.id, 0); seatsP.set(p.id, 0); seatsC.set(p.id, 0); });
    var indElected = 0, electedInDistricts = 0;
    cands.forEach(function (c) {
      if (c.elected === 'P' || c.elected === 'D') {
        electedInDistricts++;
        if (c.party) {
          if (c.elected === 'P') seatsP.set(c.party, seatsP.get(c.party) + 1);
          else seatsD.set(c.party, seatsD.get(c.party) + 1);
        } else indElected++;
      }
    });

    // 3. Kompensatsioonimandaadid (§ 62 lg 4–8)
    var pool = S - electedInDistricts;
    // Erakonna üleriigiline järjekord: ≥5% lihtkvoodist nimekirja järjekorras, seejärel ülejäänud häälteprotsendi järgi
    function nationalOrder(pid) {
      var a = [], b = [];
      cands.forEach(function (c) {
        if (c.party !== pid || c.elected || c.out) return;
        if (!R.comp5 || ge(c, 20)) a.push(c); else b.push(c);
      });
      a.sort(function (x, y) { return (x.natPos - y.natPos) || (x.nr - y.nr); });
      b.sort(function (x, y) { return cmpRatioDesc(x, y) || (x.natPos - y.natPos) || (x.nr - y.nr); });
      return { list: a.concat(b), nA: a.length };
    }
    var qParties = parties.filter(function (p) { return qualifies.get(p.id); });
    var order = new Map(), kUsed = new Map(), dCount = new Map();
    qParties.forEach(function (p) {
      order.set(p.id, nationalOrder(p.id));
      kUsed.set(p.id, 0);
      dCount.set(p.id, seatsP.get(p.id) + seatsD.get(p.id));
    });
    var compList = [];
    var unallocated = 0;
    for (var s = 0; s < pool; s++) {
      var best = null, bestVal = -1;
      qParties.forEach(function (p) {
        var o = order.get(p.id);
        if (kUsed.get(p.id) >= o.list.length) return; // § 62 lg 8
        var val = pv.get(p.id) / divisor(dCount.get(p.id) + kUsed.get(p.id) + 1);
        // võrdsuse korral koondnimekirjas tagapool olev erakond
        if (val > bestVal || (val === bestVal && best && p.lot > best.lot)) { best = p; bestVal = val; }
      });
      if (!best || bestVal <= 0) { unallocated = pool - s; break; }
      var k = kUsed.get(best.id);
      var o = order.get(best.id);
      var cand = o.list[k];
      cand.elected = 'C';
      cand.compFigure = bestVal;
      cand.compK = dCount.get(best.id) + k + 1;
      cand.compBelow5 = k >= o.nA; // § 62 lg 7 rakendus
      kUsed.set(best.id, k + 1);
      seatsC.set(best.id, k + 1);
      compList.push({ nr: cand.nr, party: best.id, figure: bestVal, k: cand.compK });
    }

    // Võrdlusarvude tabel kuvamiseks
    var figures = [];
    qParties.forEach(function (p) {
      var d = dCount.get(p.id), c = seatsC.get(p.id);
      var upto = Math.max(d + c + 3, 3);
      for (var k = 1; k <= upto; k++) {
        figures.push({ party: p.id, k: k, divisor: divisor(k), value: pv.get(p.id) / divisor(k), state: k <= d ? 'district' : (k <= d + c ? 'comp' : 'next') });
      }
    });

    // 4. Asendusliikmed (§ 75)
    var subs = { district: new Map(), national: new Map() };
    qParties.forEach(function (p) {
      var dm = new Map();
      dist.forEach(function (ds) {
        // ringkonna asendusliikmed registreeritakse ainult seal, kus erakonnal on ringkonnas valituks osutunud liikmeid
        var hasElected = ds.cands.some(function (c) { return c.party === p.id && (c.elected === 'P' || c.elected === 'D'); });
        var l = !hasElected ? [] : ds.cands.filter(function (c) { return c.party === p.id && !c.elected && !c.out && ge(c, 10); });
        // häälte arvu järgi, võrdsuse korral ringkonnanimekirjas eespool olev
        l.sort(function (a, b) { return (b.votes - a.votes) || (a.distPos - b.distPos) || (a.nr - b.nr); });
        l.forEach(function (c, i) { c.distSubRank = i + 1; });
        dm.set(ds.nr, l.map(function (c) { return c.nr; }));
      });
      subs.district.set(p.id, dm);
      var nat = nationalOrder(p.id); // kõik valimata jäänud: ≥5% nimekirja järjekorras, siis häälteprotsendi järgi
      nat.list.forEach(function (c, i) { c.natSubRank = i + 1; });
      subs.national.set(p.id, nat.list.map(function (c) { return c.nr; }));
    });

    // 5. Lisamandaatide võrdlusarvude tabel (§ 76)
    var lisa = [];
    qParties.forEach(function (p) {
      var total = seatsP.get(p.id) + seatsD.get(p.id) + seatsC.get(p.id);
      var nsub = subs.national.get(p.id).length;
      for (var j = 1; j <= nsub; j++) {
        lisa.push({ party: p.id, j: j, k: total + j, value: pv.get(p.id) / divisor(total + j), sub: subs.national.get(p.id)[j - 1] });
      }
    });
    lisa.sort(function (a, b) {
      if (b.value !== a.value) return b.value - a.value;
      var va = pv.get(a.party), vb = pv.get(b.party);
      if (va !== vb) return vb - va;
      return partyById.get(b.party).lot - partyById.get(a.party).lot;
    });
    lisa.forEach(function (x, i) { x.rank = i + 1; });

    // Valitud liikmete nimekiri
    var elected = cands.filter(function (c) { return c.elected; });
    var typeRank = { P: 0, D: 1, C: 2 };
    elected.sort(function (a, b) {
      if (a.elected !== b.elected) return typeRank[a.elected] - typeRank[b.elected];
      if (a.elected === 'C') return b.compFigure - a.compFigure;
      return cmpRatioDesc(a, b) || (a.nr - b.nr);
    });
    elected.forEach(function (c, i) { c.orderNr = i + 1; });

    var partySummary = parties.map(function (p) {
      return {
        id: p.id, votes: pv.get(p.id), share: N > 0 ? pv.get(p.id) / N : 0, qualifies: qualifies.get(p.id),
        personal: seatsP.get(p.id), district: seatsD.get(p.id), comp: seatsC.get(p.id),
        total: seatsP.get(p.id) + seatsD.get(p.id) + seatsC.get(p.id)
      };
    });

    return {
      S: S, N: N, indVotes: indVotes, indElected: indElected, rules: R,
      thresholdVotes: N / 20,
      pool: pool, unallocated: unallocated,
      districts: districtRows, parties: partySummary, partyVotes: pv, qualifies: qualifies,
      cands: cands, byNr: byNr, elected: elected, compList: compList, figures: figures,
      subs: subs, lisa: lisa
    };
  }

  // Asendusliikmete järjekord konkreetse liikme jaoks (RKLS § 12)
  function substituteChain(res, nr) {
    var c = res.byNr.get(nr);
    if (!c || !c.elected) return { district: [], national: [], lisa: true };
    if (!c.party || !res.qualifies.get(c.party)) return { district: [], national: [], lisa: true };
    var nat = res.subs.national.get(c.party) || [];
    if (c.elected === 'C') return { district: [], national: nat.slice(), lisa: true };
    var dl = (res.subs.district.get(c.party).get(c.district)) || [];
    var inD = new Set(dl);
    return { district: dl.slice(), national: nat.filter(function (x) { return !inD.has(x); }), lisa: true };
  }

  // Volituste peatumise/lõppemise simulatsioon (RKLS § 11–12). leaves = kandidaatide numbrid lahkumise järjekorras.
  function simulate(res, leaves) {
    var seats = res.elected.map(function (c) {
      return { orig: c.nr, holder: c.nr, kind: c.elected, party: c.party, district: c.district, history: [{ nr: c.nr, via: 'valitud' }] };
    });
    var seated = new Map();
    seats.forEach(function (s) { seated.set(s.holder, s); });
    var gone = new Set();
    var lisaUsed = 0;
    var log = [];

    function available(nr) { return !gone.has(nr) && !seated.has(nr); }

    function pickLisa() {
      while (lisaUsed < res.lisa.length) {
        var f = res.lisa[lisaUsed++];
        var nat = res.subs.national.get(f.party) || [];
        for (var i = 0; i < nat.length; i++) if (available(nat[i])) return { nr: nat[i], via: 'lisamandaat', figure: f };
      }
      return null;
    }

    function fill(seat) {
      var q = seat.party && res.qualifies.get(seat.party);
      if (q) {
        if (seat.kind !== 'C') {
          var dl = res.subs.district.get(seat.party).get(seat.district) || [];
          for (var i = 0; i < dl.length; i++) if (available(dl[i])) return { nr: dl[i], via: 'ringkond', rank: i + 1 };
        }
        var nat = res.subs.national.get(seat.party) || [];
        for (var j = 0; j < nat.length; j++) if (available(nat[j])) return { nr: nat[j], via: 'üleriigiline', rank: j + 1 };
      }
      return pickLisa();
    }

    leaves.forEach(function (nr) {
      if (gone.has(nr)) return;
      var seat = seated.get(nr);
      gone.add(nr);
      if (!seat) { log.push({ nr: nr, type: 'loobus' }); return; }
      seated.delete(nr);
      var r = fill(seat);
      if (r) {
        seat.holder = r.nr;
        seat.history.push(r);
        seated.set(r.nr, seat);
        log.push({ nr: nr, type: 'lahkus', by: r });
      } else {
        seat.holder = null;
        seat.history.push({ nr: null, via: 'täitmata' });
        log.push({ nr: nr, type: 'lahkus', by: null });
      }
    });
    return { seats: seats, log: log, gone: gone };
  }

  var api = { compute: compute, substituteChain: substituteChain, simulate: simulate, divisor: divisor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RKEngine = api;
})(this);
