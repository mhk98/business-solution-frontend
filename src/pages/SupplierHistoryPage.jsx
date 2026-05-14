
import Header from "../components/common/Header";
import SupplierHistoryTable from "../components/supplierHistory/supplierHistoryTable";

const SupplierHistoryPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Business List" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <SupplierHistoryTable />
      </main>
    </div>
  );
};
export default SupplierHistoryPage;
