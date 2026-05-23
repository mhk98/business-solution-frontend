import { motion } from "framer-motion";
import { Edit, HandCoins, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  useDeleteLoanMutation,
  useGetAllLoanQuery,
  useInsertLoanMutation,
  useUpdateLoanMutation,
} from "../../features/loan/loan";
import useDebounce from "../../hooks/useDebounce";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import Modal from "../common/Modal";

const formatAmount = (value) => Number(value || 0).toLocaleString();

const emptyForm = { name: "", note: "", status: "Active" };

const LoanTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const itemsPerPage = 10;
  const pagesPerSet = 10;
  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const { data, isLoading, isError, error } = useGetAllLoanQuery({
    page: currentPage,
    limit: itemsPerPage,
    searchTerm: debouncedSearchTerm || undefined,
  });
  const [insertLoan, { isLoading: isCreating }] = useInsertLoanMutation();
  const [updateLoan, { isLoading: isUpdating }] = useUpdateLoanMutation();
  const [deleteLoan] = useDeleteLoanMutation();

  const rows = data?.data || [];
  const meta = data?.meta || {};
  const isSaving = isCreating || isUpdating;

  useEffect(() => {
    if (isError) console.error("Error fetching loan data", error);
    if (!isLoading) {
      setTotalPages(Math.max(1, Math.ceil((meta.count || 0) / itemsPerPage)));
    }
  }, [error, isError, isLoading, meta.count]);

  const summary = useMemo(
    () => ({
      totalLoanTaken: meta.totalLoanTaken || 0,
      totalLoanPaid: meta.totalLoanPaid ?? meta.totalLoanGiven ?? 0,
      netBalance: meta.netBalance || 0,
    }),
    [meta],
  );

  const openCreateModal = () => {
    setEditingLoan(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (loan) => {
    setEditingLoan(loan);
    setForm({
      name: loan.name || "",
      note: loan.note || "",
      status: loan.status || "Active",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLoan(null);
    setForm(emptyForm);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      note: form.note.trim(),
      status: form.status || "Active",
    };
    if (!payload.name) return toast.error("Loan name is required!");

    try {
      const res = editingLoan
        ? await updateLoan({ id: editingLoan.Id, data: payload }).unwrap()
        : await insertLoan(payload).unwrap();
      if (res?.success) {
        toast.success(editingLoan ? "Loan updated!" : "Loan added!");
        closeModal();
      } else {
        toast.error(res?.message || "Save failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Save failed!");
    }
  };

  const handleDelete = async (loan) => {
    const confirmed = await requestDeleteConfirmation({
      title: "Delete loan?",
      itemName: loan.name,
    });
    if (!confirmed) return;

    try {
      const res = await deleteLoan(loan.Id).unwrap();
      if (res?.success) toast.success("Loan deleted!");
      else toast.error(res?.message || "Delete failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

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
        <SummaryCard label="Total Loan নিয়েছি" value={summary.totalLoanTaken} tone="emerald" />
        <SummaryCard label="Total পরিশোধ" value={summary.totalLoanPaid} tone="rose" />
        <SummaryCard label="কত পাবে" value={summary.netBalance} tone="indigo" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus size={18} />
          Add Loan
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 bg-white">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Name</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Loan নিয়েছি</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">পরিশোধ</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">কত পাবে</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((item) => (
              <tr key={item.Id} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <Link to={`/loan/${item.Id}`} className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
                      <HandCoins className="text-indigo-600" size={18} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900 hover:text-indigo-600">
                        {item.name}
                      </span>
                      {item.note && <span className="block text-xs text-slate-500">{item.note}</span>}
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-4 text-sm tabular-nums text-slate-700">{formatAmount(item.totalLoanTaken)}</td>
                <td className="px-5 py-4 text-sm tabular-nums text-slate-700">{formatAmount(item.totalLoanPaid)}</td>
                <td className="px-5 py-4 text-sm font-semibold tabular-nums text-slate-900">{formatAmount(item.netBalance)}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {item.status || "Active"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                  No loan data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingLoan ? "Edit Loan" : "Add Loan"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-slate-900 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Loan person name"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-slate-900 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">Note</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              className="min-h-[96px] w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Optional note"
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={closeModal} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

const SummaryCard = ({ label, value, tone }) => {
  const toneClass = {
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100",
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
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
