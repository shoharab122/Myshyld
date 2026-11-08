import { db, markFailed, markPaid, same, siteUrl, UUID } from "../_shared/common.ts";
import { bkashExecute, bkashOk, bkashQuery } from "../_shared/bkash.ts";
import { nagadOk, nagadVerify } from "../_shared/nagad.ts";

// The customer's browser lands here after bKash/Nagad. Nothing in the URL is trusted:
// we look the payment up by our own id, then ask the gateway server-to-server what really happened.
Deno.serve(async (req) => {
  const q = new URL(req.url).searchParams;
  let order_no = "";
  const back = (r: "success" | "failed" | "cancel") =>
    new Response(null, { status: 302, headers: { Location: `${siteUrl()}/?pay=${r}&order=${encodeURIComponent(order_no)}`, "Cache-Control": "no-store" } });
  try {
    const pid = q.get("pid") || "";
    if (!UUID.test(pid)) return back("failed");
    const sb = db();
    const { data: pay } = await sb.from("payments").select("*").eq("id", pid).maybeSingle();
    if (!pay) return back("failed");
    const { data: order } = await sb.from("orders").select("id,order_no,total,payment_status").eq("id", pay.order_id).single();
    order_no = order.order_no;
    if (pay.status === "paid") return back("success"); // already handled (refresh / double hit)
    if (pay.status !== "initiated" || !same(pay.amount, Number(order.total))) return back("failed");

    if (pay.provider === "bkash") {
      const paymentID = q.get("paymentID") || "";
      if (paymentID !== pay.provider_ref) { await markFailed(sb, pay, "failed"); return back("failed"); }
      const st = (q.get("status") || "").toLowerCase();
      if (st === "cancel") { await markFailed(sb, pay, "cancelled"); return back("cancel"); }
      if (st !== "success") { await markFailed(sb, pay, "failed"); return back("failed"); }

      let d = await bkashExecute(paymentID);
      if (!bkashOk(d, order.order_no, Number(order.total))) d = await bkashQuery(paymentID); // already executed? ask for the status
      if (bkashOk(d, order.order_no, Number(order.total))) { await markPaid(sb, pay, d.trxID); return back("success"); }
      await markFailed(sb, pay, "failed");
      return back("failed");
    }

    // Nagad
    const ref = q.get("payment_ref_id") || "";
    if (ref !== pay.provider_ref) { await markFailed(sb, pay, "failed"); return back("failed"); }
    const st = (q.get("status") || "").toLowerCase();
    if (st === "aborted" || st === "cancelled") { await markFailed(sb, pay, "cancelled"); return back("cancel"); }
    const d = await nagadVerify(ref);
    if (nagadOk(d, pay.provider_order_id, Number(order.total))) {
      await markPaid(sb, pay, String(d.issuerPaymentRefNo || d.paymentRefId || ref));
      return back("success");
    }
    await markFailed(sb, pay, "failed");
    return back("failed");
  } catch (e) {
    console.error("pay-callback error", (e as Error).message);
    return back("failed");
  }
});
