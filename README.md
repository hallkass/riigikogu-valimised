# Eesti valimiste mudel

Interaktiivne veebileht Riigikogu, kohalike omavalitsuste volikogude ja Euroopa Parlamendi valimiste tulemuste uurimiseks ja modelleerimiseks. Mudel jaotab mandaadid seaduse järgi, näitab iga valitud liikme asendusliikmeid õiges järjekorras ja iga kandidaadi kandideerimise ajalugu kõigil valimistel. Hääli saab muuta, uusi valimisi lisada ja vahetulemusi salvestada.

**Ava mudel:** https://hallkass.github.io/riigikogu-valimised/

## Lehed

- **Avaleht** – viimaste valimiste kokkuvõte (Riigikogu, kohalikud, Europarlament), kandidaadiotsing ja kiirlingid.
- **Riigikogu** – valimised 1992–2023: kandidaatide hääled ringkonniti, isiku-, ringkonna- ja kompensatsioonimandaadid, süvavaade erakond → ringkond → kandidaat → omavalitsus → jaoskond (2023), paber- ja e-hääled, asendusliikmed ja volituste peatumise simulatsioon, kogu arvutuskäik.
- **Kohalikud** – kohaliku omavalitsuse volikogude valimised 2009–2025:
  - kogu Eesti: erakondade, valimisliitude ja üksikkandidaatide hääled ja kohad kokku, volikogude arv ja enamused; erakonna tulemused omavalitsuste kaupa;
  - omavalitsus: volikogu koosseis poolringina, nimekirjade hääled ja mandaadid (isiku-, nimekirja-, Tallinnas ringkonna- ja kompensatsioonimandaadid), ringkonnad, kandidaadid, d’Hondti võrdlusarvud, lisamandaatide tabel ja asendusliikmed;
  - kandidaat: hääled jaoskondade kaupa (kui avaandmetes olemas), asendusliikmete järjekord ja kandideerimise ajalugu.
- **Europarlament** – Euroopa Parlamendi valimised 2004–2024: d’Hondti jaotus, kandidaatide ümberreastamine häälte järgi, asendusliikmed, lisamandaatide tabel, tulemused omavalitsuste ja maakondade kaupa ning kandidaadi hääled piirkonniti. 2009. aasta suletud nimekirjad on arvestatud.
- **Kandidaadid** – iga kandidaadi kõik kandideerimised ajalises järjekorras kõigil valimistel; filtreerimine valimiste liigi järgi. Iga kandideerimise juures nimekiri, piirkond, koht nimekirjas, hääled, koht oma nimekirja kandidaatide seas ja osakaalud ning ringkonna võrdlus (iga nimekirja 7 enim hääli saanut).
- **Valimised** – uued valimised olemasolevate põhjal (nt Riigikogu 2027) või failist ning salvestatud vahetulemused.

## Häälte muutmine, uued valimised ja vahetulemused

- Iga erakonna/nimekirja hääli saab muuta protsendi kaupa (samm 1%, 5% või 10%) kogu riigis, omavalitsuses või ringkonnas; muutus jaguneb kandidaatidele proportsionaalselt. Iga kandidaadi hääli saab muuta ka otse.
- **Uued valimised**: vali liik, nimi, kuupäev ja alus (olemasolevad valimised ametlike, enda muudetud või nullitud häältega, või JSON-fail). Uued valimised ilmuvad vastava lehe valikusse.
- **Vahetulemused**: iga valimise lehel nupp „Vahetulemused“ salvestab häälte hetkeseisu (nt valimisõhtul pärast iga laekunud tulemust), näitab mandaatide muutust võrreldes praegusega ja laseb seisu uuesti avada. Hääli saab sisestada ka tekstina (read `kandidaadi number;hääled`, kohalikel `EHAK-kood:number;hääled`).
- Oma valimised ja vahetulemused hoitakse ainult selles brauseris (IndexedDB); neid saab faili alla laadida ja hiljem sisse lugeda.

## Õiguslik alus

