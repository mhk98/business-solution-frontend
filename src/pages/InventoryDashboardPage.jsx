import Header from "../components/common/Header";
import InventoryDashboardTable from "../components/inventoryDashboard/InventoryDashboardTable";

const InventoryDashboardPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Product Overview" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <InventoryDashboardTable />
      </main>
    </div>
  );
};
export default InventoryDashboardPage;
