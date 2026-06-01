# OpenAI API — Guia Técnico Completo

## O que é a OpenAI API
API da OpenAI que permite usar modelos de linguagem (GPT) para gerar texto, analisar dados, criar embeddings, transcrever áudio e muito mais.

## Modelos disponíveis (2025)
GPT-4.1-mini      — rápido, econômico, bom para a maioria das tarefas
GPT-4.1           — mais capaz, melhor raciocínio
GPT-4o            — multimodal (texto + imagem), balanceado
GPT-4o-mini       — mais rápido e econômico que 4o
o1-mini           — raciocínio lento mas muito preciso
o3-mini           — mais recente, raciocínio avançado

## Instalação e configuração
npm install openai

import OpenAI from 'openai'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

## Chat Completions (principal)
const response = await openai.chat.completions.create({
  model: 'gpt-4.1-mini',
  messages: [
    { role: 'system', content: 'Você é um assistente especialista em DISC.' },
    { role: 'user', content: 'O que é o perfil D no DISC?' }
  ],
  max_tokens: 1000,
  temperature: 0.7,
})

const texto = response.choices[0].message.content

## Parâmetros importantes
temperature: 0 a 2
  0.0 — determinístico, respostas sempre iguais (bom para dados)
  0.7 — balanceado (padrão para conversas)
  1.0 — criativo
  2.0 — muito aleatório

max_tokens: limite de tokens na resposta
  1 token ≈ 0.75 palavras em português
  1000 tokens ≈ 750 palavras

top_p: alternativa ao temperature (0 a 1)
presence_penalty: penaliza repetição de tópicos (-2 a 2)
frequency_penalty: penaliza repetição de palavras (-2 a 2)

## Streaming (resposta em tempo real)
const stream = await openai.chat.completions.create({
  model: 'gpt-4.1-mini',
  messages: [{ role: 'user', content: 'Me explique o DISC' }],
  stream: true,
})

for await (const chunk of stream) {
  const texto = chunk.choices[0]?.delta?.content || ''
  process.stdout.write(texto)
}

## Sistema de mensagens (roles)
system: instrução de comportamento da IA (system prompt)
user: mensagem do usuário
assistant: resposta anterior da IA (para manter contexto)

Conversa multi-turno:
messages: [
  { role: 'system', content: 'Você é um coach de carreira.' },
  { role: 'user', content: 'Como melhorar meu perfil no LinkedIn?' },
  { role: 'assistant', content: 'Para melhorar seu perfil...' },
  { role: 'user', content: 'Pode dar exemplos?' }
]

## Embeddings (busca semântica)
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: 'texto para transformar em vetor',
})
const vetor = response.data[0].embedding // array de 1536 números

## Análise de imagem (GPT-4o)
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'O que tem nessa imagem?' },
      { type: 'image_url', image_url: { url: 'https://...' } }
    ]
  }]
})

## Transcrição de áudio (Whisper)
import fs from 'fs'
const transcricao = await openai.audio.transcriptions.create({
  file: fs.createReadStream('audio.mp3'),
  model: 'whisper-1',
  language: 'pt',
})
console.log(transcricao.text)

## Contagem de tokens e custos
Preços aproximados (GPT-4.1-mini):
Input:  $0.15 por 1M tokens
Output: $0.60 por 1M tokens

Para contar tokens antes de enviar:
npm install js-tiktoken

import { encoding_for_model } from 'js-tiktoken'
const enc = encoding_for_model('gpt-4')
const tokens = enc.encode('seu texto aqui').length

## Boas práticas
- Guardar histórico de conversas para contexto multi-turno
- Usar temperature 0 para tarefas que precisam de precisão (código, dados)
- System prompt claro e específico melhora muito a qualidade
- Limitar max_tokens para controlar custos
- Implementar retry com backoff exponencial para erros de rate limit
- Nunca expor a API key no frontend

## Tratamento de erros
try {
  const response = await openai.chat.completions.create({...})
} catch (error) {
  if (error.status === 429) // rate limit — espere e tente novamente
  if (error.status === 401) // API key inválida
  if (error.status === 500) // erro no servidor da OpenAI
  if (error.code === 'context_length_exceeded') // contexto muito longo
}
