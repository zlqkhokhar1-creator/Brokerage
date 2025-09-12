import AdvancedCharts from "@/components/AdvancedCharts";

export default function PortfolioAllocation() {
  return (
    <div className="rounded-xl border p-6">
      <h2 className="font-semibold mb-4">Allocation</h2>
      <div className="h-80 rounded-md">
        <AdvancedCharts variant="allocation" />
      </div>
    </div>
  );
}



