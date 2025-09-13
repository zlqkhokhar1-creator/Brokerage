export default function PortfolioHoldings() {
  const rows = [
    { s: "AAPL", n: "Apple Inc.", q: 120, ap: 180, mv: 24000, pl: 1240 },
    { s: "MSFT", n: "Microsoft", q: 60, ap: 350, mv: 24750, pl: -310 },
  ];
  return (
    <div className="rounded-xl border p-6">
      <h2 className="font-semibold mb-4">Holdings</h2>
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Symbol</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-right px-4 py-3">Qty</th>
              <th className="text-right px-4 py-3">Avg Price</th>
              <th className="text-right px-4 py-3">Market Value</th>
              <th className="text-right px-4 py-3">P/L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.s} className="border-t">
                <td className="px-4 py-3 font-medium">{r.s}</td>
                <td className="px-4 py-3">{r.n}</td>
                <td className="px-4 py-3 text-right">{r.q}</td>
                <td className="px-4 py-3 text-right">${r.ap.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">${r.mv.toLocaleString()}</td>
                <td className={`px-4 py-3 text-right ${r.pl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{r.pl >= 0 ? "+" : ""}{r.pl.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



