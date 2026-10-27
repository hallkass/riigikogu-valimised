# Riigikogu valimiste mudel

Interaktiivne veebileht, millega saab muuta kandidaatide hääli ringkonniti ja vaadata, kes saab Riigikokku, millise mandaadiga ning kes on iga valitud liikme asendusliikmed õiges järjekorras. Mudelis on kõik Riigikogu valimised 1992–2023 ja iga kandidaadi kandideerimise ajalugu.

**Ava mudel:** https://hallkass.github.io/riigikogu-valimised/

## Võimalused

- Valimiste valik päises: 2023, 2019, 2015, 2011, 2007, 2003, 1999, 1995 või 1992. Valitud aasta arvutatakse mudelis ümber.
- Erakonna häälte muutmine protsendi kaupa (samm 1%, 5% või 10%) otse tulemuste tabelis kõigis ringkondades korraga või ringkonna erakondade tabelis ühes ringkonnas. Muutus jaguneb erakonna kandidaatidele proportsionaalselt ja tulemus arvutatakse kohe ümber.
- Iga kandidaadi häälte muutmine ringkonniti.
- Tulemus erakondade ja kandidaatide kaupa ning Riigikogu kohtade jaotus poolringina (isiku-, ringkonna- ja kompensatsioonimandaadid).
- Süvavaade: erakond → ringkondade edetabel → kandidaatide ja omavalitsuste edetabel → jaoskondade edetabel; iga kandidaadi hääled omavalitsuste ja jaoskondade kaupa (omavalitsuste ja jaoskondade andmed 2023. aasta kohta).
- Paber- ja e-hääled erakondade ja maakondade kaupa (2023, e-hääled valija elukoha järgi).
- Ajalugu: kandidaadi kandideerimise ajalugu 1992–2023 (aasta, nimekiri, ringkond, koht ringkonna- ja üleriigilises nimekirjas, hääled, koht erakonna kandidaatide seas ning osakaal erakonna ja ringkonna häältest ja üle Eesti) ning iga aasta tulemused ja valitud liikmed.
- Iga valitud liikme asendusliikmete järjekord: sama erakonna ringkonna asendusliikmed, seejärel erakonna üleriigiline nimekiri, seejärel lisamandaat.
- Volituste peatumise simulatsioon: märgi liikmeid lahkunuks (nt ministriks nimetamine) ja vaata, kes asub nende asemele.
- Kogu arvutuskäik: lihtkvoodid, ringkonnamandaadid koos 75% jäägi reegliga, kompensatsioonimandaatide võrdlusarvud ja lisamandaatide tabel.
- Andmete kopeerimine ja asendamine JSON-vormingus (nt teiste valimiste kandidaatidega).

## Sama nimega kandidaadid

Isikukoodi avaandmetes ei ole, seega seotakse kandideerimised eri aastatel nime ja sünniaja järgi:

- Sünniaeg on olemas 1999.–2023. aasta kandidaatidel (v.a 2011). Sama nime ja sünniajaga kandideerimised loetakse sama isiku omaks. Kui sünniaeg erineb ühe numbri võrra, käsitletakse seda andmeveana ja kandideerimised seotakse samuti.
- Sama sünniajaga nimevariandid (nt Keit Pentus ja Keit Pentus-Rosimannus) seotakse automaatselt. Sama sünniaja ja ees- või perekonnanimega teise nimega kandidaati (nt Kadri Must → Kadri Simson) pakutakse soovitusena, mille saab ühe klõpsuga ajalukku lisada.
- 1992., 1995. ja 2011. aasta kandidaatide sünniaegu avaandmetes ei ole; need kandideerimised seotakse nime järgi ja on vastavalt märgitud.
- Kui sama nimega isikuid on mitu (erinev sünniaeg) või samal aastal kandideeris mitu sama nimega inimest, saab valida isiku või valida iga aasta kandideerimise ise. Valikud jäävad brauserisse meelde.

## Õiguslik alus

- [Riigikogu valimise seadus](https://www.riigiteataja.ee/akt/RKVS) § 7, § 62, § 75, § 76 (kehtiv sõnastus 01.10.2024; tulemuste kindlakstegemise sätted on samad, mis 2023. aasta valimistel)
- [Riigikogu liikme staatuse seadus](https://www.riigiteataja.ee/akt/RKLS) § 11–14
- Varasemad valimised: § 62 on sisult sama alates 2002. aasta seadusest (valimised 2003–2023). 1995 ja 1999 kehtis 1994. aasta seadus (75% jäägi reeglit ja kompensatsioonimandaadi kandidaadi 5% nõuet polnud, ringkonnamandaadi 10% nõue oli) ning 1992 tolleaegne seadus (ka 10% nõuet polnud). Mudel kasutab iga aasta puhul tolleaegseid reegleid; päisest saab valida ka kehtivad reeglid.

Kõik reeglid on lahti seletatud lehe vahekaardil „Reeglid“.

## Kontroll ametlike tulemustega

Iga valimise ametlike häältega annab mudel täpselt ametliku tulemuse: kõigil üheksal valimisel 1992–2023 kattuvad 101/101 valitud liiget ja nende mandaadi liik.

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

2023. aasta kohta kontrollitakse lisaks:

- 26/26 kompensatsioonimandaadi võrdlusarvu 4 komakoha täpsusega
- 649/649 üleriigilist asendusliiget õiges järjekorras ja õigel kohal lisamandaatide tabelis
- 43/43 ringkonna asendusliikmete nimekirja

Kontroll käivitub lehel vahekaardil „Kontroll“.

## Andmed

- 2023: Riigi valimisteenistus, [rk2023.valimised.ee](https://rk2023.valimised.ee/et/election-result/index.html) (andmed seisuga 20.04.2023): kandidaadid, hääletamis- ja valimistulemus, detailne hääletamistulemus 405 jaoskonna ja 86 omavalitsuse/linnaosa kaupa ning valimisjaoskondade nimekiri.
- 2019 ja 2015: valimiste avaandmed XML-is ([valimised.ee](https://www.valimised.ee/et/valimiste-arhiiv/valimiste-avaandmed), CC BY 4.0) ning rk2019.valimised.ee ja info.rk2015.vvk.ee kandidaatide lehed (nimekirjad, sünniajad).
- 2011–1992: Vabariigi Valimiskomisjoni arhiiv [vvk.ee/varasemad](http://vvk.ee/varasemad/) (tulemused, nimekirjad, kandidaatide lehed); 2011 ka valimised.ee arhiivi kandidaatide nimekirjafailid. Andmeid on võrreldud VVK arhiivi kandidaadiotsinguga.

Kui hääli muuta, arvutatakse jaoskondade, omavalitsuste ning paber- ja e-häälte jaotus 2023. aasta jaotuse põhjal proportsionaalselt kandidaatide uute häältega.

## Tehniline

Kogu mudel on üks iseseisev fail `index.html` (andmed, arvutus ja kasutajaliides). Serverit ega ehitusetappi pole vaja; faili võib avada ka otse arvutist.

## Märkus

Tegemist on mitteametliku mudeliga. Ametlikud tulemused avaldab [valimised.ee](https://www.valimised.ee).
