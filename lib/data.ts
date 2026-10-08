export const INSTAGRAM = "https://www.instagram.com/perllaaa_7/";
export const INSTAGRAM_DM = "https://ig.me/m/perllaaa_7";
export const TIKTOK = "https://www.tiktok.com/@peeerlla";
export const CREATOR = "https://www.instagram.com/ryiihem/";
export const PHONE_DISPLAY = "+216 50 994 459";
export const PHONE_RAW = "+21650994459";
/** Inbox that receives every new online order (overridable with ORDER_EMAIL_TO). */
export const SHOP_ORDER_EMAIL = "houssemgran1990@gmail.com";

export type Model = {
  id: string;
  name: string;
  detail: string;
  image: string;
  /** Price in Tunisian dinars, or null while it is "sur demande". */
  price: number | null;
};

/** Temporary flat price for every bag, in Tunisian dinars. */
const PRICE = 100;

export const MODELS: Model[] = [
  { id: "noir", name: "Noir", detail: "Sac à rabat, anse en perles", image: "/img/02.jpg", price: PRICE },
  { id: "violet", name: "Violet", detail: "Sac à rabat, petit format", image: "/img/03.jpg", price: PRICE },
  { id: "fuchsia", name: "Fuchsia", detail: "Fermoir clip, anse métal", image: "/img/04.jpg", price: PRICE },
  { id: "rose", name: "Rose", detail: "Sac à rabat, chaîne dorée", image: "/img/05.jpg", price: PRICE },
  { id: "champagne", name: "Champagne", detail: "Sac à rabat, anse en perles", image: "/img/06.jpg", price: PRICE },
  { id: "corail", name: "Corail", detail: "Pochette, anse longue", image: "/img/07.jpg", price: PRICE },
  { id: "ivoire", name: "Ivoire", detail: "Fermoir clip, grosses perles", image: "/img/08.jpg", price: PRICE },
  { id: "blanc", name: "Blanc", detail: "Pochette bandoulière, plaque au prénom", image: "/img/09.jpg", price: PRICE },
  { id: "argent", name: "Argent", detail: "Sac à rabat, anse en perles", image: "/img/10.jpg", price: PRICE },
];

/** Price of the made-to-order bag from the customiser (null = sur demande). */
export const CUSTOM_PRICE: number | null = PRICE;

export function formatPrice(price: number | null) {
  return price === null ? "Prix sur demande" : `${price.toLocaleString("fr-TN")} DT`;
}

export type PearlColor = { id: string; label: string; base: string; shade: string };

/** Pearl colours offered in the customiser (base tint + shadow tone for the swatch). */
export const PEARL_COLORS: PearlColor[] = [
  { id: "blanc", label: "Blanc", base: "#f3eef3", shade: "#a79bb0" },
  { id: "dore", label: "Doré", base: "#e6cf9c", shade: "#8d6f35" },
  { id: "rose", label: "Rose", base: "#f0b9c2", shade: "#a8697a" },
  { id: "fuchsia", label: "Fuchsia", base: "#e0389a", shade: "#7c0f50" },
  { id: "violet", label: "Violet", base: "#7d5bd0", shade: "#382070" },
  { id: "argent", label: "Argent", base: "#b9bcc4", shade: "#54575f" },
  { id: "noir", label: "Noir", base: "#3a3540", shade: "#0e0c11" },
];
