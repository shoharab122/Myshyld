import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = url && key ? createClient(url, key) : null

const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

export async function getCategories() {
  if (supabase) {
    try { const { data, error } = await supabase.from('categories').select('*').order('created_at'); if (!error && data) return data } catch {}
    return null // keep whatever the screen already shows when the store is unreachable
  }
  return ls('ms_cats', [])
}
export async function addCategory(name, icon) {
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
export async function signIn(id, pw, signup) {
  if (supabase && id.includes('@')) try {
    const r = signup ? await supabase.auth.signUp({ email: id, password: pw }) : await supabase.auth.signInWithPassword({ email: id, password: pw })
    if (!r.error && r.data.user) return { id: r.data.user.id, name: id.split('@')[0], phone: id }
  } catch {}
  const u = { id: 'local', name: id.split('@')[0] || 'Guest', phone: id }; sv('ms_user', u); return u
}
export const getUser = () => ls('ms_user', null)
export const signOut = async () => { try { await supabase?.auth.signOut() } catch {} localStorage.removeItem('ms_user') }
export async function placeOrder(o) {
  const order = { order_no: 'MSD' + Math.floor(10000 + Math.random() * 89999), status: 0, created_at: new Date().toISOString(), ...o }
  if (supabase && o.user_id && o.user_id !== 'local') try { const { data, error } = await supabase.from('orders').insert(order).select().single(); if (!error) return data } catch {}
  const n = { id: 'o' + Date.now(), ...order }; sv('ms_orders', [n, ...ls('ms_orders', [])]); return n
}
export async function getOrders(uid) {
  if (supabase && uid && uid !== 'local') try { const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }); if (!error) return data } catch {}
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
