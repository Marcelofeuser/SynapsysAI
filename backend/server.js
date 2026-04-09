const cors = require("cors");
const OpenAI = require("openai");
const { loadAllPrompts, loadModePrompt } = require("./src/ai/loadPrompts");
const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const BASE_DOMAIN = process.env.BASE_DOMAIN || "insightdisc.com";
const SYNAPSYS_SUBDOMAIN = process.env.SYNAPSYS_SUBDOMAIN || "synapsys";
const SYNAPSYS_PROTOCOL = process.env.SYNAPSYS_PROTOCOL || "https";

const SYNAPSYS_DOMAIN = `${SYNAPSYS_SUBDOMAIN}.${BASE_DOMAIN}`;
const SYNAPSYS_URL = `${SYNAPSYS_PROTOCOL}://${SYNAPSYS_DOMAIN}`;

const Groq = require("groq-sdk");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();

app.use(express.json());

app.use(cors({
  origin: [
    'http://localhost:5174',
    'http://localhost:5173',
    'https://synapsys-ai.vercel.app',
    'https://app.insightdisc.com'
  ],
  credentials: true
}));


// --- Providers ---
// FIX: instanciar providers apenas se a chave existir,
//      evitando crash na inicialização do servidor

let openai = null;
let groq = null;
let anthropic = null;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
  console.warn("⚠️  OPENAI_API_KEY não configurada — provider OpenAI desativado");
}

if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
} else {
  console.warn("⚠️  GROQ_API_KEY não configurada — provider Groq desativado");
}

if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
} else {
  console.warn("⚠️  ANTHROPIC_API_KEY não configurada — provider Claude desativado");
}

async function openaiProvider(systemPrompt, userInput) {
  if (!openai) throw new Error("OpenAI não configurada: OPENAI_API_KEY ausente nas variáveis de ambiente");

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput },
    ],
  });

  return response.choices?.[0]?.message?.content || "";
}

async function groqProvider(systemPrompt, userInput) {
  if (!groq) throw new Error("Groq não configurado: GROQ_API_KEY ausente nas variáveis de ambiente");

  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    temperature: 0.4,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput },
    ],
  });

  return completion.choices?.[0]?.message?.content || "";
}

