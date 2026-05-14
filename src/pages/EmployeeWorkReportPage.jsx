import Header from "../components/common/Header";
import EmployeeWorkReportManager from "../components/hrm/EmployeeWorkReportManager";

const EmployeeWorkReportPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="CS Work Reports" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <EmployeeWorkReportManager />
      </main>
    </div>
  );
};

export default EmployeeWorkReportPage;
