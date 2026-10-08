"use client";

import { useEffect, useState } from "react";
import { THEME_COLOR, THEME_KEY, type Theme } from "@/lib/theme";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(theme: Theme) {
  const root = document.documentElement;
  // Fade colours across the whole page for a moment, unless motion is reduced.
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("theme-switching");
    window.setTimeout(() => root.classList.remove("theme-switching"), 400);
  }
  root.dataset.theme = theme;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = THEME_COLOR[theme];
  });
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const saved = document.documentElement.dataset.theme;
    setTheme(saved === "light" || saved === "dark" ? saved : systemTheme());

    // Follow the system while the visitor hasn't picked a theme themselves.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (!document.documentElement.dataset.theme) setTheme(mq.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    apply(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    setTheme(next);
  };

  const dark = theme === "dark";
  return (
    <button
      type="button"
      className="theme-btn"
      onClick={toggle}
      aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={dark ? "Mode clair" : "Mode sombre"}
      // Rendered blank on the server; the icon appears once the real theme is known.
      data-ready={theme ? "" : undefined}
    >
      {dark ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6Z" />
        </svg>
      )}
    </button>
  );
}
