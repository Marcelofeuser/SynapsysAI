const SUPABASE_URL = "https://lmxrmbkbsctmwxtukhgn.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxteHJtYmtic2N0bXd4dHVraGduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MjYzMDIsImV4cCI6MjA5MTUwMjMwMn0.r_8zwmO8xB-vYqMIHTQeK2a6ptsfR5fTDfmuRGJGdeM";
const SUPABASE_PROJECT_REF = "lmxrmbkbsctmwxtukhgn";
const SESSION_STORAGE_KEY = "synapsys.session.v1";
const LEGACY_SESSION_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
const VERSION_LABEL = "5.1.0";
const MAX_CHARS = 90;
const OVERLAP_DIST = 190;

const EXTRA_STYLES = `
.brain-meta{margin-top:8px;font-size:10px;color:rgba(110,190,225,0.52);line-height:1.45;}
.brain-meta strong{color:rgba(180,232,255,0.88);font-weight:500;}
.rs-item.active{background:rgba(20,80,140,0.24);border-color:rgba(80,200,255,0.24);color:rgba(190,238,255,0.96);}
.recent-empty{padding:8px 10px;border-radius:8px;background:rgba(8,35,65,0.38);border:0.5px solid rgba(80,200,255,0.12);font-size:10px;line-height:1.55;color:rgba(130,195,230,0.52);}
.workspace-shell{position:fixed;inset:0;display:none;z-index:40;pointer-events:none;}
.workspace-shell.open{display:block;}
.workspace-backdrop{position:absolute;inset:0;background:rgba(2,8,16,0.52);backdrop-filter:blur(12px);opacity:0;transition:opacity .18s ease;pointer-events:none;}
.workspace-shell.open .workspace-backdrop{opacity:1;pointer-events:auto;}
.workspace-panel{position:absolute;top:24px;right:236px;bottom:24px;width:min(680px,calc(100vw - 560px));min-width:320px;background:rgba(6,20,36,0.96);border:0.5px solid rgba(80,200,255,0.18);border-radius:22px;box-shadow:0 28px 90px rgba(0,0,0,0.46);display:flex;flex-direction:column;overflow:hidden;transform:translateY(10px) scale(.985);opacity:0;transition:transform .18s ease,opacity .18s ease;pointer-events:auto;}
.workspace-shell.open .workspace-panel{transform:translateY(0) scale(1);opacity:1;}
.workspace-header{padding:18px 20px 14px;border-bottom:0.5px solid rgba(80,200,255,0.1);display:flex;align-items:flex-start;gap:16px;justify-content:space-between;}
.workspace-eyebrow{font-size:10px;letter-spacing:.12em;color:rgba(80,180,220,0.36);text-transform:uppercase;margin-bottom:5px;}
.workspace-title{font-size:19px;font-weight:500;color:#d6f6ff;letter-spacing:.01em;}
.workspace-subtitle{font-size:12px;color:rgba(140,212,245,0.58);margin-top:4px;line-height:1.5;}
.workspace-toolbar{padding:14px 20px;border-bottom:0.5px solid rgba(80,200,255,0.08);display:flex;flex-wrap:wrap;align-items:center;gap:10px 12px;}
.workspace-body{padding:16px 20px 20px;overflow:auto;display:flex;flex-direction:column;gap:12px;}
.workspace-body::-webkit-scrollbar{width:5px;}
.workspace-body::-webkit-scrollbar-thumb{background:rgba(80,200,255,0.16);border-radius:999px;}
.close-btn,.ghost-btn,.primary-btn,.danger-btn,.chip-btn,.inline-btn{border-radius:999px;border:0.5px solid rgba(80,200,255,0.18);background:rgba(8,35,65,0.6);color:#bfeeff;padding:8px 14px;font-size:12px;font-family:inherit;cursor:pointer;transition:all .16s ease;}
.close-btn:hover,.ghost-btn:hover,.chip-btn:hover,.inline-btn:hover{background:rgba(20,80,140,0.34);border-color:rgba(80,200,255,0.32);}
.primary-btn{background:linear-gradient(135deg,rgba(80,140,220,0.34),rgba(30,200,160,0.2));border-color:rgba(80,200,255,0.34);}
.primary-btn:hover{background:linear-gradient(135deg,rgba(80,140,220,0.44),rgba(30,200,160,0.3));}
.danger-btn{border-color:rgba(240,110,110,0.28);color:#ffb5b5;background:rgba(120,25,25,0.22);}
.danger-btn:hover{background:rgba(160,30,30,0.32);}
.chip-btn.active{background:rgba(20,80,140,0.46);border-color:rgba(80,200,255,0.42);color:#f0fdff;}
.toolbar-select,.toolbar-input,.modal-field,.modal-textarea{background:rgba(8,35,65,0.82);border:0.5px solid rgba(80,200,255,0.2);border-radius:12px;color:#d2f4ff;font-size:12px;font-family:inherit;padding:10px 12px;outline:none;}
.toolbar-input{min-width:220px;flex:1;}
.toolbar-select{min-width:160px;}
.toolbar-group{display:flex;flex-wrap:wrap;align-items:center;gap:8px;}
.panel-card{padding:14px 14px 13px;border-radius:16px;background:rgba(8,28,50,0.74);border:0.5px solid rgba(80,200,255,0.12);display:flex;flex-direction:column;gap:10px;}
.panel-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;}
.panel-title{font-size:15px;font-weight:500;color:#e3fbff;line-height:1.45;}
.panel-copy{font-size:12px;color:rgba(155,220,248,0.66);line-height:1.6;}
.panel-meta{display:flex;flex-wrap:wrap;gap:7px 8px;align-items:center;font-size:11px;color:rgba(125,196,228,0.56);}
.panel-actions{display:flex;flex-wrap:wrap;gap:8px;}
.panel-tag{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;background:rgba(20,80,140,0.18);border:0.5px solid rgba(80,200,255,0.1);color:rgba(190,238,255,0.84);font-size:10px;}
.panel-tag.muted{color:rgba(130,180,205,0.46);}
.panel-swatch{width:10px;height:10px;border-radius:50%;display:inline-block;box-shadow:0 0 0 1px rgba(255,255,255,0.18) inset;}
.state-card{padding:16px;border-radius:16px;border:0.5px dashed rgba(80,200,255,0.18);background:rgba(8,24,42,0.68);color:rgba(165,225,248,0.7);line-height:1.65;font-size:12px;}
.state-title{font-size:14px;color:#dbfbff;margin-bottom:6px;}
.state-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}
.result-row{padding:14px 14px 13px;border-radius:16px;background:rgba(8,28,50,0.74);border:0.5px solid rgba(80,200,255,0.12);display:flex;flex-direction:column;gap:8px;cursor:pointer;transition:all .16s ease;}
.result-row:hover{border-color:rgba(80,200,255,0.28);background:rgba(10,34,60,0.88);}
.result-snippet{font-size:12px;line-height:1.65;color:rgba(205,244,255,0.84);}
.result-type{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(95,188,220,0.44);}
.modal-root{position:fixed;inset:0;z-index:50;display:none;}
.modal-root.open{display:block;}
.modal-shell{position:absolute;inset:0;display:grid;place-items:center;padding:24px;}
.modal-backdrop{position:absolute;inset:0;background:rgba(2,8,16,0.62);backdrop-filter:blur(12px);}
.modal-card{position:relative;width:min(520px,100%);background:rgba(6,20,36,0.98);border:0.5px solid rgba(80,200,255,0.18);border-radius:20px;padding:18px 18px 16px;box-shadow:0 28px 90px rgba(0,0,0,0.5);}
.modal-header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:14px;}
.modal-title{font-size:18px;font-weight:500;color:#e3fbff;}
.modal-copy{font-size:12px;color:rgba(150,214,242,0.62);line-height:1.6;margin-top:4px;}
.modal-form{display:flex;flex-direction:column;gap:12px;}
.modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.modal-label{display:flex;flex-direction:column;gap:7px;font-size:11px;color:rgba(150,214,242,0.58);}
.modal-textarea{min-height:110px;resize:vertical;}
.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:6px;}
.toast-root{position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:60;display:flex;flex-direction:column;gap:8px;pointer-events:none;}
.toast{padding:11px 14px;border-radius:999px;background:rgba(6,20,36,0.96);border:0.5px solid rgba(80,200,255,0.18);color:#d9fbff;font-size:12px;box-shadow:0 12px 34px rgba(0,0,0,0.32);}
.toast.warning{border-color:rgba(255,196,92,0.3);color:#ffe8b4;}
.toast.error{border-color:rgba(240,110,110,0.3);color:#ffd0d0;}
@media (max-width: 1100px){
  .workspace-panel{right:20px;width:min(680px,calc(100vw - 40px));}
}
@media (max-width: 720px){
  .workspace-panel{top:12px;right:12px;left:12px;bottom:12px;width:auto;min-width:0;}
  .modal-grid{grid-template-columns:1fr;}
}
`;

const ICONS = {
  folder: "📁",
  brain: "🧠",
  rocket: "🚀",
  briefcase: "💼",
  spark: "✨",
  target: "🎯",
  notes: "🗂️",
};

const RESPONSES = [
  "Seu perfil D/I combina velocidade de decisao com carisma. Em lideranca, isso gera times que se movem rapido. O desafio esta em abrir espaco para perfis S e C processarem antes de executar.",
  "Perfis C precisam de dados, nao entusiasmo. Compartilhe contexto com antecedencia, seja preciso nos numeros e ofereca tempo de analise. Isso construi credibilidade duradoura.",
  "A sinapse D para S funciona melhor quando existe respeito mutuo. D define a visao com urgencia, S sustenta com constancia. O atrito nasce quando a pressao chega antes da escuta.",
  "Desenvolvimento DISC nao e mudar quem voce e. E ampliar repertorio. Um D que aprende a pausar antes de decidir nao perde forca. Ele ganha precisao.",
  "Equipes com diversidade de perfis tendem a ser mais resilientes. Seu papel como D e criar clareza de direcao. Deixe o S sustentar o ritmo e o C garantir a qualidade.",
  "Em negociacao, perfis D/I tem vantagem natural na abertura. O risco esta em fechar antes de ouvir. A pergunta certa costuma valer mais que o argumento certo.",
];

