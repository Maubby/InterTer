import type { Metadata, Viewport } from "next";
import { Cinzel, Nunito } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

// Typographies officielles, self-hostées par next/font (aucune requête Google au runtime)
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--cinzel-font",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--nunito-font",
});

export const metadata: Metadata = {
  title: {
    default: "Interter — Fais briller ton terter",
    template: "%s — Interter",
  },
  description:
    "Chaque jour, une Quête du Jour pour défendre ta ville face à toute la France. Quiz, devinettes et énigmes : l'esprit Intervilles, en webapp.",
  applicationName: "Interter",
};

export const viewport: Viewport = {
  themeColor: "#c8102e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${cinzel.variable} ${nunito.variable}`}>
      {/* suppressHydrationWarning : les extensions navigateur (ex. ColorZilla)
          modifient le <body> avant React ; on ignore ces différences cosmétiques. */}
      <body className="font-sans antialiased min-h-dvh" suppressHydrationWarning>
        <Header />
        <div className="pt-2">{children}</div>
      </body>
    </html>
  );
}
