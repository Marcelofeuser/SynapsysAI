const { renderDiscReport } = require("./src/disc/renderDiscReport");
const { loadDiscBase } = require("./src/knowledge/loadDiscBase");
const {
  addConversationMessage,
  createConversation,
  createProject,
  deleteConversation,
  deleteProject,
  getConversation,
  isMissingSynapsysTableError,
  listConversations,
  listProjects,
  listRecentConversations,
  searchWorkspace,
  updateConversation,
  updateProject,
} = require("./src/synapsys/repository");
const {
  buildConversationTitle,
  getRangeStart,
  normalizeConversationFilter,
  toPositiveInteger,
} = require("./src/synapsys/utils");
const cors = require("cors");
const OpenAI = require("openai");
const { loadAllPrompts, loadModePrompt } = require("./src/ai/loadPrompts");
const { TOOLS: COPILOT_TOOLS, executeTool: executeCopilotTool } = require("./src/ai/copilotTools");
const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const BASE_DOMAIN = process.env.BASE_DOMAIN || "insightdisc.com";
const SYNAPSYS_SUBDOMAIN = process.env.SYNAPSYS_SUBDOMAIN || "synapsys";
const SYNAPSYS_PROTOCOL = process.env.SYNAPSYS_PROTOCOL || "https";

const SYNAPSYS_DOMAIN = `${SYNAPSYS_SUBDOMAIN}.${BASE_DOMAIN}`;
const SYNAPSYS_URL = `${SYNAPSYS_PROTOCOL}://${SYNAPSYS_DOMAIN}`;

const Groq = require("groq-sdk");
const Anthropic = require("@anthropic-ai/sdk");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const SYNAPSYS_SERVER_KEY = String(process.env.SYNAPSYS_SERVER_KEY || "").trim();

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function createRequestSupabaseClient(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

async function resolveUserFromRequest(req, { required = true } = {}) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    if (!required) {
      return { user: null, token: null };
    }

    const error = new Error("Token nao enviado");
    error.statusCode = 401;
    throw error;
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    if (!required) {
      return { user: null, token: null };
    }

    const authError = new Error("Token invalido ou expirado");
    authError.statusCode = 401;
    throw authError;
  }

  return { user, token };
}

async function requireUser(req, res, next) {
  try {
    const { user, token } = await resolveUserFromRequest(req, { required: true });
    req.user = user;
    req.accessToken = token;
    req.db = createRequestSupabaseClient(token);
    next();
  } catch (error) {
    res.status(error.statusCode || 401).json({ error: error.message });
  }
}

async function optionalUser(req, res, next) {
  try {
    const { user, token } = await resolveUserFromRequest(req, { required: false });
    req.user = user;
    req.accessToken = token;
    req.db = token ? createRequestSupabaseClient(token) : null;
    next();
  } catch (error) {
    next(error);
  }
}

function requireSynapsysServerKey(req, res, next) {
  const serverKey = String(req.headers["x-synapsys-key"] || "").trim();

  if (!SYNAPSYS_SERVER_KEY || !serverKey || serverKey !== SYNAPSYS_SERVER_KEY) {
    return res.status(401).json({ error: "Chave server-to-server invalida" });
  }

  next();
}

function buildServerAnalyzePayload(body) {
  const context = isPlainObject(body?.context) ? body.context : {};
  const mode = typeof context.mode === "string" && context.mode.trim() ? context.mode.trim() : undefined;
  const contextualData = { ...context };

  delete contextualData.mode;
  delete contextualData.conversationId;
  delete contextualData.projectId;

  const hasContext = Object.keys(contextualData).length > 0;
  const input = hasContext
    ? `${String(body?.input || "").trim()}\n\nContexto adicional (JSON):\n${JSON.stringify(contextualData, null, 2)}`
    : body?.input;

  return {
    input,
    mode,
    conversationId:
      typeof context.conversationId === "string" && context.conversationId.trim()
        ? context.conversationId.trim()
        : undefined,
    projectId:
      typeof context.projectId === "string" && context.projectId.trim()
        ? context.projectId.trim()
        : undefined,
  };
}

function getWorkspaceFilter(req) {
  const filter = normalizeConversationFilter(req.query.filter || req.query.period || "30d");
  return {
    filter,
    rangeStart: getRangeStart(filter),
    projectId: String(req.query.projectId || "").trim() || null,
  };
}

function handleWorkspaceError(res, error, fallbackMessage) {
  console.error("[synapsys-workspace]", error.message);

  if (isMissingSynapsysTableError(error)) {
    return res.status(503).json({
      error: "As tabelas da Synapsys ainda nao foram criadas no banco.",
      setupRequired: true,
      migration: "backend/sql/20260420_synapsys_phase1.sql",
    });
  }

  return res.status(error.statusCode || 500).json({
    error: fallbackMessage,
    details: error.message,
  });
}

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(express.static("public"));

app.get("/", (req, res) => {
  return res.sendFile(path.resolve("public/index.html"));
});


app.use(
  cors({
    origin: [
      "http://localhost:5176",
      "http://localhost:5174",
      "http://localhost:5173",
      "https://synapsys-ai.vercel.app",
      "https://app.insightdisc.com",
      "https://synapsys.insightdisc.com",
      "https://synapsys-frontend-production.up.railway.app",
    ],
    credentials: true,
  })
);

// --- Providers ---
// FIX: instanciar providers apenas se a chave existir,
// evitando crash na inicialização do servidor

let openai = null;
let groq = null;
let anthropic = null;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
  console.warn("⚠️ OPENAI_API_KEY não configurada — provider OpenAI desativado");
}

if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
} else {
  console.warn("⚠️ GROQ_API_KEY não configurada — provider Groq desativado");
}

if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
} else {
  console.warn("⚠️ ANTHROPIC_API_KEY não configurada — provider Claude desativado");
}

let discBase = {};

try {
  discBase = loadDiscBase();
  console.log("✅ Base DISC carregada com sucesso");
} catch (error) {
  console.warn("⚠️ Falha ao carregar base DISC:", error.message);
}

