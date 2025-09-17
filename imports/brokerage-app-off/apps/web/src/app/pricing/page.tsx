"use client";

export const dynamic = 'force-dynamic';

import Link from "next/link";

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#f7ff00] flex flex-col items-center px-4 py-8">
      <header className="w-full max-w-4xl mx-auto text-center py-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg mb-2 animate-fade-in">Pricing</h1>
        <p className="text-lg md:text-xl text-[#f7ff00] font-medium mb-6 animate-fade-in-delay">Transparent, fair, and simple pricing for all investors.</p>
      </header>
      <main className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
        <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-white/30 animate-fade-in-delay">
          <h3 className="text-lg font-bold text-white mb-2">Basic</h3>
          <p className="text-white/80">$0/month<br/>No commission on stocks</p>
        </div>
        <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-white/30 animate-fade-in-delay">
          <h3 className="text-lg font-bold text-white mb-2">Pro</h3>
          <p className="text-white/80">$9/month<br/>Advanced analytics & priority support</p>
        </div>
        <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-white/30 animate-fade-in-delay">
          <h3 className="text-lg font-bold text-white mb-2">Elite</h3>
          <p className="text-white/80">$29/month<br/>Personal advisor & exclusive features</p>
        </div>
      </main>
      <footer className="w-full max-w-4xl mx-auto text-center py-8 mt-16 text-white/70 animate-fade-in-delay">
        &copy; {new Date().getFullYear()} InvestPro. All rights reserved.
      </footer>
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: none; }
        }
        .animate-fade-in { animation: fade-in 1s ease-out; }
        .animate-fade-in-delay { animation: fade-in 1.5s ease-out; }
      `}</style>
    </div>
  );
}



