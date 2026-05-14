import Header from "../components/common/Header";
import HrmWorkspace from "../components/hrm/HrmWorkspace";
import SalaryTable from "../components/salary/SalaryTable";

const SalaryPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Payroll Fine" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <HrmWorkspace
          eyebrow="Payroll"
          title="Payroll Fine"
          description="Manage employee fines and deductions that affect monthly payroll results."
        >
          <SalaryTable />
        </HrmWorkspace>
      </main>
    </div>
  );
};
export default SalaryPage;
