import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Hanken_Grotesk } from "next/font/google";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

const display = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-display",
  display: "swap",
});

const body = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PERLA · Sacs en perles faits main",
  description:
    "PERLA, marque tunisienne de sacs en perles faits main. Commandez sur Instagram, livraison à domicile partout en Tunisie.",
  openGraph: {
    title: "PERLA · Sacs en perles faits main",
    description: "Des sacs en perles faits main, perle après perle. Livraison partout en Tunisie.",
    images: ["/img/01.jpg"],
    locale: "fr_TN",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f0f4" },
    { media: "(prefers-color-scheme: dark)", color: "#16121b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The init script may set data-theme before hydration, so React shouldn't flag the mismatch.
    <html lang="fr" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
