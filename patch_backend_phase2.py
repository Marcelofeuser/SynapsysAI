#!/usr/bin/env python3
"""
patch_backend_phase2.py
Adiciona rotas WhatsApp Bot ao server.js.
Rodar de: /Volumes/SSD_MAC/Projects/SynapsysAI/
"""

import sys

SERVER_PATH = "/Volumes/SSD_MAC/Projects/SynapsysAI/backend/server.js"

WHATSAPP_ROUTES = r'''
// ════════════════════════════════════════════════════════
//  PHASE 2 — WhatsApp Bot (Evolution API + GPT-4o)
// ════════════════════════════════════════════════════════

const DEFAULT_SYSTEM_PROMPT = `Você é um assistente virtual de uma clínica de saúde mental.
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

async function sendWhatsAppMessage(evolutionHost, instanceName, instanceApikey, phone, text) {
  const cleanPhone = phone.replace(/\D/g, "").replace(/@s\.whatsapp\.net$/, "");
  const response = await fetch(`${evolutionHost}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: instanceApikey,
    },
    body: JSON.stringify({ number: cleanPhone, textMessage: { text } }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Evolution API error: ${response.status} — ${err}`);
  }
  return response.json();
}

// ── Webhook público — recebe mensagens da Evolution API ──────────────────────
app.post("/api/whatsapp/webhook", async (req, res) => {
  res.status(200).json({ ok: true }); // Responde imediatamente para não dar timeout

  try {
    const body = req.body;
    const event = body?.event;
    if (event !== "messages.upsert") return;

    const data = body?.data;
    if (!data) return;

    // Ignora mensagens enviadas pelo próprio bot
    if (data?.key?.fromMe === true) return;

    const instanceName = body?.instance || "";
    const phone        = data?.key?.remoteJid || "";
    const pushName     = data?.pushName || "";
    const msgText      =
      data?.message?.conversation ||
      data?.message?.extendedTextMessage?.text ||
      data?.message?.buttonsResponseMessage?.selectedDisplayText ||
      "";

    if (!instanceName || !phone || !msgText.trim()) return;

    // Busca config do bot para esta instância
    const { data: configs } = await supabaseAdmin
      .from("whatsapp_bot_config")
      .select("*")
      .eq("instance_name", instanceName)
      .eq("is_active", true)
      .limit(1);

    if (!configs || configs.length === 0) {
      console.log(`[whatsapp] Instancia sem config ativa: ${instanceName}`);
      return;
    }

    const config = configs[0];

    // Verificar horário de atendimento
    const now = new Date();
    const day = ["sun","mon","tue","wed","thu","fri","sat"][now.getDay()];
    const hours = config.working_hours?.[day];
    if (hours) {
      const [startH, startM] = hours.start.split(":").map(Number);
      const [endH, endM]     = hours.end.split(":").map(Number);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const startMin   = startH * 60 + startM;
      const endMin     = endH * 60 + endM;
      if (nowMinutes < startMin || nowMinutes > endMin) {
        const outsideMsg = config.outside_hours_msg || "Estamos fora do horário de atendimento.";
        await sendWhatsAppMessage(config.evolution_host, instanceName, config.instance_apikey, phone, outsideMsg);
        return;
      }
    }

    // Busca ou cria conversa
    let conversation;
    const { data: existingConv } = await supabaseAdmin
      .from("whatsapp_conversations")
      .select("*")
      .eq("user_id", config.user_id)
      .eq("instance_name", instanceName)
      .eq("phone", phone)
      .single();

    const messages = existingConv?.messages || [];

    // Adiciona mensagem do paciente
    messages.push({ role: "user", content: msgText, ts: new Date().toISOString(), name: pushName });

    // Mantém últimas 20 mensagens para contexto
    const contextMessages = messages.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // GPT-4o
    let botReply = "";
    if (openai) {
      const systemPrompt = config.system_prompt || DEFAULT_SYSTEM_PROMPT;
      const clinicContext = config.clinic_name
        ? `\n\nClínica: ${config.clinic_name}\nAssistente: ${config.bot_name || "Assistente"}`
        : "";

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.5,
        max_tokens: 500,
        messages: [
          { role: "system", content: systemPrompt + clinicContext },
          ...contextMessages,
        ],
      });
      botReply = response.choices[0].message.content || "";
    } else {
      botReply = "Olá! No momento estamos com instabilidade. Por favor, tente novamente em breve.";
    }

    // Salva resposta e envia
    messages.push({ role: "assistant", content: botReply, ts: new Date().toISOString() });

    const convData = {
      user_id:         config.user_id,
      instance_name:   instanceName,
      phone,
      patient_name:    existingConv?.patient_name || pushName || phone,
      last_message:    msgText.slice(0, 200),
      last_message_at: new Date().toISOString(),
      messages,
      status:          "active",
      unread_count:    (existingConv?.unread_count || 0) + 1,
      updated_at:      new Date().toISOString(),
    };

    if (existingConv) {
      await supabaseAdmin
        .from("whatsapp_conversations")
        .update(convData)
        .eq("id", existingConv.id);
    } else {
      await supabaseAdmin
        .from("whatsapp_conversations")
        .insert({ ...convData, created_at: new Date().toISOString() });
    }

    await sendWhatsAppMessage(config.evolution_host, instanceName, config.instance_apikey, phone, botReply);

  } catch (err) {
    console.error("[whatsapp-webhook]", err.message);
  }
});

// ── GET /api/whatsapp/config ─────────────────────────────────────────────────
app.get("/api/whatsapp/config", requireUser, async (req, res) => {
  try {
    const { data, error } = await req.db
      .from("whatsapp_bot_config")
      .select("*")
      .eq("user_id", req.user.id)
      .limit(1)
      .single();
    if (error && error.code !== "PGRST116") return res.status(500).json({ error: error.message });
    return res.json({ config: data || null });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/whatsapp/config ────────────────────────────────────────────────
app.post("/api/whatsapp/config", requireUser, async (req, res) => {
  try {
    const {
      instance_name, instance_apikey, evolution_host, bot_name, clinic_name,
      greeting_message, system_prompt, is_active, working_hours, outside_hours_msg,
    } = req.body;

    if (!instance_name || !instance_apikey) {
      return res.status(400).json({ error: "instance_name e instance_apikey obrigatorios" });
    }

    const upsertData = {
      user_id:         req.user.id,
      instance_name,
      instance_apikey,
      evolution_host:  evolution_host || "https://evolution-api-v223.onrender.com",
      bot_name:        bot_name || "Assistente",
      clinic_name,
      greeting_message,
      system_prompt,
      is_active:       is_active !== false,
      working_hours,
      outside_hours_msg,
      updated_at:      new Date().toISOString(),
    };

    const { data, error } = await req.db
      .from("whatsapp_bot_config")
      .upsert(upsertData, { onConflict: "user_id,instance_name" })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ config: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/whatsapp/setup-webhook ────────────────────────────────────────
app.post("/api/whatsapp/setup-webhook", requireUser, async (req, res) => {
  try {
    const { data: config } = await req.db
      .from("whatsapp_bot_config")
      .select("*")
      .eq("user_id", req.user.id)
      .single();

    if (!config) return res.status(404).json({ error: "Configure o bot primeiro." });

    const webhookUrl = `${process.env.RAILWAY_PUBLIC_DOMAIN
      ? "https://" + process.env.RAILWAY_PUBLIC_DOMAIN
      : "https://synapsys-backend-production.up.railway.app"}/api/whatsapp/webhook`;

    const response = await fetch(
      `${config.evolution_host}/webhook/set/${config.instance_name}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: config.instance_apikey },
        body: JSON.stringify({
          url: webhookUrl,
          webhook_by_events: false,
          webhook_base64: false,
          events: ["MESSAGES_UPSERT"],
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(400).json({ error: `Evolution API: ${err}` });
    }

    await req.db
      .from("whatsapp_bot_config")
      .update({ webhook_configured: true, updated_at: new Date().toISOString() })
      .eq("user_id", req.user.id)
      .eq("instance_name", config.instance_name);

    return res.json({ ok: true, webhookUrl });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── GET /api/whatsapp/status ─────────────────────────────────────────────────
app.get("/api/whatsapp/status", requireUser, async (req, res) => {
  try {
    const { data: config } = await req.db
      .from("whatsapp_bot_config")
      .select("*")
      .eq("user_id", req.user.id)
      .single();

    if (!config) return res.json({ connected: false, config: null });

    const response = await fetch(
      `${config.evolution_host}/instance/connectionState/${config.instance_name}`,
      { headers: { apikey: config.instance_apikey } }
    );
    const status = response.ok ? await response.json() : {};

    return res.json({
      connected: status?.instance?.state === "open",
      state: status?.instance?.state || "unknown",
      config: { bot_name: config.bot_name, clinic_name: config.clinic_name, is_active: config.is_active },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── GET /api/whatsapp/conversations ─────────────────────────────────────────
app.get("/api/whatsapp/conversations", requireUser, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const status = req.query.status || null;
    let query = req.db
      .from("whatsapp_conversations")
      .select("id, phone, patient_name, status, last_message, last_message_at, unread_count, created_at")
      .eq("user_id", req.user.id)
      .order("last_message_at", { ascending: false })
      .limit(limit);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ items: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── GET /api/whatsapp/conversations/:id ─────────────────────────────────────
app.get("/api/whatsapp/conversations/:id", requireUser, async (req, res) => {
  try {
    // Marcar como lido
    await req.db
      .from("whatsapp_conversations")
      .update({ unread_count: 0 })
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);

    const { data, error } = await req.db
      .from("whatsapp_conversations")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .single();
    if (error) return res.status(404).json({ error: "Conversa nao encontrada" });
    return res.json({ conversation: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/whatsapp/send ──────────────────────────────────────────────────
app.post("/api/whatsapp/send", requireUser, async (req, res) => {
  try {
    const { phone, text, conversationId } = req.body;
    if (!phone || !text) return res.status(400).json({ error: "phone e text obrigatorios" });

    const { data: config } = await req.db
      .from("whatsapp_bot_config")
      .select("*")
      .eq("user_id", req.user.id)
      .single();
    if (!config) return res.status(404).json({ error: "Configure o bot primeiro." });

    await sendWhatsAppMessage(config.evolution_host, config.instance_name, config.instance_apikey, phone, text);

    // Salva a mensagem manual na conversa
    if (conversationId) {
      const { data: conv } = await req.db
        .from("whatsapp_conversations")
        .select("messages")
        .eq("id", conversationId)
        .single();
      if (conv) {
        const msgs = conv.messages || [];
        msgs.push({ role: "assistant", content: text, ts: new Date().toISOString(), manual: true });
        await req.db
          .from("whatsapp_conversations")
          .update({ messages: msgs, last_message: text.slice(0, 200), last_message_at: new Date().toISOString() })
          .eq("id", conversationId);
      }
    }

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── PATCH /api/whatsapp/conversations/:id ────────────────────────────────────
app.patch("/api/whatsapp/conversations/:id", requireUser, async (req, res) => {
  try {
    const { status, patient_name } = req.body;
    const updates = {};
    if (status) updates.status = status;
    if (patient_name) updates.patient_name = patient_name;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await req.db
      .from("whatsapp_conversations")
      .update(updates)
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ conversation: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── GET /api/whatsapp/stats ──────────────────────────────────────────────────
app.get("/api/whatsapp/stats", requireUser, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: totalConvs } = await req.db
      .from("whatsapp_conversations")
      .select("id", { count: "exact" })
      .eq("user_id", req.user.id);

    const { data: activeConvs } = await req.db
      .from("whatsapp_conversations")
      .select("id", { count: "exact" })
      .eq("user_id", req.user.id)
      .eq("status", "active");

    const { data: todayConvs } = await req.db
      .from("whatsapp_conversations")
      .select("id", { count: "exact" })
      .eq("user_id", req.user.id)
      .gte("last_message_at", today.toISOString());

    const { data: unread } = await req.db
      .from("whatsapp_conversations")
      .select("unread_count")
      .eq("user_id", req.user.id)
      .gt("unread_count", 0);

    const totalUnread = (unread || []).reduce((sum, r) => sum + (r.unread_count || 0), 0);

    return res.json({
      totalConversations: totalConvs?.length || 0,
      activeConversations: activeConvs?.length || 0,
      todayMessages: todayConvs?.length || 0,
      unreadMessages: totalUnread,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

'''

with open(SERVER_PATH, "r", encoding="utf-8") as f:
    content = f.read()

MARKER = "app.listen(PORT, () => {"
if MARKER not in content:
    print(f"ERRO: marcador nao encontrado em server.js")
    sys.exit(1)

if "/api/whatsapp/webhook" in content:
    print("AVISO: Rotas WhatsApp ja existem — patch ignorado.")
    sys.exit(0)

content = content.replace(MARKER, WHATSAPP_ROUTES + MARKER, 1)

with open(SERVER_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ Rotas WhatsApp adicionadas ao server.js!")
print("   POST /api/whatsapp/webhook (público)")
print("   GET/POST /api/whatsapp/config")
print("   POST /api/whatsapp/setup-webhook")
print("   GET  /api/whatsapp/status")
print("   GET  /api/whatsapp/conversations")
print("   GET  /api/whatsapp/conversations/:id")
print("   POST /api/whatsapp/send")
print("   GET  /api/whatsapp/stats")
print()
print("Próximo: cd backend && git add server.js && git commit -m 'feat: WhatsApp bot routes' && git push")
