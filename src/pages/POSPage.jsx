import Header from "../components/common/Header";
import SellPosTable from "../components/sellPos/sellPosTable";

const POSPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="POS" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <SellPosTable />
      </main>
    </div>
  );
};
export default POSPage;
