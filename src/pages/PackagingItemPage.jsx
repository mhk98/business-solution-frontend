import Header from "../components/common/Header";
import PackagingItemTable from "../components/packagingItem/PackagingItemTable";

const PackagingItemPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Packaging Items" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <PackagingItemTable />
      </main>
    </div>
  );
};

export default PackagingItemPage;
