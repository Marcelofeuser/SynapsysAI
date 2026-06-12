import { useState, useRef, useEffect } from "react";

const API = import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes("insightdisc") ? import.meta.env.VITE_API_URL : "https://synapsys-backend-production.up.railway.app";

const QUICK_PROMPTS = [
  { icon: "🧠", label: "Critérios diagnósticos", text: "Quais são os critérios diagnósticos para depressão maior?" },
  { icon: "⚖️", label: "Diagnóstico diferencial", text: "Explique os diagnósticos diferenciais para ansiedade generalizada." },
  { icon: "💊", label: "Farmacologia ISRS", text: "Quais são as indicações e contraindicações de ISRS?" },
  { icon: "🆘", label: "Avaliação de risco", text: "Como conduzir uma avaliação de risco de suicídio?" },
  { icon: "🫁", label: "Crise de pânico", text: "Protocolo para crise de pânico em consultório." },
  { icon: "📄", label: "Relatório clínico", text: "Redija um relatório psicológico breve baseado neste caso:" },
];

function renderText(text) {
  return text.split("\n").map((line, i) => {
    const bold = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    return (
      <p
        key={i}
        className={i > 0 ? "mt-1.5" : ""}
        dangerouslySetInnerHTML={{ __html: bold }}
      />
    );
  });
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
          isUser
            ? "bg-gradient-to-br from-violet-500 to-purple-700 text-white"
            : "bg-gradient-to-br from-teal-500 to-emerald-700 text-white"
        }`}
      >
        {isUser ? "M" : "S"}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-violet-600/15 border border-violet-500/25 text-gray-100 rounded-tr-sm"
            : "bg-gray-900 border border-gray-800 text-gray-200 rounded-tl-sm"
        }`}
      >
        {renderText(msg.content)}

        {msg.toolCalls?.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-gray-700/50 flex flex-wrap gap-1.5">
            {msg.toolCalls.map((tc, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs bg-teal-950/60 text-teal-400 border border-teal-800/50 px-2 py-0.5 rounded-full"
              >
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                {tc.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
        S
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-tl-sm px-4 py-3.5 flex gap-1.5 items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gray-500"
            style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
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
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  const token = () => {
    try {
      const s = JSON.parse(localStorage.getItem("synapsys.session.v1") || "{}");
      return s.accessToken || null;
    } catch { return null; }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 128) + "px";
  }, [input]);

  const contextPayload = () => {
    const ctx = {};
    if (patientContext.nome)         ctx.nome         = patientContext.nome;
    if (patientContext.idade)        ctx.idade        = patientContext.idade;
    if (patientContext.diagnostico)  ctx.diagnostico  = patientContext.diagnostico;
    if (patientContext.historico)    ctx.historico    = patientContext.historico;
    if (patientContext.medicamentos) ctx.medicamentos = patientContext.medicamentos;
    return Object.keys(ctx).length > 0 ? ctx : null;
  };

  const hasPatient = Object.values(patientContext).some(Boolean);

  const send = async (userInput) => {
    const text = (userInput || input).trim();
    if (!text || loading) return;
    setInput("");

    const newUserMsg     = { role: "user", content: text };
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
        { role: "assistant", content: `⚠️ ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const newSession = () => { setMessages([]); setSessionId(null); setInput(""); };

  const loadSessions = async () => {
    try {
      const res  = await fetch(`${API}/api/ai/copilot/sessions?limit=20`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setSessions(data.items || []);
      setShowSessions(true);
    } catch {}
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .4; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col px-4 py-5">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center text-lg">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight">Synapsys Copilot</h1>
                <span className="text-[10px] font-medium bg-teal-500/15 text-teal-400 border border-teal-500/25 px-1.5 py-0.5 rounded-full">
                  GPT-4o
                </span>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">Assistente clínico com acesso aos dados da clínica</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowContext((v) => !v)}
              className={`relative text-xs px-3 py-1.5 rounded-lg border transition-all ${
                showContext
                  ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                  : "border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700"
              }`}
            >
              👤 Paciente
              {hasPatient && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full" />
              )}
            </button>
            <button
              onClick={loadSessions}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700 transition-all"
            >
              📋
            </button>
            <button
              onClick={newSession}
              className="text-xs px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-white transition-all font-medium"
            >
              + Nova
            </button>
          </div>
        </div>

        {/* ── Patient Context Panel ────────────────────────────────────────── */}
        {showContext && (
          <div className="mb-4 bg-gray-900/80 border border-gray-800 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Contexto do Paciente
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { key: "nome",         label: "Nome",         placeholder: "Nome completo" },
                { key: "idade",        label: "Idade",        placeholder: "Ex: 35 anos" },
                { key: "diagnostico",  label: "Diagnóstico",  placeholder: "CID ou descrição" },
                { key: "medicamentos", label: "Medicamentos", placeholder: "Em uso atual" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wider block mb-1">
                    {label}
                  </label>
                  <input
                    value={patientContext[key]}
                    onChange={(e) => setPatientContext((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-violet-500/60 transition-colors"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wider block mb-1">
                  Histórico Relevante
                </label>
                <textarea
                  value={patientContext.historico}
                  onChange={(e) => setPatientContext((p) => ({ ...p, historico: e.target.value }))}
                  placeholder="Resumo do histórico clínico..."
                  rows={2}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-violet-500/60 transition-colors resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Sessions Dropdown ────────────────────────────────────────────── */}
        {showSessions && (
          <div className="mb-4 bg-gray-900/80 border border-gray-800 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sessões Anteriores</p>
              <button onClick={() => setShowSessions(false)} className="text-gray-600 hover:text-gray-400 text-sm transition-colors">✕</button>
            </div>
            {sessions.length === 0 && (
              <p className="text-gray-600 text-sm text-center py-3">Nenhuma sessão salva.</p>
            )}
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-gray-800/60 hover:bg-gray-800 rounded-xl transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-200 truncate">{s.title}</p>
                    <p className="text-xs text-gray-600">{new Date(s.updated_at).toLocaleString("pt-BR")}</p>
                  </div>
                  <button
                    onClick={() => { setSessionId(s.id); setShowSessions(false); }}
                    className="ml-3 shrink-0 text-xs px-2.5 py-1 bg-violet-600/20 text-violet-300 hover:bg-violet-600/40 rounded-lg transition-colors"
                  >
                    Continuar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Messages / Empty State ───────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto mb-4 min-h-0"
          style={{ maxHeight: "calc(100vh - 260px)" }}
        >
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-700/20 border border-teal-500/20 flex items-center justify-center text-3xl mb-5">
                🤖
              </div>
              <h2 className="text-lg font-semibold text-gray-200 mb-1">Olá! Sou seu copiloto clínico.</h2>
              <p className="text-gray-500 text-sm mb-7 max-w-sm">
                Posso buscar pacientes, consultar histórico, agendar sessões e responder perguntas clínicas.
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-xl">
                {QUICK_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => send(p.text)}
                    className="group flex items-start gap-3 text-left bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl px-4 py-3 transition-all"
                  >
                    <span className="text-lg shrink-0 mt-0.5">{p.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors">{p.label}</p>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{p.text}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {messages.map((msg, i) => <Message key={i} msg={msg} />)}
              {loading && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Input ───────────────────────────────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-800 hover:border-gray-700 focus-within:border-gray-700 rounded-2xl px-4 py-3 flex gap-3 items-end transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={loading ? "Aguardando resposta..." : "Pergunte algo ou peça dados da clínica…"}
            disabled={loading}
            rows={1}
            className="flex-1 bg-transparent text-gray-200 placeholder-gray-600 text-sm resize-none focus:outline-none disabled:opacity-50 leading-6 max-h-32 overflow-y-auto"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-8 h-8 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg flex items-center justify-center shrink-0 transition-all"
          >
            <svg className="w-3.5 h-3.5 rotate-90" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>

        <p className="text-center text-xs text-gray-700 mt-2">
          Enter para enviar · Shift+Enter para nova linha · As decisões clínicas são sempre do profissional
        </p>
      </div>
    </div>
  );
}
