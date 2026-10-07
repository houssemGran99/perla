# PERLA — Sacs en perles

Responsive site for PERLA, a Tunisian brand of handmade pearl bags. Built with Next.js (App Router) and Three.js.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Structure

- `app/` — layout (fonts, metadata), page, global styles
- `components/PearlBag3D.tsx` — interactive 3D pearl bag in "Personnalisé": assembles pearl by pearl on first view, drag to spin, colour changes ripple down the bag
- `components/FloatingPearls.tsx` — drifting 3D pearls behind the hero: pointer parallax, pearls dodge the cursor, clicks send a shockwave
- `components/PearlStrand3D.tsx` — 3D pearl strands: dividers that swing with scroll speed and can be plucked, and a strand in "Commander" that threads itself as you scroll
- `lib/burst.ts` — short pearl bursts (colour swatches, "Copier le numéro")
- `components/Header.tsx` — sticky header with a mobile menu
- `lib/data.ts` — models, colours and contact links; edit here to update the collection
- `lib/three-pearl.ts` — shared renderer, nacre material and a render loop that pauses off-screen

3D scenes load client-side only, respect `prefers-reduced-motion`, and fall back to a photo when WebGL is unavailable.
