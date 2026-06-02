const SESSION_KEY = 'synapsys.session.v1';
const runtimeHost = String(window.location.hostname || '').trim().toLowerCase();
const isLocal = runtimeHost === 'localhost' || runtimeHost === '127.0.0.1';
const API_BASE = isLocal ? 'http://localhost:4010' : 'https://synapsys-backend-production.up.railway.app';

// ── STATE ──
let session = null;
let messages = [];
let currentConvId = null;
let isTyping = false;

// ── DOM ──
const $ = id => document.getElementById(id);
const convList = $('conv-list');
const messagesInner = $('messages-inner');
const inputBox = $('input-box');
const sendBtn = $('send-btn');
const welcome = $('welcome');
const userBtn = $('user-btn');
const userMenu = $('user-menu');

// ── AUTH ──
async function refreshSessionIfNeeded(sess) {
  if (!sess) return sess;
  const now = Math.floor(Date.now() / 1000);
  if (sess.expiresAt && sess.expiresAt > now + 60) return sess; // ainda valido
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: sess.refreshToken })
    });
    if (!res.ok) return sess;
    const data = await res.json();
    if (data.token) {
      const updated = { ...sess, accessToken: data.token, expiresAt: data.expiresAt || (now + 3600) };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      return updated;
    }
  } catch(e) { console.warn('Refresh falhou:', e); }
  return sess;
}

function loadSession() {
  try {
    // Tenta chave customizada primeiro
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const now = Math.floor(Date.now() / 1000);
      if (parsed.expiresAt && parsed.expiresAt > now + 30) return parsed;
    }
    // Tenta chave nativa do Supabase
    const supaKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (supaKey) {
      const supaRaw = localStorage.getItem(supaKey);
      if (supaRaw) {
        const supaData = JSON.parse(supaRaw);
        if (supaData?.access_token) {
          const session = {
            accessToken: supaData.access_token,
            refreshToken: supaData.refresh_token,
            expiresAt: supaData.expires_at,
            user: {
              id: supaData.user?.id,
              email: supaData.user?.email,
              name: supaData.user?.user_metadata?.name || supaData.user?.email?.split('@')[0]
            }
          };
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
          return session;
        }
      }
    }
    // Usa sessao customizada mesmo que expirada (refresh vai renovar)
    if (raw) return JSON.parse(raw);
    return null;
  } catch { return null; }
}

function getHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (session?.accessToken) h['Authorization'] = `Bearer ${session.accessToken}`;
  return h;
}

function renderUser() {
  if (!session?.user) return;
  const { name, email } = session.user;
  const initials = (name || email || 'AI').slice(0, 2).toUpperCase();
  $('user-avatar').textContent = initials;
  $('user-name').textContent = name || email || 'Usuário';
  $('user-email').textContent = email || '';
}

