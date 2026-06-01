# SynapsysAI — Contexto Completo do Projeto

## Visão Geral
SynapsysAI é uma plataforma SaaS de inteligência artificial focada em análise comportamental DISC, coaching, relatórios inteligentes e automação empresarial.

## URLs e Domínios
- Frontend: https://synapsys.insightdisc.com
- Backend API: https://synapsys-backend-production.up.railway.app
- Landing page: https://insightdisc.com
- Portal AI: https://ai.insightdisc.com

## Stack Tecnológica
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express (CommonJS e ESM misturados)
- Banco de dados: PostgreSQL via Supabase
- ORM: Prisma
- Autenticação: Supabase Auth + JWT
- IA: OpenAI GPT-4.1-mini (principal), Groq (fallback), Claude (fallback)
- Deploy Frontend: Vercel (auto-deploy no push para main)
- Deploy Backend: Railway (auto-deploy no push para main)
- Repositório: GitHub — Marcelofeuser/SynapsysAI

## Estrutura de Pastas
SynapsysAI/
  backend/
    server.js              — servidor principal Express, todas as rotas
    src/
      ai/
        loadPrompts.js     — carrega system prompt e knowledge base
      knowledge/
        loadDiscBase.js    — carrega base DISC
    knowledge/
      custom/              — arquivos .md/.txt injetados no prompt da IA
      disc/
        disc-base.json     — base de conhecimento DISC
    prompts/
      system-prompt.md     — personalidade principal da IA
      expert-rules.md      — regras de especialista
      saas-context.md      — contexto SaaS
      specialization-context.md — especialização comportamental
    prisma/
      schema.prisma        — schema do banco de dados
  frontend/
    src/
      pages/
        Admin.jsx          — painel super admin
        Login.jsx          — página de login
      components/          — componentes reutilizáveis
    vercel.json            — configuração de deploy Vercel

## Autenticação
O sistema usa duas camadas de autenticação:

1. Usuários comuns — Supabase Auth com JWT
   - Login: POST /auth/login (email + password)
   - Registro: POST /auth/register (email + password + name)
   - Token enviado no header: Authorization: Bearer TOKEN
   - Middleware: requireUser (verifica JWT Supabase)
   - Middleware: optionalUser (não bloqueia mas identifica usuário)

2. Admin/Super Admin — token simples em memória
   - Login: POST /admin/login (body: { password: 'synapsys-admin-2026' })
   - Token enviado no header: x-admin-token: TOKEN
   - Middleware: adminAuth (verifica token na lista activeSessions)
   - Credenciais frontend: admin@synapsys.insightdisc.com / Syn@2025#Admin

## Rotas do Backend (server.js)

### Públicas
GET  /health                        — status da API e providers configurados
GET  /disc/base                     — base de dados DISC completa
GET  /bootstrap-admin               — cria super admin inicial

### Autenticação de Usuários
POST /auth/register                 — cadastro (email, password, name)
POST /auth/login                    — login (email, password) → retorna token JWT
GET  /auth/me                       — dados do usuário logado (requireUser)

### IA — Principal
POST /api/synapsys/general          — chat com a IA (optionalUser)
  body: { input, mode, conversationId, projectId }
  modes: builder, debugger, architect

### Admin — Usuários
GET    /admin/users                 — lista todos usuários (Supabase Admin)
POST   /admin/users                 — cria usuário com senha ou envia convite
POST   /admin/users/invite          — convite por email (sem senha)
PATCH  /admin/users/:id             — atualiza plano/role/name
DELETE /admin/users/:id             — deleta usuário

### Admin — Sistema
POST /admin/login                   — login admin (password no body)
GET  /admin/system-prompt           — carrega system prompt atual
POST /admin/system-prompt           — salva novo system prompt

### Admin — Knowledge Base
GET    /admin/knowledge             — lista arquivos da knowledge base
GET    /admin/knowledge/content     — conteúdo de arquivo específico (?name=arquivo.md)
POST   /admin/knowledge/upload      — upload de arquivo (base64)
PUT    /admin/knowledge/content     — salva edição de arquivo
DELETE /admin/knowledge             — deleta arquivo

## Planos de Usuário
free          — acesso limitado, trial
personal      — recursos básicos
professional  — AI Lab + Coach IA desbloqueados
business      — recursos avançados para empresas
diamond       — acesso completo e consultivo

O plano é armazenado em user.user_metadata.plan (Supabase)
Verificação de plano no frontend via user_metadata

## Modos da IA
builder    — implementação de funcionalidades, código de produção
debugger   — diagnóstico de bugs, análise de causa raiz
architect  — arquitetura SaaS, multi-tenancy, escalabilidade

## Providers de IA (em ordem de prioridade)
1. OpenAI GPT-4.1-mini (principal)
2. Claude Sonnet (fallback)
3. Groq llama-3.1-8b-instant (fallback)
Configurado via variável AI_PROVIDER no Railway

## Variáveis de Ambiente (Railway — Backend)
DATABASE_URL          — PostgreSQL via Supabase
SUPABASE_URL          — URL do projeto Supabase
SUPABASE_ANON_KEY     — chave pública
SUPABASE_SERVICE_ROLE_KEY — chave secreta (Admin API)
OPENAI_API_KEY        — OpenAI
OPENAI_MODEL          — gpt-4.1-mini
AI_PROVIDER           — openai / groq / claude
JWT_SECRET            — segredo para JWT próprio
STRIPE_SECRET_KEY     — Stripe (pendente)
ZOHO_CLIENT_ID        — Zoho CRM (pendente)
ZOHO_CLIENT_SECRET    — Zoho CRM (pendente)
APP_URL               — https://synapsys.insightdisc.com
CORS_ORIGINS          — domínios permitidos separados por vírgula
ADMIN_PASSWORD        — senha do super admin (synapsys-admin-2026)

## Variáveis de Ambiente (Vercel — Frontend)
VITE_API_URL          — https://synapsys-backend-production.up.railway.app
VITE_APP_URL          — https://synapsys.insightdisc.com
VITE_AI_API_URL       — https://synapsys-backend-production.up.railway.app

## Como a IA é alimentada (fluxo completo)
1. Usuário envia mensagem para POST /api/synapsys/general
2. Backend chama generateInsight(input, mode)
3. loadAllPrompts() monta o system prompt:
   a. prompts/system-prompt.md (personalidade base)
   b. prompts/expert-rules.md (regras de especialista)
   c. prompts/saas-context.md (contexto SaaS)
   d. prompts/specialization-context.md (especialização)
   e. knowledge/custom/*.md (base de conhecimento customizada — VOCÊ ESTÁ AQUI)
4. Sistema envia para OpenAI com histórico de conversa
5. Resposta é retornada e salva no banco se usuário autenticado

## Integrações Planejadas (pendente)
- Stripe: checkout, webhooks, planos por assinatura mensal
- Zoho CRM: automação de leads e clientes
- InsightDISC: integração com avaliações comportamentais
- Biblioteca DISC: base expandida de conteúdo comportamental

## Deploy e CI/CD
git push main → GitHub → Railway detecta push → build automático → produção
git push main → GitHub → Vercel detecta push → build Vite → produção

Tempo médio de deploy: 2-3 minutos no Railway, 1-2 minutos na Vercel
