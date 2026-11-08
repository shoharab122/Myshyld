import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase as sb } from '../api'
import './admin.css'

const ago = d => { const m = Math.max(0, Math.round((Date.now() - new Date(d)) / 6e4)); return m < 1 ? 'Just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.floor(m / 60) + 'h ago' : Math.floor(m / 1440) + 'd ago' }
const ini = n => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
const NEXT = ['Start processing', 'Send out for delivery', 'Mark as delivered']
const RANGES = [['all', 'All time'], ['today', 'Today'], ['7', 'Last 7 days'], ['30', 'Last 30 days']]
const taka = n => '৳' + Math.round(+n || 0).toLocaleString()
const STEPS = ['Placed', 'Processing', 'Out for delivery', 'Delivered']
const IDLE = 20 * 60 * 1000
const fmt = d => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
const wa = p => { const n = (p || '').replace(/\D/g, ''); return 'https://wa.me/' + (n.startsWith('0') ? '88' + n : n) }
const NAV = [['dash', 'Overview', '◫'], ['orders', 'Orders', '▤'], ['wish', 'Wishlist', '♡'], ['products', 'Products', '◧'], ['cats', 'Categories', '▦'], ['hero', 'Hero', '◨']]

async function upload(file, folder) {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type) || file.size > 8e6) throw new Error('Use a PNG, JPG or WebP image under 8 MB')
  const bmp = await createImageBitmap(file), r = Math.min(1, 1200 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  const blob = await new Promise(res => c.toBlob(res, 'image/webp', 0.85))
  const path = `${folder}/${crypto.randomUUID()}.webp`
  const { error } = await sb.storage.from('media').upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000' })
  if (error) throw error
  return sb.storage.from('media').getPublicUrl(path).data.publicUrl
}

const F = ({ l, children }) => <label className="f"><span>{l}</span>{children}</label>
function Modal({ title, onClose, children }) {
  useEffect(() => { const h = e => e.key === 'Escape' && onClose(); addEventListener('keydown', h); return () => removeEventListener('keydown', h) }, [onClose])
  return <div className="mb" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="md" role="dialog" aria-modal="true" aria-label={title}><div className="mh"><b>{title}</b><button className="x" aria-label="Close" onClick={onClose}>✕</button></div><div className="mc">{children}</div></div></div>
}
function Img({ value, onChange, folder, say }) {
  const [b, setB] = useState(false)
  const pick = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; setB(true); try { onChange(await upload(f, folder)) } catch (x) { say(x.message || 'Upload failed') } setB(false) }
  return <div className="img">{value ? <img src={value} alt="" /> : <span>No image</span>}<div><label className="bt g sm">{b ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pick} /></label>{value && <button className="bt g sm" onClick={() => onChange('')}>Remove</button>}</div></div>
}

export default function Admin() {
  const [st, setSt] = useState('loading'), [user, setUser] = useState(null)
  useEffect(() => { document.title = 'MyShield Admin'; const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex,nofollow'; document.head.appendChild(m); return () => m.remove() }, [])
  const check = useCallback(async s => {
    if (!s) { setUser(null); return setSt('login') }
    const { data } = await sb.from('admins').select('user_id').eq('user_id', s.user.id).maybeSingle()
    setUser(s.user); setSt(data ? 'ok' : 'denied')
  }, [])
  useEffect(() => {
    if (!sb) return setSt('nosb')
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, s) => { setTimeout(() => check(s), 0) })
    return () => subscription.unsubscribe()
  }, [check])
  if (st === 'loading') return <div className="adm"><div className="ctr"><i className="spin" /></div></div>
  if (st === 'nosb') return <div className="adm"><div className="ctr"><div className="lg"><h1>Supabase not configured</h1><p className="mut">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild.</p></div></div></div>
  if (st === 'denied') return <div className="adm"><div className="ctr"><div className="lg"><h1>No admin access</h1><p className="mut">{user?.email} is not an admin account. Ask the store owner to add it.</p><button className="bt" onClick={() => sb.auth.signOut()}>Sign out</button></div></div></div>
  if (st === 'login') return <Login />
  return <Shell user={user} />
}

