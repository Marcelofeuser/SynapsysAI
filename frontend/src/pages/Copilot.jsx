import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard, Users, Calendar, FileText, DollarSign,
  Video, MessageCircle, Sparkles, Brain, Bot, ChevronDown, ChevronRight, Menu,
} from "lucide-react";
import { getProduct, getAccent, DEFAULT_PRODUCT } from "../config/products";

const API = import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes("insightdisc") ? import.meta.env.VITE_API_URL : "https://synapsys-backend-production.up.railway.app";

function detectProductSlug() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("copilot");
  if (idx > 0) return parts[idx - 1];
  return DEFAULT_PRODUCT;
}

// Itens do sidebar — espelham o PsicoThera. Links externos para a plataforma.
function buildNav(base) {
  return [
    { label: "Dashboard",     icon: LayoutDashboard, href: `${base}/dashboard` },
    { label: "Pacientes",     icon: Users, children: [
      { label: "Lista",     href: `${base}/pacientes` },
      { label: "Relatório", href: `${base}/pacientes/relatorio` },
    ]},
    { label: "Agenda",        icon: Calendar,      href: `${base}/agenda` },
    { label: "Prontuários",   icon: FileText,      href: `${base}/prontuarios` },
    { label: "Financeiro",    icon: DollarSign,    href: `${base}/financeiro` },
    { label: "Videoconsulta", icon: Video,         href: `${base}/videoconsulta` },
    { label: "WhatsApp",      icon: MessageCircle, href: `${base}/whatsapp` },
    { label: "Copiloto IA",   icon: Sparkles,      active: true },
    { label: "Mind Analysis", icon: Brain,         href: `${base}/mind-analysis` },
    { label: "WhatsApp Bot",  icon: Bot,           href: `${base}/whatsapp-bot` },
  ];
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
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 text-white ${isUser ? a.solid : `bg-gradient-to-br ${a.gradFrom} ${a.gradTo}`}`}>
        {isUser ? "M" : "S"}
      </div>
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? `${a.solid} text-white rounded-tr-sm` : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm"}`}>
        {renderText(msg.content)}
        {msg.toolCalls?.length > 0 && (
          <div className={`mt-2.5 pt-2 border-t flex flex-wrap gap-1.5 ${isUser ? "border-white/20" : "border-slate-100"}`}>
            {msg.toolCalls.map((tc, i) => (
              <span key={i} className={`inline-flex items-center gap-1 text-xs ${a.bgSoft} ${a.text} border ${a.borderSoft} px-2 py-0.5 rounded-full`}>
                <span className={`w-1.5 h-1.5 ${a.dot} rounded-full`} />{tc.name}
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
        {[0,1,2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400" style={{ animation: `ct-bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
      </div>
    </div>
  );
}

export default function Copilot() {
  const slug    = detectProductSlug();
  const product = getProduct(slug);
  const a       = getAccent(product.accent);
  const base    = product.dashboardUrl.replace(/\/dashboard$/, "");
  const nav     = buildNav(base);

  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [sessionId, setSessionId]     = useState(null);
  const [showContext, setShowContext] = useState(false);
  const [patientContext, setPatientContext] = useState({ nome: "", idade: "", diagnostico: "", historico: "", medicamentos: "" });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patientsOpen, setPatientsOpen] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const token = () => {
    try { return JSON.parse(localStorage.getItem("synapsys.session.v1") || "{}").accessToken || null; }
    catch { return null; }
  };

  useEffect(() => { document.title = `${product.copilotName}`; }, [product]);
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
    const updated = [...messages, { role: "user", content: text }];
    setMessages(updated);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/ai/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ messages: updated.map((m) => ({ role: m.role, content: m.content })), patientContext: contextPayload(), sessionId, product: product.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no copilot");
      setMessages((p) => [...p, { role: "assistant", content: data.response, toolCalls: data.toolCalls || [] }]);
    } catch (err) {
      setMessages((p) => [...p, { role: "assistant", content: `⚠️ ${err.message}` }]);
    } finally { setLoading(false); }
  };

  const newSession = () => { setMessages([]); setSessionId(null); setInput(""); };
  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes ct-bounce { 0%,80%,100% { transform: translateY(0); opacity:.4 } 40% { transform: translateY(-6px); opacity:1 } }
      `}</style>

      {/* Overlay mobile */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-[hsl(230,60%,96%)] transition-transform duration-300 lg:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex items-center px-5 py-5 border-b border-[hsl(230,40%,85%)]">
          <span className="text-lg font-bold text-[hsl(230,40%,25%)]">{product.name}</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map((item) => {
            const Icon = item.icon;
            if (item.children) {
              return (
                <div key={item.label}>
                  <button onClick={() => setPatientsOpen((v) => !v)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[hsl(230,40%,25%)]/70 hover:bg-[hsl(230,50%,90%)] transition-all">
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {patientsOpen ? <ChevronDown className="h-4 w-4 opacity-60" /> : <ChevronRight className="h-4 w-4 opacity-60" />}
                  </button>
                  {patientsOpen && (
                    <div className="mt-1 ml-4 space-y-1 border-l border-[hsl(230,40%,85%)] pl-3">
                      {item.children.map((c) => (
                        <a key={c.label} href={c.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[hsl(230,40%,25%)]/70 hover:bg-[hsl(230,50%,90%)] transition-all">{c.label}</a>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            if (item.active) {
              return (
                <div key={item.label} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${a.solid} text-white shadow-md`}>
                  <Icon className="h-5 w-5 shrink-0" />{item.label}
                </div>
              );
            }
            return (
              <a key={item.label} href={item.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[hsl(230,40%,25%)]/70 hover:bg-[hsl(230,50%,90%)] transition-all">
                <Icon className="h-5 w-5 shrink-0" />{item.label}
              </a>
            );
          })}
        </nav>
      </aside>

      {/* ── Conteúdo ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500"><Menu className="h-5 w-5" /></button>
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${a.gradFrom} ${a.gradTo} flex items-center justify-center text-lg`}>{product.emoji}</div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-slate-800">{product.copilotName}</h1>
                <span className={`text-[10px] font-medium ${a.bgSoft} ${a.text} border ${a.borderSoft} px-1.5 py-0.5 rounded-full`}>GPT-4o</span>
              </div>
              <p className="text-slate-400 text-xs">Assistente clínico · acesso aos dados</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowContext((v) => !v)} className={`relative text-xs px-3 py-1.5 rounded-lg border transition-all ${showContext ? `${a.bgSoft} ${a.border} ${a.text}` : "border-slate-200 text-slate-600 hover:text-slate-800 hover:border-slate-300"}`}>
              {product.contextLabel}
              {hasPatient && <span className={`absolute -top-1 -right-1 w-2 h-2 ${a.dot} rounded-full`} />}
            </button>
            <button onClick={newSession} className={`text-xs px-3 py-1.5 ${a.solid} ${a.solidHover} rounded-lg text-white transition-all font-medium`}>+ Nova conversa</button>
          </div>
        </header>

        {/* Context panel */}
        {showContext && (
          <div className="border-b border-slate-200 bg-white px-4 lg:px-6 py-4 shrink-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Contexto do {product.contextLabel}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 max-w-4xl">
              {[
                { key: "nome", label: "Nome", placeholder: "Nome completo" },
                { key: "idade", label: "Idade", placeholder: "Ex: 35 anos" },
                { key: "diagnostico", label: "Diagnóstico", placeholder: "CID ou descrição" },
                { key: "medicamentos", label: "Medicamentos", placeholder: "Em uso atual" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block mb-1">{label}</label>
                  <input value={patientContext[key]} onChange={(e) => setPatientContext((p) => ({ ...p, [key]: e.target.value }))} placeholder={placeholder}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none ${a.ring}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-6">
          <div className="max-w-3xl mx-auto">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center text-center pt-10">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${a.gradFrom} ${a.gradTo} flex items-center justify-center text-3xl mb-5 shadow-lg ${a.shadow}`}>{product.emoji}</div>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">{product.greeting}</h2>
                <p className="text-slate-500 text-sm mb-7 max-w-sm">{product.subtitle}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                  {product.quickPrompts.map((p, i) => (
                    <button key={i} onClick={() => send(p.text)} className={`group flex items-start gap-3 text-left bg-white hover:bg-slate-50 border border-slate-200 ${a.borderHover} rounded-xl px-4 py-3 transition-all shadow-sm`}>
                      <span className="text-lg shrink-0 mt-0.5">{p.icon}</span>
                      <div>
                        <p className={`text-xs font-semibold text-slate-700 ${a.textHover}`}>{p.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{p.text}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((msg, i) => <Message key={i} msg={msg} a={a} />)}
                {loading && <TypingIndicator a={a} />}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </main>

        {/* Input */}
        <div className="border-t border-slate-200 bg-white px-4 lg:px-6 py-4 shrink-0">
          <div className={`max-w-3xl mx-auto bg-slate-50 border border-slate-200 hover:border-slate-300 ${a.focusWithin} rounded-2xl px-4 py-3 flex gap-3 items-end transition-colors`}>
            <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={loading ? "Aguardando resposta..." : "Pergunte algo ou peça dados…"} disabled={loading} rows={1}
              className="flex-1 bg-transparent text-slate-700 placeholder-slate-400 text-sm resize-none focus:outline-none disabled:opacity-50 leading-6 max-h-32 overflow-y-auto" />
            <button onClick={() => send()} disabled={!input.trim() || loading} className={`w-9 h-9 ${a.solid} ${a.solidHover} disabled:opacity-30 rounded-lg flex items-center justify-center shrink-0 transition-all`}>
              <svg width="16" height="16" className="rotate-90 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </div>
          <p className="text-center text-xs text-slate-400 mt-2 max-w-3xl mx-auto">Enter envia · Shift+Enter nova linha · As decisões clínicas são sempre do profissional</p>
        </div>
      </div>
    </div>
  );
}
