import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Edit,
  Printer,
  Search,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import { useGetAllBookWithoutQueryQuery } from "../../features/book/book";
import {
  useDeleteOwnerTransactionMutation,
  useGetAllOwnerWithoutQueryQuery,
  useGetAllOwnerTransactionQuery,
  useInsertOwnerTransactionMutation,
  useUpdateOwnerTransactionMutation,
} from "../../features/ownerTransaction/ownerTransaction";
import useDebounce from "../../hooks/useDebounce";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import Modal from "../common/Modal";
import DateRangeFilter, {
  getDatePresetRange,
} from "../common/DateRangeFilter";

const formatAmount = (value) => `৳${Number(value || 0).toLocaleString()}`;
const today = () => new Date().toISOString().slice(0, 10);
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const defaultDateRange = getDatePresetRange("");
const transactionEmptyForm = {
  ownerId: "",
  bookId: "",
  amount: "",
  remarks: "",
  type: "Deposit",
  date: today(),
  status: "Active",
};

const OwnerTransactionTable = ({ ownerId: fixedOwnerId = "", ownerName = "" }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [startDate, setStartDate] = useState(defaultDateRange.from);
  const [endDate, setEndDate] = useState(defaultDateRange.to);
  const [dateFilterType, setDateFilterType] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedRowsById, setSelectedRowsById] = useState({});
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [transactionForm, setTransactionForm] = useState(transactionEmptyForm);

  const { data: bookRes } = useGetAllBookWithoutQueryQuery();
  const { data: ownerRes, isLoading: ownersLoading } =
    useGetAllOwnerWithoutQueryQuery();
  const { data, isLoading, isError, error } = useGetAllOwnerTransactionQuery({
    page: currentPage,
    limit: itemsPerPage,
    searchTerm: debouncedSearchTerm || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    ownerId: fixedOwnerId || undefined,
    type: typeFilter || undefined,
  });

  const [insertTransaction, { isLoading: creatingTransaction }] =
    useInsertOwnerTransactionMutation();
  const [updateTransaction, { isLoading: updatingTransaction }] =
    useUpdateOwnerTransactionMutation();
  const [deleteTransaction] = useDeleteOwnerTransactionMutation();

  const books = bookRes?.data || [];
  const owners = ownerRes?.data || [];
  const rows = data?.data || [];
  const meta = data?.meta || {};
  const transactionSaving = creatingTransaction || updatingTransaction;
  const selectedRows = useMemo(
    () => Object.values(selectedRowsById),
    [selectedRowsById],
  );
  const selectedTotal = selectedRows.reduce(
    (sum, row) =>
      sum +
      (row.type === "Withdraw"
        ? -Number(row.amount || 0)
        : Number(row.amount || 0)),
    0,
  );
  const allCurrentPageSelected =
    rows.length > 0 && rows.every((row) => selectedRowsById[row.Id]);
  const ownerOptions = useMemo(
    () =>
      owners.map((owner) => ({
        value: String(owner.Id),
        label: owner.name,
        owner,
      })),
    [owners],
  );

  useEffect(() => {
    if (isError) console.error("Error fetching owner transactions", error);
    if (!isLoading) {
      setTotalPages(Math.max(1, Math.ceil((meta.count || 0) / itemsPerPage)));
    }
  }, [error, isError, isLoading, itemsPerPage, meta.count]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    fixedOwnerId,
    startDate,
    endDate,
    itemsPerPage,
    typeFilter,
  ]);

  useEffect(() => {
    setSelectedRowsById({});
  }, [debouncedSearchTerm, fixedOwnerId, startDate, endDate, typeFilter]);

  useEffect(() => {
    if (startDate && endDate && startDate > endDate) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

  const openTransactionCreate = (type = "Deposit") => {
    setEditingTransaction(null);
    setTransactionForm({ ...transactionEmptyForm, ownerId: fixedOwnerId || "", type });
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

  const closeTransactionModal = () => {
    setTransactionModalOpen(false);
    setEditingTransaction(null);
    setTransactionForm(transactionEmptyForm);
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

  const toggleRowSelection = (row) => {
    setSelectedRowsById((prev) => {
      const next = { ...prev };
      if (next[row.Id]) delete next[row.Id];
      else next[row.Id] = row;
      return next;
    });
  };

  const toggleCurrentPageSelection = () => {
    setSelectedRowsById((prev) => {
      const next = { ...prev };
      if (allCurrentPageSelected) {
        rows.forEach((row) => delete next[row.Id]);
      } else {
        rows.forEach((row) => {
          next[row.Id] = row;
        });
      }
      return next;
    });
  };

  const getExportRows = () => {
    if (!selectedRows.length) {
      toast.error("Please select transactions first");
      return [];
    }
    return selectedRows;
  };

  const getExportFileName = () =>
    `owner-transactions-${new Date().toISOString().slice(0, 10)}.pdf`;

  const getExportTableRows = (exportRows) =>
    exportRows.map((row, index) => [
      index + 1,
      row.date || "-",
      row.owner?.name || "-",
      row.book?.name || "-",
      row.type || "-",
      Number(row.amount || 0),
      row.remarks || "---",
    ]);

  const handleDownloadPdf = async () => {
    const exportRows = getExportRows();
    if (!exportRows.length) return;

    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt" });

    doc.setFontSize(16);
    doc.text("Owner Transaction", 40, 40);
    doc.setFontSize(10);
    doc.text(`Selected: ${exportRows.length}`, 40, 58);
    doc.text(`Net Total: ${formatAmount(selectedTotal)}`, 40, 74);

    autoTable(doc, {
      startY: 92,
      head: [["SL", "Date", "Owner", "Book", "Type", "Amount", "Remarks"]],
      body: getExportTableRows(exportRows).map((row) => [
        row[0],
        row[1],
        row[2],
        row[3],
        row[4],
        formatAmount(row[5]),
        row[6],
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [79, 70, 229] },
      columnStyles: {
        0: { halign: "center", cellWidth: 34 },
        5: { halign: "right" },
      },
    });

    doc.save(getExportFileName());
  };

  const handlePrintSelected = () => {
    const exportRows = getExportRows();
    if (!exportRows.length) return;

    const tableRows = getExportTableRows(exportRows)
      .map(
        (row) => `
          <tr>
            <td>${row[0]}</td>
            <td>${escapeHtml(row[1])}</td>
            <td>${escapeHtml(row[2])}</td>
            <td>${escapeHtml(row[3])}</td>
            <td>${escapeHtml(row[4])}</td>
            <td class="amount">${formatAmount(row[5])}</td>
            <td>${escapeHtml(row[6])}</td>
          </tr>
        `,
      )
      .join("");
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups to print.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Owner Transaction</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
            h1 { margin: 0 0 6px; font-size: 22px; }
            .meta { margin-bottom: 18px; color: #475569; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #eef2ff; color: #1e293b; text-transform: uppercase; font-size: 11px; }
            .amount { text-align: right; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Owner Transaction</h1>
          <div class="meta">Selected: ${exportRows.length} | Net Total: ${formatAmount(selectedTotal)}</div>
          <table>
            <thead>
              <tr>
                <th>SL</th>
                <th>Date</th>
                <th>Owner</th>
                <th>Book</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
          value={meta.totalDeposit}
          tone="emerald"
          icon={<ArrowDownLeft size={18} />}
        />
        <SummaryCard
          label="Total Withdraw"
          value={meta.totalWithdraw}
          tone="rose"
          icon={<ArrowUpRight size={18} />}
        />
        <SummaryCard
          label="Net Owner Balance"
          value={
            meta.netBalance
          }
          tone="indigo"
          icon={<WalletCards size={18} />}
        />
      </div>

      <div className="mt-6">
        {ownerName ? (
          <div className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-5 py-4">
            <p className="text-xs font-black uppercase tracking-widest text-indigo-500">
              Owner History
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{ownerName}</h2>
          </div>
        ) : null}
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1fr)_140px_150px_minmax(260px,340px)_auto] lg:items-end">
              <div className="relative w-full">
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by owner, book, amount..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm text-slate-700 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20"
                />
                <Search
                  size={18}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Per Page
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(event) => setItemsPerPage(Number(event.target.value))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20"
                >
                  {[20, 50, 100].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Type
                </span>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">All</option>
                  <option value="Deposit">Deposit</option>
                  <option value="Withdraw">Withdraw</option>
                </select>
              </label>
              <DateRangeFilter
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onFilterTypeChange={(type) => setDateFilterType(type)}
                defaultFilter={dateFilterType}
                compact
                className="w-full"
                selectWrapperClassName="w-full"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={!selectedRows.length}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={17} />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={handlePrintSelected}
                  disabled={!selectedRows.length}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Printer size={17} />
                  Print
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-bold text-slate-500">
                Selected: <span className="text-indigo-600">{selectedRows.length}</span>
              </p>
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
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <TableHead>
                    <input
                      type="checkbox"
                      checked={allCurrentPageSelected}
                      onChange={toggleCurrentPageSelection}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </TableHead>
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
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={Boolean(selectedRowsById[row.Id])}
                        onChange={() => toggleRowSelection(row)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </TableCell>
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
                      colSpan={8}
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
          {fixedOwnerId ? (
            <FormInput label="Owner" value={ownerName || "Selected Owner"} onChange={() => {}} />
          ) : (
            <FormReactSelect
              label="Owner"
              value={transactionForm.ownerId}
              onChange={(value) =>
                setTransactionForm((p) => ({ ...p, ownerId: value }))
              }
              options={ownerOptions}
              placeholder={ownersLoading ? "Loading owners..." : "Select Owner"}
            />
          )}
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

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 12,
    borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(99, 102, 241, 0.18)" : "none",
    backgroundColor: "#ffffff",
    "&:hover": { borderColor: state.isFocused ? "#c7d2fe" : "#cbd5e1" },
  }),
  valueContainer: (base) => ({ ...base, padding: "0 12px" }),
  input: (base) => ({ ...base, color: "#0f172a" }),
  singleValue: (base) => ({ ...base, color: "#0f172a", fontSize: 14 }),
  placeholder: (base) => ({ ...base, color: "#94a3b8", fontSize: 14 }),
  menu: (base) => ({
    ...base,
    borderRadius: 12,
    overflow: "hidden",
    zIndex: 60,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#4f46e5"
      : state.isFocused
        ? "#eef2ff"
        : "#ffffff",
    color: state.isSelected ? "#ffffff" : "#0f172a",
    fontSize: 14,
  }),
};

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

const FormReactSelect = ({ label, value, onChange, options, placeholder }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-semibold text-slate-600">
      {label}
    </span>
    <Select
      value={options.find((option) => option.value === String(value)) || null}
      onChange={(selected) => onChange(selected?.value || "")}
      options={options}
      placeholder={placeholder}
      isClearable
      isSearchable
      styles={selectStyles}
      classNamePrefix="react-select"
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
