"use client";

import { useEffect, useState } from "react";
import { INSTAGRAM_DM } from "@/lib/data";
import { GuideButton } from "./Guide";
import CartButton from "./shop/CartButton";
import ThemeToggle from "./ThemeToggle";

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
          <a className="btn ghost" href={INSTAGRAM_DM} target="_blank" rel="noopener">
            Instagram
          </a>
        </nav>
        <div className="top-actions">
        <GuideButton className="guide-btn">
          <span aria-hidden="true">?</span>
          <span className="guide-btn-label">Guidez-moi</span>
        </GuideButton>
        <ThemeToggle />
        <CartButton />
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
      </div>
    </header>
  );
}
