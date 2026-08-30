import { motion } from "framer-motion";
import { Banknote, Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import {
  useDeleteSalaryAdvanceMutation,
  useGetAllSalaryAdvanceQuery,
  useInsertSalaryAdvanceMutation,
  usePaySalaryAdvanceMutation,
  useUpdateSalaryAdvanceMutation,
} from "../../features/salaryAdvance/salaryAdvance";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import Modal from "../common/Modal";
import DateRangeFilter from "../common/DateRangeFilter";

const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  name: "",
  amount: "",
};

const SalaryAdvanceTable = () => {
  const role = localStorage.getItem("role");
  const canManage = ["superAdmin", "admin", "accountant"].includes(role);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [createForm, setCreateForm] = useState(initialForm);
  const [payingItem, setPayingItem] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const [rows, setRows] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640) setPagesPerSet(5);
      else if (window.innerWidth < 1024) setPagesPerSet(7);
      else setPagesPerSet(10);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [startDate, endDate, itemsPerPage]);

  useEffect(() => {
    if (startDate && endDate && startDate > endDate) setEndDate(startDate);
  }, [startDate, endDate]);

  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };
    Object.keys(args).forEach((k) => {
      if (args[k] === undefined || args[k] === null || args[k] === "")
        delete args[k];
    });
    return args;
  }, [currentPage, itemsPerPage, startDate, endDate]);

  const { data, isLoading, isError, error, refetch } =
    useGetAllSalaryAdvanceQuery(queryArgs);

  useEffect(() => {
    if (isError) console.error("Salary Advance fetch error:", error);
    if (!isLoading && data) {
      setRows(data?.data ?? []);
      setTotalPages(
        Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)),
      );
    }
  }, [data, isLoading, isError, error, itemsPerPage]);

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    if (pageNumber < startPage) setStartPage(pageNumber);
    else if (pageNumber > endPage) setStartPage(pageNumber - pagesPerSet + 1);
  };

  const handlePreviousSet = () =>
    setStartPage((prev) => Math.max(prev - pagesPerSet, 1));
  const handleNextSet = () =>
    setStartPage((prev) =>
      Math.min(prev + pagesPerSet, Math.max(totalPages - pagesPerSet + 1, 1)),
    );

  const openAdd = () => {
    setCreateForm(initialForm);
    setIsAddOpen(true);
  };
  const closeAdd = () => {
    setIsAddOpen(false);
    setCreateForm(initialForm);
  };

  const openEdit = (row) => {
    setCurrentItem({
      Id: row.Id,
      date: row.date,
      name: row.name,
      amount: row.amount,
    });
    setIsEditOpen(true);
  };
  const closeEdit = () => {
    setIsEditOpen(false);
    setCurrentItem(null);
  };

  const [insertSalaryAdvance] = useInsertSalaryAdvanceMutation();
  const [updateSalaryAdvance] = useUpdateSalaryAdvanceMutation();
  const [deleteSalaryAdvance] = useDeleteSalaryAdvanceMutation();
  const [paySalaryAdvance] = usePaySalaryAdvanceMutation();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.date) return toast.error("Please select a date");
    if (!createForm.name.trim()) return toast.error("Please enter a name");
    if (!createForm.amount || Number(createForm.amount) <= 0)
      return toast.error("Please enter a valid amount");

    try {
      const res = await insertSalaryAdvance({
        date: createForm.date,
        name: createForm.name.trim(),
        amount: Number(createForm.amount),
      }).unwrap();

      if (res?.success) {
        toast.success("Created!");
        closeAdd();
        refetch?.();
      } else toast.error(res?.message || "Create failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  const handleUpdate = async () => {
    if (!currentItem?.Id) return toast.error("Invalid item");
    if (!currentItem.date) return toast.error("Please select a date");
    if (!String(currentItem.name || "").trim())
      return toast.error("Please enter a name");
    if (!currentItem.amount || Number(currentItem.amount) <= 0)
      return toast.error("Please enter a valid amount");

    try {
      const res = await updateSalaryAdvance({
        id: currentItem.Id,
        data: {
          date: currentItem.date,
          name: currentItem.name.trim(),
          amount: Number(currentItem.amount),
        },
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated!");
        closeEdit();
        refetch?.();
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await requestDeleteConfirmation({
      title: "Delete salary advance entry?",
      message:
        "This entry will be removed permanently. This action cannot be undone.",
    });
    if (!confirmed) return;

    try {
      const res = await deleteSalaryAdvance(id).unwrap();
      if (res?.success !== false) {
        toast.success("Deleted!");
        refetch?.();
      } else toast.error(res?.message || "Delete failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  const openPay = (row) => {
    setPayingItem(row);
    setPaymentAmount("");
  };
  const closePay = () => {
    setPayingItem(null);
    setPaymentAmount("");
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!payingItem?.Id) return toast.error("Invalid item");
    if (!paymentAmount || Number(paymentAmount) <= 0)
      return toast.error("Please enter a valid amount");

    try {
      const res = await paySalaryAdvance({
        id: payingItem.Id,
        data: { amount: Number(paymentAmount) },
      }).unwrap();
      if (res?.success) {
        toast.success("Payment added!");
        closePay();
        refetch?.();
      } else toast.error(res?.message || "Payment failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Payment failed!");
    }
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-slate-900">Salary Advance</h2>
        {canManage && (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 active:bg-indigo-800 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/30 sm:w-auto"
          >
            <Plus size={18} />
            Add Salary Advance
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mb-6 w-full">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          compact
          className="md:col-span-2"
        />

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Per Page:</label>
          <Select
            options={[10, 20, 50, 100].map((v) => ({
              value: v,
              label: String(v),
            }))}
            value={{ value: itemsPerPage, label: String(itemsPerPage) }}
            onChange={(selected) => setItemsPerPage(selected?.value || 10)}
            className="text-black"
          />
        </div>
      </div>

      <div className="mb-6">
        <button
          className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white transition duration-200 p-2 rounded-lg w-36 justify-center"
          onClick={clearFilters}
          type="button"
        >
          Clear Filters
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 bg-white">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Paid
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Advance
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Due
              </th>
              {canManage && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {isLoading && (
              <tr>
                <td
                  colSpan={canManage ? 7 : 6}
                  className="px-6 py-8 text-center text-sm text-slate-500"
                >
                  Loading...
                </td>
              </tr>
            )}

            {!isLoading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={canManage ? 7 : 6}
                  className="px-6 py-8 text-center text-sm text-slate-500"
                >
                  No records found
                </td>
              </tr>
            )}

            {rows.map((row) => {
              const paid = Number(row.paidAmount || 0);
              const due = Number(row.due || 0);
              const advance = Number(row.advance || 0);

              return (
                <motion.tr
                  key={row.Id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {row.date || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {row.name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 tabular-nums">
                    {Number(row.amount || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm tabular-nums font-semibold text-emerald-600">
                    {paid.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm tabular-nums font-semibold text-sky-600">
                    {advance.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm tabular-nums font-semibold text-rose-600">
                    {due.toFixed(2)}
                  </td>
                  {canManage && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        {due > 0 && (
                          <button
                            onClick={() => openPay(row)}
                            className="text-emerald-600 hover:text-emerald-800"
                            title="Pay"
                            type="button"
                          >
                            <Banknote size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(row)}
                          className="text-indigo-600 hover:text-indigo-800"
                          type="button"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(row.Id)}
                          className="text-red-600 hover:text-red-800"
                          type="button"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={handlePreviousSet}
            disabled={startPage === 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 disabled:opacity-40"
            type="button"
          >
            «
          </button>
          {Array.from(
            { length: endPage - startPage + 1 },
            (_, i) => startPage + i,
          ).map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                page === currentPage
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
              type="button"
            >
              {page}
            </button>
          ))}
          <button
            onClick={handleNextSet}
            disabled={endPage >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 disabled:opacity-40"
            type="button"
          >
            »
          </button>
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={closeAdd}
        title="Add Salary Advance"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex flex-col">
            <label className="text-sm text-slate-600 mb-1">Date</label>
            <input
              type="date"
              value={createForm.date}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, date: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-slate-600 mb-1">Name</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Employee name"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-slate-600 mb-1">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={createForm.amount}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, amount: e.target.value }))
              }
              placeholder="Enter amount"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeAdd}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Insert
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={closeEdit}
        title="Edit Salary Advance"
        maxWidth="max-w-md"
      >
        {currentItem && (
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="text-sm text-slate-600 mb-1">Date</label>
              <input
                type="date"
                value={currentItem.date || ""}
                onChange={(e) =>
                  setCurrentItem((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-slate-600 mb-1">Name</label>
              <input
                type="text"
                value={currentItem.name || ""}
                onChange={(e) =>
                  setCurrentItem((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-slate-600 mb-1">Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={currentItem.amount ?? ""}
                onChange={(e) =>
                  setCurrentItem((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeEdit}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Update
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Pay Modal */}
      <Modal
        isOpen={!!payingItem}
        onClose={closePay}
        title="Add Payment"
        maxWidth="max-w-md"
      >
        {payingItem && (
          <form onSubmit={handlePay} className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              <div className="flex justify-between">
                <span>{payingItem.name}</span>
                <span className="font-semibold text-rose-600">
                  Due: {Number(payingItem.due || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-slate-600 mb-1">
                Payment Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter payment amount"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closePay}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Pay
              </button>
            </div>
          </form>
        )}
      </Modal>
    </motion.div>
  );
};

export default SalaryAdvanceTable;
