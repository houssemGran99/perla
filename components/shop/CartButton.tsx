"use client";

import { useCart } from "./CartProvider";

export default function CartButton() {
  const { count, open } = useCart();
  return (
    <button
      type="button"
      className="cart-btn"
      onClick={open}
      aria-label={count ? `Panier, ${count} article${count > 1 ? "s" : ""}` : "Panier"}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 8h12l-1 12H7L6 8Z M9 8V6a3 3 0 0 1 6 0v2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      {count > 0 && <span className="badge">{count}</span>}
    </button>
  );
}
