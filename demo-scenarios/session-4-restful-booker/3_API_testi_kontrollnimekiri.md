# Harjutus 2 — API-test oma curl-rakendusega

Kasutage oma Harjutus 0 rakendust. Kui see veel ei tööta, kasutage terminalis `curl`-i,
Postmani või paluge AI-l päringud genereerida — eesmärk on testimine, mitte tööriist.

Baas-URL: `https://restful-booker.herokuapp.com`
Dokumentatsioon: https://restful-booker.herokuapp.com/apidoc/index.html

## Põhivoog (happy path)

1. `POST /auth` kasutajaga `admin` / `password123` → salvestage `token` muutujasse `{{token}}`
2. `POST /booking` kehtivate andmetega → salvestage `bookingid`
3. `GET /booking/{{bookingid}}` → kas andmed on samad, mis saatsite?
4. `PUT /booking/{{bookingid}}` koos päisega `Cookie: token={{token}}` → muutke kuupäevi
5. `DELETE /booking/{{bookingid}}` → kas järgmine GET tagastab 404?

## Negatiivsed ja edge case'id — kasutage Harjutus 1 nõudeid

Mida API peaks nõuete järgi tegema ja mida ta tegelikult teeb? Paluge AI-l koostada
tabel: **juhtum | nõue | oodatav tulemus | tegelik tulemus | viga?**

Ideid alustamiseks:

- Lahkumine enne saabumist
- Negatiivne hind, hind tekstina
- Puuduv kohustuslik väli
- Olematu kuupäev (nt 30. veebruar)
- Muutmine või kustutamine ilma tokenita
- Sisselogimine vale parooliga — mida vastus tegelikult ütleb?
- Väga pikk nimi, täpitähed, jutumärgid nimes

## Testige ka oma rakendust

- Kas jutumärgid, `&` või täpitähed päises või kehas töötavad?
- Kas salvestatud päring on alles pärast rakenduse taaskäivitust?
- Kas SPEC.md aktsepteerimiskriteeriumid on täidetud? Märkige iga kohta ✅ / ❌.

## Pidage meeles

API-t kasutavad korraga kõik ja andmed muutuvad pidevalt (ka taastumine algseisu). Kui teie broneering
kaob, uurige enne viga raporteerimist, miks.

## Automaattestid

Formaat: Postmani kollektsioon `automation/api/broneering.postman_collection.json`
Käivitus: `npm run test:api -- automation/api/broneering.postman_collection.json`

Iga test kontrollib staatuskoodi **ja** seda, mis kehas tegelikult salvestati (järelpäring `GET`).

| # | Test | Staatus + salvestatud keha | Tulemus |
|---|------|----------------------------|---------|
| 1 | `POST /booking` happy path, seejärel `GET` | 200; GET tagastab täpselt saadetud andmed (täpitähed, kuupäevad, hind) | 🟢 roheline |
| 2 | `PUT /booking/:id` ilma tokenita | 403; järgmine GET näitab, et andmed jäid muutmata | 🟢 roheline |
| 3 | `PUT /booking/:id` tokeniga | 200; GET näitab uusi kuupäevi | 🟢 roheline |
| 4 | `DELETE /booking/:id` | 201; järgmine GET on 404 | 🟢 roheline |
| 5 | Nõue 2.1: lahkumine (2026-12-15) enne saabumist (2026-12-20) | oodatud 400 ja broneeringut ei salvestata (GET → 404) | 🔴 punane |

Punase põhjus (test 5): API vastas **200** ja lõi broneeringu, GET leidis selle (200, mitte 404).
API ei valideeri kuupäevade järjekorda, mis on vastuolus nõudega 2.1 — tõenäoline päris viga.
Oodatavat tulemust ei muudetud, see tuleb nõudest, mitte API käitumisest.
