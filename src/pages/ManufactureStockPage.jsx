import Header from "../components/common/Header";
import ManufactureStockTable from "../components/manufactureStock/ManufactureStockTable";

const ManufactureStockPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Factory Stock" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <ManufactureStockTable stockType="manufacture" />
      </main>
    </div>
  );
};
export default ManufactureStockPage;
