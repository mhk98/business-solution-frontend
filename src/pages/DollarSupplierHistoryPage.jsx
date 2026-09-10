import Header from "../components/common/Header";
import DollarSupplierHistoryTable from "../components/dollarSupplier/DollarSupplierHistoryTable";

const DollarSupplierHistoryPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Dollar Supplier Statement" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <DollarSupplierHistoryTable />
      </main>
    </div>
  );
};
export default DollarSupplierHistoryPage;
