import { env, fetchJson } from "./common.ts";

// bKash Tokenized Checkout. Sandbox: https://tokenized.sandbox.bka.sh/v1.2.0-beta   Live: https://tokenized.pay.bka.sh/v1.2.0-beta
const base = () => env("BKASH_BASE_URL").replace(/\/+$/, "");
let cache: { tok: string; exp: number } | null = null;

async function token(): Promise<string> {
  if (cache && cache.exp > Date.now()) return cache.tok;
  const d = await fetchJson(`${base()}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", username: env("BKASH_USERNAME"), password: env("BKASH_PASSWORD") },
    body: JSON.stringify({ app_key: env("BKASH_APP_KEY"), app_secret: env("BKASH_APP_SECRET") }),
  });
  if (!d.id_token) throw new Error(`bKash token failed: ${d.statusCode || ""} ${d.statusMessage || ""}`);
  cache = { tok: d.id_token, exp: Date.now() + Math.max(60, (Number(d.expires_in) || 3600) - 300) * 1000 };
  return d.id_token;
}
async function call(path: string, body: unknown) {
  return fetchJson(`${base()}/tokenized/checkout/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: await token(), "X-APP-Key": env("BKASH_APP_KEY") },
    body: JSON.stringify(body),
  });
}

export async function bkashCreate(o: { amount: number; invoice: string; callbackURL: string; payer: string }) {
  const d = await call("create", {
    mode: "0011", payerReference: o.payer, callbackURL: o.callbackURL,
    amount: o.amount.toFixed(2), currency: "BDT", intent: "sale", merchantInvoiceNumber: o.invoice,
  });
  if (d.statusCode !== "0000" || !d.bkashURL || !d.paymentID) throw new Error(`bKash create failed: ${d.statusCode} ${d.statusMessage}`);
  return { url: d.bkashURL as string, paymentID: d.paymentID as string };
}
export const bkashExecute = (paymentID: string) => call("execute", { paymentID });
export const bkashQuery = (paymentID: string) => call("payment/status", { paymentID });

export function bkashOk(d: any, invoice: string, amount: number) {
  return d?.statusCode === "0000" && d?.transactionStatus === "Completed" && !!d?.trxID &&
    d?.merchantInvoiceNumber === invoice && Math.abs(Number(d?.amount) - amount) < 0.005 && (d?.currency || "BDT") === "BDT";
}
