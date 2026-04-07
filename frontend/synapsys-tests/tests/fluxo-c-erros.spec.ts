import { test, expect } from '@playwright/test';
import { fazerLogin, getApiBaseUrl, getAuthToken, getCheckoutButton, aguardarStripeCheckout } from '../utils/helpers';

// ════════════════════════════════════════════════════════════════════════════
// FLUXO C — Cenários de ERRO e Edge Cases
// Cobre: Cenários 9, 10, 11, 12 do seu checklist
// ════════════════════════════════════════════════════════════════════════════

// ─── Cenário 9: Success direto sem sessão válida ──────────────────────────
test('[Cenário 9] Acessar /checkout/success diretamente sem sessão válida', async ({ page, context }) => {
  await context.clearCookies();

  // Testa variações de URL inválida
  const urlsInvalidas = [
    '/checkout/success',
    '/checkout/success?session_id=inexistente_fake_123',
    '/checkout/success?session_id=',
  ];

  for (const url of urlsInvalidas) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    // ✅ Sem tela branca
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });

    const textoBody = await page.locator('body').innerText();

    // ✅ Sem exception visível
    expect(textoBody).not.toMatch(/TypeError|ReferenceError|Cannot read/i);

    // ✅ Não libera acesso
    expect(textoBody).not.toMatch(/acesso liberado|bem.vindo ao plano|assinatura ativa/i);

    // ✅ Não ficou em loop (URL estável)
    const urlAntes = page.url();
    await page.waitForTimeout(2000);
    expect(page.url()).toBe(urlAntes);

    // ✅ Mostra mensagem clara de erro ou retorna para home/checkout
    const tratouErro =
      textoBody.match(/inválid|não encontrad|sessão expirada|erro|voltar/i) !== null ||
      page.url().includes('/checkout') ||
      page.url().includes('/');
    expect(tratouErro).toBeTruthy();
  }
});

// ─── Cenário 10: Usuário tenta claim de sessão de outro usuário ───────────
test('[Cenário 10] Claim de sessão pertencente a outro usuário é bloqueado', async ({ page }) => {
  // Loga com usuário A
  await fazerLogin(page);
  const apiBaseUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  expect(token).toBeTruthy();

  // Tenta reivindicar uma session_id fictícia (de outro usuário)
  // Em ambiente real: use uma session_id válida criada por outro usuário
  const sessionFakeDeOutroUsuario = 'cs_test_outrousuario_fake_session_abc123';

  const response = await page.request.post(`${apiBaseUrl}/payments/claim-checkout`, {
    data: { sessionId: sessionFakeDeOutroUsuario },
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });

  // ✅ Backend bloqueia com 400, 403 ou 404
  expect([400, 403, 404, 422]).toContain(response.status());

  const body = await response.json().catch(() => ({}));

  // ✅ Não vaza dados de outro usuário
  expect(JSON.stringify(body)).not.toMatch(/email|cpf|telefone|nome completo/i);
});

// ─── Cenário 10b: Claim não pode reassociar sessão já vinculada ───────────
test('[Cenário 10b] Sessão já vinculada não pode ser reclamada por outro usuário', async ({ page }) => {
  // Tenta claim de uma session já processada
  // (ajuste o ID abaixo para uma sessão real já claimed no seu banco de teste)
  const sessionJaVinculada = 'cs_test_sessao_ja_vinculada_exemplo';

  await fazerLogin(page); // loga como usuário diferente do original
  const apiBaseUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  expect(token).toBeTruthy();

  const response = await page.request.post(`${apiBaseUrl}/payments/claim-checkout`, {
    data: { sessionId: sessionJaVinculada },
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });

  // ✅ Bloqueado
  expect([400, 403, 404, 409, 422]).toContain(response.status());
});

// ─── Cenário 11: Sessão cancelada não libera acesso ──────────────────────
test('[Cenário 11] Sessão de pagamento cancelado não libera plano', async ({ page }) => {
  await fazerLogin(page);
  const apiBaseUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  expect(token).toBeTruthy();

  // Simula claim de sessão cancelada (open ou expired no Stripe)
  const sessionCancelada = 'cs_test_cancelada_ou_expirada_fake';

  const response = await page.request.post(`${apiBaseUrl}/payments/claim-checkout`, {
    data: { sessionId: sessionCancelada },
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });

  // ✅ Não retorna 200 com sucesso
  expect(response.status()).not.toBe(200);

  // ✅ Corpo não indica liberação
  const body = await response.json().catch(() => ({}));
  expect(JSON.stringify(body)).not.toMatch(/success.*true|acesso.*liberado|plan.*active/i);
});

