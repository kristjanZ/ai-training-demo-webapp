const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// Stsenaariumid: demo-scenarios/session-4-restful-booker/7_Brauseri_stsenaariumid.md
const BASE_URL = 'https://automationintesting.online';
const guest = {
  firstname: 'Test',
  lastname: 'Koolitus',
  email: 'test@example.com',
  phone: '+37255500000'
};

jest.setTimeout(60000);

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

// Random check-in 90-300 days ahead (UTC), day 1-26 so that both nights fall in one month.
function randomStay() {
  const now = new Date();
  const ahead = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 90 + Math.floor(Math.random() * 210)));
  let checkin;
  do {
    checkin = new Date(Date.UTC(ahead.getUTCFullYear(), ahead.getUTCMonth(), 1 + Math.floor(Math.random() * 26)));
  } while (checkin.getUTCDay() === 6); // Saturday + Sunday would sit in different calendar rows
  const checkout = new Date(checkin.getTime() + 2 * 24 * 60 * 60 * 1000);
  const monthsAhead = (checkin.getUTCFullYear() - now.getUTCFullYear()) * 12 + checkin.getUTCMonth() - now.getUTCMonth();
  return { checkin, checkout, monthsAhead };
}

describe('Booking UI (automationintesting.online)', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options().addArguments('--window-size=1280,1000');
    if (!process.env.HEADED) options.addArguments('--headless=new');
    driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  });

  afterAll(async () => {
    if (driver) await driver.quit();
  });

  async function scrollAndClick(element) {
    // The page keeps shifting while images load, so scroll again and retry if the click is intercepted.
    for (let attempt = 1; ; attempt += 1) {
      await driver.executeScript('arguments[0].scrollIntoView({ block: "center" });', element);
      await driver.wait(until.elementIsVisible(element), 5000);
      await driver.sleep(300);
      try {
        await element.click();
        return;
      } catch (error) {
        if (error.name !== 'ElementClickInterceptedError' || attempt === 5) throw error;
      }
    }
  }

  async function clickButton(text) {
    const button = await driver.wait(until.elementLocated(By.xpath(`//button[normalize-space()="${text}"]`)), 10000, `button "${text}" not found`);
    await scrollAndClick(button);
  }

  async function pageText() {
    return driver.findElement(By.css('body')).getText();
  }

  async function fillForm(values) {
    for (const [name, value] of Object.entries(values)) {
      const input = await driver.wait(until.elementLocated(By.css(`input[name="${name}"]`)), 10000, `input ${name} not found`);
      await input.sendKeys(value);
    }
  }

  async function openFirstRoom() {
    await driver.get(BASE_URL);
    const bookNow = await driver.wait(until.elementLocated(By.xpath('(//a[normalize-space()="Book now"])[1]')), 15000);
    // A click made while the page is still loading is sometimes ignored, so click again until we leave the home page.
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await scrollAndClick(bookNow);
      try {
        await driver.wait(until.urlContains('/reservation/'), 5000);
        break;
      } catch (error) {
        if (attempt === 3) throw error;
      }
    }
    try {
      await driver.wait(until.elementLocated(By.css('.rbc-calendar')), 15000);
    } catch (error) {
      throw new Error(`Calendar not shown at ${await driver.getCurrentUrl()}. Page text: ${(await pageText()).slice(0, 300)}`);
    }
  }

  async function selectNights({ checkin, monthsAhead }) {
    for (let i = 0; i < monthsAhead; i += 1) {
      await clickButton('Next');
    }
    const monthLabel = checkin.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    await driver.wait(
      async () => (await driver.findElement(By.css('.rbc-toolbar-label')).getText()) === monthLabel,
      10000,
      `calendar did not reach ${monthLabel}`
    );
    // The calendar listens for mouse events on the background cells, not on the date buttons.
    const dayCell = async (date) => {
      const label = String(date.getUTCDate()).padStart(2, '0');
      const [button] = await driver.findElements(By.xpath(
        `//div[contains(@class,"rbc-date-cell") and not(contains(@class,"rbc-off-range"))][button[normalize-space()="${label}"]]`
      ));
      const row = await button.findElement(By.xpath('ancestor::div[contains(@class,"rbc-month-row")]'));
      const position = await driver.executeScript(
        'return Array.prototype.indexOf.call(arguments[0].parentNode.children, arguments[0]);',
        button
      );
      const backgrounds = await row.findElements(By.css('.rbc-day-bg'));
      return backgrounds[position];
    };
    const nextDay = new Date(checkin.getTime() + 24 * 60 * 60 * 1000);
    const first = await dayCell(checkin);
    const second = await dayCell(nextDay);
    await driver.executeScript('arguments[0].scrollIntoView({ block: "center" });', first);
    await driver.actions({ async: true })
      .move({ origin: first })
      .press()
      .move({ origin: first, x: 3, y: 3 })
      .move({ origin: second })
      .move({ origin: second, x: 2, y: 2 })
      .release()
      .perform();
    try {
      await driver.wait(async () => /2 nights/.test(await pageText()), 3000);
      return true;
    } catch (error) {
      return false; // days already booked by someone else on the shared demo site cannot be selected
    }
  }

  // Picks random free dates: the demo site is shared, so some days are already taken and cannot be selected.
  async function startReservation() {
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      const stay = randomStay();
      await openFirstRoom();
      if (await selectNights(stay)) {
        await clickButton('Reserve Now');
        return stay;
      }
    }
    throw new Error('No free 2-night stay found in 8 random attempts');
  }

  test('S1 booking with valid data shows "Booking Confirmed" and the chosen dates', async () => {
    // The server answers 409 for dates that are already booked, even if the calendar let us pick them,
    // and the page then shows "This page couldn't load". That is a test-data clash on the shared
    // demo site, so retry with new random dates instead of failing.
    let stay;
    let text;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      stay = await startReservation();
      await fillForm(guest);
      await clickButton('Reserve Now');
      await driver.wait(async () => {
        text = await pageText();
        return text.includes('Booking Confirmed') || text.includes("This page couldn’t load");
      }, 15000, 'neither confirmation nor error page appeared');
      if (text.includes('Booking Confirmed')) break;
    }

    expect(text).toContain('Booking Confirmed');
    expect(text).toContain(isoDate(stay.checkin));
    expect(text).toContain(isoDate(stay.checkout));
  });

  test('S2 empty Firstname does not confirm the booking and the error names the field', async () => {
    const stay = await startReservation();
    await fillForm({ lastname: guest.lastname, email: guest.email, phone: guest.phone });
    await clickButton('Reserve Now');

    await driver.sleep(2000);
    const text = await pageText();
    expect(text).not.toContain('Booking Confirmed');
    expect(text).toMatch(/first\s?name/i);
  });

  test('S3 checkout before checkin shows no negative nights or price', async () => {
    await driver.get(`${BASE_URL}/reservation/1?checkin=2026-12-12&checkout=2026-12-10`);
    await driver.wait(until.elementLocated(By.xpath('//*[contains(text(),"Price Summary")]')), 15000);
    const text = await pageText();
    const summary = text.slice(text.indexOf('Price Summary'), text.indexOf('Reserve Now'));

    expect(summary).not.toMatch(/-\s?\d/);
    expect(summary).not.toMatch(/£\s?-/);
  });
});
