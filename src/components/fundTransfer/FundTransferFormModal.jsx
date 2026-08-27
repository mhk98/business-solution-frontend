import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import Modal from "../common/Modal";
import {
  useGetAllBookWithoutQueryQuery,
  useGetSingleBookDataByIdQuery,
} from "../../features/book/book";
import { useGetAllBankAccountWithoutQueryQuery } from "../../features/bankAccount/bankAccount";
import {
  useInsertFundTransferMutation,
  useUpdateFundTransferMutation,
} from "../../features/fundTransfer/fundTransfer";

const PAYMENT_MODE_OPTIONS = [
  { value: "Cash", label: "Cash" },
  { value: "Bank", label: "Bank" },
];

const formatAmount = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const buildEmptyForm = (defaultBookId = "") => ({
  bookId: defaultBookId ? String(defaultBookId) : "",
  date: new Date().toISOString().slice(0, 10),
  fromPaymentMode: "",
  fromBankAccount: "",
  toPaymentMode: "",
  toBankAccount: "",
  amount: "",
  note: "",
  remarks: "",
});

/**
 * Shared Add/Edit form for Fund Transfer. Used standalone on the Fund Transfer
 * page and embedded (with a locked book) on a Book's Cash In/Out page.
 */
const FundTransferFormModal = ({
  isOpen,
  onClose,
  editing = null,
  defaultBookId = "",
  lockBook = false,
  onSaved,
}) => {
  const [form, setForm] = useState(() => buildEmptyForm(defaultBookId));

  const { data: bookRes } = useGetAllBookWithoutQueryQuery();
  const books = useMemo(() => bookRes?.data || [], [bookRes]);

  const { data: bankAccountRes } = useGetAllBankAccountWithoutQueryQuery();
  const bankAccounts = useMemo(() => bankAccountRes?.data || [], [bankAccountRes]);

  const bookOptions = useMemo(
    () => books.map((b) => ({ value: String(b.Id), label: b.name })),
    [books],
  );

  const bankAccountOptions = useMemo(
    () =>
      bankAccounts.map((ba) => ({
        value: String(ba.Id),
        label: `${ba.bankName} - ${ba.accountNumber}`,
        bankName: ba.bankName,
      })),
    [bankAccounts],
  );

  const findBankBalance = (bankAccountId) =>
    Number(
      bankAccounts.find((ba) => String(ba.Id) === String(bankAccountId))
        ?.balance || 0,
    );

  const { data: selectedBookRes } = useGetSingleBookDataByIdQuery(form.bookId, {
    skip: !form.bookId,
  });
  const cashBalance = Number(selectedBookRes?.data?.cashBalance || 0);

  useEffect(() => {
    if (!isOpen) return;

    if (editing) {
      setForm({
        bookId: String(editing.bookId ?? ""),
        date: editing.date ? String(editing.date).slice(0, 10) : "",
        fromPaymentMode: editing.fromPaymentMode ?? "",
        fromBankAccount: editing.fromBankAccount
          ? String(editing.fromBankAccount)
          : "",
        toPaymentMode: editing.toPaymentMode ?? "",
        toBankAccount: editing.toBankAccount ? String(editing.toBankAccount) : "",
        amount: editing.amount ?? "",
        note: editing.note ?? "",
        remarks: editing.remarks ?? "",
      });
    } else {
      setForm(buildEmptyForm(defaultBookId));
    }
  }, [isOpen, editing, defaultBookId]);

  const [insertFundTransfer, { isLoading: creating }] =
    useInsertFundTransferMutation();
  const [updateFundTransfer, { isLoading: updating }] =
    useUpdateFundTransferMutation();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.bookId) return toast.error("Book is required");
    if (!form.fromPaymentMode) return toast.error("From payment mode is required");
    if (!form.toPaymentMode) return toast.error("To payment mode is required");
    if (form.fromPaymentMode === "Bank" && !form.fromBankAccount)
      return toast.error("From bank account is required");
    if (form.toPaymentMode === "Bank" && !form.toBankAccount)
      return toast.error("To bank account is required");
    if (
      form.fromPaymentMode === form.toPaymentMode &&
      (form.fromPaymentMode !== "Bank" ||
        form.fromBankAccount === form.toBankAccount)
    ) {
      return toast.error("From and To account cannot be the same");
    }
    const amountNumber = Number(form.amount);
    if (!amountNumber || Number.isNaN(amountNumber) || amountNumber <= 0) {
      return toast.error("Amount must be greater than 0");
    }

    const fromBank = bankAccounts.find(
      (ba) => String(ba.Id) === String(form.fromBankAccount),
    );
    const toBank = bankAccounts.find(
      (ba) => String(ba.Id) === String(form.toBankAccount),
    );

    const payload = {
      bookId: form.bookId,
      date: form.date,
      fromPaymentMode: form.fromPaymentMode,
      fromBankAccount:
        form.fromPaymentMode === "Bank" ? form.fromBankAccount : "",
      fromBankName: form.fromPaymentMode === "Bank" ? fromBank?.bankName || "" : "",
      toPaymentMode: form.toPaymentMode,
      toBankAccount: form.toPaymentMode === "Bank" ? form.toBankAccount : "",
      toBankName: form.toPaymentMode === "Bank" ? toBank?.bankName || "" : "",
      amount: amountNumber,
      note: form.note?.trim() || "",
      remarks: form.remarks?.trim() || "",
    };

    try {
      const res = editing
        ? await updateFundTransfer({
            id: editing.Id || editing.id,
            data: payload,
          }).unwrap()
        : await insertFundTransfer(payload).unwrap();

      if (res?.success) {
        toast.success(editing ? "Fund transfer updated" : "Fund transfer created");
        onSaved?.(res.data);
        onClose?.();
      } else {
        toast.error(res?.message || "Save failed");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Save failed");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? "Edit Fund Transfer" : "Add Fund Transfer"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Book
          </label>
          <Select
            classNamePrefix="rs"
            placeholder="Select book"
            isDisabled={lockBook}
            options={bookOptions}
            value={bookOptions.find((o) => o.value === form.bookId) || null}
            onChange={(opt) =>
              setForm((prev) => ({ ...prev, bookId: opt?.value || "" }))
            }
          />
        </div>

        <div>
          <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Date
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, date: event.target.value }))
            }
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              From
            </p>
            <Select
              classNamePrefix="rs"
              placeholder="Payment mode"
              options={PAYMENT_MODE_OPTIONS}
              value={
                PAYMENT_MODE_OPTIONS.find(
                  (o) => o.value === form.fromPaymentMode,
                ) || null
              }
              onChange={(opt) =>
                setForm((prev) => ({
                  ...prev,
                  fromPaymentMode: opt?.value || "",
                  fromBankAccount: opt?.value === "Bank" ? prev.fromBankAccount : "",
                }))
              }
            />
            {form.fromPaymentMode === "Bank" && (
              <div className="mt-3">
                <Select
                  classNamePrefix="rs"
                  placeholder="Bank account"
                  options={bankAccountOptions}
                  value={
                    bankAccountOptions.find(
                      (o) => o.value === form.fromBankAccount,
                    ) || null
                  }
                  onChange={(opt) =>
                    setForm((prev) => ({
                      ...prev,
                      fromBankAccount: opt?.value || "",
                    }))
                  }
                />
                {form.fromBankAccount && (
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Current balance: {formatAmount(findBankBalance(form.fromBankAccount))}
                  </p>
                )}
              </div>
            )}
            {form.fromPaymentMode === "Cash" && form.bookId && (
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Current cash balance: {formatAmount(cashBalance)}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              To
            </p>
            <Select
              classNamePrefix="rs"
              placeholder="Payment mode"
              options={PAYMENT_MODE_OPTIONS}
              value={
                PAYMENT_MODE_OPTIONS.find((o) => o.value === form.toPaymentMode) ||
                null
              }
              onChange={(opt) =>
                setForm((prev) => ({
                  ...prev,
                  toPaymentMode: opt?.value || "",
                  toBankAccount: opt?.value === "Bank" ? prev.toBankAccount : "",
                }))
              }
            />
            {form.toPaymentMode === "Bank" && (
              <div className="mt-3">
                <Select
                  classNamePrefix="rs"
                  placeholder="Bank account"
                  options={bankAccountOptions}
                  value={
                    bankAccountOptions.find(
                      (o) => o.value === form.toBankAccount,
                    ) || null
                  }
                  onChange={(opt) =>
                    setForm((prev) => ({
                      ...prev,
                      toBankAccount: opt?.value || "",
                    }))
                  }
                />
                {form.toBankAccount && (
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Current balance: {formatAmount(findBankBalance(form.toBankAccount))}
                  </p>
                )}
              </div>
            )}
            {form.toPaymentMode === "Cash" && form.bookId && (
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Current cash balance: {formatAmount(cashBalance)}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Amount
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, amount: event.target.value }))
            }
            placeholder="0.00"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>

        <div>
          <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Note
          </label>
          <textarea
            value={form.note}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, note: event.target.value }))
            }
            rows={2}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            placeholder="Optional note"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={onClose}
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
  );
};

export default FundTransferFormModal;
