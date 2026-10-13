// Session 5, Praktika 2: these tests pass on some runs and fail on others.
// Run them many times: npm run test:repeat -- 10
const { createBooking, recordAudit, listBookings, clearBookings } = require('../../src/booking/bookingStore');
const { calculatePrice, cancellationFee } = require('../../src/booking/priceCalculator');

const HOUR = 60 * 60 * 1000;

describe('booking store', () => {
  beforeEach(() => {
    clearBookings();
  });

  test('F1: first guest to submit gets the room when two book at once', async () => {
    // The store's write delay is random (5-40 ms), so the "first" request was decided by chance.
    // Pin the delays: Mari's write takes 5 ms, Jüri's 39 ms.
    const random = jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.99);
    let mari;
    let jyri;
    try {
      [mari, jyri] = await Promise.all([
        createBooking({ roomId: 201, guest: 'Mari', checkin: '2026-11-06', checkout: '2026-11-08' }),
        createBooking({ roomId: 201, guest: 'Jüri', checkin: '2026-11-07', checkout: '2026-11-09' })
      ]);
    } finally {
      random.mockRestore();
    }

    expect(mari.ok).toBe(true);
    expect(jyri.ok).toBe(false);
  });

  test('F2a: room 101 can be booked for 1-3 October', async () => {
    const result = await createBooking({
      roomId: 101, guest: 'Õie', checkin: '2026-10-01', checkout: '2026-10-03'
    });

    expect(result.ok).toBe(true);
  });

  test('F2b: room 101 can be booked for 2-4 October', async () => {
    const result = await createBooking({
      roomId: 101, guest: 'Šarlote', checkin: '2026-10-02', checkout: '2026-10-04'
    });

    expect(result.ok).toBe(true);
    expect(listBookings(101)).toHaveLength(1);
  });
});

describe('prices and cancellation', () => {
  test('F3: cancelling exactly 48 hours before check-in is free', async () => {
    const cancelledAt = Date.now();
    const checkinAt = cancelledAt + 48 * HOUR;
    await recordAudit('cancel-requested');

    expect(cancellationFee({ totalCents: 24000, checkinAt, cancelledAt })).toBe(0);
  });

  test('F4: any valid stay has a positive price', () => {
    // Valid stays are 1-14 nights (requirement 2.2); check every one instead of a random pick.
    for (let nights = 1; nights <= 14; nights += 1) {
      const checkout = new Date(Date.UTC(2026, 10, 2 + nights)).toISOString().slice(0, 10);

      const price = calculatePrice({
        nightlyRateCents: 8000,
        checkin: '2026-11-02',
        checkout
      });

      expect(price.totalCents).toBeGreaterThan(0);
    }
  });
});
