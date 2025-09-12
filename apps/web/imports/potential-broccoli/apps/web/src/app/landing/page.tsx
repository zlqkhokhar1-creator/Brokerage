'use client';

import { useEffect } from 'react';

export default function LandingPage() {
  useEffect(() => {
    // Redirect to the static landing page
    window.location.href = '/landing/investpro-website/dist/index.html';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-400 mx-auto mb-6"></div>
        <h1 className="text-3xl font-bold mb-4">InvestPro</h1>
        <p className="text-xl mb-2">Pakistan's First AI-Driven Digital Brokerage</p>
        <p className="text-lg opacity-80">Loading your investment platform...</p>
      </div>
    </div>
  );
}