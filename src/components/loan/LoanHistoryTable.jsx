import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useGetLoanHistoryQuery } from "../../features/cashInOut/cashInOut";
import useDebounce from "../../hooks/useDebounce";


const formatAmount = (value) => Number(value || 0).toLocaleString();

const LoanHistoryTable = () => {
  const { lender: lenderParam } = useParams();
  const lender = decodeURIComponent(lenderParam || "");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const itemsPerPage = 10;
  const { data, isLoading, isError, error } = useGetLoanHistoryQuery({
    lender,
    page: currentPage,
    limit: itemsPerPage,
    searchTerm: debouncedSearchTerm || undefined,
  });

  const rows = data?.data || [];
  const meta = data?.meta || {};

  useEffect(() => {
    if (isError) console.error("Error fetching loan history", error);
    if (!isLoading) {
      setTotalPages(Math.max(1, Math.ceil((meta.count || 0) / itemsPerPage)));
    }
  }, [error, isError, isLoading, meta.count]);

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Loan History</p>
          <h2 className="text-xl font-semibold text-slate-900">{lender}</h2>
        </div>
        <Link to="/loan" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-6">
        <Summary label="Total Loan নিয়েছি" value={meta.totalLoanTaken} />
        <Summary label="Total Loan দিয়েছি" value={meta.totalLoanGiven} />
        <Summary label="Net Balance" value={meta.netBalance} />
      </div>

      <div className="relative w-full sm:max-w-[520px] mb-6">
        <input
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search history..."
          className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
        />
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 bg-white">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Payment Mode</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Remarks</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => {
              const isTaken = row.paymentStatus === "CashIn";
              return (
                <tr key={row.Id ?? row.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{row.date || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${isTaken ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                      {isTaken ? "Loan নিয়েছি" : "Loan দিয়েছি"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{row.paymentMode || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{row.remarks || row.note || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 tabular-nums">{formatAmount(row.amount)}</td>
                </tr>
              );
            })}

            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-sm text-slate-600">
                  No loan history found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
        {[...Array(totalPages)].map((_, index) => {
          const pageNum = index + 1;
          return (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              className={`px-4 py-2 rounded-xl border transition ${
                pageNum === currentPage
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

const Summary = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
      {formatAmount(value)}
    </p>
  </div>
);

export default LoanHistoryTable;
