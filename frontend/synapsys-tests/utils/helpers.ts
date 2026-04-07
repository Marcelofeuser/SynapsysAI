import { Page, expect } from '@playwright/test';

export const STRIPE_CARD = {
  number: process.env.STRIPE_TEST_CARD || '4242424242424242',
  expiry: process.env.STRIPE_TEST_EXPIRY || '12/26',
  cvc: process.env.STRIPE_TEST_CVC || '123',
  zip: process.env.STRIPE_TEST_ZIP || '12345',
};

const DEFAULT_TIMEOUT_MS = 30_000;

export const STRIPE_CHECKOUT_URL_REGEX = /checkout\.stripe\.com/;
export const STRIPE_CHECKOUT_TIMEOUT_MS = (() => {
  const value = Number(process.env.STRIPE_CHECKOUT_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : 45_000;
})();

export async function preencherCartaoStripe(page: Page) {
  const stripeEmail = process.env.TEST_USER_EMAIL || 'teste@example.com';

  await page.waitForTimeout(1500);

  // Stripe Checkout costuma exigir e-mail e nome do titular fora do iframe do cartão.
  // Aguarda aparecer e preenche para evitar validação bloqueando o submit.
  const emailInput = page
    .locator('input[name="email"], input[type="email"], input[autocomplete="email"], input[placeholder*="e-mail" i]')
    .first();
  await emailInput.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => null);
  if ((await emailInput.count().catch(() => 0)) > 0) {
    await emailInput.fill(stripeEmail);
  }

  const cardholderInput = page
    .locator('input[autocomplete="cc-name"], input[placeholder*="nome" i], input[placeholder*="name" i]')
    .first();
  await cardholderInput.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => null);
  if ((await cardholderInput.count().catch(() => 0)) > 0) {
    await cardholderInput.fill('Teste InsightDISC');
  }

  await page.waitForSelector('iframe[name*="__privateStripeFrame"]', { timeout: 20_000 });

  const selectors = {
    cardNumber: [
      '[placeholder="Card number"]',
      '[placeholder="Número do cartão"]',
      '[aria-label="Card number"]',
      '[aria-label="Número do cartão"]',
    ],
    expiry: [
      '[placeholder="MM / YY"]',
      '[placeholder="MM / AA"]',
      '[aria-label="Expiration date"]',
      '[aria-label="Data de validade"]',
      '[aria-label="Expiry date"]',
    ],
    cvc: [
      '[placeholder="CVC"]',
      '[aria-label="CVC"]',
      '[aria-label="Security code"]',
      '[aria-label="Código de segurança"]',
    ],
    zip: [
      '[placeholder="ZIP"]',
      '[placeholder="CEP"]',
      '[placeholder="Postal code"]',
      '[aria-label="ZIP"]',
      '[aria-label="CEP"]',
      '[aria-label="Postal code"]',
    ],
  } as const;

  const findAndFill = async (selector: string, value: string) => {
    for (const frame of page.frames()) {
      try {
        const input = frame.locator(selector).first();
        if ((await input.count()) > 0) {
          await input.fill(value);
          return true;
        }
      } catch {
        // ignore frame errors
      }
    }
    return false;
  };

  const cardSelector = selectors.cardNumber.join(',');
  await expect
    .poll(async () => {
      for (const frame of page.frames()) {
        const count = await frame.locator(cardSelector).count().catch(() => 0);
        if (count > 0) return true;
      }
      return false;
    })
    .toBe(true);

  const filledNumber = await findAndFill(cardSelector, STRIPE_CARD.number);
  if (!filledNumber) {
    throw new Error('Stripe card number input not found');
  }

  const filledExpiry = await findAndFill(selectors.expiry.join(','), STRIPE_CARD.expiry);
  if (!filledExpiry) {
    throw new Error('Stripe expiry input not found');
  }

  const filledCvc = await findAndFill(selectors.cvc.join(','), STRIPE_CARD.cvc);
  if (!filledCvc) {
    throw new Error('Stripe CVC input not found');
  }

  await findAndFill(selectors.zip.join(','), STRIPE_CARD.zip);
}

export async function fazerLogin(page: Page, email?: string, password?: string) {
  const _email = email || process.env.TEST_USER_EMAIL || '';
  const _pass = password || process.env.TEST_USER_PASSWORD || '';
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.locator('#login-email').fill(_email);
  await page.locator('#login-password').fill(_pass);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/dashboard|painel|home|\/app|assessment|pricing|planos/i, { timeout: DEFAULT_TIMEOUT_MS });
}

export async function capturarRequisicao(page: Page, urlParcial: string) {
  return page.waitForRequest(
    (req) => req.url().includes(urlParcial) && req.method() === 'POST',
    { timeout: DEFAULT_TIMEOUT_MS }
  );
}

export async function naoDeveCairNoLogin(page: Page) {
  await expect(page).not.toHaveURL(/\/login/, { timeout: 5_000 });
}

export async function aguardarURL(page: Page, trecho: string) {
  await page.waitForURL((url) => url.href.includes(trecho), { timeout: 40_000 });
}

export async function aguardarStripeCheckout(page: Page, timeoutMs: number = STRIPE_CHECKOUT_TIMEOUT_MS) {
  await page.waitForURL(STRIPE_CHECKOUT_URL_REGEX, { timeout: timeoutMs });
}

export function getCheckoutButton(page: Page) {
  return page.getByRole('button', { name: /finalizar pagamento/i });
}

export function getApiBaseUrl() {
  return process.env.API_BASE_URL || process.env.API_URL || 'http://localhost:4000';
}

export async function getAuthToken(page: Page) {
  return page.evaluate(() => {
    return (
      window.localStorage.getItem('insightdisc_token') ||
      window.localStorage.getItem('insightdisc_api_token') ||
      window.localStorage.getItem('insight_api_token') ||
      window.localStorage.getItem('server_api_token') ||
      ''
    );
  });
}
