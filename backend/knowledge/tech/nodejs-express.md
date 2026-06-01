# Node.js + Express — Guia Técnico

## O que é Node.js
Node.js é um runtime JavaScript do lado do servidor, construído sobre o motor V8 do Chrome. Permite criar APIs, servidores, scripts e ferramentas de linha de comando.

## Módulos ES (ESM) vs CommonJS
ESM (moderno — use este):
import express from 'express'
import { createClient } from '@supabase/supabase-js'
export default function handler() {}
export { minhaFuncao }

CommonJS (legado):
const express = require('express')
module.exports = { minhaFuncao }

Para usar ESM, no package.json:
{ "type": "module" }

## Express — servidor básico
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => console.log('Servidor na porta', PORT))

## Rotas REST padrão
// GET — buscar dados
app.get('/api/users', async (req, res) => {
  const { page = 1, limit = 20 } = req.query
  res.json({ users: [], page, limit })
})

// GET por ID
app.get('/api/users/:id', async (req, res) => {
  const { id } = req.params
  res.json({ user: { id } })
})

// POST — criar
app.post('/api/users', async (req, res) => {
  const { name, email } = req.body
  if (!name || !email) return res.status(400).json({ error: 'Campos obrigatórios' })
  res.status(201).json({ user: { name, email } })
})

// PUT — substituir completamente
app.put('/api/users/:id', async (req, res) => {
  res.json({ updated: true })
})

// PATCH — atualizar parcialmente
app.patch('/api/users/:id', async (req, res) => {
  res.json({ updated: true })
})

// DELETE — deletar
app.delete('/api/users/:id', async (req, res) => {
  res.json({ deleted: true })
})

## Middleware
// Middleware global (roda em todas as rotas)
app.use((req, res, next) => {
  console.log(req.method, req.path)
  next()
})

// Middleware de rota (roda em rotas específicas)
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Não autorizado' })
  next()
}

app.get('/api/protected', requireAuth, (req, res) => {
  res.json({ data: 'protegido' })
})

// Middleware de erro
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: err.message })
})

## Variáveis de ambiente
import dotenv from 'dotenv'
dotenv.config()

const API_KEY = process.env.OPENAI_API_KEY
const DB_URL = process.env.DATABASE_URL

// Nunca colocar valores sensíveis direto no código

## Async/Await e tratamento de erros
// Padrão recomendado
app.get('/api/users', async (req, res) => {
  try {
    const data = await buscarUsuarios()
    res.json({ data })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Helper para evitar try/catch repetitivo
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

app.get('/api/users', asyncHandler(async (req, res) => {
  const data = await buscarUsuarios()
  res.json({ data })
}))

## CORS
import cors from 'cors'

// Aberto para todos (desenvolvimento)
app.use(cors())

// Configurado para produção
app.use(cors({
  origin: ['https://meuapp.com', 'https://www.meuapp.com'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}))

## Status HTTP mais usados
200 OK                  // sucesso
201 Created             // criado com sucesso
204 No Content          // sucesso sem retorno
400 Bad Request         // erro do cliente (dados inválidos)
401 Unauthorized        // não autenticado
403 Forbidden           // autenticado mas sem permissão
404 Not Found           // recurso não encontrado
409 Conflict            // conflito (ex: email duplicado)
422 Unprocessable       // dados válidos mas com erro de lógica
500 Internal Server     // erro do servidor

## Deploy no Railway
1. Criar conta em railway.app
2. Conectar repositório GitHub
3. Railway detecta Node.js automaticamente
4. Adicionar variáveis de ambiente no painel
5. Deploy automático a cada git push

## package.json essencial
{
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "echo 'no build needed'"
  },
  "engines": {
    "node": ">=20"
  }
}
