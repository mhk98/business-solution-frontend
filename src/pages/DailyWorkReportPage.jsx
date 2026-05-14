import Header from "../components/common/Header";
import DailyWorkReportManager from "../components/hrm/DailyWorkReportManager";

const DailyWorkReportPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Daily Work Reports" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <DailyWorkReportManager />
      </main>
    </div>
  );
};

export default DailyWorkReportPage;
