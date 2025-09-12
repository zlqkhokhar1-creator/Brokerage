import type { Metadata } from "next";
import { Inter } from "next/font/google";
import './globals.css';
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link";
import { AccessibilityEnhancer } from "@/components/accessibility/AccessibilityEnhancer";
import { CommandPalette } from "@/components/CommandPalette";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "InvestPro - Pakistan's First AI-Driven Digital Brokerage",
  description: "Pakistan's most advanced investment platform with AI-powered analytics, robo-advisor, and comprehensive trading tools. Start investing with as little as PKR 1,000.",
  keywords: ["investment", "trading", "portfolio", "stocks", "etf", "pakistan", "ai", "robo-advisor", "mutual funds", "SECP"],
  authors: [{ name: "InvestPro Team" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground motion-reduce:transition-none motion-reduce:animate-none" suppressHydrationWarning>
        <ThemeProvider>
        <AuthProvider>
{children}
          <AccessibilityEnhancer />
          <CommandPalette />
          <footer className="border-t py-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-sm text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-4">
              <p> 2025 InvestPro. All rights reserved. SECP Licensed • Member PSX</p>
              <nav className="flex items-center gap-6">
                <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
                <Link href="/terms" className="hover:text-foreground">Terms</Link>
                <Link href="/security" className="hover:text-foreground">Security</Link>
                <Link href="/compliance" className="hover:text-foreground">Compliance</Link>
              </nav>
            </div>
          </footer>
          <Toaster />
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
