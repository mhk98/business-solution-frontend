import Header from "../components/common/Header";
import EmployeeAdvanceHistoryTable from "../components/employeeAdvance/EmployeeAdvanceHistoryTable";

const EmployeeAdvanceHistoryPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Employee Advance Statement" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <EmployeeAdvanceHistoryTable />
      </main>
    </div>
  );
};
export default EmployeeAdvanceHistoryPage;