async function openaiProvider(systemPrompt, userInput) {
  if (!openai) {
    throw new Error("OpenAI não configurada: OPENAI_API_KEY ausente nas variáveis de ambiente");
  }

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput },
    ],
  });

  return response.choices?.[0]?.message?.content || "";
}

async function groqProvider(systemPrompt, userInput) {
  if (!groq) {
    throw new Error("Groq não configurado: GROQ_API_KEY ausente nas variáveis de ambiente");
  }

  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    temperature: 0.4,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput },
    ],
  });

  return completion.choices?.[0]?.message?.content || "";
}

async function claudeProvider(systemPrompt, userInput) {
  if (!anthropic) {
    throw new Error("Claude não configurado: ANTHROPIC_API_KEY ausente nas variáveis de ambiente");
  }

  const response = await anthropic.messages.create({
    model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userInput }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text || "";
}

// FIX: termos DISC mais precisos — mantidos para uso futuro,
// mas o roteamento principal agora é por AI_PROVIDER
const DISC_TERMS = [
  "DISC",
  "dominân",
  "dominan",
  "influên",
  "estabilidade comportamental",
  "conformidade",
  "perfil comportamental",
  "perfil disc",
  "fator d",
  "fator i",
  "fator s",
  "fator c",
  " DI ",
  " DC ",
  " IS ",
  " SC ",
  " ID ",
  " CD ",
  " SI ",
  " CS ",
];

function isDiscMessage(input) {
  const upper = input.toUpperCase();
  return DISC_TERMS.some((term) => upper.includes(term.toUpperCase()));
}

// FIX: agora usa prompts estruturados + modo operacional
// OpenAI vira provider principal por configuração explícita
async function generateInsight(userInput, mode = "builder") {
  const FALLBACK_PROMPT =
    "Você é a Synapsys AI, um sistema de inteligência artificial focado em automação, análise e tomada de decisão para empresas. Seja claro, direto e entregue soluções práticas.";

  let basePrompt = FALLBACK_PROMPT;

  try {
    basePrompt = loadAllPrompts();
  } catch (error) {
    console.warn("⚠️ Falha ao carregar prompts estruturados:", error.message);
  }

  let modePrompt = "";
  try {
    modePrompt = loadModePrompt(mode || "builder");
  } catch (error) {
    console.warn("⚠️ Falha ao carregar mode prompt:", error.message);
  }

  const systemPrompt = [basePrompt, modePrompt].filter(Boolean).join("\n\n");
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();

  if (provider === "openai" && openai) {
    const text = await openaiProvider(systemPrompt, userInput);
    return { text, source: "openai" };
  }

  if (provider === "claude" && anthropic) {
    const text = await claudeProvider(systemPrompt, userInput);
    return { text, source: "claude" };
  }

  if (provider === "groq" && groq) {
    try {
      const text = await groqProvider(systemPrompt, userInput);
      return { text, source: "groq" };
    } catch (groqError) {
      console.warn("Groq falhou:", groqError.message);

      if (openai) {
        console.warn("Tentando OpenAI como fallback...");
        const text = await openaiProvider(systemPrompt, userInput);
        return { text, source: "openai-fallback" };
      }

      if (anthropic) {
        console.warn("Tentando Claude como fallback...");
        const text = await claudeProvider(systemPrompt, userInput);
        return { text, source: "claude-fallback" };
      }

      throw new Error(`Groq falhou e não há fallback disponível. Erro: ${groqError.message}`);
    }
  }

  if (openai) {
    const text = await openaiProvider(systemPrompt, userInput);
    return { text, source: "openai-fallback-default" };
  }

  if (groq) {
    const text = await groqProvider(systemPrompt, userInput);
    return { text, source: "groq-fallback-default" };
  }

  if (anthropic) {
    const text = await claudeProvider(systemPrompt, userInput);
    return { text, source: "claude-fallback-default" };
  }

  throw new Error(
    "Nenhum provider de IA configurado. Defina OPENAI_API_KEY, GROQ_API_KEY ou ANTHROPIC_API_KEY nas variáveis de ambiente do Railway."
  );
}

async function runSynapsysTurn({ input, mode = "builder", conversationId, projectId, user, db }) {
  const startedAt = Date.now();
  const normalizedInput = String(input || "").trim();
  let conversation = null;
  let persistenceEnabled = !!(user && db);
  let persistenceWarning = null;

  if (!normalizedInput) {
    const error = new Error("Input e obrigatorio");
    error.statusCode = 400;
    throw error;
  }

  if (persistenceEnabled) {
    try {
      if (conversationId) {
        const updates = {
          archivedAt: null,
          lastOpenedAt: new Date().toISOString(),
        };

        if (projectId !== undefined) {
          updates.projectId = projectId || null;
        }

        conversation = await updateConversation(db, user.id, conversationId, updates);
      } else {
        conversation = await createConversation(db, user.id, {
          title: buildConversationTitle(normalizedInput),
          projectId: projectId || null,
        });
      }

      await addConversationMessage(db, conversation.id, "user", normalizedInput);
    } catch (error) {
      if (isMissingSynapsysTableError(error)) {
        persistenceEnabled = false;
        persistenceWarning = "Persistencia indisponivel ate a migracao SQL ser aplicada.";
      } else {
        throw error;
      }
    }
  }

  try {
    const { text, source } = await generateInsight(normalizedInput, mode || "builder");

    if (persistenceEnabled && conversation) {
      await addConversationMessage(db, conversation.id, "assistant", text);
      conversation = await updateConversation(db, user.id, conversation.id, {
        archivedAt: null,
        lastOpenedAt: new Date().toISOString(),
      });
    }

    trackRequest({
      input: normalizedInput,
      output: text,
      source,
      durationMs: Date.now() - startedAt,
      error: false,
    });

    return {
      conversation,
      persistenceEnabled,
      persistenceWarning,
      response: text,
      source,
    };
  } catch (error) {
    trackRequest({
      input: normalizedInput,
      output: "",
      source: "error",
      durationMs: Date.now() - startedAt,
      error: true,
    });
    throw error;
  }
}

// ════════════════════════════════════════════════════════
//  STATS — rastreamento em memória
// ════════════════════════════════════════════════════════
const stats = {
  totalRequests: 0,
  totalErrors: 0,
  responseTimes: [],        // últimos 100 tempos de resposta (ms)
  requestsPerDay: {},       // { "2026-04-10": 42 }
  recentLogs: [],           // últimas 50 interações
  startedAt: new Date().toISOString(),
};

function trackRequest({ input, output, source, durationMs, error = false }) {
  stats.totalRequests++;
  if (error) stats.totalErrors++;

  stats.responseTimes.push(durationMs);
  if (stats.responseTimes.length > 100) stats.responseTimes.shift();

  const today = new Date().toISOString().slice(0, 10);
  stats.requestsPerDay[today] = (stats.requestsPerDay[today] || 0) + 1;

  stats.recentLogs.unshift({
    ts: new Date().toISOString(),
    input: (input || "").slice(0, 120),
    output: error ? "[ERRO]" : (output || "").slice(0, 200),
    source,
    durationMs,
    error,
  });
  if (stats.recentLogs.length > 50) stats.recentLogs.pop();
}

// ════════════════════════════════════════════════════════
//  ADMIN AUTH middleware
// ════════════════════════════════════════════════════════
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "synapsys-admin-2026";
const activeSessions = new Set();   // tokens simples em memória

function adminAuth(req, res, next) {
  const token = req.headers["x-admin-token"] || req.query.token;
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: "Não autorizado. Faça login em /admin/login" });
  }
  next();
}

