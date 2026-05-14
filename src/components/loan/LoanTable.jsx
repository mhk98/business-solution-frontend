import { motion } from "framer-motion";
import { HandCoins, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGetLoanSummariesQuery } from "../../features/cashInOut/cashInOut";
import useDebounce from "../../hooks/useDebounce";


const formatAmount = (value) => Number(value || 0).toLocaleString();

const LoanTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const itemsPerPage = 10;
  const pagesPerSet = 10;
  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const { data, isLoading, isError, error } = useGetLoanSummariesQuery({
    page: currentPage,
    limit: itemsPerPage,
    searchTerm: debouncedSearchTerm || undefined,
  });

  const rows = data?.data || [];
  const meta = data?.meta || {};

  useEffect(() => {
    if (isError) console.error("Error fetching loan data", error);
    if (!isLoading) {
      setTotalPages(Math.max(1, Math.ceil((meta.count || 0) / itemsPerPage)));
    }
  }, [error, isError, isLoading, meta.count]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    if (pageNumber < startPage) setStartPage(pageNumber);
    else if (pageNumber > endPage) setStartPage(pageNumber - pagesPerSet + 1);
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-6">
        <SummaryCard label="Total Loan নিয়েছি" value={meta.totalLoanTaken} tone="emerald" />
        <SummaryCard label="Total Loan দিয়েছি" value={meta.totalLoanGiven} tone="rose" />
        <SummaryCard label="Net Balance" value={meta.netBalance} tone="indigo" />
      </div>

      <div className="relative w-full sm:max-w-[520px]">
        <input
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
            setStartPage(1);
          }}
          placeholder="Search loan person..."
          className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
        />
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 overflow-hidden">
        {rows.map((item) => (
          <div
            key={item.lender}
            className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200 bg-white hover:bg-slate-50 transition"
          >
            <Link
              to={`/loan/${encodeURIComponent(item.lender)}`}
              className="flex min-w-0 items-center gap-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
                <HandCoins className="text-indigo-600" size={18} />
              </div>
              <div>
                <p className="truncate text-[15px] font-semibold text-slate-900 hover:text-indigo-600">
                  {item.lender}
                </p>
                <p className="text-xs text-slate-500">
                  নিয়েছি {formatAmount(item.totalLoanTaken)} · দিয়েছি {formatAmount(item.totalLoanGiven)}
                </p>
              </div>
            </Link>

            <div className="min-w-[120px] shrink-0 text-right">
              <p className="text-[11px] font-medium text-slate-400">Net Balance</p>
              <p className="text-sm font-semibold tabular-nums text-slate-900">
                {formatAmount(item.netBalance)}
              </p>
            </div>
          </div>
        ))}

        {!isLoading && rows.length === 0 && (
          <div className="px-6 py-10 text-sm text-slate-500">No loan data found</div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
        <button
          onClick={() => setStartPage((p) => Math.max(p - pagesPerSet, 1))}
          disabled={startPage === 1}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
        >
          Prev
        </button>

        {[...Array(endPage - startPage + 1)].map((_, index) => {
          const pageNum = startPage + index;
          const active = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`px-4 py-2 rounded-xl border transition ${
                active
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={() => setStartPage((p) => Math.min(p + pagesPerSet, Math.max(1, totalPages - pagesPerSet + 1)))}
          disabled={endPage === totalPages}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
        >
          Next
        </button>
      </div>
    </motion.div>
  );
};

const SummaryCard = ({ label, value, tone }) => {
  const toneClass = {
    emerald: "from-emerald-50/70 text-emerald-600 bg-emerald-50 border-emerald-100",
    rose: "from-rose-50/70 text-rose-600 bg-rose-50 border-rose-100",
    indigo: "from-indigo-50/70 text-indigo-600 bg-indigo-50 border-indigo-100",
  }[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br ${toneClass.split(" ")[0]} to-transparent`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
            {formatAmount(value)}
          </p>
        </div>
        <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${toneClass}`}>
          <HandCoins size={18} />
        </div>
      </div>
    </div>
  );
};

export default LoanTable;
