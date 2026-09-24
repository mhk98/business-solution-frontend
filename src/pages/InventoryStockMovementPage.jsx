import Header from "../components/common/Header";
import StockMovementTable from "../components/stockMovement/StockMovementTable";

const productStockTypes = [{ value: "ProductStock", label: "Stock Product" }];

const InventoryStockMovementPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Stock Movement" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <StockMovementTable
          title="Stock Product Movement"
          subtitle="Every increase and decrease of Stock Product — purchase, mixer, intransit, sales return, POS, damage"
          scopedStockTypes={productStockTypes}
          scopedAllLabel="All Stock Product Movement"
        />
      </main>
    </div>
  );
};

export default InventoryStockMovementPage;
