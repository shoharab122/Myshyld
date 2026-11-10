import { createClient } from '@supabase/supabase-js'
// Read the email-link state before supabase-js strips it from the URL
const hashq = typeof location !== 'undefined' ? location.hash + location.search : ''
export const RECOVERY_LINK = /type=recovery/.test(hashq)
export const LINK_EXPIRED = /error_code=otp_expired|error_description=[^&]*expired/i.test(hashq)
const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_ANON_KEY
// Only the public anon key is used here. NEVER put the service_role key or any payment secret in frontend code.
export const supabase = url && key ? createClient(url, key) : null

const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

// ---------------- Small safe helpers ----------------
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max)
const mail = v => str(v, 254).toLowerCase()
const isUuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
const rand = n => { // secure random integer in [0, n)
  try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n } catch { return Math.floor(Math.random() * n) }
}

export async function getCategories() {
  if (supabase) {
    try { const { data, error } = await supabase.from('categories').select('*').order('created_at'); if (!error && data) return data } catch {}
    return null // keep whatever the screen already shows when the store is unreachable
  }
  return ls('ms_cats', [])
}
export async function addCategory(name, icon) {
  name = str(name, 80); icon = str(icon, 16)
  if (!name) throw new Error('Category name is required.')
  if (supabase) { const { data, error } = await supabase.from('categories').insert({ name, icon }).select().single(); if (error) throw error; return data }
  const c = { id: 'c' + Date.now(), name, icon }; sv('ms_cats', [...ls('ms_cats', []), c]); return c
}
export async function deleteCategory(id) {
  if (supabase) { const { error } = await supabase.from('categories').delete().eq('id', id); if (error) throw error; return }
  sv('ms_cats', ls('ms_cats', []).filter(c => c.id !== id))
}
export async function getProducts() {
  if (supabase) {
    try { const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false }); if (!error && data) return data.filter(p => p.is_active !== false) } catch {}
    return null
  }
  return ls('ms_prods', [])
}
export async function addProduct(p) {
  const row = { variants: [{ label: 'Standard', mult: 1 }], features: ['100% original product', 'Discreet packaging'], rating: 4.5, reviews: 0, is_active: true, ...p }
  if (supabase) { const { data, error } = await supabase.from('products').insert(row).select().single(); if (error) throw error; return data }
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
  if (m.includes('weak') || m.includes('at least')) return 'Password is too weak. Use at least 6 characters.'
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
  // Optional: needs the "profiles" table. If it doesn't exist yet this is ignored and metadata is used.
  try { const { data } = await supabase.from('profiles').select('name,phone').eq('user_id', au.id).maybeSingle(); prof = data } catch {}
  const u = toUser(au, admin)
  if (prof?.phone) { u.mobile = prof.phone; u.phone = prof.phone }
  sv('ms_user', u); return u
}
const localUser = (name, phone) => { const u = { id: 'local', name: name || 'Guest', phone }; sv('ms_user', u); return u }

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
export async function saveProfile(userId, { name, phone } = {}) {
  if (!supabase || !isUuid(userId)) return
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
export async function placeOrder(o) {
  // Client can never choose status or payment fields: they are forced to the plain COD values the database policy allows.
  const { payment_status, payment_ref, ...safe } = o || {}
  const order = { ...safe, order_no: 'MSD' + (10000 + rand(89999)), status: 0, created_at: new Date().toISOString() }
  if (supabase && o.user_id && o.user_id !== 'local') try { const { data, error } = await supabase.from('orders').insert(order).select().single(); if (!error) return data } catch {}
  const n = { id: 'o' + Date.now(), ...order }; sv('ms_orders', [n, ...ls('ms_orders', [])]); return n
}
export async function getOrders(uid) {
  // .eq('user_id') is defense in depth on top of the RLS policy
  if (supabase && uid && uid !== 'local') try { const { data, error } = await supabase.from('orders').select('*').eq('user_id', uid).order('created_at', { ascending: false }); if (!error) return data } catch {}
  return ls('ms_orders', [])
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