const queryParams = new URLSearchParams(window.location.search);
const customApiBase = String(queryParams.get("api") || "").trim().replace(/\/+$/, "");
const runtimeHost = String(window.location.hostname || "").trim().toLowerCase();
const isLocalHost = runtimeHost === "localhost" || runtimeHost === "127.0.0.1";
const API_BASE = customApiBase || (isLocalHost ? "http://localhost:4010" : "https://synapsys-backend-production.up.railway.app");
const API_HEALTH_URL = `${API_BASE}/health`;
const API_ANALYZE_URL = `${API_BASE}/api/synapsys/general`;

const dom = {
  center: document.getElementById("center"),
  canvas: document.getElementById("neural-canvas"),
  layer: document.getElementById("nodes-layer"),
  lsFeed: document.getElementById("ls-feed"),
  lsInput: document.getElementById("ls-input"),
  lsSendBtn: document.getElementById("ls-send-btn"),
  recentList: document.getElementById("recent-list"),
  backendStatus: document.getElementById("backend-status"),
  loginMenu: document.getElementById("login-menu"),
  loginBtn: document.getElementById("login-btn"),
  loginAvatar: document.getElementById("login-avatar"),
  loginName: document.getElementById("login-name"),
  loginEmail: document.getElementById("login-email"),
  loginMenuName: document.getElementById("login-menu-name"),
  loginMenuEmail: document.getElementById("login-menu-email"),
  navConversations: document.getElementById("nav-conversations"),
  navProjects: document.getElementById("nav-projects"),
  navSearch: document.getElementById("nav-search"),
  ctx: document.getElementById("neural-canvas").getContext("2d"),
};

document.head.insertAdjacentHTML("beforeend", `<style>${EXTRA_STYLES}</style>`);
document.body.insertAdjacentHTML(
  "beforeend",
  `
    <div class="workspace-shell" id="workspace-shell" aria-hidden="true">
      <div class="workspace-backdrop" data-action="close-panel"></div>
      <aside class="workspace-panel">
        <div class="workspace-header">
          <div>
            <div class="workspace-eyebrow" id="workspace-eyebrow">Synapsys workspace</div>
            <div class="workspace-title" id="workspace-title">Conversas</div>
            <div class="workspace-subtitle" id="workspace-subtitle">Historico persistente dos ultimos 30 dias.</div>
          </div>
          <button class="close-btn" type="button" id="workspace-close">fechar</button>
        </div>
        <div class="workspace-toolbar" id="workspace-toolbar"></div>
        <div class="workspace-body" id="workspace-body"></div>
      </aside>
    </div>
    <div class="modal-root" id="modal-root"></div>
    <div class="toast-root" id="toast-root"></div>
  `
);

const overlays = {
  shell: document.getElementById("workspace-shell"),
  eyebrow: document.getElementById("workspace-eyebrow"),
  title: document.getElementById("workspace-title"),
  subtitle: document.getElementById("workspace-subtitle"),
  toolbar: document.getElementById("workspace-toolbar"),
  body: document.getElementById("workspace-body"),
  closeBtn: document.getElementById("workspace-close"),
  modalRoot: document.getElementById("modal-root"),
  toastRoot: document.getElementById("toast-root"),
};

const graph = {
  W: 0,
  H: 0,
  frame: 0,
  rIdx: 0,
  frontierAngle: Math.random() * Math.PI * 2,
  allNodes: [],
  connections: [],
  particles: [],
  ambients: [],
};

const state = {
  session: null,
  user: null,
  sending: false,
  activePanel: null,
  setupRequired: false,
  currentConversationId: null,
  currentConversation: null,
  currentDraftTitle: "",
  currentProjectId: null,
  activeInputNode: null,
  conversationView: {
    filter: "30d",
    projectId: "",
    items: [],
    loading: false,
    error: "",
  },
  projectsView: {
    items: [],
    loading: false,
    error: "",
  },
  recentView: {
    items: [],
    loading: false,
    error: "",
  },
  searchView: {
    term: "",
    filter: "30d",
    projectId: "",
    items: [],
    searched: false,
    loading: false,
    error: "",
  },
};

function initAmbients() {
  graph.ambients.length = 0;
  for (let index = 0; index < 20; index += 1) {
    graph.ambients.push({
      x: Math.random() * graph.W,
      y: Math.random() * graph.H,
      r: Math.random() * 2 + 0.8,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      phase: Math.random() * Math.PI * 2,
      col: Math.random() > 0.5 ? "26,111,187" : "13,158,120",
    });
  }
}

function resizeCanvas() {
  graph.W = dom.center.clientWidth;
  graph.H = dom.center.clientHeight;
  dom.canvas.width = graph.W;
  dom.canvas.height = graph.H;
}

function getBrainMetaElement() {
  let meta = document.getElementById("brain-meta");
  if (!meta) {
    meta = document.createElement("div");
    meta.id = "brain-meta";
    meta.className = "brain-meta";
    const header = document.querySelector(".ls-header");
    header.appendChild(meta);
  }
  return meta;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function insertTextAtCursor(field, text) {
  const safeText = String(text ?? "");
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? field.value.length;
  const nextValue = field.value.slice(0, start) + safeText + field.value.slice(end);
  const caret = start + safeText.length;

  field.value = nextValue;
  field.focus();
  if (typeof field.setSelectionRange === "function") {
    field.setSelectionRange(caret, caret);
  }
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

async function applyPasteFallback(field, snapshot) {
  if (typeof navigator?.clipboard?.readText !== "function") {
    return;
  }

  try {
    const clipboardText = await navigator.clipboard.readText();
    if (!clipboardText) {
      return;
    }

    window.setTimeout(() => {
      const currentStart = field.selectionStart ?? field.value.length;
      const currentEnd = field.selectionEnd ?? field.value.length;
      const selectionChanged = currentStart !== snapshot.start || currentEnd !== snapshot.end;

      if (field.value !== snapshot.value || selectionChanged) {
        return;
      }

      insertTextAtCursor(field, clipboardText);
    }, 0);
  } catch (_) {
    // Fallback silencioso para navegadores sem acesso programatico ao clipboard.
  }
}

function enablePasteSupport(field) {
  if (!field || field.dataset.pasteBound === "1") {
    return;
  }

  field.dataset.pasteBound = "1";

  field.addEventListener("paste", (event) => {
    const clipboardText = event.clipboardData?.getData("text/plain");
    if (typeof clipboardText !== "string" || clipboardText.length === 0) {
      return;
    }

    event.preventDefault();
    insertTextAtCursor(field, clipboardText);
  });

  field.addEventListener("keydown", (event) => {
    const isPasteShortcut = (event.metaKey || event.ctrlKey) && !event.altKey && String(event.key || "").toLowerCase() === "v";
    if (!isPasteShortcut) {
      return;
    }

    const snapshot = {
      value: field.value,
      start: field.selectionStart ?? field.value.length,
      end: field.selectionEnd ?? field.value.length,
    };

    void applyPasteFallback(field, snapshot);
  });
}

function buildInitials(name, email) {
  const base = String(name || email || "AI")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() || "")
    .join("");

  return base || "AI";
}

function shorten(text, max = 72) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) {
    return cleaned;
  }
  return `${cleaned.slice(0, max - 3).trimEnd()}...`;
}

function buildDraftTitle(question) {
  const cleaned = String(question || "").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "Novo cerebro";
  }
  return shorten(cleaned, 72);
}