function Login() {
  const [f, setF] = useState({ e: '', p: '' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false), fails = useRef(0), lock = useRef(0)
  const go = async e => {
    e.preventDefault()
    if (Date.now() < lock.current) return setErr('Too many attempts. Wait a minute and try again.')
    setBusy(true); setErr('')
    const { error } = await sb.auth.signInWithPassword({ email: f.e.trim(), password: f.p })
    setBusy(false)
    if (error) { if (++fails.current >= 5) { lock.current = Date.now() + 60000; fails.current = 0 } setErr('Email or password is incorrect.') }
  }
  return <div className="adm"><div className="ctr"><form className="lg" onSubmit={go}><div className="lgo"><img src="/logo-full.webp?v=2" width="150" height="129" alt="MyShield" decoding="async" /><small>Admin</small></div><h1>Sign in</h1>
    <F l="Email"><input className="in" type="email" autoComplete="username" required value={f.e} onChange={e => setF({ ...f, e: e.target.value })} /></F>
    <F l="Password"><input className="in" type="password" autoComplete="current-password" required value={f.p} onChange={e => setF({ ...f, p: e.target.value })} /></F>
    {err && <p className="er" role="alert">{err}</p>}<button className="bt" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form></div></div>
}

function Shell({ user }) {
  const [tab, setTab] = useState(() => { const h = location.hash.slice(1); return NAV.some(n => n[0] === h) ? h : 'dash' }), [d, setD] = useState({ orders: [], products: [], cats: [], wish: [], wishErr: false }), [toast, setToast] = useState(''), [ld, setLd] = useState(true), tt = useRef(0)
  const say = useCallback(m => { setToast(m); clearTimeout(tt.current); tt.current = setTimeout(() => setToast(''), 2400) }, [])
  const go = t => { setTab(t); history.replaceState(null, '', '#' + t); scrollTo(0, 0) }
  const load = useCallback(async () => {
    const [o, p, c, w] = await Promise.all([sb.from('orders').select('*').in('payment_status', ['unpaid', 'paid']).order('created_at', { ascending: false }).limit(500), sb.from('products').select('*').order('created_at', { ascending: false }), sb.from('categories').select('*').order('created_at'), sb.from('wishlists').select('*').order('created_at', { ascending: false }).limit(1000)])
    const er = o.error || p.error || c.error; if (er) say(er.message)
    setD({ orders: o.data || [], products: p.data || [], cats: c.data || [], wish: w.data || [], wishErr: !!w.error }); setLd(false)
  }, [say])
  useEffect(() => { load(); const ch = sb.channel('adm-orders').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => { say('🛍️ New order received'); load() }).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wishlists' }, () => { say('♡ Item added to a wishlist'); load() }).subscribe(); return () => { sb.removeChannel(ch) } }, [load, say])
  useEffect(() => {
    let t; const reset = () => { clearTimeout(t); t = setTimeout(() => sb.auth.signOut(), IDLE) }, ev = ['pointerdown', 'keydown', 'scroll']
    ev.forEach(e => addEventListener(e, reset, { passive: true })); reset()
    return () => { clearTimeout(t); ev.forEach(e => removeEventListener(e, reset)) }
  }, [])
  const pend = d.orders.filter(o => !o.status).length, title = NAV.find(n => n[0] === tab)?.[1] || 'Overview'
  const p = { d, reload: load, say, go }
  return <div className="adm"><nav className="sb"><div className="brand"><span className="bm"><img src="/logo-mark.webp?v=2" width="26" height="22" alt="" decoding="async" /></span>My<b>Shield</b><small>Admin</small></div>
    {NAV.map(([k, l, i]) => <button key={k} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => go(k)}><span aria-hidden="true">{i}</span>{l}{k === 'orders' && pend > 0 && <em>{pend}</em>}</button>)}<div className="sp" /><small className="who">{user.email}</small></nav>
    <main className="mn"><header className="top"><h1>{title}</h1><div><button className="bt g sm" onClick={load}>Refresh</button><button className="bt g sm" onClick={() => sb.auth.signOut()}>Sign out</button></div></header>
      {ld ? <div className="ctr"><i className="spin" /></div> : tab === 'dash' ? <Dash {...p} /> : tab === 'orders' ? <Orders {...p} /> : tab === 'wish' ? <Wish {...p} /> : tab === 'products' ? <Products {...p} /> : tab === 'cats' ? <Cats {...p} /> : tab === 'hero' ? <Hero say={say} /> : <Dash {...p} />}</main>
    {toast && <div className="toast" role="status">{toast}</div>}</div>
}

function Dash({ d, go }) {
  const { orders, products } = d, now = new Date().toDateString()
  const days = [...Array(7)].map((_, i) => { const t = new Date(); t.setDate(t.getDate() - 6 + i); const os = orders.filter(o => new Date(o.created_at).toDateString() === t.toDateString()); return { l: t.toLocaleDateString([], { weekday: 'short' }), v: os.reduce((a, o) => a + +o.total, 0), n: os.length } })
  const max = Math.max(1, ...days.map(x => x.v)), low = products.filter(x => x.stock != null && x.stock <= 5)
  const K = [['Revenue', taka(orders.reduce((a, o) => a + +o.total, 0))], ['Orders today', orders.filter(o => new Date(o.created_at).toDateString() === now).length], ['Awaiting action', orders.filter(o => !o.status).length], ['Live products', products.filter(x => x.is_active !== false).length]]
  return <div className="pg"><div className="kp">{K.map(([l, v]) => <div className="cd" key={l}><small>{l}</small><b>{v}</b></div>)}</div>
    <div className="two"><section className="cd"><h2>Revenue, last 7 days</h2><div className="bars">{days.map(x => <div key={x.l} title={`${x.n} orders`}><i style={{ height: Math.max(3, x.v / max * 100) + '%' }} /><small>{x.l}</small><span>{x.v ? taka(x.v) : ''}</span></div>)}</div></section>
      <section className="cd"><h2>Low stock</h2>{low.length ? low.slice(0, 6).map(x => <div className="ln" key={x.id}><span>{x.name}</span><b className={x.stock ? 'wn' : 'er'}>{x.stock ? x.stock + ' left' : 'Sold out'}</b></div>) : <p className="mut">Nothing running low. Set a stock count on a product to track it.</p>}</section></div>
    <section className="cd"><div className="rh"><h2>Recent orders</h2><button className="bt g sm" onClick={() => go('orders')}>View all</button></div>{orders.slice(0, 5).map(o => <div className="ln" key={o.id}><span>#{o.order_no} · {o.address?.name}</span><span className={'pl s' + (o.status || 0)}>{STEPS[o.status || 0]}</span><b>{taka(o.total)}</b></div>)}{!orders.length && <p className="mut">No orders yet.</p>}</section></div>
}

function Orders({ d: { orders }, reload, say }) {
  const [f, setF] = useState('all'), [q, setQ] = useState(''), [rg, setRg] = useState('all'), [sel, setSel] = useState(null), [busy, setBusy] = useState(false)
  const base = useMemo(() => {
    const k = q.toLowerCase(), now = new Date()
    return orders.filter(o => {
      const t = new Date(o.created_at)
      const okR = rg === 'all' || (rg === 'today' ? t.toDateString() === now.toDateString() : now - t <= +rg * 864e5)
      return okR && (!k || `${o.order_no} ${o.address?.name} ${o.address?.phone} ${o.address?.address}`.toLowerCase().includes(k))
    })
  }, [orders, q, rg])
  const cnt = useMemo(() => { const m = [0, 0, 0, 0]; base.forEach(o => { m[o.status || 0]++ }); return m }, [base])
  const list = useMemo(() => f === 'all' ? base : base.filter(o => (o.status || 0) === +f), [base, f])
  const sum = list.reduce((a, o) => a + +o.total, 0)
  const setStatus = async (o, s) => {
    if (busy || s === (o.status || 0)) return
    setBusy(true); const { error } = await sb.from('orders').update({ status: s }).eq('id', o.id); setBusy(false)
    if (error) return say(error.message); say(`#${o.order_no} → ${STEPS[s]}`); reload()
  }
  const csv = () => {
    const c = v => { v = String(v ?? ''); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"' }
    const rows = [['Order', 'Date', 'Customer', 'Phone', 'Address', 'Items', 'Payment', 'Status', 'Total'], ...list.map(o => [o.order_no, o.created_at, o.address?.name, o.address?.phone, o.address?.address, (o.items || []).map(i => `${i.name}${i.variant ? ' (' + i.variant + ')' : ''} x${i.qty}`).join('; '), o.payment, STEPS[o.status || 0], o.total])]
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(c).join(',')).join('\n')], { type: 'text/csv' })); a.download = 'orders.csv'; a.click(); URL.revokeObjectURL(a.href)
  }
  const cur = sel && orders.find(o => o.id === sel)
  const sub = cur ? (cur.items || []).reduce((a, i) => a + i.price * i.qty, 0) : 0
  return <div className="pg">
    <div className="ob">{STEPS.map((l, i) => <button key={l} className={'s' + i + (f === String(i) ? ' on' : '')} onClick={() => setF(f === String(i) ? 'all' : String(i))}><small>{l}</small><b>{cnt[i]}</b></button>)}</div>
    <div className="tl"><input className="in" placeholder="Search order no., name, phone or address" value={q} onChange={e => setQ(e.target.value)} /><select className="in rg" aria-label="Date range" value={rg} onChange={e => setRg(e.target.value)}>{RANGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><button className="bt g" onClick={csv}>Export CSV</button></div>
    <div className="chips">{[['all', `All (${base.length})`], ...STEPS.map((s, i) => [String(i), `${s} (${cnt[i]})`])].map(([k, l]) => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{l}</button>)}</div>
    <p className="mut">{list.length} order{list.length === 1 ? '' : 's'} · {taka(sum)}</p>
    <div className="ol">{list.map(o => {
      const st = o.status || 0, its = o.items || [], n = its.reduce((a, i) => a + i.qty, 0)
      return <article className={'oc s' + st} key={o.id}>
        <button className="ob-main" onClick={() => setSel(o.id)}>
          <span className="av">{ini(o.address?.name)}</span>
          <span className="g1"><b>{o.address?.name || 'Customer'} {st === 0 && <i className="nw">NEW</i>}</b><small>#{o.order_no} · {ago(o.created_at)}</small><span className="its">{its.map(i => `${i.name}${i.qty > 1 ? ' ×' + i.qty : ''}`).join(', ') || 'No items'}</span></span>
          <span className="rt"><b>{taka(o.total)}</b><small>{n} item{n === 1 ? '' : 's'} · {o.payment}{o.payment_status === 'paid' ? ' ✓ Paid' : ''}</small><span className={'pl s' + st}>{STEPS[st]}</span></span>
        </button>
        {st < 3 ? <div className="oa"><small>📍 {o.address?.address || 'No address'}</small><button className="bt sm" disabled={busy} onClick={() => setStatus(o, st + 1)}>{NEXT[st]} →</button></div> : <div className="oa"><small>📍 {o.address?.address || 'No address'}</small><span className="ok">✓ Completed</span></div>}
      </article>
    })}{!list.length && <p className="mut pad cd">No orders match. Orders placed in the store appear here instantly.</p>}</div>
    {cur && <Modal title={'Order #' + cur.order_no} onClose={() => setSel(null)}>
      <div className="steps">{STEPS.map((s, i) => <button key={s} disabled={busy} className={(cur.status || 0) === i ? 'on' : (cur.status || 0) > i ? 'dn' : ''} onClick={() => setStatus(cur, i)}>{(cur.status || 0) > i ? '✓ ' : ''}{s}</button>)}</div>
      <div className="cu"><span className="av lg">{ini(cur.address?.name)}</span><span className="g1"><b>{cur.address?.name}</b><small>{cur.address?.phone}</small></span><span className={'pl s' + (cur.status || 0)}>{STEPS[cur.status || 0]}</span></div>
      <div className="acts"><a className="bt sm" href={cur.address?.phone ? 'tel:' + cur.address.phone : undefined}>📞 Call</a><a className="bt g sm" href={wa(cur.address?.phone)} target="_blank" rel="noopener noreferrer">💬 WhatsApp</a><button className="bt g sm" onClick={() => print()}>🖨 Print</button></div>
      <h3>Delivery address</h3>
      <div className="cd ad"><p>{cur.address?.address || '—'}</p>{cur.address?.note && <p className="mut">Note: {cur.address.note}</p>}<button className="bt g sm" onClick={() => { navigator.clipboard?.writeText(cur.address?.address || '').then(() => say('Address copied'), () => say('Could not copy')) }}>Copy address</button></div>
      <h3>Items</h3>
      {(cur.items || []).map((i, ix) => <div className="ln it" key={i.key || ix}><span className="th">{i.image_url ? <img src={i.image_url} alt="" loading="lazy" /> : i.emoji || '🛍️'}</span><span className="g1"><b>{i.name}</b><small>{i.variant ? i.variant + ' · ' : ''}{taka(i.price)} × {i.qty}</small></span><b>{taka(i.price * i.qty)}</b></div>)}
      <div className="sm2"><div><span>Subtotal</span><span>{taka(sub)}</span></div>{sub - cur.total > 0.5 && <div><span>Discount</span><span className="ok">−{taka(sub - cur.total)}</span></div>}<div><span>Payment</span><span>{cur.payment}</span></div><div className="tt"><span>Total</span><span>{taka(cur.total)}</span></div></div>
      <p className="mut">Placed {fmt(cur.created_at)} · {ago(cur.created_at)}</p>
      {(cur.status || 0) < 3 && <button className="bt" disabled={busy} onClick={() => setStatus(cur, (cur.status || 0) + 1)}>{NEXT[cur.status || 0]} →</button>}
    </Modal>}</div>
}

function Wish({ d: { wish, products, wishErr, orders } }) {
  const pm = useMemo(() => Object.fromEntries(products.map(p => [String(p.id), p])), [products])
  const rows = useMemo(() => {
    const m = {}
    wish.forEach(w => { const r = m[w.product_id] || (m[w.product_id] = { id: w.product_id, name: w.product_name, n: 0, who: new Set(), last: w.created_at }); r.n++; r.who.add(w.user_label || 'Guest'); if (w.created_at > r.last) r.last = w.created_at })
    return Object.values(m).sort((a, b) => b.n - a.n)
  }, [wish])
  const ordered = useMemo(() => { const s = new Set(); orders.forEach(o => (o.items || []).forEach(i => s.add(String(i.id)))); return s }, [orders])
  const people = new Set(wish.map(w => w.device_id)).size, top = rows[0]?.n || 1
  if (wishErr) return <div className="cd"><h2>Wishlist tracking isn't set up yet</h2><p className="mut">Run the SQL in <b>supabase-setup.sql</b> in the Supabase SQL editor, then press Refresh. Customers' wishlists will then show up here.</p></div>
  const nm = r => pm[r.id]?.name || r.name || 'Product ' + r.id
  return <div className="pg"><div className="kp"><div className="cd"><small>Total saves</small><b>{wish.length}</b></div><div className="cd"><small>Products wished</small><b>{rows.length}</b></div><div className="cd"><small>Customers</small><b>{people}</b></div><div className="cd"><small>Wished, never ordered</small><b>{rows.filter(r => !ordered.has(String(r.id))).length}</b></div></div>
    <div className="two"><section className="cd lst"><div className="rh pad"><h2>Most wished products</h2></div>{rows.map(r => { const p = pm[r.id]; return <div className="rw" key={r.id}><span className="th">{p?.image_url ? <img src={p.image_url} alt="" loading="lazy" /> : p?.emoji || '♡'}</span><span className="g1"><b>{nm(r)}</b><small>{[...r.who].slice(0, 3).join(', ')}{r.who.size > 3 ? ` +${r.who.size - 3}` : ''}</small><i className="bar"><i style={{ width: r.n / top * 100 + '%' }} /></i></span><span className="pl">♥ {r.n}</span>{!ordered.has(String(r.id)) && <span className="pl s1 dm">Not ordered</span>}</div> })}{!rows.length && <p className="mut pad">Nothing wishlisted yet. When customers tap ♡ in the store it shows here.</p>}</section>
      <section className="cd"><h2>Recent activity</h2>{wish.slice(0, 20).map(w => <div className="ln" key={w.id}><span><b>{w.user_label || 'Guest'}</b> saved <b>{pm[w.product_id]?.name || w.product_name || 'a product'}</b></span><small>{ago(w.created_at)}</small></div>)}{!wish.length && <p className="mut">No activity yet.</p>}</section></div></div>
}

const blank = { name: '', brand: '', tag: '', category_id: '', price: '', stock: '', emoji: '', image_url: '', is_active: true, variants: [{ label: 'Standard', mult: 1 }], features: '100% original product\nDiscreet packaging' }
function Products({ d, reload, say }) {
  const [q, setQ] = useState(''), [cf, setCf] = useState(''), [e, setE] = useState(null), [busy, setBusy] = useState(false)
  const cn = useMemo(() => Object.fromEntries(d.cats.map(c => [c.id, c.name])), [d.cats])
  const list = useMemo(() => d.products.filter(p => (!cf || p.category_id === cf) && (!q || `${p.name} ${p.brand || ''}`.toLowerCase().includes(q.toLowerCase()))), [d.products, q, cf])
  const edit = p => setE(p ? { ...blank, ...p, stock: p.stock ?? '', emoji: p.emoji || '', brand: p.brand || '', tag: p.tag || '', image_url: p.image_url || '', is_active: p.is_active !== false, variants: p.variants?.length ? p.variants : blank.variants, features: (p.features || []).join('\n') } : { ...blank, category_id: d.cats[0]?.id || '' })
  const toggle = async p => { const { data, error } = await sb.from('products').update({ is_active: p.is_active === false }).eq('id', p.id).select(); if (error) return say(error.message); if (!data?.length) return say('Not saved. This account may not have permission to edit products.'); reload() }
  const del = async p => { if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return; const { data, error } = await sb.from('products').delete().eq('id', p.id).select(); if (error) return say(error.message); if (!data?.length) return say('Not deleted. This account may not have permission to delete products.'); say('Product deleted'); reload() }
  const save = async () => {
    if (!e.name.trim() || !e.category_id || !(+e.price > 0)) return say('Name, category and a price above 0 are required')
    const v = e.variants.filter(x => x.label.trim()).map(x => ({ label: x.label.trim(), mult: +x.mult || 1 }))
    const row = { name: e.name.trim(), brand: e.brand.trim() || null, tag: e.tag.trim() || null, category_id: e.category_id, price: +e.price, stock: e.stock === '' ? null : Math.max(0, +e.stock), emoji: e.emoji || null, image_url: e.image_url || null, is_active: e.is_active, variants: v.length ? v : blank.variants, features: e.features.split('\n').map(s => s.trim()).filter(Boolean), ...(e.id ? {} : { rating: 4.5, reviews: 0 }) }
    setBusy(true); const { data, error } = await (e.id ? sb.from('products').update(row).eq('id', e.id).select() : sb.from('products').insert(row).select()); setBusy(false)
    if (error) return say(error.message); if (!data?.length) return say('Not saved. This account may not have permission to change products.')
    say(e.id ? 'Product saved' : 'Product added. It is live in the store.'); setE(null); reload()
  }
  const s = (k, v) => setE(x => ({ ...x, [k]: v })), sv = (i, k, v) => setE(x => ({ ...x, variants: x.variants.map((y, j) => j === i ? { ...y, [k]: v } : y) }))
  return <div className="pg"><div className="tl"><input className="in" placeholder="Search products" value={q} onChange={e => setQ(e.target.value)} /><select className="in" value={cf} onChange={e => setCf(e.target.value)}><option value="">All categories</option>{d.cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="bt" onClick={() => edit()} disabled={!d.cats.length} title={d.cats.length ? '' : 'Add a category first'}>Add product</button></div>
    <div className="cd lst">{list.map(p => <div className="rw" key={p.id}><span className="th">{p.image_url ? <img src={p.image_url} alt="" loading="lazy" /> : p.emoji || '🛍️'}</span><span className="g1"><b>{p.name}</b><small>{[p.brand, cn[p.category_id]].filter(Boolean).join(' · ')}</small></span><b className="dm">{taka(p.price)}</b><span className={'dm ' + (p.stock != null && p.stock <= 5 ? 'wn' : 'mut')}>{p.stock == null ? '—' : p.stock + ' in stock'}</span>
      <button className={'tg' + (p.is_active !== false ? ' on' : '')} role="switch" aria-checked={p.is_active !== false} aria-label={`${p.name} visible in store`} onClick={() => toggle(p)}><i /></button><button className="bt g sm" onClick={() => edit(p)}>Edit</button><button className="bt d sm" aria-label={'Delete ' + p.name} onClick={() => del(p)}>Delete</button></div>)}{!list.length && <p className="mut pad">No products yet. Add your first one.</p>}</div>
    {e && <Modal title={e.id ? 'Edit product' : 'Add product'} onClose={() => setE(null)}>
      <div className="fg"><F l="Name"><input className="in" value={e.name} onChange={x => s('name', x.target.value)} /></F><F l="Category"><select className="in" value={e.category_id} onChange={x => s('category_id', x.target.value)}>{d.cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
        <F l="Base price (৳)"><input className="in" type="number" min="0" inputMode="decimal" value={e.price} onChange={x => s('price', x.target.value)} /></F><F l="Stock (blank = unlimited)"><input className="in" type="number" min="0" inputMode="numeric" value={e.stock} onChange={x => s('stock', x.target.value)} /></F>
        <F l="Brand"><input className="in" value={e.brand} onChange={x => s('brand', x.target.value)} /></F><F l="Label (e.g. Thin, Flavoured)"><input className="in" value={e.tag} onChange={x => s('tag', x.target.value)} /></F></div>
      <h3>Image</h3><Img value={e.image_url} folder="products" say={say} onChange={v => s('image_url', v)} /><F l="Emoji shown when there is no image"><input className="in sm" maxLength={8} value={e.emoji} onChange={x => s('emoji', x.target.value)} /></F>
      <h3>Variants</h3>{e.variants.map((v, i) => <div className="vr" key={i}><input className="in" aria-label="Variant name" placeholder="e.g. 10 pcs" value={v.label} onChange={x => sv(i, 'label', x.target.value)} /><input className="in" aria-label="Price multiplier" type="number" step="0.05" min="0" value={v.mult} onChange={x => sv(i, 'mult', x.target.value)} /><b>{taka(+e.price * (+v.mult || 1))}</b><button className="bt d sm" aria-label="Remove variant" onClick={() => setE(x => ({ ...x, variants: x.variants.filter((_, j) => j !== i) }))}>✕</button></div>)}
      <button className="bt g sm" onClick={() => setE(x => ({ ...x, variants: [...x.variants, { label: '', mult: 1 }] }))}>Add variant</button>
      <F l="Features (one per line)"><textarea className="in" rows="4" value={e.features} onChange={x => s('features', x.target.value)} /></F>
      <label className="ck"><input type="checkbox" checked={e.is_active} onChange={x => s('is_active', x.target.checked)} /> Visible in the store</label>
      <div className="acts"><button className="bt" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save product'}</button><button className="bt g" onClick={() => setE(null)}>Cancel</button></div></Modal>}</div>
}

function Cats({ d, reload, say }) {
  const [n, setN] = useState({ name: '', icon: '🛍️' }), [e, setE] = useState(null)
  const cnt = useMemo(() => { const m = {}; d.products.forEach(p => { m[p.category_id] = (m[p.category_id] || 0) + 1 }); return m }, [d.products])
  const run = async (q, ok) => { const { error } = await q; if (error) { say(error.message); return false } say(ok); reload(); return true }
  const add = async () => { if (!n.name.trim()) return say('Enter a category name'); if (await run(sb.from('categories').insert({ name: n.name.trim(), icon: n.icon || '🛍️' }), 'Category added')) setN({ name: '', icon: '🛍️' }) }
  const del = c => window.confirm(cnt[c.id] ? `Delete "${c.name}" and its ${cnt[c.id]} products? This cannot be undone.` : `Delete "${c.name}"?`) && run(sb.from('categories').delete().eq('id', c.id), 'Category deleted')
  return <div className="pg"><div className="cd"><h2>Add category</h2><div className="tl"><input className="in ic" aria-label="Icon" maxLength={8} value={n.icon} onChange={x => setN({ ...n, icon: x.target.value })} /><input className="in" placeholder="e.g. Lubricants" value={n.name} onChange={x => setN({ ...n, name: x.target.value })} /><button className="bt" onClick={add}>Add category</button></div></div>
    <div className="cd lst">{d.cats.map(c => <div className="rw" key={c.id}>{e?.id === c.id ? <><input className="in ic" aria-label="Icon" value={e.icon} onChange={x => setE({ ...e, icon: x.target.value })} /><input className="in g1" aria-label="Name" value={e.name} onChange={x => setE({ ...e, name: x.target.value })} /><button className="bt sm" onClick={async () => { if (!e.name.trim()) return say('Enter a category name'); if (await run(sb.from('categories').update({ name: e.name.trim(), icon: e.icon || '🛍️' }).eq('id', c.id), 'Category saved')) setE(null) }}>Save</button><button className="bt g sm" onClick={() => setE(null)}>Cancel</button></> : <><span className="th">{c.icon}</span><span className="g1"><b>{c.name}</b><small>{cnt[c.id] || 0} products</small></span><button className="bt g sm" onClick={() => setE({ ...c })}>Edit</button><button className="bt d sm" aria-label={'Delete ' + c.name} onClick={() => del(c)}>Delete</button></>}</div>)}{!d.cats.length && <p className="mut pad">No categories yet.</p>}</div></div>
}

const DEF = [{ chip: 'Limited Offer', lines: 'Privacy. Confidence.\nComfort. Wellness.', emoji: '🛡️', image: '', on: true }, { chip: 'Free Delivery', lines: 'Discreet delivery\nacross Chattogram', emoji: '🚚', image: '', on: true }, { chip: 'Use code SHIELD10', lines: 'Get 10% off\nyour first order', emoji: '🎁', image: '', on: true }]
const isLogo = v => v === '🛡️' || v === '🛡'
function Hero({ say }) {
  const [s, setS] = useState(null), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false)
  useEffect(() => {
    let live = true
    sb.from('site_settings').select('value').eq('key', 'hero').maybeSingle().then(({ data, error }) => {
      if (!live) return
      if (error) say(error.message)
      const v = data?.value?.slides
      setS(Array.isArray(v) && v.length ? v.map(x => ({ chip: '', lines: '', emoji: '', image: '', on: true, ...x })) : DEF)
    })
    return () => { live = false }
  }, [say])
  useEffect(() => {
    if (!dirty) return
    const h = e => { e.preventDefault(); e.returnValue = '' }
    addEventListener('beforeunload', h); return () => removeEventListener('beforeunload', h)
  }, [dirty])
  if (!s) return <div className="ctr"><i className="spin" /></div>
  const upd = fn => { setS(fn); setDirty(true) }
  const set = (i, k, v) => upd(a => a.map((x, j) => j === i ? { ...x, [k]: v } : x))
  const mv = (i, d) => upd(a => { const b = [...a], j = i + d; if (j < 0 || j >= b.length) return a;[b[i], b[j]] = [b[j], b[i]]; return b })
  const save = async () => {
    const bad = s.findIndex(x => x.on !== false && !(x.lines || '').trim())
    if (bad >= 0) return say(`Slide ${bad + 1} is shown but has no text. Add text, hide it or delete it.`)
    if (!s.some(x => x.on !== false)) return say('Show at least one slide, or the store uses its default banner.')
    const slides = s.map(x => ({ chip: (x.chip || '').trim(), lines: (x.lines || '').split('\n').map(l => l.trim()).filter(Boolean).join('\n'), emoji: (x.emoji || '').trim(), image: x.image || '', on: x.on !== false }))
    setBusy(true)
    const { error } = await sb.from('site_settings').upsert({ key: 'hero', value: { slides }, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    setBusy(false)
    if (error) return say(error.message)
    setS(slides); setDirty(false); say('Hero saved. It is live on the storefront.')
  }
  return <div className="pg"><p className="mut">The slides on the storefront home banner. Customers see slides marked Show, in this order. {dirty && <b className="wn">Unsaved changes</b>}</p>
    {s.map((x, i) => <div className="cd hs" key={i}><div className="pv"><div>{x.chip && <span style={{ fontSize: '.7rem', opacity: .85, letterSpacing: '.08em', textTransform: 'uppercase' }}>{x.chip}</span>}{(x.lines || '').split('\n').filter(Boolean).map((l, k) => <span key={k}>{l}</span>)}</div><i>{x.image ? <img src={x.image} alt="" /> : isLogo(x.emoji) ? <img src="/logo-mark.webp?v=2" alt="" /> : x.emoji}</i></div>
      <div><F l="Text (one line per row)"><textarea className="in" rows="3" value={x.lines} onChange={e => set(i, 'lines', e.target.value)} /></F>
        <div className="fg"><F l="Badge (small label above the text)"><input className="in" maxLength={30} value={x.chip} onChange={e => set(i, 'chip', e.target.value)} /></F><F l="Emoji (used when there is no image)"><input className="in sm" maxLength={8} value={x.emoji} onChange={e => set(i, 'emoji', e.target.value)} /></F></div>
        <Img value={x.image} folder="hero" say={say} onChange={v => set(i, 'image', v)} />
        <div className="acts"><label className="ck"><input type="checkbox" checked={x.on !== false} onChange={e => set(i, 'on', e.target.checked)} /> Show</label><button className="bt g sm" disabled={!i} onClick={() => mv(i, -1)}>Move up</button><button className="bt g sm" disabled={i === s.length - 1} onClick={() => mv(i, 1)}>Move down</button><button className="bt d sm" onClick={() => { if (window.confirm(`Delete slide ${i + 1}?`)) upd(a => a.filter((_, j) => j !== i)) }}>Delete</button></div></div></div>)}
    {!s.length && <p className="mut cd">No slides. Add one, or save to let the store use its default banner.</p>}
    <div className="acts"><button className="bt g" onClick={() => upd(a => [...a, { chip: '', lines: '', emoji: '✨', image: '', on: true }])}>Add slide</button><button className="bt g" onClick={() => { if (window.confirm('Reset to the default slides? Nothing is saved until you press Save hero.')) upd(() => DEF) }}>Reset to defaults</button><button className="bt" disabled={busy || !dirty} onClick={save}>{busy ? 'Saving…' : 'Save hero'}</button></div></div>
}
