# PERLA — Sacs en perles

Responsive site for PERLA, a Tunisian brand of handmade pearl bags. Built with Next.js (App Router) and Three.js.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Online orders

Visitors add bags (or a custom colour with a name on the plate) to the cart and check out with
**name, phone (required, Tunisian 8-digit), optional e-mail, governorate and address**.
Payment is cash on delivery; prices marked "sur demande" are confirmed by phone.

Every new order is **e-mailed to houssemgran1990@gmail.com** (`SHOP_ORDER_EMAIL` in `lib/data.ts`)
through [Resend](https://resend.com). Setup:

1. Create a free Resend account using houssemgran1990@gmail.com and create an API key.
2. Set `RESEND_API_KEY` (Vercel → Settings → Environment Variables, or `.env.local`), then redeploy.

That's all: without a domain, mail goes out from Resend's test sender `onboarding@resend.dev`, which can
deliver to the account owner's inbox. Optional extras (see `.env.example`):

- `ORDER_EMAIL_FROM` — a sender on your own verified domain; also turns on confirmation e-mails to
  customers who leave an address.
- `ORDER_EMAIL_TO` — send orders to a different inbox.
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` — an instant Telegram message as well.

If no channel is configured in production, checkout shows the order as a ready-to-send message
(copy → Instagram DM or call) so nothing is lost. In `npm run dev` orders are printed to the terminal.

To set prices, fill in `price` for each model (and `CUSTOM_PRICE`) in `lib/data.ts`; the cart then shows totals.

## Structure

- `app/` — layout (fonts, metadata), page, global styles
- `components/PearlBag3D.tsx` — interactive 3D pearl bag in "Personnalisé": assembles pearl by pearl on first view, drag to spin, colour changes ripple down the bag
- `components/FloatingPearls.tsx` — drifting 3D pearls behind the hero: pointer parallax, pearls dodge the cursor, clicks send a shockwave
- `components/PearlStrand3D.tsx` — 3D pearl strands: dividers that swing with scroll speed and can be plucked, and a strand in "Commander" that threads itself as you scroll
- `lib/burst.ts` — short pearl bursts (colour swatches, "Copier le numéro")
- `components/Header.tsx` — sticky header with a mobile menu
- `lib/data.ts` — models, prices, colours and contact links; edit here to update the collection
- `lib/order.ts` — order validation shared by the checkout form and the API
- `components/shop/` — cart state (saved in the browser), cart drawer and checkout
- `lib/three-pearl.ts` — shared renderer, nacre material and a render loop that pauses off-screen

3D scenes load client-side only, respect `prefers-reduced-motion`, and fall back to a photo when WebGL is unavailable.
