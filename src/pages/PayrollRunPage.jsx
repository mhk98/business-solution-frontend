import Header from "../components/common/Header";
import PayrollRunManager from "../components/hrm/PayrollRunManager";

const PayrollRunPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Payroll Runs" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <PayrollRunManager />
      </main>
    </div>
  );
};

export default PayrollRunPage;