function formatRelativeDate(value) {
  if (!value) {
    return "agora";
  }

  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return "hoje";
  }

  if (diffDays === 1) {
    return "ontem";
  }

  if (diffDays < 7) {
    return `${diffDays} dias`;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function projectById(projectId) {
  return state.projectsView.items.find((project) => project.id === projectId) || null;
}

function currentUser() {
  return state.user || state.session?.user || null;
}

function showToast(message, kind = "info") {
  if (!message) {
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast ${kind}`.trim();
  toast.textContent = message;
  overlays.toastRoot.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 2600);
}

function openModal(element) {
  overlays.modalRoot.innerHTML = "";
  overlays.modalRoot.appendChild(element);
  overlays.modalRoot.classList.add("open");
}

function closeModal() {
  overlays.modalRoot.classList.remove("open");
  overlays.modalRoot.innerHTML = "";
}

function buildModalShell(innerHtml) {
  const shell = document.createElement("div");
  shell.className = "modal-shell";
  shell.innerHTML = `<div class="modal-backdrop" data-close-modal="true"></div>${innerHtml}`;
  shell.addEventListener("click", (event) => {
    if (event.target.dataset.closeModal === "true") {
      closeModal();
    }
  });
  return shell;
}

function openConfirmModal({ title, copy, confirmLabel, confirmKind = "primary", onConfirm }) {
  const shell = buildModalShell(`
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <div class="modal-title">${escapeHtml(title)}</div>
          <div class="modal-copy">${escapeHtml(copy || "")}</div>
        </div>
        <button class="close-btn" type="button" data-close-modal="true">fechar</button>
      </div>
      <div class="modal-actions">
        <button class="ghost-btn" type="button" data-close-modal="true">cancelar</button>
        <button class="${confirmKind === "danger" ? "danger-btn" : "primary-btn"}" type="button" id="modal-confirm">${escapeHtml(confirmLabel || "confirmar")}</button>
      </div>
    </div>
  `);

  const button = shell.querySelector("#modal-confirm");
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await onConfirm();
      closeModal();
    } finally {
      button.disabled = false;
    }
  });

  openModal(shell);
}

function openFormModal({ title, copy, submitLabel, values = {}, fields, onSubmit }) {
  const content = fields
    .map((field) => {
      const value = values[field.name] ?? field.value ?? "";
      if (field.type === "textarea") {
        return `
          <label class="modal-label">
            <span>${escapeHtml(field.label)}</span>
            <textarea class="modal-textarea" name="${escapeHtml(field.name)}" placeholder="${escapeHtml(field.placeholder || "")}">${escapeHtml(value)}</textarea>
          </label>
        `;
      }

      if (field.type === "select") {
        const options = (field.options || [])
          .map((option) => {
            const selected = String(option.value) === String(value) ? "selected" : "";
            return `<option value="${escapeHtml(option.value)}" ${selected}>${escapeHtml(option.label)}</option>`;
          })
          .join("");
        return `
          <label class="modal-label">
            <span>${escapeHtml(field.label)}</span>
            <select class="modal-field" name="${escapeHtml(field.name)}">${options}</select>
          </label>
        `;
      }

      const type = field.type || "text";
      return `
        <label class="modal-label">
          <span>${escapeHtml(field.label)}</span>
          <input class="modal-field" name="${escapeHtml(field.name)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || "")}" />
        </label>
      `;
    })
    .join("");

  const gridClass = fields.length > 1 ? "modal-grid" : "";

  const shell = buildModalShell(`
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <div class="modal-title">${escapeHtml(title)}</div>
          <div class="modal-copy">${escapeHtml(copy || "")}</div>
        </div>
        <button class="close-btn" type="button" data-close-modal="true">fechar</button>
      </div>
      <form class="modal-form" id="modal-form">
        <div class="${gridClass}">${content}</div>
        <div class="modal-actions">
          <button class="ghost-btn" type="button" data-close-modal="true">cancelar</button>
          <button class="primary-btn" type="submit">${escapeHtml(submitLabel || "salvar")}</button>
        </div>
      </form>
    </div>
  `);

  const form = shell.querySelector("#modal-form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    const formData = new FormData(form);
    const payload = {};
    fields.forEach((field) => {
      payload[field.name] = formData.get(field.name);
    });

    try {
      await onSubmit(payload);
      closeModal();
    } finally {
      submitButton.disabled = false;
    }
  });

  openModal(shell);
}

function setBackendStatus(kind, message = "") {
  if (kind === "online") {
    dom.backendStatus.textContent = message || "backend Synapsys online";
    dom.backendStatus.style.color = "rgba(48,240,192,0.56)";
    return;
  }

  if (kind === "error") {
    dom.backendStatus.textContent = message || "backend Synapsys offline";
    dom.backendStatus.style.color = "rgba(240,110,110,0.68)";
    return;
  }

  dom.backendStatus.textContent = message || "conectando backend Synapsys...";
  dom.backendStatus.style.color = "rgba(120,180,210,0.34)";
}

function normalizeSessionShape(payload) {
  if (!payload) {
    return null;
  }

  const candidate =
    payload.currentSession ||
    payload.session ||
    (Array.isArray(payload) ? payload[0] : null) ||
    payload;

  const accessToken = candidate.accessToken || candidate.access_token || candidate.token;
  const refreshToken = candidate.refreshToken || candidate.refresh_token || null;
  const expiresAt = candidate.expiresAt || candidate.expires_at || null;
  const user = candidate.user || payload.user || payload.currentUser || null;

  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    expiresAt,
    user: user
      ? {
          id: user.id,
          email: user.email,
          name: user.name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuario Synapsys",
        }
      : null,
  };
}

function readStoredSession() {
  const direct = localStorage.getItem(SESSION_STORAGE_KEY);
  if (direct) {
    try {
      const normalized = normalizeSessionShape(JSON.parse(direct));
      if (normalized) {
        return normalized;
      }
    } catch {}
  }

  const legacy = localStorage.getItem(LEGACY_SESSION_KEY);
  if (legacy) {
    try {
      const normalized = normalizeSessionShape(JSON.parse(legacy));
      if (normalized) {
        return normalized;
      }
    } catch {}
  }

  return null;
}

function persistSession(session) {
  if (!session) {
    return;
  }

  const normalized = normalizeSessionShape(session);
  if (!normalized) {
    return;
  }

  state.session = normalized;
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalized));
}

function clearSession() {
  state.session = null;
  state.user = null;
  state.setupRequired = false;
  state.projectsView.items = [];
  state.projectsView.error = "";
  state.conversationView.items = [];
  state.conversationView.error = "";
  state.recentView.items = [];
  state.recentView.error = "";
  state.searchView.items = [];
  state.searchView.error = "";
  state.searchView.searched = false;
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(LEGACY_SESSION_KEY);
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(`sb-${SUPABASE_PROJECT_REF}`)) {
      localStorage.removeItem(key);
    }
  });
  updateAuthUI();
  renderRecentConversations();
}

function isSessionExpired(session) {
  if (!session?.expiresAt) {
    return false;
  }

  const expiresAtMs =
    typeof session.expiresAt === "number"
      ? session.expiresAt * 1000
      : new Date(session.expiresAt).getTime();

  return Number.isFinite(expiresAtMs) ? expiresAtMs - Date.now() < 60 * 1000 : false;
}

async function refreshSession(session) {
  if (!session?.refreshToken) {
    return null;
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.msg || "Nao foi possivel renovar a sessao.");
  }

  const refreshed = normalizeSessionShape(payload);
  persistSession(refreshed);
  return refreshed;
}

async function ensureSession({ forceRefresh = false } = {}) {
  let session = state.session || readStoredSession();
  if (!session) {
    return null;
  }

  state.session = session;

  if (forceRefresh || isSessionExpired(session)) {
    try {
      session = await refreshSession(session);
    } catch (error) {
      clearSession();
      showToast("Sua sessao expirou. Entre novamente para salvar seus cerebros.", "warning");
      return null;
    }
  }

  return session;
}

async function apiRequest(path, { method = "GET", body, auth = "required", retry = true } = {}) {
  let session = null;
  const headers = { Accept: "application/json" };

  if (auth !== false) {
    session = await ensureSession();
    if (auth === "required" && !session) {
      const error = new Error("Entre na sua conta para usar esse recurso.");
      error.status = 401;
      throw error;
    }

    if (session?.accessToken) {
      headers.Authorization = `Bearer ${session.accessToken}`;
    }
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (response.status === 401 && retry && session?.refreshToken) {
    const refreshed = await ensureSession({ forceRefresh: true });
    if (refreshed?.accessToken) {
      return apiRequest(path, { method, body, auth, retry: false });
    }
  }

  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    error.setupRequired = !!payload?.setupRequired;
    throw error;
  }

  return payload;
}

async function syncBackendStatus({ silent = false } = {}) {
  if (!silent) {
    setBackendStatus("connecting", `checando backend em ${API_BASE.replace(/^https?:\/\//, "")}`);
  }

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 7000);
    let response;
    try {
      response = await fetch(API_HEALTH_URL, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeout);
    }

    const payload = await response.json().catch(() => null);
    if (response.ok && String(payload?.status || "").toLowerCase() === "ok") {
      setBackendStatus("online", `backend online • ${API_BASE.replace(/^https?:\/\//, "")}`);
      return true;
    }
  } catch {}

  setBackendStatus("error", "backend offline • fallback local ativo");
  return false;
}

function updateAuthUI() {
  const user = currentUser();

  if (!user) {
    dom.loginAvatar.textContent = "AI";
    dom.loginName.textContent = "Acessar conta";
    dom.loginEmail.textContent = "entre para salvar seus cerebros";
    dom.loginMenuName.textContent = "Acessar conta";
    dom.loginMenuEmail.textContent = "entre para ativar persistencia";
    return;
  }

  const initials = buildInitials(user.name, user.email);
  dom.loginAvatar.textContent = initials;
  dom.loginName.textContent = user.name || user.email;
  dom.loginEmail.textContent = user.email || "conta conectada";
  dom.loginMenuName.textContent = user.name || user.email;
  dom.loginMenuEmail.textContent = user.email || "conta conectada";
}

function renderConversationMeta() {
  const meta = getBrainMetaElement();
  const project = state.currentProjectId ? projectById(state.currentProjectId) : null;

  if (state.currentConversation) {
    meta.innerHTML = `<strong>${escapeHtml(state.currentConversation.title)}</strong>${
      project ? ` • ${escapeHtml(project.name)}` : " • sem projeto"
    }`;
    return;
  }

  if (state.currentDraftTitle) {
    meta.innerHTML = `<strong>${escapeHtml(state.currentDraftTitle)}</strong>${
      project ? ` • ${escapeHtml(project.name)}` : " • rascunho atual"
    }`;
    return;
  }

  meta.innerHTML = "novo cerebro pronto para crescer";
}

function renderRecentConversations() {
  if (!currentUser()) {
    dom.recentList.innerHTML = `<div class="recent-empty">Entre na sua conta para ativar o historico persistente e os cerebros recentes.</div>`;
    return;
  }

  if (state.setupRequired) {
    dom.recentList.innerHTML = `<div class="recent-empty">A migracao da Synapsys ainda nao foi aplicada. Rode o SQL da FASE 1 para ver os cerebros recentes.</div>`;
    return;
  }

  if (state.recentView.loading) {
    dom.recentList.innerHTML = `<div class="recent-empty">carregando cerebros recentes...</div>`;
    return;
  }

  if (state.recentView.error) {
    dom.recentList.innerHTML = `<div class="recent-empty">${escapeHtml(state.recentView.error)}</div>`;
    return;
  }

  if (!state.recentView.items.length) {
    dom.recentList.innerHTML = `<div class="recent-empty">Nenhum cerebro recente ainda.</div>`;
    return;
  }

  dom.recentList.innerHTML = state.recentView.items
    .slice(0, 10)
    .map((conversation) => {
      const project = conversation.project ? ` • ${escapeHtml(conversation.project.name)}` : "";
      return `
        <div class="recent-item" data-conversation-id="${escapeHtml(conversation.id)}">
          <div class="ri-name">${escapeHtml(shorten(conversation.title, 34))}</div>
          <div class="ri-date">${escapeHtml(formatRelativeDate(conversation.lastOpenedAt || conversation.updatedAt))}${project}</div>
        </div>
      `;
    })
    .join("");
}

function activeNavElement() {
  return {
    conversations: dom.navConversations,
    projects: dom.navProjects,
    search: dom.navSearch,
  }[state.activePanel];
}

function updateNavState() {
  [dom.navConversations, dom.navProjects, dom.navSearch].forEach((element) => {
    element.classList.remove("active");
  });
  activeNavElement()?.classList.add("active");
}

function renderAuthRequiredState(featureCopy) {
  return `
    <div class="state-card">
      <div class="state-title">Entre para ativar a Synapsys persistente</div>
      <div>${escapeHtml(featureCopy)}</div>
      <div class="state-actions">
        <button class="primary-btn" type="button" data-action="go-login">entrar agora</button>
      </div>
    </div>
  `;
}

function renderSetupRequiredState() {
  return `
    <div class="state-card">
      <div class="state-title">Migracao pendente no banco</div>
      <div>As novas tabelas da Synapsys ainda nao existem no Supabase. Execute o arquivo <code>backend/sql/20260420_synapsys_phase1.sql</code> e recarregue a pagina.</div>
      <div class="state-actions">
        <button class="ghost-btn" type="button" data-action="close-panel">fechar</button>
      </div>
    </div>
  `;
}

function renderConversationCard(conversation) {
  const projectTag = conversation.project
    ? `<span class="panel-tag"><span class="panel-swatch" style="background:${escapeHtml(conversation.project.color || "#50c8ff")}"></span>${escapeHtml(conversation.project.name)}</span>`
    : `<span class="panel-tag muted">sem projeto</span>`;
  const archivedTag = conversation.archivedAt ? `<span class="panel-tag muted">arquivada</span>` : "";

  return `
    <article class="panel-card">
      <div class="panel-head">
        <div>
          <div class="panel-title">${escapeHtml(conversation.title)}</div>
          <div class="panel-meta">
            ${projectTag}
            ${archivedTag}
            <span>${escapeHtml(formatDateTime(conversation.updatedAt))}</span>
            <span>${escapeHtml(String(conversation.messageCount || 0))} mensagens</span>
          </div>
        </div>
        <div class="panel-actions">
          <button class="inline-btn" type="button" data-action="open-conversation" data-id="${escapeHtml(conversation.id)}">abrir</button>
          <button class="inline-btn" type="button" data-action="rename-conversation" data-id="${escapeHtml(conversation.id)}">renomear</button>
          <button class="inline-btn" type="button" data-action="move-conversation" data-id="${escapeHtml(conversation.id)}">mover</button>
          <button class="inline-btn" type="button" data-action="${conversation.archivedAt ? "restore-conversation" : "archive-conversation"}" data-id="${escapeHtml(conversation.id)}">${conversation.archivedAt ? "restaurar" : "arquivar"}</button>
          <button class="danger-btn" type="button" data-action="delete-conversation" data-id="${escapeHtml(conversation.id)}">excluir</button>
        </div>
      </div>
    </article>
  `;
}

function renderProjectCard(project) {
  const icon = ICONS[project.icon] || "📁";
  const archivedTag = project.archivedAt ? `<span class="panel-tag muted">arquivado</span>` : "";
  return `
    <article class="panel-card">
      <div class="panel-head">
        <div>
          <div class="panel-title">${icon} ${escapeHtml(project.name)}</div>
          <div class="panel-copy">${escapeHtml(project.description || "Sem descricao ainda.")}</div>
          <div class="panel-meta">
            <span class="panel-tag"><span class="panel-swatch" style="background:${escapeHtml(project.color || "#50c8ff")}"></span>${escapeHtml(project.activeConversationCount || 0)} ativos</span>
            <span>${escapeHtml(project.conversationCount || 0)} cerebros</span>
            ${archivedTag}
          </div>
        </div>
        <div class="panel-actions">
          <button class="inline-btn" type="button" data-action="open-project-conversations" data-id="${escapeHtml(project.id)}">ver cerebros</button>
          <button class="inline-btn" type="button" data-action="edit-project" data-id="${escapeHtml(project.id)}">editar</button>
          <button class="inline-btn" type="button" data-action="${project.archivedAt ? "restore-project" : "archive-project"}" data-id="${escapeHtml(project.id)}">${project.archivedAt ? "restaurar" : "arquivar"}</button>
          <button class="danger-btn" type="button" data-action="delete-project" data-id="${escapeHtml(project.id)}">excluir</button>
        </div>
      </div>
    </article>
  `;
}

function renderSearchResult(result) {
  const projectTag = result.project
    ? `<span class="panel-tag"><span class="panel-swatch" style="background:${escapeHtml(result.project.color || "#50c8ff")}"></span>${escapeHtml(result.project.name)}</span>`
    : `<span class="panel-tag muted">sem projeto</span>`;

  return `
    <div class="result-row" data-action="open-conversation" data-id="${escapeHtml(result.conversationId)}">
      <div class="result-type">${escapeHtml(result.type)}</div>
      <div class="panel-title">${escapeHtml(result.title)}</div>
      <div class="result-snippet">${escapeHtml(result.snippet)}</div>
      <div class="panel-meta">
        ${projectTag}
        <span>${escapeHtml(formatDateTime(result.date))}</span>
      </div>
    </div>
  `;
}

function projectOptions(selectedValue = "") {
  const activeProjects = state.projectsView.items.filter((project) => !project.archivedAt);
  return [
    `<option value="">todos os projetos</option>`,
    ...activeProjects.map(
      (project) =>
        `<option value="${escapeHtml(project.id)}" ${
          project.id === selectedValue ? "selected" : ""
        }>${escapeHtml(project.name)}</option>`
    ),
  ].join("");
}

function renderConversationsPanel() {
  overlays.eyebrow.textContent = "Historico persistente";
  overlays.title.textContent = "Conversas";
  overlays.subtitle.textContent = "Abra, renomeie, mova entre projetos, arquive e exclua cerebros reais.";

  if (!currentUser()) {
    overlays.toolbar.innerHTML = "";
    overlays.body.innerHTML = renderAuthRequiredState(
      "O historico dos ultimos 30 dias precisa de uma conta autenticada."
    );
    return;
  }

  if (state.setupRequired) {
    overlays.toolbar.innerHTML = "";
    overlays.body.innerHTML = renderSetupRequiredState();
    return;
  }

  const filters = [
    ["today", "Hoje"],
    ["7d", "7 dias"],
    ["30d", "30 dias"],
    ["archived", "Arquivadas"],
    ["all", "Todas"],
  ];

  overlays.toolbar.innerHTML = `
    <div class="toolbar-group">
      ${filters
        .map(
          ([value, label]) =>
            `<button class="chip-btn ${state.conversationView.filter === value ? "active" : ""}" type="button" data-action="set-conversation-filter" data-filter="${value}">${label}</button>`
        )
        .join("")}
    </div>
    <div class="toolbar-group">
      <select class="toolbar-select" data-action="set-conversation-project-filter">${projectOptions(
        state.conversationView.projectId
      )}</select>
      <button class="ghost-btn" type="button" data-action="refresh-conversations">atualizar</button>
    </div>
  `;

  if (state.conversationView.loading) {
    overlays.body.innerHTML = `<div class="state-card">carregando conversas...</div>`;
    return;
  }

  if (state.conversationView.error) {
    overlays.body.innerHTML = `
      <div class="state-card">
        <div class="state-title">Nao foi possivel listar as conversas</div>
        <div>${escapeHtml(state.conversationView.error)}</div>
        <div class="state-actions">
          <button class="ghost-btn" type="button" data-action="refresh-conversations">tentar novamente</button>
        </div>
      </div>
    `;
    return;
  }

  if (!state.conversationView.items.length) {
    overlays.body.innerHTML = `
      <div class="state-card">
        <div class="state-title">Nenhuma conversa neste recorte</div>
        <div>Assim que voce interagir com a Synapsys, seus cerebros aparecem aqui com projeto, data e contagem de mensagens.</div>
      </div>
    `;
    return;
  }

  overlays.body.innerHTML = state.conversationView.items.map(renderConversationCard).join("");
}

function renderProjectsPanel() {
  overlays.eyebrow.textContent = "Organizacao por contexto";
  overlays.title.textContent = "Projetos";
  overlays.subtitle.textContent = "Agrupe seus cerebros em pastas reais com nome, descricao, cor e icone.";

  if (!currentUser()) {
    overlays.toolbar.innerHTML = "";
    overlays.body.innerHTML = renderAuthRequiredState(
      "Projetos sao vinculados ao usuario autenticado para manter a organizacao persistente."
    );
    return;
  }

  if (state.setupRequired) {
    overlays.toolbar.innerHTML = "";
    overlays.body.innerHTML = renderSetupRequiredState();
    return;
  }

  overlays.toolbar.innerHTML = `
    <div class="toolbar-group">
      <button class="primary-btn" type="button" data-action="create-project">novo projeto</button>
      <button class="ghost-btn" type="button" data-action="refresh-projects">atualizar</button>
    </div>
  `;

  if (state.projectsView.loading) {
    overlays.body.innerHTML = `<div class="state-card">carregando projetos...</div>`;
    return;
  }

  if (state.projectsView.error) {
    overlays.body.innerHTML = `
      <div class="state-card">
        <div class="state-title">Nao foi possivel listar os projetos</div>
        <div>${escapeHtml(state.projectsView.error)}</div>
        <div class="state-actions">
          <button class="ghost-btn" type="button" data-action="refresh-projects">tentar novamente</button>
        </div>
      </div>
    `;
    return;
  }

  if (!state.projectsView.items.length) {
    overlays.body.innerHTML = `
      <div class="state-card">
        <div class="state-title">Nenhum projeto ainda</div>
        <div>Crie um projeto para agrupar cerebros por cliente, squad, estudo ou tema de pesquisa.</div>
        <div class="state-actions">
          <button class="primary-btn" type="button" data-action="create-project">criar projeto</button>
        </div>
      </div>
    `;
    return;
  }

  overlays.body.innerHTML = state.projectsView.items.map(renderProjectCard).join("");
}

function renderSearchPanel() {
  overlays.eyebrow.textContent = "Busca global interna";
  overlays.title.textContent = "Procurar";
  overlays.subtitle.textContent = "Busque por titulo da conversa, mensagens e nome do projeto.";

  if (!currentUser()) {
    overlays.toolbar.innerHTML = "";
    overlays.body.innerHTML = renderAuthRequiredState(
      "A busca global interna precisa de um historico vinculado ao seu usuario."
    );
    return;
  }

  if (state.setupRequired) {
    overlays.toolbar.innerHTML = "";
    overlays.body.innerHTML = renderSetupRequiredState();
    return;
  }

  const filters = [
    ["today", "Hoje"],
    ["7d", "7 dias"],
    ["30d", "30 dias"],
    ["all", "Todas"],
  ];

  overlays.toolbar.innerHTML = "";
  overlays.body.innerHTML = `
    <form class="panel-card" data-action="run-search-form">
      <div class="panel-head">
        <div style="flex:1">
          <div class="panel-title">Busca interna da Synapsys</div>
          <div class="panel-copy">Digite uma palavra ou frase para buscar em titulos, mensagens e projetos.</div>
        </div>
      </div>
      <div class="toolbar-group">
        <input class="toolbar-input" name="term" value="${escapeHtml(state.searchView.term)}" placeholder="Ex.: lideranca comercial, perfil C, onboarding..." />
        <select class="toolbar-select" name="projectId">${projectOptions(state.searchView.projectId)}</select>
        <button class="primary-btn" type="submit">${state.searchView.loading ? "buscando..." : "buscar"}</button>
      </div>
      <div class="toolbar-group">
        ${filters
          .map(
            ([value, label]) =>
              `<button class="chip-btn ${state.searchView.filter === value ? "active" : ""}" type="button" data-action="set-search-filter" data-filter="${value}">${label}</button>`
          )
          .join("")}
      </div>
    </form>
    ${
      state.searchView.loading
        ? `<div class="state-card">buscando nos cerebros, mensagens e projetos...</div>`
        : state.searchView.error
        ? `<div class="state-card"><div class="state-title">Nao foi possivel concluir a busca</div><div>${escapeHtml(
            state.searchView.error
          )}</div></div>`
        : !state.searchView.searched
        ? `<div class="state-card">A busca fica mais poderosa conforme o seu historico cresce. Abra uma conversa salva diretamente a partir dos resultados.</div>`
        : !state.searchView.items.length
        ? `<div class="state-card">Nenhum resultado encontrado para <strong>${escapeHtml(
            state.searchView.term
          )}</strong> neste recorte.</div>`
        : state.searchView.items.map(renderSearchResult).join("")
    }
  `;
}

function renderPanel() {
  updateNavState();

  if (!state.activePanel) {
    overlays.shell.classList.remove("open");
    overlays.shell.setAttribute("aria-hidden", "true");
    return;
  }

  overlays.shell.classList.add("open");
  overlays.shell.setAttribute("aria-hidden", "false");

  if (state.activePanel === "conversations") {
    renderConversationsPanel();
    return;
  }

  if (state.activePanel === "projects") {
    renderProjectsPanel();
    return;
  }

  renderSearchPanel();
}

function openPanel(panelName) {
  state.activePanel = panelName;
  renderPanel();

  if (panelName === "conversations") {
    void loadConversationList();
  } else if (panelName === "projects") {
    void loadProjects();
  } else if (panelName === "search" && !state.projectsView.items.length) {
    void loadProjects();
  }
}

function closePanel() {
  state.activePanel = null;
  renderPanel();
}

function toggleMenu() {
  if (!currentUser()) {
    window.location.href = "/chat/signup?plan=free";
    return;
  }

  dom.loginMenu.classList.toggle("open");
}

function closeMenu() {
  dom.loginMenu.classList.remove("open");
}

window.toggleMenu = toggleMenu;

function fallbackResponse() {
  const response = RESPONSES[graph.rIdx % RESPONSES.length];
  graph.rIdx += 1;
  return response;
}

function truncate(text, max) {
  const plain = String(text || "").replace(/<[^>]+>/g, "");
  if (plain.length <= max) {
    return { short: plain, full: plain, cut: false };
  }

  return {
    short: plain.slice(0, max).trimEnd(),
    full: plain,
    cut: true,
  };
}

function directedPos(fromX, fromY) {
  const spread = Math.PI / 2.2;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const angle = graph.frontierAngle + (Math.random() - 0.5) * spread * (1 + attempt * 0.03);
    const dist = 165 + Math.random() * 100;
    const x = fromX + Math.cos(angle) * dist;
    const y = fromY + Math.sin(angle) * dist;
    const margin = 90;

    if (x < margin || x > graph.W - margin || y < margin || y > graph.H - margin) {
      continue;
    }

    let free = true;
    for (const node of graph.allNodes) {
      const dx = node.x - x;
      const dy = node.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < 180) {
        free = false;
        break;
      }
    }

    if (free) {
      graph.frontierAngle = Math.atan2(y - fromY, x - fromX) + (Math.random() - 0.5) * 0.2;
      return { x, y };
    }
  }

  graph.frontierAngle += Math.PI * 0.45;
  const margin = 95;
  return {
    x: margin + Math.random() * (graph.W - margin * 2),
    y: margin + Math.random() * (graph.H - margin * 2.5),
  };
}

