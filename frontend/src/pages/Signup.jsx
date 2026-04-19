import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { signUp, signIn } from '../config/supabase'

const C = {
  bg: '#030a12', blue: '#50c8ff', green: '#30f0c0',
  text: 'rgba(200,238,255,0.95)', textDim: 'rgba(150,210,255,0.5)',
  textFaint: 'rgba(100,170,210,0.3)', border: 'rgba(80,200,255,0.12)',
}

export default function Signup() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const plan = params.get('plan') || 'free'

  const [mode, setMode] = useState('signup') // 'signup' | 'login'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!email || !pass || (mode === 'signup' && !name)) {
      setError('Preencha todos os campos.')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (mode === 'signup') {
        await signUp(email, pass, name)
      } else {
        await signIn(email, pass)
      }
      // Após autenticação, redireciona conforme plano
      if (plan === 'premium') {
        navigate('/checkout?plan=premium')
      } else {
        window.location.href = '/synapsys_v5.html'
      }
    } catch (err) {
      setError(err.message || 'Erro ao autenticar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const inp = (val, set, type, placeholder) => (
    <input
      type={type} value={val} placeholder={placeholder}
      onChange={e => set(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
      style={{ width: '100%', background: 'rgba(8,35,65,0.9)', border: '0.5px solid rgba(80,200,255,0.3)', borderRadius: 9, padding: '11px 14px', fontSize: 13, color: '#c8eeff', fontFamily: 'inherit', outline: 'none', marginBottom: 12 }}
    />
  )

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: C.bg, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <style>{`@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ width: '100%', maxWidth: 400, padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(26,111,187,0.15)', border: '0.5px solid rgba(80,200,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.blue, boxShadow: '0 0 10px 3px rgba(80,200,255,0.5)', animation: 'pulse-dot 2s infinite' }} />
          </div>
          <div style={{ fontSize: 10, color: 'rgba(80,200,255,0.35)', letterSpacing: '.15em', marginBottom: '.5rem' }}>SYNAPSYS AI</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 400, color: C.text, marginBottom: '.5rem' }}>
            {mode === 'signup' ? 'Criar sua conta' : 'Entrar na sua conta'}
          </h2>
          <p style={{ fontSize: 12, color: C.textFaint }}>
            {plan === 'premium' ? 'Você será redirecionado ao checkout após o login' : 'Acesso gratuito · 20 mensagens por dia'}
          </p>
        </div>

        <div style={{ background: '#050f1c', border: '0.5px solid rgba(80,200,255,0.2)', borderRadius: 16, padding: '2rem' }}>
          {/* Toggle signup/login */}
          <div style={{ display: 'flex', background: 'rgba(8,35,65,0.9)', borderRadius: 8, padding: 3, marginBottom: '1.5rem' }}>
            {['signup', 'login'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', background: mode === m ? 'rgba(20,80,140,0.8)' : 'transparent', color: mode === m ? C.blue : C.textFaint, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: mode === m ? 500 : 400 }}>
                {m === 'signup' ? 'Criar conta' : 'Entrar'}
              </button>
            ))}
          </div>

          {mode === 'signup' && inp(name, setName, 'text', 'Seu nome')}
          {inp(email, setEmail, 'email', 'Seu e-mail')}
          {inp(pass, setPass, 'password', mode === 'signup' ? 'Criar senha' : 'Sua senha')}

          {error && <p style={{ fontSize: 12, color: '#f05050', marginBottom: 12 }}>{error}</p>}

          <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: 12, borderRadius: 9, background: loading ? 'rgba(20,80,140,0.4)' : 'rgba(20,80,140,0.85)', border: '0.5px solid rgba(80,200,255,0.5)', color: C.blue, fontSize: 14, fontWeight: 500, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            {loading ? 'Aguarde...' : mode === 'signup' ? 'Criar conta e entrar →' : 'Entrar →'}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: 11, color: C.textFaint, cursor: 'pointer' }} onClick={() => navigate('/')}>← Voltar para o início</p>
      </div>
    </div>
  )
}
