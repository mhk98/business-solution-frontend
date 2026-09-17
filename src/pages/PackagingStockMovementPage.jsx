import Header from "../components/common/Header";
import StockMovementTable from "../components/stockMovement/StockMovementTable";

const packagingStockTypes = [
  { value: "PackagingItemStock", label: "Packaging Item Stock" },
  { value: "PackagingFactoryStock", label: "Packaging Factory Stock" },
];

const PackagingStockMovementPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Stock Movement" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <StockMovementTable
          title="Packaging Stock Movement"
          subtitle="Immutable audit trail for Packaging Item Stock and Packaging Factory Stock"
          scopedStockTypes={packagingStockTypes}
          scopedAllLabel="All Packaging Movement"
        />
      </main>
    </div>
  );
};

export default PackagingStockMovementPage;
