import Header from "../components/common/Header";
import MarketingExpenseTable from "../components/marketingExpense/marketingExpenseTable";
import { useGetSingleMarketingBookDataByIdQuery } from "../features/marketingBook/marketingBook";
import { useParams } from "react-router-dom";

const MarketingExpensePage = () => {
  const { id } = useParams();
  const { data: bookRes } = useGetSingleMarketingBookDataByIdQuery(id, {
    skip: !id,
  });
  const bookName = bookRes?.data?.name || (id ? `Book #${id}` : "Marketing Book");

  return (
    <div className="flex-1 relative z-10">
      <Header title={bookName} />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <MarketingExpenseTable bookName={bookName} />
      </main>
    </div>
  );
};
export default MarketingExpensePage;
