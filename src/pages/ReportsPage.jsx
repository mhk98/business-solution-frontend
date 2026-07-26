import Header from "../components/common/Header";
import ReportsTable from "../components/reports/ReportsTable";

const ReportsPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Reports" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <ReportsTable />
      </main>
    </div>
  );
};

export default ReportsPage;