function textSide(y, size) {
  return y + size + 100 > graph.H ? "above" : "below";
}

function fadeNode(node) {
  if (node.fading || !node.el) {
    return;
  }
  node.fading = true;
  node.el.style.transition = "opacity 0.08s";
  node.el.style.opacity = "0.4";
  window.setTimeout(() => {
    if (!node.el) {
      return;
    }
    node.el.style.transition = "opacity 3.5s";
    node.el.style.opacity = "0";
    window.setTimeout(() => {
      node.el?.remove();
    }, 3600);
  }, 100);
}

function checkOverlaps() {
  for (let index = 0; index < graph.allNodes.length - 1; index += 1) {
    const current = graph.allNodes[index];
    if (current.fading) {
      continue;
    }
    for (let peerIndex = index + 1; peerIndex < graph.allNodes.length; peerIndex += 1) {
      const peer = graph.allNodes[peerIndex];
      const dx = current.x - peer.x;
      const dy = current.y - peer.y;
      if (Math.sqrt(dx * dx + dy * dy) < OVERLAP_DIST) {
        fadeNode(current);
        break;
      }
    }
  }
}

function flash(x, y, color) {
  const flashEl = document.createElement("div");
  flashEl.className = "synapse-flash";
  flashEl.style.cssText = `left:${x}px;top:${y}px;width:48px;height:48px;background:radial-gradient(circle,${color} 0%,transparent 70%);`;
  dom.center.appendChild(flashEl);
  window.setTimeout(() => flashEl.remove(), 600);
}

