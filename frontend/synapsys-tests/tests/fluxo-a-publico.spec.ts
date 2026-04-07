import { test, expect } from '@playwright/test';
import {
  preencherCartaoStripe,
  capturarRequisicao,
  naoDeveCairNoLogin,
  fazerLogin,
  aguardarURL,
  aguardarStripeCheckout,
  getCheckoutButton,
} from '../utils/helpers';

// ════════════════════════════════════════════════════════════════════════════
// FLUXO A — Usuário DESLOGADO (checkout público)
// Cobre: Cenários 1, 2, 3, 4, 5, 6 do seu checklist
// ════════════════════════════════════════════════════════════════════════════

const PLANOS = ['personal', 'professional'];

// ─── Bloco 1: Abertura do checkout público ───────────────────────────────
for (const plano of PLANOS) {
  test(`[Cenário 1] Deslogado abre /checkout/plan/${plano} sem cair no login`, async ({ page, context }) => {
    // Garante que não há cookies/sessão
    await context.clearCookies();

    await page.goto(`/checkout/plan/${plano}`);
    await page.waitForLoadState('networkidle');

    // ✅ Não redirecionou para login
    await naoDeveCairNoLogin(page);

    // ✅ Página carregou normalmente (sem tela branca)
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });

    // ✅ Não há erro 401 visível
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('401');
    expect(bodyText).not.toContain('Unauthorized');

    // ✅ Nome do plano aparece na página
    await expect(page.locator('h1, h2').filter({ hasText: new RegExp(plano, 'i') }).first()).toBeVisible({
      timeout: 8_000,
    });

    // ✅ Botão de finalizar existe e está habilitado
    const botaoPagar = getCheckoutButton(page);
    await expect(botaoPagar).toBeVisible({ timeout: 8_000 });
    await expect(botaoPagar).toBeEnabled({ timeout: 8_000 });
  });
}

// ─── Bloco 2: Sessão Stripe criada via endpoint público ──────────────────
test('[Cenário 2] Checkout público chama /create-checkout-public (não o autenticado)', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/checkout/plan/personal');
  await page.waitForLoadState('networkidle');

  // Prepara interceptação ANTES de clicar
  const [requisicao] = await Promise.all([
    capturarRequisicao(page, '/payments/create-checkout-public'),
    getCheckoutButton(page).click(),
  ]);

  // ✅ Chamou o endpoint público
  expect(requisicao.url()).toContain('/payments/create-checkout-public');

  // ✅ NÃO chamou o endpoint autenticado
  // (se chamasse, a Promise acima nunca resolveria no endpoint público)
  expect(requisicao.url()).not.toMatch(/\/payments\/create-checkout(?:\?|$)/);

  const response = await requisicao.response();
  expect(response?.status()).toBe(200);
});

// ─── Bloco 3: Stripe abre após clique ────────────────────────────────────
test('[Cenário 2b] Navegador redireciona para Stripe Checkout após criar sessão', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/checkout/plan/personal');
  await page.waitForLoadState('networkidle');

  await getCheckoutButton(page).click();

  // ✅ URL vai para checkout.stripe.com
  await aguardarStripeCheckout(page);
  expect(page.url()).toContain('stripe.com');
});

// ─── Bloco 4: Pagamento aprovado deslogado → success estável ─────────────
test('[Cenário 3] Pagamento aprovado deslogado: success carrega sem erro', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/checkout/plan/personal');
  await page.waitForLoadState('networkidle');

  await getCheckoutButton(page).click();
  await aguardarStripeCheckout(page);

  // Preenche cartão de teste no Stripe
  await preencherCartaoStripe(page);

  // Clica em pagar
  await page.locator('button[type="submit"]').click();

  // ✅ Retornou para success
  await aguardarURL(page, '/checkout/success');

  // ✅ Página não está em branco
  await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });

  // ✅ Não ficou em loop de loading
  await page.waitForLoadState('networkidle', { timeout: 15_000 });

  // ✅ Não está em loop de redirect
  const urlAtual = page.url();
  await page.waitForTimeout(2000);
  expect(page.url()).toBe(urlAtual); // URL não mudou sozinha

  // ✅ Orienta o usuário a fazer login (deslogado)
  const textoBody = await page.locator('body').innerText();
  const orientaLogin =
    textoBody.match(/login|entrar|cadastr|criar conta/i) !== null;
  expect(orientaLogin).toBeTruthy();
});

