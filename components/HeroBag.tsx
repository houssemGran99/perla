"use client";

import dynamic from "next/dynamic";
import { BagSwatches, useBagColor } from "./BagColor";

const PearlBag3D = dynamic(() => import("./PearlBag3D"), {
  ssr: false,
  loading: () => <div className="bag3d loading" aria-hidden="true" />,
});

/** The customisable 3D bag, front and centre in the hero. */
export default function HeroBag() {
  const { color } = useBagColor();
  return (
    <div className="stage hero-stage">
      <PearlBag3D color={color.base} label={color.label} />
      <BagSwatches />
      <a className="hint" href="#personnalise">
        Sac personnalisé · {color.label} · ajoutez votre prénom ↓
      </a>
    </div>
  );
}