function rings(x, y) {
  const ringNodes = [];
  for (let index = 0; index < 3; index += 1) {
    const ring = document.createElement("div");
    ring.className = "thinking-ring";
    ring.style.cssText = `left:${x}px;top:${y}px;width:40px;height:40px;animation-delay:${index * 0.28}s;`;
    dom.center.appendChild(ring);
    ringNodes.push(ring);
  }
  return ringNodes;
}

function shoot(x1, y1, x2, y2, color, onDone) {
  const count = 12;
  for (let index = 0; index < count; index += 1) {
    const delay = index * (800 / count);
    const jitterX = (Math.random() - 0.5) * 45;
    const jitterY = (Math.random() - 0.5) * 45;
    graph.particles.push({
      x: x1,
      y: y1,
      tx: x2,
      ty: y2,
      mx: (x1 + x2) / 2 + jitterX,
      my: (y1 + y2) / 2 + jitterY,
      col: color,
      t: 0,
      delay,
      size: Math.random() * 3 + 1.5,
      done: false,
    });
  }

  window.setTimeout(onDone, 900);
}

function addFeed(type, text) {
  const item = document.createElement("div");
  item.className = `feed-item ${type}`;
  const plain = String(text || "").replace(/<[^>]+>/g, "");
  const preview = plain.length > 160 ? plain.slice(0, 160).trimEnd() : plain;
  item.textContent = preview;

  if (plain.length > 160) {
    const more = document.createElement("span");
    more.className = "feed-expand";
    more.textContent = "ver tudo";
    let expanded = false;
    more.addEventListener("click", () => {
      expanded = !expanded;
      item.textContent = expanded ? plain : preview;
      item.appendChild(more);
      more.textContent = expanded ? "recolher" : "ver tudo";
    });
    item.appendChild(more);
  }

  dom.lsFeed.insertBefore(item, dom.lsFeed.firstChild);
}

function copyText(text, button) {
  navigator.clipboard?.writeText(String(text || "").replace(/<[^>]+>/g, "")).catch(() => {});
  button.textContent = "copiado";
  button.classList.add("copied");
  window.setTimeout(() => {
    button.textContent = "copiar";
    button.classList.remove("copied");
  }, 1400);
}

function makeActions(text) {
  const wrap = document.createElement("div");
  wrap.className = "node-actions";
  const copyBtn = document.createElement("button");
  copyBtn.className = "na-btn";
  copyBtn.textContent = "copiar";
  copyBtn.addEventListener("click", () => copyText(text, copyBtn));

  const positiveBtn = document.createElement("button");
  positiveBtn.className = "na-btn";
  positiveBtn.textContent = "👍";
  positiveBtn.addEventListener("click", () => {
    positiveBtn.classList.toggle("active-pos");
    negativeBtn.classList.remove("active-neg");
  });

  const negativeBtn = document.createElement("button");
  negativeBtn.className = "na-btn";
  negativeBtn.textContent = "👎";
  negativeBtn.addEventListener("click", () => {
    negativeBtn.classList.toggle("active-neg");
    positiveBtn.classList.remove("active-pos");
  });

  wrap.append(copyBtn, positiveBtn, negativeBtn);
  return wrap;
}

function makeNode({ x, y, type, text, isInput, questionText }) {
  const size = isInput ? 24 : 19;
  const palette =
    type === "q"
      ? { glow: "rgba(26,111,187,0.2)", core: "#1a6fbb", ring: "#50c8ff" }
      : { glow: "rgba(13,158,120,0.18)", core: "#0d9e78", ring: "#30f0c0" };

  const element = document.createElement("div");
  element.className = "node-bubble";
  element.style.left = `${x}px`;
  element.style.top = `${y}px`;
  element.style.opacity = "0";
  element.style.transition = "opacity 0.45s";

  const glow = document.createElement("div");
  glow.className = "node-glow";
  glow.style.cssText = `width:${size * 2}px;height:${size * 2}px;background:${palette.glow};box-shadow:0 0 ${
    isInput ? 32 : 18
  }px ${isInput ? 13 : 7}px ${palette.ring};`;
  const core = document.createElement("div");
  core.className = "node-core";
  core.style.cssText = `width:${size * 0.65}px;height:${size * 0.65}px;background:${palette.core};box-shadow:0 0 12px 5px ${palette.ring};`;
  glow.appendChild(core);
  element.appendChild(glow);

  const side = textSide(y, size);
  const node = { x, y, type, el: element, fading: false };

  if (isInput) {
    const wrap = document.createElement("div");
    wrap.className = `node-input-wrap ${side}`;
    const input = document.createElement("textarea");
    input.className = "node-input";
    input.placeholder = "proxima pergunta...";
    enablePasteSupport(input);
    const button = document.createElement("button");
    button.className = "node-send";
    button.textContent = "disparar ↗";
    wrap.append(input, button);
    element.appendChild(wrap);
    node.inp = input;
    node.btn = button;
    graph.allNodes.push(node);
    dom.layer.appendChild(element);
    window.setTimeout(() => {
      element.style.opacity = "1";
      input.focus();
    }, 50);
    button.addEventListener("click", () => {
      const question = input.value.trim();
      if (question) {
        handleSend(node, question);
      }
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        button.click();
      }
    });
  } else if (questionText) {
    const truncated = truncate(questionText, 80);
    const label = document.createElement("div");
    label.className = `node-q-label ${side}`;
    label.textContent = truncated.short + (truncated.cut ? "…" : "");
    element.appendChild(label);
    graph.allNodes.push(node);
    dom.layer.appendChild(element);
    window.setTimeout(() => {
      element.style.opacity = "1";
    }, 50);
  } else {
    const truncated = truncate(text, MAX_CHARS);
    const bubble = document.createElement("div");
    bubble.className = `node-text ${side}`;
    const body = document.createElement("span");
    body.textContent = truncated.short;
    bubble.appendChild(body);
    if (truncated.cut) {
      const ellipsis = document.createElement("span");
      ellipsis.className = "node-ellipsis";
      ellipsis.textContent = "… (completo na coluna esquerda)";
      bubble.appendChild(ellipsis);
    }
    bubble.appendChild(makeActions(text));
    element.appendChild(bubble);
    graph.allNodes.push(node);
    dom.layer.appendChild(element);
    window.setTimeout(() => {
      element.style.opacity = "1";
    }, 50);
  }

  window.setTimeout(() => checkOverlaps(), 500);
  return node;
}

