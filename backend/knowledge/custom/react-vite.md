# React + Vite — Guia Técnico

## O que é React
React é uma biblioteca JavaScript para criar interfaces de usuário. Usa componentes reutilizáveis e atualiza o DOM de forma eficiente via Virtual DOM.

## Vite
Vite é o build tool moderno que substitui o Create React App. Muito mais rápido no desenvolvimento e build.

npm create vite@latest meu-app -- --template react
cd meu-app
npm install
npm run dev

## Componentes

### Componente funcional (padrão atual)
function MeuComponente({ nome, idade }) {
  return (
    <div>
      <h1>{nome}</h1>
      <p>Idade: {idade}</p>
    </div>
  )
}
export default MeuComponente

### Props
// Passar props
<MeuComponente nome="João" idade={30} ativo={true} onClick={() => console.log('clicou')} />

// Receber props com desestruturação
function Card({ titulo, descricao, cor = 'azul', onClick }) {
  return <div style={{ color: cor }} onClick={onClick}>{titulo}</div>
}

### Children
function Modal({ children, onClose }) {
  return (
    <div className="modal">
      {children}
      <button onClick={onClose}>Fechar</button>
    </div>
  )
}

// Uso
<Modal onClose={() => setOpen(false)}>
  <p>Conteúdo do modal</p>
</Modal>

## Hooks essenciais

### useState — estado do componente
import { useState } from 'react'

function Contador() {
  const [count, setCount] = useState(0)
  const [user, setUser] = useState({ name: '', email: '' })
  const [items, setItems] = useState([])

  // Atualizar objeto
  setUser(prev => ({ ...prev, name: 'João' }))

  // Atualizar array
  setItems(prev => [...prev, novoItem])
  setItems(prev => prev.filter(i => i.id !== id))
  setItems(prev => prev.map(i => i.id === id ? { ...i, ativo: true } : i))

  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}

### useEffect — efeitos colaterais
import { useEffect } from 'react'

function Componente({ userId }) {
  const [user, setUser] = useState(null)

  // Roda uma vez ao montar
  useEffect(() => {
    console.log('montou')
    return () => console.log('desmontou') // cleanup
  }, [])

  // Roda quando userId muda
  useEffect(() => {
    async function carregarUser() {
      const res = await fetch('/api/users/' + userId)
      const data = await res.json()
      setUser(data)
    }
    carregarUser()
  }, [userId])
}

### useRef — referência sem re-render
import { useRef } from 'react'

function Input() {
  const inputRef = useRef(null)

  function focarInput() {
    inputRef.current.focus()
  }

  return <input ref={inputRef} />
}

### useMemo — memoriza valor calculado
import { useMemo } from 'react'

const total = useMemo(() => {
  return items.reduce((acc, item) => acc + item.preco, 0)
}, [items])

### useCallback — memoriza função
import { useCallback } from 'react'

const handleClick = useCallback(() => {
  console.log(id)
}, [id])

### useContext — estado global
import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

// Uso em qualquer componente
const { user, setUser } = useAuth()

## React Router (roteamento)
npm install react-router-dom

import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

// Navegar programaticamente
const navigate = useNavigate()
navigate('/dashboard')
navigate('/login', { replace: true })

// Pegar parâmetros da URL
const { id } = useParams()

// Link entre páginas
<Link to="/dashboard">Ir para dashboard</Link>

## Fetch de dados com async/await
function Usuarios() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true)
        const res = await fetch('https://api.com/users', {
          headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
        })
        if (!res.ok) throw new Error('Erro ' + res.status)
        const data = await res.json()
        setUsers(data)
      } catch(e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [])

  if (loading) return <p>Carregando...</p>
  if (error) return <p>Erro: {error}</p>
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}

## Formulários
function FormLogin() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.token) localStorage.setItem('token', data.token)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={form.email} onChange={e => set('email', e.target.value)} type="email" />
      <input value={form.password} onChange={e => set('password', e.target.value)} type="password" />
      <button type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
    </form>
  )
}

## Variáveis de ambiente no Vite
No arquivo .env:
VITE_API_URL=https://api.meuapp.com
VITE_APP_NAME=Meu App

Acessar no código:
const API = import.meta.env.VITE_API_URL
const nome = import.meta.env.VITE_APP_NAME

Nunca usar process.env no Vite — use import.meta.env

## Boas práticas
- Um componente por arquivo
- Nomes de componentes com PascalCase (MeuComponente)
- Hooks só dentro de componentes ou outros hooks
- Nunca chamar hooks dentro de condicionais ou loops
- Keys únicas em listas (nunca usar index como key se a lista muda)
- Separar lógica de negócio em hooks customizados (useUsuarios, useAuth)
- Evitar prop drilling excessivo — usar Context ou estado global
