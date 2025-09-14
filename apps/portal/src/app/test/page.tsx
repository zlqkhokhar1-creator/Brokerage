"use client";

export default function TestPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-4xl font-bold mb-4">Test Page</h1>
      <p className="text-lg mb-4">This is a simple test page to check if routing works.</p>
      <div className="bg-card p-6 rounded-lg border border-border">
        <h2 className="text-2xl font-semibold mb-2">Card Test</h2>
        <p>This card should be visible with proper styling.</p>
        <img 
          src="/trading-dashboard.jpg" 
          alt="Test Image" 
          className="w-full h-64 object-cover rounded-lg mt-4"
        />
      </div>
    </div>
  );
}

