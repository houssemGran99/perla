"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { INSTAGRAM_DM, MODELS, PEARL_COLORS, PHONE_DISPLAY, PHONE_RAW, formatPrice } from "@/lib/data";
import {
  GOVERNORATES,
  MAX_QTY,
  describeItem,
  normalizePhone,
  orderText,
  orderTotal,
  validateCustomer,
  type CustomerInput,
  type FieldErrors,
  type OrderLine,
} from "@/lib/order";
import { useCart, type CartLine } from "./CartProvider";

type Step = "cart" | "checkout" | "done" | "fallback";

const EMPTY: CustomerInput = { name: "", phone: "", email: "", governorate: "", address: "", note: "" };
const FORM_KEY = "perla-checkout-v1";

function thumbFor(line: CartLine) {
  if (line.type === "model") return { src: MODELS.find((m) => m.id === line.id)?.image, color: undefined };
  const c = PEARL_COLORS.find((x) => x.id === line.color);
  return { src: undefined, color: c ? `radial-gradient(circle at 35% 30%, #fff, ${c.base} 45%, ${c.shade})` : undefined };
}

export default function CartDrawer() {
  const cart = useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>("cart");
  const [form, setForm] = useState<CustomerInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof CustomerInput, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [fallbackText, setFallbackText] = useState("");
  const [copied, setCopied] = useState(false);

  // Remember what the visitor typed (handy if they close the drawer); never sent anywhere until submit.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(FORM_KEY);
      if (saved) setForm({ ...EMPTY, ...JSON.parse(saved) });
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(FORM_KEY, JSON.stringify(form));
    } catch {}
  }, [form]);

  // Open / close the native modal dialog (focus trap, Esc and inert background for free).
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (cart.isOpen && !d.open) {
      d.showModal();
      document.documentElement.classList.add("no-scroll");
    } else if (!cart.isOpen && d.open) {
      d.close();
    }
  }, [cart.isOpen]);

  const lines = useMemo(
    () => cart.lines.map((l) => ({ line: l, info: describeItem(l) })).filter((x): x is { line: CartLine; info: OrderLine } => !!x.info),
    [cart.lines],
  );
  const total = orderTotal(lines.map((x) => x.info));

  function onClose() {
    document.documentElement.classList.remove("no-scroll");
    cart.close();
    // After a finished order, the next opening starts fresh.
    if (step === "done" || step === "fallback") setStep("cart");
  }

  function update<K extends keyof CustomerInput>(key: K, value: string) {
    const next = { ...form, [key]: value };
    setForm(next);
    if (touched[key]) setErrors(validateCustomer(next));
  }
  const blur = (key: keyof CustomerInput) => () => {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors(validateCustomer(form));
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const errs = validateCustomer(form);
    setErrors(errs);
    setTouched({ name: true, phone: true, email: true, governorate: true, address: true, note: true });
    if (Object.keys(errs).length) {
      const first = e.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(errs)[0]}"]`);
      first?.focus();
      return;
    }
    setSubmitting(true);
    setServerError(null);
    const items = cart.lines.map(({ key: _key, ...item }) => item);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: form, items, website: fd.get("website") ?? "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setRef(data.ref);
        setStep("done");
        cart.clear();
        try {
          sessionStorage.removeItem(FORM_KEY);
        } catch {}
        setForm(EMPTY);
        setTouched({});
        const box = dialogRef.current?.querySelector(".drawer-body");
        if (box) import("@/lib/burst").then(({ burstFrom }) => burstFrom(box, { count: 40 }));
      } else if (res.status === 422 && data.fields) {
        setErrors(data.fields);
        setServerError(data.fields.items ?? "Merci de vérifier les champs indiqués.");
      } else if (res.status === 429) {
        setServerError("Trop de commandes envoyées. Réessayez dans quelques minutes ou appelez-nous.");
      } else {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
    } catch {
      // The order couldn't reach the shop: hand the visitor a ready-to-send message instead.
      const order = {
        customer: {
          ...form,
          phone: normalizePhone(form.phone) ?? form.phone,
          email: form.email || null,
          note: form.note || null,
        },
        lines: lines.map((x) => x.info),
        total,
      };
      setFallbackText(orderText(order));
      setStep("fallback");
    } finally {
      setSubmitting(false);
    }
  }

  const showErr = (k: keyof CustomerInput) => (touched[k] && errors[k] ? errors[k] : undefined);

  return (
    <dialog
      ref={dialogRef}
      className="drawer"
      aria-labelledby="drawer-title"
      onClose={onClose}
      onClick={(e) => {
        // Click on the backdrop closes the drawer.
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      <div className="drawer-panel">
        <header className="drawer-head">
          {step === "checkout" ? (
            <button type="button" className="link-btn" onClick={() => setStep("cart")}>
              ← Panier
            </button>
          ) : (
            <span className="label">Boutique</span>
          )}
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={() => dialogRef.current?.close()}>
            ×
          </button>
        </header>

        <div className="drawer-body">
          {step === "cart" && (
            <>
              <h2 id="drawer-title">Votre panier</h2>
              {lines.length === 0 ? (
                <div className="empty">
                  <p className="muted">Votre panier est vide.</p>
                  <a className="btn ghost" href="#modeles" onClick={() => dialogRef.current?.close()}>
                    Voir les modèles
                  </a>
                </div>
              ) : (
                <>
                  <ul className="cart-lines">
                    {lines.map(({ line, info }) => {
                      const thumb = thumbFor(line);
                      return (
                        <li key={line.key}>
                          <span className="thumb" style={thumb.color ? { background: thumb.color } : undefined}>
                            {thumb.src && <img src={thumb.src} alt="" width={64} height={85} />}
                          </span>
                          <div className="line-info">
                            <strong>{info.label}</strong>
                            <span className="muted">{info.detail}</span>
                            <span className="price">{formatPrice(info.price)}</span>
                          </div>
                          <div className="line-actions">
                            <div className="qty" role="group" aria-label={`Quantité, ${info.label}`}>
                              <button
                                type="button"
                                aria-label="Retirer un"
                                disabled={line.qty <= 1}
                                onClick={() => cart.setQty(line.key, line.qty - 1)}
                              >
                                −
                              </button>
                              <span aria-live="polite">{line.qty}</span>
                              <button
                                type="button"
                                aria-label="Ajouter un"
                                disabled={line.qty >= MAX_QTY}
                                onClick={() => cart.setQty(line.key, line.qty + 1)}
                              >
                                +
                              </button>
                            </div>
                            <button type="button" className="link-btn small" onClick={() => cart.remove(line.key)}>
                              Supprimer
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <dl className="summary">
                    <dt>Total</dt>
                    <dd>{total !== null ? `${total} DT` : "Prix confirmé par téléphone"}</dd>
                    <dt>Livraison</dt>
                    <dd>À domicile, toute la Tunisie</dd>
                    <dt>Paiement</dt>
                    <dd>À la livraison</dd>
                  </dl>
                </>
              )}
            </>
          )}

          {step === "checkout" && (
            <form id="checkout" noValidate onSubmit={submit} className="checkout">
              <h2 id="drawer-title">Vos coordonnées</h2>
              <p className="muted small">
                Nous vous appelons pour confirmer la commande, le prix et la livraison. Paiement à la livraison.
              </p>

              <Field label="Nom et prénom" required error={showErr("name")} id="f-name">
                <input
                  id="f-name"
                  name="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  onBlur={blur("name")}
                  required
                  maxLength={80}
                />
              </Field>

              <Field
                label="Téléphone"
                required
                error={showErr("phone")}
                id="f-phone"
                hint="Numéro tunisien à 8 chiffres."
              >
                <div className="phone-input">
                  <span aria-hidden="true">+216</span>
                  <input
                    id="f-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="50 994 459"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    onBlur={blur("phone")}
                    required
                    maxLength={20}
                  />
                </div>
              </Field>

              <Field label="E-mail" optional error={showErr("email")} id="f-email" hint="Pour recevoir une confirmation.">
                <input
                  id="f-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  onBlur={blur("email")}
                  maxLength={120}
                />
              </Field>

              <Field label="Gouvernorat" required error={showErr("governorate")} id="f-gov">
                <select
                  id="f-gov"
                  name="governorate"
                  autoComplete="address-level1"
                  value={form.governorate}
                  onChange={(e) => {
                    update("governorate", e.target.value);
                    setTouched((t) => ({ ...t, governorate: true }));
                  }}
                  onBlur={blur("governorate")}
                  required
                >
                  <option value="" disabled>
                    Choisir…
                  </option>
                  {GOVERNORATES.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </Field>

              <Field label="Adresse de livraison" required error={showErr("address")} id="f-address">
                <textarea
                  id="f-address"
                  name="address"
                  autoComplete="street-address"
                  rows={2}
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  onBlur={blur("address")}
                  required
                  maxLength={300}
                />
              </Field>

              <Field label="Note" optional error={showErr("note")} id="f-note">
                <textarea
                  id="f-note"
                  name="note"
                  rows={2}
                  placeholder="Une précision sur la commande ou la livraison ?"
                  value={form.note}
                  onChange={(e) => update("note", e.target.value)}
                  onBlur={blur("note")}
                  maxLength={500}
                />
              </Field>

              {/* Honeypot for bots: hidden from people and assistive tech. */}
              <div className="hp" aria-hidden="true">
                <label>
                  Site web
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>

              {serverError && (
                <p className="form-error" role="alert">
                  {serverError}
                </p>
              )}
            </form>
          )}

          {step === "done" && (
            <div className="done" role="status">
              <h2 id="drawer-title">
                Merci <em>!</em>
              </h2>
              <p>
                Votre commande <strong>{ref}</strong> est bien reçue.
              </p>
              <p className="muted">
                Nous vous appelons très vite pour confirmer le prix et la livraison. Paiement à la livraison.
              </p>
              <button type="button" className="btn" onClick={() => dialogRef.current?.close()}>
                Continuer
              </button>
            </div>
          )}

          {step === "fallback" && (
            <div className="done">
              <h2 id="drawer-title">Presque fini</h2>
              <p className="muted">
                La commande n’a pas pu être envoyée automatiquement. Envoyez-la-nous en un clic : copiez le message,
                puis collez-le sur Instagram, ou appelez le {PHONE_DISPLAY}.
              </p>
              <pre className="order-text">{fallbackText}</pre>
              <div className="cta">
                <button
                  type="button"
                  className="btn"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(fallbackText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    } catch {}
                  }}
                >
                  {copied ? "Message copié" : "Copier le message"}
                </button>
                <a className="btn ghost" href={INSTAGRAM_DM} target="_blank" rel="noopener">
                  Ouvrir Instagram
                </a>
                <a className="btn ghost" href={`tel:${PHONE_RAW}`}>
                  Appeler
                </a>
              </div>
            </div>
          )}
        </div>

        {step === "cart" && lines.length > 0 && (
          <footer className="drawer-foot">
            <button type="button" className="btn block" onClick={() => setStep("checkout")}>
              Commander
            </button>
          </footer>
        )}
        {step === "checkout" && (
          <footer className="drawer-foot">
            <button type="submit" form="checkout" className="btn block" disabled={submitting || !lines.length}>
              {submitting ? "Envoi…" : "Confirmer la commande"}
            </button>
            <p className="muted small center">Paiement à la livraison · aucun paiement en ligne</p>
          </footer>
        )}
      </div>
    </dialog>
  );
}

function Field({
  id,
  label,
  required,
  optional,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`field${error ? " invalid" : ""}`}>
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="req" aria-hidden="true">
            {" "}
            *
          </span>
        )}
        {optional && <span className="opt"> (optionnel)</span>}
      </label>
      {children}
      {error ? (
        <span className="field-msg error" id={`${id}-msg`} role="alert">
          {error}
        </span>
      ) : (
        hint && (
          <span className="field-msg" id={`${id}-msg`}>
            {hint}
          </span>
        )
      )}
    </div>
  );
}
