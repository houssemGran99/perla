"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { INSTAGRAM_DM, PEARL_COLORS } from "@/lib/data";

const PearlBag3D = dynamic(() => import("./PearlBag3D"), {
  ssr: false,
  loading: () => <div className="bag3d loading" aria-hidden="true" />,
});

export default function Customizer() {
  const [colorId, setColorId] = useState(PEARL_COLORS[0].id);
  const color = PEARL_COLORS.find((c) => c.id === colorId) ?? PEARL_COLORS[0];

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
            Couleur choisie : <strong>{color.label}</strong>
          </p>
          <a className="btn" href={INSTAGRAM_DM} target="_blank" rel="noopener">
            Demander un sac personnalisé
          </a>
        </div>
        <div className="stage center reveal">
          <PearlBag3D color={color.base} label={color.label} />
          <div className="swatches" role="group" aria-label="Couleur des perles">
            {PEARL_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="sw"
                aria-pressed={c.id === colorId}
                aria-label={c.label}
                title={c.label}
                onClick={() => setColorId(c.id)}
                style={{ background: `radial-gradient(circle at 35% 30%, #fff, ${c.base} 45%, ${c.shade})` }}
              />
            ))}
          </div>
          <span className="hint">Choisissez une couleur, puis faites tourner le sac</span>
        </div>
      </div>
    </section>
  );
}
