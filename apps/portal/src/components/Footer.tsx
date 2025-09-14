"use client";
import Link from 'next/link';
import { motion } from '@/components/MotionWrappers';

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border-t border-border bg-background py-8 text-muted-foreground"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-sm space-y-4">
        <p>&copy; 2025 InvestPro. All rights reserved. SECP Licensed • Member PSX</p>
        <nav className="flex flex-wrap justify-center gap-6">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link href="/security" className="hover:text-foreground transition-colors">Security</Link>
          <Link href="/compliance" className="hover:text-foreground transition-colors">Compliance</Link>
        </nav>
      </div>
    </motion.footer>
  );
}