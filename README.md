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
- `components/PearlBag3D.tsx` — interactive 3D pearl bag (drag to spin, colour swatches) in the "Personnalisé" section
- `components/FloatingPearls.tsx` — drifting 3D pearls behind the hero, with pointer parallax
- `components/Header.tsx` — sticky header with a mobile menu
- `lib/data.ts` — models, colours and contact links; edit here to update the collection
- `lib/three-pearl.ts` — shared renderer, nacre material and a render loop that pauses off-screen

3D scenes load client-side only, respect `prefers-reduced-motion`, and fall back to a photo when WebGL is unavailable.
