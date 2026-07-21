import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inteligência de Mercado",
  description: "Plataforma B2G de Inteligência de Mercado",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}