import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
const wa = (p, t) => { const n = (p || '').replace(/\D/g, ''); return 'https://wa.me/' + (n.startsWith('0') ? '88' + n : n) + (t ? '?text=' + encodeURIComponent(t) : '') }
const NAV = [['dash', 'Overview'], ['orders', 'Orders'], ['wish', 'Wishlist'], ['products', 'Products'], ['cats', 'Categories'], ['hero', 'Hero']]

const ICN = {
  dash: <><rect x="3" y="3" width="7.5" height="9" rx="2.2" /><rect x="13.5" y="3" width="7.5" height="5.5" rx="2.2" /><rect x="13.5" y="12" width="7.5" height="9" rx="2.2" /><rect x="3" y="15.5" width="7.5" height="5.5" rx="2.2" /></>,
  orders: <><path d="M5 7h14l-1.2 12.1A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.9z" /><path d="M9 10V6.5a3 3 0 0 1 6 0V10" /></>,
  bag: <><path d="M5 7h14l-1.2 12.1A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.9z" /><path d="M9 10V6.5a3 3 0 0 1 6 0V10" /></>,
  wish: <path d="M12 20.5s-7.8-4.7-9.6-9.7C1.2 7.4 3.1 4.2 6.4 4.2c2 0 3.5 1 5.6 3 2.1-2 3.6-3 5.6-3 3.3 0 5.2 3.2 4 6.6-1.8 5-9.6 9.7-9.6 9.7z" />,
  products: <><path d="M21 8l-9-5-9 5v8l9 5 9-5z" /><path d="M3.3 8.2L12 13l8.7-4.8M12 13v8" /></>,
  cats: <><rect x="3" y="3" width="7.5" height="7.5" rx="2.2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2" /></>,
  hero: <><rect x="3" y="4" width="18" height="16" rx="3.5" /><circle cx="9" cy="9.8" r="1.7" /><path d="M21 16l-4.8-4.8L7 20" /></>,
  bell: <><path d="M6.2 9.4a5.8 5.8 0 0 1 11.6 0c0 4.4 1.9 5.9 1.9 5.9H4.3s1.9-1.5 1.9-5.9z" /><path d="M10 19a2.1 2.1 0 0 0 4 0" /></>,
  refresh: <><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4.5V9h-4.5" /></>,
  out: <><path d="M9.5 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20h3" /><path d="M15.5 8l4 4-4 4M19.5 12H9.5" /></>,
  rev: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 0 1 1 1v2" /><path d="M3 7.5V17a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5.5A2.5 2.5 0 0 1 3 7.5z" /><circle cx="16.5" cy="13.5" r="1.2" /></>,
  avg: <path d="M4 20V11M10 20V4M16 20v-6M21 20H3" />,
  inbox: <><path d="M4 13l2.2-7.2A1.5 1.5 0 0 1 7.6 4.8h8.8a1.5 1.5 0 0 1 1.4 1l2.2 7.2v5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z" /><path d="M4 13h4.5l1 2.5h5l1-2.5H20" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5.2l3.2 1.9" /></>,
  truck: <><path d="M2.5 6.5h10.5v10H2.5zM13 10h4.2l3.3 3.3v3.2H13" /><circle cx="7" cy="18" r="1.9" /><circle cx="17" cy="18" r="1.9" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="M7.8 12.4l2.9 2.9 5.5-6" /></>,
  chat: <><path d="M20.5 11.5a8.4 8.4 0 0 1-12.2 7.5L3.5 20.5 5 16A8.4 8.4 0 1 1 20.5 11.5z" /><path d="M9.2 8.8c.1 2.7 2.6 5.2 5.4 5.4l1.2-1.4-2-1-.9.8a4 4 0 0 1-2-2l.8-.9-1-2z" /></>,
  phone: <path d="M5 4h3.5l1.7 4.3-2.2 1.4a11 11 0 0 0 6.3 6.3l1.4-2.2L20 15.5V19a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4-4" /></>,
  plus: <path d="M12 5v14M5 12h14" />, minus: <path d="M5 12h14" />,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />,
  close: <path d="M6 6l12 12M18 6L6 18" />, chev: <path d="M9 6l6 6-6 6" />,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.2v.1" /></>,
  pin: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>
}
const Ic = ({ n, s = 22 }) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{ICN[n]}</svg>

