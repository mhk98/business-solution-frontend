import Header from "../components/common/Header";
import AssetsStockTable from "../components/assetsStock/AssetsStockTable";

const AssetsStockPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Assets Stock" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <AssetsStockTable />
      </main>
    </div>
  );
};

export default AssetsStockPage;
