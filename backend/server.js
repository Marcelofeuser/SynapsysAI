const express = require("express");
const cors = require("cors");
require("dotenv").config();

const Groq = require("groq-sdk");

const app = express();

app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

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
      return res.status(400).json({
        error: "Input é obrigatório",
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        source: "fallback",
        response:
          "A Synapsys AI está sem GROQ_API_KEY configurada no backend.",
      });
    }

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: `
Você é a Synapsys AI.

Uma plataforma de inteligência artificial focada em automação, análise e tomada de decisão para empresas.

Regras:
- Seja claro e direto
- Evite respostas genéricas
- Pense como dono do negócio
- Entregue soluções práticas
- Estruture suas respostas

Objetivo:
Ajudar empresas a melhorar processos, aumentar resultados e tomar decisões melhores.
          `,
        },
        {
          role: "user",
          content: input,
        },
      ],
    });

    const resposta = completion.choices?.[0]?.message?.content || "";

    return res.json({
      success: true,
      source: "groq",
      response: resposta,
    });
  } catch (error) {
    console.error("ERRO IA:", error.message);

    return res.status(200).json({
      success: false,
      source: "fallback",
      response:
        "A Synapsys AI está conectada corretamente, mas o provedor configurado não respondeu. Verifique a GROQ_API_KEY, o modelo e a conectividade da API.",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
