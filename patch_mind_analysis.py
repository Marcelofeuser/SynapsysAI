#!/usr/bin/env python3
"""
patch_mind_analysis.py
Troca skin-analysis por mind-analysis no backend e frontend.
Rodar de: /Volumes/SSD_MAC/Projects/SynapsysAI/
"""

import os, re, shutil, sys

BASE    = "/Volumes/SSD_MAC/Projects/SynapsysAI"
SERVER  = os.path.join(BASE, "backend", "server.js")
PAGES   = os.path.join(BASE, "frontend", "src", "pages")
APP     = os.path.join(BASE, "frontend", "src", "App.jsx")
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ── 1. Copia MindAnalysis.jsx ──────────────────────────────────────────────────
src_jsx = os.path.join(SCRIPT_DIR, "MindAnalysis.jsx")
if not os.path.isfile(src_jsx):
    print(f"ERRO: MindAnalysis.jsx não encontrado em {SCRIPT_DIR}")
    sys.exit(1)

shutil.copy2(src_jsx, os.path.join(PAGES, "MindAnalysis.jsx"))
print("  ✅ MindAnalysis.jsx copiado para src/pages/")

# ── 2. Atualiza App.jsx ────────────────────────────────────────────────────────
with open(APP, "r", encoding="utf-8") as f:
    app = f.read()

app = app.replace(
    'import SkinAnalysis from "./pages/SkinAnalysis";',
    'import MindAnalysis from "./pages/MindAnalysis";'
)
app = app.replace(
    'element={<SkinAnalysis />}',
    'element={<MindAnalysis />}'
)
app = app.replace('/skin-analysis', '/mind-analysis')

with open(APP, "w", encoding="utf-8") as f:
    f.write(app)
print("  ✅ App.jsx atualizado (/skin-analysis → /mind-analysis)")

# ── 3. Adiciona rota mind-analysis no server.js ────────────────────────────────
with open(SERVER, "r", encoding="utf-8") as f:
    srv = f.read()

if "/api/ai/mind-analysis" in srv:
    print("  AVISO: rota mind-analysis já existe no server.js — pulando.")
else:
    MIND_ROUTES = r'''
// POST /api/ai/mind-analysis — GPT-4o análise psicológica estruturada
app.post("/api/ai/mind-analysis", requireUser, async (req, res) => {
  try {
    const { text, patientInfo } = req.body;
    if (!text || text.trim().length < 10) return res.status(400).json({ error: "Texto obrigatorio (min 10 chars)" });
    if (!openai) return res.status(503).json({ error: "OPENAI_API_KEY nao configurada" });

    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Voce e um psicologo clinico especialista. Analise o relato e retorne JSON:
{
  "estado_humor": "eutimico|deprimido|ansioso|irritado|euforico|apatico|labil|neutro",
  "nivel_sofrimento": 0-10,
  "nivel_funcionalidade": 0-10,
  "insight_paciente": 0-10,
  "risco_suicidio": "baixo|medio|alto|critico",
  "conduta_urgente": "string ou null",
  "hipoteses_diagnosticas": [
    {"diagnostico": "", "cid": "", "probabilidade": "alta|media|baixa", "justificativa": ""}
  ],
  "fatores_risco": [],
  "pontos_fortes": [],
  "padroes_cognitivos": [],
  "recomendacoes_terapeuticas": [],
  "abordagens_sugeridas": ["TCC","DBT","ACT","Psicanalise", etc],
  "indicacao_medicacao": "string ou null",
  "observacoes_clinicas": "",
  "limitacoes": "Esta analise e baseada em texto e nao substitui avaliacao clinica presencial.",
  "confianca_analise": "alta|media|baixa"
}
${patientInfo ? `Dados do paciente: ${JSON.stringify(patientInfo)}` : ""}`,
        },
        { role: "user", content: `Relato clinico:\n\n${text.trim()}` },
      ],
    });

    let analysis = null;
    try {
      analysis = JSON.parse(analysisResponse.choices[0].message.content);
    } catch (_) {
      analysis = { raw: analysisResponse.choices[0].message.content };
    }

    let savedId = null;
    if (req.db && req.user) {
      const { data } = await req.db
        .from("ai_mind_analyses")
        .insert({ user_id: req.user.id, input_text: text.trim(), analysis, patient_info: patientInfo || null })
        .select("id")
        .single();
      savedId = data?.id;
    }

    return res.json({ ok: true, id: savedId, analysis });
  } catch (error) {
    console.error("[mind-analysis]", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/mind-analyses
app.get("/api/ai/mind-analyses", requireUser, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { data, error } = await req.db
      .from("ai_mind_analyses")
      .select("id, input_text, analysis, patient_info, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ items: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// DELETE /api/ai/mind-analyses/:id
app.delete("/api/ai/mind-analyses/:id", requireUser, async (req, res) => {
  try {
    const { error } = await req.db
      .from("ai_mind_analyses")
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
    srv = srv.replace("app.listen(PORT, () => {", MIND_ROUTES + "app.listen(PORT, () => {", 1)
    with open(SERVER, "w", encoding="utf-8") as f:
        f.write(srv)
    print("  ✅ Rotas /api/ai/mind-analysis adicionadas ao server.js")

print("""
════════════════════════════════════════════════════════
✅ Mind Analysis aplicado!

Próximos passos:

1. SQL — adicione a tabela no Supabase:
   (cole o sql abaixo no SQL Editor)

   CREATE TABLE IF NOT EXISTS ai_mind_analyses (
     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     input_text  TEXT,
     analysis    JSONB,
     patient_info JSONB,
     created_at  TIMESTAMPTZ DEFAULT NOW()
   );
   ALTER TABLE ai_mind_analyses ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "own_mind_analyses" ON ai_mind_analyses FOR ALL USING (auth.uid() = user_id);

2. Backend:
   cd /Volumes/SSD_MAC/Projects/SynapsysAI/backend
   git add server.js && git commit -m "feat: mind-analysis route" && git push

3. Frontend:
   cd /Volumes/SSD_MAC/Projects/SynapsysAI/frontend
   git add -A && git commit -m "feat: MindAnalysis page" && git push
════════════════════════════════════════════════════════
""")
