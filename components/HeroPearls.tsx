"use client";

import dynamic from "next/dynamic";

const FloatingPearls = dynamic(() => import("./FloatingPearls"), { ssr: false });

export default FloatingPearls;
