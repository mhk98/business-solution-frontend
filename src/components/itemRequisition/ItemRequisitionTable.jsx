import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import Modal from "../common/Modal";
import { useGetAllItemWithoutQueryQuery } from "../../features/item/item";
import { useGetAllSupplierWithoutQueryQuery } from "../../features/supplier/supplier";
import { useGetAllBookWithoutQueryQuery } from "../../features/book/book";
import { useGetAllBankAccountWithoutQueryQuery } from "../../features/bankAccount/bankAccount";
import {
  useDeleteItemRequisitionMutation,
  useGetAllItemRequisitionQuery,
  useInsertItemRequisitionMutation,
  useUpdateItemRequisitionMutation,
} from "../../features/itemRequisition/itemRequisition";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";

const initialForm = {
  itemId: "",
  supplierId: "",
  bookId: "",
  paymentMode: "",
  bankName: "",
  bankAccount: "",
  quantity: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  note: "",
  remarks: "",
};

const statusOptionsByRole = {
  superAdmin: ["Pending", "Approved"],
  admin: ["Pending", "Approved"],
  accountant: ["Pay For Purchase", "Completed"],
  inventor: ["Item Received"],
};

const statusClasses = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Pay For Purchase": "bg-sky-50 text-sky-700 border-sky-200",
  "Item Received": "bg-indigo-50 text-indigo-700 border-indigo-200",
  Completed: "bg-violet-50 text-violet-700 border-violet-200",
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
};

