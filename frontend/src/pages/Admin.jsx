import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ADMIN_USER = 'admin@synapsys.insightdisc.com'
const ADMIN_PASS = 'Syn@2025#Admin'

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

  function handleLogin() {
    if (email === ADMIN_USER && pass === ADMIN_PASS) {
      setLogged(true)
      setError('')
    } else {
      setError('Credenciais inválidas.')
    }
  }

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
          {inp(pass, setPass, 'password', 'Senha')}
          {error && <p style={{ fontSize: 12, color: '#f05050', marginBottom: 12 }}>{error}</p>}
          <button onClick={handleLogin} style={{ width: '100%', padding: 12, borderRadius: 9, background: 'rgba(20,80,140,0.85)', border: '0.5px solid rgba(80,200,255,0.5)', color: C.blue, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Entrar no painel →</button>
        </div>
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: 11, color: C.textFaint, cursor: 'pointer' }} onClick={() => navigate('/')}>← Voltar para a landing page</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', color: C.text }}>
      <style>{`@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 2rem', background: 'rgba(5,15,28,0.98)', borderBottom: `0.5px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, animation: 'pulse-dot 2s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: C.blue, letterSpacing: '.1em' }}>SYNAPSYS AI</span>
          <span style={{ fontSize: 11, color: C.textFaint, background: 'rgba(80,200,255,0.07)', border: `0.5px solid ${C.border}`, borderRadius: 20, padding: '2px 10px' }}>Super Admin</span>
        </div>
        <button onClick={() => setLogged(false)} style={{ background: 'none', border: `0.5px solid rgba(200,50,50,0.3)`, borderRadius: 8, color: 'rgba(220,80,80,0.6)', fontSize: 12, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Sair</button>
      </header>

      {/* Dashboard */}
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

        {/* Acesso direto à Synapsys */}
        <div style={{ background: 'rgba(8,28,58,0.7)', border: '0.5px solid rgba(80,200,255,0.25)', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'rgba(80,200,255,0.35)', letterSpacing: '.15em', marginBottom: '.75rem' }}>ACESSO RÁPIDO</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 400, color: C.text, marginBottom: '.5rem' }}>Abrir SynapsysAI</h3>
          <p style={{ fontSize: 13, color: C.textFaint, marginBottom: '1.5rem' }}>Acesse o chat da plataforma diretamente pelo painel admin.</p>
          <button onClick={() => window.open('/synapsys_v5.html', '_blank')} style={{ background: 'rgba(20,80,140,0.8)', border: '0.5px solid rgba(80,200,255,0.5)', borderRadius: 10, color: C.blue, fontSize: 14, padding: '12px 32px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
            Abrir SynapsysAI →
          </button>
        </div>
      </div>
    </div>
  )
}
