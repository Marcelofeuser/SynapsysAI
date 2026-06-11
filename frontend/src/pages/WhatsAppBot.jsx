import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "https://synapsys-backend-production.up.railway.app";

const DEFAULT_PROMPT = `Você é um assistente virtual de uma clínica de saúde mental.
Suas responsabilidades:
- Responder dúvidas sobre a clínica, serviços e valores
- Ajudar pacientes a agendar ou reagendar consultas (coletando: nome, data preferida, tipo de atendimento)
- Fornecer orientações gerais sobre os serviços disponíveis
- Encaminhar casos urgentes ao profissional responsável

Regras importantes:
- Nunca forneça diagnósticos ou orientações terapêuticas
- Seja sempre empático, acolhedor e profissional
- Se o paciente estiver em crise, forneça o CVV (188) e oriente a buscar ajuda imediata
- Respostas curtas e claras (máximo 3 parágrafos)
- Use português brasileiro informal mas respeitoso`;

const DAYS = [
  { key: "mon", label: "Seg" }, { key: "tue", label: "Ter" },
  { key: "wed", label: "Qua" }, { key: "thu", label: "Qui" },
  { key: "fri", label: "Sex" }, { key: "sat", label: "Sáb" },
  { key: "sun", label: "Dom" },
];

const DEFAULT_HOURS = {
  mon: { active: true,  start: "08:00", end: "18:00" },
  tue: { active: true,  start: "08:00", end: "18:00" },
  wed: { active: true,  start: "08:00", end: "18:00" },
  thu: { active: true,  start: "08:00", end: "18:00" },
  fri: { active: true,  start: "08:00", end: "18:00" },
  sat: { active: false, start: "08:00", end: "12:00" },
  sun: { active: false, start: "08:00", end: "12:00" },
};

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60)    return "agora";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function Avatar({ name, size = "md" }) {
  const initials = (name || "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const colors = ["bg-violet-600", "bg-emerald-600", "bg-blue-600", "bg-rose-600", "bg-amber-600"];
  const color = colors[(name || "").charCodeAt(0) % colors.length];
  const sz = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold text-white shrink-0`}>{initials}</div>;
}

export default function WhatsAppBot() {
  const [tab,           setTab]           = useState("conversations"); // conversations | config | setup
  const [config,        setConfig]        = useState(null);
  const [status,        setStatus]        = useState(null);
  const [stats,         setStats]         = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConv,    setActiveConv]    = useState(null);
  const [replyText,     setReplyText]     = useState("");
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [setupDone,     setSetupDone]     = useState(false);
  const [toast,         setToast]         = useState("");

  // Config form state
  const [form, setForm] = useState({
    instance_name:    "psicothera-principal",
    instance_apikey:  "F1BFFE53-A094-47F6-84EB-257475278DF5",
    evolution_host:   "https://evolution-api-v223.onrender.com",
    bot_name:         "Assistente",
    clinic_name:      "",
    greeting_message: "Olá! Sou o assistente virtual da clínica. Como posso ajudar?",
    system_prompt:    DEFAULT_PROMPT,
    is_active:        true,
    outside_hours_msg:"Estamos fora do horário de atendimento. Retornaremos em breve!",
    working_hours:    DEFAULT_HOURS,
  });

  const bottomRef = useRef(null);
  const token = () => localStorage.getItem("synapsys_token") || sessionStorage.getItem("synapsys_token");

  const showToast = (msg, duration = 2500) => {
    setToast(msg);
    setTimeout(() => setToast(""), duration);
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    if (activeConv) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cfgRes, statusRes, statsRes, convRes] = await Promise.all([
        fetch(`${API}/api/whatsapp/config`,         { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(`${API}/api/whatsapp/status`,         { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(`${API}/api/whatsapp/stats`,          { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(`${API}/api/whatsapp/conversations`,  { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      const [cfg, sts, st, convs] = await Promise.all([cfgRes.json(), statusRes.json(), statsRes.json(), convRes.json()]);
      if (cfg.config) {
        setConfig(cfg.config);
        setForm((f) => ({
          ...f,
          instance_name:    cfg.config.instance_name    || f.instance_name,
          instance_apikey:  cfg.config.instance_apikey  || f.instance_apikey,
          evolution_host:   cfg.config.evolution_host   || f.evolution_host,
          bot_name:         cfg.config.bot_name         || f.bot_name,
          clinic_name:      cfg.config.clinic_name      || "",
          greeting_message: cfg.config.greeting_message || f.greeting_message,
          system_prompt:    cfg.config.system_prompt    || f.system_prompt,
          is_active:        cfg.config.is_active        !== false,
          outside_hours_msg:cfg.config.outside_hours_msg|| f.outside_hours_msg,
          working_hours:    cfg.config.working_hours    || f.working_hours,
        }));
        setSetupDone(cfg.config.webhook_configured);
      }
      setStatus(sts);
      setStats(st);
      setConversations(convs.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/whatsapp/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfig(data.config);
      showToast("✅ Configurações salvas!");
    } catch (e) { showToast(`⚠️ ${e.message}`); }
    finally { setSaving(false); }
  };

  const setupWebhook = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/whatsapp/setup-webhook`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSetupDone(true);
      showToast(`✅ Webhook configurado! URL: ${data.webhookUrl}`);
    } catch (e) { showToast(`⚠️ ${e.message}`); }
    finally { setSaving(false); }
  };

  const openConversation = async (conv) => {
    try {
      const res = await fetch(`${API}/api/whatsapp/conversations/${conv.id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setActiveConv(data.conversation);
      setConversations((prev) => prev.map((c) => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    } catch {}
  };

  const sendReply = async () => {
    if (!replyText.trim() || !activeConv) return;
    const text = replyText.trim();
    setReplyText("");
    try {
      const res = await fetch(`${API}/api/whatsapp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ phone: activeConv.phone, text, conversationId: activeConv.id }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const msgs = [...(activeConv.messages || []), { role: "assistant", content: text, ts: new Date().toISOString(), manual: true }];
      setActiveConv((prev) => ({ ...prev, messages: msgs }));
    } catch (e) { showToast(`⚠️ ${e.message}`); }
  };

  const toggleConvStatus = async (id, newStatus) => {
    await fetch(`${API}/api/whatsapp/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status: newStatus }),
    });
    setConversations((prev) => prev.map((c) => c.id === id ? { ...c, status: newStatus } : c));
    if (activeConv?.id === id) setActiveConv((prev) => ({ ...prev, status: newStatus }));
  };

  const toggleDay = (day) => {
    setForm((f) => ({
      ...f,
      working_hours: {
        ...f.working_hours,
        [day]: { ...f.working_hours[day], active: !f.working_hours[day]?.active },
      },
    }));
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm shadow-xl">
          {toast}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💬</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">WhatsApp Bot</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  status?.connected
                    ? "bg-green-900/40 text-green-300 border-green-800"
                    : "bg-red-900/40 text-red-300 border-red-800"
                }`}>
                  {status?.connected ? "● Conectado" : "○ Desconectado"}
                </span>
                {config?.is_active ? (
                  <span className="text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full">Bot Ativo</span>
                ) : (
                  <span className="text-xs bg-gray-800 text-gray-500 border border-gray-700 px-2 py-0.5 rounded-full">Bot Pausado</span>
                )}
              </div>
              <p className="text-gray-500 text-xs">Atendimento automático 24/7 via Evolution API</p>
            </div>
          </div>
          <button onClick={fetchAll} className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 transition-colors">
            🔄 Atualizar
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: "Conversas",     value: stats.totalConversations, color: "text-violet-400", icon: "💬" },
              { label: "Ativas",        value: stats.activeConversations, color: "text-green-400",  icon: "🟢" },
              { label: "Hoje",          value: stats.todayMessages,       color: "text-blue-400",   icon: "📅" },
              { label: "Não lidas",     value: stats.unreadMessages,      color: "text-amber-400",  icon: "🔔" },
            ].map((s) => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <div className="text-lg mb-0.5">{s.icon}</div>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6 w-fit">
          {[
            { id: "conversations", label: "💬 Conversas" },
            { id: "config",        label: "⚙️ Configurar Bot" },
            { id: "setup",         label: "🔗 Webhook" + (setupDone ? " ✓" : "") },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? "bg-green-700 text-white shadow" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── CONVERSATIONS TAB ─────────────────────────────────────────────── */}
        {tab === "conversations" && (
          <div className="flex gap-4 h-[600px]">
            {/* List */}
            <div className="w-72 shrink-0 flex flex-col bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-gray-800">
                <p className="text-sm font-semibold text-gray-300">Pacientes</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 && (
                  <div className="text-center py-12 text-gray-600 text-sm">
                    Nenhuma conversa ainda.<br />Configure o webhook para começar.
                  </div>
                )}
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    className={`w-full flex items-start gap-3 p-3 hover:bg-gray-800 transition-colors text-left border-b border-gray-800/50 ${
                      activeConv?.id === conv.id ? "bg-gray-800" : ""
                    }`}
                  >
                    <Avatar name={conv.patient_name || conv.phone} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-200 truncate">
                          {conv.patient_name || conv.phone}
                        </p>
                        <span className="text-xs text-gray-600 shrink-0 ml-1">{formatTime(conv.last_message_at)}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{conv.last_message}</p>
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="w-5 h-5 bg-green-600 rounded-full text-xs flex items-center justify-center text-white font-bold shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div className="flex-1 flex flex-col bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              {!activeConv ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
                  <span className="text-4xl mb-3">💬</span>
                  <p>Selecione uma conversa</p>
                </div>
              ) : (
                <>
                  {/* Chat header */}
                  <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={activeConv.patient_name || activeConv.phone} />
                      <div>
                        <p className="font-semibold text-gray-200">{activeConv.patient_name || activeConv.phone}</p>
                        <p className="text-xs text-gray-500">{activeConv.phone}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {activeConv.status === "active" ? (
                        <button
                          onClick={() => toggleConvStatus(activeConv.id, "paused")}
                          className="text-xs px-3 py-1 bg-amber-900/30 text-amber-300 border border-amber-800 rounded-lg hover:bg-amber-900/50"
                        >
                          ⏸ Pausar bot
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleConvStatus(activeConv.id, "active")}
                          className="text-xs px-3 py-1 bg-green-900/30 text-green-300 border border-green-800 rounded-lg hover:bg-green-900/50"
                        >
                          ▶ Retomar bot
                        </button>
                      )}
                      <button
                        onClick={() => toggleConvStatus(activeConv.id, "closed")}
                        className="text-xs px-3 py-1 bg-gray-800 text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-700"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {(activeConv.messages || []).map((msg, i) => {
                      const isBot = msg.role === "assistant";
                      return (
                        <div key={i} className={`flex ${isBot ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                            isBot
                              ? "bg-green-700/80 text-white"
                              : "bg-gray-800 text-gray-200"
                          }`}>
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <p className={`text-xs mt-1 ${isBot ? "text-green-200" : "text-gray-500"}`}>
                              {msg.manual ? "✏️ " : ""}{msg.ts ? formatTime(msg.ts) : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>

                  {/* Reply input */}
                  <div className="p-3 border-t border-gray-800">
                    {activeConv.status === "paused" && (
                      <p className="text-xs text-amber-400 mb-2">⏸ Bot pausado — suas mensagens serão enviadas manualmente.</p>
                    )}
                    <div className="flex gap-2">
                      <input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
                        placeholder="Digite uma mensagem manual..."
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-600"
                      />
                      <button
                        onClick={sendReply}
                        disabled={!replyText.trim()}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-xl text-white text-sm transition-colors"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── CONFIG TAB ────────────────────────────────────────────────────── */}
        {tab === "config" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="font-semibold text-gray-200 mb-4">Dados da Instância</h3>
                {[
                  { key: "instance_name",   label: "Nome da Instância",    placeholder: "psicothera-principal" },
                  { key: "instance_apikey", label: "API Key da Instância", placeholder: "xxxx-xxxx..." },
                  { key: "evolution_host",  label: "Evolution API Host",   placeholder: "https://..." },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="mb-3">
                    <label className="text-xs text-gray-500 block mb-1">{label}</label>
                    <input
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-green-600"
                    />
                  </div>
                ))}
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="font-semibold text-gray-200 mb-4">Identidade do Bot</h3>
                {[
                  { key: "bot_name",         label: "Nome do Assistente",     placeholder: "Assistente" },
                  { key: "clinic_name",      label: "Nome da Clínica",        placeholder: "Clínica Silva" },
                  { key: "greeting_message", label: "Saudação inicial",       placeholder: "Olá! Como posso ajudar?" },
                  { key: "outside_hours_msg",label: "Mensagem fora do horário",placeholder: "Estamos fora do horário..." },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="mb-3">
                    <label className="text-xs text-gray-500 block mb-1">{label}</label>
                    <input
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-green-600"
                    />
                  </div>
                ))}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800">
                  <label className="text-sm text-gray-300">Bot ativo</label>
                  <button
                    onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                    className={`w-11 h-6 rounded-full transition-colors ${form.is_active ? "bg-green-600" : "bg-gray-700"}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="font-semibold text-gray-200 mb-4">Prompt do Assistente</h3>
                <textarea
                  value={form.system_prompt}
                  onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
                  rows={10}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-green-600 resize-none"
                />
                <p className="text-xs text-gray-600 mt-2">Define como o bot se comporta. Inclua o nome da clínica, serviços, preços e instruções específicas.</p>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="font-semibold text-gray-200 mb-4">Horário de Atendimento</h3>
                <div className="space-y-2">
                  {DAYS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <button
                        onClick={() => toggleDay(key)}
                        className={`w-9 h-5 rounded-full transition-colors shrink-0 ${form.working_hours[key]?.active ? "bg-green-600" : "bg-gray-700"}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form.working_hours[key]?.active ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                      <span className="text-sm text-gray-400 w-8 shrink-0">{label}</span>
                      {form.working_hours[key]?.active && (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            value={form.working_hours[key]?.start || "08:00"}
                            onChange={(e) => setForm((f) => ({ ...f, working_hours: { ...f.working_hours, [key]: { ...f.working_hours[key], start: e.target.value } } }))}
                            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-green-600"
                          />
                          <span className="text-gray-600 text-xs">até</span>
                          <input
                            type="time"
                            value={form.working_hours[key]?.end || "18:00"}
                            onChange={(e) => setForm((f) => ({ ...f, working_hours: { ...f.working_hours, [key]: { ...f.working_hours[key], end: e.target.value } } }))}
                            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-green-600"
                          />
                        </div>
                      )}
                      {!form.working_hours[key]?.active && (
                        <span className="text-xs text-gray-600">Fechado</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={saveConfig}
                disabled={saving}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-xl font-semibold text-white transition-colors"
              >
                {saving ? "Salvando..." : "💾 Salvar Configurações"}
              </button>
            </div>
          </div>
        )}

        {/* ── SETUP TAB ────────────────────────────────────────────────────── */}
        {tab === "setup" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-gray-200 mb-1">Configurar Webhook</h3>
                <p className="text-gray-500 text-sm">
                  Conecta a Evolution API ao SynapsysAI para que as mensagens dos pacientes sejam processadas automaticamente pelo GPT-4o.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { step: "1", done: !!config, label: "Bot configurado",    desc: "Configure os dados da instância e salve." },
                  { step: "2", done: status?.connected, label: "WhatsApp conectado", desc: "Instância psicothera-principal está open." },
                  { step: "3", done: setupDone, label: "Webhook ativo",     desc: "Clique no botão abaixo para ativar." },
                ].map(({ step, done, label, desc }) => (
                  <div key={step} className={`flex gap-4 p-3 rounded-xl border ${done ? "border-green-800 bg-green-900/10" : "border-gray-800"}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${done ? "bg-green-600 text-white" : "bg-gray-800 text-gray-500"}`}>
                      {done ? "✓" : step}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${done ? "text-green-300" : "text-gray-300"}`}>{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={setupWebhook}
                disabled={saving || !config || !status?.connected}
                className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-xl font-semibold text-white transition-colors"
              >
                {saving ? "Configurando..." : setupDone ? "🔄 Reconfigurar Webhook" : "🔗 Ativar Webhook"}
              </button>

              {(!config || !status?.connected) && (
                <p className="text-xs text-amber-400 text-center">
                  {!config ? "Configure e salve o bot primeiro." : "WhatsApp desconectado — reconecte na Evolution API."}
                </p>
              )}

              {setupDone && (
                <div className="bg-green-900/20 border border-green-800 rounded-xl p-3 text-sm text-green-300">
                  ✅ Bot ativo! Pacientes que mandarem mensagem para o número conectado serão atendidos automaticamente.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
