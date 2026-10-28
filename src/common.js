/* Ühised abifunktsioonid kõigile valimiste lehtedele */
(function (root) {
  'use strict';
  function NF(d) { return new Intl.NumberFormat('et-EE', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function hkey(name) { return norm(name).replace(/[-‐–]/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim(); }

  // erakondade värvid ja lühinimed (ka varasemate valimiste nimekujud)
  var HPARTY = [
    [/isamaa ja res publica/, 'IRL', '#009de0'], [/res publica/, 'Res Publica', '#4a5aa8'],
    [/reformierakond/, 'Reform', '#ffdc00'], [/keskerakond/, 'Kesk', '#007d5a'],
    [/konservatiivne rahvaerakond/, 'EKRE', '#996600'], [/eesti 200/, 'E200', '#31758a'],
    [/sotsiaaldemokraat/, 'SDE', '#e10600'], [/moodukad/, 'Mõõdukad', '#e8504f'],
    [/isamaa/, 'Isamaa', '#009de0'], [/rahvaliit/, 'Rahvaliit', '#7c9a2e'], [/maarahva/, 'Maarahvaerakond', '#7c9a2e'],
    [/koonderakond/, 'Koonderakond', '#b5651d'], [/rohelised/, 'Rohelised', '#8db751'], [/vabaerakond/, 'Vabaerakond', '#4f7f73'],
    [/parempoolsed/, 'Parempoolsed', '#fa6100'], [/vasak/, 'Vasakpartei', '#ff7c80'],
    [/vene|meie kodu on eestimaa|uhendatud rahvapartei|venelaste/, '', '#8e6bbf'], [/kristlik/, 'Kristlikud', '#a0522d'],
    [/iseseisvuspartei/, 'Iseseisvuspartei', '#5b6573'], [/soltumatuse/, 'ERSP', '#2f5597'], [/kindel kodu/, 'Kindel Kodu', '#b08d57'],
    [/rahvarinne/, 'Rahvarinne', '#4caf50'], [/kuningriiklased|rojalist/, 'Rojalistid', '#c9a0dc'], [/eesti kodanik/, 'Eesti Kodanik', '#7f6000'],
    [/tulevikueesti|arengupartei/, 'Arengupartei', '#d4a017'], [/koos organisatsioon|^koos$/, 'KOOS', '#5c4d7d'],
    [/rahvuslased ja konservatiivid/, 'ERK', '#7a5230'], [/elurikkuse/, 'Elurikkus', '#3f8f5f']
  ];
  var HFALLBACK = ['#6b8fb3', '#b36b8f', '#8fb36b', '#b3956b', '#6bb3a6', '#9a6bb3', '#b3b36b', '#6b6bb3'];
  var ALLIANCE = ['#5f8fa8', '#a8795f', '#7f9f5a', '#9a6f9f', '#5fa89a', '#a89a5f', '#6f7fae', '#ae6f7f', '#4f9a6f', '#9a8a6f'];
  function hash(s) { var h = 0; s = String(s || ''); for (var k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) >>> 0; return h; }
  function hparty(code, name) {
    var n = norm(name || code || '');
    for (var i = 0; i < HPARTY.length; i++) if (HPARTY[i][0].test(n)) return { short: HPARTY[i][1] || (code && code.length <= 6 ? code : String(name).split(' ')[0]), color: HPARTY[i][2] };
    return { short: code && code.length <= 8 ? code : String(name).split(' ').slice(0, 2).join(' '), color: HFALLBACK[hash(name) % HFALLBACK.length] };
  }
  function allianceColor(name) { return ALLIANCE[hash(name) % ALLIANCE.length]; }
  var IND_COLOR = '#8a94a3';

  // loetav tekstivärv taustal (WCAG kontrasti järgi)
  function textOn(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(function (x) { return x + x; }).join('');
    h = h.slice(0, 6);
    var ch = [0, 2, 4].map(function (i) { var v = parseInt(h.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    var L = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    return 1.05 / (L + 0.05) >= (L + 0.05) / 0.0583 ? '#ffffff' : '#10161e';
  }

  // poolringi istekohtade paigutus
  var hemiMemo = new Map();
  function hemiLayout(S) {
    if (hemiMemo.has(S)) return hemiMemo.get(S);
    if (S <= 0) return { seats: [], rs: 0.05 };
    var rows = S < 12 ? (S <= 4 ? 1 : 2) : Math.max(2, Math.round(Math.sqrt(S) * 0.6)), r0 = S < 12 ? 0.62 : 0.42, r1 = 1;
    var radii = [];
    for (var i = 0; i < rows; i++) radii.push(rows === 1 ? 0.75 : r0 + (r1 - r0) * i / (rows - 1));
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
    var gap = rows > 1 ? (r1 - r0) / (rows - 1) : 0.5, minArc = Infinity;
    radii.forEach(function (r, i) { if (counts[i] > 1) minArc = Math.min(minArc, Math.PI * r / (counts[i] - 1)); });
    var out = { seats: seats, rs: Math.min(0.095, 0.43 * Math.min(gap, minArc)) };
    hemiMemo.set(S, out);
    return out;
  }
  // members: [{ color, kind: 'P'|'D'|'C'|'X', title, attrs }] istekohtade järjekorras; S = kohtade arv
  function hemiSVG(members, S, opts) {
    opts = opts || {};
    var L = hemiLayout(S), rs = L.rs, out = [];
    L.seats.forEach(function (s, i) {
      var m = members[i], x = s.x.toFixed(4), y = s.y.toFixed(4);
      if (!m) { out.push('<circle cx="' + x + '" cy="' + y + '" r="' + (rs * 0.8).toFixed(4) + '" style="fill:none;stroke:var(--rule-2);stroke-width:' + (rs * 0.2).toFixed(4) + ';stroke-dasharray:' + (rs * 0.35).toFixed(4) + '"><title>Jaotamata mandaat</title></circle>'); return; }
      var col = m.color, st;
      if (m.kind === 'P') st = 'fill:' + col + ';stroke:var(--ink);stroke-width:' + (rs * 0.36).toFixed(4);
      else if (m.kind === 'C') st = 'fill:var(--surface);stroke:' + col + ';stroke-width:' + (rs * 0.46).toFixed(4);
      else st = 'fill:' + col + ';stroke:var(--seat-edge);stroke-width:' + (rs * 0.12).toFixed(4);
      var r = m.kind === 'P' || m.kind === 'C' ? rs * 0.82 : rs;
      out.push('<circle class="seat"' + (m.attrs || '') + ' cx="' + x + '" cy="' + y + '" r="' + r.toFixed(4) + '" style="' + st + '"><title>' + esc(m.title || '') + '</title></circle>');
    });
    if (opts.center !== false) {
      out.push('<text class="hemi-n" x="0" y="-0.13">' + (opts.n != null ? opts.n : members.length) + '</text>');
      out.push('<text class="hemi-l" x="0" y="-0.02">' + esc(opts.label || ('liiget · enamus ' + (Math.floor(S / 2) + 1))) + '</text>');
    }
    return out.join('');
  }
  function glyph(t, color) {
    if (t === 'P') return '<svg class="g" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.3" style="fill:' + color + ';stroke:var(--ink);stroke-width:1.7"/></svg>';
    if (t === 'C') return '<svg class="g" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.2" style="fill:var(--surface);stroke:' + color + ';stroke-width:2.2"/></svg>';
    return '<svg class="g" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5" style="fill:' + color + ';stroke:var(--seat-edge);stroke-width:.8"/></svg>';
  }

  root.VMC = { NF: NF, esc: esc, norm: norm, hkey: hkey, hparty: hparty, allianceColor: allianceColor, IND_COLOR: IND_COLOR,
    textOn: textOn, hemiLayout: hemiLayout, hemiSVG: hemiSVG, glyph: glyph, hash: hash };
})(window);
