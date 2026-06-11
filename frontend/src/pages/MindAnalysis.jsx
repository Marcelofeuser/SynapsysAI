import { useState, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "https://synapsys-backend-production.up.railway.app";

const RISK_COLORS = {
  baixo:  "bg-green-900/40 text-green-300 border-green-800",
  medio:  "bg-yellow-900/40 text-yellow-300 border-yellow-800",
  alto:   "bg-orange-900/40 text-orange-300 border-orange-800",
  critico:"bg-red-900/40 text-red-300 border-red-800",
};

const HUMOR_EMOJI = {
  eutimico: "😊", deprimido: "😔", ansioso: "😰", irritado: "😤",
  eufórico: "😄", apático: "😶", lábil: "😵", neutro: "😐",
};

function ScoreBar({ label, value, color = "bg-violet-500" }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300">{value}/10</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  );
}

const PLACEHOLDERS = [
  "Ex: Paciente relata insônia há 3 semanas, choro fácil, desmotivação para atividades que antes eram prazerosas. Nega ideação suicida. Histórico de episódio depressivo em 2021...",
  "Ex: Durante a sessão o paciente demonstrou agitação psicomotora, pensamento acelerado, discurso prolixo. Refere diminuição da necessidade de sono. Humor expansivo...",
  "Ex: Paciente apresenta preocupações excessivas com saúde, evitação de situações sociais, sintomas físicos como palpitações e tremores. Refere que a ansiedade está impactando o trabalho...",
];

export default function MindAnalysis() {
  const [inputText,    setInputText]   = useState("");
  const [analysis,     setAnalysis]    = useState(null);
  const [loading,      setLoading]     = useState(false);
  const [error,        setError]       = useState("");
  const [patientInfo,  setPatientInfo] = useState({ nome: "", idade: "", diagnostico_anterior: "", medicamentos: "" });
  const [showPatient,  setShowPatient] = useState(false);
  const [placeholder]                  = useState(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
  const [history,      setHistory]     = useState([]);
  const [showHistory,  setShowHistory] = useState(false);
  const [historyLoaded,setHistoryLoaded]=useState(false);

  const token = () => localStorage.getItem("synapsys_token") || sessionStorage.getItem("synapsys_token");

  const analyze = async () => {
    const text = inputText.trim();
    if (!text || text.length < 20) {
      setError("Descreva o caso com pelo menos 20 caracteres para uma análise significativa.");
      return;
    }
    setLoading(true);
    setError("");
    setAnalysis(null);
    try {
      const patientPayload =
        patientInfo.nome || patientInfo.idade || patientInfo.diagnostico_anterior || patientInfo.medicamentos
          ? patientInfo : undefined;

      const res = await fetch(`${API}/api/ai/mind-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ text, patientInfo: patientPayload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na análise");
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    if (historyLoaded) return;
    try {
      const res = await fetch(`${API}/api/ai/mind-analyses?limit=20`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setHistory(data.items || []);
      setHistoryLoaded(true);
    } catch {}
  };

  const deleteAnalysis = async (id) => {
    if (!confirm("Excluir esta análise?")) return;
    await fetch(`${API}/api/ai/mind-analyses/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    setHistory((h) => h.filter((a) => a.id !== id));
  };

  const copyReport = () => {
    if (!analysis) return;
    const lines = [
      `ANÁLISE PSICOLÓGICA — Synapsys Copilot`,
      `Data: ${new Date().toLocaleString("pt-BR")}`,
      "",
      analysis.estado_humor ? `Estado de Humor: ${analysis.estado_humor}` : null,
      analysis.nivel_sofrimento != null ? `Nível de Sofrimento: ${analysis.nivel_sofrimento}/10` : null,
      "",
      analysis.hipoteses_diagnosticas?.length
        ? `Hipóteses Diagnósticas:\n${analysis.hipoteses_diagnosticas.map((h) => `  - ${h.diagnostico} (CID: ${h.cid || "—"}) — Probabilidade: ${h.probabilidade}`).join("\n")}`
        : null,
      "",
      analysis.fatores_risco?.length
        ? `Fatores de Risco:\n${analysis.fatores_risco.map((f) => `  - ${f}`).join("\n")}`
        : null,
      "",
      analysis.pontos_fortes?.length
        ? `Pontos Fortes / Fatores Protetivos:\n${analysis.pontos_fortes.map((p) => `  - ${p}`).join("\n")}`
        : null,
      "",
      analysis.recomendacoes_terapeuticas?.length
        ? `Recomendações Terapêuticas:\n${analysis.recomendacoes_terapeuticas.map((r) => `  - ${r}`).join("\n")}`
        : null,
      "",
      analysis.observacoes_clinicas ? `Observações Clínicas:\n${analysis.observacoes_clinicas}` : null,
      "",
      "— Gerado por Synapsys Copilot (GPT-4o) — uso exclusivo do profissional —",
    ].filter(Boolean);
    navigator.clipboard.writeText(lines.join("\n"));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">🧠</span>
            <h1 className="text-2xl font-bold">Mind Analysis</h1>
            <span className="text-xs bg-violet-600/30 text-violet-300 border border-violet-600/40 px-2 py-0.5 rounded-full">
              GPT-4o Clinical
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            Descreva o relato do paciente, comportamentos observados ou notas da sessão para análise psicológica estruturada.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6 w-fit">
          {[
            { id: "analyze", label: "🧠 Analisar" },
            { id: "history", label: "📋 Histórico" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setShowHistory(tab.id === "history");
                if (tab.id === "history") loadHistory();
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                (tab.id === "analyze" && !showHistory) || (tab.id === "history" && showHistory)
                  ? "bg-violet-600 text-white shadow"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* History Tab */}
        {showHistory && (
          <div className="space-y-3">
            {!historyLoaded && <p className="text-gray-400 text-center py-8">Carregando...</p>}
            {historyLoaded && history.length === 0 && (
              <p className="text-gray-500 text-center py-8">Nenhuma análise salva ainda.</p>
            )}
            {history.map((item) => (
              <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">{new Date(item.created_at).toLocaleString("pt-BR")}</p>
                  {item.patient_info?.nome && (
                    <p className="text-sm font-medium text-gray-200 mb-1">{item.patient_info.nome}</p>
                  )}
                  {item.analysis?.hipoteses_diagnosticas?.[0] && (
                    <p className="text-xs text-violet-400">{item.analysis.hipoteses_diagnosticas[0].diagnostico}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.input_text}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setAnalysis(item.analysis);
                      setInputText(item.input_text || "");
                      setShowHistory(false);
                    }}
                    className="text-xs px-3 py-1 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 rounded-lg transition-colors"
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => deleteAnalysis(item.id)}
                    className="text-xs px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Analyze Tab */}
        {!showHistory && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input */}
            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <label className="text-sm font-medium text-gray-300 block mb-3">
                  Relato / Observações Clínicas
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={placeholder}
                  rows={10}
                  className="w-full bg-transparent text-gray-200 text-sm placeholder-gray-600 resize-none focus:outline-none leading-relaxed"
                />
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-800">
                  <span className="text-xs text-gray-600">{inputText.length} caracteres</span>
                  <button
                    onClick={() => setInputText("")}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              {/* Patient Info */}
              <button
                onClick={() => setShowPatient((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                <span>👤 Dados do Paciente (opcional)</span>
                <span>{showPatient ? "▲" : "▼"}</span>
              </button>

              {showPatient && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                  {[
                    { key: "nome",                label: "Nome",                    placeholder: "Nome do paciente" },
                    { key: "idade",               label: "Idade",                   placeholder: "Ex: 34 anos" },
                    { key: "diagnostico_anterior",label: "Diagnóstico Anterior",    placeholder: "CID ou descrição" },
                    { key: "medicamentos",        label: "Medicamentos em Uso",     placeholder: "Nome e doses" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs text-gray-500 block mb-1">{label}</label>
                      <input
                        value={patientInfo[key]}
                        onChange={(e) => setPatientInfo((p) => ({ ...p, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-xl p-3 text-red-400 text-sm">
                  ⚠️ {error}
                </div>
              )}

              <button
                onClick={analyze}
                disabled={!inputText.trim() || loading}
                className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 rounded-xl font-semibold text-white transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analisando com GPT-4o...
                  </span>
                ) : (
                  "🧠 Analisar"
                )}
              </button>
            </div>

            {/* Result */}
            <div>
              {!analysis && !loading && (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <span className="text-5xl mb-3 opacity-20">🧠</span>
                  <p className="text-gray-600">O relatório psicológico aparecerá aqui</p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center h-full py-16">
                  <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-gray-400">Processando caso clínico...</p>
                  <p className="text-gray-600 text-sm mt-1">GPT-4o analisando padrões psicológicos</p>
                </div>
              )}

              {analysis && !loading && (
                <div className="space-y-4">
                  {/* Report header */}
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-200">Análise Psicológica</h2>
                    <button
                      onClick={copyReport}
                      className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 transition-colors"
                    >
                      📋 Copiar Relatório
                    </button>
                  </div>

                  {/* Alerta urgente */}
                  {analysis.risco_suicidio && analysis.risco_suicidio !== "baixo" && (
                    <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 flex gap-2 items-start">
                      <span className="text-red-400 text-lg shrink-0">⚠️</span>
                      <div>
                        <p className="text-red-300 font-semibold text-sm">
                          Risco de Suicídio: {analysis.risco_suicidio.toUpperCase()}
                        </p>
                        {analysis.conduta_urgente && (
                          <p className="text-red-400 text-xs mt-0.5">{analysis.conduta_urgente}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Estado geral */}
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {analysis.estado_humor && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Estado de Humor</p>
                          <p className="font-medium text-gray-200 capitalize flex items-center gap-1.5">
                            <span>{HUMOR_EMOJI[analysis.estado_humor] || "🧠"}</span>
                            {analysis.estado_humor}
                          </p>
                        </div>
                      )}
                      {analysis.risco_suicidio && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Risco de Suicídio</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${RISK_COLORS[analysis.risco_suicidio] || "bg-gray-800 text-gray-400 border-gray-700"}`}>
                            {analysis.risco_suicidio}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {analysis.nivel_sofrimento != null && (
                        <ScoreBar label="Nível de Sofrimento" value={analysis.nivel_sofrimento} color="bg-red-500" />
                      )}
                      {analysis.nivel_funcionalidade != null && (
                        <ScoreBar label="Funcionalidade" value={analysis.nivel_funcionalidade} color="bg-green-500" />
                      )}
                      {analysis.insight_paciente != null && (
                        <ScoreBar label="Insight" value={analysis.insight_paciente} color="bg-blue-500" />
                      )}
                    </div>
                  </div>

                  {/* Hipóteses diagnósticas */}
                  {analysis.hipoteses_diagnosticas?.length > 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                      <h3 className="text-sm font-semibold text-gray-300 mb-3">Hipóteses Diagnósticas</h3>
                      <div className="space-y-2">
                        {analysis.hipoteses_diagnosticas.map((h, i) => (
                          <div key={i} className="flex items-start justify-between gap-3 p-2 bg-gray-800 rounded-xl">
                            <div>
                              <p className="text-sm text-gray-200 font-medium">{h.diagnostico}</p>
                              {h.cid && <p className="text-xs text-gray-500">CID: {h.cid}</p>}
                              {h.justificativa && <p className="text-xs text-gray-400 mt-0.5">{h.justificativa}</p>}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${
                              h.probabilidade === "alta"
                                ? "bg-violet-900/40 text-violet-300 border-violet-800"
                                : h.probabilidade === "media"
                                ? "bg-blue-900/40 text-blue-300 border-blue-800"
                                : "bg-gray-800 text-gray-400 border-gray-700"
                            }`}>
                              {h.probabilidade || "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fatores de risco e proteção */}
                  <div className="grid grid-cols-2 gap-3">
                    {analysis.fatores_risco?.length > 0 && (
                      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                        <h3 className="text-xs font-semibold text-red-400 mb-2">⚠️ Fatores de Risco</h3>
                        <ul className="space-y-1">
                          {analysis.fatores_risco.map((f, i) => (
                            <li key={i} className="text-xs text-gray-300 flex gap-1.5">
                              <span className="text-gray-600 shrink-0">·</span>{f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.pontos_fortes?.length > 0 && (
                      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                        <h3 className="text-xs font-semibold text-green-400 mb-2">✅ Fatores Protetivos</h3>
                        <ul className="space-y-1">
                          {analysis.pontos_fortes.map((p, i) => (
                            <li key={i} className="text-xs text-gray-300 flex gap-1.5">
                              <span className="text-gray-600 shrink-0">·</span>{p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Recomendações terapêuticas */}
                  {analysis.recomendacoes_terapeuticas?.length > 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                      <h3 className="text-sm font-semibold text-gray-300 mb-3">💡 Recomendações Terapêuticas</h3>
                      <ul className="space-y-1.5">
                        {analysis.recomendacoes_terapeuticas.map((r, i) => (
                          <li key={i} className="text-sm text-gray-300 flex gap-2">
                            <span className="text-violet-500 shrink-0">→</span>{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Abordagens sugeridas */}
                  {analysis.abordagens_sugeridas?.length > 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                      <h3 className="text-sm font-semibold text-gray-300 mb-2">📚 Abordagens Terapêuticas</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.abordagens_sugeridas.map((a, i) => (
                          <span key={i} className="text-xs bg-violet-900/30 text-violet-300 border border-violet-800 px-2 py-0.5 rounded-full">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observações clínicas */}
                  {analysis.observacoes_clinicas && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                      <h3 className="text-sm font-semibold text-gray-300 mb-2">📝 Observações Clínicas</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">{analysis.observacoes_clinicas}</p>
                    </div>
                  )}

                  {/* Disclaimer */}
                  {analysis.limitacoes && (
                    <p className="text-xs text-gray-600 italic px-1">{analysis.limitacoes}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
