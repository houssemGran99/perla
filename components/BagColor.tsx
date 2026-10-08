"use client";

import { createContext, useContext, useState } from "react";
import { PEARL_COLORS } from "@/lib/data";

type Ctx = { colorId: string; setColorId: (id: string) => void; plate: string; setPlate: (name: string) => void };

const BagColorContext = createContext<Ctx | null>(null);

/** Shares the chosen pearl colour and plate name between the hero bag and the customiser. */
export function BagColorProvider({ children }: { children: React.ReactNode }) {
  const [colorId, setColorId] = useState(PEARL_COLORS[0].id);
  const [plate, setPlate] = useState("");
  return (
    <BagColorContext.Provider value={{ colorId, setColorId, plate, setPlate }}>{children}</BagColorContext.Provider>
  );
}

export function useBagColor() {
  const ctx = useContext(BagColorContext);
  if (!ctx) throw new Error("useBagColor must be used inside BagColorProvider");
  const color = PEARL_COLORS.find((c) => c.id === ctx.colorId) ?? PEARL_COLORS[0];
  return { color, setColorId: ctx.setColorId, plate: ctx.plate, setPlate: ctx.setPlate };
}

/** Pearl colour picker; each pick bursts a few pearls from the swatch. */
export function BagSwatches() {
  const { color, setColorId } = useBagColor();
  return (
    <div className="swatches" role="group" aria-label="Couleur des perles">
      {PEARL_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          className="sw"
          aria-pressed={c.id === color.id}
          aria-label={c.label}
          title={c.label}
          onClick={(e) => {
            setColorId(c.id);
            const el = e.currentTarget;
            import("@/lib/burst").then(({ burstFrom }) =>
              burstFrom(el, { colors: [c.base, c.base, "#ffffff"], count: 14, spread: 0.6 }),
            );
          }}
          style={{ background: `radial-gradient(circle at 35% 30%, #fff, ${c.base} 45%, ${c.shade})` }}
        />
      ))}
    </div>
  );
}
