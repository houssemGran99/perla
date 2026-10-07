import { NextResponse } from "next/server";
import { orderText, validateOrder, type Order } from "@/lib/order";

export const runtime = "nodejs";

// Best-effort flood protection (per server instance): 5 orders per IP per 10 minutes.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

function makeRef() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "P-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!res.ok) throw new Error(`Telegram ${res.status}`);
  return true;
}

async function sendEmail(to: string, subject: string, text: string, replyTo?: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM;
  if (!key || !from) return null;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
  return true;
}

/** Sends the order to every configured channel. Returns how many delivered, and how many were configured. */
async function notifyShop(order: Order, ref: string) {
  const text = orderText(order, ref);
  const shopEmail = process.env.ORDER_EMAIL_TO;
  const results = await Promise.allSettled([
    sendTelegram(text),
    shopEmail
      ? sendEmail(shopEmail, `Nouvelle commande ${ref} — ${order.customer.name}`, text, order.customer.email ?? undefined)
      : Promise.resolve(null),
  ]);
  let configured = 0;
  let delivered = 0;
  for (const r of results) {
    if (r.status === "rejected") {
      configured++;
      console.error("[orders] notification failed:", r.reason);
    } else if (r.value) {
      configured++;
      delivered++;
    }
  }
  return { configured, delivered };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Honeypot: real visitors never fill the hidden "website" field.
  if (body && typeof body === "object" && (body as { website?: string }).website) {
    return NextResponse.json({ ok: true, ref: makeRef() });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const result = validateOrder(body);
  if (!result.ok) {
    return NextResponse.json({ error: "invalid", fields: result.errors }, { status: 422 });
  }

  const { order } = result;
  const ref = makeRef();
  const { configured, delivered } = await notifyShop(order, ref);

  if (delivered === 0) {
    if (configured === 0 && process.env.NODE_ENV !== "production") {
      // Local development without any channel set up: show the order in the terminal.
      console.info(`[orders] (dev, no channel configured)\n${orderText(order, ref)}`);
      return NextResponse.json({ ok: true, ref });
    }
    // Nothing reached the shop: let the visitor send it themselves instead of losing it.
    return NextResponse.json({ error: configured ? "delivery_failed" : "not_configured" }, { status: 503 });
  }

  // Optional confirmation to the customer; never fails the order. Awaited so serverless
  // platforms don't freeze the function before it is sent.
  if (order.customer.email) {
    await sendEmail(
      order.customer.email,
      `PERLA — votre commande ${ref}`,
      `Merci ${order.customer.name} !\n\nNous avons bien reçu votre commande. Nous vous appelons au ${order.customer.phone} pour confirmer le prix et la livraison.\n\n${orderText(order, ref)}`,
    ).catch((e) => console.error("[orders] confirmation e-mail failed:", e));
  }

  return NextResponse.json({ ok: true, ref });
}
