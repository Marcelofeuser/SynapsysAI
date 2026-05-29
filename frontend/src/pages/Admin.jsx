import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const ADMIN_USER = 'admin@synapsys.insightdisc.com'
const ADMIN_PASS = 'Syn@2025#Admin'
const API = 'https://ai.insightdisc.com'

const C = {
  bg: '#030a12', blue: '#50c8ff', green: '#30f0c0',
  text: 'rgba(200,238,255,0.95)', textDim: 'rgba(150,210,255,0.5)',
  textFaint: 'rgba(100,170,210,0.3)', border: 'rgba(80,200,255,0.12)',
}

export default function Admin() {
  const navigate = useNavigate()
  const [logged, setLogged] = useState(false)
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [adminToken, setAdminToken] = useState('')

  // System prompt
  const [promptText, setPromptText] = useState('')
  const [promptLoading, setPromptLoading] = useState(false)
  const [promptStatus, setPromptStatus] = useState('') // '' | 'saving' | 'saved' | 'error'
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'prompt' | 'knowledge'
  const [showPass, setShowPass] = useState(false)

  // Knowledge base
  const [kbFiles, setKbFiles] = useState([])
  const [kbLoading, setKbLoading] = useState(false)
  const [kbSelected, setKbSelected] = useState(null) // { name, content }
  const [kbEditing, setKbEditing] = useState(false)
  const [kbStatus, setKbStatus] = useState('')
  const [kbUploading, setKbUploading] = useState(false)

  async function handleLogin() {
    if (email === ADMIN_USER && pass === ADMIN_PASS) {
      try {
        const res = await fetch(`${API}/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: ADMIN_PASS }),
        })
        const data = await res.json()
        if (data.token) setAdminToken(data.token)
      } catch (e) {
        console.warn('Backend login failed:', e)
      }
      setLogged(true)
      setError('')
    } else {
      setError('Credenciais inválidas.')
    }
  }

  async function loadPrompt(token) {
    setPromptLoading(true)
    try {
      const res = await fetch(`${API}/admin/system-prompt`, {
        headers: { 'x-admin-token': token },
      })
      const data = await res.json()
      if (data.content) setPromptText(data.content)
    } catch (e) {
      console.warn('Erro ao carregar prompt:', e)
    }
    setPromptLoading(false)
  }

  async function savePrompt() {
    if (!adminToken || promptStatus === 'saving') return
    setPromptStatus('saving')
    try {
      const res = await fetch(`${API}/admin/system-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({ content: promptText }),
      })
      const data = await res.json()
      setPromptStatus(data.ok ? 'saved' : 'error')
    } catch (e) {
      setPromptStatus('error')
    }
    setTimeout(() => setPromptStatus(''), 3000)
  }

  async function loadKbFiles(token) {
    setKbLoading(true)
    try {
      const res = await fetch(`${API}/admin/knowledge`, { headers: { 'x-admin-token': token } })
      const data = await res.json()
      if (data.files) setKbFiles(data.files)
    } catch (e) { console.warn(e) }
    setKbLoading(false)
  }

  async function loadKbFile(name) {
    try {
      const res = await fetch(`${API}/admin/knowledge/content?name=${encodeURIComponent(name)}`, { headers: { 'x-admin-token': adminToken } })
      const data = await res.json()
      setKbSelected({ name, content: data.content })
      setKbEditing(false)
    } catch (e) { console.warn(e) }
  }

  async function saveKbFile() {
    if (!kbSelected) return
    setKbStatus('saving')
    try {
      const res = await fetch(`${API}/admin/knowledge/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ name: kbSelected.name, content: kbSelected.content })
      })
      const data = await res.json()
      setKbStatus(data.ok ? 'saved' : 'error')
    } catch (e) { setKbStatus('error') }
    setTimeout(() => setKbStatus(''), 3000)
  }

  async function deleteKbFile(name) {
    if (!confirm(`Deletar "${name}"?`)) return
    try {
      await fetch(`${API}/admin/knowledge`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ name })
      })
      setKbFiles(f => f.filter(x => x.name !== name))
      if (kbSelected?.name === name) setKbSelected(null)
    } catch (e) { console.warn(e) }
  }

  async function uploadKbFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setKbUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]
      try {
        const res = await fetch(`${API}/admin/knowledge/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
          body: JSON.stringify({ name: file.name, content: base64, encoding: 'base64' })
        })
        const data = await res.json()
        if (data.ok) loadKbFiles(adminToken)
      } catch (e) { console.warn(e) }
      setKbUploading(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  useEffect(() => {
    if (logged && adminToken) {
      loadPrompt(adminToken)
      loadKbFiles(adminToken)
    }
  }, [logged, adminToken])

  const inp = (val, set, type, placeholder) => (
    <input
      type={type} value={val} placeholder={placeholder}
      onChange={e => set(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && handleLogin()}
      style={{ width: '100%', background: 'rgba(8,35,65,0.9)', border: '0.5px solid rgba(80,200,255,0.3)', borderRadius: 9, padding: '11px 14px', fontSize: 13, color: '#c8eeff', fontFamily: 'inherit', outline: 'none', marginBottom: 12 }}
    />
  )

  if (!logged) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: C.bg, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <style>{`@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ width: '100%', maxWidth: 380, padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(26,111,187,0.15)', border: '0.5px solid rgba(80,200,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: C.blue, boxShadow: '0 0 14px 4px rgba(80,200,255,0.5)', animation: 'pulse-dot 2s infinite' }} />
          </div>
          <div style={{ fontSize: 10, color: 'rgba(80,200,255,0.35)', letterSpacing: '.15em', marginBottom: '.5rem' }}>SYNAPSYS AI</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 400, color: C.text, marginBottom: '.5rem' }}>Painel de Administração</h2>
          <p style={{ fontSize: 12, color: C.textFaint }}>Acesso restrito · Super Admin</p>
        </div>
        <div style={{ background: '#050f1c', border: '0.5px solid rgba(80,200,255,0.2)', borderRadius: 16, padding: '2rem' }}>
          {inp(email, setEmail, 'email', 'E-mail admin')}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input type={showPass ? 'text' : 'password'} value={pass} placeholder="Senha" onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ width: '100%', background: 'rgba(8,35,65,0.9)', border: '0.5px solid rgba(80,200,255,0.3)', borderRadius: 9, padding: '11px 40px 11px 14px', fontSize: 13, color: '#c8eeff', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(80,200,255,0.5)', fontSize: 14, lineHeight: 1, padding: 0 }}>{showPass ? '🙈' : '👁️'}</button>
          </div>
          {error && <p style={{ fontSize: 12, color: '#f05050', marginBottom: 12 }}>{error}</p>}
          <button onClick={handleLogin} style={{ width: '100%', padding: 12, borderRadius: 9, background: 'rgba(20,80,140,0.85)', border: '0.5px solid rgba(80,200,255,0.5)', color: C.blue, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Entrar no painel →</button>
        </div>
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: 11, color: C.textFaint, cursor: 'pointer' }} onClick={() => navigate('/')}>← Voltar para a landing page</p>
      </div>
    </div>
  )

  // ── Tab nav ──────────────────────────────────────────────────
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'prompt', label: '🧠 Personalidade da IA' },
    { id: 'knowledge', label: '📚 Base de Conhecimento' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', color: C.text }}>
      <style>{`@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.4}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 2rem', background: 'rgba(5,15,28,0.98)', borderBottom: `0.5px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, animation: 'pulse-dot 2s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: C.blue, letterSpacing: '.1em' }}>SYNAPSYS AI</span>
          <span style={{ fontSize: 11, color: C.textFaint, background: 'rgba(80,200,255,0.07)', border: `0.5px solid ${C.border}`, borderRadius: 20, padding: '2px 10px' }}>Super Admin</span>
        </div>
        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ background: activeTab === t.id ? 'rgba(80,200,255,0.1)' : 'none', border: `0.5px solid ${activeTab === t.id ? 'rgba(80,200,255,0.4)' : C.border}`, borderRadius: 8, color: activeTab === t.id ? C.blue : C.textFaint, fontSize: 12, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => setLogged(false)} style={{ background: 'none', border: `0.5px solid rgba(200,50,50,0.3)`, borderRadius: 8, color: 'rgba(220,80,80,0.6)', fontSize: 12, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Sair</button>
      </header>

      {/* ── DASHBOARD TAB ── */}
      {activeTab === 'dashboard' && (
        <div style={{ padding: '3rem 2rem', maxWidth: 900, margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 400, color: C.text, marginBottom: '.5rem' }}>Painel de controle</h1>
          <p style={{ fontSize: 13, color: C.textFaint, marginBottom: '3rem' }}>Bem-vindo, administrador. Gerencie a plataforma Synapsys AI.</p>

          {/* Cards de acesso rápido */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: '3rem' }}>
            {[
              { label: 'Acessar SynapsysAI', desc: 'Abrir o chat da plataforma', color: C.blue, action: () => window.open('/synapsys_v5.html', '_blank') },
              { label: 'Landing page', desc: 'Ver a página pública', color: C.green, action: () => navigate('/') },
              { label: 'Stripe Dashboard', desc: 'Gerenciar pagamentos', color: '#635bff', action: () => window.open('https://dashboard.stripe.com', '_blank') },
              { label: 'Vercel', desc: 'Deploy e configurações', color: '#fff', action: () => window.open('https://vercel.com', '_blank') },
            ].map(c => (
              <div key={c.label} onClick={c.action} style={{ background: 'rgba(5,18,35,0.7)', border: `0.5px solid ${C.border}`, borderRadius: 14, padding: '1.5rem', cursor: 'pointer', transition: 'border-color .2s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(80,200,255,0.3)'}
                onMouseOut={e => e.currentTarget.style.borderColor = C.border}>
                <div style={{ fontSize: 13, fontWeight: 500, color: c.color, marginBottom: '.5rem' }}>{c.label} →</div>
                <div style={{ fontSize: 12, color: C.textFaint }}>{c.desc}</div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <h2 style={{ fontSize: '1.1rem', fontWeight: 400, color: 'rgba(200,238,255,.75)', marginBottom: '1rem' }}>Métricas</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: '3rem' }}>
            {[['Usuários','—'],['Assinantes','—'],['MRR','—'],['Churn','—']].map(([label,val])=>(
              <div key={label} style={{ background: 'rgba(5,18,35,0.7)', border: `0.5px solid ${C.border}`, borderRadius: 12, padding: '1.25rem' }}>
                <div style={{ fontSize: 11, color: C.textFaint, marginBottom: '.5rem' }}>{label}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 300, color: C.text }}>{val}</div>
                <div style={{ fontSize: 10, color: 'rgba(80,200,255,0.25)', marginTop: '.25rem' }}>conectar Supabase</div>
              </div>
            ))}
          </div>

          {/* Acesso direto */}
          <div style={{ background: 'rgba(8,28,58,0.7)', border: '0.5px solid rgba(80,200,255,0.25)', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(80,200,255,0.35)', letterSpacing: '.15em', marginBottom: '.75rem' }}>ACESSO RÁPIDO</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 400, color: C.text, marginBottom: '.5rem' }}>Abrir SynapsysAI</h3>
            <p style={{ fontSize: 13, color: C.textFaint, marginBottom: '1.5rem' }}>Acesse o chat da plataforma diretamente pelo painel admin.</p>
            <button onClick={() => window.open('/synapsys_v5.html', '_blank')} style={{ background: 'rgba(20,80,140,0.8)', border: '0.5px solid rgba(80,200,255,0.5)', borderRadius: 10, color: C.blue, fontSize: 14, padding: '12px 32px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
              Abrir SynapsysAI →
            </button>
          </div>
        </div>
      )}

      {/* ── PERSONALIDADE DA IA TAB ── */}
      {activeTab === 'prompt' && (
        <div style={{ padding: '3rem 2rem', maxWidth: 900, margin: '0 auto' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 400, color: C.text, marginBottom: '.5rem' }}>🧠 Personalidade da IA</h1>
            <p style={{ fontSize: 13, color: C.textFaint }}>
              Edite o system prompt principal. As alterações entram em vigor imediatamente.
            </p>
          </div>

          {/* Info banner */}
          <div style={{ background: 'rgba(80,200,255,0.05)', border: `0.5px solid rgba(80,200,255,0.2)`, borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13 }}>💡</span>
            <span style={{ fontSize: 12, color: C.textDim }}>
              Este é o arquivo <code style={{ color: C.blue, background: 'rgba(80,200,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>prompts/system-prompt.md</code>. 
              Alterações entram em vigor imediatamente mas resetam no próximo deploy. Para persistência permanente, commite no GitHub.
            </span>
          </div>

          {/* Editor */}
          <div style={{ background: 'rgba(5,18,35,0.8)', border: `0.5px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
            {/* Editor header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `0.5px solid ${C.border}`, background: 'rgba(5,15,28,0.9)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, animation: 'pulse-dot 2s infinite' }} />
                <span style={{ fontSize: 11, color: C.textFaint, letterSpacing: '.1em' }}>system-prompt.md</span>
                {promptText && (
                  <span style={{ fontSize: 10, color: 'rgba(80,200,255,0.3)', background: 'rgba(80,200,255,0.07)', borderRadius: 4, padding: '1px 6px' }}>
                    {promptText.length.toLocaleString()} chars
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* Status feedback */}
                {promptStatus === 'saved' && (
                  <span style={{ fontSize: 12, color: C.green }}>✓ Salvo com sucesso</span>
                )}
                {promptStatus === 'error' && (
                  <span style={{ fontSize: 12, color: '#f05050' }}>✗ Erro ao salvar</span>
                )}
                {/* Reload button */}
                <button
                  onClick={() => loadPrompt(adminToken)}
                  disabled={promptLoading}
                  style={{ background: 'rgba(80,200,255,0.07)', border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.textDim, fontSize: 12, padding: '5px 12px', cursor: promptLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                >
                  {promptLoading ? '⟳ Carregando...' : '⟳ Recarregar'}
                </button>
                {/* Save button */}
                <button
                  onClick={savePrompt}
                  disabled={promptStatus === 'saving' || !adminToken}
                  style={{ background: promptStatus === 'saving' ? 'rgba(20,80,140,0.5)' : 'rgba(20,80,140,0.85)', border: `0.5px solid rgba(80,200,255,0.5)`, borderRadius: 7, color: C.blue, fontSize: 12, fontWeight: 500, padding: '5px 16px', cursor: promptStatus === 'saving' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}
                >
                  {promptStatus === 'saving' ? 'Salvando...' : '💾 Salvar alterações'}
                </button>
              </div>
            </div>

            {/* Textarea */}
            {promptLoading ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: C.textFaint, fontSize: 13 }}>
                <div style={{ width: 20, height: 20, border: `2px solid ${C.border}`, borderTopColor: C.blue, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                Carregando system prompt...
              </div>
            ) : (
              <textarea
                value={promptText}
                onChange={e => setPromptText(e.target.value)}
                spellCheck={false}
                style={{
                  width: '100%', minHeight: 520, background: 'transparent',
                  border: 'none', outline: 'none', resize: 'vertical',
                  padding: '1.5rem', fontSize: 13, lineHeight: 1.7,
                  color: 'rgba(200,238,255,0.85)', fontFamily: '"SF Mono","Fira Code",monospace',
                  boxSizing: 'border-box',
                }}
                placeholder="Cole ou edite o system prompt aqui..."
              />
            )}
          </div>

          {/* Footer tip */}
          <p style={{ fontSize: 11, color: 'rgba(80,200,255,0.2)', marginTop: '1rem', textAlign: 'right' }}>
            Para persistência permanente, após salvar commite o arquivo <code>prompts/system-prompt.md</code> no GitHub.
          </p>
        </div>
      )}

      {/* ── BASE DE CONHECIMENTO TAB ── */}
      {activeTab === 'knowledge' && (
        <div style={{ padding: '3rem 2rem', maxWidth: 900, margin: '0 auto' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 400, color: C.text, marginBottom: '.5rem' }}>📚 Base de Conhecimento</h1>
            <p style={{ fontSize: 13, color: C.textFaint }}>Adicione arquivos para enriquecer o conhecimento da IA. Formatos: .txt, .md, .pdf, .json</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: kbSelected ? '280px 1fr' : '1fr', gap: 16 }}>
            {/* Lista de arquivos */}
            <div>
              {/* Upload */}
              <label style={{ display: 'block', background: 'rgba(80,200,255,0.07)', border: '1px dashed rgba(80,200,255,0.3)', borderRadius: 12, padding: '1rem', textAlign: 'center', cursor: 'pointer', marginBottom: 12, transition: 'border-color .2s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(80,200,255,0.6)'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(80,200,255,0.3)'}>
                <input type="file" accept=".txt,.md,.pdf,.json,.csv" onChange={uploadKbFile} style={{ display: 'none' }} />
                <div style={{ fontSize: 24, marginBottom: 6 }}>📎</div>
                <div style={{ fontSize: 13, color: C.blue }}>{kbUploading ? 'Enviando...' : 'Clique para fazer upload'}</div>
                <div style={{ fontSize: 11, color: C.textFaint, marginTop: 4 }}>.txt .md .pdf .json .csv</div>
              </label>

              {/* Lista */}
              <div style={{ background: 'rgba(5,18,35,0.8)', border: `0.5px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: `0.5px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: C.textFaint, letterSpacing: '.1em' }}>ARQUIVOS ({kbFiles.length})</span>
                  <button onClick={() => loadKbFiles(adminToken)} style={{ background: 'none', border: 'none', color: C.textFaint, cursor: 'pointer', fontSize: 13 }}>⟳</button>
                </div>
                {kbLoading ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: C.textFaint, fontSize: 12 }}>Carregando...</div>
                ) : kbFiles.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: C.textFaint, fontSize: 12 }}>Nenhum arquivo ainda</div>
                ) : kbFiles.map(f => (
                  <div key={f.name} onClick={() => loadKbFile(f.name)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `0.5px solid ${C.border}`, cursor: 'pointer', background: kbSelected?.name === f.name ? 'rgba(80,200,255,0.08)' : 'transparent', transition: 'background .15s' }}
                    onMouseOver={e => { if (kbSelected?.name !== f.name) e.currentTarget.style.background = 'rgba(80,200,255,0.04)' }}
                    onMouseOut={e => { if (kbSelected?.name !== f.name) e.currentTarget.style.background = 'transparent' }}>
                    <div>
                      <div style={{ fontSize: 12, color: kbSelected?.name === f.name ? C.blue : C.text }}>{f.name}</div>
                      <div style={{ fontSize: 10, color: C.textFaint }}>{(f.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteKbFile(f.name) }}
                      style={{ background: 'none', border: 'none', color: 'rgba(220,80,80,0.5)', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Editor de arquivo */}
            {kbSelected && (
              <div style={{ background: 'rgba(5,18,35,0.8)', border: `0.5px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `0.5px solid ${C.border}`, background: 'rgba(5,15,28,0.9)' }}>
                  <span style={{ fontSize: 11, color: C.textFaint }}>{kbSelected.name}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {kbStatus === 'saved' && <span style={{ fontSize: 12, color: C.green }}>✓ Salvo</span>}
                    {kbStatus === 'error' && <span style={{ fontSize: 12, color: '#f05050' }}>✗ Erro</span>}
                    {!kbEditing ? (
                      <button onClick={() => setKbEditing(true)}
                        style={{ background: 'rgba(80,200,255,0.07)', border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.textDim, fontSize: 12, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>✏️ Editar</button>
                    ) : (
                      <>
                        <button onClick={() => setKbEditing(false)}
                          style={{ background: 'none', border: `0.5px solid ${C.border}`, borderRadius: 7, color: C.textFaint, fontSize: 12, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                        <button onClick={saveKbFile}
                          style={{ background: 'rgba(20,80,140,0.85)', border: `0.5px solid rgba(80,200,255,0.5)`, borderRadius: 7, color: C.blue, fontSize: 12, fontWeight: 500, padding: '4px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>💾 Salvar</button>
                      </>
                    )}
                    <button onClick={() => setKbSelected(null)} style={{ background: 'none', border: 'none', color: C.textFaint, cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                </div>
                <textarea
                  value={kbSelected.content || ''}
                  onChange={e => kbEditing && setKbSelected(s => ({ ...s, content: e.target.value }))}
                  readOnly={!kbEditing}
                  style={{ flex: 1, minHeight: 480, background: 'transparent', border: 'none', outline: 'none', resize: 'none', padding: '1.5rem', fontSize: 12, lineHeight: 1.7, color: kbEditing ? 'rgba(200,238,255,0.85)' : C.textDim, fontFamily: '"SF Mono","Fira Code",monospace', boxSizing: 'border-box', cursor: kbEditing ? 'text' : 'default' }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
