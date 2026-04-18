import './App.css'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Pricing from './pages/Pricing'
import Signup from './pages/Signup'
import Checkout from './pages/Checkout'
import Success from './pages/Success'

function Landing() {
  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#030a12',color:'#c8eeff',fontFamily:'Inter,system-ui,sans-serif'}}>
      <div style={{width:'100%',maxWidth:900,padding:40,textAlign:'center'}}>
        <h1 style={{fontSize:56,marginBottom:16}}>Synapsys AI</h1>
        <p style={{fontSize:20,opacity:.82,marginBottom:28}}>
          Landing oficial da Synapsys AI
        </p>
        <div style={{display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap'}}>
          <Link to="/pricing?source=synapsys&plan=premium" style={{padding:'14px 20px',border:'1px solid #4cc9f0',borderRadius:10,color:'#c8eeff',textDecoration:'none'}}>
            Ver planos
          </Link>
          <a href="/synapsys_v5.html" style={{padding:'14px 20px',border:'1px solid #30f0c0',borderRadius:10,color:'#c8eeff',textDecoration:'none'}}>
            Abrir V5
          </a>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/chat/signup" element={<Signup />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/success" element={<Success />} />
      </Routes>
    </BrowserRouter>
  )
}
