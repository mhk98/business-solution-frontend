import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import Select from "react-select";

import DateRangeFilter from "../common/DateRangeFilter";
import TableSkeleton from "../common/TableSkeleton";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import { useGetAllBookWithoutQueryQuery } from "../../features/book/book";
import { useGetSingleDollarSupplierQuery } from "../../features/dollarSupplier/dollarSupplier";
import {
  useDeleteDollarSupplierHistoryMutation,
  useGetAllDollarSupplierHistoryQuery,
} from "../../features/dollarSupplierHistory/dollarSupplierHistory";

const fmt = (v) => Number(v || 0).toLocaleString();

const statusClass = (s) => {
  if (s === "Paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "Advance") return "bg-sky-50 text-sky-700 border-sky-200";
  if (s === "Due") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
};

const DollarSupplierHistoryTable = () => {
  const { id } = useParams(); // dollarSupplierId
  const role = localStorage.getItem("role");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [book, setBook] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, book, itemsPerPage]);

  const { data: supplierRes } = useGetSingleDollarSupplierQuery(id, { skip: !id });
  const supplierName = supplierRes?.data?.name || "Dollar Supplier";

  const { data: allBookRes } = useGetAllBookWithoutQueryQuery();
  const bookOptions = useMemo(
    () => (allBookRes?.data || []).map((b) => ({ value: b.Id, label: b.name })),
    [allBookRes],
  );

  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      dollarSupplierId: id,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      bookId: book || undefined,
    };
    Object.keys(args).forEach((k) => {
      if (args[k] === undefined || args[k] === null || args[k] === "")
        delete args[k];
    });
    return args;
  }, [currentPage, itemsPerPage, id, startDate, endDate, book]);

  const { data, isLoading, isFetching, refetch } =
    useGetAllDollarSupplierHistoryQuery(queryArgs, {
      skip: !id,
      pollingInterval: 3000,
    });

  const rows = data?.data || [];
  const meta = data?.meta || {};
  const totalPaid = Number(meta.totalPaid || 0);
  const totalAdvance = Number(meta.totalAdvance ?? meta.netBalance ?? 0);
  const totalDue = Number(meta.totalDue ?? meta.totalUnpaid ?? 0);
  const totalCount = Number(meta.count ?? meta.total ?? rows.length);
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  const [deleteHistory] = useDeleteDollarSupplierHistoryMutation();
  const handleDelete = async (rowId) => {
    const ok = await requestDeleteConfirmation({
      message: "Delete this entry?",
    });
    if (!ok) return;
    try {
      const res = await deleteHistory(rowId).unwrap();
      if (res?.success !== false) {
        toast.success("Entry deleted");
        refetch?.();
      } else toast.error(res?.message || "Delete failed");
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed");
    }
  };

  const canManage = role === "superAdmin" || role === "admin";

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900">{supplierName}</h2>
        <p className="text-sm text-slate-500">Transaction statement</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-6">
        <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
            Total Paid
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700 tabular-nums">
            ৳{isLoading ? "—" : fmt(totalPaid)}
          </p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide">
            Total Advance
          </p>
          <p className="mt-2 text-2xl font-bold text-sky-700 tabular-nums">
            ৳{isLoading ? "—" : fmt(totalAdvance)}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide">
            Total Due
          </p>
          <p className="mt-2 text-2xl font-bold text-rose-600 tabular-nums">
            ৳{isLoading ? "—" : fmt(totalDue)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end w-full mb-4">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          compact
          className="md:col-span-2"
        />
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Book</label>
          <Select
            options={bookOptions}
            value={
              bookOptions.find((o) => String(o.value) === String(book)) || null
            }
            onChange={(s) => setBook(s?.value || "")}
            placeholder="Select Book"
            isClearable
            className="text-black"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Per Page</label>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        {isLoading && <TableSkeleton rows={6} columns={5} />}
        {!isLoading && (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Book
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Note
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  USD × Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Type
                </th>
                {canManage && <th className="px-6 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.map((rp) => (
                <tr key={rp.Id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.date || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-tighter">
                      {rp?.book?.name || "No Book"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 max-w-[240px] truncate">
                    {rp.note || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums text-slate-500">
                    {rp.usdAmount
                      ? `$${fmt(rp.usdAmount)} × ${Number(rp.usdRate || 0)}`
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold tabular-nums text-slate-900">
                    ৳{fmt(rp.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${statusClass(
                        rp.displayStatus || rp.status,
                      )}`}
                    >
                      {rp.displayStatus || rp.status}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {rp.rawStatus !== "Paid" && !rp.cashInOutId ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(rp.Id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-white transition"
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {rp.cashInOutId ? "From Book" : ""}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={canManage ? 7 : 6}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
          >
            Prev
          </button>
          <span className="px-4 py-2 text-sm text-slate-600">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
          >
            Next
          </button>
        </div>
      )}

      {isFetching && !isLoading && (
        <p className="mt-3 text-center text-xs text-slate-400">Refreshing…</p>
      )}
    </motion.div>
  );
};

export default DollarSupplierHistoryTable;
