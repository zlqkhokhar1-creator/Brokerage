import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PlusCircle, Bell, Sparkles } from 'lucide-react';

const navItems = [
  { name: 'Trade', href: '/trade' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Discover', href: '/discover' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [investOpen, setInvestOpen] = useState(false);

  const openPalette = () => {
    const evt = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
    document.dispatchEvent(evt);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="sticky top-0 left-0 w-full bg-white/80 backdrop-blur border-b z-50 dark:bg-black/60"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-white font-bold">IP</div>
          <span className="sr-only">InvestPro</span>
        </Link>
        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-8 items-center">
          {navItems.map((item) => (
            <Link key={item.name} href={item.href} className="text-foreground/80 hover:text-secondary font-medium">
              {item.name}
            </Link>
          ))}
          <div className="relative group" onMouseEnter={() => setInvestOpen(true)} onMouseLeave={() => setInvestOpen(false)}>
            <button className="text-foreground/80 hover:text-secondary font-medium flex items-center gap-1">Invest
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={investOpen ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border py-2 z-20"
              style={{ pointerEvents: investOpen ? 'auto' : 'none' }}
            >
              <Link href="/invest/managed-investing" className="block px-4 py-2 hover:bg-background-alt">Managed Investing</Link>
              <Link href="/invest/private-wealth" className="block px-4 py-2 hover:bg-background-alt">Private Wealth</Link>
            </motion.div>
          </div>
        </nav>
        {/* Right Buttons - Quick Actions */}
        <div className="hidden md:flex gap-2 items-center">
          <Link href="/trade/execute" className="inline-flex items-center gap-2 rounded-md px-3 py-2 bg-secondary text-secondary-foreground hover:bg-accent hover:text-white">
            <PlusCircle className="w-4 h-4" /> New Order
          </Link>
          <Link href="/notifications" className="inline-flex items-center gap-2 rounded-md px-3 py-2 border hover:bg-background-alt">
            <Bell className="w-4 h-4" /> Alerts
          </Link>
          <button onClick={openPalette} className="inline-flex items-center gap-2 rounded-md px-3 py-2 border hover:bg-background-alt">
            <Sparkles className="w-4 h-4" /> AI
          </button>
          <Link href="/login" className="px-3 py-2 rounded-md border">Log In</Link>
          <Link href="/register" className="px-3 py-2 rounded-md bg-primary text-primary-foreground">Sign Up</Link>
        </div>
        {/* Mobile Hamburger */}
        <button className="md:hidden flex items-center" onClick={() => setMenuOpen(!menuOpen)}>
          <svg width="32" height="32" fill="none" className="text-secondary" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </div>
      {/* Mobile Menu */}
      {menuOpen && (
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="md:hidden bg-background border-t px-4 py-4"
        >
          {navItems.map((item) => (
            <Link key={item.name} href={item.href} className="block py-2 text-foreground/80 hover:text-secondary" onClick={() => setMenuOpen(false)}>
              {item.name}
            </Link>
          ))}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Link href="/trade/execute" className="px-3 py-2 rounded-md bg-secondary text-secondary-foreground text-center" onClick={() => setMenuOpen(false)}>New Order</Link>
            <Link href="/notifications" className="px-3 py-2 rounded-md border text-center" onClick={() => setMenuOpen(false)}>Alerts</Link>
            <button onClick={() => { openPalette(); setMenuOpen(false); }} className="col-span-2 px-3 py-2 rounded-md border">Open AI (⌘K)</button>
          </div>
          <div className="flex gap-2 mt-4">
            <Link href="/login" className="border px-4 py-2 rounded-lg">Login</Link>
            <Link href="/register" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">Register</Link>
          </div>
        </motion.nav>
      )}
    </motion.header>
  );
}
