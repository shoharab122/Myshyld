import forge from "npm:node-forge@1.3.1";
import { env, fetchJson, randHex } from "./common.ts";

// Nagad Merchant API (v-0.2.0). RSA-PKCS1 encryption + SHA256withRSA signing, done with node-forge.
// Sandbox: http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs   Live: https://api.mynagad.com/api/dfs
const base = () => env("NAGAD_BASE_URL").replace(/\/+$/, "");
const wrap = (k: string, label: string) =>
  k.includes("BEGIN") ? k.replace(/\\n/g, "\n") : `-----BEGIN ${label}-----\n${k.replace(/\s+/g, "").match(/.{1,64}/g)!.join("\n")}\n-----END ${label}-----`;
const pubKey = () => forge.pki.publicKeyFromPem(wrap(env("NAGAD_PG_PUBLIC_KEY"), "PUBLIC KEY"));
const privKey = () => {
  const k = env("NAGAD_MERCHANT_PRIVATE_KEY");
  try { return forge.pki.privateKeyFromPem(wrap(k, "PRIVATE KEY")); }
  catch { return forge.pki.privateKeyFromPem(wrap(k, "RSA PRIVATE KEY")); }
};
const encrypt = (o: unknown) => forge.util.encode64(pubKey().encrypt(JSON.stringify(o), "RSAES-PKCS1-V1_5"));
const decrypt = (b64: string) => JSON.parse(privKey().decrypt(forge.util.decode64(b64), "RSAES-PKCS1-V1_5"));
function sign(o: unknown) {
  const md = forge.md.sha256.create();
  md.update(JSON.stringify(o), "utf8");
  return forge.util.encode64(privKey().sign(md));
}
const stamp = () => new Date(Date.now() + 6 * 3600e3).toISOString().replace(/\D/g, "").slice(0, 14); // yyyyMMddHHmmss, Dhaka time
const headers = (ip: string) => ({
  "Content-Type": "application/json", Accept: "application/json",
  "X-KM-Api-Version": "v-0.2.0", "X-KM-IP-V4": ip, "X-KM-Client-Type": "PC_WEB",
});

export async function nagadCreate(o: { orderId: string; amount: number; callbackURL: string; ip: string; invoice: string }) {
  const merchantId = env("NAGAD_MERCHANT_ID"), dateTime = stamp();
  const sd = { merchantId, datetime: dateTime, orderId: o.orderId, challenge: randHex(20) };
  const init = await fetchJson(`${base()}/check-out/initialize/${merchantId}/${o.orderId}`, {
    method: "POST", headers: headers(o.ip),
    body: JSON.stringify({ dateTime, sensitiveData: encrypt(sd), signature: sign(sd) }),
  });
  if (!init?.sensitiveData) throw new Error(`Nagad init failed: ${init?.reason || init?.message || "no data"}`);
  const dec = decrypt(init.sensitiveData);
  if (!dec?.paymentReferenceId || !dec?.challenge) throw new Error("Nagad init: bad response");

  const complete = { merchantId, orderId: o.orderId, currencyCode: "050", amount: o.amount.toFixed(2), challenge: dec.challenge };
  const done = await fetchJson(`${base()}/check-out/complete/${dec.paymentReferenceId}`, {
    method: "POST", headers: headers(o.ip),
    body: JSON.stringify({
      sensitiveData: encrypt(complete), signature: sign(complete),
      merchantCallbackURL: o.callbackURL, additionalMerchantInfo: { invoice: o.invoice, source: "myshield" },
    }),
  });
  if (done?.status !== "Success" || !done?.callBackUrl) throw new Error(`Nagad complete failed: ${done?.reason || done?.message || done?.status}`);
  return { url: done.callBackUrl as string, ref: dec.paymentReferenceId as string };
}

export const nagadVerify = (ref: string, ip = "127.0.0.1") =>
  fetchJson(`${base()}/verify/payment/${encodeURIComponent(ref)}`, { method: "GET", headers: headers(ip) });

export function nagadOk(d: any, orderId: string, amount: number) {
  return d?.status === "Success" && d?.orderId === orderId && Math.abs(Number(d?.amount) - amount) < 0.005;
}
