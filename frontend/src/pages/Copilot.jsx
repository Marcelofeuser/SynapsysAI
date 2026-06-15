import { useState, useRef, useEffect } from "react";
import { LayoutDashboard, Sparkles, ChevronLeft } from "lucide-react";
import { getProduct, getAccent, DEFAULT_PRODUCT } from "../config/products";

const API = import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes("insightdisc") ? import.meta.env.VITE_API_URL : "https://synapsys-backend-production.up.railway.app";

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

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 text-white ${isUser ? "bg-primary" : "bg-accent"}`}>
        {isUser ? "M" : "S"}
      </div>
      <div className={`max-w-[78%] rounded-lg px-4 py-3 text-sm leading-relaxed ${isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border text-card-foreground rounded-tl-sm shadow-sm"}`}>
        {renderText(msg.content)}
        {msg.toolCalls?.length > 0 && (
          <div className={`mt-2.5 pt-2 border-t flex flex-wrap gap-1.5 ${isUser ? "border-white/20" : "border-border"}`}>
            {msg.toolCalls.map((tc, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-accent/10 text-accent border border-accent/30 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-accent rounded-full" />{tc.name}
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
      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">S</div>
      <div className="bg-card border border-border rounded-lg rounded-tl-sm px-4 py-3.5 flex gap-1.5 items-center shadow-sm">
        {[0,1,2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground" style={{ animation: `ct-bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
      </div>
    </div>
  );
}

export default function Copilot() {
  const slug = detectProductSlug();
  const product = getProduct(slug);
  const base = product.dashboardUrl.replace(/\/dashboard$/, "");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [showContext, setShowContext] = useState(false);
  const [patientContext, setPatientContext] = useState({ nome: "", idade: "", diagnostico: "", historico: "", medicamentos: "" });
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const token = () => {
    try { return JSON.parse(localStorage.getItem("synapsys.session.v1") || "{}").accessToken || null; }
    catch { return null; }
  };

  useEffect(() => { document.title = product.copilotName; }, [product]);
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
      setMessages((p) => [...p, { role: "assistant", content: `\u26a0\ufe0f ${err.message}` }]);
    } finally { setLoading(false); }
  };

  const newSession = () => { setMessages([]); setSessionId(null); setInput(""); };
  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background font-inter text-foreground">
      <style>{`@keyframes ct-bounce { 0%,80%,100% { transform: translateY(0); opacity:.4 } 40% { transform: translateY(-6px); opacity:1 } }`}</style>

      {/* Sidebar idêntico ao PsicoThera */}
      <aside className="hidden lg:flex flex-col w-64 bg-sidebar border-r border-sidebar-border shrink-0">
        <div className="flex items-center px-6 py-5">
          <span className="text-xl font-bold text-sidebar-foreground">{product.name}</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          <a href={`${base}/dashboard`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all">
            <LayoutDashboard className="h-5 w-5 shrink-0" />Dashboard
          </a>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-sidebar-primary text-sidebar-primary-foreground shadow-md">
            <Sparkles className="h-5 w-5 shrink-0" />Copiloto IA
          </div>
        </nav>
        <div className="px-3 py-4 border-t border-sidebar-border">
          <a href={`${base}/dashboard`} className="flex items-center gap-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground px-3 py-2 transition-colors">
            <ChevronLeft className="h-4 w-4" />Voltar à plataforma
          </a>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border bg-card px-4 lg:px-6 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-lg">{product.emoji}</div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-foreground">{product.copilotName}</h1>
                <span className="text-[10px] font-medium bg-accent/10 text-accent border border-accent/30 px-1.5 py-0.5 rounded-full">GPT-4o</span>
              </div>
              <p className="text-muted-foreground text-xs">Assistente cl\u00ednico \u00b7 acesso aos dados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowContext((v) => !v)} className={`relative text-xs px-3 py-1.5 rounded-lg border transition-all ${showContext ? "bg-primary/10 border-primary text-primary" : "border-border text-foreground/70 hover:text-foreground hover:border-primary/40"}`}>
              {product.contextLabel}
              {hasPatient && <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />}
            </button>
            <button onClick={newSession} className="text-xs px-3 py-1.5 bg-primary hover:bg-primary/90 rounded-lg text-primary-foreground transition-all font-medium">+ Nova conversa</button>
          </div>
        </header>

        {showContext && (
          <div className="border-b border-border bg-card px-4 lg:px-6 py-4 shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contexto do {product.contextLabel}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 max-w-4xl">
              {[
                { key: "nome", label: "Nome", placeholder: "Nome completo" },
                { key: "idade", label: "Idade", placeholder: "Ex: 35 anos" },
                { key: "diagnostico", label: "Diagn\u00f3stico", placeholder: "CID ou descri\u00e7\u00e3o" },
                { key: "medicamentos", label: "Medicamentos", placeholder: "Em uso atual" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block mb-1">{label}</label>
                  <input value={patientContext[key]} onChange={(e) => setPatientContext((p) => ({ ...p, [key]: e.target.value }))} placeholder={placeholder}
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary" />
                </div>
              ))}
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-6">
          <div className="max-w-3xl mx-auto">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center text-center pt-10">
                <div className="w-16 h-16 rounded-lg bg-accent flex items-center justify-center text-3xl mb-5 shadow-lg">{product.emoji}</div>
                <h2 className="text-lg font-semibold text-foreground mb-1">{product.greeting}</h2>
                <p className="text-muted-foreground text-sm mb-7 max-w-sm">{product.subtitle}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                  {product.quickPrompts.map((p, i) => (
                    <button key={i} onClick={() => send(p.text)} className="group flex items-start gap-3 text-left bg-card hover:bg-secondary border border-border hover:border-primary/40 rounded-lg px-4 py-3 transition-all shadow-sm">
                      <span className="text-lg shrink-0 mt-0.5">{p.icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary">{p.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.text}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((msg, i) => <Message key={i} msg={msg} />)}
                {loading && <TypingIndicator />}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </main>

        <div className="border-t border-border bg-card px-4 lg:px-6 py-4 shrink-0">
          <div className="max-w-3xl mx-auto bg-background border border-border hover:border-primary/40 focus-within:border-primary rounded-lg px-4 py-3 flex gap-3 items-end transition-colors">
            <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={loading ? "Aguardando resposta..." : "Pergunte algo ou pe\u00e7a dados\u2026"} disabled={loading} rows={1}
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground/60 text-sm resize-none focus:outline-none disabled:opacity-50 leading-6 max-h-32 overflow-y-auto" />
            <button onClick={() => send()} disabled={!input.trim() || loading} className="w-9 h-9 bg-primary hover:bg-primary/90 disabled:opacity-30 rounded-lg flex items-center justify-center shrink-0 transition-all">
              <svg width="16" height="16" className="rotate-90 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2 max-w-3xl mx-auto">Enter envia \u00b7 Shift+Enter nova linha \u00b7 As decis\u00f5es cl\u00ednicas s\u00e3o sempre do profissional</p>
        </div>
      </div>
    </div>
  );
}
