# Supabase — Conhecimento Técnico Completo

## O que é o Supabase
Supabase é uma plataforma open-source de backend-as-a-service (BaaS) construída sobre PostgreSQL. Oferece banco de dados, autenticação, storage, funções edge e realtime out of the box.

## Autenticação (supabase.auth)

### Registro de usuário
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'senha123',
  options: { data: { name: 'João Silva', plan: 'pro' } }
})

### Login com senha
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'senha123'
})
// data.session.access_token = JWT do usuário
// data.user = dados do usuário

### Logout
await supabase.auth.signOut()

### Recuperar sessão atual
const { data: { session } } = await supabase.auth.getSession()
const { data: { user } } = await supabase.auth.getUser()

### Magic Link (login sem senha)
await supabase.auth.signInWithOtp({ email: 'user@example.com' })

### Convidar usuário (Admin API — backend only)
const { data, error } = await supabase.auth.admin.inviteUserByEmail('user@example.com', {
  data: { name: 'João', plan: 'professional', role: 'user' },
  redirectTo: 'https://app.com/login'
})

### Criar usuário via Admin (backend only)
const { data, error } = await supabase.auth.admin.createUser({
  email: 'user@example.com',
  password: 'senha123',
  user_metadata: { name: 'João', plan: 'pro' },
  email_confirm: true
})

### Listar usuários (Admin)
const { data, error } = await supabase.auth.admin.listUsers({ perPage: 100, page: 1 })
// data.users = array de usuários com metadata

### Atualizar usuário (Admin)
await supabase.auth.admin.updateUserById(userId, {
  user_metadata: { plan: 'diamond', role: 'admin' }
})

### Deletar usuário (Admin)
await supabase.auth.admin.deleteUser(userId)

## Banco de Dados (supabase.from)

### SELECT básico
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('plan', 'pro')
  .order('created_at', { ascending: false })
  .limit(50)

### SELECT com colunas específicas
const { data } = await supabase
  .from('users')
  .select('id, name, email, plan')

### INSERT
const { data, error } = await supabase
  .from('users')
  .insert({ name: 'João', email: 'joao@email.com', plan: 'pro' })
  .select()

### UPDATE
const { data, error } = await supabase
  .from('users')
  .update({ plan: 'diamond' })
  .eq('id', userId)
  .select()

### DELETE
const { error } = await supabase
  .from('users')
  .delete()
  .eq('id', userId)

### UPSERT (insert ou update)
await supabase.from('profiles').upsert({ id: userId, bio: 'texto' })

### JOIN entre tabelas
const { data } = await supabase
  .from('orders')
  .select('*, users(name, email), products(title, price)')

### Filtros disponíveis
.eq('campo', valor)        // igual
.neq('campo', valor)       // diferente
.gt('campo', valor)        // maior que
.lt('campo', valor)        // menor que
.gte('campo', valor)       // maior ou igual
.lte('campo', valor)       // menor ou igual
.like('campo', '%texto%')  // LIKE SQL
.ilike('campo', '%texto%') // LIKE case-insensitive
.in('campo', [v1, v2])     // IN lista
.is('campo', null)         // IS NULL
.contains('campo', valor)  // contém arrays/json
.range(0, 9)               // paginação por range

## Storage (arquivos)

### Upload de arquivo
const { data, error } = await supabase.storage
  .from('avatars')
  .upload('pasta/arquivo.jpg', file, { contentType: 'image/jpeg', upsert: true })

### URL pública do arquivo
const { data } = supabase.storage.from('avatars').getPublicUrl('pasta/arquivo.jpg')
// data.publicUrl = URL do arquivo

### Listar arquivos
const { data } = await supabase.storage.from('avatars').list('pasta/')

### Deletar arquivo
await supabase.storage.from('avatars').remove(['pasta/arquivo.jpg'])

## Realtime (websockets)

### Escutar mudanças em tabela
const channel = supabase
  .channel('changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
    console.log('Tipo:', payload.eventType) // INSERT, UPDATE, DELETE
    console.log('Novo:', payload.new)
    console.log('Antigo:', payload.old)
  })
  .subscribe()

// Cancelar assinatura
supabase.removeChannel(channel)

## Row Level Security (RLS)
RLS é a segurança por linha do Supabase. Cada tabela pode ter políticas que determinam quem pode ler/escrever.

Política — usuário só vê seus próprios dados:
CREATE POLICY "users_own_data" ON public.profiles
  FOR ALL USING (auth.uid() = user_id);

Política — leitura pública:
CREATE POLICY "public_read" ON public.posts
  FOR SELECT USING (true);

Política — apenas admins podem deletar:
CREATE POLICY "admin_delete" ON public.posts
  FOR DELETE USING (auth.jwt()->>'role' = 'admin');

## Variáveis de ambiente necessárias
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...  (seguro para frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (apenas backend, nunca expor no frontend)

## Inicialização no backend Node.js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

## Inicialização no frontend React
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

## Erros comuns e soluções
- invalid_grant: sessão expirada, fazer login novamente
- JWT expired: token expirado, usar refreshSession()
- row-level security violation: política RLS bloqueando, verificar políticas
- duplicate key: email ou campo único já existe no banco
- Admin API requer SERVICE_ROLE_KEY, não ANON_KEY
- Para usar Admin API, nunca expor a SERVICE_ROLE_KEY no frontend
