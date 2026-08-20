import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NotarIA - Intelligent Legal Solutions",
  description: "Buscador semántico avanzado para expedientes notariales",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-[#0A1128] text-[#F5F7F8] min-h-screen antialiased selection:bg-[#D4A43A] selection:text-[#0A1128]`}>
        {/* Glow de fondo global sutil */}
        <div className="fixed inset-0 z-[-1] pointer-events-none flex items-center justify-center">
          <div className="absolute w-[800px] h-[800px] bg-[#D4A43A]/5 rounded-full blur-[120px]" />
        </div>
        {children}
      </body>
    </html>
  );
}
