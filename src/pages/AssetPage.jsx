import Header from "../components/common/Header";
import AssetTable from "../components/asset/AssetTable";

const AssetPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Asset" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <AssetTable />
      </main>
    </div>
  );
};

export default AssetPage;
