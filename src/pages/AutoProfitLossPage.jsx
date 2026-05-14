import Header from "../components/common/Header";
import AutoProfitLossTable from "../components/AutoProfitLoss/AutoProfitLossTable";

const AutoProfitLossPage = () => {
  return (
    <div className="relative z-10 flex-1">
      <Header title="Auto Profit & Loss" />

      <main className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-8xl">
          <AutoProfitLossTable />
        </div>
      </main>
    </div>
  );
};

export default AutoProfitLossPage;
