import Header from "../components/common/Header";
import MarketingExpenseTable from "../components/marketingExpense/marketingExpenseTable";

const MarketingExpensePage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Product" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <MarketingExpenseTable />
      </main>
    </div>
  );
};
export default MarketingExpensePage;
