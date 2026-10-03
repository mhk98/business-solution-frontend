import Header from "../components/common/Header";
import AttendanceSetupManager from "../components/attendance/AttendanceSetupManager";

const AttendanceSetupPage = () => (
  <div className="flex-1 relative z-10">
    <Header title="Attendance Setup" />
    <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
      <AttendanceSetupManager />
    </main>
  </div>
);

export default AttendanceSetupPage;
