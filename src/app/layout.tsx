import "./globals.css";
import { Sora } from "next/font/google";

const sora = Sora({ subsets: ["latin"] });
export const metadata = { title: "Loja de estética automotiva" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${sora.className} antialiased`}>{children}</body>
    </html>
  );
}
