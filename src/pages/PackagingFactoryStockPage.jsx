import Header from "../components/common/Header";
import PackagingFactoryStockTable from "../components/packagingFactoryStock/PackagingFactoryStockTable";

const PackagingFactoryStockPage = () => (
  <div className="flex-1 relative z-10">
    <Header title="Packaging Factory Stock" />
    <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
      <PackagingFactoryStockTable />
    </main>
  </div>
);

export default PackagingFactoryStockPage;
