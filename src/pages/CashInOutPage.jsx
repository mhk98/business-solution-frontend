import { useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeftRight } from "lucide-react";
import CashInOutTable from "../components/cashIn/cashInOutTable";
import Header from "../components/common/Header";
import FundTransferFormModal from "../components/fundTransfer/FundTransferFormModal";
import { useGetSingleBookDataByIdQuery } from "../features/book/book";

const CashInOutPage = () => {
  const { id } = useParams();
  const { data: bookRes } = useGetSingleBookDataByIdQuery(id, { skip: !id });
  const bookName = bookRes?.data?.name || "Book";
  const [isFundTransferOpen, setIsFundTransferOpen] = useState(false);

  return (
    <div className="flex-1 min-w-0 relative z-10">
      <Header title={bookName} />

      <main className="max-w-8xl w-full min-w-0 mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => setIsFundTransferOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
          >
            <ArrowLeftRight size={18} />
            Fund Transfer
          </button>
        </div>

        <CashInOutTable />
      </main>

      <FundTransferFormModal
        isOpen={isFundTransferOpen}
        onClose={() => setIsFundTransferOpen(false)}
        defaultBookId={id}
        lockBook
      />
    </div>
  );
};
export default CashInOutPage;
