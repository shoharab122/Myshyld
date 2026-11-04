import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = url && key ? createClient(url, key) : null

const V = { condom: [{ label: '3 pcs', mult: 1 }, { label: '10 pcs', mult: 3 }, { label: '20 pcs', mult: 5.5 }], pad: [{ label: 'Regular', mult: 1 }, { label: 'Large', mult: 1.15 }, { label: 'XL', mult: 1.3 }, { label: 'Overnight', mult: 1.4 }] }
export const SEED_CATS = [{ id: 'condoms', name: 'Condoms', icon: '🛡️' }, { id: 'pads', name: 'Sanitary Pads', icon: '🌸' }]
export const SEED_PRODUCTS = [
  { id: 'p1', category_id: 'condoms', name: 'Durex Extra Safe', brand: 'Durex', tag: 'Regular', price: 460, rating: 4.8, reviews: 1200, emoji: '🟦', variants: V.condom, features: ['Extra protection', 'Comfortable fit', '100% original product', 'Discreet packaging'] },
  { id: 'p2', category_id: 'condoms', name: 'Durex Regular', brand: 'Durex', tag: 'Regular', price: 450, rating: 4.7, reviews: 860, emoji: '🟦', variants: V.condom, features: ['Reliable protection', '100% original product', 'Discreet packaging'] },
  { id: 'p3', category_id: 'condoms', name: 'Durex Extra Thin', brand: 'Durex', tag: 'Thin', price: 460, rating: 4.6, reviews: 640, emoji: '🟥', variants: V.condom, features: ['Ultra thin feel', '100% original product', 'Discreet packaging'] },
  { id: 'p4', category_id: 'condoms', name: 'Durex Strawberry', brand: 'Durex', tag: 'Flavoured', price: 480, rating: 4.5, reviews: 410, emoji: '🍓', variants: V.condom, features: ['Fruity flavour', '100% original product', 'Discreet packaging'] },
  { id: 'p5', category_id: 'condoms', name: 'SKORE Regular', brand: 'Skore', tag: 'Regular', price: 420, rating: 4.4, reviews: 300, emoji: '⬛', variants: V.condom, features: ['Smooth lubrication', '100% original product', 'Discreet packaging'] },
  { id: 'p6', category_id: 'condoms', name: 'Manforce Long Last', brand: 'Manforce', tag: 'Longer', price: 430, rating: 4.3, reviews: 220, emoji: '⬛', variants: V.condom, features: ['Longer lasting', '100% original product', 'Discreet packaging'] },
  { id: 'p7', category_id: 'pads', name: 'Always Cotton Soft Ultra Thin', brand: 'Always', tag: 'Ultra Thin', price: 320, rating: 4.7, reviews: 980, emoji: '🌸', variants: V.pad, features: ['Ultra soft & comfortable', 'Leak protection', 'Individually wrapped', 'Discreet packaging'] },
  { id: 'p8', category_id: 'pads', name: 'Always Ultra Thin Regular', brand: 'Always', tag: 'Ultra Thin', price: 320, rating: 4.6, reviews: 700, emoji: '🌸', variants: V.pad, features: ['Leak protection', 'Individually wrapped', 'Discreet packaging'] },
]
const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

export async function getCategories() {
  if (supabase) try { const { data, error } = await supabase.from('categories').select('*').order('created_at'); if (!error && data?.length) return data } catch {}
  return [...SEED_CATS, ...ls('ms_cats', [])]
}
export async function addCategory(name, icon) {
  if (supabase) try { const { data, error } = await supabase.from('categories').insert({ name, icon }).select().single(); if (!error) return data } catch {}
  const c = { id: 'c' + Date.now(), name, icon }; sv('ms_cats', [...ls('ms_cats', []), c]); return c
}
export async function deleteCategory(id) {
  if (supabase) try { await supabase.from('categories').delete().eq('id', id) } catch {}
  sv('ms_cats', ls('ms_cats', []).filter(c => c.id !== id))
}
export async function getProducts() {
  if (supabase) try { const { data, error } = await supabase.from('products').select('*'); if (!error && data?.length) return data } catch {}
  return [...SEED_PRODUCTS, ...ls('ms_prods', [])]
}
export async function addProduct(p) {
  const row = { variants: [{ label: 'Standard', mult: 1 }], features: ['100% original product', 'Discreet packaging'], rating: 4.5, reviews: 0, ...p }
  if (supabase) try { const { data, error } = await supabase.from('products').insert(row).select().single(); if (!error) return data } catch {}
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
    return s.length ? s.map(x => ({ lines: x.lines.split('\n').filter(Boolean).join('|'), emoji: x.emoji, image: x.image })) : null
  } catch { return null }
}