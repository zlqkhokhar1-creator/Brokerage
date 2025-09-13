export default function PortfolioOverview() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border p-6"><p className="text-sm text-muted-foreground">Total Value</p><p className="text-3xl font-bold mt-2">$125,430.12</p></div>
        <div className="rounded-xl border p-6"><p className="text-sm text-muted-foreground">Day Change</p><p className="text-3xl font-bold mt-2 text-emerald-600">+$1,245 (0.98%)</p></div>
        <div className="rounded-xl border p-6"><p className="text-sm text-muted-foreground">YTD</p><p className="text-3xl font-bold mt-2 text-emerald-600">+12.4%</p></div>
      </div>
      <div className="rounded-xl border p-6">
        <h2 className="font-semibold mb-4">Performance</h2>
        <div className="h-72 bg-muted rounded-md" />
      </div>
    </div>
  );
}



