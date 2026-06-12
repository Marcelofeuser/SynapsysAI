import { useState, useRef } from "react";

const API = import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes("insightdisc") ? import.meta.env.VITE_API_URL : "https://synapsys-backend-production.up.railway.app";

const PELE_COLORS = {
  seca: "text-amber-400", oleosa: "text-green-400", mista: "text-blue-400",
  normal: "text-emerald-400", sensivel: "text-rose-400",
};
const SEV_COLORS = {
  leve: "bg-yellow-900/40 text-yellow-300 border-yellow-800",
  moderada: "bg-orange-900/40 text-orange-300 border-orange-800",
  grave: "bg-red-900/40 text-red-300 border-red-800",
};

function ScoreRing({ score }) {
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute -rotate-90" width="96" height="96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#374151" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center">
        <div className="text-2xl font-bold" style={{ color }}>{score}</div>
        <div className="text-xs text-gray-500">/100</div>
      </div>
    </div>
  );
}

export default function SkinAnalysis() {
  const [image,          setImage]      = useState(null);   // base64
  const [preview,        setPreview]    = useState(null);   // data URL para exibição
  const [analysis,       setAnalysis]   = useState(null);
  const [loading,        setLoading]    = useState(false);
  const [error,          setError]      = useState("");
  const [patientInfo,    setPatientInfo]= useState({ nome: "", idade: "", historico: "" });
  const [showPatient,    setShowPatient]= useState(false);
  const [printMode,      setPrintMode]  = useState(false);

  const fileInputRef = useRef(null);
  const dropRef      = useRef(null);
  const token = () => localStorage.getItem("synapsys_token") || sessionStorage.getItem("synapsys_token");

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Selecione uma imagem válida (JPG, PNG, WEBP).");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setPreview(dataUrl);
      // Extrair só o base64
      setImage(dataUrl.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const analyze = async () => {
    if (!image) return;
    setLoading(true);
    setError("");
    setAnalysis(null);
    try {
      const patientPayload =
        patientInfo.nome || patientInfo.idade || patientInfo.historico ? patientInfo : undefined;
      const res = await fetch(`${API}/api/ai/skin-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ image, patientInfo: patientPayload }),
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

  const handlePrint = () => {
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">🔬</span>
            <h1 className="text-2xl font-bold">Análise de Pele</h1>
            <span className="text-xs bg-sky-600/30 text-sky-300 border border-sky-600/40 px-2 py-0.5 rounded-full">
              GPT-4o Vision
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            Envie uma foto da pele para análise dermatológica com IA, diagnóstico diferencial e protocolo de tratamento.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left — Upload */}
          <div className="space-y-4">
            {/* Drop Zone */}
            <div
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`relative rounded-2xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden ${
                preview
                  ? "border-sky-600/50"
                  : "border-gray-700 hover:border-sky-500"
              }`}
            >
              {preview ? (
                <img src={preview} alt="Pele" className="w-full object-cover rounded-2xl max-h-80" />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <span className="text-4xl mb-3">🖼️</span>
                  <p className="text-gray-400 font-medium mb-1">Arraste ou clique para enviar</p>
                  <p className="text-gray-600 text-sm">JPG, PNG, WEBP — até 20MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

            {preview && (
              <button
                onClick={() => { setImage(null); setPreview(null); setAnalysis(null); }}
                className="w-full text-sm text-gray-500 hover:text-gray-300 py-1 transition-colors"
              >
                ✕ Remover imagem
              </button>
            )}

            {/* Patient Info Toggle */}
            <button
              onClick={() => setShowPatient((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              <span>👤 Informações do Paciente (opcional)</span>
              <span>{showPatient ? "▲" : "▼"}</span>
            </button>

            {showPatient && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                {[
                  { key: "nome",      label: "Nome",     placeholder: "Nome do paciente" },
                  { key: "idade",     label: "Idade",    placeholder: "Ex: 28 anos" },
                  { key: "historico", label: "Histórico relevante", placeholder: "Condições, alergias, medicamentos..." },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs text-gray-500 block mb-1">{label}</label>
                    {key === "historico" ? (
                      <textarea
                        value={patientInfo[key]}
                        onChange={(e) => setPatientInfo((p) => ({ ...p, [key]: e.target.value }))}
                        placeholder={placeholder}
                        rows={2}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-sky-500 resize-none"
                      />
                    ) : (
                      <input
                        value={patientInfo[key]}
                        onChange={(e) => setPatientInfo((p) => ({ ...p, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-sky-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Analyze Button */}
            <button
              onClick={analyze}
              disabled={!image || loading}
              className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 rounded-xl font-semibold text-white transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analisando com GPT-4o...
                </span>
              ) : (
                "🔬 Analisar Pele"
              )}
            </button>

            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-xl p-3 text-red-400 text-sm">
                ⚠️ {error}
              </div>
            )}
          </div>

          {/* Right — Results */}
          <div>
            {!analysis && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <span className="text-4xl mb-3 opacity-30">🔬</span>
                <p className="text-gray-600">O relatório aparecerá aqui após a análise</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-12 h-12 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-400">Processando imagem...</p>
                <p className="text-gray-600 text-sm mt-1">GPT-4o analisando características da pele</p>
              </div>
            )}

            {analysis && !loading && (
              <div className="space-y-4">
                {/* Header do relatório */}
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-200">Relatório de Análise</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrint}
                      className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 transition-colors"
                    >
                      🖨️ Imprimir
                    </button>
                  </div>
                </div>

                {/* Alerta encaminhamento urgente */}
                {analysis.encaminhamento_urgente && (
                  <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 flex gap-2 items-start">
                    <span className="text-red-400 text-lg shrink-0">⚠️</span>
                    <div>
                      <p className="text-red-300 font-semibold text-sm">Encaminhamento Urgente Recomendado</p>
                      {analysis.motivo_encaminhamento && (
                        <p className="text-red-400 text-xs mt-0.5">{analysis.motivo_encaminhamento}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Score + tipo */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-6">
                  {analysis.score_saude_pele != null && (
                    <ScoreRing score={analysis.score_saude_pele} />
                  )}
                  <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                    {analysis.tipo_pele && (
                      <div>
                        <p className="text-gray-500 text-xs">Tipo de Pele</p>
                        <p className={`font-medium capitalize ${PELE_COLORS[analysis.tipo_pele] || "text-gray-200"}`}>
                          {analysis.tipo_pele}
                        </p>
                      </div>
                    )}
                    {analysis.tom_pele && (
                      <div>
                        <p className="text-gray-500 text-xs">Tom</p>
                        <p className="font-medium text-gray-200 capitalize">{analysis.tom_pele}</p>
                      </div>
                    )}
                    {analysis.hidratacao && (
                      <div>
                        <p className="text-gray-500 text-xs">Hidratação</p>
                        <p className="font-medium text-gray-200 capitalize">{analysis.hidratacao}</p>
                      </div>
                    )}
                    {analysis.textura && (
                      <div>
                        <p className="text-gray-500 text-xs">Textura</p>
                        <p className="font-medium text-gray-200 capitalize">{analysis.textura}</p>
                      </div>
                    )}
                    {analysis.confianca_analise && (
                      <div>
                        <p className="text-gray-500 text-xs">Confiança</p>
                        <p className="font-medium text-gray-200 capitalize">{analysis.confianca_analise}</p>
                      </div>
                    )}
                    {analysis.fototipoFitzpatrick && (
                      <div>
                        <p className="text-gray-500 text-xs">Fototipo Fitzpatrick</p>
                        <p className="font-medium text-gray-200">Tipo {analysis.fototipoFitzpatrick}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Condições identificadas */}
                {analysis.condicoes_identificadas?.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">Condições Identificadas</h3>
                    <div className="space-y-2">
                      {analysis.condicoes_identificadas.map((c, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${SEV_COLORS[c.severidade] || "bg-gray-800 text-gray-400 border-gray-700"}`}>
                            {c.severidade}
                          </span>
                          <div>
                            <p className="text-sm text-gray-200 font-medium">{c.nome}</p>
                            {c.localizacao && <p className="text-xs text-gray-500">{c.localizacao}</p>}
                            {c.descricao && <p className="text-xs text-gray-400 mt-0.5">{c.descricao}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recomendações */}
                {analysis.recomendacoes && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">Recomendações</h3>
                    <div className="space-y-3">
                      {[
                        { key: "imediatas",             label: "⚡ Ações Imediatas",        color: "text-red-400" },
                        { key: "rotina_diaria",         label: "🌅 Rotina Diária",           color: "text-blue-400" },
                        { key: "ingredientes_indicados",label: "✅ Ingredientes Indicados",  color: "text-green-400" },
                        { key: "ingredientes_evitar",   label: "❌ Evitar",                  color: "text-amber-400" },
                        { key: "procedimentos_sugeridos",label:"💉 Procedimentos",           color: "text-violet-400" },
                      ].map(({ key, label, color }) => {
                        const items = analysis.recomendacoes[key];
                        if (!items?.length) return null;
                        return (
                          <div key={key}>
                            <p className={`text-xs font-semibold mb-1.5 ${color}`}>{label}</p>
                            <ul className="space-y-1">
                              {items.map((item, i) => (
                                <li key={i} className="text-xs text-gray-300 flex gap-2">
                                  <span className="text-gray-600 shrink-0">·</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Observações clínicas */}
                {analysis.observacoes_clinicas && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Observações Clínicas</h3>
                    <p className="text-sm text-gray-400">{analysis.observacoes_clinicas}</p>
                  </div>
                )}

                {/* Limitações */}
                {analysis.limitacoes && (
                  <p className="text-xs text-gray-600 italic px-1">{analysis.limitacoes}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
