import { useSearchParams } from 'react-router-dom'

export default function Signup() {
  const [params] = useSearchParams()
  const plan = params.get('plan') || 'free'

  function handleSignup() {
    if (plan === 'premium') {
      window.location.href = '/checkout?plan=premium'
      return
    }
    window.location.href = '/synapsys_v5.html'
  }

  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#030a12',color:'#c8eeff',fontFamily:'Inter,system-ui,sans-serif'}}>
      <div style={{width:'100%',maxWidth:560,padding:32}}>
        <h1 style={{marginBottom:12}}>Criar conta</h1>
        <p style={{marginBottom:24,opacity:.8}}>Plano selecionado: <b>{plan}</b></p>
        <button onClick={handleSignup} style={{padding:'12px 18px',cursor:'pointer'}}>
          Continuar cadastro
        </button>
      </div>
    </div>
  )
}
