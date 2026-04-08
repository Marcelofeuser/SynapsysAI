const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const Groq = require("groq-sdk");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();

app.use(cors());
app.use(express.json());

// --- Providers ---
// FIX: instanciar providers apenas se a chave existir,
//      evitando crash na inicialização do servidor

let groq = null;
let anthropic = null;

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

// FIX: termos DISC mais precisos — removidos " D ", " I ", " S ", " C " e "perfil"
//      que geravam falsos positivos em perguntas comuns do AI Lab e Coach
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
  return DISC_TERMS.some((term) => upper.includes(term.toUpperCase()));
}

// FIX: roteamento usa AI_PROVIDER como configuração explícita;
//      fallback para Claude só acontece se a chave estiver disponível
async function generateInsight(userInput) {
  const FALLBACK_PROMPT =
    "Você é a Synapsys AI, um sistema de inteligência artificial focado em automação, análise e tomada de decisão para empresas. Seja claro, direto e entregue soluções práticas.";

  const systemPromptPath = path.join(__dirname, "prompts/system-prompt.md");
  const systemPrompt = fs.existsSync(systemPromptPath)
    ? fs.readFileSync(systemPromptPath, "utf-8").trim()
    : FALLBACK_PROMPT;

  const provider = (process.env.AI_PROVIDER || "groq").toLowerCase();

  // Roteamento DISC — só vai para Claude se for DISC E Claude estiver disponível
  if (isDiscMessage(userInput) && anthropic) {
    console.log("Roteando para Claude (DISC detectado)");
    const text = await claudeProvider(systemPrompt, userInput);
    return { text, source: "claude" };
  }

  // Roteamento explícito por AI_PROVIDER=claude
  if (provider === "claude" && anthropic) {
    const text = await claudeProvider(systemPrompt, userInput);
    return { text, source: "claude" };
  }

  // Groq como provider principal
  if (groq) {
    try {
      const text = await groqProvider(systemPrompt, userInput);
      return { text, source: "groq" };
    } catch (groqError) {
      console.warn("Groq falhou:", groqError.message);

      // FIX: fallback para Claude SOMENTE se a chave existir
      if (anthropic) {
        console.warn("Tentando Claude como fallback...");
        const text = await claudeProvider(systemPrompt, userInput);
        return { text, source: "claude-fallback" };
      }

      // Sem fallback disponível — erro claro para o log do Railway
      throw new Error(`Groq falhou e não há fallback disponível. Erro: ${groqError.message}`);
    }
  }

  throw new Error(
    "Nenhum provider de IA configurado. Defina GROQ_API_KEY ou ANTHROPIC_API_KEY nas variáveis de ambiente do Railway."
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
    provider: process.env.AI_PROVIDER || "groq",
    groq_configured: !!groq,
    claude_configured: !!anthropic,
    groq_model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  });
});

app.post("/synapsys/analyze", async (req, res) => {
  try {
    const { input } = req.body;

    if (!input) {
      return res.status(400).json({ error: "Input é obrigatório" });
    }

    const { text, source } = await generateInsight(input);

    return res.json({ success: true, source, response: text });
  } catch (error) {
    console.error("ERRO IA:", error.message);

    // FIX: retorna 500 (não 200) para que o frontend possa detectar o erro
    return res.status(500).json({
      success: false,
      source: "error",
      response:
        "Não foi possível processar sua mensagem. Verifique as variáveis de ambiente (GROQ_API_KEY) no painel do Railway.",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
  console.log(`   Provider principal : ${process.env.AI_PROVIDER || "groq"}`);
  console.log(`   Groq               : ${groq ? "✅ ativo (" + (process.env.GROQ_MODEL || "llama-3.1-8b-instant") + ")" : "❌ inativo (GROQ_API_KEY não definida)"}`);
  console.log(`   Claude             : ${anthropic ? "✅ ativo" : "❌ inativo (ANTHROPIC_API_KEY não definida)"}\n`);
});
