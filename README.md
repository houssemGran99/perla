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

Orders are sent by `app/api/orders` to the channels configured in environment variables
(copy `.env.example` to `.env.local`, or set them in Vercel → Settings → Environment Variables):

- **Telegram** (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) — instant notification on the shop's phone.
- **E-mail via Resend** (`RESEND_API_KEY`, `ORDER_EMAIL_FROM`, `ORDER_EMAIL_TO`) — customers who give
  an e-mail also get a confirmation.

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
