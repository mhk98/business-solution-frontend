import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import Select from "react-select";
import Header from "../common/Header";
import Modal from "../common/Modal";
import DateRangeFilter, { getDatePresetRange } from "../common/DateRangeFilter";
import useDebounce from "../../hooks/useDebounce";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import { useGetAllBookWithoutQueryQuery } from "../../features/book/book";
import { useGetAllBankAccountWithoutQueryQuery } from "../../features/bankAccount/bankAccount";
import {
  useApproveFundTransferMutation,
  useDeleteFundTransferMutation,
  useGetAllFundTransferQuery,
} from "../../features/fundTransfer/fundTransfer";
import FundTransferFormModal from "./FundTransferFormModal";

const PAYMENT_MODE_OPTIONS = [
  { value: "Cash", label: "Cash" },
  { value: "Bank", label: "Bank" },
];

const formatDate = (value) => {
  if (!value) return "-";
  const normalized = String(value).slice(0, 10);
  const parts = normalized.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return normalized;
};

const formatAmount = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const FundTransferTable = () => {
  const role = localStorage.getItem("role");
  const isPrivilegedUser = role === "superAdmin" || role === "admin";

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const defaultDateRange = useMemo(() => getDatePresetRange(""), []);
  const [startDate, setStartDate] = useState(defaultDateRange.from);
  const [endDate, setEndDate] = useState(defaultDateRange.to);
  const [filterBookId, setFilterBookId] = useState("");
  const [filterFromMode, setFilterFromMode] = useState("");
  const [filterToMode, setFilterToMode] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [deleteRequestId, setDeleteRequestId] = useState(null);
  const [deleteRequestNote, setDeleteRequestNote] = useState("");
  const [isDeleteRequestOpen, setIsDeleteRequestOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearchTerm,
    startDate,
    endDate,
    filterBookId,
    filterFromMode,
    filterToMode,
    filterStatus,
  ]);

  const { data: bookRes } = useGetAllBookWithoutQueryQuery();
  const books = useMemo(() => bookRes?.data || [], [bookRes]);

  const { data: bankAccountRes } = useGetAllBankAccountWithoutQueryQuery();
  const bankAccounts = useMemo(
    () => bankAccountRes?.data || [],
    [bankAccountRes],
  );

  const bookOptions = useMemo(
    () => books.map((b) => ({ value: String(b.Id), label: b.name })),
    [books],
  );

  const findBookName = (bookId) =>
    books.find((b) => String(b.Id) === String(bookId))?.name || "-";

  const findBankLabel = (bankAccountId, bankName) => {
    const match = bankAccounts.find(
      (ba) => String(ba.Id) === String(bankAccountId),
    );
    if (match) return `${match.bankName} - ${match.accountNumber}`;
    return bankName || "-";
  };

  const queryArgs = useMemo(() => {
    const args = {
      page,
      limit,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      bookId: filterBookId || undefined,
      fromPaymentMode: filterFromMode || undefined,
      toPaymentMode: filterToMode || undefined,
      status: filterStatus || undefined,
      searchTerm: debouncedSearchTerm || undefined,
    };
    Object.keys(args).forEach((k) => {
      if (args[k] === undefined || args[k] === null || args[k] === "")
        delete args[k];
    });
    return args;
  }, [
    page,
    limit,
    startDate,
    endDate,
    filterBookId,
    filterFromMode,
    filterToMode,
    filterStatus,
    debouncedSearchTerm,
  ]);

  const { data, isLoading, refetch } = useGetAllFundTransferQuery(queryArgs);
  const rows = data?.data || [];
  const meta = data?.meta || {};
  const totalPages = Math.max(1, Math.ceil((meta.count || 0) / limit));

  const [deleteFundTransfer] = useDeleteFundTransferMutation();
  const [approveFundTransfer] = useApproveFundTransferMutation();

  const resetForm = () => {
    setEditing(null);
    setIsAddOpen(false);
  };

  const openAdd = () => {
    setEditing(null);
    setIsAddOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
  };

  const handleDeleteIconClick = (row) => {
    const rowId = row.Id || row.id;
    if (!rowId) return;
    if (isPrivilegedUser) {
      void handleDeleteConfirmed(rowId);
      return;
    }
    setDeleteRequestId(rowId);
    setDeleteRequestNote("");
    setIsDeleteRequestOpen(true);
  };

  const handleDeleteConfirmed = async (rowId) => {
    const confirmed = await requestDeleteConfirmation({
      title: "Delete fund transfer?",
      message:
        "This fund transfer will be removed permanently. This action cannot be undone.",
    });
    if (!confirmed) return;

    try {
      const res = await deleteFundTransfer({ id: rowId }).unwrap();
      if (res?.success !== false) {
        toast.success("Deleted!");
        refetch?.();
      } else toast.error(res?.message || "Delete failed");
    } catch (error) {
      toast.error(error?.data?.message || "Delete failed");
    }
  };

  const closeDeleteRequestModal = () => {
    setIsDeleteRequestOpen(false);
    setDeleteRequestId(null);
    setDeleteRequestNote("");
  };

  const submitDeleteRequest = async () => {
    if (!deleteRequestId) return;
    const note = String(deleteRequestNote || "").trim();
    if (!note) return toast.error("Delete request note is required");

    try {
      const res = await deleteFundTransfer({
        id: deleteRequestId,
        note,
      }).unwrap();
      if (res?.success) {
        toast.success(res?.message || "Delete request submitted");
        closeDeleteRequestModal();
        refetch?.();
      } else toast.error(res?.message || "Delete request failed");
    } catch (error) {
      toast.error(error?.data?.message || "Delete request failed");
    }
  };

  const handleApprove = async (row) => {
    const rowId = row.Id || row.id;
    try {
      const res = await approveFundTransfer(rowId).unwrap();
      if (res?.success) {
        toast.success("Fund transfer approved");
        refetch?.();
      } else toast.error(res?.message || "Approve failed");
    } catch (error) {
      toast.error(error?.data?.message || "Approve failed");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setFilterBookId("");
    setFilterFromMode("");
    setFilterToMode("");
    setFilterStatus("");
  };

  return (
    <div className="flex-1 min-w-0 relative z-10">
      <Header title="Fund Transfer" />

      <main className="max-w-8xl w-full min-w-0 mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-[420px]">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search voucher, note, bank..."
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
                Add Fund Transfer
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                classNamePrefix="rs"
                placeholder="Book"
                isClearable
                options={bookOptions}
                value={
                  bookOptions.find((o) => o.value === filterBookId) || null
                }
                onChange={(opt) => setFilterBookId(opt?.value || "")}
                className="text-black"
              />
              <Select
                classNamePrefix="rs"
                placeholder="From Mode"
                isClearable
                options={PAYMENT_MODE_OPTIONS}
                value={
                  PAYMENT_MODE_OPTIONS.find(
                    (o) => o.value === filterFromMode,
                  ) || null
                }
                onChange={(opt) => setFilterFromMode(opt?.value || "")}
                className="text-black"
              />
              <Select
                classNamePrefix="rs"
                placeholder="To Mode"
                isClearable
                options={PAYMENT_MODE_OPTIONS}
                value={
                  PAYMENT_MODE_OPTIONS.find((o) => o.value === filterToMode) ||
                  null
                }
                onChange={(opt) => setFilterToMode(opt?.value || "")}
                className="text-black"
              />
              <Select
                classNamePrefix="rs"
                placeholder="Status"
                isClearable
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Pending", label: "Pending" },
                  { value: "Approved", label: "Approved" },
                ]}
                value={
                  filterStatus
                    ? { value: filterStatus, label: filterStatus }
                    : null
                }
                onChange={(opt) => setFilterStatus(opt?.value || "")}
                className="text-black"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <DateRangeFilter
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                defaultFilter=""
                label=""
                compact
                className="w-full sm:max-w-xs text-black"
              />

              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
            <span className="font-semibold text-slate-600">
              Total Transferred:{" "}
              <span className="text-indigo-700">
                {formatAmount(meta.totalTransferred)}
              </span>
            </span>
            <span className="font-semibold text-slate-600">
              Total Records:{" "}
              <span className="text-slate-900">{meta.count || 0}</span>
            </span>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Voucher
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Book
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    From
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    To
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row) => (
                  <tr key={row.Id || row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                      {row.voucherNo || "-"}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {row.book?.name || findBookName(row.bookId)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        {row.fromPaymentMode}
                        {row.fromPaymentMode === "Bank" && (
                          <span className="text-slate-500">
                            (
                            {findBankLabel(
                              row.fromBankAccount,
                              row.fromBankName,
                            )}
                            )
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <ArrowLeftRight size={14} className="text-indigo-500" />
                        {row.toPaymentMode}
                        {row.toPaymentMode === "Bank" && (
                          <span className="text-slate-500">
                            ({findBankLabel(row.toBankAccount, row.toBankName)})
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900">
                      {formatAmount(row.amount)}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          row.status === "Pending" ||
                          row.status === "Pending Delete"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {row.status || "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        {isPrivilegedUser && row.status === "Pending" && (
                          <button
                            type="button"
                            onClick={() => handleApprove(row)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white transition hover:bg-emerald-50"
                            title="Approve"
                          >
                            <CheckCircle2
                              size={17}
                              className="text-emerald-600"
                            />
                          </button>
                        )}
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
                          onClick={() => handleDeleteIconClick(row)}
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
                No fund transfers found
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
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
              disabled={page >= totalPages}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </main>

      <FundTransferFormModal
        isOpen={isAddOpen || Boolean(editing)}
        onClose={resetForm}
        editing={editing}
        onSaved={() => refetch?.()}
      />

      <Modal
        isOpen={isDeleteRequestOpen}
        onClose={closeDeleteRequestModal}
        title="Request Delete"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Please provide a reason for this delete request. An admin will
            review and approve it.
          </p>
          <textarea
            value={deleteRequestNote}
            onChange={(event) => setDeleteRequestNote(event.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            placeholder="Reason for deletion"
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeDeleteRequestModal}
              className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitDeleteRequest}
              className="rounded-2xl bg-red-600 px-8 py-3 text-sm font-bold text-white shadow-xl shadow-red-100 transition hover:bg-red-700"
            >
              Submit Request
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FundTransferTable;
