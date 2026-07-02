import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Edit,
  Plus,
  Search,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useGetAllBookWithoutQueryQuery } from "../../features/book/book";
import {
  useDeleteOwnerMutation,
  useDeleteOwnerTransactionMutation,
  useGetAllOwnerQuery,
  useGetAllOwnerTransactionQuery,
  useInsertOwnerMutation,
  useInsertOwnerTransactionMutation,
  useUpdateOwnerMutation,
  useUpdateOwnerTransactionMutation,
} from "../../features/ownerTransaction/ownerTransaction";
import useDebounce from "../../hooks/useDebounce";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import Modal from "../common/Modal";

const formatAmount = (value) => `৳${Number(value || 0).toLocaleString()}`;
const today = () => new Date().toISOString().slice(0, 10);

const ownerEmptyForm = { name: "", note: "", status: "Active" };
const transactionEmptyForm = {
  ownerId: "",
  bookId: "",
  amount: "",
  remarks: "",
  type: "Deposit",
  date: today(),
  status: "Active",
};

const OwnerTransactionTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [ownerForm, setOwnerForm] = useState(ownerEmptyForm);
  const [transactionForm, setTransactionForm] = useState(transactionEmptyForm);

  const itemsPerPage = 10;

  const { data: bookRes } = useGetAllBookWithoutQueryQuery();
  const { data: ownerRes, isLoading: ownersLoading } = useGetAllOwnerQuery({
    page: 1,
    limit: 100,
  });
  const { data, isLoading, isError, error } = useGetAllOwnerTransactionQuery({
    page: currentPage,
    limit: itemsPerPage,
    searchTerm: debouncedSearchTerm || undefined,
  });

  const [insertOwner, { isLoading: creatingOwner }] = useInsertOwnerMutation();
  const [updateOwner, { isLoading: updatingOwner }] = useUpdateOwnerMutation();
  const [deleteOwner] = useDeleteOwnerMutation();
  const [insertTransaction, { isLoading: creatingTransaction }] =
    useInsertOwnerTransactionMutation();
  const [updateTransaction, { isLoading: updatingTransaction }] =
    useUpdateOwnerTransactionMutation();
  const [deleteTransaction] = useDeleteOwnerTransactionMutation();

  const books = bookRes?.data || [];
  const owners = ownerRes?.data || [];
  const rows = data?.data || [];
  const meta = data?.meta || {};
  const ownerSaving = creatingOwner || updatingOwner;
  const transactionSaving = creatingTransaction || updatingTransaction;

  useEffect(() => {
    if (isError) console.error("Error fetching owner transactions", error);
    if (!isLoading) {
      setTotalPages(Math.max(1, Math.ceil((meta.count || 0) / itemsPerPage)));
    }
  }, [error, isError, isLoading, meta.count]);

  const ownerSummary = useMemo(
    () =>
      owners.reduce(
        (acc, owner) => ({
          deposit: acc.deposit + Number(owner.totalDeposit || 0),
          withdraw: acc.withdraw + Number(owner.totalWithdraw || 0),
        }),
        { deposit: 0, withdraw: 0 },
      ),
    [owners],
  );

  const openOwnerCreate = () => {
    setEditingOwner(null);
    setOwnerForm(ownerEmptyForm);
    setOwnerModalOpen(true);
  };

  const openOwnerEdit = (owner) => {
    setEditingOwner(owner);
    setOwnerForm({
      name: owner.name || "",
      note: owner.note || "",
      status: owner.status || "Active",
    });
    setOwnerModalOpen(true);
  };

  const openTransactionCreate = (type = "Deposit") => {
    setEditingTransaction(null);
    setTransactionForm({ ...transactionEmptyForm, type });
    setTransactionModalOpen(true);
  };

  const openTransactionEdit = (row) => {
    setEditingTransaction(row);
    setTransactionForm({
      ownerId: row.ownerId || "",
      bookId: row.bookId || "",
      amount: row.amount || "",
      remarks: row.remarks || "",
      type: row.type || "Deposit",
      date: row.date || today(),
      status: row.status || "Active",
    });
    setTransactionModalOpen(true);
  };

  const closeOwnerModal = () => {
    setOwnerModalOpen(false);
    setEditingOwner(null);
    setOwnerForm(ownerEmptyForm);
  };

  const closeTransactionModal = () => {
    setTransactionModalOpen(false);
    setEditingTransaction(null);
    setTransactionForm(transactionEmptyForm);
  };

  const handleOwnerSave = async (event) => {
    event.preventDefault();
    const payload = {
      name: ownerForm.name.trim(),
      note: ownerForm.note.trim(),
      status: ownerForm.status || "Active",
    };
    if (!payload.name) return toast.error("Owner name is required!");

    try {
      const res = editingOwner
        ? await updateOwner({ id: editingOwner.Id, data: payload }).unwrap()
        : await insertOwner(payload).unwrap();
      if (res?.success) {
        toast.success(editingOwner ? "Owner updated!" : "Owner added!");
        closeOwnerModal();
      } else {
        toast.error(res?.message || "Save failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Save failed!");
    }
  };

  const handleTransactionSave = async (event) => {
    event.preventDefault();
    const payload = {
      ownerId: transactionForm.ownerId,
      bookId: transactionForm.bookId,
      amount: Number(transactionForm.amount || 0),
      remarks: transactionForm.remarks.trim(),
      type: transactionForm.type,
      date: transactionForm.date,
      status: transactionForm.status || "Active",
    };

    if (!payload.ownerId) return toast.error("Owner is required!");
    if (!payload.bookId) return toast.error("Book is required!");
    if (!payload.amount || payload.amount <= 0) {
      return toast.error("Amount must be greater than 0!");
    }

    try {
      const res = editingTransaction
        ? await updateTransaction({
            id: editingTransaction.Id,
            data: payload,
          }).unwrap()
        : await insertTransaction(payload).unwrap();
      if (res?.success) {
        toast.success(
          editingTransaction ? "Transaction updated!" : "Transaction added!",
        );
        closeTransactionModal();
      } else {
        toast.error(res?.message || "Save failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Save failed!");
    }
  };

  const handleOwnerDelete = async (owner) => {
    const confirmed = await requestDeleteConfirmation({
      title: "Delete owner?",
      itemName: owner.name,
    });
    if (!confirmed) return;

    try {
      const res = await deleteOwner(owner.Id).unwrap();
      if (res?.success) toast.success("Owner deleted!");
      else toast.error(res?.message || "Delete failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  const handleTransactionDelete = async (row) => {
    const confirmed = await requestDeleteConfirmation({
      title: "Delete transaction?",
      itemName: row.owner?.name || "Owner Transaction",
    });
    if (!confirmed) return;

    try {
      const res = await deleteTransaction(row.Id).unwrap();
      if (res?.success) toast.success("Transaction deleted!");
      else toast.error(res?.message || "Delete failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          label="Total Deposit"
          value={meta.totalDeposit ?? ownerSummary.deposit}
          tone="emerald"
          icon={<ArrowDownLeft size={18} />}
        />
        <SummaryCard
          label="Total Withdraw"
          value={meta.totalWithdraw ?? ownerSummary.withdraw}
          tone="rose"
          icon={<ArrowUpRight size={18} />}
        />
        <SummaryCard
          label="Net Owner Balance"
          value={
            meta.netBalance ??
            Number(ownerSummary.deposit || 0) - Number(ownerSummary.withdraw || 0)
          }
          tone="indigo"
          icon={<WalletCards size={18} />}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Owners</h2>
              <p className="text-sm text-slate-500">Create, edit and delete</p>
            </div>
            <button
              type="button"
              onClick={openOwnerCreate}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus size={16} />
              Owner
            </button>
          </div>
          <div className="max-h-[540px] divide-y divide-slate-100 overflow-auto">
            {owners.map((owner) => (
              <div key={owner.Id} className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <UserRound size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {owner.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Balance {formatAmount(owner.netBalance)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openOwnerEdit(owner)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50"
                >
                  <Edit size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleOwnerDelete(owner)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {!ownersLoading && owners.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                No owner found
              </div>
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search transaction..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm text-slate-700 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20"
              />
              <Search
                size={18}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openTransactionCreate("Deposit")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <ArrowDownLeft size={18} />
                Deposit
              </button>
              <button
                type="button"
                onClick={() => openTransactionCreate("Withdraw")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white hover:bg-rose-700"
              >
                <ArrowUpRight size={18} />
                Withdraw
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <TableHead>Date</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Book</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead align="right">Actions</TableHead>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row) => (
                  <tr key={row.Id} className="hover:bg-slate-50">
                    <TableCell>{row.date || "-"}</TableCell>
                    <TableCell strong>{row.owner?.name || "-"}</TableCell>
                    <TableCell>{row.book?.name || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          row.type === "Deposit"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {row.type}
                      </span>
                    </TableCell>
                    <TableCell strong>{formatAmount(row.amount)}</TableCell>
                    <TableCell>{row.remarks || "---"}</TableCell>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openTransactionEdit(row)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTransactionDelete(row)}
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
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      No owner transaction found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 p-4">
            {Array.from({ length: totalPages }).map((_, index) => {
              const page = index + 1;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`h-10 min-w-10 rounded-xl border px-3 text-sm font-semibold ${
                    page === currentPage
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <Modal
        isOpen={ownerModalOpen}
        onClose={closeOwnerModal}
        title={editingOwner ? "Edit Owner" : "Add Owner"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleOwnerSave} className="space-y-4">
          <FormInput
            label="Owner Name"
            value={ownerForm.name}
            onChange={(value) => setOwnerForm((p) => ({ ...p, name: value }))}
            placeholder="Owner name"
          />
          <FormSelect
            label="Status"
            value={ownerForm.status}
            onChange={(value) => setOwnerForm((p) => ({ ...p, status: value }))}
            options={[
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ]}
          />
          <FormTextarea
            label="Note"
            value={ownerForm.note}
            onChange={(value) => setOwnerForm((p) => ({ ...p, note: value }))}
            placeholder="Optional note"
          />
          <ModalActions
            onCancel={closeOwnerModal}
            loading={ownerSaving}
            submitLabel="Save"
          />
        </form>
      </Modal>

      <Modal
        isOpen={transactionModalOpen}
        onClose={closeTransactionModal}
        title={
          editingTransaction
            ? "Edit Owner Transaction"
            : `Add ${transactionForm.type}`
        }
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleTransactionSave} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormSelect
            label="Owner"
            value={transactionForm.ownerId}
            onChange={(value) =>
              setTransactionForm((p) => ({ ...p, ownerId: value }))
            }
            options={owners.map((owner) => ({
              value: owner.Id,
              label: owner.name,
            }))}
            placeholder="Select Owner"
          />
          <FormSelect
            label="Book"
            value={transactionForm.bookId}
            onChange={(value) =>
              setTransactionForm((p) => ({ ...p, bookId: value }))
            }
            options={books.map((book) => ({
              value: book.Id,
              label: book.name,
            }))}
            placeholder="Select Book"
          />
          <FormSelect
            label="Type"
            value={transactionForm.type}
            onChange={(value) =>
              setTransactionForm((p) => ({ ...p, type: value }))
            }
            options={[
              { value: "Deposit", label: "Deposit" },
              { value: "Withdraw", label: "Withdraw" },
            ]}
          />
          <FormInput
            label="Amount"
            type="number"
            value={transactionForm.amount}
            onChange={(value) =>
              setTransactionForm((p) => ({ ...p, amount: value }))
            }
            placeholder="0"
          />
          <FormInput
            label="Date"
            type="date"
            value={transactionForm.date}
            onChange={(value) =>
              setTransactionForm((p) => ({ ...p, date: value }))
            }
          />
          <FormSelect
            label="Status"
            value={transactionForm.status}
            onChange={(value) =>
              setTransactionForm((p) => ({ ...p, status: value }))
            }
            options={[
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ]}
          />
          <div className="md:col-span-2">
            <FormTextarea
              label="Remarks"
              value={transactionForm.remarks}
              onChange={(value) =>
                setTransactionForm((p) => ({ ...p, remarks: value }))
              }
              placeholder="Remarks"
            />
          </div>
          <div className="md:col-span-2">
            <ModalActions
              onCancel={closeTransactionModal}
              loading={transactionSaving}
              submitLabel="Save"
            />
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

const SummaryCard = ({ label, value, tone, icon }) => {
  const toneClass = {
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100",
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
            {formatAmount(value)}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${toneClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

const TableHead = ({ children, align = "left" }) => (
  <th
    className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 ${
      align === "right" ? "text-right" : "text-left"
    }`}
  >
    {children}
  </th>
);

const TableCell = ({ children, strong = false }) => (
  <td
    className={`px-5 py-4 text-sm ${
      strong ? "font-semibold text-slate-900" : "text-slate-700"
    }`}
  >
    {children}
  </td>
);

const fieldClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20";

const FormInput = ({ label, value, onChange, placeholder, type = "text" }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-semibold text-slate-600">
      {label}
    </span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={fieldClass}
    />
  </label>
);

const FormSelect = ({ label, value, onChange, options, placeholder }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-semibold text-slate-600">
      {label}
    </span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={fieldClass}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const FormTextarea = ({ label, value, onChange, placeholder }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-semibold text-slate-600">
      {label}
    </span>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20"
    />
  </label>
);

const ModalActions = ({ onCancel, loading, submitLabel }) => (
  <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
    <button
      type="button"
      onClick={onCancel}
      className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      Cancel
    </button>
    <button
      type="submit"
      disabled={loading}
      className="h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
    >
      {loading ? "Saving..." : submitLabel}
    </button>
  </div>
);

export default OwnerTransactionTable;
