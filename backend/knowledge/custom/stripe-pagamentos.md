# Stripe — Guia Técnico de Pagamentos

## O que é o Stripe
Stripe é a plataforma de pagamentos online mais usada por startups e SaaS. Permite cobranças únicas, assinaturas recorrentes, marketplace e muito mais via API.

## Instalação
npm install stripe

import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

## Conceitos essenciais

### Customer (cliente)
Representa um cliente no Stripe. Guarda cartão, histórico e permite cobranças futuras.

const customer = await stripe.customers.create({
  email: 'user@email.com',
  name: 'João Silva',
  metadata: { userId: '123', plan: 'pro' }
})
// customer.id = 'cus_xxxxx' — salve no banco

### Product e Price (produto e preço)
Product é o que você vende. Price é o preço do product (pode ser recorrente ou único).

Criar product:
const product = await stripe.products.create({
  name: 'Plano Professional SynapsysAI',
  description: 'Acesso completo à plataforma'
})

Criar price mensal:
const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 9700, // R$ 97,00 em centavos
  currency: 'brl',
  recurring: { interval: 'month' }
})
// price.id = 'price_xxxxx' — salve como variável de ambiente

### Checkout Session (página de pagamento)
Redireciona o usuário para a página de pagamento hospedada pelo Stripe.

const session = await stripe.checkout.sessions.create({
  customer: customerId, // ou customer_email se não tiver customer
  payment_method_types: ['card'],
  line_items: [{
    price: 'price_xxxxx', // Price ID criado no Stripe
    quantity: 1,
  }],
  mode: 'subscription', // ou 'payment' para pagamento único
  success_url: 'https://app.com/sucesso?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://app.com/cancelado',
  metadata: { userId: '123', plan: 'professional' }
})
// Redirecionar para session.url

### Subscription (assinatura)
Representa uma assinatura ativa de um customer.

// Buscar assinaturas de um customer
const subscriptions = await stripe.subscriptions.list({
  customer: customerId,
  status: 'active'
})

// Cancelar assinatura
await stripe.subscriptions.cancel(subscriptionId)

// Atualizar plano (upgrade/downgrade)
await stripe.subscriptions.update(subscriptionId, {
  items: [{ id: itemId, price: newPriceId }],
  proration_behavior: 'create_prorations'
})

## Webhooks (essencial para produção)
Webhooks são notificações que o Stripe envia para seu backend quando algo acontece (pagamento confirmado, assinatura cancelada, etc).

### Configurar endpoint de webhook
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object
      // Pagamento confirmado — ativar plano do usuário
      const userId = session.metadata.userId
      const plan = session.metadata.plan
      await ativarPlano(userId, plan)
      break

    case 'customer.subscription.deleted':
      // Assinatura cancelada — rebaixar para free
      await cancelarPlano(session.customer)
      break

    case 'invoice.payment_failed':
      // Pagamento falhou — notificar usuário
      await notificarFalha(session.customer)
      break
  }

  res.json({ received: true })
})

### Eventos mais importantes
checkout.session.completed         — pagamento único ou assinatura confirmada
customer.subscription.created      — nova assinatura criada
customer.subscription.updated      — assinatura atualizada (upgrade/downgrade)
customer.subscription.deleted      — assinatura cancelada
invoice.payment_succeeded          — cobrança mensal bem-sucedida
invoice.payment_failed             — cobrança mensal falhou
customer.created                   — novo customer criado

### Testar webhooks localmente
stripe listen --forward-to localhost:3000/webhook/stripe
// Gera um STRIPE_WEBHOOK_SECRET temporário para desenvolvimento

## Customer Portal (portal do cliente)
Permite o usuário gerenciar a própria assinatura (cancelar, trocar plano, atualizar cartão).

const portalSession = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: 'https://app.com/dashboard'
})
// Redirecionar para portalSession.url

## Variáveis de ambiente necessárias
STRIPE_SECRET_KEY=sk_live_xxx       — chave secreta (nunca no frontend)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx  — chave pública (pode ir no frontend)
STRIPE_WEBHOOK_SECRET=whsec_xxx     — segredo do webhook
STRIPE_PRICE_FREE=price_xxx
STRIPE_PRICE_PERSONAL=price_xxx
STRIPE_PRICE_PROFESSIONAL=price_xxx
STRIPE_PRICE_BUSINESS=price_xxx
STRIPE_PRICE_DIAMOND=price_xxx

## Boas práticas
- Sempre verificar assinatura do webhook (constructEvent)
- Salvar customer_id do Stripe no banco de dados do usuário
- Usar metadados para passar userId e plan no checkout
- Nunca confiar apenas no retorno do frontend — sempre validar pelo webhook
- Testar em modo test (sk_test_xxx) antes de produção
- Guardar idempotency key para evitar cobranças duplicadas

## Modo teste vs produção
sk_test_xxx — modo desenvolvimento (cartões de teste)
sk_live_xxx — produção (cartões reais)

Cartão de teste: 4242 4242 4242 4242 (qualquer CVV e data futura)
Cartão que falha: 4000 0000 0000 0002
