import { motion } from "framer-motion";
import {
  Edit,
  FileSpreadsheet,
  FileText,
  HandCoins,
  Plus,
  Printer,
  Search,
  Trash2,
} from "lucide-react";
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
import DateRangeFilter, {
  getDatePresetRange,
} from "../common/DateRangeFilter";
import Modal from "../common/Modal";

const formatAmount = (value) => Number(value || 0).toLocaleString();
// Each party is a two-way running account: balance = Received − Paid.
// Positive → company owes the party (Payable), negative → party owes company (Receivable).
const balanceSide = (value) => {
  const n = Number(value || 0);
  if (n > 0) return "Payable";
  if (n < 0) return "Receivable";
  return "Settled";
};
const formatBalance = (value) => {
  const n = Number(value || 0);
  return n === 0 ? "0" : `${formatAmount(Math.abs(n))} ${balanceSide(n)}`;
};
const EXPORT_COLUMNS = [
  { label: "Name", key: "name" },
  { label: "Opening Balance", key: "openingBalance", balance: true },
  { label: "Received", key: "periodCashIn" },
  { label: "Paid", key: "periodCashOut" },
  { label: "Closing Balance", key: "closingBalance", balance: true },
  { label: "Position", key: "closingBalance", side: true },
];
const BALANCE_TABS = [
  { key: "open", label: "Open" },
  { key: "payable", label: "Payable (We Owe)" },
  { key: "receivable", label: "Receivable (Owed to Us)" },
  { key: "settled", label: "Settled" },
  { key: "all", label: "All" },
];

const emptyForm = { name: "", note: "", status: "Active" };

const LoanTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const defaultDateRange = getDatePresetRange("last30");
  const [startDate, setStartDate] = useState(defaultDateRange.from);
  const [endDate, setEndDate] = useState(defaultDateRange.to);
  const [dateFilterType, setDateFilterType] = useState("last30");
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [balanceStatus, setBalanceStatus] = useState("open");

  const itemsPerPage = 10;
  const pagesPerSet = 10;
  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const { data, isLoading, isError, error } = useGetAllLoanQuery({
    page: currentPage,
    limit: itemsPerPage,
    searchTerm: debouncedSearchTerm || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    balanceStatus,
  });
  const exportLimit = Math.max(
    Number(data?.meta?.count || 0),
    data?.data?.length || 0,
    1,
  );
  const { data: exportData } = useGetAllLoanQuery({
    page: 1,
    limit: exportLimit,
    searchTerm: debouncedSearchTerm || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    balanceStatus,
  });
  const [insertLoan, { isLoading: isCreating }] = useInsertLoanMutation();
  const [updateLoan, { isLoading: isUpdating }] = useUpdateLoanMutation();
  const [deleteLoan] = useDeleteLoanMutation();

  const rows = data?.data || [];
  const meta = data?.meta || {};
  const exportRows = exportData?.data || rows;
  const exportMeta = exportData?.meta || meta;
  const isSaving = isCreating || isUpdating;

  useEffect(() => {
    if (isError) console.error("Error fetching loan data", error);
    if (!isLoading) {
      setTotalPages(Math.max(1, Math.ceil((meta.count || 0) / itemsPerPage)));
    }
  }, [error, isError, isLoading, meta.count]);

  const toSummary = (m) => ({
    totalPayable: m.totalPayable || 0,
    totalReceivable: m.totalReceivable || 0,
    netPosition: m.netPosition || 0,
    payableCount: m.payableCount || 0,
    receivableCount: m.receivableCount || 0,
  });
  const summary = useMemo(() => toSummary(meta), [meta]);

  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [debouncedSearchTerm, startDate, endDate, balanceStatus]);

  const dateRangeLabel = useMemo(() => {
    if (startDate && endDate) return `${startDate} to ${endDate}`;
    if (startDate) return `From ${startDate}`;
    if (endDate) return `Until ${endDate}`;
    return "All Data";
  }, [startDate, endDate]);

  const exportSummary = useMemo(() => toSummary(exportMeta), [exportMeta]);
  const netPositionLabel = (value) =>
    value < 0 ? "Net Payable" : value > 0 ? "Net Receivable" : "Net Position";

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const getExportCellValue = (row, column) => {
    if (column.side) return balanceSide(row[column.key]);
    if (column.balance) return formatBalance(row[column.key]);
    if (["periodCashIn", "periodCashOut"].includes(column.key)) {
      return Number(row[column.key] || 0);
    }
    return row[column.key] || "";
  };

  const getExportRows = () =>
    exportRows.map((row) =>
      EXPORT_COLUMNS.reduce(
        (acc, column) => ({
          ...acc,
          [column.label]: getExportCellValue(row, column),
        }),
        {},
      ),
    );

  const getExportFileName = (extension) => {
    const from = startDate || "all";
    const to = endDate || "data";
    return `loan-history-${from}-${to}.${extension}`;
  };

  const requireExportRows = () => {
    if (exportRows.length) return true;
    toast.error("No loan data found for this date range.");
    return false;
  };

  const handleDownloadSheet = async () => {
    if (!requireExportRows()) return;

    try {
      const XLSX = await import("xlsx");
      const worksheetRows = [
        { Field: "Report", Value: "Lender History" },
        { Field: "Date Range", Value: dateRangeLabel },
        { Field: "Total Payable (We Owe)", Value: exportSummary.totalPayable },
        { Field: "Total Receivable (Owed to Us)", Value: exportSummary.totalReceivable },
        {
          Field: netPositionLabel(exportSummary.netPosition),
          Value: Math.abs(exportSummary.netPosition),
        },
        {},
        ...getExportRows(),
      ];
      const worksheet = XLSX.utils.json_to_sheet(worksheetRows, {
        skipHeader: false,
      });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Lender History");
      XLSX.writeFile(workbook, getExportFileName("xlsx"));
    } catch (err) {
      toast.error("Google Sheet download failed.");
    }
  };

  const handleDownloadPdf = async () => {
    if (!requireExportRows()) return;

    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "landscape" });

      doc.setFontSize(16);
      doc.text("Lender History", 14, 16);
      doc.setFontSize(10);
      doc.text(`Date Range: ${dateRangeLabel}`, 14, 23);
      doc.text(`Total Payable: ${formatAmount(exportSummary.totalPayable)}`, 14, 30);
      doc.text(`Total Receivable: ${formatAmount(exportSummary.totalReceivable)}`, 82, 30);
      doc.text(
        `Net ${exportSummary.netPosition < 0 ? "Payable" : "Receivable"}: ${formatAmount(Math.abs(exportSummary.netPosition))}`,
        160,
        30,
      );

      autoTable(doc, {
        startY: 38,
        head: [EXPORT_COLUMNS.map((column) => column.label)],
        body: exportRows.map((row) =>
          EXPORT_COLUMNS.map((column) => {
            const value = getExportCellValue(row, column);
            return typeof value === "number" ? formatAmount(value) : value;
          }),
        ),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] },
      });

      doc.save(getExportFileName("pdf"));
    } catch (err) {
      toast.error("PDF download failed.");
    }
  };

  const handlePrint = () => {
    if (!requireExportRows()) return;

    const headerMarkup = EXPORT_COLUMNS.map(
      (column) => `<th>${escapeHtml(column.label)}</th>`,
    ).join("");
    const rowsMarkup = exportRows
      .map(
        (row) => `
          <tr>
            ${EXPORT_COLUMNS.map((column) => {
              const value = getExportCellValue(row, column);
              return `<td>${escapeHtml(
                typeof value === "number" ? formatAmount(value) : value,
              )}</td>`;
            }).join("")}
          </tr>`,
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
      toast.error("Please allow popups to print loan history.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Lender History</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
            h1 { font-size: 22px; margin: 0 0 6px; }
            .muted { color: #475569; margin: 0 0 16px; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px; }
            .summary div { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; }
            .summary span { display: block; color: #64748b; font-size: 11px; margin-bottom: 4px; }
            .summary strong { font-size: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #f1f5f9; font-weight: 700; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Lender History</h1>
          <p class="muted">Date Range: ${escapeHtml(dateRangeLabel)}</p>
          <div class="summary">
            <div><span>Total Payable (We Owe)</span><strong>${escapeHtml(formatAmount(exportSummary.totalPayable))}</strong></div>
            <div><span>Total Receivable (Owed to Us)</span><strong>${escapeHtml(formatAmount(exportSummary.totalReceivable))}</strong></div>
            <div><span>${escapeHtml(netPositionLabel(exportSummary.netPosition))}</span><strong>${escapeHtml(formatAmount(Math.abs(exportSummary.netPosition)))}</strong></div>
          </div>
          <table>
            <thead><tr>${headerMarkup}</tr></thead>
            <tbody>${rowsMarkup}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

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
        <SummaryCard
          label="Total Payable (We Owe)"
          value={summary.totalPayable}
          hint={`${summary.payableCount} parties`}
          tone="rose"
        />
        <SummaryCard
          label="Total Receivable (Owed to Us)"
          value={summary.totalReceivable}
          hint={`${summary.receivableCount} parties`}
          tone="emerald"
        />
        <SummaryCard
          label={netPositionLabel(summary.netPosition)}
          value={Math.abs(summary.netPosition)}
          hint="Receivable − Payable"
          tone={summary.netPosition < 0 ? "rose" : "indigo"}
        />
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
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
          <Search
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
        </div>
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onFilterTypeChange={(type) => setDateFilterType(type)}
          defaultFilter={dateFilterType}
          compact
          className="w-full xl:max-w-sm"
          selectWrapperClassName="w-full"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadSheet}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            <FileSpreadsheet size={17} />
            Google Sheet
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100"
          >
            <FileText size={17} />
            PDF
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Printer size={17} />
            Print
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus size={18} />
            Add Loan Party
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {BALANCE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setBalanceStatus(tab.key)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              balanceStatus === tab.key
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 bg-white">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Name
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                Opening Balance<span className="block text-[10px] font-normal normal-case tracking-normal text-slate-400">Before period</span>
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                Received<span className="block text-[10px] font-normal normal-case tracking-normal text-slate-400">Loan taken / recovered</span>
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                Paid<span className="block text-[10px] font-normal normal-case tracking-normal text-slate-400">Repaid / loan given</span>
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                Closing Balance
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Position
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((item) => (
              <tr key={item.Id} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <Link
                    to={`/loan/${item.Id}`}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
                      <HandCoins className="text-indigo-600" size={18} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900 hover:text-indigo-600">
                        {item.name}
                      </span>
                      {item.note && (
                        <span className="block text-xs text-slate-500">
                          {item.note}
                        </span>
                      )}
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-4 text-right text-sm tabular-nums text-slate-500">
                  {formatBalance(item.openingBalance)}
                </td>
                <td className="px-5 py-4 text-right text-sm tabular-nums text-slate-700">
                  {formatAmount(item.periodCashIn)}
                </td>
                <td className="px-5 py-4 text-right text-sm tabular-nums text-slate-700">
                  {formatAmount(item.periodCashOut)}
                </td>
                <td
                  className={`px-5 py-4 text-right text-sm font-semibold tabular-nums ${
                    item.closingBalance > 0
                      ? "text-rose-600"
                      : item.closingBalance < 0
                        ? "text-emerald-600"
                        : "text-slate-400"
                  }`}
                >
                  {formatAmount(Math.abs(item.closingBalance || 0))}
                </td>
                <td className="px-5 py-4">
                  <BalanceBadge value={item.closingBalance} />
                  {item.status === "Inactive" && (
                    <span className="ml-2 text-xs text-slate-400">Inactive</span>
                  )}
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
                <td
                  colSpan={7}
                  className="px-6 py-10 text-center text-sm text-slate-500"
                >
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
          onClick={() =>
            setStartPage((p) =>
              Math.min(
                p + pagesPerSet,
                Math.max(1, totalPages - pagesPerSet + 1),
              ),
            )
          }
          disabled={endPage === totalPages}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
        >
          Next
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingLoan ? "Edit Loan Party" : "Add Loan Party"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">
              Name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="h-11 bg-white w-full rounded-xl border border-slate-200 px-3 text-slate-900 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Party you borrow from or lend to"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((p) => ({ ...p, status: e.target.value }))
              }
              className="h-11 bg-white w-full rounded-xl border border-slate-200 px-3 text-slate-900 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">
              Note
            </label>
            <textarea
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              className="min-h-[96px] bg-white w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Optional note"
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

const BalanceBadge = ({ value }) => {
  const n = Number(value || 0);
  const cls =
    n > 0
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : n < 0
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-500";
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      {balanceSide(n)}
    </span>
  );
};

const SummaryCard = ({ label, value, hint, tone }) => {
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
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        <div
          className={`h-10 w-10 rounded-xl border flex items-center justify-center ${toneClass}`}
        >
          <HandCoins size={18} />
        </div>
      </div>
    </div>
  );
};

export default LoanTable;
