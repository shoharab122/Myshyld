import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import * as api from './api'

const taka = n => '৳' + Math.round(n).toLocaleString()
const NAV = [['home', 'home', 'Home'], ['categories', 'grid', 'Categories'], ['cart', 'bag', 'Cart'], ['orders', 'receipt', 'Orders'], ['profile', 'user', 'Profile']]
const TABS = NAV.map(n => n[0])
const OB = [
  { e: '👩‍🦰', t: ['Your Privacy', 'Our Priority'], d: 'Get essential personal care products delivered to your doorstep, discreetly and safely.' },
  { e: '🛡️', t: ['Daily Essentials', 'Without the Awkwardness'], d: 'Condoms and sanitary pads, all variants, delivered with dignity.' },
  { e: '📦', t: ['Discreet Delivery', 'Across Chattogram'], d: 'Plain packaging. No product name. No judgment.' },
]
const STEPS = ['Order Placed', 'Processing', 'Out for Delivery', 'Delivered']
const PAYS = [['Cash on Delivery', 'Pay when you receive', '💵'], ['bKash', 'Send money, then enter your TrxID', '🌸'], ['Nagad', 'Pay with Nagad', '🟠'], ['Debit/Credit Card', 'Visa, Mastercard', '💳']]
const OFFERS = [['Limited Offer', 'Privacy. Confidence.|Comfort. Wellness.', '🛡️'], ['Free Delivery', 'Discreet delivery|across Chattogram', '🚚'], ['Use code SHIELD10', 'Get 10% off|your first order', '🎁']]
const SORTS = { pop: ['Popular', (a, b) => b.reviews - a.reviews], lo: ['Price: Low → High', (a, b) => a.price - b.price], hi: ['Price: High → Low', (a, b) => b.price - a.price], rate: ['Top rated', (a, b) => b.rating - a.rating] }
const RIPPLE = '.bshop,.cc,.btn,.fab,.add,.cat,.card,.pay,.menu,.ib,.tabs button,.chips button,.var button,.heart,.qty button,.promo button,.social'
const NOMOTION = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

