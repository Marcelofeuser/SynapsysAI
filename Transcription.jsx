import { useState, useRef, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "https://synapsys-backend-production.up.railway.app";

const FIELD_LABELS = {
  queixa_principal:      "Queixa Principal",
  historico_presente:    "Histórico da Doença Atual",
  historico_anterior:    "Histórico Anterior",
  medicamentos:          "Medicamentos",
  alergias:              "Alergias",
  exame_fisico:          "Exame Físico",
  hipotese_diagnostica:  "Hipótese Diagnóstica",
  conduta:               "Conduta / Prescrição",
  retorno:               "Retorno",
  observacoes:           "Observações",
};

function formatDuration(seconds) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function Transcription() {
  const [recording, setRecording]     = useState(false);
  const [processing, setProcessing]   = useState(false);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState("");
  const [activeTab, setActiveTab]     = useState("record"); // record | upload | history
  const [history, setHistory]         = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [editedFields, setEditedFields]   = useState({});
  const [copied, setCopied]           = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const fileInputRef     = useRef(null);

  const token = () => localStorage.getItem("synapsys_token") || sessionStorage.getItem("synapsys_token");

  // ── Gravação ──────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setError("");
    } catch {
      setError("Permissão de microfone negada. Verifique as configurações do navegador.");
    }
  };

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.onstop = async () => {
      mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      await transcribe(blob, "gravacao.webm");
    };
    mediaRecorderRef.current.stop();
    setRecording(false);
  }, []);

  // ── Upload de arquivo ─────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await transcribe(file, file.name);
    e.target.value = "";
  };

  // ── Transcrição via API ───────────────────────────────
  const transcribe = async (blob, filename) => {
    setProcessing(true);
    setError("");
    setResult(null);
    setEditedFields({});
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const res = await fetch(`${API}/api/ai/transcribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ audio: base64, filename, language: "pt", parseFields: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na transcrição");
      setResult(data);
      setEditedFields(data.parsedFields || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // ── Histórico ─────────────────────────────────────────
  const loadHistory = async () => {
    if (historyLoaded) return;
    try {
      const res = await fetch(`${API}/api/ai/transcriptions?limit=30`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setHistory(data.items || []);
      setHistoryLoaded(true);
    } catch {}
  };

  const deleteTranscription = async (id) => {
    if (!confirm("Excluir esta transcrição?")) return;
    await fetch(`${API}/api/ai/transcriptions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    setHistory((h) => h.filter((t) => t.id !== id));
  };

  // ── Copiar prontuário ─────────────────────────────────
  const copyProntuario = () => {
    if (!editedFields) return;
    const lines = Object.entries(FIELD_LABELS)
      .map(([k, label]) => {
        const val = editedFields[k];
        if (!val || (Array.isArray(val) && val.length === 0)) return null;
        const display = Array.isArray(val) ? val.join(", ") : val;
        return `${label}:\n${display}`;
      })
      .filter(Boolean);
    navigator.clipboard.writeText(lines.join("\n\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">🎙️</span>
            <h1 className="text-2xl font-bold">Transcrição Clínica</h1>
            <span className="text-xs bg-violet-600/30 text-violet-300 border border-violet-600/40 px-2 py-0.5 rounded-full">
              Whisper + GPT-4o
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            Grave ou envie o áudio da consulta e receba a transcrição + prontuário preenchido automaticamente.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6 w-fit">
          {[
            { id: "record", label: "🎙️ Gravar" },
            { id: "upload", label: "📁 Enviar Arquivo" },
            { id: "history", label: "📋 Histórico" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "history") loadHistory();
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-violet-600 text-white shadow"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Record Tab */}
        {activeTab === "record" && (
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center">
            <div className="mb-6">
              {recording ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center animate-pulse">
                    <div className="w-6 h-6 rounded-full bg-red-500" />
                  </div>
                  <p className="text-red-400 font-medium">Gravando...</p>
                  <button
                    onClick={stopRecording}
                    className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-semibold transition-colors"
                  >
                    ⏹ Parar e Transcrever
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-violet-600/20 border-2 border-violet-500 flex items-center justify-center">
                    <span className="text-3xl">🎙️</span>
                  </div>
                  <p className="text-gray-400">Clique para iniciar a gravação da consulta</p>
                  <button
                    onClick={startRecording}
                    disabled={processing}
                    className="px-8 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl font-semibold transition-colors"
                  >
                    ▶ Iniciar Gravação
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === "upload" && (
          <div
            className="bg-gray-900 rounded-2xl p-12 border-2 border-dashed border-gray-700 hover:border-violet-500 transition-colors text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="text-5xl mb-4 block">📁</span>
            <p className="text-gray-300 font-medium mb-1">Clique para selecionar o arquivo de áudio</p>
            <p className="text-gray-500 text-sm">Suporta: MP3, MP4, WAV, M4A, WEBM, OGG (máx 25MB)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/mp4,video/webm"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-3">
            {!historyLoaded && (
              <p className="text-gray-400 text-center py-8">Carregando...</p>
            )}
            {historyLoaded && history.length === 0 && (
              <p className="text-gray-500 text-center py-8">Nenhuma transcrição salva ainda.</p>
            )}
            {history.map((item) => (
              <div
                key={item.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-400 mb-1">
                    {new Date(item.created_at).toLocaleString("pt-BR")}
                    {item.duration_seconds && (
                      <span className="ml-2 text-gray-500">· {formatDuration(item.duration_seconds)}</span>
                    )}
                  </p>
                  <p className="text-gray-200 text-sm line-clamp-2">{item.transcription}</p>
                  {item.parsed_fields?.hipotese_diagnostica && (
                    <p className="text-xs text-violet-400 mt-1">
                      Hipótese: {item.parsed_fields.hipotese_diagnostica}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setResult({ transcription: item.transcription, parsedFields: item.parsed_fields });
                      setEditedFields(item.parsed_fields || {});
                      setActiveTab("record");
                    }}
                    className="text-xs px-3 py-1 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 rounded-lg transition-colors"
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => deleteTranscription(item.id)}
                    className="text-xs px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Processing */}
        {processing && (
          <div className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-300 font-medium">Transcrevendo com Whisper...</p>
            <p className="text-gray-500 text-sm mt-1">Extraindo campos do prontuário com GPT-4o</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* Result */}
        {result && !processing && (
          <div className="mt-6 space-y-4">
            {/* Transcrição bruta */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-200">📝 Transcrição</h3>
                {result.duration && (
                  <span className="text-xs text-gray-500">{formatDuration(result.duration)}</span>
                )}
              </div>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {result.transcription}
              </p>
            </div>

            {/* Campos do prontuário */}
            {editedFields && Object.keys(editedFields).length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-200">🗂️ Prontuário Preenchido</h3>
                  <button
                    onClick={copyProntuario}
                    className="text-xs px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 rounded-lg transition-colors"
                  >
                    {copied ? "✓ Copiado!" : "📋 Copiar Tudo"}
                  </button>
                </div>
                <div className="grid gap-3">
                  {Object.entries(FIELD_LABELS).map(([key, label]) => {
                    const val = editedFields[key];
                    if (!val || (Array.isArray(val) && val.length === 0)) return null;
                    const isArray = Array.isArray(val);
                    return (
                      <div key={key} className="border border-gray-800 rounded-xl p-3">
                        <label className="text-xs text-violet-400 font-medium block mb-1.5">{label}</label>
                        {isArray ? (
                          <div className="flex flex-wrap gap-1.5">
                            {val.map((item, i) => (
                              <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-lg">
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <textarea
                            value={val}
                            onChange={(e) =>
                              setEditedFields((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            rows={val.length > 100 ? 3 : 1}
                            className="w-full bg-transparent text-gray-200 text-sm resize-none focus:outline-none"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
