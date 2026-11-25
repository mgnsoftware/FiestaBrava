import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "La Fiesta Brava Taquería · Tlalnepantla", description: "Tacos hechos con pasión, sabor y tradición. Menú, combos y promociones de La Fiesta Brava Taquería en San Juan Ixtacala, Tlalnepantla." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html>; }
