# Prisma ORM — Guia Técnico

## O que é o Prisma
Prisma é um ORM (Object-Relational Mapper) moderno para Node.js e TypeScript. Permite interagir com bancos de dados usando JavaScript em vez de SQL puro.

## Instalação
npm install prisma @prisma/client
npx prisma init

## Schema (prisma/schema.prisma)
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  plan      String   @default("free")
  role      String   @default("user")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  posts     Post[]
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String?
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
}

## Comandos CLI
npx prisma generate          // gera o client após mudança no schema
npx prisma migrate dev       // cria e aplica migração em desenvolvimento
npx prisma migrate deploy    // aplica migrações em produção
npx prisma studio            // abre interface visual do banco
npx prisma db push           // sincroniza schema sem criar migração
npx prisma db pull           // gera schema a partir do banco existente

## Inicializar o client
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Singleton recomendado para evitar múltiplas conexões
let prismaInstance
export function getPrisma() {
  if (!prismaInstance) prismaInstance = new PrismaClient()
  return prismaInstance
}

## CRUD básico

### Buscar todos
const users = await prisma.user.findMany()

### Buscar com filtro
const proUsers = await prisma.user.findMany({
  where: { plan: 'professional' },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: 0,
})

### Buscar um
const user = await prisma.user.findUnique({
  where: { id: 'uuid-aqui' }
})

const user = await prisma.user.findFirst({
  where: { email: 'user@email.com' }
})

### Criar
const user = await prisma.user.create({
  data: {
    name: 'João Silva',
    email: 'joao@email.com',
    plan: 'professional',
  }
})

### Atualizar
const user = await prisma.user.update({
  where: { id: 'uuid-aqui' },
  data: { plan: 'diamond' }
})

### Upsert (criar ou atualizar)
const user = await prisma.user.upsert({
  where: { email: 'joao@email.com' },
  create: { name: 'João', email: 'joao@email.com' },
  update: { name: 'João Atualizado' }
})

### Deletar
await prisma.user.delete({
  where: { id: 'uuid-aqui' }
})

## Filtros avançados
const users = await prisma.user.findMany({
  where: {
    AND: [
      { plan: { in: ['professional', 'diamond'] } },
      { createdAt: { gte: new Date('2024-01-01') } },
    ],
    OR: [
      { name: { contains: 'João', mode: 'insensitive' } },
      { email: { endsWith: '@empresa.com' } },
    ],
    NOT: { role: 'banned' }
  }
})

## Include (relações)
const userWithPosts = await prisma.user.findUnique({
  where: { id: 'uuid' },
  include: {
    posts: {
      orderBy: { createdAt: 'desc' },
      take: 5,
    }
  }
})

## Select (colunas específicas)
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true }
})

## Transações
const [user, post] = await prisma.$transaction([
  prisma.user.create({ data: { name: 'João', email: 'j@email.com' } }),
  prisma.post.create({ data: { title: 'Post', authorId: 'uuid' } })
])

## Contagem
const total = await prisma.user.count({ where: { plan: 'pro' } })

## Aggregate
const stats = await prisma.order.aggregate({
  _sum: { amount: true },
  _avg: { amount: true },
  _count: true,
})
