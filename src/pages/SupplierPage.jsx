import Header from "../components/common/Header";
import SupplierTable from "../components/supplier/SupplierTable";

const SupplierPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Supplier List" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <SupplierTable />
      </main>
    </div>
  );
};
export default SupplierPage;
