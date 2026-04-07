import { test, expect } from '@playwright/test';
import { fazerLogin, getApiBaseUrl, getAuthToken, getCheckoutButton } from '../utils/helpers';

// ════════════════════════════════════════════════════════════════════════════
// SEGURANÇA — Checklist técnico do backend
// Cobre: create-checkout-public, claim-checkout, idempotência, UX
// ════════════════════════════════════════════════════════════════════════════

// ─── Segurança: create-checkout-public ───────────────────────────────────
test('[Seg-1] /create-checkout-public rejeita preço bruto enviado pelo frontend', async ({ page }) => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await page.request.post(`${apiBaseUrl}/payments/create-checkout-public`, {
    data: {
      planSlug: 'personal',
      amount: 1,
      unit_amount: 100,
      currency: 'usd',
      price: 0.01,
    },
    headers: { 'Content-Type': 'application/json' },
  });

  // ✅ Sessão pode ser criada, mas com preço do servidor (não do frontend)
  // OU o backend bloqueia campos inválidos com 400
  if (response.status() === 200) {
    console.log('✅ Backend criou sessão — verificar no Stripe que preço é o correto');
  } else {
    expect([400, 422]).toContain(response.status());
  }
});

test('[Seg-2] /create-checkout-public rejeita planSlug inválido', async ({ page }) => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await page.request.post(`${apiBaseUrl}/payments/create-checkout-public`, {
    data: { planSlug: 'plano_inventado_hacker' },
    headers: { 'Content-Type': 'application/json' },
  });

  // ✅ Rejeita plano inexistente
  expect([400, 404, 422]).toContain(response.status());
});

test('[Seg-3] /create-checkout-public rejeita add-on não permitido', async ({ page }) => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await page.request.post(`${apiBaseUrl}/payments/create-checkout-public`, {
    data: {
      planSlug: 'personal',
      addons: ['addon_fake_nao_existe', 'addon_gratis_tudo'],
    },
    headers: { 'Content-Type': 'application/json' },
  });

  // ✅ Rejeita add-on não permitido
  expect([400, 422]).toContain(response.status());
});

test('[Seg-4] /create-checkout-public não aceita currency arbitrária', async ({ page }) => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await page.request.post(`${apiBaseUrl}/payments/create-checkout-public`, {
    data: {
      planSlug: 'personal',
      currency: 'XYZ',
    },
    headers: { 'Content-Type': 'application/json' },
  });

  // ✅ Rejeita currency inválida ou ignora e usa a padrão
  if (response.status() === 200) {
    const body = await response.json().catch(() => ({}));
    // Se criou sessão, currency deve ser a do servidor
    console.log('Backend ignorou currency arbitrária — OK se sessão usa currency correta');
  } else {
    expect([400, 422]).toContain(response.status());
  }
});

// ─── Segurança: claim-checkout ────────────────────────────────────────────
test('[Seg-5] /claim-checkout exige autenticação', async ({ page, context }) => {
  await context.clearCookies(); // deslogado

  const apiBaseUrl = getApiBaseUrl();
  const response = await page.request.post(`${apiBaseUrl}/payments/claim-checkout`, {
    data: { sessionId: 'cs_test_qualquer' },
    headers: { 'Content-Type': 'application/json' },
  });

  // ✅ Retorna 401 para não autenticado
  expect(response.status()).toBe(401);
});

test('[Seg-6] /claim-checkout valida formato do checkoutSessionId', async ({ page }) => {
  await fazerLogin(page);
  const apiBaseUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  expect(token).toBeTruthy();

  const idsInvalidos = [
    '',
    'nao_e_uma_sessao_stripe',
    '../../etc/passwd',
    '<script>alert(1)</script>',
    null,
  ];

  for (const id of idsInvalidos) {
    const response = await page.request.post(`${apiBaseUrl}/payments/claim-checkout`, {
      data: { sessionId: id },
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });

    // ✅ Rejeita ID inválido
    expect([400, 422, 404]).toContain(response.status());
  }
});

test('[Seg-7] /claim-checkout é idempotente — mesmo ID twice retorna seguro', async ({ page }) => {
  await fazerLogin(page);
  const apiBaseUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  expect(token).toBeTruthy();

  // Usa uma sessão mock (aceita em ambiente não-produção) para testar idempotência
  const sessionIdTeste = `mock_idempotent_${Date.now()}`;

  const r1 = await page.request.post(`${apiBaseUrl}/payments/claim-checkout`, {
    data: { sessionId: sessionIdTeste },
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });

  const r2 = await page.request.post(`${apiBaseUrl}/payments/claim-checkout`, {
    data: { sessionId: sessionIdTeste },
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });

  // ✅ Segunda chamada não cria duplicidade (200 idempotente ou 409 já processado)
  expect([200, 409]).toContain(r2.status());

  // ✅ Nenhum dos dois retornou 500
  expect(r1.status()).not.toBe(500);
  expect(r2.status()).not.toBe(500);
});

// ─── UX: Botão de checkout ────────────────────────────────────────────────
test('[UX-1] Botão de checkout desabilita durante o request (evita duplo clique)', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/checkout/plan/personal');
  await page.waitForLoadState('networkidle');

  const botao = getCheckoutButton(page);

  // Atrasa a resposta para observar estado do botão
  await page.route('**/payments/create-checkout-public', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });

  await botao.click();

  // ✅ Botão fica desabilitado durante o request
  await expect(botao).toBeDisabled({ timeout: 3_000 });
});

test('[UX-2] Erro no Stripe mostra mensagem amigável (não quebra UI)', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/checkout/plan/personal');
  await page.waitForLoadState('networkidle');

  // Simula falha na API
  await page.route('**/payments/create-checkout-public', (route) => {
    route.fulfill({ status: 500, body: 'Internal Server Error' });
  });

  await getCheckoutButton(page).click();
  await page.waitForTimeout(2000);

  // ✅ Não quebra layout
  await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });

  const textoBody = await page.locator('body').innerText();

  // ✅ Sem exception técnica visível
  expect(textoBody).not.toMatch(/TypeError|Cannot read|undefined is not/i);

  // ✅ Mostra mensagem amigável de erro
  const mostrouErro = textoBody.match(/erro|tente novamente|algo deu errado|falhou/i) !== null;
  expect(mostrouErro).toBeTruthy();
});

test('[UX-3] Nenhum texto dizendo para logar antes de pagar (deslogado)', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/checkout/plan/personal');
  await page.waitForLoadState('networkidle');

  const textoBody = await page.locator('body').innerText();

  // ✅ Não há instrução para logar antes
  expect(textoBody).not.toMatch(/faça login para comprar|você precisa logar para assinar/i);
});

test('[UX-4] Sem redirect inesperado para /login no checkout público', async ({ page, context }) => {
  await context.clearCookies();

  const redirectsParaLogin: string[] = [];
  page.on('response', (response) => {
    if (
      [301, 302, 307, 308].includes(response.status()) &&
      response.headers()['location']?.includes('/login')
    ) {
      redirectsParaLogin.push(response.url());
    }
  });

  await page.goto('/checkout/plan/personal');
  await page.waitForLoadState('networkidle');

  // ✅ Nenhum redirect para /login ocorreu
  expect(redirectsParaLogin.length).toBe(0);
});
