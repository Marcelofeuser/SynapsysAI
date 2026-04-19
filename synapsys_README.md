# SynapsysAI — Landing Page

## Deploy

Projeto hospedado na Vercel: https://synapsys.insightdisc.com

## Variáveis de ambiente necessárias

Configure no painel da Vercel em Settings > Environment Variables:

| Variável | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Chave pública do Supabase |
| `STRIPE_PUBLIC_KEY` | Chave pública do Stripe |
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe (apenas backend) |
| `STRIPE_PRICE_MENSAL` | Price ID do plano mensal (R$79,90) |
| `STRIPE_PRICE_ANUAL` | Price ID do plano anual (R$59,90) |

## Próximos passos

1. Configurar projeto no Supabase (tabela `users`, `sessions`)
2. Criar produtos e preços no Stripe
3. Apontar DNS: `synapsys.insightdisc.com` → Vercel
4. Adicionar variáveis de ambiente na Vercel
