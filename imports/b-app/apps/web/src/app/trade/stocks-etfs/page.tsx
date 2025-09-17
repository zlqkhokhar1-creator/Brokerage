import React from "react";

export default function StocksETFs() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <h1 className="text-4xl font-bold text-green-900 mb-6">Stocks & ETFs</h1>
      <p className="text-lg text-gray-700 mb-8">Trade stocks and ETFs with low fees and real-time execution.</p>
      <a href="/trade" className="text-green-900 font-semibold hover:underline">Back to Trade</a>
    </div>
  );
}
