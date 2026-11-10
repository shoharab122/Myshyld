import { createClient } from '@supabase/supabase-js'
// Read the email-link state before supabase-js strips it from the URL
const hashq = typeof location !== 'undefined' ? location.hash + location.search : ''
export const RECOVERY_LINK = /type=recovery/.test(hashq)
export const LINK_EXPIRED = /error_code=otp_expired|error_description=[^&]*expired/i.test(hashq)
const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_ANON_KEY
// Only the public anon key is used here. NEVER put the service_role key or any payment secret in frontend code.
export const supabase = url && key ? createClient(url, key) : null
// Offline/demo mode (no Supabase, localStorage only) is allowed ONLY in local development.
// In a production build a missing config fails loudly instead of letting anyone "log in".
const DEV = !!import.meta.env.DEV
const NEEDS_SETUP = 'The store is not configured. Please try again later.'

const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

// ---------------- Small safe helpers ----------------
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max)
const mail = v => str(v, 254).toLowerCase()
const isUuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

export async function getCategories() {
  if (supabase) {
    try { const { data, error } = await supabase.from('categories').select('*').order('created_at'); if (!error && data) return data } catch {}
    return null // keep whatever the screen already shows when the store is unreachable
  }
  return DEV ? ls('ms_cats', []) : null
}
export async function addCategory(name, icon) {
  name = str(name, 80); icon = str(icon, 16)
  if (!name) throw new Error('Category name is required.')
  if (supabase) { const { data, error } = await supabase.from('categories').insert({ name, icon }).select().single(); if (error) throw error; return data }
  if (!DEV) throw new Error(NEEDS_SETUP)
  const c = { id: 'c' + Date.now(), name, icon }; sv('ms_cats', [...ls('ms_cats', []), c]); return c
}
export async function deleteCategory(id) {
  if (supabase) { const { error } = await supabase.from('categories').delete().eq('id', id); if (error) throw error; return }
  if (!DEV) throw new Error(NEEDS_SETUP)
  sv('ms_cats', ls('ms_cats', []).filter(c => c.id !== id))
}
export async function getProducts() {
  if (supabase) {
    try { const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false }); if (!error && data) return data.filter(p => p.is_active !== false) } catch {}
    return null
  }
  return DEV ? ls('ms_prods', []) : null
}
export async function addProduct(p) {
  const row = { variants: [{ label: 'Standard', mult: 1 }], features: ['100% original product', 'Discreet packaging'], rating: 4.5, reviews: 0, is_active: true, ...p }
  if (supabase) { const { data, error } = await supabase.from('products').insert(row).select().single(); if (error) throw error; return data }
  if (!DEV) throw new Error(NEEDS_SETUP)
  const n = { id: 'u' + Date.now(), emoji: '🛍️', ...row }; sv('ms_prods', [...ls('ms_prods', []), n]); return n
}
// ---------------- Auth ----------------
const friendly = e => {
  const m = String(e?.message || '').toLowerCase()
  if (m.includes('invalid login')) return 'Wrong email or password.'
  if (m.includes('not confirmed')) return 'Please confirm your email first. Check your inbox.'
  if (m.includes('rate limit') || e?.status === 429) return 'Too many attempts. Please wait a few minutes and try again.'
  if (m.includes('already registered')) return 'This email is already registered. Please log in.'
  if (m.includes('different from the old') || m.includes('same password')) return 'Choose a password different from your old one.'
  if (m.includes('weak') || m.includes('at least')) return 'Password is too weak. Use at least 8 characters with letters and numbers.'
  return e?.message || 'Something went wrong. Please try again.'
}
const toUser = (u, admin = false) => {
  const mobile = u.user_metadata?.phone || ''
  return { id: u.id, name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Guest', phone: mobile || u.email, mobile, email: u.email, is_admin: admin }
}
// NOTE: is_admin here (and in the cached ms_user) is for showing/hiding UI only.
// Real protection is the database: RLS policies use is_admin() on the server, so a tampered flag grants nothing.
async function buildUser(au) {
  let admin = false, prof = null
  try { const { data } = await supabase.from('admins').select('user_id').eq('user_id', au.id).maybeSingle(); admin = !!data } catch {}
  // Needs the "profiles" table (created by supabasesecurity.sql). If it is missing this is ignored.
  try { const { data } = await supabase.from('profiles').select('name,phone').eq('user_id', au.id).maybeSingle(); prof = data } catch {}
  const u = toUser(au, admin)
  if (prof?.phone) { u.mobile = prof.phone; u.phone = prof.phone }
  sv('ms_user', u); return u
}
const localUser = (name, phone) => {
  if (!DEV) throw new Error(NEEDS_SETUP) // never a passwordless login in production
  const u = { id: 'local', name: name || 'Guest', phone }; sv('ms_user', u); return u
}

export async function signUp({ name, phone, email, password }) {
  name = str(name, 100); phone = str(phone, 20); email = mail(email)
  if (!supabase) return localUser(name, phone)
  const { data, error } = await supabase.auth.signUp({
    email, password, options: { data: { full_name: name, phone }, emailRedirectTo: window.location.origin },
  })
  if (error) throw new Error(friendly(error))
  // Supabase returns a user with no identities when the email already exists
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error('This email is already registered. Please log in.')
  if (!data.session) return { needsConfirm: true } // "Confirm email" is on: they must click the link we emailed
  return buildUser(data.user)
}
export async function signIn(email, password) {
  email = mail(email)
  if (!supabase) return localUser(email.split('@')[0], email)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(friendly(error))
  return buildUser(data.user)
}
export async function resetPassword(email) {
  email = mail(email)
  if (!supabase) throw new Error('Password reset is unavailable right now.')
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
  if (error) throw new Error(friendly(error))
}
export async function updatePassword(password) {
  if (!supabase) throw new Error('Password reset is unavailable right now.')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(friendly(error))
}
export async function signInWithGoogle() {
  if (!supabase) throw new Error('Google login is unavailable right now.')
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  if (error) throw new Error(friendly(error))
}
export async function restoreUser() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data?.session?.user ? buildUser(data.session.user) : null
}
export const isAdmin = u => !!u?.is_admin
export const getUser = () => ls('ms_user', null)
export const signOut = async () => { try { await supabase?.auth.signOut() } catch {} try { localStorage.removeItem('ms_user') } catch {} }

