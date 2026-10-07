"use client";

import { useRef, useState } from "react";
import { PHONE_DISPLAY, PHONE_RAW } from "@/lib/data";

export default function CopyPhone({ children }: { children?: React.ReactNode }) {
  const phoneRef = useRef<HTMLAnchorElement>(null);
  const [label, setLabel] = useState("Copier le numéro");

  function selectNumber() {
    const el = phoneRef.current;
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    setLabel("Numéro sélectionné");
  }

  async function copy(e: React.MouseEvent<HTMLButtonElement>) {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(PHONE_RAW);
      setLabel("Numéro copié");
      import("@/lib/burst").then(({ burstFrom }) => burstFrom(btn));
      setTimeout(() => setLabel("Copier le numéro"), 1800);
    } catch {
      selectNumber();
    }
  }

  return (
    <>
      <a ref={phoneRef} className="phone" href={`tel:${PHONE_RAW}`}>
        {PHONE_DISPLAY}
      </a>
      <div className="cta">
        <button className="btn" type="button" onClick={copy} aria-live="polite">
          {label}
        </button>
        {children}
      </div>
    </>
  );
}
