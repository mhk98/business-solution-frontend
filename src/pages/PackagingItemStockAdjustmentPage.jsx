import Header from "../components/common/Header";
import PackagingItemStockAdjustmentTable from "../components/packagingItemStockAdjustment/PackagingItemStockAdjustmentTable";

const PackagingItemStockAdjustmentPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Packaging Item Stock Adjustment" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <PackagingItemStockAdjustmentTable />
      </main>
    </div>
  );
};
export default PackagingItemStockAdjustmentPage;
