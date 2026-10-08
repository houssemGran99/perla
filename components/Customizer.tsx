"use client";

import dynamic from "next/dynamic";
import { CUSTOM_PRICE, INSTAGRAM_DM, formatPrice } from "@/lib/data";
import { PLATE_MAX } from "@/lib/order";
import { BagSwatches, useBagColor } from "./BagColor";
import AddToCart from "./shop/AddToCart";

const PearlBag3D = dynamic(() => import("./PearlBag3D"), {
  ssr: false,
  loading: () => <div className="bag3d loading" aria-hidden="true" />,
});

export default function Customizer() {
  const { color, plate, setPlate } = useBagColor();

  return (
    <section id="personnalise">
      <div className="wrap split">
        <div className="reveal">
          <span className="label">Sac personnalisé</span>
          <h2>
            Votre couleur, <em>votre prénom.</em>
          </h2>
          <p className="muted">
            Vous avez une couleur en tête ? Essayez-la sur le sac, puis envoyez-nous votre choix. La plaque dorée peut
            porter votre prénom à la place de PERLA.
          </p>
          <p className="chosen">
            Couleur choisie : <strong>{color.label}</strong> · {formatPrice(CUSTOM_PRICE)}
          </p>
          <div className="field plate-field">
            <label htmlFor="plate">
              Prénom sur la plaque <span className="opt">(optionnel)</span>
            </label>
            <input
              id="plate"
              value={plate}
              maxLength={PLATE_MAX}
              placeholder="PERLA"
              autoComplete="off"
              onChange={(e) => setPlate(e.target.value)}
            />
          </div>
          <div className="cta">
            <AddToCart
              item={{ type: "custom", color: color.id, plate, qty: 1 }}
              colors={[color.base, color.base, "#ffffff"]}
            />
            <a className="btn ghost" href={INSTAGRAM_DM} target="_blank" rel="noopener">
              Demander sur Instagram
            </a>
          </div>
        </div>
        <div className="stage center reveal">
          <PearlBag3D color={color.base} label={color.label} plate={plate} />
          <BagSwatches />
          <span className="hint">Choisissez une couleur, puis faites tourner le sac</span>
        </div>
      </div>
    </section>
  );
}
