"use client";

import { useState } from "react";
import type { OrderItemInput } from "@/lib/order";
import { useCart } from "./CartProvider";

type Props = {
  item: OrderItemInput;
  label?: string;
  className?: string;
  /** Pearl colours for the little burst. */
  colors?: string[];
  disabled?: boolean;
};

export default function AddToCart({ item, label = "Ajouter au panier", className = "btn", colors, disabled }: Props) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={(e) => {
        add(item);
        setAdded(true);
        setTimeout(() => setAdded(false), 1600);
        const el = e.currentTarget;
        import("@/lib/burst").then(({ burstFrom }) => burstFrom(el, { count: 16, spread: 0.6, colors }));
      }}
    >
      <span aria-live="polite">{added ? "Ajouté ✓" : label}</span>
    </button>
  );
}
