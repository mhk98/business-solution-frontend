import Header from "../components/common/Header";
import AttendancePolicyManager from "../components/attendance/AttendancePolicyManager";

const AttendancePolicyPage = () => (
  <div className="flex-1 relative z-10">
    <Header title="Attendance Policy" />
    <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
      <AttendancePolicyManager />
    </main>
  </div>
);

export default AttendancePolicyPage;
