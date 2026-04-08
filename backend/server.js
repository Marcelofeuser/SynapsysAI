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

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function groqProvider(systemPrompt, userInput) {
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
  const response = await anthropic.messages.create({
    model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userInput }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text || "";
}

const DISC_TERMS = [
  "DISC", "perfil", "dominan", "influên", "estabilidade", "conformidade",
  " DI", " DC", " IS", " SC", " ID", " CD", " SI", " CS",
  " D ", " I ", " S ", " C ",
];

function isDiscMessage(input) {
  const upper = input.toUpperCase();
  return DISC_TERMS.some((term) => upper.includes(term.toUpperCase()));
}

async function generateInsight(userInput) {
  const systemPromptPath = path.join(__dirname, "../prompts/system-prompt.md");
  const systemPrompt = fs.readFileSync(systemPromptPath, "utf-8").trim();

  if (isDiscMessage(userInput) && process.env.ANTHROPIC_API_KEY) {
    console.log("Roteando para Claude (DISC detectado)");
    const text = await claudeProvider(systemPrompt, userInput);
    return { text, source: "claude" };
  }

  try {
    const text = await groqProvider(systemPrompt, userInput);
    return { text, source: "groq" };
  } catch (groqError) {
    console.warn("Groq falhou, tentando Claude:", groqError.message);
    const text = await claudeProvider(systemPrompt, userInput);
    return { text, source: "claude" };
  }
}

// --- Routes ---

app.get("/", (req, res) => {
  res.json({ message: "Synapsys AI backend online" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", provider: process.env.AI_PROVIDER || "groq" });
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

    return res.status(200).json({
      success: false,
      source: "fallback",
      response:
        "A Synapsys AI está conectada corretamente, mas o provedor configurado não respondeu. Verifique as variáveis de ambiente, o modelo e a conectividade da API.",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
