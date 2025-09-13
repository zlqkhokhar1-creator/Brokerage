import React from "react";

export default function PrivateWealth() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <h1 className="text-4xl font-bold text-green-900 mb-6">Private Wealth</h1>
      <p className="text-lg text-gray-700 mb-8">Exclusive wealth management for high-net-worth clients.</p>
      <a href="/invest" className="text-green-900 font-semibold hover:underline">Back to Invest</a>
    </div>
  );
}
