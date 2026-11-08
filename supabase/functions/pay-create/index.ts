import { corsHeaders, db, env, HttpError, json, priceOrder, randHex } from "../_shared/common.ts";
import { bkashCreate } from "../_shared/bkash.ts";
import { nagadCreate } from "../_shared/nagad.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const sb = db();

    // 1) Who is paying? (validated against Supabase Auth, not trusted from the body)
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u?.user) throw new HttpError(401, "Please sign in to pay online.");
    const uid = u.user.id;

    const body = await req.json().catch(() => ({}));
    const provider = body.provider === "bkash" || body.provider === "nagad" ? body.provider : null;
    if (!provider) throw new HttpError(400, "Unknown payment method.");

    // 2) Basic abuse limit: max 10 payment attempts per user per 10 minutes
    const since = new Date(Date.now() - 10 * 60e3).toISOString();
    const { count } = await sb.from("payments").select("id", { count: "exact", head: true }).eq("user_id", uid).gte("created_at", since);
    if ((count || 0) >= 10) throw new HttpError(429, "Too many attempts. Please wait a few minutes.");

    // 3) Price the cart on the server and create the order (hidden from everyone until paid)
    const { lines, total, address } = await priceOrder(sb, body.items, body.promo, body.address);
    let order: any = null;
    for (let i = 0; i < 5 && !order; i++) {
      const order_no = "MSD" + (10000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 89999));
      const r = await sb.from("orders").insert({
        order_no, user_id: uid, items: lines, total, address,
        payment: provider === "bkash" ? "bKash" : "Nagad", status: 0, payment_status: "pending",
      }).select().single();
      if (!r.error) order = r.data; else if (r.error.code !== "23505") throw r.error;
    }
    if (!order) throw new Error("Could not allocate order number");

    const { data: pay, error: pe } = await sb.from("payments")
      .insert({ order_id: order.id, user_id: uid, provider, amount: total }).select().single();
    if (pe) throw pe;

    // 4) Ask the gateway for a payment page
    const callbackURL = `${env("SUPABASE_URL")}/functions/v1/pay-callback?pid=${pay.id}`;
    try {
      let url: string, ref: string, providerOrder: string | null = null;
      if (provider === "bkash") {
        const r = await bkashCreate({ amount: total, invoice: order.order_no, callbackURL, payer: address.phone.replace(/\D/g, "") });
        url = r.url; ref = r.paymentID;
      } else {
        providerOrder = order.order_no + randHex(3);
        const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "127.0.0.1";
        const r = await nagadCreate({ orderId: providerOrder, amount: total, callbackURL, ip, invoice: order.order_no });
        url = r.url; ref = r.ref;
      }
      await sb.from("payments").update({ provider_ref: ref, provider_order_id: providerOrder }).eq("id", pay.id);
      return json(req, 200, { url });
    } catch (e) {
      console.error("gateway init failed", provider, (e as Error).message);
      await sb.from("payments").update({ status: "failed" }).eq("id", pay.id);
      await sb.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
      throw new HttpError(502, "Payment provider is unavailable right now. Please try again or choose Cash on Delivery.");
    }
  } catch (e) {
    if (e instanceof HttpError) return json(req, e.status, { error: e.message });
    console.error("pay-create error", (e as Error).message);
    return json(req, 500, { error: "Something went wrong. Please try again." });
  }
});
