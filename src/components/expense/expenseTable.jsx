import { motion } from "framer-motion";
import { Edit, Plus, Trash2, X, ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import {
  useDeleteExpenseMutation,
  useGetAllExpenseQuery,
  useInsertExpenseMutation,
  useUpdateExpenseMutation,
} from "../../features/expense/expense";
import Modal from "../common/Modal";

const ExpenseTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen1, setIsModalOpen1] = useState(false);
  const [currentExpense, setCurrentExpense] = useState(null);

  const [createExpense, setCreateExpense] = useState({ name: "", amount: "" });
  const [expenses, setExpenses] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expenseFilter, setExpenseFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);
  const itemsPerPage = 10;

  useEffect(() => {
    const updatePagesPerSet = () => {
      if (window.innerWidth < 640) setPagesPerSet(5);
      else if (window.innerWidth < 1024) setPagesPerSet(7);
      else setPagesPerSet(10);
    };
    updatePagesPerSet();
    window.addEventListener("resize", updatePagesPerSet);
    return () => window.removeEventListener("resize", updatePagesPerSet);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [startDate, endDate, expenseFilter]);

  const queryArgs = useMemo(() => ({
    page: currentPage,
    limit: itemsPerPage,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    name: expenseFilter || undefined,
  }), [currentPage, itemsPerPage, startDate, endDate, expenseFilter]);

  const { data, isLoading, refetch } = useGetAllExpenseQuery(queryArgs);

  useEffect(() => {
    if (!isLoading && data) {
      setExpenses(data.data || []);
      setTotalPages(Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)));
    }
  }, [data, isLoading, itemsPerPage]);

  const handleEditClick = (expense) => {
    setCurrentExpense({ ...expense });
    setIsModalOpen(true);
  };

  const [insertExpense] = useInsertExpenseMutation();
  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      const res = await insertExpense({
        name: createExpense.name.trim(),
        amount: Number(createExpense.amount),
      }).unwrap();
      if (res?.success) {
        toast.success("Successfully created expense");
        setIsModalOpen1(false);
        setCreateExpense({ name: "", amount: "" });
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  const [updateExpense] = useUpdateExpenseMutation();
  const handleUpdateExpenseAction = async (e) => {
    e.preventDefault();
    try {
      const res = await updateExpense({
        id: currentExpense.Id,
        data: {
          name: currentExpense.name.trim(),
          amount: Number(currentExpense.amount),
        },
      }).unwrap();
      if (res?.success) {
        toast.success("Successfully updated!");
        setIsModalOpen(false);
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const [deleteExpense] = useDeleteExpenseMutation();
  const handleDeleteExpenseAction = async (id) => {
    if (await requestDeleteConfirmation({ message: "Do you want to delete this item?" })) {
      try {
        const res = await deleteExpense(id).unwrap();
        if (res?.success) {
          toast.success("Deleted successfully!");
          refetch();
        }
      } catch (err) {
        toast.error(err?.data?.message || "Delete failed!");
      }
    }
  };

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);
  const handlePageChange = (p) => {
    setCurrentPage(p);
    if (p < startPage) setStartPage(p);
    else if (p > endPage) setStartPage(p - pagesPerSet + 1);
  };

  const handlePreviousSet = () => setStartPage((p) => Math.max(p - pagesPerSet, 1));
  const handleNextSet = () => setStartPage((p) => Math.min(p + pagesPerSet, Math.max(1, totalPages - pagesPerSet + 1)));

  const expenseOptions = (data?.data || []).map((p) => ({
    value: p.name,
    label: p.name,
  }));

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 14,
      borderColor: state.isFocused ? "#6366f1" : "#e2e8f0",
      boxShadow: state.isFocused ? "0 0 0 4px rgba(99,102,241,0.1)" : "none",
      "&:hover": { borderColor: "#cbd5e1" },
      backgroundColor: "white",
    }),
    placeholder: (base) => ({ ...base, color: "#94a3b8", fontSize: "14px" }),
    singleValue: (base) => ({ ...base, color: "#1e293b", fontSize: "14px", fontWeight: "500" }),
    menu: (base) => ({
      ...base,
      borderRadius: 14,
      overflow: "hidden",
      border: "1px solid #f1f5f9",
      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
      zIndex: 50
    }),
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-sm rounded-3xl p-4 sm:p-8 border border-slate-100 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Expense Tracker</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Monitor and categorize your business expenditures</p>
        </div>
        <button
          className="group relative inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 active:scale-95 overflow-hidden"
          onClick={() => setIsModalOpen1(true)}
          type="button"
        >
          <Plus size={18} /> Log New Expense
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 items-end">
        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium text-sm"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium text-sm"
          />
        </div>

        <div className="flex flex-col lg:col-span-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Search Meta</label>
          <Select
            options={expenseOptions}
            value={expenseOptions.find(o => o.value === expenseFilter) || null}
            onChange={(s) => setExpenseFilter(s?.value || "")}
            placeholder="Search name..."
            isClearable
            styles={selectStyles}
          />
        </div>

        <button
          className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 transition rounded-xl px-4 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 border border-slate-200"
          onClick={() => { setStartDate(""); setEndDate(""); setExpenseFilter(""); }}
          type="button"
        >
          <X size={16} /> Reset
        </button>
      </div>

      {/* Table */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Expense Description
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Amount Paid
                </th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {expenses.map((rp) => (
                <motion.tr
                  key={rp.Id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-indigo-50/30 transition-colors group"
                >
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                        <Receipt size={18} />
                      </div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                        {rp.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="inline-flex items-center px-4 py-1.5 rounded-2xl text-xs font-black bg-rose-50 text-rose-700 border border-rose-100 shadow-sm shadow-rose-50 tabular-nums">
                      ৳ {Number(rp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </td>

                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEditClick(rp)}
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition shadow-sm active:scale-90"
                        title="Edit"
                        type="button"
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        onClick={() => handleDeleteExpenseAction(rp.Id)}
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition shadow-sm active:scale-90"
                        title="Delete"
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {isLoading && (
            <div className="py-24 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-[3px] border-indigo-600/20 border-t-indigo-600"></div>
            </div>
          )}

          {!isLoading && expenses.length === 0 && (
            <div className="py-24 text-center text-slate-400">
              <div className="text-4xl mb-4 opacity-20">💸</div>
              <p className="font-bold text-sm italic">No expense records found</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between mt-10 gap-6 px-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Showing Page <span className="text-indigo-600">{currentPage}</span> of <span className="text-slate-900">{totalPages}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousSet}
            disabled={startPage === 1}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <div className="flex items-center gap-1.5">
            {[...Array(endPage - startPage + 1)].map((_, index) => {
              const pageNum = startPage + index;
              const active = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`h-11 w-11 rounded-2xl font-black text-sm transition-all active:scale-90 ${active ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100" : "bg-white text-slate-600 border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600"
                    }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleNextSet}
            disabled={endPage === totalPages}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Update Meta Expense info">
        <form onSubmit={handleUpdateExpenseAction} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Meta Name</label>
            <input
              type="text"
              required
              value={currentExpense?.name || ""}
              onChange={(e) => setCurrentExpense({ ...currentExpense, name: e.target.value })}
              className="h-12 border border-slate-200 rounded-2xl px-4 w-full text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold"
              placeholder="e.g. Office Rent"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Standard Amount</label>
            <input
              type="number"
              step="0.01"
              required
              value={currentExpense?.amount || ""}
              onChange={(e) => setCurrentExpense({ ...currentExpense, amount: e.target.value })}
              className="h-12 border border-slate-200 rounded-2xl px-4 w-full text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold"
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100">Save Changes</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isModalOpen1} onClose={() => setIsModalOpen1(false)} title="Add Meta Expense record">
        <form onSubmit={handleCreateExpense} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Item Description</label>
            <input
              type="text"
              required
              value={createExpense.name}
              onChange={(e) => setCreateExpense({ ...createExpense, name: e.target.value })}
              className="h-12 border border-slate-200 rounded-2xl px-4 w-full bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold"
              placeholder="e.g. Electricity Bill"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Payment Amount</label>
            <input
              type="number"
              step="0.01"
              required
              value={createExpense.amount}
              onChange={(e) => setCreateExpense({ ...createExpense, amount: e.target.value })}
              className="h-12 border border-slate-200 rounded-2xl px-4 w-full bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold"
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen1(false)} className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100">Log Expense</button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default ExpenseTable;
