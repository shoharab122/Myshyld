import { createClient } from "npm:@supabase/supabase-js@2";

export class HttpError extends Error {
  constructor(public status: number, msg: string) { super(msg); }
}
export const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Missing secret: ${k}`);
  return v;
};
// Service-role client: bypasses RLS. Only ever used here, on the server.
export const db = () =>
  createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
export const siteUrl = () => env("SITE_URL").replace(/\/+$/, "");
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const same = (a: unknown, b: number) => Math.abs(Number(a) - b) < 0.005;
export const randHex = (bytes: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");

export function corsHeaders(req: Request) {
  const allowed = [Deno.env.get("SITE_URL"), ...(Deno.env.get("ALLOWED_ORIGINS") || "").split(",")]
    .map((s) => (s || "").trim().replace(/\/+$/, ""))
    .filter(Boolean);
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
export const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });

export async function fetchJson(url: string, init: RequestInit) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 300) }; }
  if (!res.ok && !data?.statusCode && !data?.reason) throw new Error(`Gateway HTTP ${res.status}`);
  return data;
}

const PROMOS: Record<string, number> = { SHIELD10: 0.1 };

// The ONLY source of truth for what a customer owes: prices come from the products table, never from the browser.
export async function priceOrder(sb: any, rawItems: any, promo: string, rawAddr: any) {
  if (!Array.isArray(rawItems) || !rawItems.length || rawItems.length > 50) throw new HttpError(400, "Your cart is empty.");
  const ids = [...new Set(rawItems.map((i: any) => String(i?.id)))];
  if (ids.some((id) => !UUID.test(id))) throw new HttpError(400, "Some items are not available for online payment.");
  const { data: prods, error } = await sb.from("products").select("id,name,price,variants,emoji,image_url,is_active").in("id", ids);
  if (error) throw error;
  const byId = new Map((prods || []).map((p: any) => [p.id, p]));

  const lines = rawItems.map((i: any) => {
    const p: any = byId.get(String(i.id));
    if (!p || p.is_active === false) throw new HttpError(400, "An item in your cart is no longer available.");
    const qty = Number(i.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new HttpError(400, "Invalid quantity.");
    let mult = 1;
    const label = i.variant ? String(i.variant) : undefined;
    if (label) {
      const v = (p.variants || []).find((x: any) => x.label === label);
      if (!v) throw new HttpError(400, "An item option is no longer available.");
      mult = Number(v.mult) || 1;
    }
    const price = round2(Number(p.price) * mult);
    return { key: p.id + (label || ""), id: p.id, name: p.name, emoji: p.emoji, image_url: p.image_url, variant: label, price, qty };
  });

  const subtotal = round2(lines.reduce((a: number, l: any) => a + l.price * l.qty, 0));
  const rate = PROMOS[String(promo || "").toUpperCase()] || 0;
  const discount = Math.round(subtotal * rate);
  const total = Math.max(0, round2(subtotal - discount));
  if (total <= 0) throw new HttpError(400, "Invalid order total.");

  const a = rawAddr || {};
  const address = {
    name: String(a.name || "").trim().slice(0, 80),
    phone: String(a.phone || "").trim().slice(0, 20),
    address: String(a.address || "").trim().slice(0, 300),
    note: String(a.note || "").trim().slice(0, 300),
  };
  if (!address.name || address.phone.replace(/\D/g, "").length < 10 || !address.address)
    throw new HttpError(400, "Please complete your delivery details.");
  return { lines, subtotal, total, address };
}

// Marks a payment + its order as paid exactly once (safe if the callback is hit twice).
export async function markPaid(sb: any, payment: any, trx: string) {
  const { data } = await sb.from("payments")
    .update({ status: "paid", provider_trx: trx, paid_at: new Date().toISOString() })
    .eq("id", payment.id).neq("status", "paid").select("id").maybeSingle();
  if (data) await sb.from("orders").update({ payment_status: "paid", payment_ref: trx }).eq("id", payment.order_id);
}
export async function markFailed(sb: any, payment: any, status: "failed" | "cancelled") {
  await sb.from("payments").update({ status }).eq("id", payment.id).eq("status", "initiated");
  await sb.from("orders").update({ payment_status: "failed" }).eq("id", payment.order_id).eq("payment_status", "pending");
}
