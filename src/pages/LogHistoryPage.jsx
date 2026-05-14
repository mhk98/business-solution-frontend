import Header from "../components/common/Header";
import LogHistoryTable from "../components/logHistory/LogHistoryTable";

const LogHistoryPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Log History" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <LogHistoryTable />
      </main>
    </div>
  );
};

export default LogHistoryPage;
