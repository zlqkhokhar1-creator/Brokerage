export default function PortfolioCard() {
  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Portfolio Value</h2>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-3xl font-bold">$15,750.25</span>
        <span className="text-brand">+2.5%</span>
      </div>
      <div className="text-text-secondary text-sm">
        Today's Change: +$385.75
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between">
          <span>Buying Power</span>
          <span>$2,450.00</span>
        </div>
        <div className="flex justify-between">
          <span>Cash</span>
          <span>$1,250.00</span>
        </div>
      </div>
    </div>
  );
}
