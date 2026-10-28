"""Koostab valimiste mudeli: index.html (rakendus + Riigikogu andmed) ja data/*.json (KOV ja EP valimised).
Kasutus: python src/build.py <väljundkaust> <KOV/EP andmete kaust> [--artifact]
Repos: python src/build.py . data
Väljundkausta tekivad index.html ja data/ (ning --artifact korral ka riigikogu-valimised.html ilma lehe raamita)."""
import os, sys, json, glob
here = os.path.dirname(os.path.abspath(__file__))
args = [x for x in sys.argv[1:] if not x.startswith('--')]
out = args[0]
src_dir = args[1] if len(args) > 1 else os.path.join(here, '..', 'kovep_out')
only = set(args[2].split(',')) if len(args) > 2 and args[2] else None
want_artifact = '--artifact' in sys.argv

def rd(name):
    with open(os.path.join(here, name), encoding='utf-8') as f:
        return f.read()

def js_safe(s, name):
    assert '</script' not in s.lower(), name
    return s

# ---------- KOV ja EP andmefailid + manifest
os.makedirs(os.path.join(out, 'data'), exist_ok=True)
mani = []
for path in sorted(glob.glob(os.path.join(src_dir, '*.json'))):
    base = os.path.basename(path)
    if base.endswith('_st.json'):
        continue
    eid = base[:-5]
    if only and eid not in only:
        continue
    try:
        with open(path, encoding='utf-8') as f:
            raw = json.load(f)
    except Exception as e:
        print('SKIP', base, e)
        continue
    if raw.get('type') not in ('kov', 'ep') or not raw.get('cands'):
        print('SKIP', base, 'type/cands')
        continue
    t = raw['type']
    lists, cands = raw['lists'], raw['cands']
    summ = {}
    if t == 'kov':
        groups = {}
        for c in cands:
            L = lists[c[0]]
            if L[1] == 'P':
                p = raw['parties'][L[2]]
                key = ('P', p[0], p[1])
            else:
                key = (L[1], '', 'Valimisliidud' if L[1] == 'A' else 'Üksikkandidaadid')
            g = groups.setdefault(key, [0, 0])
            g[0] += c[4] or 0
            g[1] += 1 if c[7] else 0
        rows = sorted(groups.items(), key=lambda kv: -kv[1][0])
        summ = {'units': sum(1 for u in raw['units'] if 'kordush' not in u['name'].lower()), 'seats': sum(u['seats'] for u in raw['units'] if 'kordush' not in u['name'].lower()), 'cands': len(cands),
                'valid': sum(c[4] or 0 for c in cands),
                'parties': [[k[2], k[1], k[0], v[0], v[1]] for k, v in rows][:14]}
    else:
        lv = [0] * len(lists)
        ls = [0] * len(lists)
        for c in cands:
            lv[c[0]] += c[3] or 0
            ls[c[0]] += 1 if c[5] else 0
        if raw.get('closed') and raw.get('lv'):
            lv = [sum(r) for r in raw['lv']]
        elif raw.get('closed') and raw.get('lvotes'):
            lv = raw['lvotes']
        rows = []
        for i, L in enumerate(lists):
            if L[0] == 'P':
                p = raw['parties'][L[1]] if L[1] is not None and L[1] >= 0 else [L[3], L[2]]
                rows.append([p[1], p[0], 'P', lv[i], ls[i]])
            else:
                rows.append([L[2], '', 'I', lv[i], ls[i]])
        rows.sort(key=lambda r: -r[3])
        summ = {'seats': raw.get('seats'), 'cands': len(cands), 'valid': sum(lv), 'parties': rows[:12]}
    fn = eid + '.json'
    with open(os.path.join(out, 'data', fn), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(raw, f, ensure_ascii=False, separators=(',', ':'))
    m = {'id': eid, 'type': t, 'year': raw.get('year'), 'date': raw.get('date', ''), 'name': raw.get('name', eid),
         'file': fn, 'bytes': os.path.getsize(os.path.join(out, 'data', fn)), 'src': raw.get('src', []), 'sum': summ}
    stp = os.path.join(src_dir, eid + '_st.json')
    if os.path.exists(stp):
        with open(stp, encoding='utf-8') as f:
            st = json.load(f)
        with open(os.path.join(out, 'data', eid + '_st.json'), 'w', encoding='utf-8', newline='\n') as f:
            json.dump(st, f, ensure_ascii=False, separators=(',', ':'))
        m['stfile'] = eid + '_st.json'
    mani.append(m)
    print('data', fn, m['bytes'], 'st' if 'stfile' in m else '')
mani.sort(key=lambda m: (m['type'], -(m['year'] or 0)))

# ---------- rakendus
data = json.loads(rd('data2023.json'))
data_js = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
mani_js = json.dumps({'elections': mani}, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
vm = '(function () {\n  \'use strict\';\n' + ''.join(rd(n) for n in ('vm_core.js', 'vm_kov.js', 'vm_ep.js', 'vm_hist.js', 'vm_pages.js', 'vm_events.js')) + '  showPage(page);\n})();\n'
parts = {'/*__DATA__*/': data_js, '/*__MANIFEST__*/': mani_js, '/*__COMMON__*/': js_safe(rd('common.js'), 'common'),
         '/*__ENGINE__*/': js_safe(rd('engine.js'), 'engine'), '/*__ENGINE2__*/': js_safe(rd('engine2.js'), 'engine2'),
         '/*__VM__*/': js_safe(vm, 'vm'), '/*__APP__*/': js_safe(rd('app.js'), 'app')}
head = rd('head.html')
body = rd('body.html')
for k, v in parts.items():
    assert body.count(k) == 1, k
    body = body.replace(k, v)
assert '/*__' not in body
artifact = head + '\n' + body
standalone = ('<!doctype html>\n<html lang="et">\n<head>\n<meta charset="utf-8">\n'
              '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
              + head + '\n</head>\n<body>\n' + body + '\n</body>\n</html>\n')
if want_artifact:
    with open(os.path.join(out, 'riigikogu-valimised.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(artifact)
with open(os.path.join(out, 'index.html'), 'w', encoding='utf-8', newline='\n') as f:
    f.write(standalone)
print('index.html', len(standalone.encode('utf-8')), 'elections', len(mani))
