"use client";

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import './globals.css';
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "@/components/ui/toaster";
import Footer from "@/components/Footer";
import { AccessibilityEnhancer } from "@/components/accessibility/AccessibilityEnhancer";

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

export const viewport: Viewport = {
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
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`} suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-card focus:text-card-foreground focus:px-3 focus:py-2 focus:rounded-md"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <AuthProvider>
            <main id="main-content" className="min-h-screen">
              {children}
            </main>
            <Footer />
            <Toaster />
            <AccessibilityEnhancer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