async function claudeProvider(systemPrompt, userInput) {
  if (!anthropic) throw new Error("Claude não configurado: ANTHROPIC_API_KEY ausente nas variáveis de ambiente");

  const response = await anthropic.messages.create({
    model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userInput }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text || "";
}

// FIX: termos DISC mais precisos — mantidos para uso futuro,
//      mas o roteamento principal agora é por AI_PROVIDER
const DISC_TERMS = [
  "DISC",
  "dominân", "dominan",
  "influên",
  "estabilidade comportamental",
  "conformidade",
  "perfil comportamental",
  "perfil disc",
  "fator d", "fator i", "fator s", "fator c",
  " DI ", " DC ", " IS ", " SC ",
  " ID ", " CD ", " SI ", " CS ",
];

function isDiscMessage(input) {
  const upper = input.toUpperCase();
  return DISC_TERMS.some((term) => upper.includes(term.toUpperCase());
}

// FIX: agora usa prompts estruturados + modo operacional
//      OpenAI vira provider principal por configuração explícita
async function generateInsight(userInput, mode = "builder") {
  const FALLBACK_PROMPT =
    "Você é a Synapsys AI, um sistema de inteligência artificial focado em automação, análise e tomada de decisão para empresas. Seja claro, direto e entregue soluções práticas.";

  let basePrompt = FALLBACK_PROMPT;

  try {
    basePrompt = loadAllPrompts();
  } catch (error) {
    console.warn("⚠️  Falha ao carregar prompts estruturados:", error.message);
  }

  let modePrompt = "";
  try {
    modePrompt = loadModePrompt(mode || "builder");
  } catch (error) {
    console.warn("⚠️  Falha ao carregar mode prompt:", error.message);
  }

  const systemPrompt = [basePrompt, modePrompt].filter(Boolean).join("\n\n");
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();

  // OpenAI como provider principal
  if (provider === "openai" && openai) {
    const text = await openaiProvider(systemPrompt, userInput);
    return { text, source: "openai" };
  }

  // Claude explicitamente configurado
  if (provider === "claude" && anthropic) {
    const text = await claudeProvider(systemPrompt, userInput);
    return { text, source: "claude" };
  }

  // Groq explicitamente configurado
  if (provider === "groq" && groq) {
    try {
      const text = await groqProvider(systemPrompt, userInput);
      return { text, source: "groq" };
    } catch (groqError) {
      console.warn("Groq falhou:", groqError.message);

      if (openai) {
        console.warn("Tentando OpenAI como fallback...");
        const text = await openaiProvider(systemPrompt, userInput);
        return { text, source: "openai-fallback" };
      }

      if (anthropic) {
        console.warn("Tentando Claude como fallback...");
        const text = await claudeProvider(systemPrompt, userInput);
        return { text, source: "claude-fallback" };
      }

      throw new Error(`Groq falhou e não há fallback disponível. Erro: ${groqError.message}`);
    }
  }

  // Fallbacks automáticos se AI_PROVIDER apontar para algo indisponível
  if (openai) {
    const text = await openaiProvider(systemPrompt, userInput);
    return { text, source: "openai-fallback-default" };
  }

  if (groq) {
    const text = await groqProvider(systemPrompt, userInput);
    return { text, source: "groq-fallback-default" };
  }

  if (anthropic) {
    const text = await claudeProvider(systemPrompt, userInput);
    return { text, source: "claude-fallback-default" };
  }

  throw new Error(
    "Nenhum provider de IA configurado. Defina OPENAI_API_KEY, GROQ_API_KEY ou ANTHROPIC_API_KEY nas variáveis de ambiente do Railway."
  );
}

// --- Routes ---

app.get("/", (req, res) => {
  res.json({ message: "Synapsys AI backend online" });
});

// FIX: /health agora mostra status real de cada provider
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    provider: process.env.AI_PROVIDER || "openai",
    openai_configured: !!openai,
    groq_configured: !!groq,
    claude_configured: !!anthropic,
    openai_model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    groq_model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    claude_model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
    
    synapsys_domain: SYNAPSYS_DOMAIN,
    synapsys_url: SYNAPSYS_URL,
  });
});

app.post("/synapsys/analyze", async (req, res) => {
  try {
    const { input, mode } = req.body;

    if (!input) {
      return res.status(400).json({ error: "Input é obrigatório" });
    }

    const { text, source } = await generateInsight(input, mode || "builder");

    return res.json({
      success: true,
      source,
      mode: mode || "builder",
      response: text,
    });
  } catch (error) {
    console.error("ERRO IA:", error.message);

    return res.status(500).json({
      success: false,
      source: "error",
      response:
        "Não foi possível processar sua mensagem. Verifique as variáveis de ambiente do provider configurado.",
      error: error.message,
    });
  }
});

const PORT = Number(process.env.PORT) || 4010;

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
  console.log(`   Provider principal : ${process.env.AI_PROVIDER || "openai"}`);
  console.log(`   OpenAI             : ${openai ? "✅ ativo (" + (process.env.OPENAI_MODEL || "gpt-4.1-mini") + ")" : "❌ inativo (OPENAI_API_KEY não definida)"}`);
  console.log(`   Groq               : ${groq ? "✅ ativo (" + (process.env.GROQ_MODEL || "llama-3.1-8b-instant") + ")" : "❌ inativo (GROQ_API_KEY não definida)"}`);
  console.log(`   Claude             : ${anthropic ? "✅ ativo (" + (process.env.CLAUDE_MODEL || "claude-sonnet-4-6") + ")" : "❌ inativo (ANTHROPIC_API_KEY não definida)"}\n`);
});
