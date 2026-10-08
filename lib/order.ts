import { CUSTOM_PRICE, MODELS, PEARL_COLORS } from "./data";

/** What the browser sends for each cart line. Names and prices are re-derived on the server. */
export type OrderItemInput =
  | { type: "model"; id: string; qty: number }
  | { type: "custom"; color: string; plate?: string; qty: number };

export type CustomerInput = {
  name: string;
  phone: string;
  email?: string;
  governorate: string;
  address: string;
  note?: string;
};

export type OrderInput = { customer: CustomerInput; items: OrderItemInput[]; website?: string };

export type OrderLine = { label: string; detail: string; qty: number; price: number | null };

export type Order = {
  customer: Required<Omit<CustomerInput, "email" | "note">> & { email: string | null; note: string | null };
  lines: OrderLine[];
  total: number | null;
};

export type FieldErrors = Partial<Record<keyof CustomerInput | "items", string>>;

export const GOVERNORATES = [
  "Ariana",
  "Béja",
  "Ben Arous",
  "Bizerte",
  "Gabès",
  "Gafsa",
  "Jendouba",
  "Kairouan",
  "Kasserine",
  "Kébili",
  "Le Kef",
  "Mahdia",
  "La Manouba",
  "Médenine",
  "Monastir",
  "Nabeul",
  "Sfax",
  "Sidi Bouzid",
  "Siliana",
  "Sousse",
  "Tataouine",
  "Tozeur",
  "Tunis",
  "Zaghouan",
];

export const MAX_QTY = 10;
export const MAX_LINES = 20;
export const PLATE_MAX = 12;

/**
 * Tunisian numbers are 8 digits (mobile 2x/4x/5x/9x, landline 3x/7x), optionally
 * written with +216 / 00216. Returns the number as "+216 XX XXX XXX", or null if invalid.
 */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/[\s.\-()]/g, "");
  if (d.startsWith("+216")) d = d.slice(4);
  else if (d.startsWith("00216")) d = d.slice(5);
  else if (d.length === 11 && d.startsWith("216")) d = d.slice(3);
  if (!/^[2-9]\d{7}$/.test(d)) return null;
  return `+216 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function cleanPlate(input: string | undefined) {
  return (input ?? "")
    .replace(/[^\p{L}\p{N} '\-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PLATE_MAX);
}

export function describeItem(item: OrderItemInput): OrderLine | null {
  const qty = Math.floor(Number(item.qty));
  if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY) return null;
  if (item.type === "model") {
    const m = MODELS.find((x) => x.id === item.id);
    return m ? { label: `Sac ${m.name}`, detail: m.detail, qty, price: m.price } : null;
  }
  if (item.type === "custom") {
    const c = PEARL_COLORS.find((x) => x.id === item.color);
    if (!c) return null;
    const plate = cleanPlate(item.plate);
    return {
      label: `Sac personnalisé ${c.label}`,
      detail: plate ? `Plaque : « ${plate} »` : "Plaque PERLA",
      qty,
      price: CUSTOM_PRICE,
    };
  }
  return null;
}

export function orderTotal(lines: OrderLine[]): number | null {
  let total = 0;
  for (const l of lines) {
    if (l.price === null) return null;
    total += l.price * l.qty;
  }
  return total;
}

/** Field-level checks, shared by the form (instant feedback) and the API (source of truth). */
export function validateCustomer(c: Partial<CustomerInput>): FieldErrors {
  const errors: FieldErrors = {};
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = str(c.name);
  if (name.length < 2) errors.name = "Indiquez votre nom et prénom.";
  else if (name.length > 80) errors.name = "Nom trop long.";
  if (!str(c.phone)) errors.phone = "Le numéro de téléphone est obligatoire.";
  else if (!normalizePhone(str(c.phone))) errors.phone = "Numéro tunisien à 8 chiffres, par ex. 50 994 459.";
  const email = str(c.email);
  if (email && (!EMAIL_RE.test(email) || email.length > 120)) errors.email = "Adresse e-mail invalide.";
  if (!GOVERNORATES.includes(str(c.governorate))) errors.governorate = "Choisissez votre gouvernorat.";
  const address = str(c.address);
  if (address.length < 5) errors.address = "Indiquez votre adresse de livraison.";
  else if (address.length > 300) errors.address = "Adresse trop longue.";
  if (str(c.note).length > 500) errors.note = "Note trop longue (500 caractères max).";
  return errors;
}

export function validateOrder(
  input: unknown,
): { ok: true; order: Order } | { ok: false; errors: FieldErrors } {
  const body = (input ?? {}) as Partial<OrderInput>;
  const c = (body.customer ?? {}) as Partial<CustomerInput>;
  const errors = validateCustomer(c);

  const items = Array.isArray(body.items) ? body.items.slice(0, MAX_LINES + 1) : [];
  const lines = items.map(describeItem);
  if (!items.length) errors.items = "Votre panier est vide.";
  else if (items.length > MAX_LINES || lines.some((l) => l === null)) errors.items = "Panier invalide, veuillez le vérifier.";

  if (Object.keys(errors).length) return { ok: false, errors };

  const okLines = lines as OrderLine[];
  return {
    ok: true,
    order: {
      customer: {
        name: c.name!.trim(),
        phone: normalizePhone(c.phone!)!,
        email: c.email?.trim() || null,
        governorate: c.governorate!.trim(),
        address: c.address!.trim(),
        note: c.note?.trim() || null,
      },
      lines: okLines,
      total: orderTotal(okLines),
    },
  };
}

/** Plain-text summary used for the shop notification, the confirmation e-mail and the fallback. */
export function orderText(order: Order, ref?: string) {
  const { customer: c } = order;
  const rows = order.lines.map(
    (l) => `• ${l.qty} × ${l.label} (${l.detail})${l.price !== null ? ` — ${l.price * l.qty} DT` : ""}`,
  );
  return [
    ref ? `Commande PERLA ${ref}` : "Commande PERLA",
    "",
    ...rows,
    "",
    `Total : ${order.total !== null ? `${order.total} DT + livraison` : "prix à confirmer"}`,
    "Paiement à la livraison",
    "",
    `Nom : ${c.name}`,
    `Téléphone : ${c.phone}`,
    ...(c.email ? [`E-mail : ${c.email}`] : []),
    `Adresse : ${c.address}, ${c.governorate}`,
    ...(c.note ? ["", `Note : ${c.note}`] : []),
  ].join("\n");
}

const esc = (v: string) =>
  v.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

/** E-mail version of the order (inline styles only, as mail clients require). */
export function orderHtml(order: Order, ref: string, intro?: string) {
  const { customer: c } = order;
  const tel = c.phone.replace(/\s/g, "");
  const rows = order.lines
    .map(
      (l) => `<tr>
  <td style="padding:10px 0;border-bottom:1px solid #e8e4ec"><strong>${l.qty} × ${esc(l.label)}</strong><br><span style="color:#6a5f72">${esc(l.detail)}</span></td>
  <td style="padding:10px 0;border-bottom:1px solid #e8e4ec;text-align:right;white-space:nowrap">${l.price !== null ? `${l.price * l.qty} DT` : "Sur demande"}</td>