function resetWorkspaceVisuals() {
  graph.allNodes.length = 0;
  graph.connections.length = 0;
  graph.particles.length = 0;
  graph.frontierAngle = Math.random() * Math.PI * 2;
  graph.rIdx = 0;
  dom.layer.innerHTML = "";
  dom.lsFeed.innerHTML = "";
  state.activeInputNode = null;
}

function createInputNodeAtCenter() {
  const node = makeNode({
    x: graph.W / 2,
    y: graph.H / 2,
    type: "q",
    text: "",
    isInput: true,
  });
  state.activeInputNode = node;
  return node;
}

function startNewBrain({ projectId = null, closeWorkspacePanel = false } = {}) {
  resetWorkspaceVisuals();
  state.currentConversationId = null;
  state.currentConversation = null;
  state.currentDraftTitle = "";
  state.currentProjectId = projectId;
  renderConversationMeta();
  createInputNodeAtCenter();
  if (closeWorkspacePanel) {
    closePanel();
  }
}

window.newBrain = startNewBrain;

function hydrateConversation(conversation) {
  resetWorkspaceVisuals();
  state.currentConversationId = conversation.id;
  state.currentConversation = conversation;
  state.currentProjectId = conversation.projectId || null;
  state.currentDraftTitle = "";

  const visibleMessages = (conversation.messages || [])
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-8);

  visibleMessages.forEach((message) => {
    addFeed(message.role === "user" ? "q" : "a", message.content);
  });

  if (!visibleMessages.length) {
    createInputNodeAtCenter();
    renderConversationMeta();
    return;
  }

  let lastPosition = { x: graph.W / 2, y: Math.max(140, graph.H / 2 - 40) };
  visibleMessages.forEach((message, index) => {
    const position = index === 0 ? lastPosition : directedPos(lastPosition.x, lastPosition.y);
    if (index > 0) {
      graph.connections.push({
        x1: lastPosition.x,
        y1: lastPosition.y,
        x2: position.x,
        y2: position.y,
        col: message.role === "assistant" ? "13,158,120" : "26,111,187",
        a: 0.36,
      });
    }

    if (message.role === "user") {
      makeNode({
        x: position.x,
        y: position.y,
        type: "q",
        text: "",
        isInput: false,
        questionText: message.content,
      });
    } else {
      makeNode({
        x: position.x,
        y: position.y,
        type: "a",
        text: message.content,
        isInput: false,
      });
    }

    lastPosition = position;
  });

  const nextPosition = directedPos(lastPosition.x, lastPosition.y);
  graph.connections.push({
    x1: lastPosition.x,
    y1: lastPosition.y,
    x2: nextPosition.x,
    y2: nextPosition.y,
    col: "26,111,187",
    a: 0.28,
  });
  state.activeInputNode = makeNode({
    x: nextPosition.x,
    y: nextPosition.y,
    type: "q",
    text: "",
    isInput: true,
  });

  renderConversationMeta();
}

async function requestSynapsysAnswer(question) {
  try {
    const payload = await apiRequest(API_ANALYZE_URL.replace(API_BASE, ""), {
      method: "POST",
      auth: "optional",
      body: {
        input: question,
        conversationId: state.currentConversationId,
        projectId: state.currentProjectId,
      },
    });

    const text = String(payload?.response || payload?.output || payload?.message || "").trim();
    if (!text) {
      throw new Error("Resposta vazia da Synapsys.");
    }

    setBackendStatus("online", `backend online • ${API_BASE.replace(/^https?:\/\//, "")}`);

    return {
      response: text,
      conversation: payload.conversation || null,
      persistenceEnabled: payload.persistenceEnabled !== false,
      persistenceWarning: payload.persistenceWarning || null,
    };
  } catch (error) {
    console.error("[synapsys_v5] erro ao consultar backend:", error);
    if (error.setupRequired) {
      state.setupRequired = true;
    }
    setBackendStatus("error", "backend offline • fallback local ativo");
    return {
      response: fallbackResponse(),
      conversation: null,
      persistenceEnabled: false,
      persistenceWarning: error.setupRequired
        ? "Persistencia indisponivel ate aplicar a migracao SQL."
        : null,
    };
  }
}

async function handleSend(fromNode, question) {
  if (state.sending) {
    return;
  }

  state.sending = true;
  fromNode.btn.disabled = true;
  fromNode.inp.disabled = true;
  fromNode.el.style.transition = "opacity 0.4s";
  fromNode.el.style.opacity = "0.28";
  state.activeInputNode = null;
  state.currentDraftTitle = state.currentDraftTitle || buildDraftTitle(question);
  renderConversationMeta();
  addFeed("q", question);

  const ringNodes = rings(fromNode.x, fromNode.y);
  window.setTimeout(() => {
    ringNodes.forEach((node) => node.remove());
    flash(fromNode.x, fromNode.y, "#50c8ff");
    const questionPosition = directedPos(fromNode.x, fromNode.y);
    graph.connections.push({
      x1: fromNode.x,
      y1: fromNode.y,
      x2: questionPosition.x,
      y2: questionPosition.y,
      col: "26,111,187",
      a: 0,
    });

    shoot(fromNode.x, fromNode.y, questionPosition.x, questionPosition.y, "#50c8ff", () => {
      makeNode({
        x: questionPosition.x,
        y: questionPosition.y,
        type: "q",
        text: "",
        isInput: false,
        questionText: question,
      });
      flash(questionPosition.x, questionPosition.y, "#50c8ff");
      const answerPosition = directedPos(questionPosition.x, questionPosition.y);
      const thinking = rings(questionPosition.x, questionPosition.y);

      window.setTimeout(async () => {
        graph.connections.push({
          x1: questionPosition.x,
          y1: questionPosition.y,
          x2: answerPosition.x,
          y2: answerPosition.y,
          col: "13,158,120",
          a: 0,
        });
        flash(questionPosition.x, questionPosition.y, "#30f0c0");
        const result = await requestSynapsysAnswer(question);
        thinking.forEach((node) => node.remove());
        shoot(questionPosition.x, questionPosition.y, answerPosition.x, answerPosition.y, "#30f0c0", () => {
          makeNode({
            x: answerPosition.x,
            y: answerPosition.y,
            type: "a",
            text: result.response,
            isInput: false,
          });
          flash(answerPosition.x, answerPosition.y, "#30f0c0");
          addFeed("a", result.response);

          if (result.conversation) {
            state.currentConversationId = result.conversation.id;
            state.currentConversation = result.conversation;
            state.currentProjectId = result.conversation.projectId || state.currentProjectId || null;
            state.currentDraftTitle = "";
            renderConversationMeta();
          }

          if (result.persistenceWarning) {
            showToast(result.persistenceWarning, "warning");
          }

          window.setTimeout(() => {
            const nextPosition = directedPos(answerPosition.x, answerPosition.y);
            graph.connections.push({
              x1: answerPosition.x,
              y1: answerPosition.y,
              x2: nextPosition.x,
              y2: nextPosition.y,
              col: "26,111,187",
              a: 0,
            });
            shoot(answerPosition.x, answerPosition.y, nextPosition.x, nextPosition.y, "#50c8ff", () => {
              state.activeInputNode = makeNode({
                x: nextPosition.x,
                y: nextPosition.y,
                type: "q",
                text: "",
                isInput: true,
              });
              flash(nextPosition.x, nextPosition.y, "#50c8ff");
              state.sending = false;
              void refreshAfterConversationMutation();
            });
          }, 700);
        });
      }, 600);
    });
  }, 900);
}

function syncSidebarSend() {
  const value = dom.lsInput.value.trim();
  if (!value) {
    return;
  }

  if (state.activeInputNode) {
    state.activeInputNode.inp.value = value;
    dom.lsInput.value = "";
    void handleSend(state.activeInputNode, value);
    return;
  }

  dom.lsInput.value = "";
  const node = createInputNodeAtCenter();
  node.inp.value = value;
  window.setTimeout(() => handleSend(node, value), 100);
}

