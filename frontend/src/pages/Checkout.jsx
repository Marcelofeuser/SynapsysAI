import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function Checkout() {
  const [params] = useSearchParams()
  const plan = params.get('plan') || 'mensal'
  const email = params.get('email') || ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function redirect() {
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan, email }),
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
        } else {
          setError('Erro ao gerar link de pagamento.')
          setLoading(false)
        }
      } catch (err) {
        setError('Erro de conexão. Tente novamente.')
        setLoading(false)
      }
    }
    redirect()
  }, [plan, email])

  const s = {
    wrap: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#030a12', color: '#c8eeff', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
    box: { textAlign: 'center', padding: 40 },
    dot: { width: 14, height: 14, borderRadius: '50%', background: '#50c8ff', boxShadow: '0 0 14px 4px rgba(80,200,255,0.5)', margin: '0 auto 2rem', animation: 'pulse 2s infinite' },
    title: { fontSize: '1.4rem', fontWeight: 400, marginBottom: '.75rem', color: 'rgba(200,238,255,.9)' },
    sub: { fontSize: 14, color: 'rgba(150,210,255,0.5)', marginBottom: '2rem' },
    btn: { background: 'rgba(20,80,140,0.8)', border: '0.5px solid rgba(80,200,255,0.5)', borderRadius: 10, color: '#50c8ff', fontSize: 14, padding: '12px 28px', cursor: 'pointer', fontFamily: 'inherit' },
  }

  return (
    <div style={s.wrap}>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}`}</style>
      <div style={s.box}>
        <div style={s.dot} />
        {loading ? (
          <>
            <h2 style={s.title}>Preparando seu checkout...</h2>
            <p style={s.sub}>Você será redirecionado para o pagamento seguro via Stripe.</p>
          </>
        ) : (
          <>
            <h2 style={s.title}>Algo deu errado</h2>
            <p style={s.sub}>{error}</p>
            <button style={s.btn} onClick={() => window.location.href = '/'}>Voltar para o início</button>
          </>
        )}
      </div>
    </div>
  )
}