// ════════════════════════════════════════════════════════
//  ADMIN CONFIG em memória (sobrescreve temporariamente)
// ════════════════════════════════════════════════════════
const runtimeConfig = {
  aiProvider: null,        // null = usa env AI_PROVIDER
  openaiModel: null,
  groqModel: null,
  claudeModel: null,
  temperature: null,
  systemPromptOverride: null,
};

// ════════════════════════════════════════════════════════
//  ROUTES — público
// ════════════════════════════════════════════════════════


app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    provider: process.env.AI_PROVIDER || "openai",
    openai_configured: !!openai,
    groq_configured: !!groq,
    claude_configured: !!anthropic,
    openai_model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    groq_model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    claude_model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
    synapsys_domain: SYNAPSYS_DOMAIN,
    synapsys_url: SYNAPSYS_URL,
  });
});

app.get("/disc/base", (req, res) => {
  return res.json({
    ok: true,
    factors: Object.keys(discBase),
    discBase,
  });
});

app.get("/bootstrap-admin", async (req, res) => {
  try {
    const user = {
      name: "Marcelo Feuser",
      email: "admin@synapsys.ai",
      role: "SUPER_ADMIN",
      createdAt: new Date(),
    };

    console.log("🔥 SUPER ADMIN CRIADO:", user);

    return res.json({
      success: true,
      user,
    }); 
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});


// ════════════════════════════════════════════════════════
//  ADMIN — USUÁRIOS
// ════════════════════════════════════════════════════════

// Listar usuários
app.get("/admin/users", adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) return res.status(500).json({ error: error.message });
    const users = data.users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.name || u.email?.split("@")[0],
      plan: u.user_metadata?.plan || "free",
      role: u.user_metadata?.role || "user",
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at,
      confirmed: !!u.email_confirmed_at,
    }));
    res.json({ users });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Convidar usuário por email (link de acesso)
app.post("/admin/users/invite", adminAuth, async (req, res) => {
  try {
    const { email, name, plan = "personal", role = "user" } = req.body;
    if (!email) return res.status(400).json({ error: "Email obrigatorio" });
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { name, plan, role },
      redirectTo: process.env.APP_URL || "https://synapsys.insightdisc.com/login",
    });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true, user: data.user, message: "Convite enviado para " + email });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Criar usuário direto (com senha)
app.post("/admin/users", adminAuth, async (req, res) => {
  try {
    const { email, name, password, plan = "personal", role = "user" } = req.body;
    if (!email || !name) return res.status(400).json({ error: "Email e nome obrigatorios" });
    if (password) {
      // Cria com senha
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email, password,
        user_metadata: { name, plan, role },
        email_confirm: true,
      });
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ ok: true, user: data.user });
    } else {
      // Envia convite
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { name, plan, role },
        redirectTo: process.env.APP_URL || "https://synapsys.insightdisc.com/login",
      });
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ ok: true, invited: true, user: data.user, message: "Convite enviado!" });
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Atualizar plano/role do usuário
app.patch("/admin/users/:id", adminAuth, async (req, res) => {
  try {
    const { plan, role, name } = req.body;
    const updates = {};
    if (plan || role || name) {
      const meta = {};
      if (plan) meta.plan = plan;
      if (role) meta.role = role;
      if (name) meta.name = name;
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, {
        user_metadata: meta,
      });
      if (error) return res.status(400).json({ error: error.message });
      updates.user = data.user;
    }
    res.json({ ok: true, ...updates });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Deletar usuário
app.delete("/admin/users/:id", adminAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true, deleted: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});


// Refresh de token
app.post("/auth/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "refreshToken obrigatorio" });
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) return res.status(401).json({ error: "Refresh invalido ou expirado" });
    res.json({
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post("/auth/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ error: "email, password e name são obrigatórios" });
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return res.status(400).json({ error: error.message });
  if (data.user) {
    await supabase.from("users").insert({ id: data.user.id, email, name });
  }
  res.json({ message: "Cadastro realizado.", user: data.user });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "email e password são obrigatórios" });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });
  res.json({
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
    user: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name || data.user.email?.split("@")[0] || "Usuario Synapsys",
    },
  });
});

app.get("/auth/me", requireUser, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.user_metadata?.name || req.user.email?.split("@")[0] || "Usuario Synapsys",
    },
  });
});

