import Image from "next/image";
'use client';
import Link from 'next/link';

'use client';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Brokerage Platform</h1>
      
      <div className="bg-slate-800 rounded-lg p-6 mb-8">
        <h2 className="text-xl mb-2">Portfolio Value</h2>
        <p className="text-4xl font-bold text-green-400">$15,750.25</p>
        <p className="text-green-400">+2.5% today</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl mb-4">Quick Trade</h2>
          <input 
            type="text" 
            placeholder="Enter symbol (e.g., AAPL)"
            className="w-full p-2 mb-4 bg-slate-700 rounded text-white"
          />
          <button className="w-full bg-green-500 hover:bg-green-600 py-2 px-4 rounded">
            Trade Now
          </button>
        </div>
        
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl mb-4">Watchlist</h2>
          <div className="space-y-2">
            <div className="flex justify-between p-2 hover:bg-slate-700 rounded">
              <span>AAPL</span>
              <div className="text-right">
                <div>$159.75</div>
                <div className="text-green-400">+2.5%</div>
              </div>
            </div>
            <div className="flex justify-between p-2 hover:bg-slate-700 rounded">
              <span>TSLA</span>
              <div className="text-right">
                <div>$245.50</div>
                <div className="text-red-400">-1.2%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
}
}
}
