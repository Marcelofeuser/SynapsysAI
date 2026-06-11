import { useState, useRef, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://synapsys-backend-production.up.railway.app";

const QUICK_PROMPTS = [
  "Quais são os critérios diagnósticos para depressão maior?",
  "Explique os diagnósticos diferenciais para ansiedade generalizada.",
  "Quais são as indicações e contraindicações de ISRS?",
  "Como conduzir uma avaliação de risco de suicídio?",
  "Protocolo para crise de pânico em consultório.",
  "Redija um relatório psicológico breve baseado neste caso:",
];

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
          isUser ? "bg-violet-600" : "bg-emerald-700"
        }`}
      >
        {isUser ? "👤" : "🤖"}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-violet-600/20 border border-violet-600/30 text-gray-100"
            : "bg-gray-800 border border-gray-700 text-gray-200"
        }`}
      >
        {msg.content.split("\n").map((line, i) => (
          <p key={i} className={i > 0 ? "mt-1.5" : ""}>
            {line}
          </p>
        ))}
        {msg.toolCalls?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {msg.toolCalls.map((tc, i) => (
              <span key={i} className="text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
                ⚙️ {tc.name}({Object.entries(tc.args).map(([k, v]) => `${k}: ${v}`).join(", ")})
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Copilot() {
  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [sessionId,      setSessionId]      = useState(null);
  const [showContext,    setShowContext]     = useState(false);
  const [patientContext, setPatientContext] = useState({
    nome: "", idade: "", diagnostico: "", historico: "", medicamentos: "",
  });
  const [sessions,       setSessions]       = useState([]);
  const [showSessions,   setShowSessions]   = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const token = () => localStorage.getItem("synapsys_token") || sessionStorage.getItem("synapsys_token");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const contextPayload = () => {
    const ctx = {};
    if (patientContext.nome)        ctx.nome = patientContext.nome;
    if (patientContext.idade)       ctx.idade = patientContext.idade;
    if (patientContext.diagnostico) ctx.diagnostico = patientContext.diagnostico;
    if (patientContext.historico)   ctx.historico = patientContext.historico;
    if (patientContext.medicamentos) ctx.medicamentos = patientContext.medicamentos;
    return Object.keys(ctx).length > 0 ? ctx : null;
  };

  const send = async (userInput) => {
    const text = (userInput || input).trim();
    if (!text || loading) return;
    setInput("");

    const newUserMsg = { role: "user", content: text };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/ai/copilot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          patientContext: contextPayload(),
          sessionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no copilot");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response, toolCalls: data.toolCalls || [] },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ Erro: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const newSession = () => {
    setMessages([]);
    setSessionId(null);
    setInput("");
  };

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API}/api/ai/copilot/sessions?limit=20`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setSessions(data.items || []);
      setShowSessions(true);
    } catch {}
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">Synapsys Copilot</h1>
                <span className="text-xs bg-emerald-600/30 text-emerald-300 border border-emerald-600/40 px-2 py-0.5 rounded-full">
                  GPT-4o
                </span>
              </div>
              <p className="text-gray-500 text-xs">Assistente clínico com function calling</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowContext((v) => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                showContext
                  ? "bg-violet-600/30 border-violet-600 text-violet-300"
                  : "border-gray-700 text-gray-400 hover:text-gray-200"
              }`}
            >
              👤 Paciente
            </button>
            <button
              onClick={loadSessions}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            >
              📋 Sessões
            </button>
            <button
              onClick={newSession}
              className="text-xs px-3 py-1.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-white transition-colors"
            >
              + Nova
            </button>
          </div>
        </div>

        {/* Context Panel */}
        {showContext && (
          <div className="mb-4 bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Contexto do Paciente (opcional)</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "nome",         label: "Nome",           placeholder: "Nome do paciente" },
                { key: "idade",        label: "Idade",          placeholder: "Ex: 35 anos" },
                { key: "diagnostico",  label: "Diagnóstico",    placeholder: "CID ou descrição" },
                { key: "medicamentos", label: "Medicamentos",   placeholder: "Em uso atual" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 block mb-1">{label}</label>
                  <input
                    value={patientContext[key]}
                    onChange={(e) => setPatientContext((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Histórico Relevante</label>
                <textarea
                  value={patientContext.historico}
                  onChange={(e) => setPatientContext((p) => ({ ...p, historico: e.target.value }))}
                  placeholder="Resumo do histórico clínico..."
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Sessions Dropdown */}
        {showSessions && (
          <div className="mb-4 bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">Sessões Anteriores</h3>
              <button onClick={() => setShowSessions(false)} className="text-gray-500 hover:text-gray-300 text-sm">✕</button>
            </div>
            {sessions.length === 0 && <p className="text-gray-500 text-sm">Nenhuma sessão salva.</p>}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-200">{s.title}</p>
                    <p className="text-xs text-gray-500">{new Date(s.updated_at).toLocaleString("pt-BR")}</p>
                  </div>
                  <button
                    onClick={() => { setSessionId(s.id); setShowSessions(false); }}
                    className="text-xs px-2 py-1 bg-violet-600/30 text-violet-300 rounded hover:bg-violet-600/50"
                  >
                    Continuar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0" style={{ maxHeight: "calc(100vh - 400px)" }}>
          {messages.length === 0 && (
            <div className="text-center py-8">
              <span className="text-5xl mb-4 block">🤖</span>
              <p className="text-gray-400 mb-6">Olá! Sou seu copiloto clínico. Como posso ajudar?</p>
              <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto">
                {QUICK_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => send(p)}
                    className="text-left text-xs text-gray-400 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 hover:border-violet-600 hover:text-gray-200 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-sm shrink-0">🤖</div>
              <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Faça uma pergunta clínica... (Enter para enviar)"
            rows={1}
            className="flex-1 bg-transparent text-gray-200 placeholder-gray-600 text-sm resize-none focus:outline-none max-h-32 overflow-y-auto"
            style={{ lineHeight: "1.5rem" }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-9 h-9 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 rounded-xl flex items-center justify-center shrink-0 transition-colors"
          >
            <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