app.post("/api/synapsys/general", optionalUser, async (req, res) => {
  try {
    const { input, mode, conversationId, projectId } = req.body;
    const result = await runSynapsysTurn({
      input,
      mode,
      conversationId,
      projectId,
      user: req.user,
      db: req.db,
    });

    return res.json({
      success: true,
      source: result.source,
      mode: mode || "builder",
      response: result.response,
      conversation: result.conversation,
      persistenceEnabled: result.persistenceEnabled,
      persistenceWarning: result.persistenceWarning,
    });
  } catch (error) {
    console.error("ERRO IA:", error.message);

    return res.status(error.statusCode || 500).json({
      success: false,
      source: "error",
      response:
        "Não foi possível processar sua mensagem. Verifique as variáveis de ambiente do provider configurado.",
      error: error.message,
    });
  }
});

app.post("/synapsys/analyze", requireUser, async (req, res) => {
  try {
    const result = await runSynapsysTurn({
      input: req.body?.input,
      mode: req.body?.mode,
      conversationId: req.body?.conversationId,
      projectId: req.body?.projectId,
      user: req.user,
      db: req.db,
    });

    return res.json({
      success: true,
      source: result.source,
      mode: req.body?.mode || "builder",
      response: result.response,
      conversation: result.conversation,
    });
  } catch (error) {
    console.error("ERRO IA:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      source: "error",
      response:
        "Não foi possível processar sua mensagem. Verifique as variáveis de ambiente do provider configurado.",
      error: error.message,
    });
  }
});

app.post("/synapsys/server-analyze", requireSynapsysServerKey, async (req, res) => {
  try {
    const payload = buildServerAnalyzePayload(req.body);
    const result = await runSynapsysTurn({
      input: payload.input,
      mode: payload.mode,
      conversationId: payload.conversationId,
      projectId: payload.projectId,
      user: null,
      db: null,
    });

    return res.json({
      success: true,
      source: result.source,
      mode: payload.mode || "builder",
      response: result.response,
      conversation: result.conversation,
    });
  } catch (error) {
    console.error("ERRO IA:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      source: "error",
      response:
        "Não foi possível processar sua mensagem. Verifique as variáveis de ambiente do provider configurado.",
      error: error.message,
    });
  }
});

app.get("/api/synapsys/bootstrap", requireUser, async (req, res) => {
  try {
    const filter = normalizeConversationFilter(req.query.filter || "30d");
    const rangeStart = getRangeStart(filter);
    const limit = toPositiveInteger(req.query.limit, 40, 120);

    const [projects, recentConversations, conversations] = await Promise.all([
      listProjects(req.db, req.user.id),
      listRecentConversations(req.db, req.user.id, 10),
      listConversations(req.db, req.user.id, { filter, rangeStart, limit }),
    ]);

    return res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.user_metadata?.name || req.user.email?.split("@")[0] || "Usuario Synapsys",
      },
      projects,
      recentConversations,
      conversations,
      defaultFilter: filter,
    });
  } catch (error) {
    return handleWorkspaceError(res, error, "Nao foi possivel carregar a area da Synapsys.");
  }
});

app.get("/api/synapsys/conversations/recent", requireUser, async (req, res) => {
  try {
    const limit = toPositiveInteger(req.query.limit, 10, 20);
    const recentConversations = await listRecentConversations(req.db, req.user.id, limit);
    return res.json({ items: recentConversations });
  } catch (error) {
    return handleWorkspaceError(res, error, "Nao foi possivel carregar os cerebros recentes.");
  }
});

app.get("/api/synapsys/conversations", requireUser, async (req, res) => {
  try {
    const { filter, rangeStart, projectId } = getWorkspaceFilter(req);
    const limit = toPositiveInteger(req.query.limit, 60, 200);
    const conversations = await listConversations(req.db, req.user.id, {
      filter,
      rangeStart,
      projectId,
      limit,
    });
    return res.json({ items: conversations, filter });
  } catch (error) {
    return handleWorkspaceError(res, error, "Nao foi possivel listar as conversas.");
  }
});

app.post("/api/synapsys/conversations", requireUser, async (req, res) => {
  try {
    const rawTitle = String(req.body?.title || "").trim();
    const conversation = await createConversation(req.db, req.user.id, {
      title: rawTitle || "Novo cerebro",
      projectId: String(req.body?.projectId || "").trim() || null,
    });
    return res.status(201).json({ conversation });
  } catch (error) {
    return handleWorkspaceError(res, error, "Nao foi possivel criar a conversa.");
  }
});

app.get("/api/synapsys/conversations/:conversationId", requireUser, async (req, res) => {
  try {
    const conversation = await getConversation(req.db, req.user.id, req.params.conversationId, {
      markOpened: true,
    });
    return res.json({ conversation });
  } catch (error) {
    return handleWorkspaceError(res, error, "Nao foi possivel carregar a conversa.");
  }
});

app.patch("/api/synapsys/conversations/:conversationId", requireUser, async (req, res) => {
  try {
    if (req.body?.title !== undefined && !String(req.body.title || "").trim()) {
      return res.status(400).json({ error: "O titulo da conversa nao pode ficar vazio." });
    }

    const conversation = await updateConversation(req.db, req.user.id, req.params.conversationId, {
      title: req.body?.title !== undefined ? String(req.body.title || "").trim() : undefined,
      projectId:
        req.body?.projectId !== undefined ? String(req.body.projectId || "").trim() || null : undefined,
      archivedAt:
        req.body?.archived !== undefined
          ? req.body.archived
            ? new Date().toISOString()
            : null
          : undefined,
      lastOpenedAt: req.body?.markOpened ? new Date().toISOString() : undefined,
    });

    return res.json({ conversation });
  } catch (error) {
    return handleWorkspaceError(res, error, "Nao foi possivel atualizar a conversa.");
  }
});

app.delete("/api/synapsys/conversations/:conversationId", requireUser, async (req, res) => {
  try {
    await deleteConversation(req.db, req.user.id, req.params.conversationId);
    return res.json({ ok: true });
  } catch (error) {
    return handleWorkspaceError(res, error, "Nao foi possivel excluir a conversa.");
  }
});

app.get("/api/synapsys/projects", requireUser, async (req, res) => {
  try {
    const projects = await listProjects(req.db, req.user.id);
    return res.json({ items: projects });
  } catch (error) {
    return handleWorkspaceError(res, error, "Nao foi possivel listar os projetos.");
  }
});

