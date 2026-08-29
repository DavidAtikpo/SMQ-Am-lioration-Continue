import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SMQ · Amélioration Continue",
  description:
    "Système de management de la qualité avec assistance IA — non-conformités, actions, audits et revue de direction.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
