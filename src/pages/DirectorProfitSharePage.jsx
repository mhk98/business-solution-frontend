import Header from "../components/common/Header";
import DirectorTable from "../components/ownerTransaction/DirectorTable";

const DirectorProfitSharePage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Director Profit Share" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <DirectorTable />
      </main>
    </div>
  );
};

export default DirectorProfitSharePage;
