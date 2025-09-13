import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const navItems = [
  { name: 'Trade', to: '/trade' },
  { name: 'Pricing', to: '/pricing' },
  { name: 'Discover', to: '/discover' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [investOpen, setInvestOpen] = useState(false);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 w-full bg-white shadow z-50"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src="https://via.placeholder.com/150x50?text=MyApp" alt="MyApp Logo" className="h-10 w-auto" />
        </Link>
        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-8 items-center">
          <Link to="/trade" className="text-gray-700 font-medium hover:text-blue-600 transition-transform transform hover:scale-105">Trade</Link>
          <div className="relative group" onMouseEnter={() => setInvestOpen(true)} onMouseLeave={() => setInvestOpen(false)}>
            <button className="text-gray-700 font-medium hover:text-blue-600 transition-transform transform hover:scale-105 flex items-center gap-1">Invest
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={investOpen ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-20"
              style={{ pointerEvents: investOpen ? 'auto' : 'none' }}
            >
              <Link to="/invest" className="block px-6 py-3 text-gray-900 hover:bg-gray-100 font-semibold">Invest</Link>
              <Link to="/save" className="block px-6 py-3 text-gray-900 hover:bg-gray-100 font-semibold">Save</Link>
            </motion.div>
          </div>
          <Link to="/pricing" className="text-gray-700 font-medium hover:text-blue-600 transition-transform transform hover:scale-105">Pricing</Link>
          <Link to="/discover" className="text-gray-700 font-medium hover:text-blue-600 transition-transform transform hover:scale-105">Discover</Link>
        </nav>
        {/* Right Buttons */}
        <div className="hidden md:flex gap-3 items-center">
          <Link to="/login" className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-transform transform hover:scale-105">Login</Link>
          <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition-transform transform hover:scale-105">Register</Link>
        </div>
        {/* Mobile Hamburger */}
        <button className="md:hidden flex items-center" onClick={() => setMenuOpen(!menuOpen)}>
          <svg width="32" height="32" fill="none" stroke="#007BFF" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </div>
      {/* Mobile Menu */}
      {menuOpen && (
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="md:hidden bg-white shadow-lg border-t border-gray-100 px-4 py-4"
        >
          <Link to="/trade" className="block py-2 text-gray-700 font-medium hover:text-blue-600">Trade</Link>
          <div className="relative">
            <button className="block py-2 text-gray-700 font-medium hover:text-blue-600 w-full text-left" onClick={() => setInvestOpen(!investOpen)}>Invest</button>
            {investOpen && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-lg shadow-lg border border-gray-100 py-2 mt-1"
              >
                <Link to="/invest" className="block px-6 py-3 text-gray-900 hover:bg-gray-100 font-semibold">Invest</Link>
                <Link to="/save" className="block px-6 py-3 text-gray-900 hover:bg-gray-100 font-semibold">Save</Link>
              </motion.div>
            )}
          </div>
          <Link to="/pricing" className="block py-2 text-gray-700 font-medium hover:text-blue-600">Pricing</Link>
          <Link to="/discover" className="block py-2 text-gray-700 font-medium hover:text-blue-600">Discover</Link>
          <div className="flex gap-2 mt-4">
            <Link to="/login" className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50">Login</Link>
            <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-blue-700">Register</Link>
          </div>
        </motion.nav>
      )}
    </motion.header>
  );
}
