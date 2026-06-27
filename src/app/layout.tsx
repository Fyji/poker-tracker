import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Link from "next/link";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Poker Tracker 🃏",
  description: "Track poker game results and debts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="dark">
      <body className={`${geistSans.variable} font-sans antialiased bg-zinc-950 text-zinc-100 min-h-screen`}>
        <nav className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-emerald-400 hover:text-emerald-300 transition">
              🃏 פוקר טראקר
            </Link>
            <div className="flex gap-4 mr-auto text-sm">
              <Link href="/" className="text-zinc-400 hover:text-zinc-100 transition">
                דשבורד
              </Link>
              <Link href="/games" className="text-zinc-400 hover:text-zinc-100 transition">
                משחקים
              </Link>
              <Link href="/players" className="text-zinc-400 hover:text-zinc-100 transition">
                שחקנים
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