</tr>`,
    )
    .join("");
  const info: [string, string][] = [
    ["Nom", esc(c.name)],
    ["Téléphone", `<a href="tel:${tel}" style="color:#5a2f52">${esc(c.phone)}</a>`],
    ...(c.email ? ([["E-mail", `<a href="mailto:${esc(c.email)}" style="color:#5a2f52">${esc(c.email)}</a>`]] as [string, string][]) : []),
    ["Adresse", `${esc(c.address)}, ${esc(c.governorate)}`],
    ...(c.note ? ([["Note", esc(c.note)]] as [string, string][]) : []),
  ];
  return `<!doctype html><html><body style="margin:0;background:#f2f0f4;font-family:Helvetica,Arial,sans-serif;color:#231a2a">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
  <p style="font-family:Georgia,serif;font-size:26px;letter-spacing:6px;margin:0 0 4px">PERLA</p>
  <p style="color:#86621f;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px">Commande ${esc(ref)}</p>
  ${intro ? `<p style="margin:0 0 18px;line-height:1.5">${esc(intro)}</p>` : ""}
  <div style="background:#fff;border-radius:12px;padding:18px 20px">
    <table style="width:100%;border-collapse:collapse;font-size:15px">${rows}
      <tr><td style="padding-top:12px"><strong>Total</strong></td><td style="padding-top:12px;text-align:right"><strong>${
        order.total !== null ? `${order.total} DT + livraison` : "Prix à confirmer"
      }</strong></td></tr>
    </table>
    <p style="margin:10px 0 0;color:#6a5f72;font-size:13px">Paiement à la livraison</p>
  </div>
  <div style="background:#fff;border-radius:12px;padding:18px 20px;margin-top:14px">
    <table style="width:100%;border-collapse:collapse;font-size:15px">${info
      .map(
        ([k, v]) =>
          `<tr><td style="padding:5px 12px 5px 0;color:#6a5f72;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:5px 0">${v}</td></tr>`,
      )
      .join("")}</table>
  </div>
</div></body></html>`;
}
