import Header from "../components/common/Header";
import FactoryStockAdjustmentTable from "../components/factoryStockAdjustment/FactoryStockAdjustmentTable";

const FactoryStockAdjustmentPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Factory Stock Adjustment" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <FactoryStockAdjustmentTable />
      </main>
    </div>
  );
};
export default FactoryStockAdjustmentPage;
