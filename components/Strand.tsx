"use client";

import dynamic from "next/dynamic";

/** 3D pearl strand, with the flat CSS strand shown while it loads (and on the server). */
const Strand = dynamic(() => import("./PearlStrand3D"), {
  ssr: false,
  loading: () => (
    <div className="strand3d placeholder" aria-hidden="true">
      <div className="strand" />
    </div>
  ),
});

export default Strand;
