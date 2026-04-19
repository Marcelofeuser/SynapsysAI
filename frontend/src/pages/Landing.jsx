import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function buildNeural(canvas) {
  const ctx = canvas.getContext('2d')
  let W, H, nodes = [], frame = 0, raf
  function resize() {
    W = canvas.offsetWidth; H = canvas.offsetHeight
    canvas.width = W; canvas.height = H
  }
  resize()
  for (let i = 0; i < 36; i++) nodes.push({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22,
    r: Math.random() * 1.8 + .8, phase: Math.random() * Math.PI * 2,
    col: Math.random() > .5 ? '26,111,187' : '13,158,120'
  })
  function loop() {
    ctx.clearRect(0, 0, W, H); frame++
    nodes.forEach(n => { n.x += n.vx; n.y += n.vy; n.phase += .02; if (n.x < 0 || n.x > W) n.vx *= -1; if (n.y < 0 || n.y > H) n.vy *= -1 })
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy)
      if (d < 140) { ctx.strokeStyle = `rgba(30,90,150,${(1 - d / 140) * .09})`; ctx.lineWidth = .5; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]) }
    }
    nodes.forEach(n => { const p = (Math.sin(frame * .04 + n.phase) + 1) / 2; ctx.beginPath(); ctx.arc(n.x, n.y, n.r * (.7 + p * .5), 0, Math.PI * 2); ctx.fillStyle = `rgba(${n.col},${.13 + p * .18})`; ctx.fill() })
    raf = requestAnimationFrame(loop)
  }
  loop()
  const onResize = () => resize()
  window.addEventListener('resize', onResize)
  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
}

const CONVS = [
  { role: 'user', text: 'Qual perfil DISC lidera melhor times comerciais?' },
  { role: 'ai', text: 'Perfis DI são naturais em vendas consultivas — combinam assertividade com carisma relacional.' },
  { role: 'user', text: 'E se o time for muito S?' },
  { role: 'ai', text: 'Time com S alto entrega consistência, mas pode ter baixa velocidade. A liderança precisa criar urgência sem gerar ansiedade.' },
  { role: 'user', text: 'Como comunicar mudanças para esse perfil?' },
  { role: 'ai', text: 'Com S: antecedência, clareza de impacto nas pessoas e tempo de processamento. Mudança surpresa é o gatilho de maior resistência.' },
]

const CHAT_RESPS = [
  'Analisando o perfil comportamental descrito com base no modelo DISC...',
  'Perfil D/I combina velocidade com carisma — decisões rápidas e engajamento natural.',
  'Com S alto: paciência e consistência são forças. O desafio é adaptação rápida.',
  'Comunicação ideal com C: dados primeiro, contexto depois. Nunca o contrário.',
]

