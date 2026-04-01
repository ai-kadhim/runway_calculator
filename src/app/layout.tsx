import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next Signal — Runway Calculator",
  description: "Founder runway calculator for Next Signal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
