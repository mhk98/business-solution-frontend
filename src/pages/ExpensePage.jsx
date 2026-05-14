import Header from "../components/common/Header";
import ExpenseTable from "../components/expense/expenseTable";

const ExpensePage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Product" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8">
        <ExpenseTable />
      </main>
    </div>
  );
};
export default ExpensePage;
