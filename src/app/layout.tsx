import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Fiesta Brava · Sabor que reúne", description: "Comida hecha con cariño para compartir los buenos momentos." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html>; }
