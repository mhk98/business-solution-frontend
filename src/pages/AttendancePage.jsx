import Header from "../components/common/Header";
import AttendanceManager from "../components/attendance/AttendanceManager";

const AttendancePage = () => (
  <div className="flex-1 relative z-10">
    <Header title="Attendance" />
    <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
      <AttendanceManager />
    </main>
  </div>
);

export default AttendancePage;
