import Header from "../components/common/Header";
import AttendanceLogsManager from "../components/hrm/AttendanceLogsManager";

const AttendanceLogsPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Attendance Logs" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <AttendanceLogsManager />
      </main>
    </div>
  );
};

export default AttendanceLogsPage;