- Riigikogu: [Riigikogu valimise seadus](https://www.riigiteataja.ee/akt/RKVS) § 7, § 62, § 75, § 76 ja [Riigikogu liikme staatuse seadus](https://www.riigiteataja.ee/akt/RKLS) § 11–14. 2003–2023 kehtisid samad mandaatide jaotamise reeglid; 1995 ja 1999 kehtis 1994. aasta seadus (75% jäägi reeglit ja kompensatsioonimandaadi kandidaadi 5% nõuet polnud, ringkonnamandaadi 10% nõue oli) ning 1992 tolleaegne seadus (ka 10% nõuet polnud). Mudel kasutab iga aasta puhul tolleaegseid reegleid.
- Kohalikud: [Kohaliku omavalitsuse volikogu valimise seadus](https://www.riigiteataja.ee/akt/KOVVS) § 56 (lihtkvoot, 5% künnis omavalitsuses, nimekirjamandaadid d’Hondti meetodil isikumandaatide võrra nihutatud jagajatega), § 56¹ (Tallinn: ringkonnamandaadid lihtkvoodi täiskordade järgi ja kompensatsioonimandaadid ülelinnalise nimekirja alusel), § 69 (asendusliikmed) ja § 70 (lisamandaadid).
- Europarlament: [Euroopa Parlamendi valimise seadus](https://www.riigiteataja.ee/akt/EPVS) § 61 (d’Hondt, üksikkandidaadi võrdlusarv, ümberreastamine häälte järgi), § 73 (asendusliikmed) ja § 74 (lisamandaadid).

Kõik reeglid on lahti seletatud iga lehe vahekaardil „Reeglid“.

## Kontroll ametlike tulemustega

Iga valimise ametlike häältega annab mudel ametliku tulemuse (kes osutus valituks ja millise mandaadiga). Kontroll käivitub iga lehe vahekaardil „Kontroll“.

**Riigikogu** – kõigil üheksal valimisel 1992–2023 kattuvad 101/101 valitud liiget ja nende mandaadi liik:

| Aasta | Isiku- / ringkonna- / kompensatsioonimandaadid |
|---|---|
| 2023 | 9 / 66 / 26 |
| 2019 | 13 / 68 / 20 |
| 2015 | 13 / 66 / 22 |
| 2011 | 14 / 68 / 19 |
| 2007 | 10 / 65 / 26 |
| 2003 | 14 / 60 / 27 |
| 1999 | 11 / 44 / 46 |
| 1995 | 15 / 34 / 52 |
| 1992 | 17 / 24 / 60 |

2023. aasta kohta kontrollitakse lisaks 26/26 kompensatsioonimandaadi võrdlusarvu 4 komakoha täpsusega, 649/649 üleriigilist asendusliiget õiges järjekorras ja 43/43 ringkonna asendusliikmete nimekirja.

**Kohalikud** – omavalitsused, kus mudeli järgi valitud volikogu ühtib ametlikuga, ja valitud liikmed:

| Aasta | Omavalitsused | Valitud liikmed | Mandaadi liik | Isiku- / nimekirja- / kompensatsioonimandaadid |
|---|---|---|---|---|
| 2025 | 78 / 78 | 1684 / 1684 | 1684 / 1684 | 180 / 1476 / 28 |
| 2021 | 79 / 79 | 1717 / 1717 | 1717 / 1717 | 194 / 1496 / 27 |
| 2017 | 79 / 79 | 1729 / 1729 | 1729 / 1729 | 179 / 1519 / 31 |
| 2013 | 215 / 215 | 2951 / 2951 | 2951 / 2951 | 333 / 2593 / 25 |
| 2009 | 226 / 226 | 3076 / 3076 | 3076 / 3076 | 352 / 2701 / 23 |

**Europarlament** – kõigil valimistel kattuvad valitud liikmed:

| Aasta | Mandaate | Valitud |
|---|---|---|
| 2024 | 7 | 7 / 7 |
| 2019 | 7 | 7 / 7 |
| 2014 | 6 | 6 / 6 |
| 2009 | 6 | 6 / 6 |
| 2004 | 6 | 6 / 6 |

2019. aastal jaotati Eestile 7 kohta, millest seitsmes täideti pärast Brexitit (2020); 2009. aastal olid nimekirjad suletud.


## Andmed

- Riigikogu 2023: [rk2023.valimised.ee](https://rk2023.valimised.ee/et/election-result/index.html); 2019 ja 2015: valimiste avaandmed (XML, CC BY 4.0) ja kandidaatide lehed; 2011–1992: Vabariigi Valimiskomisjoni arhiiv [vvk.ee/varasemad](http://vvk.ee/varasemad/).
- Kohalikud ja Europarlament: [opendata.valimised.ee](https://opendata.valimised.ee/api/) (KOV 2025, KOV 2021, EP 2024), valimiste avaandmete arhiiv (XML) ja Vabariigi Valimiskomisjoni varasemate valimiste arhiiv. Iga valimise allikad on lehe vahekaardil „Kontroll“.
- Isikukoodi avaandmetes ei ole, seega seotakse sama isiku kandideerimised nime ja sünniaja järgi. Ühe numbri võrra erinevad sünniajad loetakse andmeveaks, sama sünniajaga nimevariandid seotakse automaatselt ja nimevahetuse kahtlusega kandidaate pakutakse soovitusena. Sünniajata kandideerimised (eelkõige vanematel valimistel) seotakse nime järgi; kui sama nimega isikuid on mitu, saab iga valimise kandideerimise ise valida.

## Tehniline

`index.html` sisaldab rakendust ja Riigikogu andmeid; kohalike ja Euroopa Parlamendi valimiste andmed on kaustas `data/` (üks JSON-fail valimise kohta, jaoskondade jaotus eraldi failis) ja laaditakse alles siis, kui neid vaja on. Leht vajab veebiserverit (nt GitHub Pages); kohalikult avades töötab Riigikogu osa, ülejäänu jaoks käivita kaustas näiteks `python -m http.server`.

Lähtekood on kaustas `src/` (arvutusmootorid `engine.js` – Riigikogu, `engine2.js` – kohalikud ja Europarlament; kasutajaliides `app.js` ja `vm_*.js`). Lehe koostamine: `python src/build.py . data`. Mootori kontroll ametlike tulemustega: `node src/test_kovep.js data`. Andmevorming on kirjeldatud failis `src/SCHEMA.md`.

## Märkus

Tegemist on mitteametliku mudeliga. Ametlikud tulemused avaldab [valimised.ee](https://www.valimised.ee).
