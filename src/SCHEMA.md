# Ühtne andmevorming: KOV ja EP valimised (v1)

Väljund on üks kompaktne UTF-8 JSON-fail valimiste kohta (`<id>.json`, ilma taaneteta, `ensure_ascii=False`)
ja soovi korral eraldi jaoskonnataseme fail (`<id>_st.json`). Id: `kov2025`, `kov2021`, ..., `ep2024`, `ep2019`, ...
Kõik väljundid kirjutatakse kausta `scratchpad/kovep_out/`.

## Üldreeglid andmetele

- **Nimed**: kujul "Eesnimi Perenimi" tavalise suurtähestusega (allikas on sageli SUURTÄHTEDES: "ALDUR-ÜLLAR TALKOP" -> "Aldur-Üllar Talkop";
  iga tühiku või sidekriipsuga eraldatud osa algab suurtähega, ülejäänu väiketähtedega). Kui allikas on juba õige suurtähestusega, jäta see alles.
- **Sünniaeg**: täisarv `YYYYMMDD` (nt 19811129); kui teada ainult aasta, siis `YYYY0000`; kui teadmata, siis `0`.
- **Hääled**: kandidaadi kõik kehtivad hääled kokku (paber + e-hääled + välisriigid jne). Eestis on iga kehtiv hääl antud ühele kandidaadile,
  seega ringkonna kandidaatide häälte summa = ringkonna kehtivate häälte arv. Kontrolli seda.
- **Kandidaadi registreerimisnumber** (`regNr`): ametlik number (KOV-is ainulaadne omavalitsuse piires, EP-s üleriigiliselt).
  Numbrid antakse koondnimekirja järjekorras, seega suurem number = koondnimekirjas tagapool (vajalik viigireeglite jaoks).
- **Ametlik tulemus** peab olema andmetes (kes osutus valituks ja mis liiki mandaadiga), sest rakendus võrdleb oma arvutust ametlikuga.
- Kui mingit välja ei ole allikas, kasuta 0 / "" ja kirjelda seda raportis. Ära mõtle andmeid välja.

## KOV fail (`type: "kov"`)

```json
{
  "v": 1,
  "id": "kov2025", "type": "kov", "year": 2025, "date": "2025-10-19",
  "name": "Kohaliku omavalitsuse volikogude valimised 2025",
  "src": ["https://opendata.valimised.ee/api/KOV_2025/"],
  "stats": {"eligible": 1003829, "voted": 594117, "valid": 591562, "evoted": 270818},
  "partial": false,
  "notes": "",
  "parties": [["KESK", "Eesti Keskerakond"], ["IE", "ISAMAA Erakond"]],
  "counties": [["0037", "Harju maakond"]],
  "units": [
    {"code": "0141", "name": "Anija vald", "county": 0, "seats": 21,
     "valid": 2140, "eligible": 3590, "voted": 2156, "tallinn": false,
     "districts": [{"nr": 1, "name": "Anija vald", "seats": 21, "valid": 2140, "eligible": 3590, "voted": 2156}]}
  ],
  "lists": [[0, "P", 1, "ISAMAA Erakond", "IE"], [0, "A", -1, "Valimisliit Anija Ühendus", "VAÜ"], [0, "I", -1, "Mari Maasikas", ""]],
  "cands": [[1, 1, 101, "Katrina Orusalu", 123, 1, 0, 1, 19811129, 1, 0]]
}
```

- `stats`: kõik teadaolevad üleriigilised näitajad (valijaid nimekirjas, hääletanuid, kehtivaid hääli, e-hääletanuid). Puuduv väli jäta ära.
- `partial`: true, kui osa omavalitsusi/kandidaate puudub (kirjelda `notes`-is ja raportis).
- `parties`: selles valimises kandideerinud registreeritud erakonnad (indeks = erakonna id). `[kood, täisnimi]`.
- `counties`: maakonnad `[kood, nimi]`; `units[].county` on indeks sellesse massiivi (või -1).
- `units`: omavalitsused (valimisüksused). `seats` = volikogu liikmete arv, `valid` = kehtivad hääled omavalitsuses,
  `eligible`/`voted` kui olemas. `tallinn`: true omavalitsuses, kus kasutati kompensatsioonimandaatidega süsteemi
  (KOVVS § 56¹ – Tallinn; ametlikes andmetes on siis COMPENSATION-tüüpi mandaate või "kompensatsioonimandaat").
  `districts`: valimisringkonnad: number, nimi (nt "Valimisringkond nr 1 – Anija vald" -> võid lühendada "Anija vald"; Tallinnas linnaosa nimi),
  mandaatide arv, kehtivad hääled (ja `eligible`/`voted`, kui olemas).
- `lists`: kõik nimekirjad kõigis omavalitsustes: `[unitIdx, kind, partyIdx, nimi, kood]`.
  `kind`: `"P"` erakonna nimekiri, `"A"` valimisliidu nimekiri, `"I"` üksikkandidaat (iga üksikkandidaat on eraldi "nimekiri", nimi = kandidaadi nimi).
  Üks erakonna/valimisliidu nimekiri omavalitsuse kohta (hõlmab kõiki selle ringkondi).