const formatMoney = (value) =>
  `৳${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const makeOptions = (rows = [], labelBuilder = (row) => row.name) =>
  rows.map((row) => ({
    value: row.Id,
    label: labelBuilder(row),
    row,
  }));

const makeSelectValue = (options, value) => {
  if (value === undefined || value === null || value === "") return null;
  return (
    options.find((option) => String(option.value) === String(value)) || null
  );
};

const getErrorMessage = (error, fallback) =>
  error?.data?.message || error?.message || fallback;

const ItemRequisitionTable = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    itemId: "",
    searchTerm: "",
  });
  const [form, setForm] = useState(initialForm);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const role = localStorage.getItem("role");
  const statusOptions = statusOptionsByRole[role] || [];

  const queryArgs = useMemo(
    () => ({
      page,
      limit,
      startDate: filters.startDate,
      endDate: filters.endDate,
      itemId: filters.itemId,
      searchTerm: filters.searchTerm,
    }),
    [page, limit, filters],
  );

  const { data, isLoading, isFetching } =
    useGetAllItemRequisitionQuery(queryArgs);
  const { data: itemData } = useGetAllItemWithoutQueryQuery();
  const { data: supplierData } = useGetAllSupplierWithoutQueryQuery();
  const { data: bookData } = useGetAllBookWithoutQueryQuery();
  const { data: bankData } = useGetAllBankAccountWithoutQueryQuery();

  const [insertItemRequisition, { isLoading: isCreating }] =
    useInsertItemRequisitionMutation();
  const [updateItemRequisition, { isLoading: isUpdating }] =
    useUpdateItemRequisitionMutation();
  const [deleteItemRequisition] = useDeleteItemRequisitionMutation();

  const rows = data?.data || [];
  const totalCount = data?.meta?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const itemOptions = useMemo(
    () => makeOptions(itemData?.data || []),
    [itemData],
  );
  const supplierOptions = useMemo(
    () => makeOptions(supplierData?.data || []),
    [supplierData],
  );
  const bookOptions = useMemo(
    () => makeOptions(bookData?.data || []),
    [bookData],
  );
  const bankOptions = useMemo(
    () =>
      makeOptions(bankData?.data || [], (row) =>
        [row.bankName || row.name, row.accountNumber || row.accountNo]
          .filter(Boolean)
          .join(" - "),
      ),
    [bankData],
  );

  const resetForm = () => {
    setForm(initialForm);
    setEditingRecord(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setForm({
      itemId: record.itemId || "",
      supplierId: record.supplierId || "",
      bookId: record.bookId || "",
      paymentMode: record.paymentMode || "",
      bankName: record.bankName || "",
      bankAccount: record.bankAccount || "",
      quantity: record.quantity || "",
      amount: record.amount || "",
      date: record.date || new Date().toISOString().slice(0, 10),
      note: record.note || "",
      remarks: record.remarks || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "paymentMode" && value !== "Bank"
        ? { bankName: "", bankAccount: "" }
        : {}),
    }));
  };

  const buildPayload = () => ({
    ...form,
    itemId: Number(form.itemId),
    quantity: Number(form.quantity || 0),
    amount: Number(form.amount || 0),
    userId: localStorage.getItem("userId"),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.itemId) {
      toast.error("Please select an item");
      return;
    }

    if (Number(form.quantity || 0) <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    try {
      const payload = buildPayload();

      if (editingRecord) {
        await updateItemRequisition({
          id: editingRecord.Id,
          data: payload,
        }).unwrap();
        toast.success("Item requisition updated");
      } else {
        await insertItemRequisition(payload).unwrap();
        toast.success("Item requisition created");
      }

      closeModal();
    } catch (error) {
      toast.error(getErrorMessage(error, "Item requisition save failed"));
    }
  };

  const handleStatusChange = async (record, status) => {
    try {
      await updateItemRequisition({
        id: record.Id,
        data: {
          status,
          userRole: role,
          note: record.note || "",
        },
      }).unwrap();
      toast.success("Status updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Status update failed"));
    }
  };

  const handleDelete = async (record) => {
    const confirmed = await requestDeleteConfirmation({
      title: "Delete item requisition?",
      message: `This will delete ${record.name}.`,
    });

    if (!confirmed) return;

    try {
      await deleteItemRequisition(record.Id).unwrap();
      toast.success("Item requisition deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Delete failed"));
    }
  };

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      itemId: "",
      searchTerm: "",
    });
    setPage(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm"
    >
      <div className="p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">
              Item Requisition History
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Track manufacture item requisitions
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-indigo-600">
                <ClipboardList size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                  Total Entries
                </p>
                <p className="text-lg font-bold text-indigo-900">
                  {totalCount}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
            >
              <Plus size={18} />
              Add New
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-5 lg:grid-cols-[1fr_1fr_1fr_1.2fr_1fr]">
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              From
            </span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) => {
                setFilters((prev) => ({
                  ...prev,
                  startDate: event.target.value,
                }));
                setPage(1);
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none focus:border-indigo-400"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              To
            </span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) => {
                setFilters((prev) => ({
                  ...prev,
                  endDate: event.target.value,
                }));
                setPage(1);
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none focus:border-indigo-400"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Per Page
            </span>
            <input
              type="number"
              min="1"
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value || 10));
                setPage(1);
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none focus:border-indigo-400"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Item
            </span>
            <Select
              options={itemOptions}
              value={makeSelectValue(itemOptions, filters.itemId)}
              onChange={(option) => {
                setFilters((prev) => ({
                  ...prev,
                  itemId: option?.value || "",
                }));
                setPage(1);
              }}
              isClearable
              placeholder="Search item..."
              classNamePrefix="react-select"
              className="bg-white text-black"
            />
          </label>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
          >
            <X size={16} />
            Clear Filters
          </button>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Date",
                    "Item",
                    "Quantity",
                    "Amount",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading || isFetching ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-16 text-center text-sm text-slate-400"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((record) => (
                    <tr key={record.Id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatDate(record.date || record.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {record.item?.name || record.name}
                        </div>
                        {record.supplier?.name ? (
                          <div className="text-xs text-slate-500">
                            {record.supplier.name}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                        {record.quantity || 0}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                        {formatMoney(record.amount)}
                      </td>
                      <td className="px-6 py-4">
                        {statusOptions.length ? (
                          <select
                            value={record.status || "Pending"}
                            onChange={(event) =>
                              handleStatusChange(record, event.target.value)
                            }
                            className={`h-9 rounded-full border px-3 text-xs font-bold outline-none ${
                              statusClasses[record.status] ||
                              "border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                          >
                            {[record.status, ...statusOptions]
                              .filter(Boolean)
                              .filter(
                                (value, index, list) =>
                                  list.indexOf(value) === index,
                              )
                              .map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                              statusClasses[record.status] ||
                              "border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                          >
                            {record.status || "Pending"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(record)}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(record)}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-16 text-center text-sm italic text-slate-400"
                    >
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Showing page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-500 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
              Prev
            </button>
            <div className="grid h-11 min-w-11 place-items-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white">
              {page}
            </div>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-500 disabled:opacity-50"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingRecord ? "Edit Item Requisition" : "Add Item Requisition"}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Item
            </span>
            <Select
              options={itemOptions}
              value={makeSelectValue(itemOptions, form.itemId)}
              onChange={(option) => updateForm("itemId", option?.value || "")}
              placeholder="Select manufacture item..."
              classNamePrefix="react-select"
              className="bg-white text-black"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Quantity
            </span>
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(event) => updateForm("quantity", event.target.value)}
              className="h-11 bg-white w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-indigo-400"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Amount
            </span>
            <input
              type="number"
              min="0"
              value={form.amount}
              onChange={(event) => updateForm("amount", event.target.value)}
              className="h-11 bg-white w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-indigo-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Date
            </span>
            <input
              type="date"
              value={form.date}
              onChange={(event) => updateForm("date", event.target.value)}
              className="h-11 bg-white w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-indigo-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Supplier
            </span>
            <Select
              options={supplierOptions}
              value={makeSelectValue(supplierOptions, form.supplierId)}
              onChange={(option) =>
                updateForm("supplierId", option?.value || "")
              }
              isClearable
              placeholder="Select supplier..."
              classNamePrefix="react-select"
              className="bg-white text-black"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Book
            </span>
            <Select
              options={bookOptions}
              value={makeSelectValue(bookOptions, form.bookId)}
              onChange={(option) => updateForm("bookId", option?.value || "")}
              isClearable
              placeholder="Select book..."
              classNamePrefix="react-select"
              className="bg-white text-black"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Payment Mode
            </span>
            <select
              value={form.paymentMode}
              onChange={(event) =>
                updateForm("paymentMode", event.target.value)
              }
              className="h-11 bg-white w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-indigo-400"
            >
              <option value="">Select mode</option>
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
              <option value="Bkash">Bkash</option>
              <option value="Nagad">Nagad</option>
              <option value="Rocket">Rocket</option>
              <option value="Card">Card</option>
            </select>
          </label>

          {form.paymentMode === "Bank" ? (
            <>
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Bank
                </span>
                <Select
                  options={bankOptions}
                  value={makeSelectValue(bankOptions, form.bankAccount)}
                  onChange={(option) => {
                    updateForm("bankAccount", option?.value || "");
                    updateForm(
                      "bankName",
                      option?.row?.bankName || option?.row?.name || "",
                    );
                  }}
                  isClearable
                  placeholder="Select bank..."
                  classNamePrefix="react-select"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Bank Name
                </span>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(event) =>
                    updateForm("bankName", event.target.value)
                  }
                  className="h-11 bg-white w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-indigo-400"
                />
              </label>
            </>
          ) : null}

          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Note
            </span>
            <textarea
              value={form.note}
              onChange={(event) => updateForm("note", event.target.value)}
              rows={3}
              className="w-full bg-white rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-indigo-400"
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 md:col-span-2">
            <button
              type="button"
              onClick={closeModal}
              className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || isUpdating}
              className="h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isCreating || isUpdating ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default ItemRequisitionTable;
