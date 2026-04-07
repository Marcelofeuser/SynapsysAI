# SynapsysAI — Testes E2E Automatizados

Suite completa de testes Playwright cobrindo todos os fluxos de checkout e pagamento.

---

## Estrutura

```
synapsys-tests/
├── tests/
│   ├── fluxo-a-publico.spec.ts      # Usuário deslogado (Cenários 1–6)
│   ├── fluxo-b-autenticado.spec.ts  # Usuário logado (Cenários 7–8)
│   ├── fluxo-c-erros.spec.ts        # Cenários de erro (Cenários 9–12)
│   └── seguranca.spec.ts            # Checklist técnico de segurança + UX
├── utils/
│   └── helpers.ts                   # Funções compartilhadas
├── playwright.config.ts
├── .env.example
└── README.md
```

---

## Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Instalar navegadores do Playwright
npx playwright install chromium

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas URLs e credenciais de teste
```

---

## Configuração do .env

```env
BASE_URL=http://localhost:3000          # URL da sua aplicação
TEST_USER_EMAIL=teste@synapsysai.com   # Usuário de teste já criado no banco
TEST_USER_PASSWORD=SuaSenhaAqui123
```

> O cartão Stripe já vem configurado com o padrão de teste da Stripe:
> `4242 4242 4242 4242` — não precisa alterar.

---

## Rodando os testes

```bash
# Todos os testes
npm test

# Fluxo específico
npm run test:flow-a     # Público/deslogado
npm run test:flow-b     # Autenticado/logado
npm run test:flow-c     # Cenários de erro
npm run test:security  # Segurança + UX

# Ver no navegador (modo visual)
npm run test:headed

# Interface visual do Playwright
npm run test:ui

# Ver relatório após rodar
npm run report
```

---

## O que cada arquivo cobre

### `fluxo-a-publico.spec.ts`
| Teste | Cenário |
|-------|---------|
| Abre checkout sem cair no login | Cenário 1 |
| Chama `/create-checkout-public` | Cenário 2 |
| Redireciona para Stripe | Cenário 2b |
| Success estável após pagamento deslogado | Cenário 3 |
| Claim vincula compra após login | Cenário 4 |
| Refresh não duplica claim | Cenário 5 |
| Reabertura de sessão já claimed | Cenário 6 |

### `fluxo-b-autenticado.spec.ts`
| Teste | Cenário |
|-------|---------|
| Logado usa endpoint autenticado | Cenário 7 |
| Acesso liberado sem claim manual | Cenário 8 |

### `fluxo-c-erros.spec.ts`
| Teste | Cenário |
|-------|---------|
| Success direto sem sessão válida | Cenário 9 |
| Claim de sessão de outro usuário bloqueado | Cenário 10 |
| Sessão cancelada não libera acesso | Cenário 11 |
| Add-ons — valores e injeção de preço | Cenário 12 |

### `seguranca.spec.ts`
| Teste | Cobertura |
|-------|-----------|
| Rejeita preço bruto do frontend | Seg-1 |
| Rejeita planSlug inválido | Seg-2 |
| Rejeita add-on não permitido | Seg-3 |
| Rejeita currency arbitrária | Seg-4 |
| Claim exige autenticação (401) | Seg-5 |
| Valida formato do sessionId | Seg-6 |
| Claim idempotente | Seg-7 |
| Botão desabilita durante request | UX-1 |
| Erro no Stripe mostra mensagem amigável | UX-2 |
| Sem texto pedindo login antes de pagar | UX-3 |
| Sem redirect inesperado para /login | UX-4 |

---

## Ajustes necessários para o seu projeto

Procure nos arquivos por estes comentários e adapte:

1. **Seletores de botão** — os testes usam `button:has-text(/pagar|assinar|continuar|checkout/i)`. Ajuste se o seu texto for diferente.

2. **Seletor de add-on** — em `fluxo-c-erros.spec.ts` (Cenário 12b), ajuste o seletor do checkbox de add-on.

3. **URLs de redirecionamento pós-login** — em `helpers.ts`, a regex `/dashboard|painel|home|\/app/` deve bater com a URL do seu app após login.

4. **Session IDs de teste** — nos Cenários 10 e 12, substitua os IDs fake por IDs reais do seu banco de dados de teste.

5. **Stripe iframe** — o seletor `iframe[name*="__privateStripeFrame"]` cobre o Stripe Elements padrão. Se usar Stripe Checkout redirect puro, o preenchimento já acontece na página do Stripe.

---

## Integração com CI (GitHub Actions)

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        working-directory: synapsys-tests
        run: npm ci
      - name: Install Playwright
        working-directory: synapsys-tests
        run: npx playwright install --with-deps chromium
      - name: Run tests
        working-directory: synapsys-tests
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
        run: npm test
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: synapsys-tests/playwright-report/
```
