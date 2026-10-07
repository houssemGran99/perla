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
