export default function Checkout() {
  function goStripe() {
    window.location.href = 'https://buy.stripe.com/test_xxx'
  }

  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#030a12',color:'#c8eeff',fontFamily:'Inter,system-ui,sans-serif'}}>
      <div style={{width:'100%',maxWidth:560,padding:32}}>
        <h1 style={{marginBottom:12}}>Pagamento</h1>
        <p style={{marginBottom:24,opacity:.8}}>Você será redirecionado para a Stripe.</p>
        <button onClick={goStripe} style={{padding:'12px 18px',cursor:'pointer'}}>Ir para pagamento</button>
      </div>
    </div>
  )
}
