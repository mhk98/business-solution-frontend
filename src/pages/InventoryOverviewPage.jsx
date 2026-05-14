import Header from "../components/common/Header";
import InventoryOverviewTable from "../components/inventoryOverview/inventoryOverviewTable";

const InventoryOverviewPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Stock Product" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <InventoryOverviewTable />
      </main>
    </div>
  );
};
export default InventoryOverviewPage;
