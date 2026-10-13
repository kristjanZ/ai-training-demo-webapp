# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## What this is

Õnnepood: a small synthetic e-commerce Express app that doubles as training material for AI-assisted software quality sessions (Estonian-language exercises). Only fake products, users and orders; never add real client data or credentials. Much of the repo is exercise content, not app code.

## Commands

```bash
npm install
npm start                      # node src/server.js -> http://localhost:3000
npm test                       # jest; excludes tests/flaky/ and tests/ui/ (see package.json "jest")
npm run test:stable            # also skips checkoutFlow.test.js
npx jest tests/orderService.test.js -t "name"   # single file / single test (add --watchman=false if watchman complains)
npm run test:flaky             # tests/flaky, random order, intentionally nondeterministic
npm run test:repeat -- 10      # run flaky tests N times with per-test failure tally
npm run test:ui                # Selenium tests in tests/ui/ (placeholder dir for exercises)
npm run test:api -- <collection.json>   # Newman/Postman
npm run edw:build | edw:sql -- "SELECT ..." | edw:test [-- --rikutud]
```

## Architecture

- `src/app.js` exports `createApp(options)`, an Express factory with injectable `productRepository` and `orderService` (tests use supertest with fakes). `src/server.js` only starts it. Routes: `GET /api/products[/:id]`, `POST /api/orders`; any thrown error becomes a 500 `Unexpected demo shop error`.
- `src/services/OrderService.js` and `src/db/ProductRepository.js` are the business/data layers; `CheckoutSimulator.js` simulates the checkout. Static frontend lives in `src/public/`.
- `src/booking/` (`bookingStore.js`, `priceCalculator.js`) is a separate in-memory booking module with random delays, used by the Session 5 flaky-test and "write tests for a module" exercises (`tests/flaky/bookingFlaky.test.js`).
- `edw/` + `scripts/edw.js`: mini data warehouse on Node's built-in `node:sqlite` (needs a recent Node). `staging.sql` -> `transform.sql` build `edw/edw.db` (dim_room, fact_booking, reject_booking per rules R1.. in `edw/LDM.md`); `edw/tests/*.sql` pass when they return 0 rows; `--rikutud` loads deliberately broken data from `rikutud_andmed.sql`.
- `demo-scenarios/` holds per-session exercise material (Sessions 2-5). These files are often intentionally buggy or flaky (e.g. `demo-scenarios/order-service-bug/OrderService.js`, `flaky-checkout-test/`), so don't "fix" them unless asked.

## Intentional quirks

- Ordering product `backorder-01` (name "Saan teleporteeruda igasse WC-sse, kus olen kunagi käinud") makes `POST /api/orders` return the 500 error; this is the seeded bug for the diagnosis exercise.
- `tests/flaky/` and `tests/checkoutFlow.test.js` are deliberately unreliable and excluded from the stable run.
- `.github/copilot-instructions.md` is intentionally absent; participants create it in an exercise.

## Testide stiil

- Failid: `tests/<moodul>.test.js` (camelCase moodulinimi, nt `orderService.test.js`); üks fail ühe mooduli kohta.
- Struktuur: üks `describe('<Moodul>')` faili kohta, lamedad `test(...)` kutsed (mitte `it`, ilma pesastatud describe'ita): `describe('OrderService', () => {`.
- Nimed on inglise keeles, kujul "<funktsioon/route> <teeb/tagastab midagi>": `test('validateCart reports missing items', ...)`, `test('GET /api/products/:id returns 404 when missing', ...)`.
- Testandmed: jagatud konstandid `describe`i alguses (`const cart = {...}`, `const paymentInfo`); muu on inline. Kõik on sünteetiline (`tok_synthetic`, `user-123`, `10115`).
- Sõltuvused: asendatakse käsitsi tehtud objektidega, mille meetodid on `jest.fn().mockResolvedValue(...)`: `createOrderService({ post: jest.fn().mockResolvedValue({ data: {...} }) })`; rakendus luuakse `createApp({ productRepository: {...} })`.
- Tavalised kontrollid: `expect(x).toEqual(...)` objektidele/massiividele, `toBe` primitiividele, `await expect(p).resolves.toEqual(...)` asünkroonsele, `expect(() => ...).toThrow('sõnum')`, `expect.stringMatching(/^ord_\d{8}_user12$/)` muutuvatele id-dele, `toHaveBeenCalledWith(sql, [param])` päringutele.
- HTTP: supertest ahelana `await request(app).post(...).send(...).expect(400).expect({ error: '...' })`.
- Aeg: `jest.useFakeTimers()` ... `jest.useRealTimers()` testi sees (`sleep resolves after the requested delay`); kuupäev antakse ette (`new Date('2026-09-07T08:00:00Z')`), mitte ei loeta kellast.
- Välditakse: `beforeEach`/jagatud muutuvat olekut, snapshot-teste ja päris võrgukutseid; üldjuhul ka `test.skip`/`only` (neid failides pole).
- Erand: `checkoutFlow.test.js` on tahtlikult habras (fikseeritud `sleep(300)`), ilma `describe`ita; ära võta seda eeskujuks.

## Testimise reeglid

1. Testid on Jestis, failid kaustas `tests/`, nimi `<moodul>.test.js`. SQL-testid on kaustas `edw/tests/`.
2. Rahasummad on sentides (täisarvud), kuupäevad `YYYY-MM-DD` UTC-s.
3. Äriloogika on failides `demo-scenarios/session-4-restful-booker/1_Broneeringu_nouded_mustand.md` ja `edw/LDM.md`. Testi oodatav tulemus tuleb nõudest, mitte koodist.
4. Kui test kukub, ära muuda oodatavat tulemust ilma minult küsimata.
