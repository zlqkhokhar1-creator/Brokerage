import React from "react";

export default function Blog() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <h1 className="text-4xl font-bold text-green-900 mb-6">Blog</h1>
      <p className="text-lg text-gray-700 mb-8">Insights, news, and tips for smart investing.</p>
      <a href="/discover" className="text-green-900 font-semibold hover:underline">Back to Discover</a>
    </div>
  );
}