// Saves name/phone to the "profiles" table (e.g. ask Google users for a phone at checkout).
// The id always comes from the signed-in session, and RLS enforces user_id = auth.uid() on the server.
export async function saveProfile(userId, { name, phone } = {}) {
  if (!supabase || !isUuid(userId)) return
  const { data: s } = await supabase.auth.getSession()
  if (s?.session?.user?.id !== userId) throw new Error('Please sign in again.')
  const { error } = await supabase.from('profiles').upsert({ user_id: userId, name: str(name, 100), phone: str(phone, 20), updated_at: new Date().toISOString() })
  if (error) throw error
  const u = getUser()
  if (u && u.id === userId) { if (phone) { u.mobile = str(phone, 20); u.phone = u.mobile } if (name) u.name = str(name, 100); sv('ms_user', u) }
}

// Fires after Google / email-confirmation redirects, password-recovery links and sign-out.
export function onAuthChange(cb) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') return cb(null, event)
    if (event === 'SIGNED_OUT') { try { localStorage.removeItem('ms_user') } catch {} return cb(null, event) }
    // never await another supabase call inside this callback (it can deadlock), so defer it
    if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) setTimeout(() => buildUser(session.user).then(u => cb(u, event)).catch(() => {}), 0)
  })
  return () => data.subscription.unsubscribe()
}

// Cash-on-Delivery order. Only {id, variant, qty}, the promo code and the address are sent.
// The database function place_order() prices the cart, applies the promo, checks and reduces stock,
// and creates the order number. Any total/price sent from the browser is ignored.
// The returned order holds the REAL total: show that one to the customer.
export async function placeOrder(o) {
  const items = (Array.isArray(o?.items) ? o.items : []).map(i => ({ id: i.id, variant: i.variant || null, qty: i.qty }))
  const promo = str(o?.promo ?? o?.promo_code ?? '', 40)
  const address = {
    name: str(o?.address?.name, 80), phone: str(o?.address?.phone, 20),
    address: str(o?.address?.address, 300), note: str(o?.address?.note, 300),
  }
  if (supabase && o?.user_id && o.user_id !== 'local') {
    if (!items.length) throw new Error('Your cart is empty.')
    const { data, error } = await supabase.rpc('place_order', { p_items: items, p_promo: promo, p_address: address, p_payment: 'Cash on Delivery' })
    if (error) throw new Error(friendlyOrder(error)) // never pretend an order succeeded
    return data
  }
  if (!DEV) throw new Error('Please sign in to place an order.')
  // local demo mode (development only)
  const order = { id: 'o' + Date.now(), order_no: 'MSD' + (10000 + Math.floor(Math.random() * 89999)), status: 0, created_at: new Date().toISOString(), ...o }
  sv('ms_orders', [order, ...ls('ms_orders', [])]); return order
}
const friendlyOrder = e => {
  const m = String(e?.message || '')
  // messages raised on purpose by place_order() are safe and useful to show
  if (/cart|stock|available|option|quantity|delivery details|Too many|sign in|total|choose/i.test(m)) return m
  return 'Could not place your order. Please try again.'
}
export async function getOrders(uid) {
  // .eq('user_id') is defense in depth on top of the RLS policy
  if (supabase && uid && uid !== 'local') try { const { data, error } = await supabase.from('orders').select('*').eq('user_id', uid).order('created_at', { ascending: false }); if (!error) return data } catch {}
  return DEV ? ls('ms_orders', []) : []
}

export async function getHero() {
  if (!supabase) return null
  try {
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'hero').maybeSingle()
    const s = (data?.value?.slides || []).filter(x => x.on !== false && (x.lines || '').trim())
    return s.length ? s.map(x => ({ lines: x.lines.split('\n').filter(Boolean).join('|'), chip: x.chip, emoji: x.emoji, image: x.image })) : null
  } catch { return null }
}

// Online payments (bKash / Nagad). The server prices the cart from the database and talks to the gateway;
// the browser only receives a payment-page URL to redirect to.
export async function startOnlinePayment({ provider, items, promo, address }) {
  if (!supabase) throw new Error('Online payment is unavailable right now.')
  const { data, error } = await supabase.functions.invoke('pay-create', {
    body: { provider, promo, address, items: items.map(i => ({ id: i.id, variant: i.variant, qty: i.qty })) },
  })
  if (error) {
    let msg = ''
    try { msg = (await error.context.json()).error } catch { /* not JSON */ }
    throw new Error(msg || 'Could not start payment. Please try again.')
  }
  if (!data?.url) throw new Error('Could not start payment. Please try again.')
  // Only follow https payment URLs returned by the server
  if (!/^https:\/\//i.test(String(data.url))) throw new Error('Could not start payment. Please try again.')
  return data.url
}
export async function getOrderByNo(no) {
  if (!supabase) return null
  try {
    await supabase.auth.getSession()
    const { data } = await supabase.from('orders').select('*').eq('order_no', str(no, 40)).maybeSingle()
    return data || null
  } catch { return null }
}
