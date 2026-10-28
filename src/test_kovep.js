// Kontroll: mudeli tulemus ametlike häältega vs ametlik tulemus (KOV ja EP)
// node test_kovep.js <kovep_out kaust> [id ...] [--rules=json] [--show=N]
const X = require('./engine2.js');
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const dir = args[0];
const opts = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v]; }));
const which = args.slice(1).filter(a => !a.startsWith('--'));
const rules = opts.rules ? Object.assign({}, X.KOV_RULES, JSON.parse(opts.rules)) : X.KOV_RULES;
const show = +(opts.show || 12);
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.endsWith('_st.json')).sort()) {
  const id = f.replace('.json', '');
  if (which.length && !which.includes(id)) continue;
  const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const E = X.prep(raw);
  if (E.type === 'ep') {
    const r = X.ep(E);
    let ok = 0, off = 0; const extra = [], miss = [];
    E.cands.forEach((c, i) => { const m = r.el.has(i); if (c.el) off++; if (m && c.el) ok++; else if (m) extra.push(c.name); else if (c.el) miss.push(c.name); });
    const seats = r.lists.filter(x => x.seats).map(x => E.lists[x.l].code || E.lists[x.l].name).join(' ') ;
    console.log(id.padEnd(8), 'EP S=' + r.S, 'valitud', ok + '/' + off, extra.length || miss.length ? 'ERINEB +' + JSON.stringify(extra) + ' -' + JSON.stringify(miss) : 'OK', '|', r.lists.filter(x => x.seats).map(x => (E.lists[x.l].code || E.lists[x.l].name.slice(0, 12)) + ':' + x.seats).join(' '));
    continue;
  }
  let okU = 0, ok = 0, off = 0, typ = 0, tcnt = [0, 0, 0, 0, 0], ocnt = [0, 0, 0, 0, 0];
  const bad = [];
  E.units.forEach(U => {
    const r = X.kovUnit(E, U.i, opts.rules ? rules : X.kovRulesFor(E.year, U));
    const ex = [], mi = [];
    U.cands.forEach(ci => {
      const c = E.cands[ci], m = r.el.get(ci) || 0;
      if (c.el) { off++; ocnt[c.el]++; }
      if (m) tcnt[m]++;
      if (m && c.el) { ok++; if (m === c.el || c.el === 4 || m === 4) typ++; }
      else if (m) ex.push(c.name + ' ' + c.votes + (E.lists[c.list].kind === 'I' ? 'I' : ''));
      else if (c.el) mi.push(c.name + ' ' + c.votes + (E.lists[c.list].kind === 'I' ? 'I' : ''));
    });
    if (!ex.length && !mi.length) okU++;
    else bad.push(U.name + (U.tallinn ? ' [T]' : '') + ' S=' + U.seats + ': mudel+ [' + ex.join(', ') + '] amet+ [' + mi.join(', ') + ']' + (r.warn.length ? ' !' + r.warn.join(';') : ''));
  });
  console.log(id.padEnd(8), 'omavalitsused', okU + '/' + E.units.length, 'valitud', ok + '/' + off, 'liik', typ + '/' + ok, 'mudel liigid', tcnt.slice(1).join('/'), 'amet', ocnt.slice(1).join('/'));
  bad.slice(0, show).forEach(b => console.log('    ', b));
  if (bad.length > show) console.log('     ... veel', bad.length - show);
}
