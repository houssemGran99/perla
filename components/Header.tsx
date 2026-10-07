"use client";

import { useEffect, useState } from "react";
import { INSTAGRAM_DM } from "@/lib/data";

const LINKS = [
  { href: "#modeles", label: "Modèles" },
  { href: "#personnalise", label: "Personnalisé" },
  { href: "#commander", label: "Commander" },
  { href: "#contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth > 780 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header className={`top${scrolled ? " scrolled" : ""}${open ? " open" : ""}`}>
      <div className="wrap">
        <a className="mark" href="#accueil" onClick={() => setOpen(false)}>
          PERLA
        </a>
        <nav id="site-nav" aria-label="Navigation principale">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <a className="btn" href={INSTAGRAM_DM} target="_blank" rel="noopener">
            Écrire sur Instagram
          </a>
        </nav>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
