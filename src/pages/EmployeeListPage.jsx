import Header from "../components/common/Header";
import EmployeeListTable from "../components/employeeList/EmployeeListTable";
import HrmWorkspace from "../components/hrm/HrmWorkspace";

const EmployeeListPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Employee List" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <HrmWorkspace
          eyebrow="Payroll"
          title="Employee List"
          description="Review employee salary records before payroll calculation and monthly processing."
        >
          <EmployeeListTable />
        </HrmWorkspace>
      </main>
    </div>
  );
};
export default EmployeeListPage;
