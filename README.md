# Riigikogu valimiste mudel

Interaktiivne veebileht, millega saab muuta kandidaatide hääli ringkonniti ja vaadata, kes saab Riigikokku, millise mandaadiga ning kes on iga valitud liikme asendusliikmed õiges järjekorras.

**Ava mudel:** https://hallkass.github.io/riigikogu-valimised/

## Võimalused

- Kandidaatide häälte muutmine ringkonniti, ka kogu erakonna häälte muutmine ±10% ühes ringkonnas või kõigis korraga. Tulemus arvutatakse kohe ümber.
- Tulemus erakondade ja kandidaatide kaupa ning Riigikogu kohtade jaotus poolringina (isiku-, ringkonna- ja kompensatsioonimandaadid).
- Iga valitud liikme asendusliikmete järjekord: sama erakonna ringkonna asendusliikmed, seejärel erakonna üleriigiline nimekiri, seejärel lisamandaat.
- Volituste peatumise simulatsioon: märgi liikmeid lahkunuks (nt ministriks nimetamine) ja vaata, kes asub nende asemele.
- Kogu arvutuskäik: lihtkvoodid, ringkonnamandaadid koos 75% jäägi reegliga, kompensatsioonimandaatide võrdlusarvud ja lisamandaatide tabel.
- Andmete kopeerimine ja asendamine JSON-vormingus (nt teiste valimiste kandidaatidega).

## Õiguslik alus

- [Riigikogu valimise seadus](https://www.riigiteataja.ee/akt/RKVS) § 7, § 62, § 75, § 76 (kehtiv sõnastus 01.10.2024; tulemuste kindlakstegemise sätted on samad, mis 2023. aasta valimistel)
- [Riigikogu liikme staatuse seadus](https://www.riigiteataja.ee/akt/RKLS) § 11–14

Kõik reeglid on lahti seletatud lehe vahekaardil „Reeglid“.

## Kontroll 2023. aasta tulemusega

2023. aasta ametlike häältega annab mudel täpselt Vabariigi Valimiskomisjoni avaldatud tulemuse:

- 101/101 valitud liiget ja nende mandaadi liik (9 isiku-, 66 ringkonna- ja 26 kompensatsioonimandaati)
- 26/26 kompensatsioonimandaadi võrdlusarvu 4 komakoha täpsusega
- 649/649 üleriigilist asendusliiget õiges järjekorras ja õigel kohal lisamandaatide tabelis
- 43/43 ringkonna asendusliikmete nimekirja

Kontroll käivitub lehe avamisel uuesti (vahekaart „Kontroll 2023“).

## Andmed

Riigi valimisteenistus, [rk2023.valimised.ee](https://rk2023.valimised.ee/et/election-result/index.html) (andmed seisuga 20.04.2023).

## Tehniline

Kogu mudel on üks iseseisev fail `index.html` (andmed, arvutus ja kasutajaliides). Serverit ega ehitusetappi pole vaja; faili võib avada ka otse arvutist.

## Märkus

Tegemist on mitteametliku mudeliga. Ametlikud tulemused avaldab [valimised.ee](https://www.valimised.ee).
