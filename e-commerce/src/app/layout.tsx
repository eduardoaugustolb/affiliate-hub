import type { Metadata } from "next";
import localFont from "next/font/local";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import "lenis/dist/lenis.css";
import "./globals.css";

const blackHem = localFont({
  src: "./fonts/black-hem-display-regular.woff2",
  variable: "--font-black-hem",
  weight: "400",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BLACK HEM — Catálogo de roupas e acessórios",
  description:
    "Um lugar para encontrar as roupas e os acessórios que você viu no feed. Conheça o catálogo BLACK HEM.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${blackHem.variable} antialiased`}>
      <body className="bg-ink font-sans text-bone">
        <SmoothScroll>
          <a
            className="fixed left-4 top-4 z-50 translate-y-[-200%] bg-bone px-4 py-3 text-ink focus:translate-y-0"
            href="#conteudo"
          >
            Pular para o conteúdo
          </a>
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
