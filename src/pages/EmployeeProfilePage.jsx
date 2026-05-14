import Header from "../components/common/Header";
import EmployeeSelfServiceProfile from "../components/hrm/EmployeeSelfServiceProfile";

const EmployeeProfilePage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Employee Profile" />
      <main className="max-w-8xl mx-auto min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 lg:px-8">
        <EmployeeSelfServiceProfile />
      </main>
    </div>
  );
};

export default EmployeeProfilePage;
