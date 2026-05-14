import Header from "../components/common/Header";
import PosReportTable from "../components/posReport/PosReportTable";

const PosReportPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Employee Salary Calculation" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <PosReportTable />
      </main>
    </div>
  );
};
export default PosReportPage;