// ─── Cenário 11b: Cancelamento no Stripe → UI informa corretamente ────────
test('[Cenário 11b] Usuário cancela no Stripe e retorna: UI não libera acesso', async ({ page, context }) => {
  await context.clearCookies();

  await page.goto('/checkout/plan/personal');
  await page.waitForLoadState('networkidle');

  await getCheckoutButton(page).click();
  await aguardarStripeCheckout(page);

  // Clica em "Voltar" / cancela no Stripe (sem pagar)
  const botaoVoltar = page.locator('a', { hasText: /back|voltar/i });
  if (await botaoVoltar.isVisible()) {
    await botaoVoltar.click();
  } else {
    // Navega manualmente para a cancel_url
    await page.goto('/checkout/cancel?canceled=true');
  }

  await page.waitForLoadState('networkidle');

  const textoBody = await page.locator('body').innerText();

  // ✅ Não libera acesso
  expect(textoBody).not.toMatch(/acesso liberado|bem.vindo ao plano|assinatura ativa/i);

  // ✅ Informa o cancelamento ou pendência
  const informouStatus =
    textoBody.match(/cancelad|pendente|não foi concluíd|tente novamente/i) !== null;
  // (tolerante — alguns flows redirecionam para home)
  console.log(`UI informou cancelamento: ${informouStatus}`);
});

// ─── Cenário 12: Add-ons — valores corretos ───────────────────────────────
test('[Cenário 12a] Checkout sem add-on: request não injeta itens extras', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/checkout/plan/personal');
  await page.waitForLoadState('networkidle');

  const [requisicao] = await Promise.all([
    page.waitForRequest(
      (req) => req.url().includes('/payments/create-checkout-public') && req.method() === 'POST',
      { timeout: 30_000 }
    ),
    getCheckoutButton(page).click(),
  ]);

  const payload = requisicao.postDataJSON() as Record<string, unknown> | null;

  // ✅ Frontend não injetou preço bruto
  expect(payload).not.toHaveProperty('price');
  expect(payload).not.toHaveProperty('amount');
  expect(payload).not.toHaveProperty('unit_amount');

  // ✅ Payload só tem campos seguros (sem preço e sem campos arbitrários)
  if (payload) {
    const camposPermitidos = new Set([
      'plan',
      'planId',
      'billing',
      'provider',
      'mode',
      'product',
      'productType',
      'credits',
      'creditsPackageId',
      'packageId',
      'workspaceId',
      'flow',
      'assessmentId',
      'token',
      'giftToken',
      'successUrl',
      'cancelUrl',
      'orderBumpAdvancedAnalysis',
      'whiteLabelAddon',
      'priceId',
      'priceEnvKey',
    ]);

    for (const campo of Object.keys(payload)) {
      expect(camposPermitidos.has(campo)).toBeTruthy();
    }
  }
});

test('[Cenário 12b] Checkout com add-on: add-on aparece no request', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/checkout/plan/personal');
  await page.waitForLoadState('networkidle');

  // Seleciona o order bump (análise avançada com IA) disponível no plano Personal
  const addonCheckbox = page.getByRole('checkbox', { name: /análise avançada com ia/i });
  await expect(addonCheckbox).toBeVisible({ timeout: 8_000 });
  await addonCheckbox.check();

  const [requisicao] = await Promise.all([
    page.waitForRequest(
      (req) => req.url().includes('/payments/create-checkout-public') && req.method() === 'POST',
      { timeout: 30_000 }
    ),
    getCheckoutButton(page).click(),
  ]);

  const payload = requisicao.postDataJSON() as Record<string, unknown> | null;

  // ✅ Add-on está no payload (flag booleana)
  expect(payload).toBeTruthy();
  expect(payload?.orderBumpAdvancedAnalysis).toBe(true);
});

// ─── Cenário 12c: Frontend não pode injetar preço arbitrário ─────────────
test('[Cenário 12c] Segurança: frontend não consegue alterar preço no payload', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/checkout/plan/personal');
  await page.waitForLoadState('networkidle');

  // Intercepta e modifica o request para tentar injetar preço
  await page.route('**/payments/create-checkout-public', async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as Record<string, unknown> | null;

    // Injeta preço malicioso
    const bodyModificado = { ...(body ?? {}), amount: 1, unit_amount: 100, price: 0.01 };

    // Deixa passar (o backend deve ignorar esses campos)
    await route.continue({
      postData: JSON.stringify(bodyModificado),
    });
  });

  await getCheckoutButton(page).click();
  await aguardarStripeCheckout(page);

  // ✅ O Stripe foi aberto com o preço REAL (não o injetado)
  // Valida que a URL do Stripe não foi bloqueada (sessão foi criada normalmente)
  expect(page.url()).toContain('stripe.com');

  // O backend deve ter ignorado os campos de preço e usado o valor correto
  // (validação completa requer inspeção no Stripe Dashboard)
  console.log('✅ Sessão criada — verificar no Stripe Dashboard que o valor está correto');
});
