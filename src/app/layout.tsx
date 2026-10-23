import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MiBolsillo", template: "%s · MiBolsillo" },
  description: "Finanzas personales y control de tus negocios en un solo lugar.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-sans">{children}</body>
    </html>
  );
}
