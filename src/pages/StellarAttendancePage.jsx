import Header from "../components/common/Header";
import StellarAttendanceManager from "../components/hrm/StellarAttendanceManager";

const StellarAttendancePage = () => {
  return (
    <>
      <Header title="Attendance" />
      <div className="p-4 sm:p-6">
        <StellarAttendanceManager />
      </div>
    </>
  );
};

export default StellarAttendancePage;
