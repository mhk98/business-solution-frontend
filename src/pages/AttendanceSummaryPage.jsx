import Header from "../components/common/Header";
import AttendanceSummaryManager from "../components/hrm/AttendanceSummaryManager";

const AttendanceSummaryPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Attendance Summary" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <AttendanceSummaryManager />
      </main>
    </div>
  );
};

export default AttendanceSummaryPage;