const s = {
  hero: { position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#030a12' },
  canvas: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' },
  heroContent: { position: 'relative', zIndex: 3, textAlign: 'center', padding: '2rem 2rem 4rem', maxWidth: 620 },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(80,200,255,0.07)', border: '0.5px solid rgba(80,200,255,0.25)', borderRadius: 20, padding: '4px 14px 4px 10px', fontSize: 11, color: 'rgba(80,200,255,0.7)', letterSpacing: '.1em', marginBottom: '2rem' },
  badgeDot: { width: 6, height: 6, borderRadius: '50%', background: '#30f0c0', animation: 'pulse-dot 2s infinite' },
  title: { fontSize: 'clamp(2.2rem,5vw,3.6rem)', fontWeight: 400, lineHeight: 1.12, color: 'rgba(200,238,255,0.95)', marginBottom: '1.2rem', letterSpacing: '-.02em' },
  titleStrong: { fontWeight: 600, color: '#50c8ff' },
  sub: { fontSize: 15, color: 'rgba(150,210,255,0.5)', lineHeight: 1.75, marginBottom: '2.5rem', maxWidth: 440, margin: '0 auto 2.5rem' },
  ctas: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
  btnMain: { background: 'rgba(20,80,140,0.8)', border: '0.5px solid rgba(80,200,255,0.5)', borderRadius: 10, color: '#50c8ff', fontSize: 14, padding: '12px 28px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '.03em' },
  btnGhost: { background: 'transparent', border: '0.5px solid rgba(80,200,255,0.2)', borderRadius: 10, color: 'rgba(150,210,255,0.5)', fontSize: 14, padding: '12px 28px', cursor: 'pointer', fontFamily: 'inherit' },
  chatWindow: { position: 'absolute', right: '8%', top: '50%', transform: 'translateY(-50%)', width: 290, background: 'rgba(5,18,35,0.88)', border: '0.5px solid rgba(80,200,255,0.25)', borderRadius: 14, overflow: 'hidden', zIndex: 4 },
  cwHeader: { display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', borderBottom: '0.5px solid rgba(80,200,255,0.12)' },
  cwDot: { width: 8, height: 8, borderRadius: '50%', background: '#30f0c0', boxShadow: '0 0 7px 2px rgba(48,240,192,0.6)' },
  section: { padding: '6rem 2rem', maxWidth: 900, margin: '0 auto' },
  sectionLabel: { fontSize: 10, color: 'rgba(80,200,255,0.3)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '.75rem' },
  sectionTitle: { fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 400, color: 'rgba(200,238,255,.92)', lineHeight: 1.2, marginBottom: '1rem' },
  featGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 1, background: 'rgba(80,200,255,0.06)', border: '0.5px solid rgba(80,200,255,0.08)', borderRadius: 16, overflow: 'hidden', marginTop: '3rem' },
  feat: { background: '#030a12', padding: '2rem 1.5rem' },
  featIcon: { width: 38, height: 38, borderRadius: 9, background: 'rgba(26,111,187,0.15)', border: '0.5px solid rgba(80,200,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.2rem' },
  pricingSection: { padding: '6rem 2rem', background: 'rgba(5,15,28,0.95)' },
  pricingWrap: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20, marginTop: '3rem', maxWidth: 900, margin: '3rem auto 0' },
  plan: { background: 'rgba(5,18,35,0.7)', border: '0.5px solid rgba(80,200,255,0.12)', borderRadius: 16, padding: '2rem', position: 'relative' },
  planFeatured: { background: 'rgba(8,28,58,0.7)', border: '0.5px solid rgba(80,200,255,0.35)', borderRadius: 16, padding: '2rem', position: 'relative' },
  planTag: { position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,80,140,0.95)', border: '0.5px solid rgba(80,200,255,0.4)', color: '#50c8ff', fontSize: 10, padding: '3px 14px', borderRadius: 20, whiteSpace: 'nowrap', letterSpacing: '.06em' },
  planType: { fontSize: 11, color: 'rgba(100,170,210,0.3)', letterSpacing: '.1em', marginBottom: '.75rem' },
  planAmount: { fontSize: '2.6rem', fontWeight: 300, color: 'rgba(200,238,255,.95)', lineHeight: 1 },
  planPeriod: { fontSize: 11, color: 'rgba(100,170,210,0.3)', marginBottom: '.4rem' },
  planPromo: { fontSize: 11, color: 'rgba(48,240,192,.65)', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '.5px solid rgba(80,200,255,0.12)' },
  planList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9, marginBottom: '2rem', padding: 0 },
  planListItem: { fontSize: 12, color: 'rgba(150,210,255,0.5)', display: 'flex', alignItems: 'center', gap: 8 },
  planListDot: { width: 12, height: 12, borderRadius: '50%', background: 'rgba(48,240,192,0.1)', border: '.5px solid rgba(48,240,192,0.3)', flexShrink: 0 },
  btnPlanMain: { width: '100%', padding: 11, borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'rgba(20,80,140,0.8)', border: '.5px solid rgba(80,200,255,0.5)', color: '#50c8ff', fontFamily: 'inherit', letterSpacing: '.03em' },
  btnPlanOutline: { width: '100%', padding: 11, borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'transparent', border: '.5px solid rgba(80,200,255,0.25)', color: 'rgba(150,210,255,0.5)', fontFamily: 'inherit' },
  stripeRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: '1.5rem', fontSize: 11, color: 'rgba(100,170,210,0.3)' },
  stripeBrand: { fontSize: 13, fontWeight: 700, color: '#635bff' },
  ctaSection: { position: 'relative', overflow: 'hidden', textAlign: 'center', padding: '6rem 2rem', background: '#030a12' },
  ctaInner: { position: 'relative', zIndex: 2, maxWidth: 560, margin: '0 auto' },
  ctaTitle: { fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 400, color: 'rgba(200,238,255,.95)', lineHeight: 1.2, marginBottom: '1rem' },
  footer: { padding: '2rem', borderTop: '.5px solid rgba(80,200,255,0.1)', textAlign: 'center' },
  footerLogo: { fontSize: 11, color: 'rgba(80,200,255,.25)', letterSpacing: '.15em', marginBottom: '.5rem' },
  footerTxt: { fontSize: 11, color: 'rgba(100,170,210,0.3)' },

  overlay: { display: 'none', position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,8,18,0.88)', backdropFilter: 'blur(8px)', alignItems: 'center', justifyContent: 'center' },
  overlayOpen: { display: 'flex', position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,8,18,0.88)', backdropFilter: 'blur(8px)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { background: '#050f1c', border: '0.5px solid rgba(80,200,255,0.25)', borderRadius: 18, padding: '2.5rem 2rem', width: '100%', maxWidth: 400, position: 'relative' },
  modalTitle: { fontSize: '1.3rem', fontWeight: 400, color: 'rgba(200,238,255,.9)', marginBottom: '.4rem' },
  modalSub: { fontSize: 12, color: 'rgba(100,170,210,0.45)', marginBottom: '1.8rem' },
  input: { width: '100%', background: 'rgba(8,35,65,0.9)', border: '0.5px solid rgba(80,200,255,0.3)', borderRadius: 9, padding: '11px 14px', fontSize: 13, color: '#c8eeff', fontFamily: 'inherit', outline: 'none', marginBottom: 12 },
  btnRegister: { width: '100%', padding: 12, borderRadius: 9, background: 'rgba(20,80,140,0.85)', border: '0.5px solid rgba(80,200,255,0.5)', color: '#50c8ff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  closeBtn: { position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', color: 'rgba(80,200,255,0.3)', fontSize: 22, cursor: 'pointer', lineHeight: 1 },

  upgradeBox: { background: '#050f1c', border: '0.5px solid rgba(80,200,255,0.3)', borderRadius: 18, padding: '2.5rem 2rem', width: '100%', maxWidth: 420, textAlign: 'center' },
  upgradeIcon: { width: 52, height: 52, borderRadius: '50%', background: 'rgba(26,111,187,0.15)', border: '0.5px solid rgba(80,200,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' },
  upgradeCore: { width: 14, height: 14, borderRadius: '50%', background: '#50c8ff', boxShadow: '0 0 14px 4px rgba(80,200,255,0.5)' },

  chatFull: { position: 'fixed', inset: 0, zIndex: 999, background: '#030a12', display: 'flex', flexDirection: 'column' },
  chatHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '0.5px solid rgba(80,200,255,0.1)', background: 'rgba(5,15,28,0.98)' },
  chatHeaderDot: { width: 8, height: 8, borderRadius: '50%', background: '#30f0c0' },
  chatName: { fontSize: 12, color: '#50c8ff', fontWeight: 500, letterSpacing: '.08em' },
  chatPlan: { fontSize: 10, color: 'rgba(80,200,255,0.25)', marginLeft: 'auto' },
  chatExitBtn: { background: 'none', border: '0.5px solid rgba(80,200,255,0.15)', borderRadius: 6, color: 'rgba(80,200,255,0.3)', fontSize: 11, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' },
  chatMsgs: { flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 },
  chatBar: { padding: '14px 18px', borderTop: '0.5px solid rgba(80,200,255,0.1)', background: 'rgba(5,15,28,0.98)', display: 'flex', gap: 10 },
  chatInput: { flex: 1, background: 'rgba(8,35,65,0.9)', border: '0.5px solid rgba(80,200,255,0.3)', borderRadius: 9, padding: '10px 12px', fontSize: 13, color: '#c8eeff', fontFamily: 'inherit', outline: 'none', resize: 'none' },
  chatSendBtn: { background: 'rgba(20,80,140,0.8)', border: '0.5px solid rgba(80,200,255,0.45)', borderRadius: 9, color: '#50c8ff', fontSize: 12, padding: '10px 16px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
}

export default function Landing() {
  const navigate = useNavigate()
  const heroCanvasRef = useRef(null)
  const ctaCanvasRef = useRef(null)
  const msgsRef = useRef(null)

  const [chatMsgs, setChatMsgs] = useState([])
  const [typing, setTyping] = useState(false)
  const [modal, setModal] = useState(null) // null | 'free' | 'premium' | 'upgrade'
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [msgCount, setMsgCount] = useState(0)
  const [chatHistory, setChatHistory] = useState([])
  const [form, setForm] = useState({ name: '', email: '', pass: '' })

  const DAILY_LIMIT = 20

  useEffect(() => {
    let cleanup1, cleanup2
    if (heroCanvasRef.current) cleanup1 = buildNeural(heroCanvasRef.current)
    if (ctaCanvasRef.current) cleanup2 = buildNeural(ctaCanvasRef.current)
    return () => { cleanup1?.(); cleanup2?.() }
  }, [])

  useEffect(() => {
    let ci = 0, timeout
    function next() {
      if (ci >= CONVS.length) { ci = 0; setChatMsgs([]); timeout = setTimeout(next, 1000); return }
      const c = CONVS[ci]
      if (c.role === 'ai') {
        setTyping(true)
        timeout = setTimeout(() => { setTyping(false); setChatMsgs(p => [...p, c]); ci++; timeout = setTimeout(next, 2400) }, 1300)
      } else { setChatMsgs(p => [...p, c]); ci++; timeout = setTimeout(next, 900) }
    }
    timeout = setTimeout(next, 600)
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [chatHistory])

  function openRegister(plan) { setModal(plan) }

  function handleRegister() {
    const { name, email, pass } = form
    if (!name || !email || !pass) { alert('Preencha todos os campos.'); return }
    setModal(null)
    if (modal === 'premium') {
      navigate('/checkout?plan=premium')
    } else {
      setChatHistory([{ role: 'ai', text: `Olá ${name}! Você tem 20 sinapses disponíveis hoje. Como posso ajudar?` }])
      setMsgCount(0)
      setChatOpen(true)
    }
  }

  function sendMsg() {
    if (!chatInput.trim()) return
    const q = chatInput.trim()
    setChatInput('')
    const newCount = msgCount + 1
    setMsgCount(newCount)
    setChatHistory(p => [...p, { role: 'user', text: q }])
    if (newCount >= DAILY_LIMIT) {
      setTimeout(() => { setChatOpen(false); setModal('upgrade') }, 400)
      return
    }
    setTimeout(() => {
      const remaining = DAILY_LIMIT - newCount
      setChatHistory(p => [...p, { role: 'ai', text: CHAT_RESPS[newCount % CHAT_RESPS.length], note: remaining > 0 ? `${remaining} sinapses restantes hoje` : 'última sinapse do dia' }])
    }, 900)
  }

  const isPremium = modal === 'premium'

  return (
    <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', color: '#c8eeff', overflowX: 'hidden' }}>
      <style>{`
        @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes core-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
        @keyframes tdot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}
      `}</style>

      {/* ── HERO ── */}
      <section style={s.hero}>
        <canvas ref={heroCanvasRef} style={s.canvas} />

        {/* chat flutuante */}
        <div style={{ ...s.chatWindow, display: window.innerWidth < 900 ? 'none' : 'block' }}>
          <div style={s.cwHeader}>
            <div style={s.cwDot} />
            <span style={{ fontSize: 12, color: '#50c8ff', fontWeight: 500, letterSpacing: '.05em' }}>SYNAPSYS AI</span>
            <span style={{ fontSize: 10, color: 'rgba(80,200,255,0.25)', marginLeft: 'auto' }}>sinapse ativa</span>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 180 }}>
            {chatMsgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 7, flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: m.role === 'ai' ? 'rgba(26,111,187,0.35)' : 'rgba(13,158,120,0.25)', border: `0.5px solid ${m.role === 'ai' ? 'rgba(80,200,255,0.3)' : 'rgba(48,240,192,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: m.role === 'ai' ? '#50c8ff' : '#30f0c0', flexShrink: 0 }}>{m.role === 'ai' ? 'S' : 'U'}</div>
                <div style={{ fontSize: 11, lineHeight: 1.55, padding: '7px 10px', borderRadius: m.role === 'ai' ? '9px 9px 9px 2px' : '9px 9px 2px 9px', maxWidth: 210, background: m.role === 'ai' ? 'rgba(26,111,187,0.18)' : 'rgba(13,158,120,0.18)', color: m.role === 'ai' ? 'rgba(180,220,255,0.88)' : 'rgba(140,240,200,0.88)', border: `0.5px solid ${m.role === 'ai' ? 'rgba(80,200,255,0.18)' : 'rgba(48,240,192,0.18)'}` }}>{m.text}</div>
              </div>
            ))}
            {typing && (
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(26,111,187,0.35)', border: '0.5px solid rgba(80,200,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#50c8ff', flexShrink: 0 }}>S</div>
                <div style={{ display: 'flex', gap: 3, padding: '7px 10px', background: 'rgba(26,111,187,0.18)', border: '0.5px solid rgba(80,200,255,0.18)', borderRadius: '9px 9px 9px 2px' }}>
                  {[0, 150, 300].map(d => <div key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: '#50c8ff', animation: `tdot .9s ${d}ms infinite` }} />)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={s.heroContent}>
          <div style={s.badge}><div style={s.badgeDot} />IA comportamental avançada</div>
          <h1 style={s.title}>Sinapses que<br /><strong style={s.titleStrong}>transformam</strong><br />comportamento em resultado</h1>
          <p style={s.sub}>A Synapsys analisa, interpreta e recomenda com base em padrões comportamentais reais. Cada resposta cresce a partir da anterior.</p>
          <div style={s.ctas}>
            <button style={s.btnMain} onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}>Começar agora →</button>
            <button style={s.btnGhost} onClick={() => document.getElementById('how').scrollIntoView({ behavior: 'smooth' })}>Ver como funciona</button>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '6rem 2rem' }}>
        <div style={s.section}>
          <div style={s.sectionLabel}>Capacidades</div>
          <h2 style={s.sectionTitle}>Uma IA que pensa como<br />analista comportamental</h2>
          <div style={s.featGrid}>
            {[
              ['Análise comportamental DISC', 'Interpreta perfis com profundidade técnica. Vai além do óbvio e entrega leitura aplicável.'],
              ['Sinapses encadeadas', 'Cada pergunta conecta à anterior. O raciocínio cresce — não começa do zero.'],
              ['Linguagem técnica e clara', 'Sem clichês motivacionais. Respostas diretas, profissionais e acionáveis.'],
              ['Relatórios automáticos', 'Gera documentos estruturados prontos para uso clínico, coaching ou estratégico.'],
              ['Mapeamento de equipes', 'Analisa distribuição DISC coletiva e gera diagnóstico de riscos e pontos fortes.'],
              ['Dados seguros', 'Histórico de sessões protegido. Cada cérebro é isolado — suas sinapses são suas.'],
            ].map(([title, desc]) => (
              <div key={title} style={s.feat}>
                <div style={s.featIcon}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#50c8ff', boxShadow: '0 0 8px rgba(80,200,255,0.6)' }} /></div>
                <h3 style={{ fontSize: 13, fontWeight: 500, color: 'rgba(180,220,255,.85)', marginBottom: '.5rem' }}>{title}</h3>
                <p style={{ fontSize: 12, color: 'rgba(100,170,210,0.3)', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW ── */}
      <section id="how" style={{ padding: '6rem 2rem', background: 'rgba(5,15,28,0.95)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={s.sectionLabel}>Como funciona</div>
          <h2 style={s.sectionTitle}>Sinapses crescem sempre<br />para frente</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 24, marginTop: '3rem' }}>
            {[
              ['01', 'Dispare a primeira sinapse', 'Faça sua pergunta no nó central. A Synapsys processa e gera a primeira conexão.'],
              ['02', 'A rede cresce', 'Cada resposta gera um novo nó. As sinapses se expandem carregando todo o contexto.'],
              ['03', 'Analise o padrão', 'Visualize como o raciocínio se desenvolveu. Identifique padrões comportamentais.'],
              ['04', 'Exporte o resultado', 'Gere relatórios estruturados prontos para uso profissional a partir de qualquer sessão.'],
            ].map(([num, title, desc]) => (
              <div key={num} style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(8,35,65,0.9)', border: '0.5px solid rgba(80,200,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.2rem', fontSize: 14, fontWeight: 500, color: '#50c8ff' }}>{num}</div>
                <h3 style={{ fontSize: 13, fontWeight: 500, color: 'rgba(180,220,255,.75)', marginBottom: '.5rem' }}>{title}</h3>
                <p style={{ fontSize: 12, color: 'rgba(100,170,210,0.3)', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={s.pricingSection}>
        <div style={{ textAlign: 'center', marginBottom: 0 }}>
          <div style={s.sectionLabel}>Planos</div>
          <h2 style={{ ...s.sectionTitle, textAlign: 'center' }}>Escolha como ativar sua rede</h2>
          <p style={{ fontSize: 14, color: 'rgba(150,210,255,0.5)', textAlign: 'center' }}>Comece com desconto no primeiro mês. Sem fidelidade obrigatória.</p>
        </div>
        <div style={s.pricingWrap}>
          {/* Gratuito */}
          <div style={s.plan}>
            <div style={s.planType}>GRATUITO</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: '.3rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 300, color: 'rgba(200,238,255,.95)' }}>R$ 0</span>
            </div>
            <div style={s.planPeriod}>para sempre</div>
            <div style={s.planPromo}>✦ Sem cartão · 20 msgs/dia</div>
            <ul style={s.planList}>{['20 mensagens por dia', 'Análise básica DISC', '1 cérebro ativo'].map(f => <li key={f} style={s.planListItem}><span style={s.planListDot} />{f}</li>)}</ul>
            <button style={s.btnPlanOutline} onClick={() => openRegister('free')}>Criar conta grátis</button>
          </div>
          {/* Mensal */}
          <div style={s.plan}>
            <div style={s.planType}>MENSAL</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: '.3rem' }}>
              <span style={{ fontSize: 14, color: 'rgba(150,210,255,0.5)', marginTop: 4 }}>R$</span>
              <span style={s.planAmount}>79</span>
              <span style={{ fontSize: '1.1rem', color: 'rgba(200,238,255,.75)' }}>,90</span>
            </div>
            <div style={s.planPeriod}>por mês</div>
            <div style={s.planPromo}>✦ Primeiro mês R$ 59,90</div>
            <ul style={s.planList}>{['Sinapses ilimitadas', 'Análise DISC completa', 'Relatórios estruturados', 'Histórico de cérebros'].map(f => <li key={f} style={s.planListItem}><span style={s.planListDot} />{f}</li>)}</ul>
            <button style={s.btnPlanOutline} onClick={() => openRegister('premium')}>Assinar mensal</button>
          </div>
          {/* Anual */}
          <div style={s.planFeatured}>
            <div style={s.planTag}>MELHOR ESCOLHA</div>
            <div style={s.planType}>ANUAL</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: '.3rem' }}>
              <span style={{ fontSize: 14, color: 'rgba(150,210,255,0.5)', marginTop: 4 }}>R$</span>
              <span style={s.planAmount}>59</span>
              <span style={{ fontSize: '1.1rem', color: 'rgba(200,238,255,.75)' }}>,90</span>
            </div>
            <div style={s.planPeriod}>por mês · cobrado anualmente</div>
            <div style={s.planPromo}>✦ Economia R$ 240/ano</div>
            <ul style={s.planList}>{['Tudo do mensal', 'PDF premium', 'Prioridade de resposta', 'Mapeamento de equipes'].map(f => <li key={f} style={s.planListItem}><span style={s.planListDot} />{f}</li>)}</ul>
            <button style={s.btnPlanMain} onClick={() => openRegister('premium')}>Começar com desconto</button>
          </div>
        </div>
        <div style={s.stripeRow}>
          🔒 Pagamento seguro via <span style={s.stripeBrand}>stripe</span> · SSL · PCI DSS
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={s.ctaSection}>
        <canvas ref={ctaCanvasRef} style={s.canvas} />
        <div style={s.ctaInner}>
          <h2 style={s.ctaTitle}>Pronto para disparar<br />a primeira <span style={{ color: '#30f0c0' }}>sinapse</span>?</h2>
          <p style={{ fontSize: 14, color: 'rgba(150,210,255,0.5)', marginBottom: '2.5rem' }}>Primeiro mês por R$ 59,90. Cancele quando quiser.</p>
          <button style={{ ...s.btnMain, fontSize: 15, padding: '14px 40px' }} onClick={() => openRegister('premium')}>Ativar minha rede agora — 7 dias grátis →</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={s.footer}>
        <div style={s.footerLogo}>SYNAPSYS AI</div>
        <div style={s.footerTxt}>© 2025 SynapsysAI · sinapses crescem sempre para frente</div>
      </footer>

      {/* ── MODAL CADASTRO ── */}
      {modal && modal !== 'upgrade' && (
        <div style={s.overlayOpen}>
          <div style={s.modalBox}>
            <button style={s.closeBtn} onClick={() => setModal(null)}>×</button>
            <div style={{ fontSize: 10, color: 'rgba(80,200,255,0.35)', letterSpacing: '.15em', marginBottom: '.5rem' }}>SYNAPSYS AI</div>
            <h3 style={s.modalTitle}>{isPremium ? 'Criar sua conta' : 'Criar sua conta grátis'}</h3>
            <p style={s.modalSub}>{isPremium ? 'Você será direcionado ao checkout após o cadastro' : 'Acesso gratuito · 20 mensagens por dia'}</p>
            <input style={s.input} placeholder="Seu nome" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <input style={s.input} type="email" placeholder="Seu e-mail" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            <input style={s.input} type="password" placeholder="Criar senha" value={form.pass} onChange={e => setForm(p => ({ ...p, pass: e.target.value }))} />
            <button style={s.btnRegister} onClick={handleRegister}>{isPremium ? 'Criar conta e ir para o checkout →' : 'Criar conta e entrar →'}</button>
          </div>
        </div>
      )}

      {/* ── MODAL UPGRADE ── */}
      {modal === 'upgrade' && (
        <div style={s.overlayOpen}>
          <div style={s.upgradeBox}>
            <div style={s.upgradeIcon}><div style={s.upgradeCore} /></div>
            <div style={{ fontSize: 10, color: 'rgba(80,200,255,0.35)', letterSpacing: '.15em', marginBottom: '.5rem' }}>LIMITE ATINGIDO</div>
            <h3 style={{ ...s.modalTitle, textAlign: 'center' }}>Suas 20 sinapses<br />diárias foram usadas</h3>
            <p style={{ fontSize: 13, color: 'rgba(100,170,210,0.5)', lineHeight: 1.7, margin: '1rem 0 2rem' }}>Volte amanhã gratuitamente ou ative o plano premium agora — sinapses ilimitadas, relatórios em PDF e muito mais.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button style={s.btnPlanMain} onClick={() => { setModal(null); navigate('/checkout?plan=premium') }}>Ativar premium — R$ 59,90/mês →</button>
              <button style={s.btnPlanOutline} onClick={() => setModal(null)}>Voltar amanhã no plano gratuito</button>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(80,130,160,0.3)', marginTop: '1rem' }}>Primeiro mês R$ 59,90 · Cancele quando quiser</p>
          </div>
        </div>
      )}

      {/* ── CHAT GRATUITO ── */}
      {chatOpen && (
        <div style={s.chatFull}>
          <div style={s.chatHeader}>
            <div style={s.chatHeaderDot} />
            <span style={s.chatName}>SYNAPSYS AI</span>
            <span style={s.chatPlan}>plano gratuito · {DAILY_LIMIT - msgCount} sinapses restantes</span>
            <button style={s.chatExitBtn} onClick={() => setChatOpen(false)}>← sair</button>
          </div>
          <div style={s.chatMsgs} ref={msgsRef}>
            {chatHistory.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: m.role === 'ai' ? 'rgba(26,111,187,0.35)' : 'rgba(13,158,120,0.25)', border: `0.5px solid ${m.role === 'ai' ? 'rgba(80,200,255,0.3)' : 'rgba(48,240,192,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: m.role === 'ai' ? '#50c8ff' : '#30f0c0', flexShrink: 0 }}>{m.role === 'ai' ? 'S' : 'U'}</div>
                <div style={{ background: m.role === 'ai' ? 'rgba(26,111,187,0.18)' : 'rgba(13,158,120,0.18)', border: `0.5px solid ${m.role === 'ai' ? 'rgba(80,200,255,0.18)' : 'rgba(48,240,192,0.18)'}`, borderRadius: m.role === 'ai' ? '9px 9px 9px 2px' : '9px 9px 2px 9px', padding: '9px 12px', fontSize: 12, lineHeight: 1.6, color: m.role === 'ai' ? 'rgba(180,220,255,0.88)' : 'rgba(140,240,200,0.88)', maxWidth: 420 }}>
                  {m.text}
                  {m.note && <div style={{ fontSize: 10, color: 'rgba(80,200,255,0.35)', marginTop: 4 }}>{m.note}</div>}
                </div>
              </div>
            ))}
          </div>
          <div style={s.chatBar}>
            <textarea style={s.chatInput} rows={1} placeholder="disparar sinapse..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() } }} />
            <button style={s.chatSendBtn} onClick={sendMsg}>disparar ↗</button>
          </div>
        </div>
      )}
    </div>
  )
}
