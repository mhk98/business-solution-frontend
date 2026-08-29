import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BookMarked, Download, Printer, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Pagination from "../common/Pagination";
import useDebounce from "../../hooks/useDebounce";
import { useGetMonthlyReportingSummaryQuery } from "../../features/monthlyReportingBook/monthlyReportingBook";
import { useGetAllBookWithoutQueryQuery } from "../../features/book/book";
import { useBookStatementExport } from "../../hooks/useBookStatementExport";
import ReportPreviewModal from "../cashIn/ReportPreviewModal";
import AccountingMonthFilter, {
  getAccountingCycleRange,
  formatRangeLabel,
} from "./AccountingMonthFilter";

const defaultRange = getAccountingCycleRange(0);

const MonthlyReportingBookTable = () => {
  const [range, setRange] = useState({
    from: defaultRange.from,
    to: defaultRange.to,
    label: formatRangeLabel(defaultRange.from, defaultRange.to),
  });
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const navigate = useNavigate();

  const { data: booksRes } = useGetAllBookWithoutQueryQuery();
  const books = booksRes?.data ?? [];

  useEffect(() => {
    setCurrentPage(1);
  }, [range.from, range.to, debouncedSearchTerm, selectedBookId]);

  const { data, isLoading, isError, error } = useGetMonthlyReportingSummaryQuery({
    startDate: range.from,
    endDate: range.to,
    bookId: selectedBookId || undefined,
    searchTerm: debouncedSearchTerm || undefined,
    page: currentPage,
    limit: itemsPerPage,
  });

  if (isError) console.error("Monthly Reporting Book summary error:", error);

  const rows = data?.data ?? [];
  const meta = data?.meta ?? {};
  const totalPages = Math.max(1, Math.ceil((meta.count || 0) / itemsPerPage));

  const totalCredit = Number(meta.totalCredit || 0);
  const totalDebit = Number(meta.totalDebit || 0);
  const netBalance = Number(meta.netBalance ?? totalCredit - totalDebit);

  const selectedBookName = selectedBookId
    ? books.find((book) => String(book.Id) === String(selectedBookId))?.name
    : "";
  const reportTitle = selectedBookName
    ? `${selectedBookName} — ${range.label}`
    : `All Books — ${range.label}`;

  const handleRowClick = (row) => {
    const params = new URLSearchParams({
      startDate: range.from,
      endDate: range.to,
      categoryId: row.categoryId,
    });
    if (row.bookId) params.set("bookId", row.bookId);

    navigate(`/monthly-reporting-book/transactions?${params.toString()}`);
  };

  const { preview, closePreview, exportStatement } = useBookStatementExport();

  const handleStatement = (autoPrint) =>
    exportStatement({
      range,
      bookId: selectedBookId,
      bookName: selectedBookName,
      searchTerm: debouncedSearchTerm,
      autoPrint,
      title: reportTitle,
    });

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,280px)_minmax(180px,240px)_minmax(220px,1fr)_auto] gap-4 items-end mb-6 w-full">
        <AccountingMonthFilter onChange={setRange} />

        <div className="flex flex-col w-full">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">
            Book
          </label>
          <select
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          >
            <option value="">All Books</option>
            {books.map((book) => (
              <option key={book.Id} value={book.Id}>
                {book.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:max-w-[420px]">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by category name..."
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 pr-12 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          />
          <Search
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
            size={18}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => handleStatement(false)}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2.5 text-sm font-semibold transition"
          >
            <Download size={16} />
            PDF Download
          </button>
          <button
            type="button"
            onClick={() => handleStatement(true)}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-60 text-white px-4 py-2.5 text-sm font-semibold transition"
          >
            <Printer size={16} />
            Print
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-8">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-emerald-50/70 to-transparent" />
          <div className="relative">
            <p className="text-xs font-medium text-slate-500">
              Total Credit &middot; {range.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
              {isLoading ? "—" : totalCredit.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-rose-50/70 to-transparent" />
          <div className="relative">
            <p className="text-xs font-medium text-slate-500">
              Total Debit &middot; {range.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
              {isLoading ? "—" : totalDebit.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-indigo-50/70 to-transparent" />
          <div className="relative">
            <p className="text-xs font-medium text-slate-500">Net Balance</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
              {isLoading ? "—" : netBalance.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 pr-4">Book</th>
              <th className="py-3 pr-4">Category</th>
              <th className="py-3 pr-4 text-right">Credit</th>
              <th className="py-3 pr-4 text-right">Debit</th>
              <th className="py-3 pr-4 text-right">Net Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.bookId || "no-book"}-${row.categoryId}`}
                onClick={() => handleRowClick(row)}
                className="border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition"
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2 text-slate-800">
                    <BookMarked size={16} className="text-indigo-500" />
                    {row.bookName || "—"}
                  </div>
                </td>
                <td className="py-3 pr-4 text-slate-800">
                  {row.categoryName || "—"}
                </td>
                <td className="py-3 pr-4 text-right font-medium text-emerald-600 tabular-nums">
                  {Number(row.totalCredit || 0).toLocaleString()}
                </td>
                <td className="py-3 pr-4 text-right font-medium text-rose-600 tabular-nums">
                  {Number(row.totalDebit || 0).toLocaleString()}
                </td>
                <td className="py-3 pr-4 text-right font-semibold text-slate-900 tabular-nums">
                  {Number(row.netBalance || 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!isLoading && rows.length === 0 && (
          <div className="py-10 text-sm text-gray-500">
            No transactions found for {range.label}.
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

      <ReportPreviewModal
        open={preview.open}
        onClose={closePreview}
        type="pdf"
        blobUrl={preview.blobUrl}
        loading={preview.loading}
        title={preview.title}
        downloadName={preview.downloadName}
        autoPrint={preview.autoPrint}
      />
    </motion.div>
  );
};

export default MonthlyReportingBookTable;
