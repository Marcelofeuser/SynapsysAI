import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function buildNeural(canvas) {
  const ctx = canvas.getContext('2d')
  let W, H, nodes = [], frame = 0, raf
  function resize() { W = canvas.offsetWidth; H = canvas.offsetHeight; canvas.width = W; canvas.height = H }
  resize()
  for (let i = 0; i < 36; i++) nodes.push({ x: Math.random()*W, y: Math.random()*H, vx:(Math.random()-.5)*.22, vy:(Math.random()-.5)*.22, r:Math.random()*1.8+.8, phase:Math.random()*Math.PI*2, col:Math.random()>.5?'26,111,187':'13,158,120' })
  function loop() {
    ctx.clearRect(0,0,W,H); frame++
    nodes.forEach(n=>{ n.x+=n.vx; n.y+=n.vy; n.phase+=.02; if(n.x<0||n.x>W)n.vx*=-1; if(n.y<0||n.y>H)n.vy*=-1 })
    for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j],dx=a.x-b.x,dy=a.y-b.y,d=Math.sqrt(dx*dx+dy*dy);if(d<140){ctx.strokeStyle=`rgba(30,90,150,${(1-d/140)*.09})`;ctx.lineWidth=.5;ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([])}}
    nodes.forEach(n=>{const p=(Math.sin(frame*.04+n.phase)+1)/2;ctx.beginPath();ctx.arc(n.x,n.y,n.r*(.7+p*.5),0,Math.PI*2);ctx.fillStyle=`rgba(${n.col},${.13+p*.18})`;ctx.fill()})
    raf=requestAnimationFrame(loop)
  }
  loop()
  window.addEventListener('resize',resize)
  return ()=>{ cancelAnimationFrame(raf); window.removeEventListener('resize',resize) }
}

const CONVS=[
  {role:'user',text:'Qual perfil DISC lidera melhor times comerciais?'},
  {role:'ai',text:'Perfis DI são naturais em vendas consultivas — combinam assertividade com carisma relacional.'},
  {role:'user',text:'E se o time for muito S?'},
  {role:'ai',text:'Time com S alto entrega consistência, mas pode ter baixa velocidade. A liderança precisa criar urgência sem gerar ansiedade.'},
  {role:'user',text:'Como comunicar mudanças para esse perfil?'},
  {role:'ai',text:'Com S: antecedência, clareza de impacto e tempo de processamento. Mudança surpresa é o gatilho de maior resistência.'},
]
const CHAT_RESPS=['Analisando o perfil comportamental descrito com base no modelo DISC...','Perfil D/I combina velocidade com carisma — decisões rápidas e engajamento natural.','Com S alto: paciência e consistência são forças. O desafio é adaptação rápida.','Comunicação ideal com C: dados primeiro, contexto depois. Nunca o contrário.']
const FEATURES=[['Análise comportamental DISC','Interpreta perfis com profundidade técnica. Vai além do óbvio e entrega leitura aplicável.'],['Sinapses encadeadas','Cada pergunta conecta à anterior. O raciocínio cresce — não começa do zero.'],['Linguagem técnica e clara','Sem clichês motivacionais. Respostas diretas, profissionais e acionáveis.'],['Relatórios automáticos','Gera documentos estruturados prontos para uso clínico, coaching ou estratégico.'],['Mapeamento de equipes','Analisa distribuição DISC coletiva e gera diagnóstico de riscos e pontos fortes.'],['Dados seguros','Histórico de sessões protegido. Cada cérebro é isolado — suas sinapses são suas.']]
const C={bg:'#030a12',blue:'#50c8ff',green:'#30f0c0',text:'rgba(200,238,255,0.95)',textDim:'rgba(150,210,255,0.5)',textFaint:'rgba(100,170,210,0.3)',border:'rgba(80,200,255,0.12)',borderMd:'rgba(80,200,255,0.25)'}

