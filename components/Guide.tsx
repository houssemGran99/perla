"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const START_EVENT = "perla:guide";

/** Opens the guided tour from anywhere on the page. */
export function startGuide() {
  window.dispatchEvent(new Event(START_EVENT));
}

type Step = { targets: string[]; title: string; text: string };

const STEPS: Step[] = [
  {
    targets: [".hero-stage .bag3d", ".hero-stage"],
    title: "Votre sac, en 3D",
    text: "Chaque sac est monté perle après perle. Faites-le tourner du doigt ou à la souris pour le voir sous tous les angles.",
  },
  {
    targets: [".hero-stage .swatches"],
    title: "Choisissez la couleur",
    text: "Touchez une perle pour habiller le sac de cette couleur. Votre choix vous suit jusqu’au sac personnalisé.",
  },
  {
    targets: ["#modeles .models", "#modeles"],
    title: "Ou un modèle de la collection",
    text: "Neuf sacs prêts à commander. Un clic sur « Ajouter au panier » sous celui qui vous plaît.",
  },
  {
    targets: ["#personnalise .plate-field", "#personnalise"],
    title: "Votre prénom sur la plaque",
    text: "Écrivez un prénom : il se grave aussitôt sur la plaque dorée du sac. Laissez vide pour garder PERLA.",
  },
  {
    targets: ["#personnalise .cta", "#personnalise"],
    title: "Ajoutez au panier",
    text: "Votre sac personnalisé, avec sa couleur et son prénom, part dans le panier.",
  },
  {
    targets: [".cart-btn"],
    title: "Finalisez la commande",
    text: "Ouvrez le panier, laissez votre nom, votre téléphone et votre adresse. Nous vous appelons pour confirmer, et vous payez à la livraison.",
  },
  {
    targets: ["#contact"],
    title: "Une question ?",
    text: "Appelez-nous ou écrivez sur Instagram : on vous aide à choisir. Bonne visite !",
  },
];

type Box = { top: number; left: number; width: number; height: number };

function findTarget(step: Step) {
  for (const sel of step.targets) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el && el.getClientRects().length) return el;
  }
  return null;
}

const PAD = 10;
const CARD_W = 340;

/** Step-by-step tour: dims the page, spotlights one part at a time and explains it. */
export default function Guide() {
  const [index, setIndex] = useState<number | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [card, setCard] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setIndex(null), []);
  const go = useCallback((i: number) => setIndex(i < 0 || i >= STEPS.length ? null : i), []);

  useEffect(() => {
    const onStart = () => setIndex(0);
    window.addEventListener(START_EVENT, onStart);
    return () => window.removeEventListener(START_EVENT, onStart);
  }, []);

  // Bring the step's element into view.
  useEffect(() => {
    if (index === null) return;
    const el = findTarget(STEPS[index]);
    targetRef.current = el;
    if (!el) {
      setBox(null);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = reduce ? "auto" : "smooth";
    if (window.innerWidth <= 780) {
      // On phones the card sits at the bottom, so park the element just under the sticky header.
      const header = document.querySelector<HTMLElement>("header.top")?.offsetHeight ?? 64;
      const inHeader = !!el.closest("header");
      if (!inHeader) {
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - header - PAD - 16, behavior });
      }
    } else {
      el.scrollIntoView({ block: "center", behavior });
    }
    cardRef.current?.focus({ preventScroll: true });
  }, [index]);

  // Follow the element while scrolling, resizing or animating.
  useEffect(() => {
    if (index === null) return;
    let raf = 0;
    let last = "";
    const tick = () => {
      const el = targetRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const next = { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
        const key = `${Math.round(next.top)},${Math.round(next.left)},${Math.round(next.width)},${Math.round(next.height)}`;
        if (key !== last) {
          last = key;
          setBox(next);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [index]);

  // Place the card beside the spotlight (on phones it sits at the bottom, via CSS).
  useLayoutEffect(() => {
    if (index === null || !cardRef.current) return;
    if (window.innerWidth <= 780 || !box) {
      setCard(null);
      return;
    }
    const ch = cardRef.current.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 14;
    let top = box.top + box.height + gap;
    if (top + ch > vh - 12) top = box.top - ch - gap;
    if (top < 12) top = Math.min(vh - ch - 12, Math.max(12, box.top + box.height / 2 - ch / 2));
    let left = box.left + box.width / 2 - CARD_W / 2;
    // A tall target with no room above or below: put the card to its side.
    if (top + ch > box.top && top < box.top + box.height) {
      left = box.left + box.width + gap + CARD_W < vw ? box.left + box.width + gap : box.left - CARD_W - gap;
    }
    left = Math.min(vw - CARD_W - 12, Math.max(12, left));
    setCard({ top, left });
  }, [box, index]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.("input, textarea, select");
      if (e.key === "Escape") close();
      else if (!typing && e.key === "ArrowRight") go(index + 1);
      else if (!typing && e.key === "ArrowLeft") go(Math.max(0, index - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, close, go]);

  if (index === null) return null;
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  return (
    <div className="guide" aria-live="polite">
      <div
        className={`guide-spot${box ? "" : " none"}`}
        style={box ? { top: box.top, left: box.left, width: box.width, height: box.height } : undefined}
        aria-hidden="true"
      />
      <div
        ref={cardRef}
        className="guide-card"
        role="dialog"
        aria-labelledby="guide-title"
        tabIndex={-1}
        style={card ? { top: card.top, left: card.left } : undefined}
        key={index}
      >
        <div className="guide-pearls" aria-hidden="true">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              className={i === index ? "on" : i < index ? "done" : ""}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <span className="guide-count">
          Étape {index + 1} sur {STEPS.length}
        </span>
        <h3 id="guide-title">{step.title}</h3>
        <p>{step.text}</p>
        <div className="guide-actions">
          <button type="button" className="guide-skip" onClick={close}>
            Quitter
          </button>
          {index > 0 && (
            <button type="button" className="btn ghost" onClick={() => go(index - 1)}>
              Retour
            </button>
          )}
          <button type="button" className="btn" onClick={() => go(index + 1)} autoFocus>
            {last ? "Terminer" : "Suivant"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Button that starts the tour. */
export function GuideButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={startGuide}>
      {children}
    </button>
  );
}