// ── API ──
async function apiRequest(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method || 'GET',
    headers: getHeaders(),
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function sendMessage(text) {
  if (!text.trim() || isTyping) return;
  isTyping = true;
  sendBtn.disabled = true;

  // Hide welcome
  if (welcome) welcome.style.display = 'none';

  // Add user message
  addMsg('user', text);

  // Typing indicator
  const typingEl = addTyping();

  try {
    const payload = await apiRequest('/api/synapsys/general', {
      method: 'POST',
      body: { input: text, conversationId: currentConvId }
    });

    const response = String(payload?.response || payload?.output || payload?.message || '').trim();
    if (payload?.conversation?.id) currentConvId = payload.conversation.id;

    typingEl.remove();
    addMsg('ai', response || 'Sem resposta.');

    // Update conv title
    if (messages.length === 2) {
      $('chat-title').textContent = text.slice(0, 40) + (text.length > 40 ? '...' : '');
    }

    // Reload sidebar
    if (session) loadConversations();

  } catch (e) {
    typingEl.remove();
    addMsg('ai', 'Erro ao conectar com a Synapsys. Tente novamente.');
  }

  isTyping = false;
  sendBtn.disabled = false;
  inputBox.focus();
}

// ── RENDER MESSAGES ──
function addMsg(role, text) {
  messages.push({ role, text });
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  const avatar = role === 'ai' ? 'S' : (session?.user?.name?.slice(0,1) || 'U').toUpperCase();
  div.innerHTML = `
    <div class="msg-avatar">${avatar}</div>
    <div class="msg-bubble">${formatText(text)}</div>
  `;
  messagesInner.appendChild(div);
  scrollBottom();
  return div;
}

function addTyping() {
  const div = document.createElement('div');
  div.className = 'msg ai';
  div.innerHTML = `
    <div class="msg-avatar">S</div>
    <div class="typing-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  messagesInner.appendChild(div);
  scrollBottom();
  return div;
}

function formatText(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

function scrollBottom() {
  const wrap = $('messages-wrap');
  wrap.scrollTop = wrap.scrollHeight;
}

// ── CONVERSATIONS SIDEBAR ──
async function loadConversations() {
  if (!session) return;
  try {
    const data = await apiRequest('/api/synapsys/conversations/recent?limit=15');
    const convs = data?.conversations || data?.items || data?.data || [];
    renderConvList(convs);
  } catch {}
}

function renderConvList(convs) {
  if (!convs.length) {
    convList.innerHTML = '<div class="conv-empty">Nenhuma conversa ainda</div>';
    return;
  }
  convList.innerHTML = convs.map(c => {
    const title = c.title || c.name || 'Conversa';
    const date = c.updated_at ? new Date(c.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
    const isActive = c.id === currentConvId;
    return `<div class="conv-item ${isActive ? 'active' : ''}" data-id="${c.id}">
      <span class="conv-title">${escHtml(title)}</span>
      <span class="conv-date">${date}</span>
    </div>`;
  }).join('');

  convList.querySelectorAll('.conv-item').forEach(el => {
    el.addEventListener('click', () => loadConversation(el.dataset.id));
  });
}

async function loadConversation(id) {
  if (id === currentConvId) return;
  try {
    const data = await apiRequest(`/api/synapsys/conversations/${id}`);
    const conv = data?.conversation || data;
    currentConvId = id;
    messages = [];
    messagesInner.innerHTML = '';
    if (welcome) welcome.style.display = 'none';
    $('chat-title').textContent = conv.title || conv.name || 'Conversa';

    const msgs = conv.messages || conv.turns || [];
    msgs.forEach(m => {
      const role = m.role === 'user' ? 'user' : 'ai';
      addMsg(role, m.content || m.text || '');
    });

    loadConversations();
  } catch {}
}

function newChat() {
  currentConvId = null;
  messages = [];
  messagesInner.innerHTML = '';
  $('chat-title').textContent = 'Nova conversa';

  // Restore welcome
  const w = document.createElement('div');
  w.className = 'welcome';
  w.id = 'welcome';
  w.innerHTML = `
    <div class="welcome-orb"><div class="orb-dot"></div></div>
    <h2>Como posso ajudar?</h2>
    <p>Análise comportamental DISC, inteligência empresarial e muito mais.</p>
    <div class="welcome-chips">
      <button class="chip" data-q="Analise o perfil DI no contexto de liderança">Perfil DI em liderança</button>
      <button class="chip" data-q="Como comunicar mudanças para um perfil S?">Comunicar para perfil S</button>
      <button class="chip" data-q="Quais são os riscos de uma equipe com muitos perfis D?">Riscos de equipe D</button>
      <button class="chip" data-q="Como montar uma equipe DISC equilibrada?">Equipe equilibrada</button>
    </div>
  `;
  messagesInner.appendChild(w);
  bindChips();
  loadConversations();
  inputBox.focus();
}

// ── USER MENU ──
function toggleMenu() {
  userMenu.classList.toggle('open');
}

document.addEventListener('click', e => {
  if (!userBtn.contains(e.target) && !userMenu.contains(e.target)) {
    userMenu.classList.remove('open');
  }
});

function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = '/';
}

// ── INPUT ──
function autoResize() {
  inputBox.style.height = 'auto';
  inputBox.style.height = Math.min(inputBox.scrollHeight, 200) + 'px';
  sendBtn.disabled = !inputBox.value.trim();
}

inputBox.addEventListener('input', autoResize);
inputBox.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const text = inputBox.value.trim();
    if (text) {
      inputBox.value = '';
      autoResize();
      sendMessage(text);
    }
  }
});

sendBtn.addEventListener('click', () => {
  const text = inputBox.value.trim();
  if (text) {
    inputBox.value = '';
    autoResize();
    sendMessage(text);
  }
});

$('new-chat-btn').addEventListener('click', newChat);
$('clear-btn').addEventListener('click', newChat);
userBtn.addEventListener('click', toggleMenu);
$('um-logout').addEventListener('click', logout);
$('um-plans').addEventListener('click', () => { window.location.href = '/pricing'; });

function bindChips() {
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.dataset.q;
      chip.closest('.welcome')?.remove();
      sendMessage(q);
    });
  });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── INIT ──
async function init() {
  session = loadSession();
  if (session) {
    session = await refreshSessionIfNeeded(session);
  }
  if (session) {
    renderUser();
    loadConversations();
  }
  bindChips();
  inputBox.focus();
}
init();
