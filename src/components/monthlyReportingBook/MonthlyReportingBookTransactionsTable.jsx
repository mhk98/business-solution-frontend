import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, BookMarked } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Pagination from "../common/Pagination";
import { useGetMonthlyReportingTransactionsQuery } from "../../features/monthlyReportingBook/monthlyReportingBook";
import { formatRangeLabel } from "./AccountingMonthFilter";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB");
};

const MonthlyReportingBookTransactionsTable = () => {
  const [searchParams] = useSearchParams();
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const bookId = searchParams.get("bookId") || "";

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { data, isLoading, isError, error } = useGetMonthlyReportingTransactionsQuery(
    {
      startDate,
      endDate,
      categoryId,
      bookId: bookId || undefined,
      page: currentPage,
      limit: itemsPerPage,
    },
    { skip: !startDate || !endDate || !categoryId },
  );

  if (isError) console.error("Monthly Reporting Book transactions error:", error);

  const rows = data?.data ?? [];
  const meta = data?.meta ?? {};
  const totalPages = Math.max(1, Math.ceil((meta.count || 0) / itemsPerPage));
  const rangeLabel = formatRangeLabel(
    meta.startDate || startDate,
    meta.endDate || endDate,
  );

  const totalCredit = Number(meta.totalCredit || 0);
  const totalDebit = Number(meta.totalDebit || 0);
  const netBalance = Number(meta.netBalance ?? totalCredit - totalDebit);

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Link
        to="/monthly-reporting-book"
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 mb-6"
      >
        <ArrowLeft size={16} />
        Back to Monthly Reporting Book
      </Link>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100">
          <BookMarked className="text-indigo-600" size={18} />
        </div>
        <div>
          <div className="text-lg font-semibold text-slate-900">
            {meta.categoryName || "Category"}
          </div>
          <div className="text-sm text-slate-500">
            {meta.bookName ? `${meta.bookName} · ` : ""}
            {rangeLabel}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Credit</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
            {isLoading ? "—" : totalCredit.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Debit</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
            {isLoading ? "—" : totalDebit.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Net Balance</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
            {isLoading ? "—" : netBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 pr-4">Date</th>
              <th className="py-3 pr-4">Voucher No</th>
              <th className="py-3 pr-4">Payment Mode</th>
              <th className="py-3 pr-4">Type</th>
              <th className="py-3 pr-4">Remarks</th>
              <th className="py-3 pr-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.Id}
                className="border-b border-slate-100 hover:bg-slate-50 transition"
              >
                <td className="py-3 pr-4 text-slate-800">{formatDate(row.date)}</td>
                <td className="py-3 pr-4 text-slate-800">{row.voucherNo || "-"}</td>
                <td className="py-3 pr-4 text-slate-800">{row.paymentMode || "-"}</td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      row.paymentStatus === "CashIn"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {row.paymentStatus === "CashIn" ? "Credit" : "Debit"}
                  </span>
                </td>
                <td className="py-3 pr-4 text-slate-600">
                  {row.remarks || row.note || "-"}
                </td>
                <td
                  className={`py-3 pr-4 text-right font-medium tabular-nums ${
                    row.paymentStatus === "CashIn"
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  {Number(row.amount || 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!isLoading && rows.length === 0 && (
          <div className="py-10 text-sm text-gray-500">
            No transactions found for {rangeLabel}.
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalCount={meta.count}
        pageSize={itemsPerPage}
      />
    </motion.div>
  );
};

export default MonthlyReportingBookTransactionsTable;
