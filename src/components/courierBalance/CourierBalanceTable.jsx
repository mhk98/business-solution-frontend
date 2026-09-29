import { motion } from "framer-motion";
import { Edit, Plus, Trash2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import {
  useDeleteCourierBalanceMutation,
  useGetAllCourierBalanceQuery,
  useInsertCourierBalanceMutation,
  useUpdateCourierBalanceMutation,
} from "../../features/courierBalance/courierBalance";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import Modal from "../common/Modal";
import DateRangeFilter from "../common/DateRangeFilter";

const today = () => new Date().toISOString().slice(0, 10);

const initialForm = () => ({
  date: today(),
  amount: "",
  note: "",
});

const formatAmount = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 14,
    borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 4px rgba(99,102,241,0.15)" : "none",
    "&:hover": { borderColor: "#cbd5e1" },
    backgroundColor: "#fff",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 12px" }),
  placeholder: (base) => ({ ...base, color: "#64748b" }),
  singleValue: (base) => ({ ...base, color: "#0f172a" }),
  menu: (base) => ({
    ...base,
    borderRadius: 14,
    overflow: "hidden",
    zIndex: 40,
  }),
};

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300";

// Add / edit form fields.
const CourierBalanceFields = ({ form, setForm }) => (
  <>
    <div className="flex flex-col">
      <label className="text-sm text-slate-600 mb-1">Date</label>
      <input
        type="date"
        value={form.date || ""}
        onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
        className={inputClass}
      />
    </div>

    <div className="flex flex-col">
      <label className="text-sm text-slate-600 mb-1">Amount</label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={form.amount ?? ""}
        onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
        placeholder="Enter amount"
        className={inputClass}
      />
    </div>

    <div className="flex flex-col">
      <label className="text-sm text-slate-600 mb-1">Note</label>
      <input
        type="text"
        value={form.note || ""}
        onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
        placeholder="Optional"
        className={inputClass}
      />
    </div>
  </>
);

const validate = (form) => {
  if (!form.date) return "Please select a date";
  if (!form.amount || Number(form.amount) <= 0) return "Please enter a valid amount";
  return null;
};

const toPayload = (form) => ({
  date: form.date,
  amount: Number(form.amount),
  note: String(form.note || "").trim(),
});

const CourierBalanceTable = () => {
  const role = localStorage.getItem("role");
  const canManage = ["superAdmin", "admin", "inventor"].includes(role);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [createForm, setCreateForm] = useState(initialForm);
  const [editForm, setEditForm] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, itemsPerPage]);

  const { data, isLoading, isError, error } = useGetAllCourierBalanceQuery({
    page: currentPage,
    limit: itemsPerPage,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  useEffect(() => {
    if (isError) console.error("Courier Balance fetch error:", error);
  }, [isError, error]);

  const rows = data?.data ?? [];
  const totalAmount = Number(data?.meta?.totalAmount || 0);
  const totalPages = Math.max(
    1,
    Math.ceil((data?.meta?.count || 0) / itemsPerPage),
  );

  const [insertCourierBalance, { isLoading: isCreating }] =
    useInsertCourierBalanceMutation();
  const [updateCourierBalance, { isLoading: isUpdating }] =
    useUpdateCourierBalanceMutation();
  const [deleteCourierBalance] = useDeleteCourierBalanceMutation();

  const closeAdd = () => {
    setIsAddOpen(false);
    setCreateForm(initialForm());
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const problem = validate(createForm);
    if (problem) return toast.error(problem);

    try {
      const res = await insertCourierBalance(toPayload(createForm)).unwrap();
      if (res?.success) {
        toast.success("Courier balance added!");
        closeAdd();
      } else toast.error(res?.message || "Create failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const problem = validate(editForm);
    if (problem) return toast.error(problem);

    try {
      const res = await updateCourierBalance({
        id: editForm.Id,
        data: toPayload(editForm),
      }).unwrap();
      if (res?.success) {
        toast.success("Courier balance updated!");
        setEditForm(null);
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await requestDeleteConfirmation({
      title: "Delete courier balance entry?",
      message: "This entry will be removed. This action cannot be undone.",
    });
    if (!confirmed) return;

    try {
      const res = await deleteCourierBalance(id).unwrap();
      if (res?.success !== false) toast.success("Deleted!");
      else toast.error(res?.message || "Delete failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  const colSpan = canManage ? 4 : 3;

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-slate-900">Courier Balance</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">
            <Wallet size={18} className="text-emerald-600" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                Total Balance
              </p>
              <p className="text-lg font-bold tabular-nums text-emerald-700">
                ৳{formatAmount(totalAmount)}
              </p>
            </div>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 active:bg-indigo-800 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/30 sm:w-auto"
            >
              <Plus size={18} />
              Add Courier Balance
            </button>
          )}
        </div>
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
            styles={selectStyles}
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
                Note
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Amount
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
                <td colSpan={colSpan} className="px-6 py-8 text-center text-sm text-slate-500">
                  Loading...
                </td>
              </tr>
            )}

            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-6 py-8 text-center text-sm text-slate-500">
                  No records found
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <tr key={row.Id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {row.date || "-"}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {row.note || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-slate-900 tabular-nums">
                  {formatAmount(row.amount)}
                </td>
                {canManage && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          setEditForm({
                            Id: row.Id,
                            date: row.date,
                            amount: row.amount,
                            note: row.note || "",
                          })
                        }
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
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-emerald-50">
              <tr>
                <td colSpan={2} className="px-6 py-3 text-sm font-bold text-emerald-700">
                  Total
                </td>
                <td className="px-6 py-3 text-right text-sm font-bold text-emerald-700 tabular-nums">
                  {formatAmount(totalAmount)}
                </td>
                {canManage && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
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
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={closeAdd}
        title="Add Courier Balance"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <CourierBalanceFields
            form={createForm}
            setForm={setCreateForm}
          />
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
              disabled={isCreating}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {isCreating ? "Saving..." : "Submit"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editForm}
        onClose={() => setEditForm(null)}
        title="Edit Courier Balance"
        maxWidth="max-w-md"
      >
        {editForm && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <CourierBalanceFields
              form={editForm}
              setForm={setEditForm}
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditForm(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {isUpdating ? "Updating..." : "Update"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </motion.div>
  );
};

export default CourierBalanceTable;
