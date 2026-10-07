"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { MAX_LINES, MAX_QTY, cleanPlate, type OrderItemInput } from "@/lib/order";

export type CartLine = OrderItemInput & { key: string };

type Action =
  | { type: "add"; item: OrderItemInput }
  | { type: "qty"; key: string; qty: number }
  | { type: "remove"; key: string }
  | { type: "clear" }
  | { type: "load"; lines: CartLine[] };

const STORAGE_KEY = "perla-cart-v1";

function keyOf(item: OrderItemInput) {
  return item.type === "model" ? `model:${item.id}` : `custom:${item.color}:${cleanPlate(item.plate).toLowerCase()}`;
}

function reducer(lines: CartLine[], action: Action): CartLine[] {
  switch (action.type) {
    case "add": {
      const item = action.item.type === "custom" ? { ...action.item, plate: cleanPlate(action.item.plate) } : action.item;
      const key = keyOf(item);
      const existing = lines.find((l) => l.key === key);
      if (existing) {
        return lines.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + item.qty) } : l));
      }
      if (lines.length >= MAX_LINES) return lines;
      return [...lines, { ...item, key }];
    }
    case "qty":
      return lines.map((l) => (l.key === action.key ? { ...l, qty: Math.max(1, Math.min(MAX_QTY, action.qty)) } : l));
    case "remove":
      return lines.filter((l) => l.key !== action.key);
    case "clear":
      return [];
    case "load":
      return action.lines;
  }
}

type CartContextValue = {
  lines: CartLine[];
  count: number;
  add: (item: OrderItemInput) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, dispatch] = useReducer(reducer, []);
  const [loaded, setLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Restore the cart for returning visitors (best effort: storage can be unavailable).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
      if (Array.isArray(parsed)) dispatch({ type: "load", lines: parsed.filter((l) => l && l.key && l.qty > 0) });
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, loaded]);

  const add = useCallback((item: OrderItemInput) => dispatch({ type: "add", item }), []);
  const setQty = useCallback((key: string, qty: number) => dispatch({ type: "qty", key, qty }), []);
  const remove = useCallback((key: string) => dispatch({ type: "remove", key }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      add,
      setQty,
      remove,
      clear,
      isOpen,
      open,
      close,
    }),
    [lines, add, setQty, remove, clear, isOpen, open, close],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
