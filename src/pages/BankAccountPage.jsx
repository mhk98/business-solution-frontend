import { useMemo, useState } from "react";
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Header from "../components/common/Header";
import Modal from "../components/common/Modal";
import {
  useDeleteBankAccountMutation,
  useGetAllBankAccountQuery,
  useInsertBankAccountMutation,
  useUpdateBankAccountMutation,
} from "../features/bankAccount/bankAccount";
import useDebounce from "../hooks/useDebounce";
import { requestDeleteConfirmation } from "../utils/deleteConfirmation";

const emptyForm = { bankName: "", accountNumber: "" };

const BankAccountPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [page, setPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading, refetch } = useGetAllBankAccountQuery({
    page,
    limit: 20,
    searchTerm: debouncedSearchTerm || undefined,
  });
  const [insertBankAccount, { isLoading: creating }] =
    useInsertBankAccountMutation();
  const [updateBankAccount, { isLoading: updating }] =
    useUpdateBankAccountMutation();
  const [deleteBankAccount] = useDeleteBankAccountMutation();

  const rows = data?.data || [];
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.meta?.count || 0) / 20)),
    [data],
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setIsAddOpen(false);
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditing(null);
    setIsAddOpen(true);
  };

  const openEdit = (row) => {
    setForm({
      bankName: row?.bankName || "",
      accountNumber: row?.accountNumber || "",
    });
    setEditing(row);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      bankName: form.bankName.trim(),
      accountNumber: form.accountNumber.trim(),
    };

    if (!payload.bankName) return toast.error("Bank name is required");
    if (!payload.accountNumber) return toast.error("Account number is required");

    try {
      const res = editing
        ? await updateBankAccount({
            id: editing.Id || editing.id,
            data: payload,
          }).unwrap()
        : await insertBankAccount(payload).unwrap();

      if (res?.success) {
        toast.success(editing ? "Bank account updated" : "Bank account added");
        resetForm();
        refetch?.();
      } else {
        toast.error(res?.message || "Save failed");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Save failed");
    }
  };

  const handleDelete = async (row) => {
    const confirmed = await requestDeleteConfirmation({
      message: `Delete ${row.accountNumber}?`,
    });
    if (!confirmed) return;

    try {
      const res = await deleteBankAccount(row.Id || row.id).unwrap();
      if (res?.success !== false) {
        toast.success("Bank account deleted");
        refetch?.();
      } else {
        toast.error(res?.message || "Delete failed");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="flex-1 relative z-10">
      <Header title="Bank" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-[520px]">
              <input
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                placeholder="Search bank or account number..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
              />
              <Search
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
            </div>

            <button
              type="button"
              onClick={openAdd}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
            >
              <Plus size={18} />
              Add Bank Account
            </button>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Bank Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Account Number
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row) => (
                  <tr key={row.Id || row.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      <span className="inline-flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50">
                          <Building2 size={17} className="text-indigo-600" />
                        </span>
                        {row.bankName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {row.accountNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white transition hover:bg-slate-50"
                          title="Edit"
                        >
                          <Pencil size={17} className="text-indigo-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white transition hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 size={17} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!isLoading && rows.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-500">
                No bank accounts found
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm font-semibold text-slate-600">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={page >= totalPages}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </main>

      <Modal
        isOpen={isAddOpen || Boolean(editing)}
        onClose={resetForm}
        title={editing ? "Edit Bank Account" : "Add Bank Account"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Bank Name
            </label>
            <input
              value={form.bankName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, bankName: event.target.value }))
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              placeholder="Bank name"
            />
          </div>

          <div>
            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Account Number
            </label>
            <input
              value={form.accountNumber}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  accountNumber: event.target.value,
                }))
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              placeholder="Account number"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || updating}
              className="rounded-2xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-100 transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {creating || updating ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BankAccountPage;
