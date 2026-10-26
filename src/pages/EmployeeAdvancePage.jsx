import Header from "../components/common/Header";
import EmployeeAdvanceTable from "../components/employeeAdvance/EmployeeAdvanceTable";

const EmployeeAdvancePage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Employee Advance" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <EmployeeAdvanceTable />
      </main>
    </div>
  );
};
export default EmployeeAdvancePage;
