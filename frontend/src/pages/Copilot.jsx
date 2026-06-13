import { useState, useRef, useEffect } from "react";
import { getProduct, getAccent, DEFAULT_PRODUCT } from "../config/products";

const API = import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes("insightdisc") ? import.meta.env.VITE_API_URL : "https://synapsys-backend-production.up.railway.app";

// Detecta o produto a partir do path /:produto/copilot
function detectProductSlug() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("copilot");
  if (idx > 0) return parts[idx - 1];
  return DEFAULT_PRODUCT;
}

function renderText(text) {
  return text.split("\n").map((line, i) => {
    const bold = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    return <p key={i} className={i > 0 ? "mt-1.5" : ""} dangerouslySetInnerHTML={{ __html: bold }} />;
  });
}

function Message({ msg, a }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
        isUser ? `${a.solid} text-white` : `bg-gradient-to-br ${a.gradFrom} ${a.gradTo} text-white`
      }`}>
        {isUser ? "M" : "S"}
      </div>
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser ? `${a.solid} text-white rounded-tr-sm` : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm"
      }`}>
        {renderText(msg.content)}
        {msg.toolCalls?.length > 0 && (
          <div className={`mt-2.5 pt-2 border-t flex flex-wrap gap-1.5 ${isUser ? "border-white/20" : "border-slate-100"}`}>
            {msg.toolCalls.map((tc, i) => (
              <span key={i} className={`inline-flex items-center gap-1 text-xs ${a.bgSoft} ${a.text} border ${a.borderSoft} px-2 py-0.5 rounded-full`}>
                <span className={`w-1.5 h-1.5 ${a.dot} rounded-full`} />
                {tc.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator({ a }) {
  return (
    <div className="flex gap-3">
      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${a.gradFrom} ${a.gradTo} flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5`}>S</div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3.5 flex gap-1.5 items-center shadow-sm">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400" style={{ animation: `ct-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

export default function Copilot() {
  const slug    = detectProductSlug();
  const product = getProduct(slug);
  const a       = getAccent(product.accent);

  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [sessionId,      setSessionId]      = useState(null);
  const [showContext,    setShowContext]    = useState(false);
  const [patientContext, setPatientContext] = useState({ nome: "", idade: "", diagnostico: "", historico: "", medicamentos: "" });
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

  useEffect(() => { document.title = `${product.copilotName} · ${product.name}`; }, [product]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => {
    const ta = textareaRef.current; if (!ta) return;
    ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 128) + "px";
  }, [input]);

  const contextPayload = () => {
    const ctx = {};
    Object.entries(patientContext).forEach(([k, v]) => { if (v) ctx[k] = v; });
    return Object.keys(ctx).length > 0 ? ctx : null;
  };
  const hasPatient = Object.values(patientContext).some(Boolean);

  const send = async (userInput) => {
    const text = (userInput || input).trim();
    if (!text || loading) return;
    setInput("");
    const updatedMessages = [...messages, { role: "user", content: text }];
    setMessages(updatedMessages);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/ai/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          patientContext: contextPayload(),
          sessionId,
          product: product.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no copilot");
      setMessages((prev) => [...prev, { role: "assistant", content: data.response, toolCalls: data.toolCalls || [] }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${err.message}` }]);
    } finally { setLoading(false); }
  };

  const newSession = () => { setMessages([]); setSessionId(null); setInput(""); };

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API}/api/ai/copilot/sessions?limit=20&product=${product.id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setSessions(data.items || []);
      setShowSessions(true);
    } catch {}
  };

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  const isEmpty = messages.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        @keyframes ct-bounce { 0%,80%,100% { transform: translateY(0); opacity:.4 } 40% { transform: translateY(-6px); opacity:1 } }
      `}</style>

      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href={product.dashboardUrl} className={`flex items-center gap-1.5 text-sm text-slate-500 ${a.textHover} transition-colors`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Dashboard
            </a>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${a.gradFrom} ${a.gradTo} flex items-center justify-center text-base`}>{product.emoji}</div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold text-slate-800">{product.copilotName}</h1>
                  <span className={`text-[10px] font-medium ${a.bgSoft} ${a.text} border ${a.borderSoft} px-1.5 py-0.5 rounded-full`}>GPT-4o</span>
                </div>
                <p className="text-slate-400 text-xs">{product.name} · acesso aos dados</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowContext((v) => !v)} className={`relative text-xs px-3 py-1.5 rounded-lg border transition-all ${
              showContext ? `${a.bgSoft} ${a.border} ${a.text}` : "border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}>
              👤 {product.contextLabel}
              {hasPatient && <span className={`absolute -top-1 -right-1 w-2 h-2 ${a.dot} rounded-full`} />}
            </button>
            <button onClick={loadSessions} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all">📋</button>
            <button onClick={newSession} className={`text-xs px-3 py-1.5 ${a.solid} ${a.solidHover} rounded-lg text-white transition-all font-medium`}>+ Nova</button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col px-4 py-5">
        {showContext && (
          <div className="mb-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Contexto do {product.contextLabel}</p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { key: "nome",         label: "Nome",         placeholder: "Nome completo" },
                { key: "idade",        label: "Idade",        placeholder: "Ex: 35 anos" },
                { key: "diagnostico",  label: "Diagnóstico",  placeholder: "CID ou descrição" },
                { key: "medicamentos", label: "Medicamentos", placeholder: "Em uso atual" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block mb-1">{label}</label>
                  <input value={patientContext[key]} onChange={(e) => setPatientContext((p) => ({ ...p, [key]: e.target.value }))} placeholder={placeholder}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none ${a.ring} transition-colors`} />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block mb-1">Histórico Relevante</label>
                <textarea value={patientContext.historico} onChange={(e) => setPatientContext((p) => ({ ...p, historico: e.target.value }))} placeholder="Resumo do histórico..." rows={2}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none ${a.ring} transition-colors resize-none`} />
              </div>
            </div>
          </div>
        )}

        {showSessions && (
          <div className="mb-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sessões Anteriores</p>
              <button onClick={() => setShowSessions(false)} className="text-slate-400 hover:text-slate-600 text-sm transition-colors">✕</button>
            </div>
            {sessions.length === 0 && <p className="text-slate-400 text-sm text-center py-3">Nenhuma sessão salva.</p>}
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 truncate">{s.title}</p>
                    <p className="text-xs text-slate-400">{new Date(s.updated_at).toLocaleString("pt-BR")}</p>
                  </div>
                  <button onClick={() => { setSessionId(s.id); setShowSessions(false); }} className={`ml-3 shrink-0 text-xs px-2.5 py-1 ${a.bgSoft} ${a.text} ${a.bgSoftHover} rounded-lg transition-colors`}>Continuar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto mb-4 min-h-0" style={{ maxHeight: "calc(100vh - 280px)" }}>
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-center">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${a.gradFrom} ${a.gradTo} flex items-center justify-center text-3xl mb-5 shadow-lg ${a.shadow}`}>{product.emoji}</div>
              <h2 className="text-lg font-semibold text-slate-800 mb-1">{product.greeting}</h2>
              <p className="text-slate-500 text-sm mb-7 max-w-sm">{product.subtitle}</p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-xl">
                {product.quickPrompts.map((p, i) => (
                  <button key={i} onClick={() => send(p.text)} className={`group flex items-start gap-3 text-left bg-white hover:bg-slate-50 border border-slate-200 ${a.borderHover} rounded-xl px-4 py-3 transition-all shadow-sm`}>
                    <span className="text-lg shrink-0 mt-0.5">{p.icon}</span>
                    <div>
                      <p className={`text-xs font-semibold text-slate-700 ${a.textHover} transition-colors`}>{p.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{p.text}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {messages.map((msg, i) => <Message key={i} msg={msg} a={a} />)}
              {loading && <TypingIndicator a={a} />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className={`bg-white border border-slate-200 hover:border-slate-300 ${a.focusWithin} rounded-2xl px-4 py-3 flex gap-3 items-end transition-colors shadow-sm`}>
          <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={loading ? "Aguardando resposta..." : "Pergunte algo ou peça dados…"} disabled={loading} rows={1}
            className="flex-1 bg-transparent text-slate-700 placeholder-slate-400 text-sm resize-none focus:outline-none disabled:opacity-50 leading-6 max-h-32 overflow-y-auto" />
          <button onClick={() => send()} disabled={!input.trim() || loading} className={`w-8 h-8 ${a.solid} ${a.solidHover} disabled:opacity-30 disabled:cursor-not-allowed rounded-lg flex items-center justify-center shrink-0 transition-all`}>
            <svg className="w-3.5 h-3.5 rotate-90 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">Enter para enviar · Shift+Enter nova linha · As decisões são sempre do profissional</p>
      </div>
    </div>
  );
}
