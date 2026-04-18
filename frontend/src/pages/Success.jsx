export default function Success() {
  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#030a12',color:'#c8eeff',fontFamily:'Inter,system-ui,sans-serif'}}>
      <div style={{width:'100%',maxWidth:560,padding:32}}>
        <h1 style={{marginBottom:12}}>Pagamento confirmado</h1>
        <p style={{marginBottom:24,opacity:.8}}>Obrigado. Seu plano premium foi ativado.</p>
        <button onClick={() => window.location.href='/synapsys_v5.html'} style={{padding:'12px 18px',cursor:'pointer'}}>
          Acessar plataforma
        </button>
      </div>
    </div>
  )
}
