import Header from "../components/common/Header";
import LoanHistoryTable from "../components/loan/LoanHistoryTable";

const LoanHistoryPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Loan History" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <LoanHistoryTable />
      </main>
    </div>
  );
};

export default LoanHistoryPage;