// animated counter: eases from the previous value to the new one
function Count({ to, f = v => Math.round(v).toLocaleString() }) {
  const [v, setV] = useState(0), from = useRef(0)
  useEffect(() => {
    const end = +to || 0
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { from.current = end; setV(end); return }
    const a = from.current, t0 = performance.now(); let raf
    const step = t => { const k = Math.min(1, (t - t0) / 800), val = a + (end - a) * (1 - Math.pow(1 - k, 3)); from.current = val; setV(val); if (k < 1) raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{f(v)}</>
}

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

const F = ({ l, err, children }) => <label className={'f' + (err ? ' bad' : '')}><span>{l}</span>{children}{err && <em className="fe">{err}</em>}</label>
function Modal({ title, onClose, children, footer, cls = '' }) {
  useEffect(() => { const h = e => e.key === 'Escape' && onClose(); addEventListener('keydown', h); return () => removeEventListener('keydown', h) }, [onClose])
  const host = useMemo(() => document.querySelector('.adm') || document.body, [])
  return createPortal(<div className={'mb ' + cls} onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="md" role="dialog" aria-modal="true" aria-label={title}><div className="mh"><b>{title}</b><button className="x" aria-label="Close" onClick={onClose}><Ic n="close" s={18} /></button></div><div className="mc">{children}</div>{footer && <div className="mf">{footer}</div>}</div></div>, host)
}
function Img({ value, onChange, folder, say, onBusy }) {
  const [b, setB] = useState(false)
  const pick = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; setB(true); onBusy?.(true); try { onChange(await upload(f, folder)) } catch (x) { say(x.message || 'Upload failed') } setB(false); onBusy?.(false) }
  return <div className="img">{value ? <img src={value} alt="" /> : <span>No image</span>}<div><label className="bt g sm">{b ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pick} /></label>{value && <button className="bt g sm" onClick={() => onChange('')}>Remove</button>}</div></div>
}

export default function Admin() {
  const [st, setSt] = useState('loading'), [user, setUser] = useState(null)
  useEffect(() => {
    document.title = 'MyShyld Admin'
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex,nofollow'; document.head.appendChild(m)
    const vp = document.querySelector('meta[name="viewport"]'), old = vp?.content
    if (vp && !/viewport-fit/.test(old)) vp.content = old + ',viewport-fit=cover'
    const tc = document.createElement('meta'); tc.name = 'theme-color'; tc.content = '#f7effb'; document.head.appendChild(tc)
    document.documentElement.classList.add('adm-on')
    return () => { m.remove(); tc.remove(); if (vp && old != null) vp.content = old; document.documentElement.classList.remove('adm-on') }
  }, [])
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
  return <div className="adm"><div className="ctr"><form className="lg" onSubmit={go}><div className="lgo"><img src="/logo-full.webp?v=2" width="150" height="129" alt="MyShyld" decoding="async" /><small>Admin</small></div><h1>Sign in</h1>
    <F l="Email"><input className="in" type="email" autoComplete="username" required value={f.e} onChange={e => setF({ ...f, e: e.target.value })} /></F>
    <F l="Password"><input className="in" type="password" autoComplete="current-password" required value={f.p} onChange={e => setF({ ...f, p: e.target.value })} /></F>
    {err && <p className="er" role="alert">{err}</p>}<button className="bt" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form></div></div>
}

const first = o => (o.address?.name || 'there').trim().split(/\s+/)[0]
const WA = [
  ['Confirm', 'check', o => `Hi ${first(o)}, thank you for shopping with MyShyld! 💗 Your order #${o.order_no} (${taka(o.total)}) is confirmed. We'll pack it discreetly and keep you updated.`],
  ['Payment', 'rev', o => `Hi ${first(o)}, to confirm order #${o.order_no} please send ${taka(o.total)} via bKash and reply with the Transaction ID. Thank you!`],
  ['On the way', 'truck', o => `Hi ${first(o)}, your MyShyld order #${o.order_no} is out for delivery 🚚 ${o.payment_status === 'paid' ? 'Our rider will call you when nearby.' : 'Please keep ' + taka(o.total) + ' ready. Our rider will call you.'}`],
  ['Delivered', 'check', o => `Hi ${first(o)}, your order #${o.order_no} has been delivered. Thank you for choosing MyShyld! 💗 We'd love to hear your feedback.`],
  ['Address', 'pin', o => `Hi ${first(o)}, we're about to dispatch order #${o.order_no}. Could you please confirm your delivery address: ${o.address?.address || ''}`]
]
const defTpl = o => { const s = o.status || 0; return o.payment === 'bKash' && o.payment_status !== 'paid' && s === 0 ? 1 : [0, 0, 2, 3][s] }
const payLabel = o => o.payment_status === 'paid' ? 'Paid' : o.payment_status === 'verifying' ? 'Verifying' : 'Unpaid'
const invText = o => `🧾 MyShyld invoice #${o.order_no}\n${fmt(o.created_at)}\n\n` + (o.items || []).map(i => `• ${i.name}${i.variant ? ' (' + i.variant + ')' : ''} ×${i.qty} — ${taka(i.price * i.qty)}`).join('\n') + `${o.delivery_fee != null ? `\nDelivery: ${taka(o.delivery_fee)}` : ''}\n\nTotal: ${taka(o.total)}\nPayment: ${o.payment || '—'} (${payLabel(o)})\nThank you! 💗`

function Invoice({ o, onClose }) {
  const its = o.items || [], sub = its.reduce((a, i) => a + i.price * i.qty, 0), fee = o.delivery_fee == null ? null : +o.delivery_fee, disc = Math.max(0, sub + (fee || 0) - o.total), paid = o.payment_status === 'paid', trx = o.payment_ref || o.bkash_trx
  useEffect(() => {
    document.body.classList.add('inv-on')
    const h = e => e.key === 'Escape' && onClose(); addEventListener('keydown', h)
    return () => { document.body.classList.remove('inv-on'); removeEventListener('keydown', h) }
  }, [onClose])
  return createPortal(<div className="invp" role="dialog" aria-modal="true" aria-label={'Invoice #' + o.order_no}>
    <div className="invp-bar"><button className="invp-b" onClick={onClose}>← Back</button><div>{o.address?.phone && <a className="invp-b wa" href={wa(o.address.phone, invText(o))} target="_blank" rel="noopener noreferrer">WhatsApp</a>}<button className="invp-b pr" onClick={() => window.print()}>Print / Save PDF</button></div></div>
    <div className="invp-scroll"><article className="invp-sheet">
      {paid && <span className="stp">PAID</span>}
      <header className="ih"><div><img src="/logo-full.webp?v=2" width="104" height="90" alt="MyShyld" decoding="async" /><small>Discreet delivery across Chattogram</small></div><div className="it"><h2>INVOICE</h2><b>#{o.order_no}</b></div></header>
      <div className="im"><div><span>Date</span><b>{fmt(o.created_at)}</b></div><div><span>Order status</span><b>{STEPS[o.status || 0]}</b></div><div><span>Payment method</span><b>{o.payment || '—'}</b></div><div><span>Payment status</span><b className={'bg ' + (paid ? 'ok' : o.payment_status === 'verifying' ? 'w' : '')}>{payLabel(o)}</b></div>{trx && o.payment === 'bKash' && <div><span>bKash TrxID</span><b>{trx}</b></div>}</div>
      <div className="bd"><span className="bl">Bill to</span><p><b>{o.address?.name || 'Customer'}</b></p>{o.address?.phone && <p>{o.address.phone}</p>}<p>{o.address?.address || '—'}</p>{o.address?.note && <p className="nt2">Note: {o.address.note}</p>}</div>
      <table><thead><tr><th>Item</th><th className="r">Qty</th><th className="r">Amount</th></tr></thead><tbody>{its.map((i, ix) => <tr key={i.key || ix}><td>{i.name}<small>{i.variant ? i.variant + ' · ' : ''}{taka(i.price)} each</small></td><td className="r">{i.qty}</td><td className="r">{taka(i.price * i.qty)}</td></tr>)}</tbody></table>
      <div className="tot"><div><span>Subtotal</span><span>{taka(sub)}</span></div>{disc > 0.5 && <div><span>Discount</span><span>−{taka(disc)}</span></div>}{fee != null && <div><span>Delivery</span><span>{taka(fee)}</span></div>}<div className="g"><span>Total</span><span>{taka(o.total)}</span></div></div>
      <footer className="ft">Thank you for shopping with MyShyld 💗<br />Your order is packed discreetly.</footer>
    </article></div></div>, document.body)
}

const KIND = { order: ['bag', 'o'], pay: ['rev', 'p'], wish: ['wish', 'w'] }
function Notifs({ orders, notes, onClose, onOrder, onWish, onRead, onClear }) {
  const [tab, setTab] = useState('act'), [snap] = useState(() => new Set(notes.filter(n => !n.read).map(n => n.id)))
  useEffect(() => { onRead() }, [onRead])
  const todo = useMemo(() => orders.filter(o => !o.status || o.payment_status === 'verifying').sort((a, b) => (b.payment_status === 'verifying') - (a.payment_status === 'verifying') || new Date(b.created_at) - new Date(a.created_at)), [orders])
  return <Modal cls="np" title="Notifications" onClose={onClose} footer={tab === 'log' && notes.length > 0 ? <button className="bt g sm" onClick={onClear}>Clear activity</button> : null}>
    <div className="seg nt" role="tablist" aria-label="Notification type">
      <button role="tab" aria-selected={tab === 'act'} className={tab === 'act' ? 'on' : ''} onClick={() => setTab('act')}>Action needed{todo.length > 0 && <em>{todo.length}</em>}</button>
      <button role="tab" aria-selected={tab === 'log'} className={tab === 'log' ? 'on' : ''} onClick={() => setTab('log')}>Activity{notes.length > 0 && <em className="g">{notes.length}</em>}</button></div>
    {tab === 'act' ? (todo.length ? <div className="nl">{todo.map(o => { const v = o.payment_status === 'verifying'; return <button key={o.id} className="nr" onClick={() => onOrder(o.id)}>
      <span className={'nk ' + (v ? 'p' : 'o')}><Ic n={v ? 'rev' : 'bag'} s={19} /></span>
      <span className="g1"><b>{v ? 'Verify bKash payment' : 'New order to process'}</b><small>#{o.order_no} · {o.address?.name || 'Customer'} · {taka(o.total)}</small></span>
      <span className="tm"><small>{ago(o.created_at)}</small><Ic n="chev" s={16} /></span></button> })}</div>
      : <div className="ne"><i><Ic n="check" s={28} /></i><b>You're all caught up</b><small>New orders and payments to verify show up here.</small></div>)
      : (notes.length ? <div className="nl">{notes.map(n => { const [ic, c] = KIND[n.k] || KIND.order; return <button key={n.id} className="nr" onClick={() => n.oid ? onOrder(n.oid) : n.k === 'wish' ? onWish() : onClose()}>
        <span className={'nk ' + c}><Ic n={ic} s={19} /></span>
        <span className="g1"><b>{n.title}</b><small>{n.sub}</small></span>
        <span className="tm"><small>{ago(n.t)}</small>{snap.has(n.id) ? <i className="udot" aria-label="New" /> : <Ic n="chev" s={16} />}</span></button> })}</div>
        : <div className="ne"><i><Ic n="bell" s={26} /></i><b>No activity yet</b><small>Live updates appear here while you are signed in.</small></div>)}
  </Modal>
}

const readNotes = () => { try { const a = JSON.parse(localStorage.getItem('adm-notes') || '[]'); return Array.isArray(a) ? a.slice(0, 40) : [] } catch { return [] } }
const stab = (m, rows) => rows.map(r => { const s = JSON.stringify(r), h = m.get(r.id); if (h && h.s === s) return h.r; m.set(r.id, { s, r }); return r })

function Shell({ user }) {
  const [tab, setTab] = useState(() => { const h = location.hash.slice(1); return NAV.some(n => n[0] === h) ? h : 'dash' }), [d, setD] = useState({ orders: [], products: [], cats: [], wish: [], wishErr: false }), [toast, setToast] = useState(''), [ld, setLd] = useState(true), [rf, setRf] = useState(false), tt = useRef(0), lt = useRef(0), [notes, setNotes] = useState(readNotes), [nOpen, setNOpen] = useState(false), [focus, setFocus] = useState(null), cache = useRef({ o: new Map(), p: new Map() })
  const say = useCallback(m => { setToast(m); clearTimeout(tt.current); tt.current = setTimeout(() => setToast(''), 2400) }, [])
  const push = useCallback(n => { setNotes(a => [{ id: Date.now() + Math.random(), t: Date.now(), read: false, ...n }, ...a].slice(0, 40)); if (n.k !== 'wish') navigator.vibrate?.(60) }, [])
  const readAll = useCallback(() => setNotes(a => a.some(n => !n.read) ? a.map(n => n.read ? n : { ...n, read: true }) : a), [])
  const openOrder = useCallback(id => { setFocus(id); setNOpen(false); setTab('orders'); history.replaceState(null, '', '#orders') }, [])
  const clearFocus = useCallback(() => setFocus(null), [])
  useEffect(() => { try { localStorage.setItem('adm-notes', JSON.stringify(notes)) } catch { /* storage unavailable */ } }, [notes])
  const go = t => { setTab(t); history.replaceState(null, '', '#' + t); document.querySelector('.scr')?.scrollTo?.(0, 0) }
  const load = useCallback(async () => {
    const [o, p, c, w] = await Promise.all([sb.from('orders').select('*').in('payment_status', ['unpaid', 'verifying', 'paid']).order('created_at', { ascending: false }).limit(500), sb.from('products').select('*').order('created_at', { ascending: false }), sb.from('categories').select('*').order('created_at'), sb.from('wishlists').select('*').order('created_at', { ascending: false }).limit(1000)])
    const er = o.error || p.error || c.error; if (er) say(er.message)
    setD({ orders: stab(cache.current.o, o.data || []), products: stab(cache.current.p, p.data || []), cats: c.data || [], wish: w.data || [], wishErr: !!w.error }); setLd(false)
  }, [say])
  useEffect(() => {
    const later = () => { clearTimeout(lt.current); lt.current = setTimeout(load, 400) } // coalesce bursts of realtime events
    load()
    const ch = sb.channel('adm-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, p => { const r = p.new || {}; say('🛍️ New order #' + r.order_no); push({ k: 'order', title: 'New order #' + r.order_no, sub: (r.address?.name || 'Customer') + ' · ' + taka(r.total), oid: r.id }); later() })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, p => { const r = p.new || {}; if (r.payment_status === 'verifying' && p.old?.payment_status !== 'verifying') { say('💗 bKash payment to verify'); push({ k: 'pay', title: 'Verify bKash payment', sub: `#${r.order_no} · ${r.address?.name || 'Customer'} · ${taka(r.total)}`, oid: r.id }) } later() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wishlists' }, p => { say('♡ Item added to a wishlist'); push({ k: 'wish', title: 'Saved to wishlist', sub: p.new?.product_name || 'A product' }); later() })
      .subscribe()
    return () => { clearTimeout(lt.current); sb.removeChannel(ch) }
  }, [load, say, push])
  const refresh = async () => { setRf(true); await load(); setRf(false) }
  useEffect(() => {
    let t; const reset = () => { clearTimeout(t); t = setTimeout(() => sb.auth.signOut(), IDLE) }, ev = ['pointerdown', 'keydown', 'scroll', 'touchmove']
    ev.forEach(e => addEventListener(e, reset, { passive: true, capture: true })); reset()
    return () => { clearTimeout(t); ev.forEach(e => removeEventListener(e, reset, { capture: true })) }
  }, [])
  const pend = d.orders.filter(o => !o.status).length, todo = d.orders.filter(o => !o.status || o.payment_status === 'verifying').length, unread = notes.filter(n => !n.read).length, title = NAV.find(n => n[0] === tab)?.[1] || 'Overview'
  const nm = user.user_metadata?.full_name || (user.email || 'admin').split('@')[0]
  const p = { d, reload: load, say, go, focus, clearFocus }
  return <div className="adm"><div className="shell"><nav className="sb" aria-label="Admin sections"><div className="brand"><span className="bm"><img src="/logo-mark.webp?v=2" width="26" height="22" alt="" decoding="async" /></span>My<b>Shyld</b></div>
    <div className="me"><span className="mav" aria-hidden="true">{ini(nm)}</span><b>{nm}</b><small>Store admin</small></div>
    <div className="nv">{NAV.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => go(k)}><span className="ic" aria-hidden="true"><Ic n={k} /></span><span className="lb">{l}</span>{k === 'orders' && pend > 0 && <em>{pend}</em>}</button>)}</div>
    <div className="sp" /><button className="lo" onClick={() => sb.auth.signOut()}><i aria-hidden="true"><Ic n="out" s={15} /></i>Log out</button></nav>
    <main className="mn"><header className="top"><h1>{title}</h1><div className="ta"><button className={'ib2 bell' + (todo ? ' has' : '')} aria-label={todo ? todo + ' items need attention' : 'Notifications'} aria-haspopup="dialog" onClick={() => setNOpen(true)}><Ic n="bell" s={21} />{todo > 0 ? <i>{todo > 99 ? '99+' : todo}</i> : unread > 0 && <i className="dot" />}</button><button className={'ib2' + (rf ? ' spinning' : '')} aria-label="Refresh" onClick={refresh}><Ic n="refresh" s={20} /></button><button className="ib2 mo" aria-label="Sign out" onClick={() => sb.auth.signOut()}><Ic n="out" s={20} /></button></div></header>
      <div className="scr">
      {ld ? <div className="ctr"><i className="spin" /></div> : tab === 'dash' ? <Dash {...p} /> : tab === 'orders' ? <Orders {...p} /> : tab === 'wish' ? <Wish {...p} /> : tab === 'products' ? <Products {...p} /> : tab === 'cats' ? <Cats {...p} /> : tab === 'hero' ? <Hero say={say} /> : <Dash {...p} />}</div></main></div>
    {nOpen && <Notifs orders={d.orders} notes={notes} onClose={() => setNOpen(false)} onOrder={openOrder} onWish={() => { setNOpen(false); go('wish') }} onRead={readAll} onClear={() => setNotes([])} />}
    {toast && <div className="toast" role="status">{toast}</div>}</div>
}

const sh = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'm' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.0', '') + 'k' : String(Math.round(n))
const pct = (a, b) => b ? Math.round((a - b) / b * 100) : a ? 100 : 0
const clamp = v => Math.min(100, Math.max(0, v))
// smooth curve through points (Catmull-Rom -> cubic bezier), in a 0-100 box
const smooth = pts => pts.length < 2 ? '' : pts.reduce((s, p, i, a) => {
  if (!i) return `M${p[0]},${p[1]}`
  const p0 = a[i - 2] || a[i - 1], p1 = a[i - 1], p3 = a[i + 1] || p
  return s + `C${p1[0] + (p[0] - p0[0]) / 6},${clamp(p1[1] + (p[1] - p0[1]) / 6)} ${p[0] - (p3[0] - p1[0]) / 6},${clamp(p[1] - (p3[1] - p1[1]) / 6)} ${p[0]},${p[1]}`
}, '')
const IC = ['inbox', 'clock', 'truck', 'check']

function Activity({ orders }) {
  const [r, setR] = useState(7), [hi, setHi] = useState(null), box = useRef(null)
  const days = useMemo(() => {
    const m = new Map()
    orders.forEach(o => { const k = new Date(o.created_at).toDateString(), e = m.get(k) || { v: 0, n: 0 }; e.v += +o.total || 0; e.n++; m.set(k, e) })
    return [...Array(r)].map((_, i) => { const t = new Date(); t.setDate(t.getDate() - (r - 1) + i); const e = m.get(t.toDateString()) || { v: 0, n: 0 }; return { t, v: e.v, n: e.n } })
  }, [orders, r])
  const top = Math.max(1, ...days.map(x => x.v)) * 1.1, X = i => i / (r - 1) * 100, Y = v => 96 - v / top * 90
  const line = smooth(days.map((x, i) => [X(i), Y(x.v)])), best = days.reduce((b, x, i) => x.v >= days[b].v ? i : b, 0)
  const a = hi ?? best, cur = days[a], step = r === 7 ? 1 : r === 14 ? 2 : 5, G = [0, 1, 2, 3, 4]
  const move = e => { const b = box.current?.getBoundingClientRect(); if (!b || !b.width) return; setHi(Math.round(Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)) * (r - 1))) }
  return <section className="sec"><div className="sh"><h2>Activity</h2>
    <div className="seg" role="group" aria-label="Date range">{[7, 14, 30].map(n => <button key={n} className={r === n ? 'on' : ''} aria-pressed={r === n} onClick={() => { setR(n); setHi(null) }}>{n} days</button>)}</div></div>
    <div className="act">
      <div className="ay" aria-hidden="true">{G.map(i => <span key={i} style={{ top: 96 - 22.5 * i + '%' }}>{sh(top * i / 4)}</span>)}</div>
      <div className="ap" ref={box} onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHi(null)} role="img" aria-label={`Revenue per day for the last ${r} days`}>
        {G.map(i => <i className="gl" key={i} style={{ top: 96 - 22.5 * i + '%' }} />)}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs>
          <linearGradient id="agl" x1="0" x2="1"><stop offset="0" stopColor="#8e2a8c" /><stop offset="1" stopColor="#e0457b" /></linearGradient>
          <linearGradient id="agf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e0457b" stopOpacity=".26" /><stop offset="1" stopColor="#e0457b" stopOpacity="0" /></linearGradient></defs>
          <path d={line + 'L100,96L0,96Z'} fill="url(#agf)" /><path d={line} fill="none" stroke="url(#agl)" strokeWidth="3.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" /></svg>
        <i className="adot" style={{ left: X(a) + '%', top: Y(cur.v) + '%' }} />
        <div className={'atip' + (Y(cur.v) < 38 ? ' lw' : '')} style={{ left: Math.min(86, Math.max(14, X(a))) + '%', top: Y(cur.v) + '%' }}><b>{taka(cur.v)}</b><small>{cur.t.toLocaleDateString([], { month: 'short', day: 'numeric' })} · {cur.n} order{cur.n === 1 ? '' : 's'}</small></div>
      </div>
      <div className="ax" aria-hidden="true">{days.map((x, i) => ((i % step === 0 && r - 1 - i >= step) || i === r - 1) && <span key={i} style={{ left: X(i) + '%' }}>{r === 7 ? x.t.toLocaleDateString([], { weekday: 'short' }) : x.t.getDate()}</span>)}</div>
    </div></section>
}