- `cands`: kõik kandidaadid:
  `[listIdx, districtNr, regNr, nimi, hääled, pos, upos, el, sünniaeg, fpos, rsv]`
  - `pos`: koht ringkonnanimekirjas (1-põhine; ametlik `positionNumberInDistrict`; kui puudub, siis järjekoht regNr järgi
    sama nimekirja sama ringkonna kandidaatide seas). Üksikkandidaadil 1.
  - `upos`: koht erakonna/valimisliidu ülelinnalises (omavalitsuse) nimekirjas (Tallinnas; ametlik `positionNumberInAdminUnit` või
    `sequenceNumberInAdminUnit`), muidu 0.
  - `el`: ametlik tulemus: 0 = ei osutunud valituks, 1 = valitud lihtkvoodiga (isikumandaat, PERSONAL),
    2 = nimekirjamandaat / Tallinnas ringkonnamandaat (DISTRICT), 3 = kompensatsioonimandaat (COMPENSATION),
    4 = valitud, kuid mandaadi liik teadmata või muu (nt enim hääli saanud üksikkandidaatide ringkonnas).
  - `fpos`: ametlik `finalPositionNumber` (kui olemas, muidu 0); `rsv`: 1 kui ametlikult registreeritud asendusliikmeks (`reserved=true`), muidu 0.

## EP fail (`type: "ep"`)

```json
{
  "v": 1, "id": "ep2024", "type": "ep", "year": 2024, "date": "2024-06-09",
  "name": "Euroopa Parlamendi valimised 2024", "src": ["..."],
  "seats": 7, "closed": false, "notes": "",
  "stats": {"eligible": 0, "voted": 0, "valid": 0, "evoted": 0},
  "parties": [["REF", "Eesti Reformierakond"]],
  "lists": [["P", 0, "Eesti Reformierakond", "REF"], ["I", -1, "Mari Maasikas", ""]],
  "cands": [[0, 101, "Kaja Kallas", 12345, 1, 1, 19770618]],
  "areas": [["0037", "Harju maakond", ""], ["0141", "Anija vald", "Harju maakond"]],
  "av": [[...]],
  "lv": [[...]]
}
```

- `seats`: Eestile jaotatud mandaatide arv neil valimistel (2019 kirjelda `notes`-is Brexiti järel lisandunud 7. kohta).
- `closed`: true, kui nimekirjad olid suletud (valija hääletas nimekirja, mitte kandidaadi poolt; 2009). Siis kandidaatide hääled = 0
  ja nimekirja hääled on `lv`-s / raportis.
- `lists`: `[kind, partyIdx, nimi, kood]`; `kind` `"P"` erakond, `"I"` üksikkandidaat.
- `cands`: `[listIdx, regNr, nimi, hääled, pos, el, sünniaeg]`; `pos` = koht erakonna esitatud nimekirjas (1-põhine), `el` 0/1 ametlik valituks osutumine.
- `areas` (valikuline, aga soovitatav): piirkonnad, mille kaupa kandidaatide hääled on teada: `[kood, nimi, maakond]`.
  Eelista omavalitsuse taset (maakonna nimega); kui pole, siis maakondi (maakond = "").
  `av[i]` = kandidaadi `cands[i]` hääled piirkondade kaupa samas järjekorras kui `areas` (summa = kandidaadi hääled; kui välisriikide
  või e-häälte vms osa ei jagune piirkondadeks, lisa eraldi piirkond, nt `["", "E-hääled (jaotamata)", ""]`).
  `lv` (ainult suletud nimekirjade korral) = nimekirjade hääled piirkondade kaupa.

## Jaoskonnataseme fail (valikuline) `<id>_st.json`

Ainult siis, kui allikas annab kandidaatide hääled jaoskondade kaupa (nt opendata `DETAILED_RESULT_PARISH_<ehak>.xml`).

```json
{"v": 1, "id": "kov2025", "units": {"<unitIdx>": {"st": ["E-hääled", "Jaoskond nr 1 (Alutaguse)", "..."], "cv": {"<candIdx>": [5, 3, 0]}}}}
```

- KOV: võti on `units`-i indeks; EP: kasuta võtmena `areas`-i indeksit (omavalitsus) ja `cv` võtmena `cands`-i indeksit.
- `st`: jaoskondade nimed (e-hääled ja välisriigid eraldi "jaoskondadena", kui allikas nii annab). `cv[candIdx]` = hääled jaoskondade kaupa,
  summa peab võrduma kandidaadi häältega. Jäta nullidega kandidaadid välja, kui see vähendab mahtu.

## Kontrollid (kohustuslikud, tulemused raportisse `<id>_report.md`)

1. Iga ringkonna kandidaatide häälte summa = ringkonna kehtivad hääled (kui allikas annab kehtivate häälte arvu).
2. Iga omavalitsuse valitute arv = volikogu suurus; ringkondade mandaatide summa = volikogu suurus.
3. Erakondade üleriigilised häälte summad = ametlik koondtulemus (kui olemas).
4. EP: valitute arv = mandaatide arv; nimekirjade häälte summad = ametlikud.
5. Raporti lõppu: omavalitsuste arv, kandidaatide arv, nimekirjade arv, mandaate kokku, mandaadiliikide jaotus, puuduolevad väljad,
   kõik lahknevused ja kuidas neid käsitlesid, kasutatud URL-id.
