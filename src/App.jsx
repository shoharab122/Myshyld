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
const PAYS = [['Cash on Delivery', 'Pay when you receive', '💵'], ['bKash', 'Pay with bKash', '🌸'], ['Nagad', 'Pay with Nagad', '🟠'], ['Debit/Credit Card', 'Visa, Mastercard', '💳']]
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
@media (prefers-reduced-motion:reduce){.fab,.add,.btn{animation:none!important}.rp{display:none}.lq-pop{animation:none!important}}
`
const POP = '.add,.fab,.qty button,.ib'

/* Delegated listeners power the liquid feel everywhere: ripple, pointer-tracking light and squish-pop (no per-component handlers) */
function useLiquid() {
  useEffect(() => {
    let st = document.getElementById('lq-css')
    if (!st) { st = document.createElement('style'); st.id = 'lq-css'; document.head.appendChild(st) }
    if (st.textContent !== LIQUID_CSS) st.textContent = LIQUID_CSS
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
// Brand-aware icon: the 🛡️ emoji (or an image URL) renders as the real MyShield logo mark
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
  menu: <path d="M4 7h16M4 12h16M4 17h10" />, back: <path d="M15 5l-7 7 7 7" />, search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  bag: <><path d="M6 8h12l-1 11H7L6 8z" /><path d="M9 8a3 3 0 0 1 6 0" /></>, sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
}
const Icon = ({ n }) => <svg className="ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[n]}</svg>
const Steps = ({ n }) => <div className="stp">{['Cart', 'Details', 'Payment'].map((l, i) => <div key={l} className={i <= n ? 'on' : ''}><i>{i < n ? '✓' : i + 1}</i><span>{l}</span></div>)}</div>
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
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => { if (!document.hidden) setI(x => (x + 1) % OFFERS.length) }, 3500); return () => clearInterval(t) }, [])
  const o = OFFERS[i]
  return <div className="bw"><div className="banner"><div key={i} className="bt"><span className="bchip">{o[0]}</span><h3>{o[1].split('|').map(l => <span key={l}>{l}</span>)}</h3><button className="bshop" onClick={() => shop('categories')}>Shop Now<i>↗</i></button></div><div key={'e' + i} className="be"><Glyph v={o[2]} /></div></div><div className="bd">{OFFERS.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div></div>
}

const Banner = memo(BannerImpl)

const Nav = memo(({ s, count, tab }) => <nav className={'nav' + (TABS.includes(s) ? '' : ' hide-m')}><div className="nv-brand"><img src="/logo-full.webp?v=2" width="150" height="134" alt="MyShield" decoding="async" /></div>{NAV.map(([k, ic, l]) => <button key={k} className={s === k ? 'on' : ''} aria-current={s === k ? 'page' : undefined} onClick={() => tab(k)}><span><Icon n={ic} /></span>{l}{k === 'cart' && count > 0 && <em key={count}>{count}</em>}</button>)}</nav>)

const ProductCard = memo(({ p, i, add, open, liked, like }) => <div className="card rise" style={{ '--i': Math.min(i, 12) }} onClick={() => open(p)}><Heart on={liked} toggle={() => like(p.id)} /><Pic p={p} />
  <div className="cinfo"><small>{p.tag || p.brand}</small><h4>{p.name}</h4><div className="cfoot"><b>{taka(p.price)}</b><button className="add" aria-label="Add to cart" onClick={e => { e.stopPropagation(); add(p) }}>+</button></div></div></div>)

const Grid = memo(({ list, loading, add, open, wish, like }) => loading ? <div className="grid">{[...Array(6)].map((_, i) => <div key={i} className="skel" />)}</div>
  : list.length ? <div className="grid">{list.map((p, i) => <ProductCard key={p.id} {...{ p, i, add, open, like }} liked={wish.has(p.id)} />)}</div> : <p className="empty">No products found.</p>)

const fullAddr = l => l ? [l.line, l.area, l.city].filter(Boolean).join(', ') : ''
const AREAS = ['GEC Circle', 'Agrabad', 'Nasirabad', 'Khulshi', 'Halishahar', 'Pahartali', 'Chawkbazar', 'Kotwali', 'Panchlaish', 'Bayezid', 'Patenga', 'Muradpur', 'Oxygen', '2 No Gate', 'Bahaddarhat']

function AddressScreen({ loc, back, onSave }) {
  const [f, setF] = useState(loc)
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }))
  const clean = { city: f.city.trim() || 'Chattogram', area: f.area.trim(), line: f.line.trim() }
  const save = () => onSave(clean.area || clean.line ? clean : null)
  return <><Hdr title="Delivery Address" back={back} />
    <div className="scr narrow addr">
      <div className="prev"><span>📍</span><div><small>Delivering to</small><b>{fullAddr(clean) || 'Nothing set yet'}</b></div></div>
      <label className="lbl">City<input className="inp" value={f.city} onChange={set('city')} autoComplete="address-level2" /></label>
      <label className="lbl">Area<input className="inp" placeholder="e.g. Agrabad, Khulshi" value={f.area} onChange={set('area')} autoComplete="address-level3" /></label>
      <div className="chips wrap" role="group" aria-label="Popular areas">{AREAS.map(a => <button key={a} type="button" className={f.area === a ? 'on' : ''} onClick={() => setF(x => ({ ...x, area: a }))}>{a}</button>)}</div>
      <label className="lbl">House, road &amp; landmark<textarea className="inp" rows="3" placeholder="House 12, Road 3, near ..." value={f.line} onChange={set('line')} autoComplete="street-address" /></label></div>
    <div className="buybar one"><button className="btn" onClick={save}>Save address</button></div></>
}

const CartItem = memo(({ i, qty }) => <div className="item rise"><Pic p={i} /><div><b style={{ color: '#2a1a3a' }}>{i.name}</b><br /><small style={{ color: '#8b8197' }}>{i.variant}</small><br /><b>{taka(i.price)}</b></div>
  <div className="qty"><button aria-label="Decrease" onClick={() => qty(i.key, -1)}>−</button>{i.qty}<button aria-label="Increase" onClick={() => qty(i.key, 1)}>+</button></div></div>)

const Profile = memo(({ user, admin, count, wishCount, place, hasAddr, tab, go, say, onLogout }) => {
  const cols = useMemo(() => [
    [['Account', [['receipt', 'My Orders', 'Track your deliveries', () => tab('orders'), 't1'], ['heart', 'Wishlist', `${wishCount} saved item${wishCount === 1 ? '' : 's'}`, () => go('wishlist'), 't2'], ['pin', 'Addresses', hasAddr ? place : 'Set your delivery address', () => go('address'), 't3'], ['card', 'Payment Methods', 'Cards & mobile wallets', null, 't1']]]],
    [...(admin ? [['Store admin', [['grid', 'Manage Categories & Products', 'Add or remove items', () => go('manage'), 't2']]]] : []),
      ['Support', [['lock', 'Privacy & Help', 'Your data, your control', null, 't3'], ['info', 'About MyShield', 'Our story & version', null, 't2']]]],
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
  useLiquid()
  const [stack, setStack] = useState([{ s: 'splash' }])
  const [user, setUser] = useState(() => { try { return api.getUser() } catch { return null } })
  const [cats, setCats] = useState([]), [prods, setProds] = useState([]), [loading, setLoading] = useState(true)
  const [cart, setCart] = useState(() => readLS('ms_cart', []))
  const [orders, setOrders] = useState([]), [toast, setToast] = useState(''), [liveSt, setLiveSt] = useState({})
  const [ob, setOb] = useState(0), [mode, setMode] = useState('login')
  const [form, setForm] = useState({ id: '', pw: '' }), [showPw, setShowPw] = useState(false), [shake, setShake] = useState(false), [busy, setBusy] = useState(false)
  const [loc, setLoc] = useState(() => ({ city: 'Chattogram', area: '', line: '', ...readLS('ms_loc', {}) }))
  const [addr, setAddr] = useState(() => ({ name: '', phone: '', address: fullAddr(readLS('ms_loc', null)), note: '' }))
  const [pay, setPay] = useState(0), [promo, setPromo] = useState(''), [promoOn, setPromoOn] = useState(false)
  const [q, setQ] = useState(''), [nc, setNc] = useState({ name: '', icon: '🛍️' })
  const [np, setNp] = useState({ name: '', price: '', category_id: '', image_url: '' })
  const [wish, setWish] = useState(() => readLS('ms_wish', []))
  const [dir, setDir] = useState('fade'), [sort, setSort] = useState('pop'), [chip, setChip] = useState('All'), dq = useDeferredValue(q)
  const toastT = useRef(0), wishPrev = useRef(null), wishUser = useRef(''), prodsR = useRef([])

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
  const say = useCallback(m => { clearTimeout(toastT.current); setToast(m); toastT.current = setTimeout(() => setToast(''), 1800) }, [])
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
    Promise.all([safe(() => api.restoreUser()), new Promise(r => setTimeout(r, 1500))]).then(([u]) => { if (!on) return; if (u) setUser(u); tab(u || user ? 'home' : 'ob') })
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

  const login = async e => {
    e?.preventDefault?.()
    if (busy) return
    if (!form.id.trim() || form.pw.length < 4) return bad('Enter your details (password 4+ chars)')
    setBusy(true)
    try { const u = await api.signIn(form.id.trim(), form.pw, mode === 'signup'); setUser(u); tab('home') }
    catch (err) { bad(err?.message || 'Could not sign in. Please try again.') }
    finally { setBusy(false) }
  }
  const applyPromo = () => promo.trim().toUpperCase() === 'SHIELD10' ? (setPromoOn(true), say('10% off applied')) : say('Invalid promo code')
  const place = async () => {
    if (busy) return
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
  const adminDo = async (fn, ok) => { if (!admin) return; try { await fn(); await load(); say(ok) } catch { say('Something went wrong. Try again.') } }

  let body
  if (s === 'splash') return <div className="app"><div className="splash"><div className="lgcard"><img src="/logo-full.webp?v=2" width="220" height="197" alt="MyShield" fetchpriority="high" decoding="async" /></div><div>Privacy. Confidence. Comfort. Wellness.</div><div className="sbar"><i /></div></div></div>

  if (s === 'ob') { const o = OB[ob]; body = <div className="ob">
    <div className="row"><span /><button onClick={() => tab('auth')} style={{ color: '#8b8197' }}>Skip</button></div>
    <div key={ob} className="hero pop"><span className="float"><Glyph v={o.e} /></span></div><div key={'t' + ob} className="fadeUp"><h1>{o.t[0]}<br />{o.t[1]}</h1><p>{o.d}</p></div>
    <div className="row"><div className="dots">{OB.map((_, i) => <i key={i} className={i === ob ? 'on' : ''} />)}</div>
      {ob < 2 ? <button className="fab" aria-label="Next" onClick={() => setOb(ob + 1)}>→</button> : <button className="btn" style={{ width: 200 }} onClick={() => tab('auth')}>Get Started</button>}</div></div> }

  if (s === 'auth') body = <div className="auth">
    <div className="blobs" aria-hidden="true"><i /><i /><i /></div>
    <div className="auth-in">
      <h1 className="lgcard"><img src="/logo-full.webp?v=2" width="220" height="197" alt="MyShield" decoding="async" /></h1>
      <p className="tag">Privacy. Confidence. Comfort. Wellness.</p>
      <form className={'auth-card glass' + (shake ? ' shake' : '')} onSubmit={login} noValidate>
        <div className="tabs" data-i={mode === 'login' ? 0 : 1}>{['login', 'signup'].map(m => <button type="button" key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{m === 'login' ? 'Login' : 'Sign Up'}</button>)}</div>
        <label className="fld"><span>📱</span><input placeholder="Phone number or Email" autoComplete="username" inputMode="email" autoCapitalize="none" value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} /></label>
        <label className="fld"><span>🔒</span><input placeholder="Password" type={showPw ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.pw} onChange={e => setForm(f => ({ ...f, pw: e.target.value }))} />
          <button type="button" className="eye" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw(v => !v)}>{showPw ? '🙈' : '👁️'}</button></label>
        <div className="forgot"><button type="button" onClick={() => say('Password reset coming soon')}>Forgot password?</button></div>
        <button className="btn" type="submit" disabled={busy}>{busy ? <i className="spin" /> : mode === 'login' ? 'Login' : 'Create Account'}</button>
        <div className="or"><span>or continue with</span></div>
        <div className="row" style={{ gap: 12 }}><button type="button" className="btn o social" onClick={login}>G Google</button><button type="button" className="btn o social" onClick={login}> Apple</button></div>
      </form>
      <p className="sw">{mode === 'login' ? 'New here?' : 'Already have an account?'} <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Create an account' : 'Login'}</button></p>
      <p className="trust">🔒 Private by design · Discreet delivery</p>
    </div></div>

  if (s === 'home') body = <div className="scr hm">
    <div className="topbar"><button className="loc" aria-label="Change delivery address" onClick={() => go('address')}><small>Deliver to</small><b>📍 {loc.area || loc.city} <i>⌄</i></b></button><button className="ib" aria-label="Open cart" onClick={() => tab('cart')}><Icon n="bag" />{count > 0 && <em className="cb" key={count}>{count}</em>}</button></div>
    <div className="search"><Icon n="search" /><input placeholder="What are you looking for?" value={q} onChange={e => setQ(e.target.value)} /><button className="sf" aria-label="Filters" onClick={() => tab('categories')}><Icon n="sliders" /></button></div>
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

  if (s === 'product') body = <ProductScreen key={cur.p.id} {...{ p: cur.p, back, addToCart, count, go, like }} liked={wishSet.has(cur.p.id)} />

  if (s === 'cart') body = <><Hdr title={`My Cart (${count})`} back={back} right={cart.length > 0 && <button className="ib" aria-label="Clear cart" onClick={() => { setCart([]); setPromoOn(false) }}>🗑️</button>} /><div className="scr narrow">
    {!cart.length ? <p className="empty" style={{ padding: 60 }}>Your cart is empty</p> : <><Steps n={0} />
      {cart.map(i => <CartItem key={i.key} i={i} qty={qty} />)}
      <div className="promo"><input placeholder="Have a promo code? (try SHIELD10)" value={promo} onChange={e => setPromo(e.target.value)} /><button onClick={applyPromo}>Apply</button></div>
      <div className="sum"><div><span>Subtotal</span><span><Money v={subtotal} /></span></div>{disc > 0 && <div><span>Discount</span><span>−<Money v={disc} /></span></div>}<div><span>Delivery Fee</span><span style={{ color: '#e0457b' }}>৳0</span></div><div className="t"><span>Total</span><span><Money v={total} /></span></div></div>
      <button className="btn" style={{ marginTop: 16 }} onClick={() => go('checkout')}>Proceed to Checkout</button></>}</div></>

  if (s === 'checkout') body = <><Hdr title="Delivery Details" back={back} /><div className="scr narrow"><Steps n={1} />
    {[['name', 'Full Name', 'name'], ['phone', 'Phone Number (+8801XXXXXXXXX)', 'tel'], ['address', 'House, Road, Area, Chattogram', 'street-address'], ['note', 'Delivery Instructions (Optional)', 'off']].map(([k, l, ac]) => <input key={k} className="inp" placeholder={l} autoComplete={ac} inputMode={k === 'phone' ? 'tel' : undefined} value={addr[k]} onChange={e => setAddr(a => ({ ...a, [k]: e.target.value }))} />)}
    <div className="note">🔒 Your order will be delivered in discreet packaging.</div>
    <button className="btn" onClick={() => !addr.name.trim() ? say('Enter your full name') : addr.phone.replace(/\D/g, '').length < 10 ? say('Enter a valid phone number (at least 10 digits)') : !addr.address.trim() ? say('Enter your delivery address') : go('payment')}>Continue to Payment</button></div></>

  if (s === 'payment') body = <><Hdr title="Payment Method" back={back} /><div className="scr narrow"><Steps n={2} />
    {PAYS.map(([n, d], k) => <button key={n} className={'pay' + (pay === k ? ' on' : '')} onClick={() => setPay(k)}><PayLogo k={k} /><div><b>{n}</b><small>{d}</small></div><i /></button>)}
    <div className="note" style={{ background: '#eaf8efcc', color: '#2a8a52' }}>🛡️ SSL Secured Payment — your information is always protected.</div>
    <button className="btn" disabled={busy} onClick={place}>{busy ? <i className="spin" /> : <>Place Order · <Money v={total} /></>}</button></div></>

  if (s === 'done') body = <div className="scr ok narrow"><div className="tick">✓</div><h2 style={{ margin: '24px 0 4px' }}>Order Placed Successfully!</h2><div className="pill">Order #{cur.order.order_no}</div>
    <p style={{ color: '#8b8197', marginBottom: 30 }}>Thank you for choosing MyShield.<br />Your order will be delivered soon.</p>
    <button className="btn" onClick={() => go('tracking', { order: cur.order })}>Track Order</button><button className="btn o" style={{ marginTop: 12 }} onClick={() => tab('home')}>Continue Shopping</button></div>

  if (s === 'orders') body = <div className="scr narrow"><h2 style={{ marginBottom: 14 }}>My Orders</h2>
    {!orders.length ? <p className="empty" style={{ padding: 60 }}>No orders yet</p> : orders.map(o => <div key={o.id} className="item rise" style={{ cursor: 'pointer' }} onClick={() => go('tracking', { order: o })}><div style={{ fontSize: 28 }}>📦</div><div><b style={{ color: '#2a1a3a' }}>#{o.order_no}</b><br /><small style={{ color: '#8b8197' }}>{STEPS[o.status || 0]} · {new Date(o.created_at).toLocaleDateString()}</small></div><b>{taka(o.total)}</b></div>)}</div>

  if (s === 'tracking') { const o = orders.find(x => x.id === cur.order.id) || cur.order, st = liveSt[o.order_no] ?? (o.status || 0), t = new Date(o.created_at)
    body = <><Hdr title="Order Tracking" back={back} /><div className="scr narrow"><small style={{ color: '#8b8197' }}>Order #{o.order_no}</small>
      <div className="tl">{STEPS.map((l, i) => <div key={l} className={'st' + (i <= st ? ' d' : '') + (i === st && st < 3 ? ' cur' : '')}><i>{i <= st && '✓'}</i><div><b>{l}</b><small>{i <= st ? t.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Expected soon'}</small></div></div>)}</div>
      <div className="way"><span>{['📝', '📦', '🚚', '✅'][st]}</span><div><b>{['Order received!', 'We are preparing your order', 'Your order is on the way!', 'Delivered. Thank you!'][st]}</b><br />{['We will confirm it shortly.', 'It will be handed to our delivery partner soon.', 'Our delivery partner will reach you soon.', 'Hope you love it.'][st]}</div></div></div></> }

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

function ProductScreen({ p, back, addToCart, count, go, liked, like }) {
  const [v, setV] = useState(p.variants?.[0]), [added, setAdded] = useState(false), [n, setN] = useState(1)
  const t = useRef(0)
  useEffect(() => () => clearTimeout(t.current), [])
  const price = p.price * (v?.mult || 1)
  const add = () => { addToCart(p, v, n); setAdded(true); clearTimeout(t.current); t.current = setTimeout(() => setAdded(false), 1200) }
  const multi = (p.variants || []).length > 1
  return <><Hdr title="Details" back={back} right={<button className="ib" aria-label="Open cart" onClick={() => go('cart')}><Icon n="bag" />{count > 0 && <em className="cb" key={count}>{count}</em>}</button>} />
    <div className="scr pd"><div className="pdp"><Pic p={p} big /><div className="fadeUp pdp-info">
      <small className="pk">{[p.brand, p.tag].filter(Boolean).join(' · ') || 'MyShield'}</small>
      <div className="row"><h3>{p.name}</h3><Heart on={liked} toggle={() => like(p.id)} inl /></div>
      <small style={{ color: '#8b8197' }}>★ {p.rating} ({p.reviews > 999 ? (p.reviews / 1000).toFixed(1) + 'k' : p.reviews} reviews)</small>
      <div className="store"><span className="sl"><Glyph v="🛡️" /></span><div><b>MyShield Store<i className="vf">✓</i></b><small>Official store</small></div><span className="fl">Verified</span></div>
      <div className="opt"><div className="opt-l">{multi && <><span>Select option</span><div className="var">{p.variants.map(x => <button key={x.label} className={v?.label === x.label ? 'on' : ''} onClick={() => setV(x)}>{x.label}</button>)}</div></>}</div>
        <div className="opt-r"><span>QTY</span><div className="qty"><button aria-label="Decrease" onClick={() => setN(x => Math.max(1, x - 1))}>−</button><span className="qn">{n}</span><button aria-label="Increase" onClick={() => setN(x => Math.min(20, x + 1))}>+</button></div></div></div>
      <div className="dsc"><h5>Description</h5><ul className="ck">{(p.features || []).map(f => <li key={f}>{f}</li>)}</ul></div></div></div></div>
    <div className="buybar"><div><small>Total price</small><b><Money v={price * n} /></b></div><button className={'btn buy' + (added ? ' done' : '')} onClick={add}><Icon n="bag" />{added ? 'Added ✓' : 'Add to Cart'}</button></div></>
}