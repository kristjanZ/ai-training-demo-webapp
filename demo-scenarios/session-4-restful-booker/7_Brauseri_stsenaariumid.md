# Praktika 2 — brauseri stsenaariumid (automationintesting.online)

AI-agent käib need stsenaariumid läbi nagu päris kasutaja ja kirjutab tulemused
raportisse. Prompt: `PROMPTID.md` → Praktika 2.

**Testandmed (kasutage ainult neid):** eesnimi `Test`, perenimi `Koolitus`,
e-post `test@example.com`, telefon `+37255500000`.
Vormide saatmine loob avalikus demosüsteemis päris kirje — ärge sisestage päris isikuandmeid.

---

## S1 — Broneering kehtivate andmetega

- **Eeltingimus:** avaleht https://automationintesting.online on avatud
- **Sammud:**
  1. Vajutage esimese toa juures „Book now“
  2. Valige kalendrist saabumine ja lahkumine: 2 ööd, vähemalt kuu aja pärast
  3. Vajutage „Reserve Now“
  4. Täitke vorm testandmetega (Firstname, Lastname, Email, Phone)
  5. Vajutage uuesti „Reserve Now“
- **Oodatav tulemus:** kuvatakse „Booking Confirmed“ ja valitud kuupäevad

## S2 — Kohustuslik väli on tühi

- **Eeltingimus:** nagu S1, sammud 1–3
- **Sammud:** täitke vorm testandmetega, **aga jätke Firstname tühjaks** → „Reserve Now“
- **Oodatav tulemus:** broneeringut ei kinnitata; lehel on selge veateade, mis nimetab puuduvat välja

## S3 — Lahkumine enne saabumist

- **Eeltingimus:** —
- **Sammud:** avage otse
  https://automationintesting.online/reservation/1?checkin=2026-12-12&checkout=2026-12-10
  ja lugege hinnakokkuvõtet
- **Oodatav tulemus (nõue 2.1):** süsteem ei luba lahkumist enne saabumist — hinnakokkuvõttes
  ei ole negatiivset ööde arvu ega hinda

## S4 — Visuaalne kontroll: lauaarvuti vs mobiil

- **Eeltingimus:** S1 samm 1 (toa leht on avatud)
- **Sammud:** tehke toa lehest ekraanipilt lauaarvuti laiuses (~1280 px) ja mobiili laiuses
  (~390 px)
- **Oodatav tulemus:** mõlemas vaates on kalender, hinnakokkuvõte ja „Reserve Now“ nähtavad;
  tekst ei ole ära lõigatud ega kattu

## S5 — Teie oma stsenaarium

- **Eeltingimus:** nagu S1, sammud 1–3
- **Sammud:** täitke vorm testandmetega, **aga Email, Phone tühjaks** → „Reserve Now“
- **Oodatav tulemus:** broneeringut ei kinnitata; lehel on selge veateade, mis nimetab puuduvad väljad

---

## Raporti formaat

| ID | Tulemus | Tegelik tulemus (mida lehel nägi) | Tõend |
|---|---|---|---|
| S1 | ✅ / ❌ | … | ekraanipilt või täpne tekst lehelt |
