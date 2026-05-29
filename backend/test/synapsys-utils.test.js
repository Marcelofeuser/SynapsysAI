const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildConversationTitle,
  buildSnippet,
  getRangeStart,
  normalizeConversationFilter,
} = require("../src/synapsys/utils");

test("normalizeConversationFilter aceita aliases em portugues", () => {
  assert.equal(normalizeConversationFilter("hoje"), "today");
  assert.equal(normalizeConversationFilter("7dias"), "7d");
  assert.equal(normalizeConversationFilter("30dias"), "30d");
  assert.equal(normalizeConversationFilter("arquivadas"), "archived");
  assert.equal(normalizeConversationFilter("todas"), "all");
});

test("getRangeStart calcula a janela correta para hoje, 7 dias e 30 dias", () => {
  const now = new Date("2026-04-20T15:45:12.000Z");
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const start7d = new Date(now);
  start7d.setHours(0, 0, 0, 0);
  start7d.setDate(start7d.getDate() - 6);
  const start30d = new Date(now);
  start30d.setHours(0, 0, 0, 0);
  start30d.setDate(start30d.getDate() - 29);

  assert.equal(getRangeStart("today", now), startToday.toISOString());
  assert.equal(getRangeStart("7d", now), start7d.toISOString());
  assert.equal(getRangeStart("30d", now), start30d.toISOString());
  assert.equal(getRangeStart("all", now), null);
});

test("buildConversationTitle resume a primeira pergunta sem perder legibilidade", () => {
  const short = buildConversationTitle("Como liderar um time comercial?");
  const long = buildConversationTitle(
    "Preciso de um plano bastante detalhado para reorganizar a comunicacao interna, vendas, onboarding e sucessao do time nas proximas semanas sem perder velocidade"
  );

  assert.equal(short, "Como liderar um time comercial?");
  assert.match(long, /\.\.\.$/);
  assert.ok(long.length <= 72);
});

test("buildSnippet foca no trecho mais relevante quando encontra o termo", () => {
  const snippet = buildSnippet(
    "A lideranca comercial precisa alinhar rituais, previsibilidade e coaching semanal para ganhar consistencia.",
    "previsibilidade",
    70
  );

  assert.match(snippet.toLowerCase(), /previsibilidade/);
  assert.ok(snippet.length <= 76);
});
