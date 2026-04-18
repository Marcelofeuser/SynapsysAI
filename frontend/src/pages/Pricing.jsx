import { useSearchParams, useNavigate } from 'react-router-dom'

export default function Pricing() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const plan = params.get('plan') || 'free'

  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#030a12',color:'#c8eeff',fontFamily:'Inter,system-ui,sans-serif'}}>
      <div style={{width:'100%',maxWidth:700,padding:32}}>
        <h1 style={{marginBottom:12}}>Planos Synapsys</h1>
        <p style={{marginBottom:24,opacity:.8}}>Plano atual sugerido: <b>{plan}</b></p>
        <div style={{display:'flex',gap:16}}>
          <button onClick={() => nav('/chat/signup?plan=free')} style={{padding:'12px 18px',cursor:'pointer'}}>Começar grátis</button>
          <button onClick={() => nav('/chat/signup?plan=premium')} style={{padding:'12px 18px',cursor:'pointer'}}>Assinar premium</button>
        </div>
      </div>
    </div>
  )
}