app.post("/api/synapsys/projects", requireUser, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "O nome do projeto e obrigatorio." });
    }

    const project = await createProject(req.db, req.user.id, {
      name,
      description: req.body?.description,
      color: req.body?.color,
      icon: req.body?.icon,
    });

    return res.status(201).json({ project });
  } catch (error) {
    return handleWorkspaceError(res, error, "Nao foi possivel criar o projeto.");
  }
});

app.patch("/api/synapsys/projects/:projectId", requireUser, async (req, res) => {
  try {
    if (req.body?.name !== undefined && !String(req.body.name || "").trim()) {
      return res.status(400).json({ error: "O nome do projeto nao pode ficar vazio." });
    }

    const project = await updateProject(req.db, req.user.id, req.params.projectId, {
      name: req.body?.name,
      description: req.body?.description,
      color: req.body?.color,
      icon: req.body?.icon,
      archivedAt:
        req.body?.archived !== undefined
          ? req.body.archived
            ? new Date().toISOString()
            : null
          : undefined,
    });

    return res.json({ project });
  } catch (error) {
    return handleWorkspaceError(res, error, "Nao foi possivel atualizar o projeto.");
  }
});

app.delete("/api/synapsys/projects/:projectId", requireUser, async (req, res) => {
  try {
    await deleteProject(req.db, req.user.id, req.params.projectId);
    return res.json({ ok: true });
  } catch (error) {
    return handleWorkspaceError(res, error, "Nao foi possivel excluir o projeto.");
  }
});

app.get("/api/synapsys/search", requireUser, async (req, res) => {
  try {
    const term = String(req.query.q || req.query.term || "").trim();
    if (!term) {
      return res.json({ items: [] });
    }

    const { filter, rangeStart, projectId } = getWorkspaceFilter(req);
    const limit = toPositiveInteger(req.query.limit, 30, 100);
    const items = await searchWorkspace(req.db, req.user.id, {
      term,
      filter,
      rangeStart,
      projectId,
      limit,
    });

    return res.json({ items, filter, term });
  } catch (error) {
    return handleWorkspaceError(res, error, "Nao foi possivel concluir a busca.");
  }
});

// ════════════════════════════════════════════════════════
//  ADMIN ROUTES
// ════════════════════════════════════════════════════════

