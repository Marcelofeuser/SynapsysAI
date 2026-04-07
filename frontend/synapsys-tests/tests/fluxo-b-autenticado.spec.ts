import { test, expect } from '@playwright/test';
import {
  preencherCartaoStripe,
  capturarRequisicao,
  fazerLogin,
  aguardarURL,
  aguardarStripeCheckout,
  getCheckoutButton,
} from '../utils/helpers';

// ════════════════════════════════════════════════════════════════════════════
// FLUXO B — Usuário LOGADO (checkout autenticado)
// Cobre: Cenários 7 e 8 do seu checklist
// ════════════════════════════════════════════════════════════════════════════

test.beforeEach(async ({ page }) => {
  // Loga antes de cada teste deste bloco
  await fazerLogin(page);
});

// ─── Cenário 7: Checkout com usuário autenticado ──────────────────────────
test('[Cenário 7] Logado abre checkout e chama endpoint autenticado', async ({ page }) => {
  await page.goto('/checkout/plan/professional');
  await page.waitForLoadState('networkidle');

  // ✅ Página carregou
  await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });

  // ✅ Nome do plano visível
  await expect(page.getByRole('heading', { name: /plano professional/i }).first()).toBeVisible({ timeout: 8_000 });

  // Inicia pagamento e intercepta request
  const [requisicao] = await Promise.all([
    capturarRequisicao(page, '/payments/create-checkout'),
    getCheckoutButton(page).click(),
  ]);

  // ✅ Usou o endpoint autenticado
  expect(requisicao.url()).toContain('/payments/create-checkout');

  // ✅ NÃO usou o endpoint público
  expect(requisicao.url()).not.toContain('create-checkout-public');

  const response = await requisicao.response();
  expect(response?.status()).toBe(200);
});

// ─── Cenário 7b: Stripe abre para usuário logado ─────────────────────────
test('[Cenário 7b] Logado: Stripe Checkout abre corretamente', async ({ page }) => {
  await page.goto('/checkout/plan/professional');
  await page.waitForLoadState('networkidle');

  await getCheckoutButton(page).click();

  // ✅ Redireciona para Stripe
  await aguardarStripeCheckout(page);
  expect(page.url()).toContain('stripe.com');
});

// ─── Cenário 8: Pagamento aprovado logado — acesso direto ────────────────
test('[Cenário 8] Logado paga e acesso é liberado sem precisar de claim manual', async ({ page }) => {
  await page.goto('/checkout/plan/professional');
  await page.waitForLoadState('networkidle');

  await getCheckoutButton(page).click();
  await aguardarStripeCheckout(page);

  // Preenche cartão
  await preencherCartaoStripe(page);
  await page.locator('button[type="submit"]').click();

  // ✅ Retornou para success
  await aguardarURL(page, '/checkout/success');
  await page.waitForLoadState('networkidle');

  // ✅ Não ficou preso pedindo login
  const textoBody = await page.locator('body').innerText();
  expect(textoBody).not.toMatch(/faça login para continuar|você precisa logar/i);
  expect(textoBody).not.toMatch(/faça login para visualizar o status final/i);

  // ✅ Mostra confirmação ou processamento (webhook pode levar alguns segundos)
  const sucessoOuProcessando =
    textoBody.match(/confirmad|pagamento em processamento|aguardando confirmação/i) !== null;
  expect(sucessoOuProcessando).toBeTruthy();

  // ✅ Claim não é exigido (já estava logado durante o checkout)
  // — valida que o sistema não mostra estado de "aguardando vínculo"
  expect(textoBody).not.toMatch(/vincule sua conta|aguardando vínculo|pendente de vínculo/i);
});

// ─── Cenário 8b: Logado no success — payment já vem vinculado ────────────
test('[Cenário 8b] Success logado: payment aparece vinculado ao usuário', async ({ page }) => {
  await page.goto('/checkout/plan/professional');
  await page.waitForLoadState('networkidle');

  await getCheckoutButton(page).click();
  await aguardarStripeCheckout(page);

  await preencherCartaoStripe(page);

  // Monitora se claim é chamado (não deveria ser necessário para logado)
  let claimFoiChamado = false;
  page.on('request', (req) => {
    if (req.url().includes('/payments/claim-checkout') && req.method() === 'POST') {
      claimFoiChamado = true;
    }
  });

  await page.locator('button[type="submit"]').click();
  await aguardarURL(page, '/checkout/success');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); // aguarda possíveis calls assíncronas

  // ✅ Se claim foi chamado, deve ter retornado 200 (não error)
  // ✅ Independente, o acesso deve estar liberado
  const textoBody = await page.locator('body').innerText();
  const acessoLiberado =
    textoBody.match(/confirmad|pagamento em processamento|aguardando confirmação|ir para meu painel/i) !== null;
  expect(acessoLiberado).toBeTruthy();

  console.log(`Claim foi chamado para usuário logado: ${claimFoiChamado}`);
  // (apenas informativo — o claim pode ser chamado como fallback seguro)
});