function loop() {
  dom.ctx.clearRect(0, 0, graph.W, graph.H);
  graph.frame += 1;

  graph.ambients.forEach((ambient) => {
    ambient.x += ambient.vx;
    ambient.y += ambient.vy;
    if (ambient.x < 0 || ambient.x > graph.W) ambient.vx *= -1;
    if (ambient.y < 0 || ambient.y > graph.H) ambient.vy *= -1;
  });

  for (let left = 0; left < graph.ambients.length; left += 1) {
    for (let right = left + 1; right < graph.ambients.length; right += 1) {
      const a = graph.ambients[left];
      const b = graph.ambients[right];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 100) {
        dom.ctx.strokeStyle = `rgba(30,90,150,${(1 - distance / 100) * 0.09})`;
        dom.ctx.lineWidth = 0.4;
        dom.ctx.beginPath();
        dom.ctx.moveTo(a.x, a.y);
        dom.ctx.lineTo(b.x, b.y);
        dom.ctx.stroke();
      }
    }
  }

  graph.ambients.forEach((ambient) => {
    const pulse = (Math.sin(graph.frame * 0.04 + ambient.phase) + 1) / 2;
    dom.ctx.beginPath();
    dom.ctx.arc(ambient.x, ambient.y, ambient.r * (0.7 + pulse * 0.5), 0, Math.PI * 2);
    dom.ctx.fillStyle = `rgba(${ambient.col},${0.13 + pulse * 0.17})`;
    dom.ctx.fill();
  });

  graph.connections.forEach((connection) => {
    if (connection.a < 0.48) {
      connection.a += 0.013;
    }
    dom.ctx.strokeStyle = `rgba(${connection.col},${connection.a})`;
    dom.ctx.lineWidth = 0.8;
    dom.ctx.setLineDash([7, 5]);
    dom.ctx.beginPath();
    dom.ctx.moveTo(connection.x1, connection.y1);
    dom.ctx.lineTo(connection.x2, connection.y2);
    dom.ctx.stroke();
    dom.ctx.setLineDash([]);
  });

  for (let index = graph.particles.length - 1; index >= 0; index -= 1) {
    const particle = graph.particles[index];
    if (particle.done) {
      graph.particles.splice(index, 1);
      continue;
    }

    particle.delay -= 16;
    if (particle.delay > 0) {
      continue;
    }

    particle.t = Math.min(particle.t + 0.05, 1);
    const t = particle.t;
    const inverse = 1 - t;
    const x = inverse * inverse * particle.x + 2 * inverse * t * particle.mx + t * t * particle.tx;
    const y = inverse * inverse * particle.y + 2 * inverse * t * particle.my + t * t * particle.ty;
    const alpha = t < 0.75 ? 1 : (1 - t) / 0.25;
    dom.ctx.beginPath();
    dom.ctx.arc(x, y, particle.size, 0, Math.PI * 2);
    dom.ctx.fillStyle = particle.col;
    dom.ctx.globalAlpha = alpha * 0.88;
    dom.ctx.fill();
    dom.ctx.globalAlpha = 1;
    if (particle.t >= 1) {
      particle.done = true;
    }
  }

  window.requestAnimationFrame(loop);
}

async function loadBootstrap() {
  const session = await ensureSession();
  updateAuthUI();

  if (!session) {
    renderRecentConversations();
    renderConversationMeta();
    if (state.activePanel) {
      renderPanel();
    }
    return;
  }

  try {
    const payload = await apiRequest("/api/synapsys/bootstrap", {
      auth: "required",
    });

    state.setupRequired = false;
    state.user = payload.user;
    state.projectsView.items = payload.projects || [];
    state.projectsView.error = "";
    state.recentView.items = payload.recentConversations || [];
    state.recentView.error = "";
    state.conversationView.items = payload.conversations || [];
    state.conversationView.filter = payload.defaultFilter || state.conversationView.filter;
    state.conversationView.error = "";
  } catch (error) {
    if (error.status === 401) {
      clearSession();
      return;
    }

    if (error.setupRequired) {
      state.setupRequired = true;
      showToast("A migracao da Synapsys ainda precisa ser aplicada no Supabase.", "warning");
    } else {
      state.recentView.error = error.message;
      showToast("Nao foi possivel carregar os dados persistentes da Synapsys.", "error");
    }
  }

  updateAuthUI();
  renderRecentConversations();
  renderConversationMeta();
  if (state.activePanel) {
    renderPanel();
  }
}

async function loadConversationList() {
  if (!currentUser() || state.setupRequired) {
    renderPanel();
    return;
  }

  state.conversationView.loading = true;
  state.conversationView.error = "";
  renderPanel();

  try {
    const params = new URLSearchParams();
    params.set("filter", state.conversationView.filter);
    if (state.conversationView.projectId) {
      params.set("projectId", state.conversationView.projectId);
    }
    const payload = await apiRequest(`/api/synapsys/conversations?${params.toString()}`, {
      auth: "required",
    });
    state.conversationView.items = payload.items || [];
  } catch (error) {
    if (error.setupRequired) {
      state.setupRequired = true;
    }
    state.conversationView.error = error.message;
  } finally {
    state.conversationView.loading = false;
    renderPanel();
  }
}

async function loadProjects() {
  if (!currentUser() || state.setupRequired) {
    renderPanel();
    return;
  }

  state.projectsView.loading = true;
  state.projectsView.error = "";
  renderPanel();

  try {
    const payload = await apiRequest("/api/synapsys/projects", {
      auth: "required",
    });
    state.projectsView.items = payload.items || [];
  } catch (error) {
    if (error.setupRequired) {
      state.setupRequired = true;
    }
    state.projectsView.error = error.message;
  } finally {
    state.projectsView.loading = false;
    renderPanel();
    renderConversationMeta();
  }
}

async function loadRecentConversations() {
  if (!currentUser() || state.setupRequired) {
    renderRecentConversations();
    return;
  }

  state.recentView.loading = true;
  renderRecentConversations();
  try {
    const payload = await apiRequest("/api/synapsys/conversations/recent?limit=10", {
      auth: "required",
    });
    state.recentView.items = payload.items || [];
    state.recentView.error = "";
  } catch (error) {
    if (error.setupRequired) {
      state.setupRequired = true;
    }
    state.recentView.error = error.message;
  } finally {
    state.recentView.loading = false;
    renderRecentConversations();
  }
}

async function refreshAfterConversationMutation() {
  if (!currentUser()) {
    renderConversationMeta();
    return;
  }

  await Promise.allSettled([loadRecentConversations(), loadProjects()]);
  if (state.activePanel === "conversations") {
    await loadConversationList();
  }
  if (state.activePanel === "search" && state.searchView.searched) {
    await runSearch();
  }
}

async function openConversation(conversationId) {
  try {
    const payload = await apiRequest(`/api/synapsys/conversations/${conversationId}`, {
      auth: "required",
    });
    hydrateConversation(payload.conversation);
    closePanel();
    await loadRecentConversations();
  } catch (error) {
    if (error.setupRequired) {
      state.setupRequired = true;
    }
    showToast(error.message || "Nao foi possivel abrir a conversa.", "error");
    renderPanel();
  }
}

async function renameConversation(conversationId) {
  const conversation = state.conversationView.items.find((item) => item.id === conversationId);
  if (!conversation) {
    return;
  }

  openFormModal({
    title: "Renomear cerebro",
    copy: "Use um titulo claro para reencontrar essa conversa mais rapido.",
    submitLabel: "salvar titulo",
    values: { title: conversation.title },
    fields: [{ name: "title", label: "Titulo", placeholder: "Nome do cerebro" }],
    onSubmit: async ({ title }) => {
      await apiRequest(`/api/synapsys/conversations/${conversationId}`, {
        method: "PATCH",
        auth: "required",
        body: { title: String(title || "").trim() },
      });
      if (state.currentConversationId === conversationId) {
        state.currentConversation = {
          ...state.currentConversation,
          title: String(title || "").trim(),
        };
      }
      renderConversationMeta();
      await Promise.allSettled([loadConversationList(), loadRecentConversations()]);
      showToast("Titulo atualizado.");
    },
  });
}

async function moveConversation(conversationId) {
  const conversation =
    state.conversationView.items.find((item) => item.id === conversationId) ||
    state.recentView.items.find((item) => item.id === conversationId) ||
    state.currentConversation;

  openFormModal({
    title: "Mover para projeto",
    copy: "Escolha a pasta que organiza melhor esse cerebro.",
    submitLabel: "mover",
    values: { projectId: conversation?.projectId || "" },
    fields: [
      {
        name: "projectId",
        label: "Projeto",
        type: "select",
        options: [{ label: "Sem projeto", value: "" }].concat(
          state.projectsView.items
            .filter((project) => !project.archivedAt)
            .map((project) => ({ label: project.name, value: project.id }))
        ),
      },
    ],
    onSubmit: async ({ projectId }) => {
      await apiRequest(`/api/synapsys/conversations/${conversationId}`, {
        method: "PATCH",
        auth: "required",
        body: { projectId: String(projectId || "") || null },
      });
      if (state.currentConversationId === conversationId && state.currentConversation) {
        const project = projectById(projectId);
        state.currentProjectId = projectId || null;
        state.currentConversation = {
          ...state.currentConversation,
          projectId: projectId || null,
          project,
        };
      }
      renderConversationMeta();
      await refreshAfterConversationMutation();
      showToast("Conversa movida.");
    },
  });
}

async function toggleConversationArchive(conversationId, archived) {
  await apiRequest(`/api/synapsys/conversations/${conversationId}`, {
    method: "PATCH",
    auth: "required",
    body: { archived },
  });

  if (archived && state.currentConversationId === conversationId) {
    startNewBrain({ projectId: null });
    showToast("Conversa arquivada. Um novo cerebro foi aberto.");
  } else {
    showToast(archived ? "Conversa arquivada." : "Conversa restaurada.");
  }

  await refreshAfterConversationMutation();
}

async function deleteConversationById(conversationId) {
  openConfirmModal({
    title: "Excluir conversa",
    copy: "Essa acao remove a conversa e todas as mensagens dela de forma permanente.",
    confirmLabel: "excluir agora",
    confirmKind: "danger",
    onConfirm: async () => {
      await apiRequest(`/api/synapsys/conversations/${conversationId}`, {
        method: "DELETE",
        auth: "required",
      });
      if (state.currentConversationId === conversationId) {
        startNewBrain({ projectId: null });
      }
      await refreshAfterConversationMutation();
      showToast("Conversa excluida.");
    },
  });
}

