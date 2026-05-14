import Header from "../components/common/Header";
import EmployeeTable from "../components/employee/EmployeeTable";
import HrmWorkspace from "../components/hrm/HrmWorkspace";

const EmployeePage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Employee Salary Calculation" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <HrmWorkspace
          eyebrow="Payroll"
          title="Payroll"
          description="Calculate employee salary components before payroll run and payslip finalization."
        >
          <EmployeeTable />
        </HrmWorkspace>
      </main>
    </div>
  );
};
export default EmployeePage;