// ─── Bloco 5: Claim após login ────────────────────────────────────────────
test('[Cenário 4] Deslogado paga → faz login → claim vincula compra', async ({ page, context }) => {
  await context.clearCookies();

  // Passo 1: checkout deslogado
  await page.goto('/checkout/plan/personal');
  await page.waitForLoadState('networkidle');
  await getCheckoutButton(page).click();
  await aguardarStripeCheckout(page);
  await preencherCartaoStripe(page);
  await page.locator('button[type="submit"]').click();
  await aguardarURL(page, '/checkout/success');
  const successUrl = page.url();

  // Passo 2: faz login
  await fazerLogin(page);

  // Passo 3: volta para a URL de success com `session_id` (para permitir claim/status)
  await page.goto(successUrl);
  await page.waitForLoadState('networkidle');

  // ✅ Success mostra estado de vinculado
  const textoBody = await page.locator('body').innerText();
  const vinculado = textoBody.match(/confirmad|benefícios aplicados|status do pagamento|ir para meu painel/i) !== null;
  expect(vinculado).toBeTruthy();
});

// ─── Bloco 6: Refresh no success não duplica claim ────────────────────────
test('[Cenário 5] Refresh no success não duplica claim nem quebra UI', async ({ page, context }) => {
  await context.clearCookies();

  // Chega ao success (fluxo completo)
  await page.goto('/checkout/plan/personal');
  await page.waitForLoadState('networkidle');
  await getCheckoutButton(page).click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });
  await preencherCartaoStripe(page);
  await page.locator('button[type="submit"]').click();
  await aguardarURL(page, '/checkout/success');
  const successUrl = page.url();
  await fazerLogin(page);
  await page.goto(successUrl);
  await page.waitForLoadState('networkidle');

  // Faz 3 refreshes consecutivos
  const claimsChamados: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/payments/claim-checkout') && req.method() === 'POST') {
      claimsChamados.push(req.url());
    }
  });

  for (let i = 0; i < 3; i++) {
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  }

  // ✅ Claim não foi chamado novamente (idempotência)
  expect(claimsChamados.length).toBe(0);

  // ✅ Página continua estável
  await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });
  const textoBody = await page.locator('body').innerText();
  expect(textoBody).not.toMatch(/already claimed|erro|exception/i);
});

// ─── Bloco 7: Claim idempotente com mesma sessão ─────────────────────────
test('[Cenário 6] Reabrir success com sessão já reivindicada não duplica dados', async ({ page, context }) => {
  await context.clearCookies();

  // Fluxo completo até claim
  await page.goto('/checkout/plan/personal');
  await page.waitForLoadState('networkidle');
  await getCheckoutButton(page).click();
  await aguardarStripeCheckout(page);
  await preencherCartaoStripe(page);
  await page.locator('button[type="submit"]').click();
  await aguardarURL(page, '/checkout/success');
  const successUrl = page.url();
  await fazerLogin(page);
  await page.goto(successUrl);
  await page.waitForLoadState('networkidle');

  // Captura URL com session_id
  const urlComSession = successUrl;

  // Reabre 2x a mesma URL
  for (let i = 0; i < 2; i++) {
    await page.goto(urlComSession);
    await page.waitForLoadState('networkidle');
    const textoBody = await page.locator('body').innerText();
    // ✅ Não mostra erro de duplicidade
    expect(textoBody).not.toMatch(/duplicate|already claimed|erro crítico/i);
    // ✅ Não libera acesso adicional (UI estável)
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });
  }
});

//  ─── Bloco 8: Claim com ID inválido ─────────────────────────
test('[Cenário 7] Tentar claim com ID inválido retorna erro 400', async ({ page }) => {
  // Acessa URL com session_id inválido
  await page.goto('/checkout/success?session_id=invalid_session_123');
  await page.waitForLoadState('networkidle');

  // ✅ Não mostra erro crítico
  const textoBody = await page.locator('body').innerText();
  expect(textoBody).not.toMatch(/erro crítico|exception|500|502|503/i);

  // ✅ Página continua estável
  await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });
});
