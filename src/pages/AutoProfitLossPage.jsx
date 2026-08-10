import Header from "../components/common/Header";
import AutoProfitLossTable from "../components/AutoProfitLoss/AutoProfitLossTable";

const AutoProfitLossPage = () => {
  return (
    <div className="relative z-10 flex-1">
      <Header title="Intransit Profit & Loss" />

      <main className="min-h-[calc(100vh-64px)] min-w-0 bg-slate-50 px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
        <div className="mx-auto w-full min-w-0 max-w-[1600px]">
          <AutoProfitLossTable />
        </div>
      </main>
    </div>
  );
};

export default AutoProfitLossPage;
