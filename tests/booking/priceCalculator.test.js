const { calculatePrice } = require('../../src/booking/priceCalculator');

// Nõuded: demo-scenarios/session-4-restful-booker/1_Broneeringu_nouded_mustand.md
// 2027-03-01 on esmaspäev, 2027-03-05 reede, 2027-03-06 laupäev.
describe('priceCalculator', () => {
  const MONDAY = '2027-03-01';
  const FRIDAY = '2027-03-05';
  const rate = 10000;

  function addDays(date, days) {
    const result = new Date(`${date}T00:00:00Z`);
    result.setUTCDate(result.getUTCDate() + days);
    return result.toISOString().slice(0, 10);
  }

  function stay(nights, extra = {}) {
    return { nightlyRateCents: rate, checkin: MONDAY, checkout: addDays(MONDAY, nights), ...extra };
  }

  test('2.1 rejects a checkin that is after the checkout', () => {
    expect(() => calculatePrice({ nightlyRateCents: rate, checkin: '2027-03-12', checkout: '2027-03-10' })).toThrow();
  });

  test('2.1 rejects a checkin that is the same day as the checkout', () => {
    expect(() => calculatePrice({ nightlyRateCents: rate, checkin: MONDAY, checkout: MONDAY })).toThrow();
  });

  test('2.2 rejects a stay below the 1 night minimum (0 nights)', () => {
    expect(() => calculatePrice(stay(0))).toThrow();
  });

  test('2.2 accepts a stay of exactly 1 night (the minimum)', () => {
    expect(calculatePrice(stay(1)).nights).toBe(1);
  });

  test('2.2 accepts a stay of 2 nights (above the minimum)', () => {
    expect(calculatePrice(stay(2)).nights).toBe(2);
  });

  test('2.2 accepts a stay of 13 nights (below the maximum)', () => {
    expect(calculatePrice(stay(13)).nights).toBe(13);
  });

  test('2.2 accepts a stay of exactly 14 nights (the maximum)', () => {
    expect(calculatePrice(stay(14)).nights).toBe(14);
  });

  test('2.2 rejects a stay of 15 nights (above the maximum)', () => {
    expect(() => calculatePrice(stay(15))).toThrow();
  });

  test('3.1 total is the nightly rate times the number of nights', () => {
    expect(calculatePrice(stay(3))).toMatchObject({ nights: 3, subtotalCents: 30000, totalCents: 30000 });
  });

  test('3.2 Friday and Saturday nights are 20% more expensive', () => {
    expect(calculatePrice({ nightlyRateCents: rate, checkin: FRIDAY, checkout: addDays(FRIDAY, 2) })).toMatchObject({
      weekendNights: 2,
      totalCents: 24000
    });
  });

  test('3.2 Thursday night and Sunday night are charged the normal rate', () => {
    expect(calculatePrice({ nightlyRateCents: rate, checkin: '2027-03-04', checkout: FRIDAY })).toMatchObject({
      weekendNights: 0,
      totalCents: 10000
    });
    expect(calculatePrice({ nightlyRateCents: rate, checkin: '2027-03-07', checkout: '2027-03-08' })).toMatchObject({
      weekendNights: 0,
      totalCents: 10000
    });
  });

  test('3.4 a 100% discount gives a total of 0', () => {
    expect(calculatePrice(stay(2, { discountPercent: 100 })).totalCents).toBe(0);
  });

  test('3.4 a 50% discount halves the price', () => {
    expect(calculatePrice(stay(2, { discountPercent: 50 })).totalCents).toBe(10000);
  });

  test('3.4 a negative nightly rate is rejected', () => {
    expect(() => calculatePrice(stay(2, { nightlyRateCents: -10000 }))).toThrow();
  });

  test('3.4 a discount above 100% never produces a negative price', () => {
    // KÜSIMUS: kas üle 100% allahindlus tuleb tagasi lükata (viga) või piirata 100%-ga? Nõue ütleb vaid "kuni 100%".
    // Test lubab mõlemat, kuid hind ei tohi olla negatiivne.
    let totalCents;
    try {
      totalCents = calculatePrice(stay(2, { discountPercent: 150 })).totalCents;
    } catch (error) {
      return;
    }
    expect(totalCents).toBeGreaterThanOrEqual(0);
  });

  test('4.1 deposit is not required for a 6 night stay (below a week)', () => {
    expect(calculatePrice(stay(6)).depositRequired).toBe(false);
  });

  test('4.1 deposit is not required for exactly 7 nights', () => {
    // KÜSIMUS: "üle nädala" tähendab rangelt rohkem kui 7 ööd, aga kas 7 ööd on "nädal" (ei ole üle) või peab
    // sissemakse tulema juba 7 ööst? Siin on loetud nõuet sõna-sõnalt: 7 ööd ei ole "üle nädala".
    expect(calculatePrice(stay(7)).depositRequired).toBe(false);
  });

  test('4.1 deposit is required for an 8 night stay (over a week)', () => {
    expect(calculatePrice(stay(8)).depositRequired).toBe(true);
  });

  test('4.2 a regular customer does not have to pay a deposit', () => {
    expect(calculatePrice(stay(8, { isRegular: true })).depositRequired).toBe(false);
  });

  test('7.1 a regular customer can book 29 nights (below the limit)', () => {
    expect(calculatePrice(stay(29, { isRegular: true })).nights).toBe(29);
  });

  test('7.1 a regular customer can book exactly 30 nights (the limit)', () => {
    expect(calculatePrice(stay(30, { isRegular: true })).nights).toBe(30);
  });

  test('7.1 a regular customer cannot book 31 nights (above the limit)', () => {
    expect(() => calculatePrice(stay(31, { isRegular: true }))).toThrow();
  });
});
