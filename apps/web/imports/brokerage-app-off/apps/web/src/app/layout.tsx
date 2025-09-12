import type { Metadata } from "next";
import { Inter } from "next/font/google";
import './globals.css';
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "InvestPro - Professional Investment Platform",
  description: "A comprehensive investment and brokerage platform for modern investors",
  keywords: ["investment", "trading", "portfolio", "stocks", "etf", "crypto"],
  authors: [{ name: "InvestPro Team" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground" suppressHydrationWarning>
        <AuthProvider>
{children}
          <footer className="border-t py-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-sm text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-4">
              <p>© 2025 InvestPro. All rights reserved.</p>
              <nav className="flex items-center gap-6">
                <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
                <Link href="/terms" className="hover:text-foreground">Terms</Link>
                <Link href="/security" className="hover:text-foreground">Security</Link>
              </nav>
            </div>
          </footer>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
