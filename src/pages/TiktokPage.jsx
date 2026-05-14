import Header from "../components/common/Header";
import TiktokTable from "../components/tiktok/tiktokTable";

const TiktokPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Tiktok Expense" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <TiktokTable />
      </main>
    </div>
  );
};
export default TiktokPage;