export default function Landing() {
  const navigate = useNavigate()
  const heroCanvasRef = useRef(null)
  const ctaCanvasRef = useRef(null)
  const msgsRef = useRef(null)
  const [chatMsgs, setChatMsgs] = useState([])
  const [typing, setTyping] = useState(false)
  const [modal, setModal] = useState(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [msgCount, setMsgCount] = useState(0)
  const [chatHistory, setChatHistory] = useState([])
  const [form, setForm] = useState({name:'',email:'',pass:''})
  const DAILY_LIMIT = 20

  useEffect(()=>{ let c1,c2; if(heroCanvasRef.current)c1=buildNeural(heroCanvasRef.current); if(ctaCanvasRef.current)c2=buildNeural(ctaCanvasRef.current); return()=>{c1?.();c2?.()} },[])

  useEffect(()=>{
    let ci=0,timeout
    function next(){if(ci>=CONVS.length){ci=0;setChatMsgs([]);timeout=setTimeout(next,500);return}const c=CONVS[ci];if(c.role==='ai'){setTyping(true);timeout=setTimeout(()=>{setTyping(false);setChatMsgs(p=>[...p,c]);ci++;timeout=setTimeout(next,1200)},650)}else{setChatMsgs(p=>[...p,c]);ci++;timeout=setTimeout(next,450)}}
    timeout=setTimeout(next,600); return()=>clearTimeout(timeout)
  },[])

  useEffect(()=>{if(msgsRef.current)msgsRef.current.scrollTop=msgsRef.current.scrollHeight},[chatHistory])

  function handleRegister(){const{name,email,pass}=form;if(!name||!email||!pass){alert('Preencha todos os campos.');return}setModal(null);if(modal==='premium'){navigate('/checkout?plan=premium')}else{setChatHistory([{role:'ai',text:`Olá ${name}! Você tem 20 sinapses disponíveis hoje. Como posso ajudar?`}]);setMsgCount(0);setChatOpen(true)}}

  function sendMsg(){if(!chatInput.trim())return;const q=chatInput.trim();setChatInput('');const newCount=msgCount+1;setMsgCount(newCount);setChatHistory(p=>[...p,{role:'user',text:q}]);if(newCount>=DAILY_LIMIT){setTimeout(()=>{setChatOpen(false);setModal('upgrade')},400);return}setTimeout(()=>{const r=DAILY_LIMIT-newCount;setChatHistory(p=>[...p,{role:'ai',text:CHAT_RESPS[newCount%CHAT_RESPS.length],note:r>0?`${r} sinapses restantes hoje`:'última sinapse do dia'}])},900)}

  const inp = (f,i) => <input key={f} type={f==='pass'?'password':f==='email'?'email':'text'} placeholder={['Seu nome','Seu e-mail','Criar senha'][i]} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))} style={{width:'100%',background:'rgba(8,35,65,0.9)',border:'0.5px solid rgba(80,200,255,0.3)',borderRadius:9,padding:'11px 14px',fontSize:13,color:'#c8eeff',fontFamily:'inherit',outline:'none',marginBottom:12}}/>

  return(
    <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',color:C.text,overflowX:'hidden',background:C.bg}}>
      <style>{`@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.4}}@keyframes core-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}@keyframes tdot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}`}</style>

      {/* HEADER */}
      <header style={{position:'fixed',top:0,left:0,right:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 2rem',background:'rgba(3,10,18,0.9)',backdropFilter:'blur(12px)',borderBottom:`0.5px solid ${C.border}`}}>
        <span style={{fontSize:13,fontWeight:500,color:C.blue,letterSpacing:'.1em'}}>SYNAPSYS AI</span>
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>navigate('/chat/signup?plan=free')} style={{background:'transparent',border:`0.5px solid ${C.border}`,borderRadius:8,color:C.textDim,fontSize:13,padding:'7px 18px',cursor:'pointer',fontFamily:'inherit'}}>Entrar</button>
          <button onClick={()=>setModal('premium')} style={{background:'rgba(20,80,140,0.8)',border:'0.5px solid rgba(80,200,255,0.5)',borderRadius:8,color:C.blue,fontSize:13,padding:'7px 18px',cursor:'pointer',fontFamily:'inherit'}}>Começar grátis</button>
        </div>
      </header>

      {/* HERO — chat esquerda, texto direita */}
      <section style={{position:'relative',minHeight:'100vh',display:'flex',alignItems:'center',overflow:'hidden',background:C.bg,paddingTop:64}}>
        <canvas ref={heroCanvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}/>
        <div style={{position:'relative',zIndex:3,display:'flex',alignItems:'center',justifyContent:'center',gap:'4rem',padding:'2rem 4rem',width:'100%',maxWidth:1100,margin:'0 auto',flexWrap:'wrap'}}>
          {/* Chat */}
          <div style={{width:300,background:'rgba(5,18,35,0.88)',border:`0.5px solid ${C.borderMd}`,borderRadius:14,overflow:'hidden',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:9,padding:'12px 14px',borderBottom:`0.5px solid ${C.border}`}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:C.green,boxShadow:'0 0 7px 2px rgba(48,240,192,0.6)',animation:'pulse-dot 2s infinite'}}/>
              <span style={{fontSize:12,color:C.blue,fontWeight:500,letterSpacing:'.05em'}}>SYNAPSYS AI</span>
              <span style={{fontSize:10,color:C.textFaint,marginLeft:'auto'}}>sinapse ativa</span>
            </div>
            <div style={{padding:12,display:'flex',flexDirection:'column',gap:8,minHeight:200}}>
              {[...chatMsgs].slice(-4).map((m,i)=>(
                <div key={i} style={{display:'flex',gap:7,flexDirection:m.role==='user'?'row-reverse':'row',alignItems:'flex-start'}}>
                  <div style={{width:22,height:22,borderRadius:'50%',background:m.role==='ai'?'rgba(26,111,187,0.35)':'rgba(13,158,120,0.25)',border:`0.5px solid ${m.role==='ai'?'rgba(80,200,255,0.3)':'rgba(48,240,192,0.25)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:600,color:m.role==='ai'?C.blue:C.green,flexShrink:0}}>{m.role==='ai'?'S':'U'}</div>
                  <div style={{fontSize:11,lineHeight:1.55,padding:'7px 10px',borderRadius:m.role==='ai'?'9px 9px 9px 2px':'9px 9px 2px 9px',maxWidth:210,background:m.role==='ai'?'rgba(26,111,187,0.18)':'rgba(13,158,120,0.18)',color:m.role==='ai'?'rgba(180,220,255,0.88)':'rgba(140,240,200,0.88)',border:`0.5px solid ${m.role==='ai'?'rgba(80,200,255,0.18)':'rgba(48,240,192,0.18)'}`}}>{m.text}</div>
                </div>
              ))}
              {typing&&<div style={{display:'flex',gap:7,alignItems:'center'}}><div style={{width:22,height:22,borderRadius:'50%',background:'rgba(26,111,187,0.35)',border:'0.5px solid rgba(80,200,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:C.blue,flexShrink:0}}>S</div><div style={{display:'flex',gap:3,padding:'7px 10px',background:'rgba(26,111,187,0.18)',border:'0.5px solid rgba(80,200,255,0.18)',borderRadius:'9px 9px 9px 2px'}}>{[0,150,300].map(d=><div key={d} style={{width:5,height:5,borderRadius:'50%',background:C.blue,animation:`tdot .9s ${d}ms infinite`}}/>)}</div></div>}
            </div>
          </div>
          {/* Texto */}
          <div style={{maxWidth:480,textAlign:'left'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(80,200,255,0.07)',border:'0.5px solid rgba(80,200,255,0.25)',borderRadius:20,padding:'4px 14px 4px 10px',fontSize:11,color:'rgba(80,200,255,0.7)',letterSpacing:'.1em',marginBottom:'1.5rem'}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:C.green,animation:'pulse-dot 2s infinite'}}/>IA comportamental avançada
            </div>
            <h1 style={{fontSize:'clamp(2rem,4vw,3.2rem)',fontWeight:400,lineHeight:1.12,color:C.text,marginBottom:'1.2rem',letterSpacing:'-.02em'}}>Sinapses que<br/><strong style={{fontWeight:600,color:C.blue}}>transformam</strong><br/>comportamento em resultado</h1>
            <p style={{fontSize:15,color:C.textDim,lineHeight:1.75,marginBottom:'2rem'}}>A Synapsys analisa, interpreta e recomenda com base em padrões comportamentais reais. Cada resposta cresce a partir da anterior.</p>
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              <button style={{background:'rgba(20,80,140,0.8)',border:'0.5px solid rgba(80,200,255,0.5)',borderRadius:10,color:C.blue,fontSize:14,padding:'12px 28px',cursor:'pointer',fontFamily:'inherit'}} onClick={()=>document.getElementById('pricing').scrollIntoView({behavior:'smooth'})}>Começar agora →</button>
              <button style={{background:'transparent',border:`0.5px solid rgba(80,200,255,0.2)`,borderRadius:10,color:C.textDim,fontSize:14,padding:'12px 28px',cursor:'pointer',fontFamily:'inherit'}} onClick={()=>document.getElementById('how').scrollIntoView({behavior:'smooth'})}>Ver como funciona</button>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES — 3 colunas, 6 cards */}
      <section style={{padding:'6rem 2rem'}}>
        <div style={{maxWidth:900,margin:'0 auto'}}>
          <div style={{fontSize:10,color:'rgba(80,200,255,0.3)',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:'.75rem'}}>Capacidades</div>
          <h2 style={{fontSize:'clamp(1.6rem,3vw,2.4rem)',fontWeight:400,color:'rgba(200,238,255,.92)',marginBottom:'3rem'}}>Uma IA que pensa como<br/>analista comportamental</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,background:'rgba(80,200,255,0.06)',border:'0.5px solid rgba(80,200,255,0.08)',borderRadius:16,overflow:'hidden'}}>
            {FEATURES.map(([title,desc])=>(
              <div key={title} style={{background:C.bg,padding:'2rem 1.5rem'}}>
                <div style={{width:38,height:38,borderRadius:9,background:'rgba(26,111,187,0.15)',border:'0.5px solid rgba(80,200,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'1.2rem'}}><div style={{width:8,height:8,borderRadius:'50%',background:C.blue,boxShadow:'0 0 8px rgba(80,200,255,0.6)'}}/></div>
                <h3 style={{fontSize:13,fontWeight:500,color:'rgba(180,220,255,.85)',marginBottom:'.5rem'}}>{title}</h3>
                <p style={{fontSize:12,color:C.textFaint,lineHeight:1.65}}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" style={{padding:'6rem 2rem',background:'rgba(5,15,28,0.95)'}}>
        <div style={{maxWidth:900,margin:'0 auto'}}>
          <div style={{fontSize:10,color:'rgba(80,200,255,0.3)',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:'.75rem'}}>Como funciona</div>
          <h2 style={{fontSize:'clamp(1.6rem,3vw,2.4rem)',fontWeight:400,color:'rgba(200,238,255,.92)',marginBottom:'3rem'}}>Sinapses crescem sempre para frente</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:24}}>
            {[['01','Dispare a primeira sinapse','Faça sua pergunta. A Synapsys processa e gera a primeira conexão neural.'],['02','A rede cresce','Cada resposta gera um novo nó carregando todo o contexto da sessão.'],['03','Analise o padrão','Visualize como o raciocínio se desenvolveu e identifique padrões.'],['04','Exporte o resultado','Gere relatórios estruturados prontos para uso profissional.']].map(([num,title,desc])=>(
              <div key={num} style={{textAlign:'center',padding:'1rem'}}>
                <div style={{width:40,height:40,borderRadius:'50%',background:'rgba(8,35,65,0.9)',border:'0.5px solid rgba(80,200,255,0.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1.2rem',fontSize:14,fontWeight:500,color:C.blue}}>{num}</div>
                <h3 style={{fontSize:13,fontWeight:500,color:'rgba(180,220,255,.75)',marginBottom:'.5rem'}}>{title}</h3>
                <p style={{fontSize:12,color:C.textFaint,lineHeight:1.65}}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{padding:'6rem 2rem',background:'rgba(5,15,28,0.98)'}}>
        <div style={{maxWidth:900,margin:'0 auto',textAlign:'center'}}>
          <div style={{fontSize:10,color:'rgba(80,200,255,0.3)',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:'.75rem'}}>Planos</div>
          <h2 style={{fontSize:'clamp(1.6rem,3vw,2.4rem)',fontWeight:400,color:'rgba(200,238,255,.92)',marginBottom:'.75rem'}}>Escolha como ativar sua rede</h2>
          <p style={{fontSize:14,color:C.textDim,marginBottom:'3rem'}}>Comece com desconto no primeiro mês. Sem fidelidade obrigatória.</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:20,textAlign:'left'}}>
            {[{label:'GRATUITO',price:'R$ 0',period:'para sempre',promo:'✦ Sem cartão · 20 msgs/dia',items:['20 mensagens por dia','Análise básica DISC','1 cérebro ativo'],btn:'Criar conta grátis',plan:'free',featured:false},
              {label:'MENSAL',price:'R$ 79,90',period:'por mês',promo:'✦ Primeiro mês R$ 59,90',items:['Sinapses ilimitadas','Análise DISC completa','Relatórios estruturados','Histórico de cérebros'],btn:'Assinar mensal',plan:'premium',featured:false},
              {label:'ANUAL',price:'R$ 59,90',period:'por mês · cobrado anualmente',promo:'✦ Economia R$ 240/ano',items:['Tudo do mensal','PDF premium','Prioridade de resposta','Mapeamento de equipes'],btn:'Começar com desconto',plan:'premium',featured:true}
            ].map(p=>(
              <div key={p.label} style={{background:p.featured?'rgba(8,28,58,0.7)':'rgba(5,18,35,0.7)',border:p.featured?'0.5px solid rgba(80,200,255,0.35)':`0.5px solid ${C.border}`,borderRadius:16,padding:'2rem',position:'relative'}}>
                {p.featured&&<div style={{position:'absolute',top:-11,left:'50%',transform:'translateX(-50%)',background:'rgba(20,80,140,0.95)',border:'0.5px solid rgba(80,200,255,0.4)',color:C.blue,fontSize:10,padding:'3px 14px',borderRadius:20,whiteSpace:'nowrap'}}>MELHOR ESCOLHA</div>}
                <div style={{fontSize:11,color:C.textFaint,letterSpacing:'.1em',marginBottom:'.75rem'}}>{p.label}</div>
                <div style={{fontSize:'2rem',fontWeight:300,color:C.text,marginBottom:'.3rem'}}>{p.price}</div>
                <div style={{fontSize:11,color:C.textFaint,marginBottom:'.4rem'}}>{p.period}</div>
                <div style={{fontSize:11,color:'rgba(48,240,192,.65)',marginBottom:'1.5rem',paddingBottom:'1.5rem',borderBottom:`0.5px solid ${C.border}`}}>{p.promo}</div>
                <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:9,marginBottom:'2rem',padding:0}}>
                  {p.items.map(f=><li key={f} style={{fontSize:12,color:C.textDim,display:'flex',alignItems:'center',gap:8}}><span style={{width:12,height:12,borderRadius:'50%',background:'rgba(48,240,192,0.1)',border:'.5px solid rgba(48,240,192,0.3)',flexShrink:0,display:'inline-block'}}/>{f}</li>)}
                </ul>
                <button style={{width:'100%',padding:11,borderRadius:9,background:p.featured?'rgba(20,80,140,0.8)':'transparent',border:p.featured?'0.5px solid rgba(80,200,255,0.5)':`0.5px solid ${C.borderMd}`,color:p.featured?C.blue:C.textDim,fontSize:13,fontWeight:p.featured?500:400,cursor:'pointer',fontFamily:'inherit'}} onClick={()=>setModal(p.plan)}>{p.btn}</button>
              </div>
            ))}
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:7,marginTop:'1.5rem',fontSize:11,color:C.textFaint}}>🔒 Pagamento seguro via <span style={{fontSize:13,fontWeight:700,color:'#635bff'}}>stripe</span> · SSL · PCI DSS</div>
        </div>
      </section>

      {/* CTA */}
      <section style={{position:'relative',overflow:'hidden',textAlign:'center',padding:'6rem 2rem',background:C.bg}}>
        <canvas ref={ctaCanvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
        <div style={{position:'relative',zIndex:2,maxWidth:560,margin:'0 auto'}}>
          <h2 style={{fontSize:'clamp(1.8rem,3.5vw,2.8rem)',fontWeight:400,color:C.text,marginBottom:'1rem'}}>Pronto para disparar<br/>a primeira <span style={{color:C.green}}>sinapse</span>?</h2>
          <p style={{fontSize:14,color:C.textDim,marginBottom:'2.5rem'}}>Primeiro mês por R$ 59,90. Cancele quando quiser.</p>
          <button style={{background:'rgba(20,80,140,0.8)',border:'0.5px solid rgba(80,200,255,0.5)',borderRadius:10,color:C.blue,fontSize:15,padding:'14px 40px',cursor:'pointer',fontFamily:'inherit'}} onClick={()=>setModal('premium')}>Ativar minha rede agora — 7 dias grátis →</button>
        </div>
      </section>

      <footer style={{padding:'2rem',borderTop:`0.5px solid ${C.border}`,textAlign:'center'}}>
        <div style={{fontSize:11,color:'rgba(80,200,255,.25)',letterSpacing:'.15em',marginBottom:'.5rem'}}>SYNAPSYS AI</div>
        <div style={{fontSize:11,color:C.textFaint}}>© 2025 SynapsysAI · sinapses crescem sempre para frente</div>
      </footer>

      {/* MODAL CADASTRO */}
      {modal&&modal!=='upgrade'&&(
        <div style={{display:'flex',position:'fixed',inset:0,zIndex:1000,background:'rgba(2,8,18,0.88)',backdropFilter:'blur(8px)',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#050f1c',border:'0.5px solid rgba(80,200,255,0.25)',borderRadius:18,padding:'2.5rem 2rem',width:'100%',maxWidth:400,position:'relative'}}>
            <button onClick={()=>setModal(null)} style={{position:'absolute',top:14,right:16,background:'none',border:'none',color:'rgba(80,200,255,0.3)',fontSize:22,cursor:'pointer'}}>×</button>
            <div style={{fontSize:10,color:'rgba(80,200,255,0.35)',letterSpacing:'.15em',marginBottom:'.5rem'}}>SYNAPSYS AI</div>
            <h3 style={{fontSize:'1.3rem',fontWeight:400,color:'rgba(200,238,255,.9)',marginBottom:'.4rem'}}>{modal==='premium'?'Criar sua conta':'Criar sua conta grátis'}</h3>
            <p style={{fontSize:12,color:'rgba(100,170,210,0.45)',marginBottom:'1.5rem'}}>{modal==='premium'?'Você será direcionado ao checkout após o cadastro':'Acesso gratuito · 20 mensagens por dia'}</p>
            {['name','email','pass'].map((f,i)=>inp(f,i))}
            <button onClick={handleRegister} style={{width:'100%',padding:12,borderRadius:9,background:'rgba(20,80,140,0.85)',border:'0.5px solid rgba(80,200,255,0.5)',color:C.blue,fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>{modal==='premium'?'Criar conta e ir para o checkout →':'Criar conta e entrar →'}</button>
          </div>
        </div>
      )}

      {/* MODAL UPGRADE */}
      {modal==='upgrade'&&(
        <div style={{display:'flex',position:'fixed',inset:0,zIndex:1000,background:'rgba(2,8,18,0.92)',backdropFilter:'blur(10px)',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#050f1c',border:'0.5px solid rgba(80,200,255,0.3)',borderRadius:18,padding:'2.5rem 2rem',width:'100%',maxWidth:420,textAlign:'center'}}>
            <div style={{width:52,height:52,borderRadius:'50%',background:'rgba(26,111,187,0.15)',border:'0.5px solid rgba(80,200,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1.5rem'}}><div style={{width:14,height:14,borderRadius:'50%',background:C.blue,boxShadow:'0 0 14px 4px rgba(80,200,255,0.5)',animation:'core-pulse 2s infinite'}}/></div>
            <div style={{fontSize:10,color:'rgba(80,200,255,0.35)',letterSpacing:'.15em',marginBottom:'.5rem'}}>LIMITE ATINGIDO</div>
            <h3 style={{fontSize:'1.3rem',fontWeight:400,color:'rgba(200,238,255,.9)',marginBottom:'.75rem'}}>Suas 20 sinapses<br/>diárias foram usadas</h3>
            <p style={{fontSize:13,color:'rgba(100,170,210,0.5)',lineHeight:1.7,margin:'1rem 0 2rem'}}>Volte amanhã gratuitamente ou ative o plano premium agora.</p>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <button style={{width:'100%',padding:13,borderRadius:9,background:'rgba(20,80,140,0.85)',border:'0.5px solid rgba(80,200,255,0.5)',color:C.blue,fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}} onClick={()=>{setModal(null);navigate('/checkout?plan=premium')}}>Ativar premium — R$ 59,90/mês →</button>
              <button style={{width:'100%',padding:11,borderRadius:9,background:'transparent',border:`0.5px solid ${C.border}`,color:'rgba(100,160,200,0.4)',fontSize:13,cursor:'pointer',fontFamily:'inherit'}} onClick={()=>setModal(null)}>Voltar amanhã no plano gratuito</button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT GRATUITO */}
      {chatOpen&&(
        <div style={{position:'fixed',inset:0,zIndex:999,background:C.bg,display:'flex',flexDirection:'column'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 18px',borderBottom:`0.5px solid ${C.border}`,background:'rgba(5,15,28,0.98)'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:C.green}}/>
            <span style={{fontSize:12,color:C.blue,fontWeight:500,letterSpacing:'.08em'}}>SYNAPSYS AI</span>
            <span style={{fontSize:10,color:C.textFaint,marginLeft:'auto'}}>plano gratuito · {DAILY_LIMIT-msgCount} sinapses restantes</span>
            <button onClick={()=>setChatOpen(false)} style={{background:'none',border:`0.5px solid rgba(80,200,255,0.15)`,borderRadius:6,color:'rgba(80,200,255,0.3)',fontSize:11,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit'}}>← sair</button>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:14}} ref={msgsRef}>
            {chatHistory.map((m,i)=>(
              <div key={i} style={{display:'flex',gap:8,flexDirection:m.role==='user'?'row-reverse':'row',alignItems:'flex-start'}}>
                <div style={{width:24,height:24,borderRadius:'50%',background:m.role==='ai'?'rgba(26,111,187,0.35)':'rgba(13,158,120,0.25)',border:`0.5px solid ${m.role==='ai'?'rgba(80,200,255,0.3)':'rgba(48,240,192,0.25)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600,color:m.role==='ai'?C.blue:C.green,flexShrink:0}}>{m.role==='ai'?'S':'U'}</div>
                <div style={{background:m.role==='ai'?'rgba(26,111,187,0.18)':'rgba(13,158,120,0.18)',border:`0.5px solid ${m.role==='ai'?'rgba(80,200,255,0.18)':'rgba(48,240,192,0.18)'}`,borderRadius:m.role==='ai'?'9px 9px 9px 2px':'9px 9px 2px 9px',padding:'9px 12px',fontSize:12,lineHeight:1.6,color:m.role==='ai'?'rgba(180,220,255,0.88)':'rgba(140,240,200,0.88)',maxWidth:420}}>
                  {m.text}{m.note&&<div style={{fontSize:10,color:'rgba(80,200,255,0.35)',marginTop:4}}>{m.note}</div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{padding:'14px 18px',borderTop:`0.5px solid ${C.border}`,background:'rgba(5,15,28,0.98)',display:'flex',gap:10}}>
            <textarea style={{flex:1,background:'rgba(8,35,65,0.9)',border:'0.5px solid rgba(80,200,255,0.3)',borderRadius:9,padding:'10px 12px',fontSize:13,color:'#c8eeff',fontFamily:'inherit',outline:'none',resize:'none'}} rows={1} placeholder="disparar sinapse..." value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg()}}}/>
            <button onClick={sendMsg} style={{background:'rgba(20,80,140,0.8)',border:'0.5px solid rgba(80,200,255,0.45)',borderRadius:9,color:C.blue,fontSize:12,padding:'10px 16px',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>disparar ↗</button>
          </div>
        </div>
      )}
    </div>
  )
}
