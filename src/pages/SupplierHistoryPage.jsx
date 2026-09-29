import { useParams } from "react-router-dom";
import Header from "../components/common/Header";
import SupplierHistoryTable from "../components/supplierHistory/supplierHistoryTable";
import { useGetSingleSupplierQuery } from "../features/supplier/supplier";

const SupplierHistoryPage = () => {
  const { id } = useParams();
  const { currentData: supplierResponse, isFetching } = useGetSingleSupplierQuery(id, {
    skip: !id,
  });
  const supplierName = supplierResponse?.data?.name;

  return (
    <div className="flex-1 relative z-10">
      <Header title={supplierName || (isFetching ? "Loading supplier..." : "Supplier History")} />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <SupplierHistoryTable />
      </main>
    </div>
  );
};
export default SupplierHistoryPage;
