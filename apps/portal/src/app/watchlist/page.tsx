export default function WatchlistPage() {
  const items = [
    { symbol: "TSLA", note: "Breakout watch", price: 245.12, change: 2.1 },
    { symbol: "NVDA", note: "Earnings next week", price: 123.45, change: -1.3 },
  ];
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-6">Watchlist</h1>
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Symbol</th>
              <th className="text-left px-4 py-3">Note</th>
              <th className="text-right px-4 py-3">Price</th>
              <th className="text-right px-4 py-3">Change</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r)=> (
              <tr key={r.symbol} className="border-t">
                <td className="px-4 py-3 font-medium">{r.symbol}</td>
                <td className="px-4 py-3">{r.note}</td>
                <td className="px-4 py-3 text-right">{r.price.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right ${r.change>=0?"text-emerald-600":"text-rose-600"}`}>{r.change>=0?"+":""}{r.change.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