function Dash({ d, go }) {
  const { orders, products } = d
  const S = useMemo(() => {
    const T = new Date().setHours(0, 0, 0, 0), D = 864e5, at = o => +new Date(o.created_at)
    const sum = (a, b) => orders.reduce((s, o) => at(o) >= a && at(o) < b ? s + (+o.total || 0) : s, 0), cnt = (a, b) => orders.filter(o => at(o) >= a && at(o) < b).length
    const c4 = [0, 0, 0, 0]; orders.forEach(o => { const s = o.status || 0; if (s in c4) c4[s]++ })
    const m = new Map()
    orders.forEach(o => (o.items || []).forEach(i => { const k = String(i.id ?? i.name), e = m.get(k) || { name: i.name, img: i.image_url, em: i.emoji, q: 0, v: 0 }; e.q += +i.qty || 0; e.v += (+i.price || 0) * (+i.qty || 0); m.set(k, e) }))
    const all = [...m.values()].sort((x, y) => y.q - x.q), tq = all.reduce((s, x) => s + x.q, 0) || 1
    return { rev: orders.reduce((a, o) => a + (+o.total || 0), 0), r7: sum(T - 6 * D, T + D), p7: sum(T - 13 * D, T - 6 * D), today: cnt(T, T + D), yest: cnt(T - D, T), c4, best: all.slice(0, 4).map(x => ({ ...x, p: Math.round(x.q / tq * 100) })) }
  }, [orders])
  const low = products.filter(x => x.stock != null && x.stock <= 5), pend = S.c4[0]
  const K = [['Revenue', S.rev, taka, pct(S.r7, S.p7), 'rev', 'Last 7 days vs the 7 before'], ['Orders today', S.today, undefined, pct(S.today, S.yest), 'bag', 'Today vs yesterday'], ['Avg. order', orders.length ? S.rev / orders.length : 0, taka, null, 'avg'], ['Live products', products.filter(x => x.is_active !== false).length, undefined, null, 'products']]
  return <div className="pg dg">
    <div className="kps">{K.map(([l, v, f, t, ic, tip], i) => <div className={'kpi k' + i} key={l}><div className="kl"><span className="ki"><Ic n={ic} s={19} /></span>{t != null && <i className={'tr ' + (t >= 0 ? 'up' : 'dn')} title={tip}>{t >= 0 ? '↑' : '↓'} {Math.abs(t)}%</i>}</div><b><Count to={v} f={f} /></b><span className="kn">{l}</span></div>)}</div>
    <div className="promo"><div><small>Needs attention</small><h2><em><Count to={pend} /></em> order{pend === 1 ? '' : 's'} waiting</h2><p>{pend ? 'Start processing to keep customers happy.' : 'You are all caught up. Nice work!'}</p><button className="bt sm" onClick={() => go('orders')}>{pend ? 'Review now' : 'View orders'}</button></div>
      <div className="ring" aria-hidden="true"><svg viewBox="0 0 130 100" fill="none" strokeLinecap="round"><path d="M10 96A55 55 0 0 1 65 41" stroke="#ffb3d5" strokeWidth="9" /><path d="M24 96A41 41 0 0 1 65 55" stroke="#8e2a8c" strokeWidth="9" /><path d="M38 96A27 27 0 0 1 65 69" stroke="#e0457b" strokeWidth="9" /><path d="M65 41A55 55 0 0 1 120 96" stroke="#c9b6f7" strokeWidth="9" /></svg><b><Count to={pend} /></b></div></div>
    <Activity orders={orders} />
    <section className="sec"><div className="sh"><h2>Top sellers</h2></div>
      <div className="tp">{S.best.length ? S.best.map(x => <div className="tpr" key={x.name}><span className="th">{x.img ? <img src={x.img} alt="" loading="lazy" /> : x.em || '🛍️'}</span><div className="g1"><b>{x.name}</b><small>{x.q} sold · {taka(x.v)}</small></div><b className="pc">{x.p}%</b></div>) : <p className="mut">Your best sellers will show up after the first orders.</p>}</div>
      {S.best.length > 0 && <button className="vm" onClick={() => go('products')}>View products ›</button>}</section>
    <section className="chn"><div><h2>Order pipeline</h2><p className="mut">Where your {orders.length} recent order{orders.length === 1 ? '' : 's'} stand right now.</p></div>
      <div className="cc">{STEPS.map((l, i) => <button key={l} className={'s' + i} onClick={() => go('orders')}><i aria-hidden="true"><Ic n={IC[i]} s={20} /></i><span>{l}</span><b><Count to={S.c4[i]} /></b></button>)}<button className="full" onClick={() => go('orders')}><span>All orders</span><em aria-hidden="true">→</em></button></div></section>
    <section className="cd"><div className="rh"><h2>Recent orders</h2><button className="bt g sm" onClick={() => go('orders')}>View all</button></div>{orders.slice(0, 5).map(o => <div className="ln" key={o.id}><span>#{o.order_no} · {o.address?.name}</span><span className={'pl s' + (o.status || 0)}>{STEPS[o.status || 0]}</span><b>{taka(o.total)}</b></div>)}{!orders.length && <p className="mut">No orders yet.</p>}</section>
    <section className="cd"><h2>Low stock</h2>{low.length ? low.slice(0, 6).map(x => <div className="ln" key={x.id}><span>{x.name}</span><b className={x.stock ? 'wn' : 'er'}>{x.stock ? x.stock + ' left' : 'Sold out'}</b></div>) : <p className="mut">Nothing running low. Set a stock count on a product to track it.</p>}</section>
  </div>
}

const PAGE = 25
const OrderCard = memo(function OrderCard({ o, onOpen, onNext }) {
  const st = o.status || 0, its = o.items || [], n = its.reduce((a, i) => a + i.qty, 0), ph = o.address?.phone
  return <article className={'oc s' + st}>
    <button className="ob-main" onClick={() => onOpen(o.id)}>
      <span className="av">{ini(o.address?.name)}</span>
      <span className="g1"><b>{o.address?.name || 'Customer'} {st === 0 && <i className="nw">NEW</i>}</b><small>#{o.order_no} · {ago(o.created_at)}</small></span>
      <span className="rt"><b>{taka(o.total)}</b><span className={'pl s' + st}>{STEPS[st]}</span></span>
      <span className="its">{its.map(i => `${i.name}${i.qty > 1 ? ' ×' + i.qty : ''}`).join(', ') || 'No items'}</span>
      <span className="pm"><span>{n} item{n === 1 ? '' : 's'}</span><span>{o.payment}</span>{o.payment_status === 'paid' && <span className="pd">✓ Paid</span>}{o.payment_status === 'verifying' && <span className="vf">⏳ Verify</span>}</span>
    </button>
    <div className="oa"><small><Ic n="pin" s={13} /> {o.address?.address || 'No address'}</small>
      <div className="oq">{ph && <a className="ib3" href={'tel:' + ph} aria-label="Call customer"><Ic n="phone" s={17} /></a>}{ph && <a className="ib3 wa" href={wa(ph, WA[defTpl(o)][2](o))} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp customer"><Ic n="chat" s={17} /></a>}
        {st < 3 ? <button className="bt sm" onClick={() => onNext(o)}>{NEXT[st]} →</button> : <span className="ok">✓ Completed</span>}</div></div>
  </article>
})

function Orders({ d: { orders }, reload, say, focus, clearFocus }) {
  const [f, setF] = useState('all'), [q, setQ] = useState(''), [rg, setRg] = useState('all'), [sel, setSel] = useState(null), [busy, setBusy] = useState(false), [vo, setVo] = useState(false), [lim, setLim] = useState(PAGE), [inv, setInv] = useState(false), bz = useRef(false)
  const dq = useDeferredValue(q)
  const base = useMemo(() => {
    const k = dq.trim().toLowerCase(), now = new Date()
    return orders.filter(o => {
      const t = new Date(o.created_at)
      const okR = rg === 'all' || (rg === 'today' ? t.toDateString() === now.toDateString() : now - t <= +rg * 864e5)
      return okR && (!k || `${o.order_no} ${o.address?.name} ${o.address?.phone} ${o.address?.address}`.toLowerCase().includes(k))
    })
  }, [orders, dq, rg])
  const cnt = useMemo(() => { const m = [0, 0, 0, 0]; base.forEach(o => { m[o.status || 0]++ }); return m }, [base])
  const vcnt = useMemo(() => base.filter(o => o.payment_status === 'verifying').length, [base])
  const list = useMemo(() => base.filter(o => (f === 'all' || (o.status || 0) === +f) && (!vo || o.payment_status === 'verifying')), [base, f, vo])
  useEffect(() => { setLim(PAGE) }, [f, dq, rg, vo])
  useEffect(() => { if (focus) { setF('all'); setVo(false); setSel(focus); clearFocus() } }, [focus, clearFocus])
  const sum = useMemo(() => list.reduce((a, o) => a + (+o.total || 0), 0), [list])
  const setStatus = useCallback(async (o, s) => {
    if (bz.current || s === (o.status || 0)) return
    bz.current = true; setBusy(true)
    const { error } = await sb.from('orders').update({ status: s }).eq('id', o.id)
    bz.current = false; setBusy(false)
    if (error) return say(error.message); say(`#${o.order_no} → ${STEPS[s]}`); reload()
  }, [reload, say])
  const next = useCallback(o => setStatus(o, (o.status || 0) + 1), [setStatus])
  const openSel = useCallback(id => setSel(id), [])
  const closeSel = useCallback(() => { setSel(null); setInv(false) }, [])
  const closeInv = useCallback(() => setInv(false), [])
  const setPay = async (o, ok) => {
    if (bz.current) return
    if (!ok && !confirm('Reject this Transaction ID? The customer will be able to submit it again.')) return
    bz.current = true; setBusy(true)
    const { error } = await sb.from('orders').update(ok ? { payment_status: 'paid', payment_ref: o.bkash_trx } : { payment_status: 'unpaid', bkash_trx: null, bkash_sender: null, bkash_submitted_at: null }).eq('id', o.id)
    bz.current = false; setBusy(false); if (error) return say(error.message)
    say(ok ? `#${o.order_no} payment verified ✓` : `#${o.order_no} payment rejected`); reload()
  }
  const copy = (t, m) => { navigator.clipboard?.writeText(t || '').then(() => say(m + ' copied'), () => say('Could not copy')) }
  const csv = () => {
    const c = v => { v = String(v ?? ''); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"' }
    const rows = [['Order', 'Date', 'Customer', 'Phone', 'Address', 'Items', 'Payment', 'Status', 'Total'], ...list.map(o => [o.order_no, o.created_at, o.address?.name, o.address?.phone, o.address?.address, (o.items || []).map(i => `${i.name}${i.variant ? ' (' + i.variant + ')' : ''} x${i.qty}`).join('; '), o.payment, STEPS[o.status || 0], o.total])]
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(c).join(',')).join('\n')], { type: 'text/csv' })); a.download = 'orders.csv'; a.click(); URL.revokeObjectURL(a.href)
  }
  const cur = sel && orders.find(o => o.id === sel)
  const st = cur ? cur.status || 0 : 0, ph = cur?.address?.phone
  const sub = cur ? (cur.items || []).reduce((a, i) => a + i.price * i.qty, 0) : 0
  return <div className="pg">
    <div className="ob">{STEPS.map((l, i) => <button key={l} className={'s' + i + (f === String(i) ? ' on' : '')} aria-pressed={f === String(i)} onClick={() => setF(f === String(i) ? 'all' : String(i))}><span className="oi"><Ic n={IC[i]} s={16} /></span><small>{l}</small><b><Count to={cnt[i]} /></b></button>)}</div>
    <div className="tl"><label className="sr"><Ic n="search" s={18} /><input className="in" type="search" inputMode="search" enterKeyHint="search" placeholder="Search order, name, phone, address" aria-label="Search orders" value={q} onChange={e => setQ(e.target.value)} /></label>
      <select className="in rg" aria-label="Date range" value={rg} onChange={e => setRg(e.target.value)}>{RANGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      {(vcnt > 0 || vo) && <button className={'vchip' + (vo ? ' on' : '')} aria-pressed={vo} onClick={() => setVo(v => !v)}><Ic n="alert" s={15} />Verify payment<em>{vcnt}</em></button>}
      <button className="bt g sm csvb" onClick={csv}>Export CSV</button></div>
    <p className="sum"><b>{list.length}</b> order{list.length === 1 ? '' : 's'} · <b>{taka(sum)}</b>{f !== 'all' && <> · <button className="lk" onClick={() => setF('all')}>Clear filter</button></>}</p>
    <div className="ol">{list.slice(0, lim).map(o => <OrderCard key={o.id} o={o} onOpen={openSel} onNext={next} />)}{!list.length && <p className="mut pad cd">No orders match. Orders placed in the store appear here instantly.</p>}</div>
    {list.length > lim && <button className="bt g more" onClick={() => setLim(l => l + PAGE)}>Show {Math.min(PAGE, list.length - lim)} more · {list.length - lim} left</button>}
    {cur && <Modal title={'Order #' + cur.order_no} onClose={closeSel} footer={<>{st < 3 && <button className="bt" disabled={busy} onClick={() => setStatus(cur, st + 1)}>{NEXT[st]} →</button>}<button className={'bt' + (st < 3 ? ' g' : '')} onClick={() => setInv(true)}><Ic n="receipt" s={17} />Invoice</button></>}>
      <div className="steps">{STEPS.map((s, i) => <button key={s} disabled={busy} className={st === i ? 'on' : st > i ? 'dn' : ''} onClick={() => setStatus(cur, i)}>{st > i ? '✓ ' : ''}{s}</button>)}</div>
      <div className="cu"><span className="av lg">{ini(cur.address?.name)}</span><span className="g1"><b>{cur.address?.name}</b><small>{ph}</small></span><span className={'pl s' + st}>{STEPS[st]}</span></div>
      <div className="qa">{ph && <a className="bt g sm" href={'tel:' + ph}><Ic n="phone" s={16} />Call</a>}{ph && <a className="bt sm wa" href={wa(ph, WA[defTpl(cur)][2](cur))} target="_blank" rel="noopener noreferrer"><Ic n="chat" s={16} />WhatsApp</a>}</div>
      {ph && <div className="cd wcd"><h3>Message on WhatsApp</h3><div className="wcs">{WA.map(([l, ic, fn]) => <a key={l} className="wc" href={wa(ph, fn(cur))} target="_blank" rel="noopener noreferrer"><Ic n={ic} s={15} />{l}</a>)}</div></div>}
      {cur.payment === 'bKash' && <><h3>bKash payment</h3>
        <div className={'cd bk-a' + (cur.payment_status === 'verifying' ? ' wait' : '')}>
          {cur.payment_status === 'paid' ? <p className="ok">✓ Verified · TrxID {cur.payment_ref || cur.bkash_trx}</p>
            : cur.bkash_trx ? <><p><small>Transaction ID</small><b>{cur.bkash_trx}</b></p><p><small>Paid from</small><b>{cur.bkash_sender}</b></p><p><small>Expected amount</small><b>{taka(cur.total)}</b></p>
              <p className="mut">Check your bKash app or SMS: the TrxID, sender number and amount must all match before you verify.</p>
              <div className="acts"><button className="bt sm" disabled={busy} onClick={() => setPay(cur, true)}>✓ Verify payment</button><button className="bt d sm" disabled={busy} onClick={() => setPay(cur, false)}>Reject</button><button className="bt g sm" onClick={() => copy(cur.bkash_trx, 'TrxID')}>Copy TrxID</button></div></>
            : <><p className="wn">Customer has not submitted a Transaction ID yet.</p>{ph && <a className="bt g sm" href={wa(ph, WA[1][2](cur))} target="_blank" rel="noopener noreferrer"><Ic n="chat" s={15} />Request payment</a>}</>}
        </div></>}
      <h3>Delivery address</h3>
      <div className="cd ad"><p>{cur.address?.address || '—'}</p>{cur.address?.note && <p className="mut">Note: {cur.address.note}</p>}<button className="bt g sm" onClick={() => copy(cur.address?.address, 'Address')}><Ic n="copy" s={15} />Copy address</button></div>
      <h3>Items</h3>
      {(cur.items || []).map((i, ix) => <div className="ln it" key={i.key || ix}><span className="th">{i.image_url ? <img src={i.image_url} alt="" loading="lazy" decoding="async" /> : i.emoji || '🛍️'}</span><span className="g1"><b>{i.name}</b><small>{i.variant ? i.variant + ' · ' : ''}{taka(i.price)} × {i.qty}</small></span><b>{taka(i.price * i.qty)}</b></div>)}
      <div className="sm2"><div><span>Subtotal</span><span>{taka(sub)}</span></div>{sub + (+cur.delivery_fee || 0) - cur.total > 0.5 && <div><span>Discount</span><span className="ok">−{taka(sub + (+cur.delivery_fee || 0) - cur.total)}</span></div>}{cur.delivery_fee != null && <div><span>Delivery{cur.delivery_km != null && ` · ${(+cur.delivery_km).toFixed(1)} km`}</span><span>{taka(cur.delivery_fee)}</span></div>}<div><span>Payment</span><span>{cur.payment} · {payLabel(cur)}</span></div><div className="tt"><span>Total</span><span>{taka(cur.total)}</span></div></div>
      <p className="mut">Placed {fmt(cur.created_at)} · {ago(cur.created_at)}</p>
    </Modal>}
    {cur && inv && <Invoice o={cur} onClose={closeInv} />}</div>
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
  return <div className="pg"><div className="kp"><div className="cd"><small>Total saves</small><b><Count to={wish.length} /></b></div><div className="cd"><small>Products wished</small><b><Count to={rows.length} /></b></div><div className="cd"><small>Customers</small><b><Count to={people} /></b></div><div className="cd"><small>Wished, never ordered</small><b><Count to={rows.filter(r => !ordered.has(String(r.id))).length} /></b></div></div>
    <div className="two"><section className="cd lst"><div className="rh pad"><h2>Most wished products</h2></div>{rows.map(r => { const p = pm[r.id]; return <div className="rw" key={r.id}><span className="th">{p?.image_url ? <img src={p.image_url} alt="" loading="lazy" /> : p?.emoji || '♡'}</span><span className="g1"><b>{nm(r)}</b><small>{[...r.who].slice(0, 3).join(', ')}{r.who.size > 3 ? ` +${r.who.size - 3}` : ''}</small><i className="bar"><i style={{ width: r.n / top * 100 + '%' }} /></i></span><span className="pl">♥ {r.n}</span>{!ordered.has(String(r.id)) && <span className="pl s1 dm">Not ordered</span>}</div> })}{!rows.length && <p className="mut pad">Nothing wishlisted yet. When customers tap ♡ in the store it shows here.</p>}</section>
      <section className="cd"><h2>Recent activity</h2>{wish.slice(0, 20).map(w => <div className="ln" key={w.id}><span><b>{w.user_label || 'Guest'}</b> saved <b>{pm[w.product_id]?.name || w.product_name || 'a product'}</b></span><small>{ago(w.created_at)}</small></div>)}{!wish.length && <p className="mut">No activity yet.</p>}</section></div></div>
}

const blank = { name: '', brand: '', tag: '', category_id: '', price: '', stock: '', emoji: '', image_url: '', is_active: true, variants: [{ label: 'Standard', mult: 1 }], features: '100% original product\nDiscreet packaging' }
const PRESET = ['1 pc', '3 pcs', '5 pcs', '10 pcs', '20 pcs']
const stockTxt = s => s == null || s === '' ? 'Unlimited' : s + ' in stock'

const ProdRow = memo(function ProdRow({ p, cat, onToggle, onEdit, onDup, onDel }) {
  const low = p.stock != null && p.stock <= 5, on = p.is_active !== false
  return <div className={'rw pw' + (on ? '' : ' off')}>
    <span className="th">{p.image_url ? <img src={p.image_url} alt="" loading="lazy" decoding="async" /> : p.emoji || '🛍️'}</span>
    <span className="g1"><b>{p.name}</b><small>{[p.brand, cat].filter(Boolean).join(' · ') || '—'}</small></span>
    <span className="pr"><b>{taka(p.price)}</b><small className={low ? 'wn' : ''}>{stockTxt(p.stock)}</small></span>
    <span className="ra"><button className={'tg' + (on ? ' on' : '')} role="switch" aria-checked={on} aria-label={`${p.name} visible in store`} onClick={() => onToggle(p)}><i /></button><span className="tl2">{on ? 'Live' : 'Hidden'}</span>
      <span className="rb"><button className="ib3" aria-label={'Edit ' + p.name} onClick={() => onEdit(p)}><Ic n="edit" s={17} /></button><button className="ib3" aria-label={'Duplicate ' + p.name} onClick={() => onDup(p)}><Ic n="copy" s={17} /></button><button className="ib3 dg" aria-label={'Delete ' + p.name} onClick={() => onDel(p)}><Ic n="trash" s={17} /></button></span></span>
  </div>
})

function Products({ d, reload, say }) {
  const [q, setQ] = useState(''), [cf, setCf] = useState(''), [e, setE] = useState(null), [busy, setBusy] = useState(false), [up, setUp] = useState(false), [lim, setLim] = useState(PAGE), [er, setEr] = useState({}), orig = useRef('')
  const dq = useDeferredValue(q)
  const cn = useMemo(() => Object.fromEntries(d.cats.map(c => [c.id, c.name])), [d.cats])
  const cc = useMemo(() => { const m = {}; d.products.forEach(p => { m[p.category_id] = (m[p.category_id] || 0) + 1 }); return m }, [d.products])
  const list = useMemo(() => { const k = dq.trim().toLowerCase(); return d.products.filter(p => (!cf || p.category_id === cf) && (!k || `${p.name} ${p.brand || ''}`.toLowerCase().includes(k))) }, [d.products, dq, cf])
  const stats = useMemo(() => ({ live: list.filter(p => p.is_active !== false).length, low: list.filter(p => p.stock != null && p.stock <= 5).length }), [list])
  useEffect(() => { setLim(PAGE) }, [cf, dq])
  const dirty = !!e && JSON.stringify(e) !== orig.current
  const open = useCallback((p, dup) => {
    const v = p ? { ...blank, ...p, stock: p.stock ?? '', emoji: p.emoji || '', brand: p.brand || '', tag: p.tag || '', image_url: p.image_url || '', is_active: p.is_active !== false, variants: (p.variants?.length ? p.variants : blank.variants).map(x => ({ ...x })), features: (p.features || []).join('\n') } : { ...blank, variants: blank.variants.map(x => ({ ...x })), category_id: cf || d.cats[0]?.id || '' }
    if (dup) { delete v.id; v.name = v.name + ' (copy)' }
    orig.current = JSON.stringify(v); setE(v); setEr({}); setUp(false)
  }, [cf, d.cats])
  const edit = useCallback(p => open(p, false), [open])
  const dup = useCallback(p => open(p, true), [open])
  const close = () => { if (dirty && !window.confirm('Discard your unsaved changes?')) return; setE(null) }
  const toggle = useCallback(async p => { const { data, error } = await sb.from('products').update({ is_active: p.is_active === false }).eq('id', p.id).select(); if (error) return say(error.message); if (!data?.length) return say('Not saved. This account may not have permission to edit products.'); reload() }, [say, reload])
  const del = useCallback(async p => { if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return; const { data, error } = await sb.from('products').delete().eq('id', p.id).select(); if (error) return say(error.message); if (!data?.length) return say('Not deleted. This account may not have permission to delete products.'); say('Product deleted'); reload() }, [say, reload])
  const save = async () => {
    const x = {}
    if (!e.name.trim()) x.name = 'Enter a product name'
    if (!e.category_id) x.category_id = 'Choose a category'
    if (!(+e.price > 0)) x.price = 'Enter a price above 0'
    if (Object.keys(x).length) { setEr(x); say('Fix the highlighted fields'); setTimeout(() => document.querySelector('.md .f.bad .in')?.focus(), 60); return }
    const v = e.variants.filter(y => y.label.trim()).map(y => ({ label: y.label.trim(), mult: +y.mult || 1 }))
    const row = { name: e.name.trim(), brand: e.brand.trim() || null, tag: e.tag.trim() || null, category_id: e.category_id, price: +e.price, stock: e.stock === '' ? null : Math.max(0, +e.stock), emoji: e.emoji || null, image_url: e.image_url || null, is_active: e.is_active, variants: v.length ? v : blank.variants, features: e.features.split('\n').map(s => s.trim()).filter(Boolean), ...(e.id ? {} : { rating: 4.5, reviews: 0 }) }
    setBusy(true); const { data, error } = await (e.id ? sb.from('products').update(row).eq('id', e.id).select() : sb.from('products').insert(row).select()); setBusy(false)
    if (error) return say(error.message); if (!data?.length) return say('Not saved. This account may not have permission to change products.')
    say(e.id ? 'Product saved' : 'Product added. It is live in the store.'); setE(null); reload()
  }
  const s = (k, v) => { setE(x => ({ ...x, [k]: v })); if (er[k]) setEr(r => ({ ...r, [k]: undefined })) }
  const sv = (i, k, v) => setE(x => ({ ...x, variants: x.variants.map((y, j) => j === i ? { ...y, [k]: v } : y) }))
  const step = n => s('stock', String(Math.max(0, (+e.stock || 0) + n)))
  const preset = l => setE(x => x.variants.some(v => v.label === l) ? x : { ...x, variants: [...x.variants.filter(v => v.label.trim()), { label: l, mult: parseFloat(l) || 1 }] })
  return <div className="pg">
    <div className="tl"><label className="sr"><Ic n="search" s={18} /><input className="in" type="search" inputMode="search" enterKeyHint="search" placeholder="Search products or brand" aria-label="Search products" value={q} onChange={x => setQ(x.target.value)} /></label>
      <button className="bt add" onClick={() => open()} disabled={!d.cats.length} title={d.cats.length ? '' : 'Add a category first'}><Ic n="plus" s={18} />Add product</button></div>
    <div className="chips"><button className={!cf ? 'on' : ''} onClick={() => setCf('')}>All ({d.products.length})</button>{d.cats.map(c => <button key={c.id} className={cf === c.id ? 'on' : ''} onClick={() => setCf(cf === c.id ? '' : c.id)}>{c.icon} {c.name} ({cc[c.id] || 0})</button>)}</div>
    <p className="sum"><b>{list.length}</b> product{list.length === 1 ? '' : 's'} · <b>{stats.live}</b> live · <b className={stats.low ? 'wn' : ''}>{stats.low}</b> low stock</p>
    <div className="cd lst">{list.slice(0, lim).map(p => <ProdRow key={p.id} p={p} cat={cn[p.category_id]} onToggle={toggle} onEdit={edit} onDup={dup} onDel={del} />)}{!list.length && <p className="mut pad">{d.products.length ? 'No products match your search.' : 'No products yet. Add your first one.'}</p>}</div>
    {list.length > lim && <button className="bt g more" onClick={() => setLim(l => l + PAGE)}>Show {Math.min(PAGE, list.length - lim)} more · {list.length - lim} left</button>}
    {!e && d.cats.length > 0 && <button className="fab" aria-label="Add product" onClick={() => open()}><Ic n="plus" s={26} /></button>}
    {e && <Modal cls="pm" title={e.id ? 'Edit product' : 'Add product'} onClose={close} footer={<><button className="bt" disabled={busy || up} onClick={save}>{busy ? 'Saving…' : up ? 'Uploading image…' : e.id ? 'Save changes' : 'Add product'}</button><button className="bt g" onClick={close}>Cancel</button></>}>
      <div className="pp"><span className="th lg">{e.image_url ? <img src={e.image_url} alt="" /> : e.emoji || '🛍️'}</span><span className="g1"><b>{e.name.trim() || 'New product'}</b><small>{cn[e.category_id] || 'No category'}{e.tag ? ' · ' + e.tag : ''}</small></span><span className="pr"><b>{+e.price > 0 ? taka(e.price) : '৳—'}</b><small>{stockTxt(e.stock)}</small></span></div>
      <section className="fs"><h3>Basics</h3>
        <F l="Name *" err={er.name}><input className="in" autoComplete="off" enterKeyHint="next" value={e.name} onChange={x => s('name', x.target.value)} /></F>
        <div className="fg"><F l="Category *" err={er.category_id}><select className="in" value={e.category_id} onChange={x => s('category_id', x.target.value)}><option value="" disabled>Choose…</option>{d.cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></F>
          <F l="Brand"><input className="in" autoComplete="off" value={e.brand} onChange={x => s('brand', x.target.value)} /></F></div>
        <F l="Label (e.g. Thin, Flavoured)"><input className="in" autoComplete="off" value={e.tag} onChange={x => s('tag', x.target.value)} /></F></section>
      <section className="fs"><h3>Price & stock</h3>
        <div className="fg"><F l="Base price (৳) *" err={er.price}><span className="pf"><i>৳</i><input className="in" type="number" min="0" inputMode="decimal" enterKeyHint="next" value={e.price} onChange={x => s('price', x.target.value)} /></span></F>
          <F l="Stock (blank = unlimited)"><span className="st"><button type="button" className="ib3" aria-label="Decrease stock" onClick={() => step(-1)}><Ic n="minus" s={18} /></button><input className="in" type="number" min="0" inputMode="numeric" placeholder="Unlimited" value={e.stock} onChange={x => s('stock', x.target.value)} /><button type="button" className="ib3" aria-label="Increase stock" onClick={() => step(1)}><Ic n="plus" s={18} /></button></span></F></div></section>
      <section className="fs"><h3>Image</h3><Img value={e.image_url} folder="products" say={say} onBusy={setUp} onChange={v => s('image_url', v)} /><F l="Emoji shown when there is no image"><input className="in sm" maxLength={8} value={e.emoji} onChange={x => s('emoji', x.target.value)} /></F></section>
      <section className="fs"><h3>Variants</h3>
        {e.variants.map((v, i) => <div className="vr" key={i}><input className="in" aria-label="Variant name" placeholder="e.g. 10 pcs" value={v.label} onChange={x => sv(i, 'label', x.target.value)} /><input className="in" aria-label="Price multiplier" type="number" step="0.05" min="0" inputMode="decimal" value={v.mult} onChange={x => sv(i, 'mult', x.target.value)} /><b>{taka(+e.price * (+v.mult || 1))}</b><button type="button" className="ib3 dg" aria-label="Remove variant" onClick={() => setE(x => ({ ...x, variants: x.variants.filter((_, j) => j !== i) }))}><Ic n="close" s={16} /></button></div>)}
        <div className="pre" aria-label="Quick add variant">{PRESET.map(l => <button type="button" key={l} onClick={() => preset(l)}>+ {l}</button>)}</div>
        <button type="button" className="bt g sm" onClick={() => setE(x => ({ ...x, variants: [...x.variants, { label: '', mult: 1 }] }))}><Ic n="plus" s={15} />Custom variant</button>
        <small>Variant price = base price × multiplier.</small></section>
      <section className="fs"><h3>Details</h3><F l="Features (one per line)"><textarea className="in" rows="4" value={e.features} onChange={x => s('features', x.target.value)} /></F></section>
      <div className="vis"><span><b>Visible in the store</b><small>{e.is_active ? 'Customers can see and order it' : 'Hidden from customers'}</small></span><button type="button" className={'tg' + (e.is_active ? ' on' : '')} role="switch" aria-checked={e.is_active} aria-label="Visible in store" onClick={() => s('is_active', !e.is_active)}><i /></button></div>
    </Modal>}</div>
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

const DEF = [{ chip: 'Limited Offer', lines: 'Privacy. Confidence.\nComfort. Wellness.', emoji: '🛡️', image: '', on: true }, { chip: 'Delivery from ৳40', lines: 'Discreet delivery\nacross Chattogram', emoji: '🚚', image: '', on: true }, { chip: 'Use code SHIELD10', lines: 'Get 10% off\nyour first order', emoji: '🎁', image: '', on: true }]
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
