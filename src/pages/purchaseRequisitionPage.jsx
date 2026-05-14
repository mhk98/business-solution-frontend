import Header from "../components/common/Header";
import PurchaseRequisionTable from "../components/purchaseRequision/purchaseRequisionTable";

const PurchaseRequisitionPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Purchase Product" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <PurchaseRequisionTable />
      </main>
    </div>
  );
};
export default PurchaseRequisitionPage;