function openProjectEditor(project = null) {
  openFormModal({
    title: project ? "Editar projeto" : "Novo projeto",
    copy: project
      ? "Atualize nome, descricao, cor ou icone da pasta."
      : "Crie uma pasta para organizar seus cerebros por contexto.",
    submitLabel: project ? "salvar projeto" : "criar projeto",
    values: {
      name: project?.name || "",
      description: project?.description || "",
      color: project?.color || "#50c8ff",
      icon: project?.icon || "folder",
    },
    fields: [
      { name: "name", label: "Nome", placeholder: "Ex.: Time Comercial" },
      { name: "description", label: "Descricao", type: "textarea", placeholder: "O que esse projeto agrupa?" },
      { name: "color", label: "Cor", placeholder: "#50c8ff" },
      {
        name: "icon",
        label: "Icone",
        type: "select",
        options: Object.keys(ICONS).map((value) => ({ value, label: `${ICONS[value]} ${value}` })),
      },
    ],
    onSubmit: async (values) => {
      if (project) {
        await apiRequest(`/api/synapsys/projects/${project.id}`, {
          method: "PATCH",
          auth: "required",
          body: values,
        });
        showToast("Projeto atualizado.");
      } else {
        await apiRequest("/api/synapsys/projects", {
          method: "POST",
          auth: "required",
          body: values,
        });
        showToast("Projeto criado.");
      }
      await Promise.allSettled([loadProjects(), loadConversationList()]);
    },
  });
}

async function toggleProjectArchive(projectId, archived) {
  await apiRequest(`/api/synapsys/projects/${projectId}`, {
    method: "PATCH",
    auth: "required",
    body: { archived },
  });
  if (state.currentProjectId === projectId && archived) {
    state.currentProjectId = null;
    if (state.currentConversation) {
      state.currentConversation = {
        ...state.currentConversation,
        projectId: null,
        project: null,
      };
    }
  }
  renderConversationMeta();
  await Promise.allSettled([loadProjects(), loadConversationList(), loadRecentConversations()]);
  showToast(archived ? "Projeto arquivado." : "Projeto restaurado.");
}

function deleteProjectById(projectId) {
  openConfirmModal({
    title: "Excluir projeto",
    copy: "As conversas vinculadas ficam salvas, mas deixam de pertencer a esse projeto.",
    confirmLabel: "excluir projeto",
    confirmKind: "danger",
    onConfirm: async () => {
      await apiRequest(`/api/synapsys/projects/${projectId}`, {
        method: "DELETE",
        auth: "required",
      });
      if (state.currentProjectId === projectId) {
        state.currentProjectId = null;
        if (state.currentConversation) {
          state.currentConversation = {
            ...state.currentConversation,
            projectId: null,
            project: null,
          };
        }
      }
      renderConversationMeta();
      await Promise.allSettled([loadProjects(), loadConversationList(), loadRecentConversations()]);
      showToast("Projeto excluido.");
    },
  });
}

async function runSearch() {
  if (!currentUser() || !state.searchView.term.trim()) {
    renderPanel();
    return;
  }

  state.searchView.loading = true;
  state.searchView.error = "";
  state.searchView.searched = true;
  renderPanel();

  try {
    const params = new URLSearchParams();
    params.set("q", state.searchView.term.trim());
    params.set("filter", state.searchView.filter);
    if (state.searchView.projectId) {
      params.set("projectId", state.searchView.projectId);
    }
    const payload = await apiRequest(`/api/synapsys/search?${params.toString()}`, {
      auth: "required",
    });
    state.searchView.items = payload.items || [];
  } catch (error) {
    if (error.setupRequired) {
      state.setupRequired = true;
    }
    state.searchView.error = error.message;
  } finally {
    state.searchView.loading = false;
    renderPanel();
  }
}

function openLoginCTA() {
  window.location.href = "/chat/signup?plan=free";
}

function openHelpModal() {
  const shell = buildModalShell(`
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <div class="modal-title">Receber ajuda</div>
          <div class="modal-copy">A FASE 3 vai ganhar um chat dedicado de suporte. Enquanto isso, estes atalhos ja ajudam no uso da plataforma.</div>
        </div>
        <button class="close-btn" type="button" data-close-modal="true">fechar</button>
      </div>
      <div class="state-card" style="margin-bottom:12px">
        <div class="state-title">Atalhos uteis agora</div>
        <div>1. Abra <strong>Conversas</strong> para reencontrar cerebros dos ultimos 30 dias.</div>
        <div>2. Use <strong>Projetos</strong> para agrupar por cliente, squad ou tema.</div>
        <div>3. Use <strong>Procurar</strong> para localizar palavras dentro das mensagens.</div>
      </div>
      <div class="modal-actions">
        <button class="ghost-btn" type="button" data-close-modal="true">fechar</button>
      </div>
    </div>
  `);
  openModal(shell);
}

function openAboutModal() {
  const shell = buildModalShell(`
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <div class="modal-title">Saiba mais</div>
          <div class="modal-copy">Visao geral atual da plataforma Synapsys.</div>
        </div>
        <button class="close-btn" type="button" data-close-modal="true">fechar</button>
      </div>
      <div class="state-card">
        <div class="state-title">Como a Synapsys funciona</div>
        <div>Synapsys transforma perguntas em um grafo visual de raciocinio. Cada cerebro pode virar historico persistente, pertencer a um projeto e ser reencontrado por busca interna.</div>
        <div style="margin-top:10px">Versao atual: <strong>${VERSION_LABEL}</strong></div>
      </div>
      <div class="modal-actions">
        <button class="ghost-btn" type="button" data-close-modal="true">fechar</button>
      </div>
    </div>
  `);
  openModal(shell);
}

function openPhaseTwoModal(title, copy) {
  const shell = buildModalShell(`
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <div class="modal-title">${escapeHtml(title)}</div>
          <div class="modal-copy">${escapeHtml(copy)}</div>
        </div>
        <button class="close-btn" type="button" data-close-modal="true">fechar</button>
      </div>
      <div class="modal-actions">
        <button class="ghost-btn" type="button" data-close-modal="true">fechar</button>
      </div>
    </div>
  `);
  openModal(shell);
}

async function handleMenuAction(action) {
  closeMenu();

  if (action === "plans") {
    window.location.href = "/pricing";
    return;
  }

  if (action === "about") {
    openAboutModal();
    return;
  }

  if (action === "help") {
    openHelpModal();
    return;
  }

  if (action === "logout") {
    clearSession();
    showToast("Sessao encerrada.");
    return;
  }

  if (action === "settings") {
    openPhaseTwoModal("Configuracoes", "Perfil, exportacao, estilo de resposta e limpeza de historico entram na FASE 2.");
    return;
  }

  if (action === "language") {
    openPhaseTwoModal("Idioma", "O suporte inicial a pt-BR e en-US entra na FASE 2.");
  }
}

function bindEvents() {
  window.addEventListener("resize", resizeCanvas);
  dom.lsSendBtn.addEventListener("click", syncSidebarSend);
  enablePasteSupport(dom.lsInput);
  dom.lsInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      syncSidebarSend();
    }
  });

  dom.navConversations.addEventListener("click", () => openPanel("conversations"));
  dom.navProjects.addEventListener("click", () => openPanel("projects"));
  dom.navSearch.addEventListener("click", () => openPanel("search"));
  dom.recentList.addEventListener("click", (event) => {
    const item = event.target.closest("[data-conversation-id]");
    if (item) {
      void openConversation(item.dataset.conversationId);
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".login-area")) {
      closeMenu();
    }
  });

  dom.loginMenu.addEventListener("click", (event) => {
    const item = event.target.closest("[data-menu-action]");
    if (item) {
      void handleMenuAction(item.dataset.menuAction);
    }
  });

  overlays.closeBtn.addEventListener("click", closePanel);
  overlays.shell.addEventListener("click", (event) => {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) {
      return;
    }

    const action = actionEl.dataset.action;
    const id = actionEl.dataset.id;

    if (action === "close-panel") {
      closePanel();
      return;
    }

    if (action === "go-login") {
      openLoginCTA();
      return;
    }

    if (action === "set-conversation-filter") {
      state.conversationView.filter = actionEl.dataset.filter;
      void loadConversationList();
      return;
    }

    if (action === "refresh-conversations") {
      void loadConversationList();
      return;
    }

    if (action === "open-conversation") {
      void openConversation(id);
      return;
    }

    if (action === "rename-conversation") {
      void renameConversation(id);
      return;
    }

    if (action === "move-conversation") {
      void moveConversation(id);
      return;
    }

    if (action === "archive-conversation") {
      void toggleConversationArchive(id, true);
      return;
    }

    if (action === "restore-conversation") {
      void toggleConversationArchive(id, false);
      return;
    }

    if (action === "delete-conversation") {
      deleteConversationById(id);
      return;
    }

    if (action === "create-project") {
      openProjectEditor();
      return;
    }

    if (action === "refresh-projects") {
      void loadProjects();
      return;
    }

    if (action === "open-project-conversations") {
      state.conversationView.projectId = id;
      openPanel("conversations");
      return;
    }

    if (action === "edit-project") {
      const project = state.projectsView.items.find((item) => item.id === id);
      openProjectEditor(project);
      return;
    }

    if (action === "archive-project") {
      void toggleProjectArchive(id, true);
      return;
    }

    if (action === "restore-project") {
      void toggleProjectArchive(id, false);
      return;
    }

    if (action === "delete-project") {
      deleteProjectById(id);
      return;
    }

    if (action === "set-search-filter") {
      state.searchView.filter = actionEl.dataset.filter;
      renderPanel();
      if (state.searchView.searched && state.searchView.term.trim()) {
        void runSearch();
      }
    }
  });

  overlays.shell.addEventListener("change", (event) => {
    const action = event.target.dataset.action;
    if (action === "set-conversation-project-filter") {
      state.conversationView.projectId = event.target.value;
      void loadConversationList();
      return;
    }

    if (action === "search-project-filter") {
      state.searchView.projectId = event.target.value;
      return;
    }
  });

  overlays.shell.addEventListener("submit", (event) => {
    const action = event.target.dataset.action;
    if (action !== "run-search-form") {
      return;
    }

    event.preventDefault();
    const data = new FormData(event.target);
    state.searchView.term = String(data.get("term") || "").trim();
    state.searchView.projectId = String(data.get("projectId") || "").trim();
    void runSearch();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (overlays.modalRoot.classList.contains("open")) {
        closeModal();
      } else if (state.activePanel) {
        closePanel();
      }
    }
  });
}

async function init() {
  resizeCanvas();
  initAmbients();
  bindEvents();
  startNewBrain();
  renderConversationMeta();
  updateAuthUI();
  renderRecentConversations();
  setBackendStatus("connecting");
  void syncBackendStatus();
  window.setInterval(() => {
    void syncBackendStatus({ silent: true });
  }, 30000);
  await loadBootstrap();
  loop();
}

void init();
