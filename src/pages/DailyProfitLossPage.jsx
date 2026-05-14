import Header from "../components/common/Header";
import DailyProfitLossTable from "../components/DailyProfitLoss/DailyProfitLossTable";

const DailyProfitLossPage = () => {
  return (
    <div className="relative z-10 flex-1">
      <Header title="Daily Profit Loss" />

      <main className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-8xl">
          <DailyProfitLossTable />
        </div>
      </main>
    </div>
  );
};

export default DailyProfitLossPage;
