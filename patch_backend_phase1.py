#!/usr/bin/env python3
"""
patch_backend_phase1.py
Adiciona rotas AI Phase 1 ao server.js do SynapsysAI backend.
Rodar: python3 patch_backend_phase1.py
"""

SERVER_PATH = "/Volumes/SSD_MAC/Projects/SynapsysAI/backend/server.js"

NEW_ROUTES = r'''
// ════════════════════════════════════════════════════════
//  AI PHASE 1 — Transcription | Copilot | Skin Analysis
// ════════════════════════════════════════════════════════

// POST /api/ai/transcribe — Whisper transcription + parser de prontuário
app.post("/api/ai/transcribe", requireUser, async (req, res) => {
  try {
    const { audio, filename = "audio.webm", language = "pt", parseFields = true } = req.body;
    if (!audio) return res.status(400).json({ error: "Audio base64 obrigatorio" });
    if (!openai) return res.status(503).json({ error: "OPENAI_API_KEY nao configurada" });

    const os = require("os");
    const buffer = Buffer.from(audio, "base64");
    const tmpPath = require("path").join(os.tmpdir(), `sx_${Date.now()}_${filename}`);
    require("fs").writeFileSync(tmpPath, buffer);

    const fileStream = require("fs").createReadStream(tmpPath);
    const transcriptionResult = await openai.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1",
      language,
      response_format: "verbose_json",
    });
    require("fs").unlinkSync(tmpPath);

    const transcription = transcriptionResult.text || "";
    let parsedFields = null;

    if (parseFields && transcription.length > 10) {
      try {
        const parseResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `Extraia campos clinicos de uma transcricao de consulta. Retorne JSON com exatamente estas chaves:
{
  "queixa_principal": "string ou null",
  "historico_presente": "string ou null",
  "historico_anterior": "string ou null",
  "medicamentos": ["array ou []"],
  "alergias": ["array ou []"],
  "exame_fisico": "string ou null",
  "hipotese_diagnostica": "string ou null",
  "conduta": "string ou null",
  "retorno": "string ou null",
  "observacoes": "string ou null"
}
Se o campo nao for mencionado, retorne null (ou [] para arrays).`,
            },
            { role: "user", content: `Transcricao:\n\n${transcription}` },
          ],
        });
        parsedFields = JSON.parse(parseResponse.choices[0].message.content);
      } catch (_) {
        parsedFields = null;
      }
    }

    let savedId = null;
    if (req.db && req.user) {
      const { data } = await req.db
        .from("ai_transcriptions")
        .insert({
          user_id: req.user.id,
          audio_filename: filename,
          transcription,
          parsed_fields: parsedFields,
          duration_seconds: transcriptionResult.duration ? Math.round(transcriptionResult.duration) : null,
          language,
        })
        .select("id")
        .single();
      savedId = data?.id;
    }

    return res.json({
      ok: true,
      id: savedId,
      transcription,
      duration: transcriptionResult.duration,
      language,
      parsedFields,
    });
  } catch (error) {
    console.error("[transcribe]", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/transcriptions
app.get("/api/ai/transcriptions", requireUser, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { data, error } = await req.db
      .from("ai_transcriptions")
      .select("id, audio_filename, transcription, parsed_fields, duration_seconds, language, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ items: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// DELETE /api/ai/transcriptions/:id
app.delete("/api/ai/transcriptions/:id", requireUser, async (req, res) => {
  try {
    const { error } = await req.db
      .from("ai_transcriptions")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/copilot — GPT-4o com function calling + contexto do paciente
app.post("/api/ai/copilot", requireUser, async (req, res) => {
  try {
    const { messages, patientContext, sessionId } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages (array) obrigatorio" });
    }
    if (!openai) return res.status(503).json({ error: "OPENAI_API_KEY nao configurada" });

    const systemPrompt = `Voce e a Synapsys Copilot, assistente clinico para profissionais de saude.
Ajude com: analise de historico clinico, diagnosticos diferenciais, protocolos baseados em evidencias, redacao de prontuarios e relatorios clinicos.
Seja preciso, direto e lembre que as decisoes clinicas finais sao sempre do profissional.
${patientContext ? `\nCONTEXTO DO PACIENTE:\n${JSON.stringify(patientContext, null, 2)}` : ""}`;

    const tools = [
      {
        type: "function",
        function: {
          name: "buscar_cid10",
          description: "Busca o codigo CID-10 e descricao para um diagnostico ou condicao clinica",
          parameters: {
            type: "object",
            properties: { diagnostico: { type: "string", description: "Nome do diagnostico" } },
            required: ["diagnostico"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "calcular_dose",
          description: "Calcula dose de medicamento baseada em peso e indicacao",
          parameters: {
            type: "object",
            properties: {
              medicamento: { type: "string" },
              peso_kg: { type: "number" },
              idade_anos: { type: "number" },
              indicacao: { type: "string" },
            },
            required: ["medicamento"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "buscar_protocolo",
          description: "Busca protocolo ou diretriz clinica para uma condicao",
          parameters: {
            type: "object",
            properties: {
              condicao: { type: "string" },
              especialidade: { type: "string" },
            },
            required: ["condicao"],
          },
        },
      },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      tools,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    const toolCalls = choice.message.tool_calls || [];
    let finalContent = choice.message.content;
    let toolResults = [];

    if (toolCalls.length > 0) {
      const toolMessages = [{ role: "system", content: systemPrompt }, ...messages, choice.message];
      for (const tc of toolCalls) {
        const args = JSON.parse(tc.function.arguments || "{}");
        const result = `[${tc.function.name}] Argumentos recebidos: ${JSON.stringify(args)}. Integracao com base clinica em expansao.`;
        toolMessages.push({ role: "tool", tool_call_id: tc.id, content: result });
        toolResults.push({ name: tc.function.name, args });
      }
      const followUp = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.3,
        messages: toolMessages,
      });
      finalContent = followUp.choices[0].message.content;
    }

    if (req.db && req.user && sessionId) {
      const allMessages = [...messages, { role: "assistant", content: finalContent }];
      await req.db
        .from("ai_copilot_sessions")
        .update({ messages: allMessages, updated_at: new Date().toISOString() })
        .eq("id", sessionId)
        .eq("user_id", req.user.id);
    }

    return res.json({ ok: true, response: finalContent, toolCalls: toolResults, usage: response.usage });
  } catch (error) {
    console.error("[copilot]", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/copilot/sessions
app.get("/api/ai/copilot/sessions", requireUser, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { data, error } = await req.db
      .from("ai_copilot_sessions")
      .select("id, title, context, created_at, updated_at")
      .eq("user_id", req.user.id)
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ items: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/copilot/sessions
app.post("/api/ai/copilot/sessions", requireUser, async (req, res) => {
  try {
    const { title, context } = req.body;
    const { data, error } = await req.db
      .from("ai_copilot_sessions")
      .insert({ user_id: req.user.id, title: title || "Nova sessao", context: context || {}, messages: [] })
      .select("id, title, context, created_at")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ session: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// DELETE /api/ai/copilot/sessions/:id
app.delete("/api/ai/copilot/sessions/:id", requireUser, async (req, res) => {
  try {
    const { error } = await req.db
      .from("ai_copilot_sessions")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/skin-analysis — GPT-4o Vision + relatório estruturado
app.post("/api/ai/skin-analysis", requireUser, async (req, res) => {
  try {
    const { image, imageUrl, patientInfo } = req.body;
    if (!image && !imageUrl) return res.status(400).json({ error: "Imagem (base64 ou URL) obrigatoria" });
    if (!openai) return res.status(503).json({ error: "OPENAI_API_KEY nao configurada" });

    const imageContent = image
      ? { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}`, detail: "high" } }
      : { type: "image_url", image_url: { url: imageUrl, detail: "high" } };

    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Voce e um dermatologista especialista. Analise a imagem de pele e retorne JSON estruturado:
{
  "tipo_pele": "seca|oleosa|mista|normal|sensivel",
  "tom_pele": "muito claro|claro|medio|moreno|escuro",
  "fototipoFitzpatrick": 1-6,
  "condicoes_identificadas": [{"nome":"","severidade":"leve|moderada|grave","localizacao":"","descricao":""}],
  "areas_preocupacao": [],
  "hidratacao": "muito baixa|baixa|adequada|alta",
  "textura": "lisa|irregular|porosa|rugosa",
  "manchas": {"presentes": false, "tipos": [], "distribuicao": ""},
  "recomendacoes": {
    "imediatas": [],
    "rotina_diaria": [],
    "ingredientes_indicados": [],
    "ingredientes_evitar": [],
    "procedimentos_sugeridos": []
  },
  "score_saude_pele": 0-100,
  "encaminhamento_urgente": false,
  "motivo_encaminhamento": null,
  "observacoes_clinicas": "",
  "confianca_analise": "alta|media|baixa",
  "limitacoes": ""
}
${patientInfo ? `Paciente: ${JSON.stringify(patientInfo)}` : ""}`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analise esta imagem de pele e forneça o relatorio completo:" },
            imageContent,
          ],
        },
      ],
    });

    let analysis = null;
    try {
      analysis = JSON.parse(analysisResponse.choices[0].message.content);
    } catch (_) {
      analysis = { raw: analysisResponse.choices[0].message.content, error: "parse_failed" };
    }

    let savedId = null;
    if (req.db && req.user) {
      const { data } = await req.db
        .from("ai_skin_analyses")
        .insert({
          user_id: req.user.id,
          image_url: imageUrl || null,
          analysis,
          patient_info: patientInfo || null,
        })
        .select("id")
        .single();
      savedId = data?.id;
    }

    return res.json({ ok: true, id: savedId, analysis });
  } catch (error) {
    console.error("[skin-analysis]", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/skin-analyses
app.get("/api/ai/skin-analyses", requireUser, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { data, error } = await req.db
      .from("ai_skin_analyses")
      .select("id, analysis, patient_info, image_url, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ items: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// DELETE /api/ai/skin-analyses/:id
app.delete("/api/ai/skin-analyses/:id", requireUser, async (req, res) => {
  try {
    const { error } = await req.db
      .from("ai_skin_analyses")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

'''

import sys

with open(SERVER_PATH, "r", encoding="utf-8") as f:
    content = f.read()

MARKER = "app.listen(PORT, () => {"
if MARKER not in content:
    print(f"ERRO: marcador '{MARKER}' nao encontrado em server.js")
    sys.exit(1)

# Verifica se já foi aplicado
if "/api/ai/transcribe" in content:
    print("AVISO: Rotas AI ja existem em server.js — patch ignorado.")
    sys.exit(0)

content = content.replace(MARKER, NEW_ROUTES + MARKER, 1)

with open(SERVER_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ Backend AI routes adicionadas com sucesso!")
print("   POST /api/ai/transcribe")
print("   GET  /api/ai/transcriptions")
print("   POST /api/ai/copilot")
print("   GET  /api/ai/copilot/sessions")
print("   POST /api/ai/copilot/sessions")
print("   POST /api/ai/skin-analysis")
print("   GET  /api/ai/skin-analyses")
print("\nProximo passo: git add server.js && git commit -m 'feat: AI Phase 1 routes' && git push")