// graceful API wrapper: never throws, returns fallback
const safe = async (fn, fb = null) => { try { return await fn() } catch { return fb } }
const readLS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage full / blocked */ } }
const PayLogo = ({ k }) => {
  const box = { width: 64, height: 44, borderRadius: 12, flex: 'none', display: 'block', boxShadow: '0 4px 10px #4a166822' }
  const t = { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif' }
  if (k === 1) return <svg style={box} viewBox="0 0 64 44" role="img" aria-label="bKash"><rect width="64" height="44" rx="12" fill="#E2136E" /><path d="M9 9l9 3-4 8z" fill="#fff" opacity=".9" /><path d="M9 9l5 11-8 2z" fill="#ffd1e5" /><text x="34" y="29" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="800" fontStyle="italic" style={t}>bKash</text></svg>
  if (k === 2) return <svg style={box} viewBox="0 0 64 44" role="img" aria-label="Nagad"><defs><linearGradient id="ng" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F7941D" /><stop offset="1" stopColor="#ED1C24" /></linearGradient></defs><rect width="64" height="44" rx="12" fill="url(#ng)" /><circle cx="14" cy="22" r="6" fill="none" stroke="#fff" strokeWidth="3" /><text x="40" y="27" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800" style={t}>Nagad</text></svg>
  if (k === 3) return <svg style={box} viewBox="0 0 64 44" role="img" aria-label="Card"><rect width="64" height="44" rx="12" fill="#1a1f71" /><circle cx="25" cy="22" r="10" fill="#EB001B" /><circle cx="39" cy="22" r="10" fill="#F79E1B" /><path d="M32 13.7a10 10 0 0 1 0 16.6 10 10 0 0 1 0-16.6z" fill="#FF5F00" /></svg>
  return <svg style={box} viewBox="0 0 64 44" role="img" aria-label="Cash on delivery"><rect width="64" height="44" rx="12" fill="#1f8a54" /><rect x="12" y="12" width="40" height="20" rx="4" fill="#fff" opacity=".95" /><circle cx="32" cy="22" r="6" fill="#1f8a54" /><text x="32" y="26" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="800" style={t}>৳</text><circle cx="17" cy="22" r="1.8" fill="#1f8a54" /><circle cx="47" cy="22" r="1.8" fill="#1f8a54" /></svg>
}
const devId = () => { let d = readLS('ms_dev', null); if (!d) { d = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'd' + Date.now() + Math.random().toString(36).slice(2); writeLS('ms_dev', d) } return d }
const realUid = u => (u?.id && u.id !== 'local' ? u.id : null)

/* ---------- Liquid button skin: injected once, layered on top of styles.css ---------- */
const LIQUID_CSS = `
/* specular light that follows the pointer */
.btn::before{inset:0;background:radial-gradient(130px circle at var(--mx,-999px) var(--my,-999px),#ffffff8c,#fff0 70%),linear-gradient(#ffffff40,#ffffff00 52%)}
.fab::before,.add::before,.ib::before,.heart::before,.qty button::before,.chips button::before,.var button::before,.promo button::before{content:'';position:absolute;inset:0;border-radius:inherit;background:radial-gradient(70px circle at var(--mx,-999px) var(--my,-999px),#ffffffb0,#fff0 70%);opacity:0;transition:opacity .35s;pointer-events:none;z-index:-1}
/* liquid shape: buttons breathe like a droplet */
@keyframes lqWob{0%,100%{border-radius:18px 24px 18px 24px/24px 18px 24px 18px}50%{border-radius:24px 18px 26px 18px/18px 26px 18px 24px}}
@keyframes lqBlob{0%,100%{border-radius:50%}33%{border-radius:56% 44% 52% 48%/47% 55% 45% 53%}66%{border-radius:45% 55% 47% 53%/54% 46% 54% 46%}}
@keyframes lqRp{from{transform:scale(0);opacity:1}to{transform:scale(1);opacity:0}}
@keyframes lqPop{0%{transform:scale(1)}28%{transform:scale(.8,1.14)}56%{transform:scale(1.12,.9)}80%{transform:scale(.97,1.03)}100%{transform:scale(1)}}
@keyframes lqGlow{0%,100%{filter:drop-shadow(0 0 0 #e0457b00)}50%{filter:drop-shadow(0 4px 10px #e0457b66)}}
.btn:not(:disabled):active{transform:scale(.95,.9);border-radius:28px 28px 28px 28px/22px 22px 22px 22px}
.fab,.add{animation:lqBlob 6s ease-in-out infinite,lqGlow 3.2s ease-in-out infinite}
.lq-pop{animation:lqPop .55s var(--spring) !important}
/* richer, rounder ripple: a soft ring plus a glow core */
.rp{background:radial-gradient(circle,#fff0 0,#fff0 40%,#ffffff99 50%,#ffffff40 60%,#fff0 72%),radial-gradient(circle,#ffffffb3,#fff0 58%);animation:lqRp .85s var(--ease) forwards}
.btn.o .rp,.ib .rp,.heart .rp,.qty button .rp,.chips button:not(.on) .rp,.var button:not(.on) .rp,.menu .rp,.pay .rp,.cat .rp,.card .rp,.tabs button:not(.on) .rp{background:radial-gradient(circle,#fff0 0,#fff0 40%,#e0457b55 50%,#8e2a8c26 60%,#fff0 72%),radial-gradient(circle,#e0457b33,#fff0 58%)}
/* selected pills & variants get a living gradient */
.chips .on,.var .on{background-size:220% 100%;box-shadow:0 8px 20px #8e2a8c55,inset 0 1.5px 0 #ffffff70,inset 0 -6px 10px #4a166844}
.chips button,.var button,.qty button,.promo button,.ib,.heart{transition:transform .4s var(--spring),box-shadow .3s,background-color .3s}
@media (hover:hover){
  .btn:not(.o):not(:disabled):hover{animation:lqWob 1.6s ease-in-out infinite;filter:saturate(1.12) brightness(1.04)}
  .btn.o:hover{box-shadow:0 12px 26px #8e2a8c33,inset 0 1px 0 #fffd;transform:translateY(-2px)}
  .fab:hover,.add:hover{transform:scale(1.14);box-shadow:0 12px 26px #e0457b77,inset 0 1.5px 0 #ffffff90,inset 0 -6px 10px #4a166844}
  .ib:hover,.heart:hover,.qty button:hover{transform:translateY(-2px) scale(1.08);box-shadow:0 10px 22px #8e2a8c40,inset 0 1px 0 #fffd}
  .chips button:hover,.var button:hover{transform:translateY(-2px);box-shadow:0 10px 22px #8e2a8c33,inset 0 1px 0 #fffd}
  .promo button:hover{filter:brightness(1.12)}
  .fab:hover::before,.add:hover::before,.ib:hover::before,.heart:hover::before,.qty button:hover::before,.chips button:hover::before,.var button:hover::before,.promo button:hover::before{opacity:1}
}
/* ---------- Profile page ---------- */
.scr.narrow.pf{max-width:880px}
.pf{display:grid;grid-auto-rows:max-content;gap:20px;align-content:start}
.pf>*{min-width:0;flex-shrink:0}
.pf-hero{position:relative;overflow:hidden;min-height:132px;border-radius:30px;padding:24px 26px;display:flex;align-items:center;gap:18px;color:#fff;background:linear-gradient(125deg,#4a1668,#8e2a8c 55%,#e0457b);box-shadow:0 22px 44px #8e2a8c44,inset 0 1px 0 #ffffff66}
.pf-hero::before{content:'';position:absolute;width:260px;height:260px;right:-70px;top:-110px;border-radius:50%;background:radial-gradient(circle,#ffffff50,#fff0 70%)}
.pf-hero::after{content:'';position:absolute;width:200px;height:200px;left:30%;bottom:-130px;border-radius:50%;background:radial-gradient(circle,#ff9ac455,#fff0 70%)}
.pf-av{position:relative;z-index:1;flex:none;padding:5px;border-radius:50%;background:#ffffff38;box-shadow:0 0 0 1px #ffffff66,0 12px 26px #4a166866}
.pf-av .av{width:82px;height:82px;font-size:34px;background:#fff;color:var(--p2);box-shadow:inset 0 -8px 14px #8e2a8c22}
.pf-id{position:relative;z-index:1;min-width:0;display:grid;gap:2px;justify-items:start}
.pf-id em{font-style:normal;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#ffffffb8;font-weight:600}
.pf-id b{font-size:24px;line-height:1.2;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pf-id small{color:#ffffffd0;font-size:13px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pf-bd{margin-top:8px;font-size:11px;font-weight:700;padding:4px 11px;border-radius:99px;background:#ffffff2e;border:1px solid #ffffff55}
.pf-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.pf-stats>*{display:grid;grid-template-columns:44px 1fr;grid-template-rows:auto auto;align-items:center;column-gap:12px;text-align:left;padding:14px;border-radius:22px;background:var(--glass);border:1px solid var(--edge);box-shadow:var(--sh);transition:transform .35s var(--spring),box-shadow .3s}
.pf-stats i{grid-row:span 2;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-style:normal;font-size:20px;box-shadow:inset 0 1px 0 #fffb,0 4px 10px #4a166814}
.pf-stats b{font-size:18px;color:var(--p1);align-self:end;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pf-stats small{color:var(--mute);font-size:11px;align-self:start}
.pf-stats button:active{transform:scale(.95)}
@media (hover:hover){.pf-stats button:hover{transform:translateY(-3px);box-shadow:0 16px 30px #8e2a8c2e,inset 0 1px 0 #fffd}}
.pf-cols{display:grid;grid-template-columns:1fr;gap:20px;align-items:start}
.pf-col{display:grid;gap:20px;align-content:start;min-width:0}
@media (min-width:900px){.pf-cols{grid-template-columns:1fr 1fr}}
.pf-t{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);margin:0 6px 8px;font-weight:700}
.pf-g{border-radius:26px;overflow:hidden;background:var(--glass);border:1px solid var(--edge);box-shadow:var(--sh)}
.pf .pm{align-items:center;gap:14px;padding:12px 16px;min-height:68px;border-radius:0;border-bottom:1px solid #4a166812}
.pf .pm:last-child{border-bottom:0}
.pi{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-size:20px;flex:none;box-shadow:inset 0 1px 0 #fffb,0 4px 10px #4a166814}
.pt{display:grid;gap:1px;text-align:left;min-width:0}.pt b{color:var(--ink);font-size:15px}.pt small{color:var(--mute);font-size:12px;font-weight:400}
.pf .pm>span:last-child{font-size:24px;line-height:1;transition:transform .3s var(--spring)}
@media (hover:hover){.pf .pm:hover{background:#ffffff80}.pf .pm:hover>span:last-child{transform:translateX(4px);color:var(--p3)}}
.pf .pf-out{justify-content:center;align-items:center;gap:10px;padding:15px;min-height:56px;border-radius:22px;border:1.5px solid #f6c6d3;background:linear-gradient(145deg,#fff3f6,#ffe7ee);color:#c62d4a;font-weight:700;box-shadow:0 8px 20px #c62d4a1a}
.pf .pf-out span:last-child{margin-left:0;color:inherit}
@media (max-width:520px){.pf-hero{padding:20px 18px;gap:14px}.pf-av .av{width:68px;height:68px;font-size:28px}.pf-stats{grid-template-columns:1fr 1fr}.pf-stats>:last-child{grid-column:span 2}}
/* ================= Modern shop layout (same brand colours) ================= */
.ico{display:block;flex:none}
.hdr{display:grid;grid-template-columns:46px 1fr 46px;align-items:center;gap:12px;text-align:center;background:none;-webkit-backdrop-filter:none;backdrop-filter:none;font-size:17px}
.hdr .ht{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hdr .ib,.topbar .ib{width:46px;height:46px;background:#fff;color:var(--ink);box-shadow:0 6px 18px #4a166822}
.ib.ghost{visibility:hidden;pointer-events:none}
.ib .cb{position:absolute;top:4px;right:3px;margin:0;min-width:17px;text-align:center;font-size:10px;line-height:1.5}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px}
.loc{display:grid;text-align:center;gap:1px}.loc small{font-size:11px}.loc b{font-size:14px}
.search{min-height:56px;border-radius:999px;padding:0 7px 0 18px;margin:14px 0;background:#fff;color:var(--mute);box-shadow:0 8px 24px #4a16681a}
.search input{color:var(--ink);padding:16px 4px;min-width:0}
.sf{width:42px;height:42px;border-radius:50%;flex:none;display:grid;place-items:center;background:#f6effb;color:var(--p1)}
.bw{margin:2px 0 6px}
.banner{font-size:inherit;margin:0;min-height:176px;padding:22px;border-radius:30px;display:flex;align-items:center}
.bt{max-width:62%;align-items:flex-start;gap:6px}
.bchip{background:var(--ink);color:#fff;font-size:11px;font-weight:600;padding:5px 12px;border-radius:99px}
.bt h3{display:grid;font-size:19px;line-height:1.2;font-weight:800;margin-top:4px}
.bshop{display:inline-flex;align-items:center;gap:12px;margin-top:10px;padding:6px 6px 6px 18px;border-radius:999px;background:var(--ink);color:#fff;font-weight:700;font-size:14px;position:relative;overflow:hidden;isolation:isolate}
.bshop i{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#fff;color:var(--ink);font-style:normal;font-size:16px}
.be{top:0;bottom:0;right:16px;display:grid;place-items:center}
.bd{position:static;justify-content:center;margin-top:10px}
.bd i{background:#d9c8ea}.bd i.on{width:22px;background:var(--grad)}
.sec{align-items:center;font-size:17px;margin:14px 2px 12px}.sec a{font-size:13px}
.catrow{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 14px;scrollbar-width:none}.catrow::-webkit-scrollbar{display:none}
.cc{flex:none;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 16px;border-radius:22px;background:#fff;border:1px solid var(--edge);box-shadow:0 6px 18px #4a16681a;position:relative;overflow:hidden;isolation:isolate;transition:transform .35s var(--spring)}
.cc b{font-size:14px;text-align:left;line-height:1.2;max-width:84px}
.cc span{width:46px;height:46px;border-radius:16px;background:linear-gradient(135deg,#f3e9fb,#fde7f0);display:grid;place-items:center;font-size:24px}
.cc span img{width:1.2em;height:auto;display:block}
.cc:active{transform:scale(.95)}
.card{padding:8px 8px 12px;border-radius:26px;background:linear-gradient(#fff,#fffafd);box-shadow:0 10px 26px #4a16681f}
.card .pic{height:auto;aspect-ratio:1/1.05;border-radius:20px;font-size:60px}
.card .heart{left:auto;right:14px;top:14px;background:#fff}
.card .cinfo{display:grid;gap:2px;padding:10px 6px 0}
.card .cinfo small{padding:0;font-size:11px}
.card .cinfo h4{margin:0;font-size:14px;min-height:2.6em;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cfoot{display:flex;align-items:center;justify-content:space-between;margin-top:6px}
.card .cfoot b{padding:0;margin:0;font-size:16px}
.card .cfoot .add{position:relative;right:auto;bottom:auto;width:36px;height:36px;font-size:20px}
.skel{height:230px;border-radius:26px}
.chips button{background:#fff;border-radius:999px;min-height:42px}
.cats .cat,.cats .cat:nth-child(2n){border-radius:26px;background:linear-gradient(160deg,#fff,#fdf3f8)}
.pd .big{height:auto;aspect-ratio:1/.92;max-height:44vh;border-radius:30px;margin-bottom:0;font-size:120px}
.pdp{gap:16px}
.pdp-info{display:grid;gap:12px;align-content:start}
.pk{text-transform:uppercase;letter-spacing:.08em;font-size:11px;color:var(--mute);font-weight:600}
.pdp-info .row{gap:12px;align-items:flex-start}.pdp-info .row h3{font-size:24px;line-height:1.15}
.heart.inl{left:auto;top:auto;right:auto;width:46px;height:46px;background:#fff;box-shadow:0 6px 18px #4a166822}
.store{display:flex;align-items:center;gap:12px;padding:10px;border-radius:22px;background:#fff;border:1px solid var(--edge);box-shadow:0 6px 18px #4a166814}
.store .sl{width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#f3e9fb,#fde7f0);display:grid;place-items:center;flex:none}.store .sl img{width:28px;height:auto}
.store>div{flex:1;min-width:0;display:grid}.store b{font-size:14px}.store small{font-size:12px}
.store .vf{display:inline-grid;place-items:center;width:16px;height:16px;border-radius:50%;background:var(--grad);color:#fff;font-size:10px;font-style:normal;margin-left:6px;vertical-align:middle}
.store .fl{padding:9px 16px;border-radius:999px;background:var(--ink);color:#fff;font-size:13px;font-weight:600}
.opt{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}
.opt-l{display:grid;gap:8px;min-width:0;flex:1}.opt-l>span,.opt-r>span{font-size:12px;color:var(--mute);font-weight:600}
.pdp-info .var{margin:0;gap:8px}
.pdp-info .var button{flex:0 0 auto;min-width:54px;min-height:46px;padding:0 14px;border-radius:14px;background:#fff;font-weight:600}
.pdp-info .var .on{background:var(--grad);color:#fff}
.opt-r{display:grid;gap:8px;justify-items:end}
.pdp-info .qty{background:#fff;border:1px solid var(--line);border-radius:16px;padding:4px;gap:4px;box-shadow:0 6px 18px #4a166814;font-weight:700}
.pdp-info .qty button{border:0;width:38px;height:38px;border-radius:12px;background:#f6effb;color:var(--p1)}
.pdp-info .qty button:last-child{background:var(--grad);color:#fff}
.qn{min-width:26px;text-align:center}
.dsc h5{font-size:12px;color:var(--mute);margin-bottom:4px;text-transform:uppercase;letter-spacing:.08em}
.buybar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:6px 14px calc(14px + env(safe-area-inset-bottom));padding:9px 9px 9px 22px;border-radius:999px;background:#ffffffee;border:1px solid var(--edge);box-shadow:0 16px 40px #4a166833;position:relative;z-index:6}
.buybar small{display:block;color:var(--mute);font-size:12px}.buybar b{font-size:22px;font-weight:800;color:var(--p1)}
.btn.buy{width:auto;flex:none;padding:0 26px;display:inline-flex;align-items:center;justify-content:center;gap:8px}
.item{border-radius:26px;background:#fff;box-shadow:0 8px 22px #4a166818}
.item .pic{width:84px;height:84px;border-radius:18px;font-size:38px}
.item .qty{background:#f6effb;border-radius:999px;padding:3px;gap:4px}
.item .qty button{width:34px;height:34px;border:0;background:#fff;color:var(--p1)}
.item .qty button:last-child{background:var(--grad);color:#fff}
.sum{background:#fff;border-radius:24px;padding:16px;box-shadow:0 8px 22px #4a166818;margin-top:6px}
.promo{border-radius:999px;background:#fff;padding:5px}.promo input{padding:12px 16px}.promo button{border-radius:999px}
.inp{border-radius:18px;background:#fff;border:1.5px solid var(--line)}
.pay{border-radius:22px;background:#fff;padding:16px}
.tl{background:#fff;border-radius:24px;padding:18px 18px 4px;box-shadow:0 8px 22px #4a166818}
.way{border-radius:22px}
.stp{display:flex;justify-content:space-between;position:relative;margin:2px 6px 18px}
.stp::before{content:'';position:absolute;left:16%;right:16%;top:15px;height:2px;background:var(--line)}
.stp>div{position:relative;display:grid;justify-items:center;gap:6px;font-size:12px;color:var(--mute);flex:1}
.stp i{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:700;font-size:13px;background:#fff;border:2px solid var(--line);color:var(--mute)}
.stp .on{color:var(--p1);font-weight:600}.stp .on i{background:var(--grad);border-color:transparent;color:#fff}
@media(max-width:899px){
 .nav{margin:4px 14px calc(10px + env(safe-area-inset-bottom));padding:6px;gap:2px;border-radius:999px;border:1px solid var(--edge);background:#ffffffe6;box-shadow:0 16px 40px #4a166833;justify-content:space-between}
 .nav button{flex:1;min-height:50px;font-size:0;flex-direction:row;gap:8px;border-radius:999px;justify-content:center}
 .nav button::before{inset:0;border-radius:999px;background:linear-gradient(135deg,#f6e9fb,#fde7f0);box-shadow:inset 0 1px 0 #fff}
 .nav button span{font-size:22px}
 .nav .on{flex:0 0 auto;padding:0 20px;font-size:13px}
 .nav .on span{filter:none;opacity:1;transform:none;font-size:20px}
 .nav em{top:6px;right:calc(50% - 22px)}.nav .on em{right:10px}
 .toast{bottom:calc(92px + env(safe-area-inset-bottom))}
}
@media(min-width:900px){
 .buybar{max-width:760px;width:calc(100% - 48px);margin:8px auto 20px}
 .pd .big{aspect-ratio:auto;height:420px;max-height:none}
 .bt{max-width:55%}.bt h3{font-size:30px}
}
/* ================= Mobile polish & performance ================= */
.add{animation:none}
.fab{animation:lqBlob 6s ease-in-out infinite}
@media(max-width:899px){
 .app::before{animation:none}
 .pg>.scr:not(:first-child){padding-top:10px}
 .pg>.scr:last-child{padding-bottom:calc(24px + env(safe-area-inset-bottom))}
 .btn,.ib,.cc,.chips button,.var button,.add,.menu,.nav button,.heart,.qty button{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
 img{-webkit-touch-callout:none}
 .hdr{position:relative;padding-bottom:6px}
 .banner{min-height:168px}
 .store .fl{padding:8px 14px}
 .opt{flex-wrap:wrap}
}
@media(max-width:360px){.bt{max-width:68%}.bt h3{font-size:17px}.buybar{padding-left:16px}.btn.buy{padding:0 18px}}
/* ---------- delivery address ---------- */
.loc{text-align:left;max-width:70%;padding:4px 8px 4px 2px;border-radius:14px;justify-items:start}
.loc b{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.loc b i{font-style:normal;color:var(--p3)}
.lbl{display:grid;gap:6px;font-size:12px;font-weight:600;color:var(--mute);margin-bottom:12px}
.lbl .inp{margin:0;font-weight:400;color:var(--ink);resize:none}
.chips.wrap{flex-wrap:wrap;overflow:visible;padding:0 0 16px;gap:8px}
.chips.wrap button{flex:none;padding:0 16px;min-height:40px;line-height:1;font-size:14px}
.lbl{font-size:13px}
.prev{display:flex;gap:12px;align-items:center;padding:14px;border-radius:22px;background:#fff;border:1px solid var(--edge);box-shadow:0 6px 18px #4a166814;margin-bottom:16px}
.prev>span{width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#f3e9fb,#fde7f0);display:grid;place-items:center;font-size:20px;flex:none}
.prev div{display:grid;min-width:0}.prev b{font-size:14px;overflow-wrap:anywhere}.prev small{font-size:11px}
.buybar.one{padding:8px}.buybar.one .btn{width:100%}
/* ---------- modern navigation buttons ---------- */
.nav button span{display:grid;place-items:center;line-height:0;filter:none;opacity:1}
.nav .ico{width:22px;height:22px}
.nav button{transition:color .25s,transform .3s var(--spring)}
.nav button:active{transform:scale(.92)}
.nav button.on{color:#fff}
.nav button.on::before{opacity:1;transform:none;background:var(--grad);box-shadow:inset 0 1.5px 0 #ffffff77,inset 0 -8px 12px #2d0b4a40,0 10px 20px -6px #ff3358aa}
.nav button.on span{filter:none;opacity:1;animation:lqPop .5s var(--spring)}
.nav button.on em{background:#fff;color:var(--coral);box-shadow:none}
@media(min-width:900px){.nav button.on{color:#fff}.nav button.on span{transform:none}}
/* ---------- modern profile buttons ---------- */
.pi,.pf-stats i{transition:background .3s,color .3s,transform .35s var(--spring)}
.pi .ico,.pf-stats i .ico{width:22px;height:22px}
.t1{background:linear-gradient(135deg,#ffeaf0,#ffd3df);color:#e0457b}
.t2{background:linear-gradient(135deg,#f6ecfc,#e6d3f7);color:#8e2a8c}
.t3{background:linear-gradient(135deg,#efe8fb,#dccff4);color:#4a1668}
.pf .pm .chev{width:30px;height:30px;border-radius:50%;background:#f6effb;color:var(--p1);display:grid;place-items:center;font-size:0;margin-left:auto;transition:background .3s,color .3s,transform .3s var(--spring)}
.pf .pm .chev .ico{width:16px;height:16px}
.pf .pm:active .pi{transform:scale(.92)}
@media(hover:hover){
 .pf .pm:hover .pi,.pf-stats button:hover i{background:var(--grad);color:#fff}
 .pf .pm:hover .chev{background:var(--grad);color:#fff;transform:translateX(3px)}
}
.pf .pf-out{background:#fff;border:1.5px solid #ffd0da;color:#d12a4f;box-shadow:0 8px 20px #ff33581f;gap:12px;transition:background .3s,color .3s,transform .35s var(--spring)}
.pf .pf-out span:first-child{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#fff0f3;color:#d12a4f;transition:background .3s,color .3s}
.pf .pf-out .ico{width:18px;height:18px}
.pf .pf-out:active{transform:scale(.97)}
@media(hover:hover){.pf .pf-out:hover{background:linear-gradient(120deg,#ff7a9c,#ff3358 55%,#b8174f);border-color:transparent;color:#fff}.pf .pf-out:hover span:first-child{background:#ffffff33;color:#fff}}
/* ---------- Login v2: compact logo, aligned fields, modern glass ---------- */
.auth{padding:calc(18px + env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) calc(18px + env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left))}
.auth-in{max-width:380px;display:flex;flex-direction:column;align-items:center;margin:auto}
.auth .lgcard{width:clamp(104px,30vw,128px);padding:12px 14px;margin:0 auto 10px;border-radius:28px;box-shadow:inset 0 2px 8px #fff,0 14px 32px #1a063a55,0 0 0 6px #ffffff1a}
.auth .lgcard img{animation-duration:4s}
.auth .tag{font-size:12px;letter-spacing:.08em;margin:0 0 18px;color:#ffffffc9;text-align:center}
.auth .auth-card{width:100%;margin:0;padding:14px;border-radius:30px;display:grid;gap:12px;align-content:start}
.auth .auth-card>*{margin:0}
.auth .tabs{height:50px;padding:4px}
.auth .tabs button{padding:0;display:grid;place-items:center;font-size:15px}
.auth .fld{min-height:56px;padding:0 8px 0 7px;gap:10px;border-radius:18px}
.auth .fld .fi{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;flex:none;background:#ffffff2b;color:#fff;opacity:1;box-shadow:inset 0 1px 0 #ffffff40}
.auth .fld .fi .ico{width:20px;height:20px}
.auth .fld input{padding:0;height:54px;line-height:54px}
.auth .fld .eye{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;flex:none;color:#fff;opacity:.9;background:none}
.auth .fld .eye .ico{width:21px;height:21px}
.auth .forgot{text-align:right;margin:-2px 4px 0;font-size:13px}
.auth .msg{text-align:center;font-size:13.5px;line-height:1.5;color:#ffffffd9;margin:2px 6px 4px}.auth .msg b{font-size:16px;color:#fff}
.auth .btn{min-height:54px;font-size:16px;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 20px}
.auth .or{margin:2px 0;gap:12px;font-size:12px}
.auth .socials{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.auth .social{width:100%;min-height:52px;padding:0 10px;font-size:15px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:9px;background:#ffffff30;border-color:#ffffff59}
.auth .social .ico{flex:none}
.auth .sw{margin:16px 0 0;font-size:13.5px}
.auth .trust{margin:10px 0 0;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11.5px}
.auth .trust .ico{width:13px;height:13px}
.auth-in>.lgcard,.auth-in>.tag,.auth-in>.sw,.auth-in>.trust{animation:up .55s var(--ease) both}
.auth-in>.tag{animation-delay:.05s}.auth-in>.sw{animation-delay:.2s}.auth-in>.trust{animation-delay:.28s}
.splash .lgcard{width:clamp(140px,42vw,176px);padding:16px 18px}
@media(max-height:700px){
 .auth{padding-top:calc(12px + env(safe-area-inset-top));padding-bottom:calc(12px + env(safe-area-inset-bottom))}
 .auth .lgcard{width:92px;padding:10px 12px;margin-bottom:6px;border-radius:24px}
 .auth .tag{margin-bottom:12px;font-size:11.5px}
 .auth .auth-card{padding:12px;gap:10px}
 .auth .tabs{height:46px}.auth .fld{min-height:52px}.auth .fld input{height:50px;line-height:50px}
 .auth .btn{min-height:50px}.auth .social{min-height:48px}.auth .sw{margin-top:12px}
}
@media(max-width:340px){.auth .social{font-size:14px;gap:6px}.auth .tabs button{font-size:14px}}
@media (prefers-reduced-motion:reduce){.fab,.add,.btn{animation:none!important}.rp{display:none}.lq-pop{animation:none!important}}
`
const SHOP_CSS = `
/* ===== cart / orders / tracking / suggestions (mobile-first) ===== */
.ptl{font-size:22px;margin:4px 2px 14px;color:var(--ink)}
.emp{display:grid;justify-items:center;text-align:center;gap:8px;padding:48px 24px}
.emp-i{width:96px;height:96px;border-radius:30px;background:linear-gradient(135deg,#f3e9fb,#fde7f0);display:grid;place-items:center;font-size:46px;box-shadow:var(--sh);margin-bottom:8px}
.emp h3{font-size:19px;color:var(--ink)}.emp p{color:var(--mute);font-size:14px;margin-bottom:14px;max-width:260px}.emp .btn{width:auto;padding:0 30px}
.frb{display:flex;gap:12px;align-items:center;padding:12px 14px;margin:2px 0 14px;border-radius:20px;background:linear-gradient(135deg,#eafaf1,#fff);border:1px solid #cdeedb;box-shadow:0 6px 18px #2a8a5214}
.frb span{width:38px;height:38px;border-radius:12px;background:#fff;display:grid;place-items:center;font-size:20px;box-shadow:0 4px 10px #2a8a5222;flex:none}
.frb b{display:block;font-size:13px;color:#1f7a47}.frb small{color:var(--mute);font-size:12px}
.item.ci{align-items:flex-start;gap:14px;padding:12px;border-radius:24px}
.item.ci .pic{width:84px;height:84px;flex:none;margin:0}
.ci-b{flex:1;min-width:0;display:flex;flex-direction:column;align-self:stretch;gap:6px}
.ci-t{display:flex;gap:8px;justify-content:space-between;align-items:flex-start}
.ci-t b{font-size:14px;line-height:1.25;color:var(--ink)}
.ci-x{flex:none;width:28px;height:28px;border-radius:50%;background:#f6effb;color:var(--mute);font-size:12px;display:grid;place-items:center}
.ci-x:active{background:#fde7f0;color:#e0457b}
.vtag{align-self:flex-start;font-size:11px;font-weight:600;padding:3px 10px;border-radius:99px;background:#f6effb;color:var(--p2)}
.ci-f{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:auto}
.ci-p b{display:block;font-size:16px;color:var(--p1);line-height:1.1}.ci-p small{font-size:11px;color:var(--mute)}
.item .qty span{min-width:20px;text-align:center;font-weight:700;font-size:14px}
.mini{display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid var(--edge);border-radius:18px;padding:12px 16px;margin:0 0 14px;box-shadow:0 6px 16px #4a166814;font-size:13px;color:var(--mute)}.mini b{color:var(--p1);font-size:17px}
.rail{margin:22px -18px 6px}.rail .sec{padding:0 18px}
.rail-s{display:flex;gap:12px;overflow-x:auto;padding:4px 18px 14px;scroll-snap-type:x proximity;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
.rail-s::-webkit-scrollbar{display:none}
.rail-s .card{flex:0 0 152px;width:152px;scroll-snap-align:start;content-visibility:visible}
.rail-s .pic{height:118px}
.oc{display:block;width:100%;text-align:left;background:#fff;border:1px solid var(--edge);border-radius:24px;padding:14px 14px 14px 18px;margin-bottom:12px;box-shadow:0 8px 22px #4a166818;cursor:pointer;position:relative;overflow:hidden;transition:transform .3s var(--spring)}
.oc:active{transform:scale(.985)}
.oc::before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--line)}
.oc.s0::before{background:#e0457b}.oc.s1::before{background:#e69a1c}.oc.s2::before{background:#3b6fd9}.oc.s3::before{background:#3ab36b}
.oc-h{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:12px}
.oc-h b{display:block;font-size:15px;color:var(--ink)}.oc-h small{color:var(--mute);font-size:12px}
.sp{font-size:11.5px;font-weight:700;padding:4px 11px;border-radius:99px;white-space:nowrap}
.sp.s0{background:#fdecf2;color:#d93a75}.sp.s1{background:#fff3df;color:#b86e00}.sp.s2{background:#e6effd;color:#2757b3}.sp.s3{background:#e4f6ec;color:#1f8a54}
.oc-m{display:flex;align-items:center;gap:12px}
.ths{display:flex;flex:none}
.ths .pic,.ti .pic{width:46px;height:46px;font-size:22px;border-radius:14px;margin:0;border:2px solid #fff;box-shadow:0 4px 10px #4a166822;flex:none}
.ths>*+*{margin-left:-14px}
.ths .more{width:46px;height:46px;border-radius:14px;background:var(--grad);color:#fff;display:grid;place-items:center;font-weight:700;font-size:13px;border:2px solid #fff}
.oc-t{flex:1;min-width:0;font-size:13px;color:var(--ink)}.oc-t span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.oc-t small{color:var(--mute);font-size:12px}
.oc-p{font-size:16px;color:var(--p1);flex:none}
.prg{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:14px}.prg i{height:5px;border-radius:99px;background:var(--line)}.prg i.on{background:var(--grad)}
.tkc{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:6px}
.tkc>div{background:#fff;border-radius:18px;padding:12px;box-shadow:0 6px 16px #4a166814;border:1px solid var(--edge);min-width:0}
.tkc small{display:block;color:var(--mute);font-size:11px;margin-bottom:2px}.tkc b{font-size:14px;color:var(--ink);word-break:break-word}
.tl{background:#fff;border-radius:24px;padding:18px 18px 0;box-shadow:0 8px 22px #4a166818;margin:14px 0}
.cd2{background:#fff;border:1px solid var(--edge);border-radius:24px;padding:16px;margin-top:14px;box-shadow:0 8px 22px #4a166818}
.cd2 h5{font-size:12px;color:var(--mute);font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px}
.ti{display:flex;gap:12px;align-items:center;padding:10px 0}.ti+.ti{border-top:1px solid var(--line)}
.ti>div{flex:1;min-width:0;font-size:13px}.ti b{color:var(--ink)}.ti small{display:block;color:var(--mute)}.ti>b:last-child{color:var(--p1);flex:none}
.dl p{font-size:14px;line-height:1.55;color:var(--ink)}.dl small{color:var(--mute)}
.scr.narrow .sum{margin-top:14px}
@media(min-width:900px){.rail{margin-inline:-36px}.rail .sec{padding-inline:36px}.rail-s{padding-inline:36px}.rail-s .card{flex-basis:190px;width:190px}.rail-s .pic{height:150px}.oc:hover{transform:translateY(-2px)}}
@media(max-width:360px){.item.ci .pic{width:72px;height:72px}.tkc{grid-template-columns:1fr 1fr}.tkc>div:last-child{grid-column:span 2}.rail-s .card{flex-basis:140px;width:140px}}
@media(prefers-reduced-motion:reduce){.oc{transition:none}}
`
const POP = '.add,.fab,.qty button,.ib'

/* Delegated listeners power the liquid feel everywhere: ripple, pointer-tracking light and squish-pop (no per-component handlers) */
function useLiquid() {
  useEffect(() => {
    let st = document.getElementById('lq-css')
    if (!st) { st = document.createElement('style'); st.id = 'lq-css'; document.head.appendChild(st) }
    if (st.textContent !== LIQUID_CSS + LOC_CSS + SHOP_CSS) st.textContent = LIQUID_CSS + LOC_CSS + SHOP_CSS
    if (NOMOTION) return
    const light = (el, e) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', e.clientX - r.left + 'px'); el.style.setProperty('--my', e.clientY - r.top + 'px')
    }
    const down = e => {
      const el = e.target.closest?.(RIPPLE)
      if (!el || el.disabled) return
      const r = el.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2, s = document.createElement('span')
      s.className = 'rp'
      s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`
      el.appendChild(s)
      s.addEventListener('animationend', () => s.remove(), { once: true })
      light(el, e)
      if (el.matches(POP)) {
        el.classList.remove('lq-pop'); void el.offsetWidth; el.classList.add('lq-pop')
        el.addEventListener('animationend', ev => { if (ev.animationName === 'lqPop') el.classList.remove('lq-pop') }, { once: true })
      }
    }
    let raf = 0
    const move = e => {
      if (e.pointerType !== 'mouse' || raf) return
      raf = requestAnimationFrame(() => { raf = 0; const el = e.target.closest?.(RIPPLE); if (el && !el.disabled) light(el, e) })
    }
    document.addEventListener('pointerdown', down, { passive: true })
    document.addEventListener('pointermove', move, { passive: true })
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('pointermove', move); cancelAnimationFrame(raf) }
  }, [])
}

const Pic = memo(({ p, big }) => <div className={big ? 'big' : 'pic'}>{p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" decoding="async" /> : p.emoji || '🛍️'}</div>)
// Brand-aware icon: the 🛡️ emoji (or an image URL) renders as the real MyShyld logo mark
const Glyph = ({ v }) => (v === '🛡️' || v === '🛡' || /^(https?:|\/)/.test(v || '')) ? <img src={/^(https?:|\/)/.test(v) ? v : '/logo-mark.webp?v=2'} alt="" decoding="async" draggable="false" /> : <>{v}</>
const ICONS = {
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  pin: <><path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z" /><circle cx="12" cy="11" r="2.2" /></>,
  card: <><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10.5h18M7 15h3" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  logout: <><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="M15 8l4 4-4 4M19 12H9" /></>,
  chev: <path d="M9 6l6 6-6 6" />,
  home: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8z" />,
  grid: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" /><path d="M9 8h6M9 12h6" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M4 7l8 6 8-6" /></>,
  phone: <><rect x="7" y="2.8" width="10" height="18.4" rx="2.6" /><path d="M10.5 18h3" /></>,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeoff: <><path d="M3 3l18 18" /><path d="M6.5 7.6A16 16 0 0 0 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1M10.6 5.1C11 5 11.5 5 12 5c6.4 0 10 7 10 7a16 16 0 0 1-2.4 3.2" /><path d="M9.9 10a3 3 0 0 0 4.1 4.1" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h10" />, back: <path d="M15 5l-7 7 7 7" />, search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  bag: <><path d="M6 8h12l-1 11H7L6 8z" /><path d="M9 8a3 3 0 0 1 6 0" /></>, sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
}
const Icon = ({ n }) => <svg className="ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[n]}</svg>
const GoogleG = () => <svg className="ico" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" /><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" /><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" /><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" /></svg>
const AppleMark = () => <svg className="ico" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" /></svg>
const Steps = ({ n }) => <div className="stp">{['Cart', 'Details', 'Payment'].map((l, i) => <div key={l} className={i <= n ? 'on' : ''}><i>{i < n ? '✓' : i + 1}</i><span>{l}</span></div>)}</div>
const copyText = async (t, say, msg) => {
  try { await navigator.clipboard.writeText(t) }
  catch { try { const a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove() } catch { return say('Could not copy. Please copy it by hand.') } }
  say(msg)
}
const BkashPay = ({ total, cart, promo, addr, back, say, onDone }) => {
  const [trx, setTrx] = useState(''), [from, setFrom] = useState(addr.phone || ''), [busy, setBusy] = useState(false)
  const amt = Number(total), amtTxt = Number.isInteger(amt) ? String(amt) : amt.toFixed(2), app = api.bkashAppLink()
  const submit = async () => {
    const t = trx.replace(/\s/g, '').toUpperCase()
    if (!/^[A-Z0-9]{8,12}$/.test(t)) return say('Enter the Transaction ID from your bKash SMS (8 to 12 letters/numbers)', 3200)
    if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(from.replace(/[\s-]/g, ''))) return say('Enter the bKash number you paid from (01XXXXXXXXX)', 3200)
    setBusy(true)
    try { onDone(await api.placeBkashOrder({ items: cart, promo, address: addr, amount: amt, trx: t, sender: from })) }
    catch (e) { say(e?.message || 'Could not submit. Please try again.', 3500); setBusy(false) }
  }
  return <><Hdr title="Pay with bKash" back={back} /><div className="scr narrow bk">
    <div className="bk-hero"><small>Amount to send</small><b>৳{amtTxt}</b><span>Your order is placed after you submit the TrxID</span>
      <button className="bk-mini" onClick={() => copyText(amtTxt, say, 'Amount copied')}>Copy amount</button></div>
    <div className="bk-card"><PayLogo k={1} /><div className="bk-num"><small>bKash number · {api.BKASH.mode}</small><b>{api.BKASH.number}</b></div>
      <button className="bk-copy" onClick={() => copyText(api.BKASH.number, say, 'Number copied')}>Copy</button></div>
    {app && <a className="bk-app" href={app}>Open bKash app</a>}
    <ol className="bk-steps"><li>Open the bKash app and choose <b>{api.BKASH.mode}</b>.</li><li>Send exactly <b>৳{amtTxt}</b> to <b>{api.BKASH.number}</b>.</li><li>Copy the <b>Transaction ID (TrxID)</b> from the confirmation SMS and enter it below.</li></ol>
    <label className="lbl">Transaction ID (TrxID)<input className="inp bk-trx" placeholder="e.g. 9G7A5B3C2D" value={trx} onChange={e => setTrx(e.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" spellCheck="false" maxLength={14} /></label>
    <label className="lbl">bKash number you paid from<input className="inp" type="tel" inputMode="tel" placeholder="01XXXXXXXXX" value={from} onChange={e => setFrom(e.target.value)} autoComplete="tel" /></label>
    <div className="note">🔒 We confirm your payment before your order is prepared. This usually takes a few minutes.</div>
    <button className="btn" disabled={busy} onClick={submit}>{busy ? <i className="spin" /> : 'Submit payment'}</button>
  </div></>
}
const Hdr = ({ title, back, right }) => <div className="hdr"><button className="ib" aria-label="Back" onClick={back}><Icon n="back" /></button><span className="ht">{title}</span>{right || <span className="ib ghost" />}</div>
const Heart = ({ on, toggle, inl }) => <button className={'heart' + (on ? ' on' : '') + (inl ? ' inl' : '')} aria-label="Wishlist" aria-pressed={on} onClick={e => { e.stopPropagation(); toggle() }}>{on ? '♥' : '♡'}</button>

function Money({ v }) {
  const [n, setN] = useState(v), from = useRef(v)
  useEffect(() => {
    if (NOMOTION) { setN(v); from.current = v; return }
    const a = from.current, t0 = performance.now(); let r
    const f = t => { const k = Math.min(1, (t - t0) / 450); setN(a + (v - a) * (1 - Math.pow(1 - k, 3))); if (k < 1) r = requestAnimationFrame(f); else from.current = v }
    r = requestAnimationFrame(f); return () => cancelAnimationFrame(r)
  }, [v])
  return taka(n)
}

function BannerImpl({ shop }) {
  const [list, setList] = useState(OFFERS), [i, setI] = useState(0)
  useEffect(() => { let on = true; api.getHero().then(h => { if (on && h?.length) { setList(h.map(x => [x.chip || 'MyShyld', x.lines, x.image || x.emoji || '🛡️'])); setI(0) } }).catch(() => {}); return () => { on = false } }, [])
  useEffect(() => { if (list.length < 2) return; const t = setInterval(() => { if (!document.hidden) setI(x => (x + 1) % list.length) }, 3500); return () => clearInterval(t) }, [list])
  const o = list[i % list.length]
  return <div className="bw"><div className="banner"><div key={i} className="bt"><span className="bchip">{o[0]}</span><h3>{o[1].split('|').map((l, k) => <span key={k}>{l}</span>)}</h3><button className="bshop" onClick={() => shop('categories')}>Shop Now<i>↗</i></button></div><div key={'e' + i} className="be"><Glyph v={o[2]} /></div></div><div className="bd">{list.map((_, k) => <i key={k} className={k === i % list.length ? 'on' : ''} />)}</div></div>
}

const Banner = memo(BannerImpl)

const Nav = memo(({ s, count, tab }) => <nav className={'nav' + (TABS.includes(s) ? '' : ' hide-m')}><div className="nv-brand"><img src="/logo-full.webp?v=2" width="150" height="134" alt="MyShyld" decoding="async" /></div>{NAV.map(([k, ic, l]) => <button key={k} className={s === k ? 'on' : ''} aria-current={s === k ? 'page' : undefined} onClick={() => tab(k)}><span><Icon n={ic} /></span>{l}{k === 'cart' && count > 0 && <em key={count}>{count}</em>}</button>)}</nav>)

const ProductCard = memo(({ p, i, add, open, liked, like }) => <div className="card rise" style={{ '--i': Math.min(i, 12) }} onClick={() => open(p)}><Heart on={liked} toggle={() => like(p.id)} /><Pic p={p} />
  <div className="cinfo"><small>{p.tag || p.brand}</small><h4>{p.name}</h4><div className="cfoot"><b>{taka(p.price)}</b><button className="add" aria-label="Add to cart" onClick={e => { e.stopPropagation(); add(p) }}>+</button></div></div></div>)

const Grid = memo(({ list, loading, add, open, wish, like }) => loading ? <div className="grid">{[...Array(6)].map((_, i) => <div key={i} className="skel" />)}</div>
  : list.length ? <div className="grid">{list.map((p, i) => <ProductCard key={p.id} {...{ p, i, add, open, like }} liked={wish.has(p.id)} />)}</div> : <p className="empty">No products found.</p>)

/* ---------- Location: chip + map picker ---------- */
const LOC_CSS = `
.topbar .loc{display:flex;align-items:center;gap:10px;max-width:calc(100% - 60px);padding:6px 14px 6px 6px;border-radius:999px;background:#fff;border:1px solid var(--edge);box-shadow:0 8px 22px #4a166822;text-align:left;min-width:0}
.loc .lp{width:38px;height:38px;border-radius:50%;flex:none;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#8e2a8c,#e0457b);box-shadow:0 6px 14px #e0457b55,inset 0 1px 0 #ffffff70;position:relative}
.loc .lp::after{content:'';position:absolute;inset:-4px;border-radius:50%;border:2px solid #e0457b55;animation:locPulse 2.4s ease-out infinite}
@keyframes locPulse{from{transform:scale(.85);opacity:1}to{transform:scale(1.35);opacity:0}}
.loc .lt{display:grid;min-width:0;line-height:1.2}
.loc .lt small{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);font-weight:600}
.loc .lt b{font-size:14px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink)}
.loc>i{font-style:normal;color:var(--p3);font-size:13px;flex:none}
.mp{display:grid;gap:12px;padding-bottom:6px}
.mp-box{position:relative;height:min(46dvh,380px);min-height:260px;border-radius:24px;overflow:hidden;border:1px solid var(--edge);box-shadow:0 12px 30px #4a166826;background:#ece4f7}
.mp-map{position:absolute;inset:0;z-index:1;touch-action:none}
.mp-pin{position:absolute;left:50%;top:50%;width:44px;height:54px;margin:-54px 0 0 -22px;z-index:500;pointer-events:none;filter:drop-shadow(0 8px 6px #4a166855);transition:transform .2s}
.mp-box.mv .mp-pin{transform:translateY(-10px)}
.mp-dot{position:absolute;left:50%;top:50%;width:14px;height:6px;margin:-3px 0 0 -7px;border-radius:50%;background:#4a166855;z-index:499;pointer-events:none;transition:transform .2s,opacity .2s}
.mp-box.mv .mp-dot{transform:scale(1.6);opacity:.4}
.mp-gps{position:absolute;right:12px;bottom:12px;z-index:600;width:48px;height:48px;border-radius:50%;background:#fff;color:var(--p1);display:grid;place-items:center;box-shadow:0 8px 20px #4a166844;border:0;cursor:pointer}
.mp-gps:active{transform:scale(.92)}
.mp-gps.ld svg{animation:locSpin 1s linear infinite}@keyframes locSpin{to{transform:rotate(360deg)}}
.mp-hint{position:absolute;left:12px;top:12px;z-index:600;max-width:calc(100% - 24px);background:#fffffff0;border-radius:999px;padding:7px 14px;font-size:12px;font-weight:600;color:var(--p1);box-shadow:0 6px 16px #4a166822}
.mp-ph{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:20px;color:var(--mute);font-size:13px;z-index:2}
.mp-sr{position:relative}.mp-sr .search{margin:0}
.mp-res{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:700;background:#fff;border-radius:18px;border:1px solid var(--edge);box-shadow:0 16px 36px #4a166833;overflow:hidden;max-height:240px;overflow-y:auto}
.mp-res button{all:unset;box-sizing:border-box;width:100%;display:flex;gap:10px;align-items:flex-start;padding:12px 14px;cursor:pointer;font-size:13px;border-top:1px solid var(--edge);line-height:1.3}
.mp-res button:first-child{border-top:0}.mp-res button:active,.mp-res button:hover{background:#faf5fd}
.mp-res button span{color:var(--p3);flex:none}
.mp-card{display:flex;gap:12px;align-items:center;padding:14px;border-radius:22px;background:#fff;border:1px solid var(--edge);box-shadow:0 6px 18px #4a166814}
.mp-card>span{width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#f3e9fb,#fde7f0);display:grid;place-items:center;color:var(--p3);flex:none}
.mp-card div{display:grid;min-width:0}.mp-card small{font-size:11px;color:var(--mute)}.mp-card b{font-size:14px;overflow-wrap:anywhere}
.mp-err{font-size:12px;color:#c62d4a;margin:0}
.mp-man{border:1px dashed #d9c8e8;border-radius:22px;padding:14px;display:grid;gap:2px;background:#fffc}
.mp-man h5{margin:0 0 10px;font-size:13px;color:var(--p1)}
.mp-sect{font-size:12px;font-weight:700;color:var(--mute);letter-spacing:.06em;text-transform:uppercase;margin:4px 2px 0}
.leaflet-container{font:inherit;background:#ece4f7}.leaflet-control-attribution{font-size:9px!important;background:#ffffffcc!important}
.leaflet-control-zoom{display:none}
@media(max-width:480px){.mp-box{height:42dvh;border-radius:20px}.topbar .loc{padding-right:12px}}
@media(min-width:900px){.mp{grid-template-columns:1.2fr 1fr;align-items:start}.mp-box{grid-row:span 3;height:480px}}
`

// Loads Leaflet (OpenStreetMap) once from a CDN; no npm install needed
let leafletP
const loadLeaflet = () => leafletP || (leafletP = new Promise((res, rej) => {
  if (window.L) return res(window.L)
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css)
  const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'
  sc.onload = () => window.L ? res(window.L) : rej(new Error('leaflet')); sc.onerror = () => { leafletP = null; rej(new Error('leaflet')) }; document.head.appendChild(sc)
}))
const CTG = [22.3569, 91.7832]
const nom = async (path, signal) => { const r = await fetch('https://nominatim.openstreetmap.org/' + path + '&format=jsonv2&addressdetails=1&accept-language=en', { signal }); if (!r.ok) throw new Error('geo'); return r.json() }
const parseAddr = a => {
  if (!a) return {}
  const area = a.suburb || a.neighbourhood || a.quarter || a.city_district || a.village || ''
  const line = [a.house_number, a.road].filter(Boolean).join(', ')
  const city = a.city || a.town || a.state_district || a.county || ''
  return { area, line, city: city.replace(/ (City|District|Division)$/i, '') }
}
const PinSvg = () => <svg viewBox="0 0 44 54" width="44" height="54" aria-hidden="true"><defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8e2a8c" /><stop offset="1" stopColor="#e0457b" /></linearGradient></defs><path d="M22 52S4 33 4 20a18 18 0 0 1 36 0c0 13-18 32-18 32z" fill="url(#pg)" stroke="#fff" strokeWidth="2.5" /><circle cx="22" cy="20" r="7" fill="#fff" /></svg>
const LocChip = ({ loc, onClick }) => <button className="loc" aria-label="Change delivery location" onClick={onClick}><span className="lp"><Icon n="pin" /></span><span className="lt"><small>Deliver to</small><b>{loc.area || loc.city}</b></span><i>⌄</i></button>

const fullAddr = l => l ? [l.line, l.area, l.city].filter(Boolean).join(', ') : ''
const AREAS = ['GEC Circle', 'Agrabad', 'Nasirabad', 'Khulshi', 'Halishahar', 'Pahartali', 'Chawkbazar', 'Kotwali', 'Panchlaish', 'Bayezid', 'Patenga', 'Muradpur', 'Oxygen', '2 No Gate', 'Bahaddarhat']

function AddressScreen({ loc, back, onSave }) {
  const [f, setF] = useState(loc)
  const [pt, setPt] = useState(loc.lat ? [loc.lat, loc.lng] : null)
  const [mapOk, setMapOk] = useState(null), [moving, setMoving] = useState(false), [gps, setGps] = useState(false), [err, setErr] = useState('')
  const [sq, setSq] = useState(''), [res, setRes] = useState([]), [sb, setSb] = useState(false)
  const el = useRef(null), map = useRef(null), skip = useRef(false), ab = useRef(null), tm = useRef(0)
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }))
  const clean = { city: f.city.trim() || 'Chattogram', area: f.area.trim(), line: f.line.trim(), ...(pt ? { lat: +pt[0].toFixed(6), lng: +pt[1].toFixed(6) } : {}) }
  const save = () => onSave(clean.area || clean.line ? clean : null)

  const reverse = useCallback(async (lat, lng) => {
    ab.current?.abort(); ab.current = new AbortController(); setErr('')
    try {
      const d = await nom(`reverse?lat=${lat}&lon=${lng}&zoom=18`, ab.current.signal)
      const a = parseAddr(d.address)
      setF(x => ({ ...x, city: a.city || x.city || 'Chattogram', area: a.area || x.area, line: a.line || x.line }))
    } catch (e) { if (e.name !== 'AbortError') setErr('Could not read the address here. Please fill it in below.') }
  }, [])

  useEffect(() => {
    let dead = false
    loadLeaflet().then(L => {
      if (dead || !el.current) return
      const m = L.map(el.current, { center: pt || CTG, zoom: pt ? 17 : 13, zoomControl: false, attributionControl: true })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m)
      m.on('movestart', () => setMoving(true))
      m.on('moveend', () => {
        setMoving(false)
        if (skip.current) { skip.current = false; return }
        const c = m.getCenter(); setPt([c.lat, c.lng])
        clearTimeout(tm.current); tm.current = setTimeout(() => reverse(c.lat, c.lng), 450)
      })
      map.current = m; setMapOk(true)
      setTimeout(() => m.invalidateSize(), 250)
    }).catch(() => !dead && setMapOk(false))
    return () => { dead = true; clearTimeout(tm.current); ab.current?.abort(); map.current?.remove(); map.current = null }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const locate = () => {
    if (!navigator.geolocation) return setErr('Location is not supported on this device.')
    setGps(true); setErr('')
    navigator.geolocation.getCurrentPosition(
      p => { setGps(false); const { latitude: a, longitude: b } = p.coords; setPt([a, b]); map.current?.setView([a, b], 17); if (!map.current) reverse(a, b) },
      e => { setGps(false); setErr(e.code === 1 ? 'Location permission denied. Allow it in your browser settings, or move the map manually.' : 'Could not get your location. Move the map or type your address.') },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 })
  }

  useEffect(() => {
    if (sq.trim().length < 3) { setRes([]); return }
    const c = new AbortController()
    const t = setTimeout(async () => {
      setSb(true)
      try { const d = await nom(`search?q=${encodeURIComponent(sq + ', Chattogram, Bangladesh')}&limit=5&countrycodes=bd`, c.signal); setRes(d) } catch { /* ignore */ }
      setSb(false)
    }, 500)
    return () => { clearTimeout(t); c.abort() }
  }, [sq])

  const pick = r => {
    const lat = +r.lat, lng = +r.lon, a = parseAddr(r.address)
    setRes([]); setSq(''); setPt([lat, lng])
    setF(x => ({ ...x, city: a.city || x.city, area: a.area || x.area, line: a.line || x.line }))
    skip.current = true; map.current?.setView([lat, lng], 17)
  }

  return <><Hdr title="Delivery Location" back={back} />
    <div className="scr narrow addr mp">
      <div className="mp-sr">
        <div className="search"><Icon n="search" /><input placeholder="Search area, road or landmark" value={sq} onChange={e => setSq(e.target.value)} aria-label="Search location" />{sb && <i className="spin" />}</div>
        {res.length > 0 && <div className="mp-res" role="listbox">{res.map(r => <button key={r.place_id} type="button" onClick={() => pick(r)}><span>📍</span><div>{r.display_name}</div></button>)}</div>}
      </div>
      <div className={'mp-box' + (moving ? ' mv' : '')}>
        <div ref={el} className="mp-map" />
        {mapOk === null && <div className="mp-ph"><i className="spin" /></div>}
        {mapOk === false && <div className="mp-ph">Map could not load.<br />You can still type your address below.</div>}
        {mapOk && <><span className="mp-dot" /><span className="mp-pin"><PinSvg /></span><div className="mp-hint">{moving ? 'Release to set pin' : 'Drag the map to move the pin'}</div></>}
        <button type="button" className={'mp-gps' + (gps ? ' ld' : '')} aria-label="Use my current location" onClick={locate}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
        </button>
      </div>
      {err && <p className="mp-err" role="alert">{err}</p>}
      <div className="mp-card"><span><Icon n="pin" /></span><div><small>Delivering to</small><b>{fullAddr(clean) || 'Move the pin or search to set location'}</b></div></div>
      <div className="mp-man">
        <h5>✏️ Adjust manually</h5>
        <label className="lbl">City<input className="inp" value={f.city} onChange={set('city')} autoComplete="address-level2" /></label>
        <label className="lbl">Area<input className="inp" placeholder="e.g. Agrabad, Khulshi" value={f.area} onChange={set('area')} autoComplete="address-level3" /></label>
        <div className="chips wrap" role="group" aria-label="Popular areas">{AREAS.map(a => <button key={a} type="button" className={f.area === a ? 'on' : ''} onClick={() => setF(x => ({ ...x, area: a }))}>{a}</button>)}</div>
        <label className="lbl" style={{ marginTop: 12 }}>House, road &amp; landmark<textarea className="inp" rows="3" placeholder="House 12, Road 3, near ..." value={f.line} onChange={set('line')} autoComplete="street-address" /></label>
      </div>
    </div>
    <div className="buybar one"><button className="btn" onClick={save}>Confirm location</button></div></>
}

const suggest = (prods, refs, skip, n = 8) => prods.filter(x => !skip.has(x.id) && x.is_active !== false).map(x => ({ x, v: Math.max(0, ...refs.map(r => (r.category_id === x.category_id ? 4 : 0) + (r.brand && r.brand === x.brand ? 2 : 0) + (r.tag && r.tag === x.tag ? 1 : 0))) + (x.rating || 0) / 10 + Math.min(x.reviews || 0, 2000) / 20000 })).sort((p, q) => q.v - p.v).slice(0, n).map(o => o.x)

const Rail = ({ title, list, add, open, wish, like }) => list.length ? <section className="rail"><div className="sec"><span>{title}</span></div><div className="rail-s">{list.map((p, i) => <ProductCard key={p.id} {...{ p, i, add, open, like }} liked={wish.has(p.id)} />)}</div></section> : null

const CartItem = memo(({ i, qty }) => <div className="item ci rise"><Pic p={i} />
  <div className="ci-b"><div className="ci-t"><b>{i.name}</b><button className="ci-x" aria-label={'Remove ' + i.name} onClick={() => qty(i.key, -i.qty)}>✕</button></div>
    {i.variant && i.variant !== 'Standard' && <span className="vtag">{i.variant}</span>}
    <div className="ci-f"><span className="ci-p"><b>{taka(i.price * i.qty)}</b>{i.qty > 1 && <small>{taka(i.price)} each</small>}</span>
      <div className="qty"><button aria-label="Decrease" onClick={() => qty(i.key, -1)}>−</button><span>{i.qty}</span><button aria-label="Increase" onClick={() => qty(i.key, 1)}>+</button></div></div></div></div>)

const OrderCard = ({ o, st, open }) => { const its = o.items || [], n = its.reduce((a, i) => a + (i.qty || 1), 0), names = its.slice(0, 2).map(i => i.name).join(', ')
  return <div className={'oc rise s' + st} role="button" tabIndex={0} onClick={() => open(o)} onKeyDown={e => e.key === 'Enter' && open(o)}>
    <div className="oc-h"><div><b>#{o.order_no}</b><small>{new Date(o.created_at).toLocaleDateString([], { dateStyle: 'medium' })}</small></div><span className={'sp s' + st}>{STEPS[st]}</span></div>
    <div className="oc-m"><div className="ths">{its.slice(0, 3).map((i, k) => <Pic key={k} p={i} />)}{its.length > 3 && <span className="more">+{its.length - 3}</span>}</div>
      <div className="oc-t"><span>{names || 'Order'}{its.length > 2 ? ` +${its.length - 2} more` : ''}</span><small>{n} item{n === 1 ? '' : 's'}</small></div><b className="oc-p">{taka(o.total)}</b></div>
    <div className="prg" aria-hidden="true">{STEPS.map((_, k) => <i key={k} className={k <= st ? 'on' : ''} />)}</div></div> }

const Profile = memo(({ user, admin, count, wishCount, place, hasAddr, tab, go, say, onLogout }) => {
  const cols = useMemo(() => [
    [['Account', [['receipt', 'My Orders', 'Track your deliveries', () => tab('orders'), 't1'], ['heart', 'Wishlist', `${wishCount} saved item${wishCount === 1 ? '' : 's'}`, () => go('wishlist'), 't2'], ['pin', 'Addresses', hasAddr ? place : 'Set your delivery address', () => go('address'), 't3'], ['card', 'Payment Methods', 'Cards & mobile wallets', null, 't1']]]],
    [...(admin ? [['Store admin', [['grid', 'Manage Categories & Products', 'Add or remove items', () => go('manage'), 't2']]]] : []),
      ['Support', [['lock', 'Privacy & Help', 'Your data, your control', null, 't3'], ['info', 'About MyShyld', 'Our story & version', null, 't2']]]],
  ], [admin, wishCount, tab, go, hasAddr, place])
  return <div className="scr narrow pf">
    <div className="pf-hero"><div className="pf-av"><div className="av">{(user?.name || 'G')[0].toUpperCase()}</div></div>
      <div className="pf-id"><em>Welcome back</em><b>{user?.name || 'Guest'}</b><small>{user?.phone || 'Welcome back'}</small>{admin && <span className="pf-bd">★ Store Admin</span>}</div></div>
    <div className="pf-stats">
      <button onClick={() => tab('cart')}><i className="t1"><Icon n="bag" /></i><b>{count}</b><small>In cart</small></button>
      <button onClick={() => go('wishlist')}><i className="t2"><Icon n="heart" /></i><b>{wishCount}</b><small>Wishlist</small></button>
      <button onClick={() => go('address')}><i className="t3"><Icon n="pin" /></i><b>{place}</b><small>Delivery area</small></button></div>
    <div className="pf-cols">{cols.map((col, n) => <div className="pf-col" key={n}>{col.map(([t, rows]) => <section key={t}><h5 className="pf-t">{t}</h5><div className="pf-g">
      {rows.map(([i, l, d, f, tone]) => <button key={l} className="menu pm" onClick={f || (() => say('Coming soon'))}><span className={'pi ' + tone}><Icon n={i} /></span><span className="pt"><b>{l}</b><small>{d}</small></span><span className="chev"><Icon n="chev" /></span></button>)}</div></section>)}</div>)}</div>
    <button className="menu pf-out" onClick={onLogout}><span><Icon n="logout" /></span><span>Log out</span></button>
  </div>
})

export default function App() {
  const [oflt, setOflt] = useState('all')
  useLiquid()
  const [stack, setStack] = useState([{ s: 'splash' }])
  const [user, setUser] = useState(() => { try { return api.getUser() } catch { return null } })
  const [cats, setCats] = useState([]), [prods, setProds] = useState([]), [loading, setLoading] = useState(true)
  const [cart, setCart] = useState(() => readLS('ms_cart', []))
  const [orders, setOrders] = useState([]), [toast, setToast] = useState(''), [liveSt, setLiveSt] = useState({})
  const [ob, setOb] = useState(0), [mode, setMode] = useState(() => api.RECOVERY_LINK ? 'reset' : api.LINK_EXPIRED ? 'forgot' : 'login')
  const [form, setForm] = useState({ name: '', phone: '', id: '', pw: '', pw2: '' }), [showPw, setShowPw] = useState(false), [shake, setShake] = useState(false), [busy, setBusy] = useState(false)
  const [loc, setLoc] = useState(() => ({ city: 'Chattogram', area: '', line: '', ...readLS('ms_loc', {}) }))
  const [addr, setAddr] = useState(() => ({ name: '', phone: '', address: fullAddr(readLS('ms_loc', null)), note: '' }))
  const [pay, setPay] = useState(0), [promo, setPromo] = useState(''), [promoOn, setPromoOn] = useState(false)
  const [q, setQ] = useState(''), [nc, setNc] = useState({ name: '', icon: '🛍️' })
  const [np, setNp] = useState({ name: '', price: '', category_id: '', image_url: '' })
  const [wish, setWish] = useState(() => readLS('ms_wish', []))
  const [dir, setDir] = useState('fade'), [sort, setSort] = useState('pop'), [chip, setChip] = useState('All'), dq = useDeferredValue(q)
  const toastT = useRef(0), wishPrev = useRef(null), wishUser = useRef(''), prodsR = useRef([]), recov = useRef(!!api.RECOVERY_LINK)

  const cur = stack[stack.length - 1]
  const s = cur.s
  const admin = useMemo(() => !!user && !!safeAdmin(user), [user])

  const depth = useRef(0), after = useRef(null), popped = useRef(false)
  // collapse every pushed history entry (used when jumping to a tab / finishing an order), then run fn
  const collapse = useCallback(fn => {
    const n = depth.current; depth.current = 0
    if (!n) return fn()
    after.current = fn
    try { history.go(-n) } catch { after.current = null; return fn() }
    setTimeout(() => { const f = after.current; if (f) { after.current = null; f() } }, 400)
  }, [])
  const go = useCallback((s, p = {}) => {
    if (s === 'category') setQ('')
    setDir('fwd'); depth.current++
    try { history.pushState({ ms: depth.current }, '') } catch { /* history blocked */ }
    setStack(a => [...a, { s, ...p }])
  }, [])
  const tab = useCallback(s => { setQ(''); setDir('fade'); setStack([{ s }]); collapse(() => {}) }, [collapse])
  const popOne = useCallback(() => { if (depth.current > 0) { depth.current--; setDir('back'); setStack(a => (a.length > 1 ? a.slice(0, -1) : a)) } }, [])
  const back = useCallback(() => {
    if (depth.current > 0) {
      popped.current = false
      try { history.back() } catch { popOne(); return }
      setTimeout(() => { if (!popped.current) popOne() }, 300) // fallback if the browser never fires popstate
    } else tab('home')
  }, [popOne, tab])
  useEffect(() => {
    const h = () => {
      popped.current = true
      const f = after.current
      if (f) { after.current = null; f(); return }
      popOne()
    }
    window.addEventListener('popstate', h)
    return () => window.removeEventListener('popstate', h)
  }, [popOne])
  const say = useCallback((m, ms = 1800) => { clearTimeout(toastT.current); setToast(m); toastT.current = setTimeout(() => setToast(''), ms) }, [])
  const open = useCallback(p => go('product', { p }), [go])
  const like = useCallback(id => setWish(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id]), [])
  const logout = useCallback(async () => { await safe(() => api.signOut()); setUser(null); tab('auth') }, [tab])
  const saveLoc = useCallback(v => {
    if (!v) return say('Add your area or full address')
    setLoc(v); writeLS('ms_loc', v); setAddr(a => ({ ...a, address: fullAddr(v) })); say('Address saved'); back()
  }, [say, back])
  const bad = useCallback(m => { say(m); setShake(true); setTimeout(() => setShake(false), 480) }, [say])

  const load = useCallback(async () => {
    const [c, p] = await Promise.all([safe(() => api.getCategories()), safe(() => api.getProducts())])
    if (c) setCats(c); if (p) setProds(p)
    if (!c && !p) say('Could not load products. Check your connection.')
    setLoading(false)
  }, [say])

  useEffect(() => { load(); return () => clearTimeout(toastT.current) }, [load])
  // Google / email-confirm redirects, password-recovery links, sign-out
  useEffect(() => api.onAuthChange((u, ev) => {
    if (ev === 'PASSWORD_RECOVERY') { recov.current = true; setMode('reset'); setStack([{ s: 'auth' }]); return }
    if (!u) { setUser(null); return }
    setUser(p => (p?.id === u.id && p.is_admin === u.is_admin ? p : u))
    if (!recov.current) setStack(st => (['splash', 'ob', 'auth'].includes(st[st.length - 1].s) ? [{ s: 'home' }] : st))
  }), [])
  // use the name / phone given at registration to pre-fill delivery details
  useEffect(() => { if (user?.id && user.id !== 'local') setAddr(a => ({ ...a, name: a.name || user.name || '', phone: a.phone || user.mobile || '' })) }, [user])
  // new / edited / hidden products and categories show up without a reload
  useEffect(() => {
    const sb = api.supabase; if (!sb) return
    let t; const soon = () => { clearTimeout(t); t = setTimeout(load, 400) }, vis = () => { if (!document.hidden) soon() }
    const ch = sb.channel('store-live').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, soon).on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, soon).subscribe()
    document.addEventListener('visibilitychange', vis); const poll = setInterval(vis, 30000)
    return () => { clearTimeout(t); clearInterval(poll); document.removeEventListener('visibilitychange', vis); sb.removeChannel(ch) }
  }, [load])
  useEffect(() => { const t = setTimeout(() => writeLS('ms_cart', cart), 250); return () => clearTimeout(t) }, [cart])
  useEffect(() => { const t = setTimeout(() => writeLS('ms_wish', wish), 250); return () => clearTimeout(t) }, [wish])
  prodsR.current = prods
  // mirror the wishlist to Supabase so the admin panel can see it (silent no-op when offline / table missing)
  useEffect(() => {
    const sb = api.supabase
    if (!sb) return
    const t = setTimeout(async () => {
      const prev = wishPrev.current, uk = user?.id || '', full = !prev || wishUser.current !== uk
      wishPrev.current = wish; wishUser.current = uk
      const add = full ? wish : wish.filter(id => !prev.includes(id)), del = full ? [] : prev.filter(id => !wish.includes(id))
      const dv = devId(), uid = realUid(user), label = user?.phone || user?.name || null
      const nm = id => prodsR.current.find(p => p.id === id)?.name || null
      try {
        if (add.length) await sb.from('wishlists').upsert(add.map(id => ({ device_id: dv, product_id: String(id), product_name: nm(id), user_id: uid, user_label: label })), { onConflict: 'device_id,product_id', ignoreDuplicates: true })
        for (const id of del) await sb.from('wishlists').delete().eq('device_id', dv).eq('product_id', String(id))
      } catch { /* wishlist stays local */ }
    }, 600)
    return () => clearTimeout(t)
  }, [wish, user])
  useEffect(() => {
    if (cur.s !== 'splash') return
    let on = true
    Promise.all([safe(() => api.restoreUser()), new Promise(r => setTimeout(r, 1500))]).then(([u]) => { if (!on) return; if (recov.current || api.LINK_EXPIRED) return tab('auth'); if (u) setUser(u); tab(u || user ? 'home' : 'ob') })
    return () => { on = false }
  }, [])
  useEffect(() => { if (s === 'orders' || s === 'tracking') safe(() => api.getOrders(user?.id), null).then(o => { if (o) setOrders(o) }) }, [s, user])
  // live status for the tracking screen (works for guests too, via the track_order() database function)
  useEffect(() => {
    const o0 = s === 'tracking' ? cur.order : null
    if (!o0?.order_no || !api.supabase) return
    let on = true, warned = false
    const pull = async () => {
      try {
        const { data, error } = await api.supabase.rpc('track_order', { p_order_no: o0.order_no, p_phone: o0.address?.phone || '' })
        if (error) { console.warn('track_order failed:', error.message); if (!warned) { warned = true; say('Live tracking is not set up yet') } }
        const n = Array.isArray(data) ? data[0] : data
        if (on && !error && n != null && !isNaN(+n)) setLiveSt(m => m[o0.order_no] === +n ? m : { ...m, [o0.order_no]: +n })
      } catch { /* keep last known status */ }
    }
    pull(); const t = setInterval(pull, 15000)
    return () => { on = false; clearInterval(t) }
  }, [s, cur, say])

  /* ---------- derived data (memoised) ---------- */
  const wishSet = useMemo(() => new Set(wish), [wish])
  const { subtotal, count } = useMemo(() => ({ subtotal: cart.reduce((a, i) => a + i.price * i.qty, 0), count: cart.reduce((a, i) => a + i.qty, 0) }), [cart])
  const disc = promoOn ? Math.round(subtotal * 0.1) : 0
  const total = Math.max(0, subtotal - disc)
  const catCount = useMemo(() => { const m = new Map(); for (const p of prods) m.set(p.category_id, (m.get(p.category_id) || 0) + 1); return m }, [prods])
  const hits = useMemo(() => { if (!dq) return prods; const k = dq.toLowerCase(); return prods.filter(p => (p.name + ' ' + (p.brand || '')).toLowerCase().includes(k)) }, [prods, dq])
  const pop = useMemo(() => dq ? hits : hits.slice(0, 6), [dq, hits])
  const catList = useMemo(() => s === 'category' ? prods.filter(p => p.category_id === cur.c.id) : null, [s, prods, cur])
  const tags = useMemo(() => catList ? ['All', ...new Set(catList.map(p => p.tag).filter(Boolean))] : [], [catList])
  const shown = useMemo(() => {
    if (!catList) return []
    const k = dq.toLowerCase()
    return catList.filter(p => (chip === 'All' || p.tag === chip) && (!k || p.name.toLowerCase().includes(k))).sort(SORTS[sort][1])
  }, [catList, chip, dq, sort])

  const addToCart = useCallback((p, v, n = 1) => {
    const variant = v || p.variants?.[0], price = p.price * (variant?.mult || 1), key = p.id + (variant?.label || '')
    setCart(c => c.some(i => i.key === key) ? c.map(i => i.key === key ? { ...i, qty: i.qty + n } : i) : [...c, { key, id: p.id, name: p.name, emoji: p.emoji, image_url: p.image_url, variant: variant?.label, price, qty: n }])
    say('Added to cart')
  }, [say])
  const gp = { add: addToCart, open, wish: wishSet, like }
  const qty = useCallback((key, d) => setCart(c => c.map(i => i.key === key ? { ...i, qty: i.qty + d } : i).filter(i => i.qty > 0)), [])
  const reorder = o => { setCart(c => { const m = [...c]; (o.items || []).forEach(i => { const key = i.key || i.id + (i.variant || ''), k = m.findIndex(x => x.key === key); if (k >= 0) m[k] = { ...m[k], qty: m[k].qty + i.qty }; else m.push({ ...i, key }) }); return m }); say('Items added to your cart'); tab('cart') }
  const cartSugg = useMemo(() => s === 'cart' && cart.length ? suggest(prods, prods.filter(p => cart.some(i => i.id === p.id)), new Set(cart.map(i => i.id)), 8) : [], [s, cart, prods])

  const login = async e => {
    e?.preventDefault?.()
    if (busy) return
    const email = form.id.trim().toLowerCase(), name = form.name.trim(), phone = form.phone.replace(/[\s-]/g, '')
    if (mode === 'signup' && name.length < 2) return bad('Enter your full name')
    if (mode === 'signup' && !/^(?:\+?88)?01[3-9]\d{8}$/.test(phone)) return bad('Enter a valid phone number (01XXXXXXXXX)')
    if (mode !== 'reset' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return bad('Enter a valid email address')
    if (mode !== 'forgot' && form.pw.length < 6) return bad('Password must be at least 6 characters')
    if ((mode === 'signup' || mode === 'reset') && form.pw !== form.pw2) return bad('Passwords do not match')
    setBusy(true)
    try {
      if (mode === 'forgot') { await api.resetPassword(email); say('Reset link sent. Check your email, including spam.', 4500); setMode('login') }
      else if (mode === 'reset') {
        await api.updatePassword(form.pw); recov.current = false
        setForm(f => ({ ...f, pw: '', pw2: '' })); say('Password updated')
        const u = await api.restoreUser(); if (u) setUser(u); setMode('login'); tab(u ? 'home' : 'auth')
      }
      else if (mode === 'signup') {
        const r = await api.signUp({ name, phone, email, password: form.pw })
        if (r?.needsConfirm) { say('Account created. Check your email to confirm it, then log in.', 5000); setMode('login') }
        else { setUser(r); tab('home') }
      }
      else { const u = await api.signIn(email, form.pw); setUser(u); tab('home') }
    }
    catch (err) { bad(err?.message || 'Could not continue. Please try again.') }
    finally { setBusy(false) }
  }
  const applyPromo = () => promo.trim().toUpperCase() === 'SHIELD10' ? (setPromoOn(true), say('10% off applied')) : say('Invalid promo code')
  const place = async () => {
    if (busy) return
    if (pay === 1) { // manual bKash: no order yet. It is created only when the customer submits the TrxID, so leaving keeps the cart
      if (!realUid(user) || !api.supabase) return say('Please sign in with your email to pay with bKash')
      return go('bkash')
    }
    if (pay === 2) { // Nagad: order is created + priced on the server, then we hand off to the gateway
      if (!realUid(user) || !api.supabase) return say('Please sign in with your email to pay with ' + PAYS[pay][0])
      setBusy(true)
      try { location.assign(await api.startOnlinePayment({ provider: 'nagad', items: cart, promo: promoOn ? 'SHIELD10' : '', address: addr })) }
      catch (e) { say(e?.message || 'Could not start payment. Please try again.'); setBusy(false) }
      return
    }
    setBusy(true)
    try {
      const o = await api.placeOrder({ user_id: user?.id, items: cart, total, address: addr, payment: PAYS[pay][0] })
      // placeOrder falls back to this device only (guests / signed-out). Also send it to the store so the admin sees every order.
      if (api.supabase && typeof o.id === 'string' && /^o\d{6,}$/.test(o.id)) {
        try { const { id: _local, ...row } = o; await api.supabase.from('orders').insert({ ...row, user_id: realUid(user) }) } catch { /* kept locally */ }
      }
      setCart([]); setPromoOn(false)
      collapse(() => { depth.current = 1; try { history.pushState({ ms: 1 }, '') } catch { /* history blocked */ } setDir('fwd'); setStack([{ s: 'home' }, { s: 'done', order: o }]) })
    } catch { say('Could not place order. Please try again.') }
    finally { setBusy(false) }
  }
  // Coming back from bKash / Nagad: trust only the database (the order must really be marked paid by the server)
  useEffect(() => {
    const unstick = e => { if (e.persisted) setBusy(false) }
    window.addEventListener('pageshow', unstick)
    const qs = new URLSearchParams(location.search), res = qs.get('pay'), no = qs.get('order')
    if (res) {
      try { history.replaceState(null, '', location.pathname) } catch { /* ignore */ }
      if (no) (async () => {
        const o = await api.getOrderByNo(no)
        if (o?.payment_status === 'paid') {
          setCart([]); setPromoOn(false); depth.current = 1
          try { history.pushState({ ms: 1 }, '') } catch { /* history blocked */ }
          setDir('fwd'); setStack([{ s: 'home' }, { s: 'done', order: o }])
        } else say(res === 'cancel' ? 'Payment cancelled. Your cart is still saved.' : 'Payment was not completed. You have not been charged. Please try again.')
      })()
      else say('Payment was not completed. Please try again.')
    }
    return () => window.removeEventListener('pageshow', unstick)
  }, [say])
  const adminDo = async (fn, ok) => { if (!admin) return; try { await fn(); await load(); say(ok) } catch (e) { say(e?.message || 'Something went wrong. Try again.') } }

  let body
  if (s === 'splash') return <div className="app"><div className="splash"><div className="lgcard"><img src="/logo-full.webp?v=2" width="220" height="197" alt="MyShyld" fetchpriority="high" decoding="async" /></div><div>Privacy. Confidence. Comfort. Wellness.</div><div className="sbar"><i /></div></div></div>

  if (s === 'ob') { const o = OB[ob]; body = <div className="ob">
    <div className="row"><span /><button onClick={() => tab('auth')} style={{ color: '#8b8197' }}>Skip</button></div>
    <div key={ob} className="hero pop"><span className="float"><Glyph v={o.e} /></span></div><div key={'t' + ob} className="fadeUp"><h1>{o.t[0]}<br />{o.t[1]}</h1><p>{o.d}</p></div>
    <div className="row"><div className="dots">{OB.map((_, i) => <i key={i} className={i === ob ? 'on' : ''} />)}</div>
      {ob < 2 ? <button className="fab" aria-label="Next" onClick={() => setOb(ob + 1)}>→</button> : <button className="btn" style={{ width: 200 }} onClick={() => tab('auth')}>Get Started</button>}</div></div> }

  if (s === 'auth') body = <div className="auth">
    <div className="blobs" aria-hidden="true"><i /><i /><i /></div>
    <header className="abar"><span className="am"><img src="/logo-mark.webp?v=2" width="34" height="34" alt="" decoding="async" draggable="false" /></span><div className="an"><h1>MyShyld</h1><small>Privacy. Confidence. Comfort. Wellness.</small></div><span className="ap"><Icon n="lock" />Private</span></header>
    <div className="auth-in">
      <form className={'auth-card glass' + (shake ? ' shake' : '')} onSubmit={login} noValidate>
        {(mode === 'login' || mode === 'signup') && <div className="ah"><h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2><p>{mode === 'login' ? 'Log in to continue shopping privately.' : 'Join MyShyld for discreet delivery across Chattogram.'}</p></div>}
        {(mode === 'login' || mode === 'signup') && <div className="tabs" data-i={mode === 'login' ? 0 : 1}>{['login', 'signup'].map(m => <button type="button" key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{m === 'login' ? 'Login' : 'Sign Up'}</button>)}</div>}
        {mode === 'forgot' && <p className="msg"><b>Reset your password</b><br />Enter your account email and we will send you a reset link.</p>}
        {mode === 'reset' && <p className="msg"><b>Set a new password</b><br />Choose a new password for your account.</p>}
        {mode === 'signup' && <label className="fld"><span className="fi"><Icon n="user" /></span><input placeholder="Full name" aria-label="Full name" autoComplete="name" enterKeyHint="next" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></label>}
        {mode === 'signup' && <label className="fld"><span className="fi"><Icon n="phone" /></span><input placeholder="Phone number (01XXXXXXXXX)" aria-label="Phone number" type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="next" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></label>}
        {mode !== 'reset' && <label className="fld"><span className="fi"><Icon n="mail" /></span><input placeholder="Email address" aria-label="Email address" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck="false" enterKeyHint={mode === 'forgot' ? 'go' : 'next'} value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} /></label>}
        {mode !== 'forgot' && <label className="fld"><span className="fi"><Icon n="lock" /></span><input placeholder={mode === 'reset' ? 'New password' : 'Password'} aria-label="Password" type={showPw ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} enterKeyHint={mode === 'login' ? 'go' : 'next'} value={form.pw} onChange={e => setForm(f => ({ ...f, pw: e.target.value }))} />
          <button type="button" className="eye" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw(v => !v)}><Icon n={showPw ? 'eyeoff' : 'eye'} /></button></label>}
        {(mode === 'signup' || mode === 'reset') && <label className="fld"><span className="fi"><Icon n="lock" /></span><input placeholder="Confirm password" aria-label="Confirm password" type={showPw ? 'text' : 'password'} autoComplete="new-password" enterKeyHint="go" value={form.pw2} onChange={e => setForm(f => ({ ...f, pw2: e.target.value }))} /></label>}
        {mode === 'login' && <div className="forgot"><button type="button" onClick={() => setMode('forgot')}>Forgot password?</button></div>}
        <button className="btn" type="submit" disabled={busy}>{busy ? <i className="spin" /> : { login: 'Login', signup: 'Create Account', forgot: 'Send Reset Link', reset: 'Update Password' }[mode]}</button>
        {(mode === 'login' || mode === 'signup') && <>
          <div className="or"><span>or continue with</span></div>
          <div className="socials" style={{ gridTemplateColumns: '1fr' }}><button type="button" className="btn o social" onClick={() => api.signInWithGoogle().catch(e => bad(e?.message || 'Google login failed'))}><GoogleG />Google</button></div>
        </>}
      </form>
      {mode !== 'reset' && <p className="sw">{mode === 'forgot' ? <>Remembered it? <button type="button" onClick={() => setMode('login')}>Back to login</button></> : <>{mode === 'login' ? 'New here?' : 'Already have an account?'} <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Create an account' : 'Login'}</button></>}</p>}
      <p className="trust"><Icon n="lock" />Private by design · Discreet delivery</p>
    </div></div>

  if (s === 'home') body = <div className="scr hm">
    <div className="hstick">
      <div className="topbar"><LocChip loc={loc} onClick={() => go('address')} /><button className="ib" aria-label="Open cart" onClick={() => tab('cart')}><Icon n="bag" />{count > 0 && <em className="cb" key={count}>{count}</em>}</button></div>
      <div className="search"><Icon n="search" /><input placeholder="What are you looking for?" value={q} onChange={e => setQ(e.target.value)} /><button className="sf" aria-label="Filters" onClick={() => tab('categories')}><Icon n="sliders" /></button></div>
    </div>
    <Banner shop={tab} />
    <div className="sec">Categories <a onClick={() => tab('categories')}>See all</a></div>
    <div className="catrow">{cats.map((c, i) => <button key={c.id} style={{ '--i': i }} className="cc rise" onClick={() => go('category', { c })}><b>{c.name}</b><span><Glyph v={c.icon} /></span></button>)}</div>
    <div className="sec">{dq ? `Results (${hits.length})` : 'Popular Products'} <a onClick={() => tab('categories')}>See All</a></div><Grid list={pop} loading={loading} {...gp} /></div>

  if (s === 'categories') body = <><Hdr title="Categories" back={back} /><div className="scr">
    <div className="cats">{cats.map((c, i) => <button key={c.id} style={{ '--i': i }} className="cat rise" onClick={() => go('category', { c })}><span><Glyph v={c.icon} /></span>{c.name}<small style={{ color: '#8b8197', fontWeight: 400 }}>{catCount.get(c.id) || 0} items</small></button>)}
      {admin && <button className="cat" style={{ background: '#ffffff99', border: '2px dashed #d9c8ea' }} onClick={() => go('manage')}><span>＋</span>Add Category</button>}</div></div></>

  if (s === 'category') body = <><Hdr title={cur.c.name} back={() => { setChip('All'); back() }} /><div className="scr">
    <div className="tools"><div className="search">🔍<input placeholder={`Search ${cur.c.name}...`} value={q} onChange={e => setQ(e.target.value)} /></div><select className="inp sort" aria-label="Sort" value={sort} onChange={e => setSort(e.target.value)}>{Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></div>
    <div className="chips">{tags.map(t => <button key={t} className={chip === t ? 'on' : ''} onClick={() => setChip(t)}>{t}</button>)}</div><Grid list={shown} loading={loading} {...gp} /></div></>

  if (s === 'product') body = <ProductScreen key={cur.p.id} {...{ p: cur.p, back, addToCart, count, go, like, open }} prods={prods} wish={wishSet} liked={wishSet.has(cur.p.id)} />

  if (s === 'cart') body = <><Hdr title={`My Cart (${count})`} back={back} right={cart.length > 0 && <button className="ib" aria-label="Clear cart" onClick={() => { setCart([]); setPromoOn(false) }}>🗑️</button>} /><div className="scr narrow">
    {!cart.length ? <div className="emp"><div className="emp-i">🛍️</div><h3>Your cart is empty</h3><p>Browse our categories and add something you like.</p><button className="btn" onClick={() => tab('categories')}>Start shopping</button></div> : <><Steps n={0} />
      <div className="frb"><span>🚚</span><div><b>Free discreet delivery</b><small>Plain, private packaging across Chattogram</small></div></div>
      {cart.map(i => <CartItem key={i.key} i={i} qty={qty} />)}
      <div className="promo"><input placeholder="Have a promo code? (try SHIELD10)" value={promo} onChange={e => setPromo(e.target.value)} /><button onClick={applyPromo}>Apply</button></div>
      <div className="sum"><div><span>Subtotal ({count} item{count === 1 ? '' : 's'})</span><span><Money v={subtotal} /></span></div>{disc > 0 && <div><span>Discount</span><span style={{ color: '#3ab36b' }}>−<Money v={disc} /></span></div>}<div><span>Delivery Fee</span><span style={{ color: '#3ab36b', fontWeight: 700 }}>Free</span></div><div className="t"><span>Total</span><span><Money v={total} /></span></div></div>
      <Rail title="Add more to your order" list={cartSugg} {...gp} /></>}</div>
    {cart.length > 0 && <div className="buybar"><div><small>Total · {count} item{count === 1 ? '' : 's'}</small><b><Money v={total} /></b></div><button className="btn buy" onClick={() => go('checkout')}>Checkout →</button></div>}</>

  if (s === 'checkout') body = <><Hdr title="Delivery Details" back={back} /><div className="scr narrow"><Steps n={1} />
    {[['name', 'Full Name', 'name'], ['phone', 'Phone Number (+8801XXXXXXXXX)', 'tel'], ['address', 'House, Road, Area, Chattogram', 'street-address'], ['note', 'Delivery Instructions (Optional)', 'off']].map(([k, l, ac]) => <input key={k} className="inp" placeholder={l} autoComplete={ac} inputMode={k === 'phone' ? 'tel' : undefined} value={addr[k]} onChange={e => setAddr(a => ({ ...a, [k]: e.target.value }))} />)}
    <div className="note">🔒 Your order will be delivered in discreet packaging.</div>
    <button className="btn" onClick={() => !addr.name.trim() ? say('Enter your full name') : addr.phone.replace(/\D/g, '').length < 10 ? say('Enter a valid phone number (at least 10 digits)') : !addr.address.trim() ? say('Enter your delivery address') : go('payment')}>Continue to Payment</button></div></>

  if (s === 'payment') body = <><Hdr title="Payment Method" back={back} /><div className="scr narrow"><Steps n={2} /><div className="mini"><span>{count} item{count === 1 ? '' : 's'} · Free delivery</span><b><Money v={total} /></b></div>
    {PAYS.map(([n, d], k) => <button key={n} className={'pay' + (pay === k ? ' on' : '')} onClick={() => setPay(k)}><PayLogo k={k} /><div><b>{n}</b><small>{d}</small></div><i /></button>)}
    <div className="note" style={{ background: '#eaf8efcc', color: '#2a8a52' }}>🛡️ SSL Secured Payment — your information is always protected.</div>
    <button className="btn" disabled={busy} onClick={place}>{busy ? <i className="spin" /> : <>{pay === 1 ? 'Continue to bKash' : pay === 2 ? 'Pay Now' : 'Place Order'} · <Money v={total} /></>}</button></div></>

  if (s === 'bkash') body = <BkashPay total={total} cart={cart} promo={promoOn ? 'SHIELD10' : ''} addr={addr} back={back} say={say} onDone={o => {
    setCart([]); setPromoOn(false); say('Payment submitted. We are verifying it.', 3000)
    collapse(() => { depth.current = 1; try { history.pushState({ ms: 1 }, '') } catch { /* history blocked */ } setDir('fwd'); setStack([{ s: 'home' }, { s: 'done', order: o }]) })
  }} />

  if (s === 'done') body = <div className="scr ok narrow"><div className="tick">✓</div><h2 style={{ margin: '24px 0 4px' }}>Order Placed Successfully!</h2><div className="pill">Order #{cur.order.order_no}</div>
    <p style={{ color: '#8b8197', marginBottom: 30 }}>Thank you for choosing MyShyld.<br />{cur.order.payment_status === 'verifying' ? 'We are verifying your bKash payment. We will confirm your order shortly.' : 'Your order will be delivered soon.'}</p>
    <button className="btn" onClick={() => go('tracking', { order: cur.order })}>Track Order</button><button className="btn o" style={{ marginTop: 12 }} onClick={() => tab('home')}>Continue Shopping</button></div>

  if (s === 'orders') { const stOf = o => liveSt[o.order_no] ?? (o.status || 0), list = orders.filter(o => oflt === 'all' || (oflt === 'active') === (stOf(o) < 3))
    body = <div className="scr narrow"><h2 className="ptl">My Orders</h2>
      {orders.length > 0 && <div className="chips">{[['all', 'All'], ['active', 'Active'], ['done', 'Delivered']].map(([k, l]) => <button key={k} className={oflt === k ? 'on' : ''} onClick={() => setOflt(k)}>{l}</button>)}</div>}
      {!orders.length ? <div className="emp"><div className="emp-i">📦</div><h3>No orders yet</h3><p>Your orders and their live status will show up here.</p><button className="btn" onClick={() => tab('home')}>Start shopping</button></div>
        : !list.length ? <p className="empty">No {oflt === 'active' ? 'active' : 'delivered'} orders.</p> : list.map(o => <OrderCard key={o.id} o={o} st={stOf(o)} open={x => go('tracking', { order: x })} />)}</div> }

  if (s === 'tracking') { const o = orders.find(x => x.id === cur.order.id) || cur.order, st = liveSt[o.order_no] ?? (o.status || 0), t = new Date(o.created_at), its = o.items || [], ad = o.address || {}, sub = its.reduce((x, i) => x + i.price * i.qty, 0), dc = Math.max(0, sub - o.total)
    body = <><Hdr title="Order Tracking" back={back} /><div className="scr narrow">
      <div className="tkc"><div><small>Order</small><b>#{o.order_no}</b></div><div><small>Placed</small><b>{t.toLocaleDateString([], { dateStyle: 'medium' })}</b></div><div><small>Total</small><b>{taka(o.total)}</b></div></div>
      <div className="tl">{STEPS.map((l, i) => <div key={l} className={'st' + (i <= st ? ' d' : '') + (i === st && st < 3 ? ' cur' : '')}><i>{i <= st && '✓'}</i><div><b>{l}</b><small>{i <= st ? t.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Expected soon'}</small></div></div>)}</div>
      <div className="way"><span>{['📝', '📦', '🚚', '✅'][st]}</span><div><b>{['Order received!', 'We are preparing your order', 'Your order is on the way!', 'Delivered. Thank you!'][st]}</b><br />{['We will confirm it shortly.', 'It will be handed to our delivery partner soon.', 'Our delivery partner will reach you soon.', 'Hope you love it.'][st]}</div></div>
      {its.length > 0 && <div className="cd2"><h5>Items</h5>{its.map((i, k) => <div className="ti" key={i.key || k}><Pic p={i} /><div><b>{i.name}</b><small>{i.variant && i.variant !== 'Standard' ? i.variant + ' · ' : ''}{taka(i.price)} × {i.qty}</small></div><b>{taka(i.price * i.qty)}</b></div>)}</div>}
      {(ad.address || ad.name) && <div className="cd2 dl"><h5>Delivery to</h5><p><b>{ad.name}</b>{ad.phone && ' · ' + ad.phone}</p><p>{ad.address}</p>{ad.note && <small>Note: {ad.note}</small>}</div>}
      <div className="sum"><div><span>Subtotal</span><span>{taka(sub)}</span></div>{dc > 0.5 && <div><span>Discount</span><span style={{ color: '#3ab36b' }}>−{taka(dc)}</span></div>}<div><span>Delivery</span><span style={{ color: '#3ab36b', fontWeight: 700 }}>Free</span></div>{o.payment && <div><span>Payment</span><span>{o.payment}{o.payment === 'bKash' ? (o.payment_status === 'paid' ? ' · Paid ✓' : o.payment_status === 'verifying' ? ' · Verifying…' : ' · Not paid yet') : ''}</span></div>}<div className="t"><span>Total</span><span>{taka(o.total)}</span></div></div>
      {its.length > 0 && <button className="btn o" style={{ marginTop: 14 }} onClick={() => reorder(o)}>Order again</button>}</div></> }

  if (s === 'profile') body = <Profile {...{ user, admin, count, tab, go, say }} wishCount={wish.length} place={loc.area || loc.city} hasAddr={!!(loc.area || loc.line)} onLogout={logout} />

  if (s === 'address') body = <AddressScreen key="addr" loc={loc} back={back} onSave={saveLoc} />

  if (s === 'wishlist') body = <><Hdr title="Wishlist" back={back} /><div className="scr"><Grid list={prods.filter(p => wishSet.has(p.id))} loading={loading} {...gp} /></div></>

  if (s === 'manage') body = !admin ? <><Hdr title="Store" back={back} /><div className="scr narrow"><div className="note">🔒 Only store admins can manage categories and products.</div></div></> : <><Hdr title="Manage Store" back={back} /><div className="scr narrow">
    <div className="sec">Add Category</div>
    <div className="row" style={{ gap: 8 }}><input className="inp" style={{ width: 70, textAlign: 'center', marginBottom: 0 }} value={nc.icon} onChange={e => setNc(c => ({ ...c, icon: e.target.value }))} /><input className="inp" style={{ marginBottom: 0 }} placeholder="e.g. Lubricants, Pregnancy Tests" value={nc.name} onChange={e => setNc(c => ({ ...c, name: e.target.value }))} /></div>
    <button className="btn" style={{ margin: '12px 0 20px' }} onClick={() => { if (!nc.name.trim()) return say('Enter category name'); adminDo(async () => { await api.addCategory(nc.name.trim(), nc.icon || '🛍️'); setNc({ name: '', icon: '🛍️' }) }, 'Category added') }}>Add Category</button>
    {cats.map(c => <div key={c.id} className="menu"><span><Glyph v={c.icon} /></span><span>{c.name}</span><span role="button" aria-label={`Delete ${c.name}`} onClick={() => adminDo(() => api.deleteCategory(c.id), 'Category deleted')}>🗑️</span></div>)}
    <div className="sec" style={{ marginTop: 22 }}>Add Product</div>
    <input className="inp" placeholder="Product name" value={np.name} onChange={e => setNp(p => ({ ...p, name: e.target.value }))} />
    <input className="inp" type="number" inputMode="decimal" placeholder="Price (৳)" value={np.price} onChange={e => setNp(p => ({ ...p, price: e.target.value }))} />
    <input className="inp" placeholder="Image URL (optional)" value={np.image_url} onChange={e => setNp(p => ({ ...p, image_url: e.target.value }))} />
    <select className="inp" value={np.category_id} onChange={e => setNp(p => ({ ...p, category_id: e.target.value }))}><option value="">Select category</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
    <button className="btn" onClick={() => { if (!np.name || !np.price || !np.category_id) return say('Fill all fields'); adminDo(async () => { await api.addProduct({ ...np, price: +np.price, image_url: np.image_url || null }); setNp({ name: '', price: '', category_id: '', image_url: '' }) }, 'Product added') }}>Add Product</button></div></>

  return <div className="app">{!['ob', 'auth'].includes(s) && <Nav {...{ s, count, tab }} />}<main className="main"><div key={s + stack.length} className={'pg ' + dir}>{body}</div></main>{toast && <div className="toast" role="status">{toast}</div>}</div>
}

function safeAdmin(u) { try { return api.isAdmin(u) } catch { return false } }

function ProductScreen({ p, back, addToCart, count, go, liked, like, prods = [], open, wish }) {
  const [v, setV] = useState(p.variants?.[0]), [added, setAdded] = useState(false), [n, setN] = useState(1)
  const t = useRef(0)
  useEffect(() => () => clearTimeout(t.current), [])
  const price = p.price * (v?.mult || 1)
  const add = () => { addToCart(p, v, n); setAdded(true); clearTimeout(t.current); t.current = setTimeout(() => setAdded(false), 1200) }
  const multi = (p.variants || []).length > 1
  const sugg = useMemo(() => suggest(prods, [p], new Set([p.id]), 8), [prods, p])
  return <><Hdr title="Details" back={back} right={<button className="ib" aria-label="Open cart" onClick={() => go('cart')}><Icon n="bag" />{count > 0 && <em className="cb" key={count}>{count}</em>}</button>} />
    <div className="scr pd"><div className="pdp"><Pic p={p} big /><div className="fadeUp pdp-info">
      <small className="pk">{[p.brand, p.tag].filter(Boolean).join(' · ') || 'MyShyld'}</small>
      <div className="row"><h3>{p.name}</h3><Heart on={liked} toggle={() => like(p.id)} inl /></div>
      <small style={{ color: '#8b8197' }}>★ {p.rating} ({p.reviews > 999 ? (p.reviews / 1000).toFixed(1) + 'k' : p.reviews} reviews)</small>
      <div className="store"><span className="sl"><Glyph v="🛡️" /></span><div><b>MyShyld Store<i className="vf">✓</i></b><small>Official store</small></div><span className="fl">Verified</span></div>
      <div className="opt"><div className="opt-l">{multi && <><span>Select option</span><div className="var">{p.variants.map(x => <button key={x.label} className={v?.label === x.label ? 'on' : ''} onClick={() => setV(x)}>{x.label}</button>)}</div></>}</div>
        <div className="opt-r"><span>QTY</span><div className="qty"><button aria-label="Decrease" onClick={() => setN(x => Math.max(1, x - 1))}>−</button><span className="qn">{n}</span><button aria-label="Increase" onClick={() => setN(x => Math.min(20, x + 1))}>+</button></div></div></div>
      <div className="dsc"><h5>Description</h5><ul className="ck">{(p.features || []).map(f => <li key={f}>{f}</li>)}</ul></div></div></div>
      {sugg.length > 0 && <Rail title="You may also like" list={sugg} add={addToCart} open={open} wish={wish} like={like} />}</div>
    <div className="buybar"><div><small>Total price</small><b><Money v={price * n} /></b></div><button className={'btn buy' + (added ? ' done' : '')} onClick={add}><Icon n="bag" />{added ? 'Added ✓' : 'Add to Cart'}</button></div></>
}
