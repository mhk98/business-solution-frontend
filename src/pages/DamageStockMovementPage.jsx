import Header from "../components/common/Header";
import StockMovementTable from "../components/stockMovement/StockMovementTable";

const damageStockTypes = [
  { value: "DamageStock", label: "Damage Stock" },
  { value: "RepairingStock", label: "Damage Repairing Stock" },
];

const DamageStockMovementPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Stock Movement" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <StockMovementTable
          title="Damage Stock Movement"
          subtitle="Immutable audit trail for Damage Stock and Damage Repairing Stock"
          scopedStockTypes={damageStockTypes}
          scopedAllLabel="All Damage Movement"
        />
      </main>
    </div>
  );
};

export default DamageStockMovementPage;
