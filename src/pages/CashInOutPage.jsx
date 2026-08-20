import { useParams } from "react-router-dom";
import CashInOutTable from "../components/cashIn/cashInOutTable";
import Header from "../components/common/Header";
import { useGetSingleBookDataByIdQuery } from "../features/book/book";

const CashInOutPage = () => {
  const { id } = useParams();
  const { data: bookRes } = useGetSingleBookDataByIdQuery(id, { skip: !id });
  const bookName = bookRes?.data?.name || "Book";

  return (
    <div className="flex-1 min-w-0 relative z-10">
      <Header title={bookName} />

      <main className="max-w-8xl w-full min-w-0 mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <CashInOutTable />
      </main>
    </div>
  );
};
export default CashInOutPage;
