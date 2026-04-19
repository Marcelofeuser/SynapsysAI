import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lmxrmbkbsctmwxtukhgn.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxteHJtYmtic2N0bXd4dHVraGduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MjYzMDIsImV4cCI6MjA5MTUwMjMwMn0.r_8zwmO8xB-vYqMIHTQeK2a6ptsfR5fTDfmuRGJGdeM'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Registrar novo usuário
export async function signUp(email, password, name) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }
  })
  if (authError) throw authError

  // Cria perfil na tabela users
  if (authData.user) {
    await supabase.from('users').insert({
      id: authData.user.id,
      email,
      name
    })
  }
  return authData
}

// Login
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

// Logout
export async function signOut() {
  await supabase.auth.signOut()
}

// Usuário atual
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Acesso e limite de mensagens do usuário
export async function getUserAccess(userId) {
  const { data, error } = await supabase
    .from('synapsys_access')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) return null
  return data
}

// Usar uma mensagem (chama função do banco)
export async function useMessage(userId) {
  const { data, error } = await supabase.rpc('use_message', { p_user_id: userId })
  if (error) return { allowed: false, reason: 'error' }
  return data
}

// Atualizar plano após pagamento Stripe
export async function upgradePlan(userId, plan, stripeSubscriptionId) {
  const limit = plan === 'free' ? 20 : 0 // 0 = ilimitado

  await supabase.from('users').update({
    plan,
    stripe_subscription_id: stripeSubscriptionId,
    subscription_status: 'active'
  }).eq('id', userId)

  await supabase.from('synapsys_access').update({
    tier: plan,
    status: 'active',
    daily_message_limit: limit
  }).eq('user_id', userId)
}