// Login — retorna token de sessão
app.post("/admin/login", (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Senha incorreta" });
  }
  const token = `sat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  activeSessions.add(token);
  // expira em 8h
  setTimeout(() => activeSessions.delete(token), 8 * 60 * 60 * 1000);
  res.json({ token });
});

// Logout
app.post("/admin/logout", adminAuth, (req, res) => {
  const token = req.headers["x-admin-token"] || req.query.token;
  activeSessions.delete(token);
  res.json({ ok: true });
});

// Stats do dashboard
app.get("/admin/stats", adminAuth, (req, res) => {
  const avgResponse = stats.responseTimes.length
    ? Math.round(stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length)
    : 0;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return { date: key, count: stats.requestsPerDay[key] || 0 };
  });

  res.json({
    totalRequests: stats.totalRequests,
    totalErrors: stats.totalErrors,
    errorRate: stats.totalRequests ? ((stats.totalErrors / stats.totalRequests) * 100).toFixed(1) : "0.0",
    avgResponseMs: avgResponse,
    uptime: Math.round((Date.now() - new Date(stats.startedAt).getTime()) / 1000),
    startedAt: stats.startedAt,
    last7Days,
    providers: {
      openai: { configured: !!openai, model: process.env.OPENAI_MODEL || "gpt-4.1-mini" },
      groq:   { configured: !!groq,   model: process.env.GROQ_MODEL || "llama-3.1-8b-instant" },
      claude: { configured: !!anthropic, model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6" },
      active: runtimeConfig.aiProvider || process.env.AI_PROVIDER || "openai",
    },
  });
});

// Logs recentes
app.get("/admin/logs", adminAuth, (req, res) => {
  res.json({ logs: stats.recentLogs });
});
// ════════════════════════════════════════════════════════
//  ADMIN — BASE DE CONHECIMENTO
// ════════════════════════════════════════════════════════

const KNOWLEDGE_DIR = (() => {
  const candidates = [
    path.resolve(__dirname, "..", "knowledge", "custom"),
    path.resolve(__dirname, "knowledge", "custom"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(path.dirname(p))) return p;
  }
  return candidates[0];
})();

// Garante que a pasta custom existe
if (!fs.existsSync(KNOWLEDGE_DIR)) {
  fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
}

// GET /admin/knowledge — lista arquivos
app.get("/admin/knowledge", adminAuth, (req, res) => {
  try {
    const files = fs.readdirSync(KNOWLEDGE_DIR).map(name => {
      const filePath = path.join(KNOWLEDGE_DIR, name);
      const stat = fs.statSync(filePath);
      return { name, size: stat.size, updatedAt: stat.mtime };
    });
    res.json({ files });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /admin/knowledge/content?name=arquivo.txt — conteúdo do arquivo
app.get("/admin/knowledge/content", adminAuth, (req, res) => {
  try {
    const { name } = req.query;
    if (!name || name.includes("..")) return res.status(400).json({ error: "Nome inválido" });
    const filePath = path.join(KNOWLEDGE_DIR, name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Arquivo não encontrado" });
    const content = fs.readFileSync(filePath, "utf-8");
    res.json({ content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /admin/knowledge/upload — upload de arquivo (base64), com extração de PDF
app.post("/admin/knowledge/upload", adminAuth, async (req, res) => {
  try {
    const { name, content, encoding } = req.body;
    if (!name || name.includes("..")) return res.status(400).json({ error: "Nome inválido" });

    const buffer = encoding === "base64" ? Buffer.from(content, "base64") : Buffer.from(content, "utf-8");

    // Se for PDF, extrai o texto
    if (name.toLowerCase().endsWith(".pdf")) {
      try {
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(buffer);
        const txtName = name.replace(/\.pdf$/i, ".txt");
        const filePath = path.join(KNOWLEDGE_DIR, txtName);
        fs.writeFileSync(filePath, data.text, "utf-8");
        return res.json({ ok: true, name: txtName, pages: data.numpages, converted: true });
      } catch (pdfErr) {
        return res.status(500).json({ error: "Erro ao processar PDF: " + pdfErr.message });
      }
    }

    // Outros formatos: salva normalmente
    const filePath = path.join(KNOWLEDGE_DIR, name);
    fs.writeFileSync(filePath, buffer);
    res.json({ ok: true, name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /admin/knowledge/content — salva edição
app.put("/admin/knowledge/content", adminAuth, (req, res) => {
  try {
    const { name, content } = req.body;
    if (!name || name.includes("..")) return res.status(400).json({ error: "Nome inválido" });
    const filePath = path.join(KNOWLEDGE_DIR, name);
    fs.writeFileSync(filePath, content, "utf-8");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /admin/knowledge — deleta arquivo
app.delete("/admin/knowledge", adminAuth, (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.includes("..")) return res.status(400).json({ error: "Nome inválido" });
    const filePath = path.join(KNOWLEDGE_DIR, name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Arquivo não encontrado" });
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════
//  ADMIN — SYSTEM PROMPT EDITOR
// ════════════════════════════════════════════════════════

function resolveSystemPromptPath() {
  const candidates = [
    path.resolve(__dirname, "..", "prompts", "system-prompt.md"),
    path.resolve(__dirname, "prompts", "system-prompt.md"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

app.get("/admin/system-prompt", adminAuth, (req, res) => {
  try {
    const filePath = resolveSystemPromptPath();
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "system-prompt.md não encontrado" });
    }
    const content = fs.readFileSync(filePath, "utf-8");
    res.json({ content, path: filePath });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/admin/system-prompt", adminAuth, (req, res) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Campo 'content' obrigatório" });
    }
    const filePath = resolveSystemPromptPath();
    fs.writeFileSync(filePath, content, "utf-8");
    runtimeConfig.systemPromptOverride = content;
    console.log(`✅ system-prompt.md atualizado (${content.length} chars)`);
    res.json({ ok: true, chars: content.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// Config atual
app.get("/admin/config", adminAuth, (req, res) => {
  res.json({
    aiProvider:           runtimeConfig.aiProvider || process.env.AI_PROVIDER || "openai",
    openaiModel:          runtimeConfig.openaiModel || process.env.OPENAI_MODEL || "gpt-4.1-mini",
    groqModel:            runtimeConfig.groqModel || process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    claudeModel:          runtimeConfig.claudeModel || process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
    temperature:          runtimeConfig.temperature ?? 0.3,
    systemPromptOverride: runtimeConfig.systemPromptOverride || null,
    baseDomain:           process.env.BASE_DOMAIN || "insightdisc.com",
  });
});

// Atualizar config em runtime
app.post("/admin/config", adminAuth, (req, res) => {
  const { aiProvider, openaiModel, groqModel, claudeModel, temperature, systemPromptOverride } = req.body;
  if (aiProvider)            runtimeConfig.aiProvider = aiProvider;
  if (openaiModel)           runtimeConfig.openaiModel = openaiModel;
  if (groqModel)             runtimeConfig.groqModel = groqModel;
  if (claudeModel)           runtimeConfig.claudeModel = claudeModel;
  if (temperature !== undefined) runtimeConfig.temperature = Number(temperature);
  if (systemPromptOverride !== undefined) runtimeConfig.systemPromptOverride = systemPromptOverride || null;

  console.log("⚙️ Config atualizada pelo admin:", runtimeConfig);
  res.json({ ok: true, config: runtimeConfig });
});

const PORT = Number(process.env.PORT) || 4010;


// ─────────────────────────────────────────────
// DISC PREMIUM REPORT
// ─────────────────────────────────────────────
app.post("/generate-disc-report", async (req, res) => {
  try {
    const { scores } = req.body;

    if (!scores || typeof scores !== "object") {
      return res.status(400).json({ error: "Scores DISC são obrigatórios" });
    }

    const html = await renderDiscReport(req.body);

    const puppeteer = require("puppeteer");

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "8mm",
        bottom: "8mm",
        left: "8mm",
        right: "8mm"
      }
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=relatorio-disc-premium.pdf"
    });

    res.send(pdf);
  } catch (error) {
    console.error("ERRO DISC:", error);
    res.status(500).json({
      error: error?.message || "Erro ao gerar relatório DISC premium",
      stack: error?.stack || null
    });
  }
});



// ════════════════════════════════════════════════════════
//  AI PHASE 1 — Transcription | Copilot | Skin Analysis
// ════════════════════════════════════════════════════════

// POST /api/ai/transcribe — Whisper transcription + parser de prontuário
app.post("/api/ai/transcribe", requireUser, async (req, res) => {
  try {
    const { audio, filename = "audio.webm", language = "pt", parseFields = true } = req.body;
    if (!audio) return res.status(400).json({ error: "Audio base64 obrigatorio" });
    if (!openai) return res.status(503).json({ error: "OPENAI_API_KEY nao configurada" });

    const os = require("os");
    const buffer = Buffer.from(audio, "base64");
    const tmpPath = require("path").join(os.tmpdir(), `sx_${Date.now()}_${filename}`);
    require("fs").writeFileSync(tmpPath, buffer);

    const fileStream = require("fs").createReadStream(tmpPath);
    const transcriptionResult = await openai.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1",
      language,
      response_format: "verbose_json",
    });
    require("fs").unlinkSync(tmpPath);

    const transcription = transcriptionResult.text || "";
    let parsedFields = null;

    if (parseFields && transcription.length > 10) {
      try {
        const parseResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `Extraia campos clinicos de uma transcricao de consulta. Retorne JSON com exatamente estas chaves:
{
  "queixa_principal": "string ou null",
  "historico_presente": "string ou null",
  "historico_anterior": "string ou null",
  "medicamentos": ["array ou []"],
  "alergias": ["array ou []"],
  "exame_fisico": "string ou null",
  "hipotese_diagnostica": "string ou null",
  "conduta": "string ou null",
  "retorno": "string ou null",
  "observacoes": "string ou null"
}
Se o campo nao for mencionado, retorne null (ou [] para arrays).`,
            },
            { role: "user", content: `Transcricao:\n\n${transcription}` },
          ],
        });
        parsedFields = JSON.parse(parseResponse.choices[0].message.content);
      } catch (_) {
        parsedFields = null;
      }
    }

    let savedId = null;
    if (req.db && req.user) {
      const { data } = await req.db
        .from("ai_transcriptions")
        .insert({
          user_id: req.user.id,
          audio_filename: filename,
          transcription,
          parsed_fields: parsedFields,
          duration_seconds: transcriptionResult.duration ? Math.round(transcriptionResult.duration) : null,
          language,
        })
        .select("id")
        .single();
      savedId = data?.id;
    }

    return res.json({
      ok: true,
      id: savedId,
      transcription,
      duration: transcriptionResult.duration,
      language,
      parsedFields,
    });
  } catch (error) {
    console.error("[transcribe]", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/transcriptions
app.get("/api/ai/transcriptions", requireUser, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { data, error } = await req.db
      .from("ai_transcriptions")
      .select("id, audio_filename, transcription, parsed_fields, duration_seconds, language, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ items: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// DELETE /api/ai/transcriptions/:id
app.delete("/api/ai/transcriptions/:id", requireUser, async (req, res) => {
  try {
    const { error } = await req.db
      .from("ai_transcriptions")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/copilot — GPT-4o com function calling + dados reais da clínica
app.post("/api/ai/copilot", requireUser, async (req, res) => {
  try {
    const { messages, patientContext, sessionId, product = "psicothera" } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages (array) obrigatorio" });
    }
    if (!openai) return res.status(503).json({ error: "OPENAI_API_KEY nao configurada" });

    const agora = new Date();
    const dataHoje = agora.toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const isoHoje = agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

    const systemPrompt = [
      "Voce e a Synapsys Copilot, assistente clinico para profissionais de saude.",
      `Hoje e ${dataHoje} (${isoHoje}). Use esta data como referencia para "hoje", "esta semana", "proxima segunda", etc.`,
      "Voce tem acesso direto aos dados da clinica do profissional logado via ferramentas.",
      "Use as ferramentas sempre que o profissional pedir informacoes sobre pacientes,",
      "consultas ou quiser agendar/remarcar. Para perguntas clinicas gerais (diagnosticos,",
      "protocolos, medicamentos) responda diretamente com base no seu conhecimento.",
      "Ao informar datas ISO nas ferramentas, use sempre o ano corrente baseado na data de hoje.",
      "Seja preciso, direto e lembre que as decisoes clinicas finais sao sempre do profissional.",
      patientContext
        ? `\nCONTEXTO DO PACIENTE ATIVO:\n${JSON.stringify(patientContext, null, 2)}`
        : "",
    ].filter(Boolean).join("\n");

    // ── 1ª chamada ao GPT-4o ─────────────────────────────────────────────────
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      tools: COPILOT_TOOLS,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    const toolCalls = choice.message.tool_calls || [];
    let finalContent = choice.message.content;
    const toolResults = [];

    // ── Executa ferramentas se houver ─────────────────────────────────────────
    if (toolCalls.length > 0) {
      const toolMessages = [
        { role: "system", content: systemPrompt },
        ...messages,
        choice.message,
      ];

      for (const tc of toolCalls) {
        const args = JSON.parse(tc.function.arguments || "{}");
        const result = await executeCopilotTool(tc.function.name, args, req.db, req.user.id, product);
        toolMessages.push({ role: "tool", tool_call_id: tc.id, content: String(result) });
        toolResults.push({ name: tc.function.name, args });
      }

      // ── 2ª chamada com resultados das ferramentas ─────────────────────────
      const followUp = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.3,
        messages: toolMessages,
      });
      finalContent = followUp.choices[0].message.content;
    }

    // ── Persiste na sessão se fornecida ───────────────────────────────────────
    if (req.db && req.user && sessionId) {
      const allMessages = [...messages, { role: "assistant", content: finalContent }];
      await req.db
        .from("ai_copilot_sessions")
        .update({ messages: allMessages, product, updated_at: new Date().toISOString() })
        .eq("id", sessionId)
        .eq("user_id", req.user.id);
    }

    return res.json({ ok: true, response: finalContent, toolCalls: toolResults, usage: response.usage });
  } catch (error) {
    console.error("[copilot]", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/copilot/sessions
app.get("/api/ai/copilot/sessions", requireUser, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const filterProduct = req.query.product || null;
    const { data, error } = await req.db
      .from("ai_copilot_sessions")
      .select("id, title, context, created_at, updated_at")
      .eq("user_id", req.user.id)
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ items: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/copilot/sessions
app.post("/api/ai/copilot/sessions", requireUser, async (req, res) => {
  try {
    const { title, context } = req.body;
    const { data, error } = await req.db
      .from("ai_copilot_sessions")
      .insert({ user_id: req.user.id, title: title || "Nova sessao", context: context || {}, messages: [] })
      .select("id, title, context, created_at")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ session: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// DELETE /api/ai/copilot/sessions/:id
app.delete("/api/ai/copilot/sessions/:id", requireUser, async (req, res) => {
  try {
    const { error } = await req.db
      .from("ai_copilot_sessions")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/skin-analysis — GPT-4o Vision + relatório estruturado
app.post("/api/ai/skin-analysis", requireUser, async (req, res) => {
  try {
    const { image, imageUrl, patientInfo } = req.body;
    if (!image && !imageUrl) return res.status(400).json({ error: "Imagem (base64 ou URL) obrigatoria" });
    if (!openai) return res.status(503).json({ error: "OPENAI_API_KEY nao configurada" });

    const imageContent = image
      ? { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}`, detail: "high" } }
      : { type: "image_url", image_url: { url: imageUrl, detail: "high" } };

    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Voce e um dermatologista especialista. Analise a imagem de pele e retorne JSON estruturado:
{
  "tipo_pele": "seca|oleosa|mista|normal|sensivel",
  "tom_pele": "muito claro|claro|medio|moreno|escuro",
  "fototipoFitzpatrick": 1-6,
  "condicoes_identificadas": [{"nome":"","severidade":"leve|moderada|grave","localizacao":"","descricao":""}],
  "areas_preocupacao": [],
  "hidratacao": "muito baixa|baixa|adequada|alta",
  "textura": "lisa|irregular|porosa|rugosa",
  "manchas": {"presentes": false, "tipos": [], "distribuicao": ""},
  "recomendacoes": {
    "imediatas": [],
    "rotina_diaria": [],
    "ingredientes_indicados": [],
    "ingredientes_evitar": [],
    "procedimentos_sugeridos": []
  },
  "score_saude_pele": 0-100,
  "encaminhamento_urgente": false,
  "motivo_encaminhamento": null,
  "observacoes_clinicas": "",
  "confianca_analise": "alta|media|baixa",
  "limitacoes": ""
}
${patientInfo ? `Paciente: ${JSON.stringify(patientInfo)}` : ""}`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analise esta imagem de pele e forneça o relatorio completo:" },
            imageContent,
          ],
        },
      ],
    });

    let analysis = null;
    try {
      analysis = JSON.parse(analysisResponse.choices[0].message.content);
    } catch (_) {
      analysis = { raw: analysisResponse.choices[0].message.content, error: "parse_failed" };
    }

    let savedId = null;
    if (req.db && req.user) {
      const { data } = await req.db
        .from("ai_skin_analyses")
        .insert({
          user_id: req.user.id,
          image_url: imageUrl || null,
          analysis,
          patient_info: patientInfo || null,
        })
        .select("id")
        .single();
      savedId = data?.id;
    }

    return res.json({ ok: true, id: savedId, analysis });
  } catch (error) {
    console.error("[skin-analysis]", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/skin-analyses
app.get("/api/ai/skin-analyses", requireUser, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { data, error } = await req.db
      .from("ai_skin_analyses")
      .select("id, analysis, patient_info, image_url, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ items: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// DELETE /api/ai/skin-analyses/:id
app.delete("/api/ai/skin-analyses/:id", requireUser, async (req, res) => {
  try {
    const { error } = await req.db
      .from("ai_skin_analyses")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});


// POST /api/ai/mind-analysis — GPT-4o análise psicológica estruturada
app.post("/api/ai/mind-analysis", requireUser, async (req, res) => {
  try {
    const { text, patientInfo } = req.body;
    if (!text || text.trim().length < 10) return res.status(400).json({ error: "Texto obrigatorio (min 10 chars)" });
    if (!openai) return res.status(503).json({ error: "OPENAI_API_KEY nao configurada" });

    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Voce e um psicologo clinico especialista. Analise o relato e retorne JSON:
{
  "estado_humor": "eutimico|deprimido|ansioso|irritado|euforico|apatico|labil|neutro",
  "nivel_sofrimento": 0-10,
  "nivel_funcionalidade": 0-10,
  "insight_paciente": 0-10,
  "risco_suicidio": "baixo|medio|alto|critico",
  "conduta_urgente": "string ou null",
  "hipoteses_diagnosticas": [
    {"diagnostico": "", "cid": "", "probabilidade": "alta|media|baixa", "justificativa": ""}
  ],
  "fatores_risco": [],
  "pontos_fortes": [],
  "padroes_cognitivos": [],
  "recomendacoes_terapeuticas": [],
  "abordagens_sugeridas": ["TCC","DBT","ACT","Psicanalise", etc],
  "indicacao_medicacao": "string ou null",
  "observacoes_clinicas": "",
  "limitacoes": "Esta analise e baseada em texto e nao substitui avaliacao clinica presencial.",
  "confianca_analise": "alta|media|baixa"
}
${patientInfo ? `Dados do paciente: ${JSON.stringify(patientInfo)}` : ""}`,
        },
        { role: "user", content: `Relato clinico:\n\n${text.trim()}` },
      ],
    });

    let analysis = null;
    try {
      analysis = JSON.parse(analysisResponse.choices[0].message.content);
    } catch (_) {
      analysis = { raw: analysisResponse.choices[0].message.content };
    }

    let savedId = null;
    if (req.db && req.user) {
      const { data } = await req.db
        .from("ai_mind_analyses")
        .insert({ user_id: req.user.id, input_text: text.trim(), analysis, patient_info: patientInfo || null })
        .select("id")
        .single();
      savedId = data?.id;
    }

    return res.json({ ok: true, id: savedId, analysis });
  } catch (error) {
    console.error("[mind-analysis]", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/mind-analyses
app.get("/api/ai/mind-analyses", requireUser, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { data, error } = await req.db
      .from("ai_mind_analyses")
      .select("id, input_text, analysis, patient_info, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ items: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// DELETE /api/ai/mind-analyses/:id
app.delete("/api/ai/mind-analyses/:id", requireUser, async (req, res) => {
  try {
    const { error } = await req.db
      .from("ai_mind_analyses")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});


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

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
  console.log(`   Provider principal : ${process.env.AI_PROVIDER || "openai"}`);
  console.log(
    `   OpenAI             : ${
      openai
        ? "✅ ativo (" + (process.env.OPENAI_MODEL || "gpt-4.1-mini") + ")"
        : "❌ inativo (OPENAI_API_KEY não definida)"
    }`
  );
  console.log(
    `   Groq               : ${
      groq
        ? "✅ ativo (" + (process.env.GROQ_MODEL || "llama-3.1-8b-instant") + ")"
        : "❌ inativo (GROQ_API_KEY não definida)"
    }`
  );
  console.log(
    `   Claude             : ${
      anthropic
        ? "✅ ativo (" + (process.env.CLAUDE_MODEL || "claude-sonnet-4-6") + ")"
        : "❌ inativo (ANTHROPIC_API_KEY não definida)"
    }\n`
  );
});
