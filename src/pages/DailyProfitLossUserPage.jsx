import { useEffect, useMemo, useState } from "react";
import useDebounce from "../hooks/useDebounce";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit3,
  Mail,
  Printer,
  RefreshCcw,
  Search,
  Trash2,
} from "lucide-react";
import Select from "react-select";
import toast from "react-hot-toast";
import Header from "../components/common/Header";
import {
  useDeleteEmployeeWorkReportMutation,
  useGetAllEmployeeWorkReportsQuery,
  useGetMyEmployeeWorkReportsQuery,
  useUpdateEmployeeWorkReportMutation,
} from "../features/employeeWorkReport/employeeWorkReport";
import { useGetAllEmployeeListWithoutQueryQuery } from "../features/employeeList/employeeList";
import {
  useInsertProfitLossMutation,
  useGetAllProfitLossQuery,
  useDeleteProfitLossMutation,
  useSendProfitLossInvoiceMutation,
} from "../features/profitLoss/profitLoss";

const today = new Date().toISOString().slice(0, 10);

const REPORT_FIELDS = [
  { key: "failedGiven", label: "Failed দেওয়া হয়েছে" },
  { key: "failedReceived", label: "Failed থেকে আসছে" },
  { key: "pendingGiven", label: "Pending দেওয়া হয়েছে" },
  { key: "pendingReceived", label: "Pending থেকে আসছে" },
  { key: "pendingReturnReceived", label: "Pending Return থেকে আসছে" },
  { key: "leadGiven", label: "Lead দেওয়া হয়েছে" },
  { key: "leadReceived", label: "Lead থেকে আসছে" },
  { key: "crossReceived", label: "Cross থেকে আসছে" },
  { key: "canceledReceived", label: "Canceled থেকে আসছে" },
  { key: "holdReceived", label: "Hold থেকে আসছে" },
  { key: "ideskGiven", label: "Inbox দেওয়া হয়েছে" },
  { key: "ideskReceived", label: "Inbox থেকে আসছে" },
  { key: "callDone", label: "Call করা হয়েছে" },
  { key: "callReceived", label: "Call থেকে আসছে" },
  { key: "whatsappDone", label: "WhatsApp করা হয়েছে" },
  { key: "whatsappReceived", label: "WhatsApp থেকে আসছে" },
  { key: "totalAssign", label: "Total Assign" },
  { key: "totalOrder", label: "Total Order" },
  { key: "totalAmount", label: "Total Amount", step: "0.01" },
];

const TOTAL_ASSIGN_SOURCE_FIELDS = [
  "failedGiven",
  "pendingGiven",
  "leadGiven",
  "ideskGiven",
  "callDone",
  "whatsappDone",
];
const TOTAL_ORDER_SOURCE_FIELDS = [
  "failedReceived",
  "pendingReceived",
  "pendingReturnReceived",
  "leadReceived",
  "crossReceived",
  "canceledReceived",
  "holdReceived",
  "ideskReceived",
  "callReceived",
  "whatsappReceived",
];
const AUTO_TOTAL_FIELDS = ["totalAssign", "totalOrder"];
const AUTO_TOTAL_SOURCE_FIELDS = [
  ...TOTAL_ASSIGN_SOURCE_FIELDS,
  ...TOTAL_ORDER_SOURCE_FIELDS,
];

const salesTypeOptions = [
  { value: "Regular Sale", label: "Regular Sale" },
  { value: "Up Sale", label: "Up Sale" },
  { value: "Cross Sale", label: "Cross Sale" },
  { value: "Organic Sale", label: "Organic Sale" },
  { value: "Office Sale", label: "Office Sale" },
];

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumReportFields = (values, fields) =>
  fields.reduce((total, field) => total + safeNumber(values[field]), 0);

const getAutoReportTotals = (values) => ({
  totalAssign: sumReportFields(values, TOTAL_ASSIGN_SOURCE_FIELDS),
  totalOrder: sumReportFields(values, TOTAL_ORDER_SOURCE_FIELDS),
});

const withAutoReportTotals = (values) => ({
  ...values,
  ...getAutoReportTotals(values),
});

const formatCurrency = (value) =>
  `৳${safeNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 12,
    borderColor: state.isFocused ? "#6366f1" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 4px rgb(99 102 241 / 0.1)" : "none",
    "&:hover": { borderColor: state.isFocused ? "#6366f1" : "#cbd5e1" },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 12,
    overflow: "hidden",
    zIndex: 50,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#4f46e5"
      : state.isFocused
        ? "#eef2ff"
        : "#fff",
    color: state.isSelected ? "#fff" : "#0f172a",
  }),
};

const DailyProfitLossUserPage = () => {
  const role = localStorage.getItem("role") || "user";
  const canManageReports = ["superAdmin", "admin"].includes(role);
  const currentUserId = Number(localStorage.getItem("userId") || 0);
  const pageSize = 10;
  const historyPageSize = 10;

  // Employee reports state
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [currentPage, setCurrentPage] = useState(1);

  // Edit report modal
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);

  // Calculation inputs
  const [marketingSpends, setMarketingSpends] = useState(0);
  const [otherExpenses, setOtherExpenses] = useState(0);
  const [returnPercentage, setReturnPercentage] = useState(0);
  const [calculationDate, setCalculationDate] = useState(today);
  const [salesType, setSalesType] = useState(null);

  // Profit/Loss history state
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [salesTypeSearch, setSalesTypeSearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);

  // Email invoice modal
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedInvoiceRow, setSelectedInvoiceRow] = useState(null);
  const [clientEmail, setClientEmail] = useState("");

  // ── Employee reports queries ──
  const listQueryArgs = useMemo(
    () => ({
      page: currentPage,
      limit: pageSize,
      searchTerm: debouncedSearchTerm || undefined,
      employeeId: selectedEmployee?.value || undefined,
      startDate: fromDate || undefined,
      endDate: toDate || undefined,
    }),
    [currentPage, debouncedSearchTerm, selectedEmployee, fromDate, toDate],
  );

  const allReportsQueryArgs = useMemo(
    () => ({
      page: 1,
      limit: 9999,
      startDate: fromDate || undefined,
      endDate: toDate || undefined,
    }),
    [fromDate, toDate],
  );

  const { data: employeeListRes } = useGetAllEmployeeListWithoutQueryQuery(
    undefined,
    { skip: !canManageReports },
  );

  const {
    data: allReportsRes,
    isLoading: allReportsLoading,
    refetch: refetchAll,
  } = useGetAllEmployeeWorkReportsQuery(listQueryArgs, {
    skip: !canManageReports,
  });
  const {
    data: myReportsRes,
    isLoading: myReportsLoading,
    refetch: refetchMine,
  } = useGetMyEmployeeWorkReportsQuery(listQueryArgs, {
    skip: canManageReports,
  });

  const { data: allReportsForCalcRes } = useGetAllEmployeeWorkReportsQuery(
    allReportsQueryArgs,
    { skip: !canManageReports },
  );
  const { data: myReportsForCalcRes } = useGetMyEmployeeWorkReportsQuery(
    allReportsQueryArgs,
    { skip: canManageReports },
  );

  const [updateReport, { isLoading: updating }] =
    useUpdateEmployeeWorkReportMutation();
  const [deleteReport, { isLoading: deleting }] =
    useDeleteEmployeeWorkReportMutation();

  // ── Profit/Loss queries ──
  const [insertProfitLoss, { isLoading: saving }] =
    useInsertProfitLossMutation();
  const [sendProfitLossInvoice, { isLoading: sendingEmail }] =
    useSendProfitLossInvoiceMutation();
  const [deleteProfitLoss, { isLoading: deletingProfitLoss }] =
    useDeleteProfitLossMutation();

  const profitLossQueryArgs = useMemo(
    () => ({
      page: historyPage,
      limit: historyPageSize,
      startDate: historyStartDate || undefined,
      endDate: historyEndDate || undefined,
      searchTerm: salesTypeSearch || undefined,
      mode: "user",
    }),
    [historyPage, historyStartDate, historyEndDate, salesTypeSearch],
  );

  const { data: profitLossRes, isLoading: profitLossLoading } =
    useGetAllProfitLossQuery(profitLossQueryArgs);

  const profitLossRows = profitLossRes?.data || [];
  const totalProfitLossCount = safeNumber(
    profitLossRes?.meta?.total || profitLossRes?.meta?.count,
  );
  const historyTotalPages = Math.max(
    1,
    Math.ceil(totalProfitLossCount / historyPageSize),
  );

  // ── Derived data ──
  const employeeOptions = useMemo(
    () =>
      (employeeListRes?.data || [])
        .filter((emp) => emp?.Id)
        .map((emp) => ({
          value: emp.Id,
          label: `${emp.name || "Unnamed Employee"}${emp.employeeCode ? ` (${emp.employeeCode})` : ""}`,
        })),
    [employeeListRes],
  );

  const reportRes = canManageReports ? allReportsRes : myReportsRes;
  const reports = reportRes?.data || [];
  const reportMeta = reportRes?.meta || {};
  const totalReports = reportMeta?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalReports / pageSize));
  const isLoading = allReportsLoading || myReportsLoading;

  const calcReportRes = canManageReports
    ? allReportsForCalcRes
    : myReportsForCalcRes;
  const allCalcReports = calcReportRes?.data || [];

  const totals = allCalcReports.reduce(
    (acc, row) => ({
      totalAssign: acc.totalAssign + Number(row.totalAssign || 0),
      totalOrder: acc.totalOrder + Number(row.totalOrder || 0),
      totalAmount: acc.totalAmount + Number(row.totalAmount || 0),
    }),
    { totalAssign: 0, totalOrder: 0, totalAmount: 0 },
  );

  const totalCalcReports = allCalcReports.length;

  const stats = [
    {
      name: "Reports",
      value: totalCalcReports,
      icon: ClipboardList,
      iconBg: "#EEF2FF",
      iconColor: "#4338CA",
    },
    {
      name: "Total Assign",
      value: totals.totalAssign,
      icon: BarChart3,
      iconBg: "#ECFDF5",
      iconColor: "#047857",
    },
    {
      name: "Total Order",
      value: totals.totalOrder,
      icon: CalendarDays,
      iconBg: "#FFF7ED",
      iconColor: "#C2410C",
    },
    {
      name: "Total Amount",
      value: totals.totalAmount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      icon: BarChart3,
      iconBg: "#F0F9FF",
      iconColor: "#0369A1",
    },
  ];

  // ── Calculation summary ──
  const summary = useMemo(() => {
    const revenue = totals.totalAmount;
    const returnRate = Math.min(Math.max(safeNumber(returnPercentage), 0), 100);
    const returnDeduction = (revenue * returnRate) / 100;
    const mktCost = safeNumber(marketingSpends);
    const otherCost = safeNumber(otherExpenses);
    const extraCost = mktCost + otherCost;
    const grossProfit = revenue - returnDeduction;
    const finalProfit = grossProfit - extraCost;

    return {
      revenue,
      returnRate,
      returnDeduction,
      mktCost,
      otherCost,
      extraCost,
      grossProfit,
      finalProfit,
      employeeCount: totalCalcReports,
    };
  }, [
    totals.totalAmount,
    totalCalcReports,
    returnPercentage,
    marketingSpends,
    otherExpenses,
  ]);

  // ── Handlers ──
  const refetchReports = () => {
    if (canManageReports) refetchAll();
    else refetchMine();
  };

  const handleEdit = (row) => {
    setEditingId(row.Id);
    setEditForm(
      withAutoReportTotals({
        reportDate: row.reportDate || today,
        saleType: row.saleType || "",
        ...REPORT_FIELDS.reduce(
          (acc, field) => ({ ...acc, [field.key]: row[field.key] ?? "" }),
          {},
        ),
      }),
    );
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const reportValues = withAutoReportTotals(editForm);
      const payload = {
        reportDate: editForm.reportDate,
        saleType: editForm.saleType || null,
        ...REPORT_FIELDS.reduce(
          (acc, field) => ({ ...acc, [field.key]: reportValues[field.key] || 0 }),
          {},
        ),
      };
      const res = await updateReport({
        id: editingId,
        data: payload,
      }).unwrap();
      if (res?.success) {
        toast.success("Work report updated");
        setShowEditModal(false);
        setEditingId(null);
        refetchReports();
      }
    } catch (err) {
      toast.error(
        err?.data?.message || err?.error || "Failed to update work report",
      );
    }
  };

  const handleDelete = async (row) => {
    const ok = window.confirm("Delete this work report?");
    if (!ok) return;
    try {
      const res = await deleteReport(row.Id).unwrap();
      if (res?.success) {
        toast.success("Work report deleted");
        refetchReports();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete work report");
    }
  };

  const handleDeleteProfitLossHistory = async (id) => {
    const ok = window.confirm("Delete this saved profit/loss record?");
    if (!ok) return;

    try {
      const res = await deleteProfitLoss(id).unwrap();
      if (res?.success) {
        toast.success("Profit/Loss history deleted");
      } else {
        toast.error(res?.message || "Delete failed");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed");
    }
  };

  const handleResetCalculation = () => {
    setMarketingSpends(0);
    setOtherExpenses(0);
    setReturnPercentage(0);
    setCalculationDate(today);
    setSalesType(null);
  };

  const handleSaveProfitLoss = async () => {
    if (!totalCalcReports) {
      toast.error("No employee reports found to calculate");
      return;
    }
    if (!salesType?.value) {
      toast.error("Please select a sales type");
      return;
    }

    const payload = {
      mode: "user",
      products: summary.employeeCount,
      purchase: 0,
      revenue: Math.round(summary.revenue),
      return: Math.round(summary.returnDeduction),
      cost: Math.round(summary.extraCost),
      profitLoss: Math.round(summary.finalProfit),
      salesType: salesType.value,
      date: calculationDate,
    };

    try {
      const res = await insertProfitLoss(payload).unwrap();
      if (res?.success) {
        toast.success("Profit/Loss saved successfully");
        handleResetCalculation();
      } else {
        toast.error(res?.message || "Save failed");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Save failed");
    }
  };

  // ── Invoice handlers ──
  const handlePrintInvoice = (row) => {
    const printWindow = window.open("", "_blank", "width=1200,height=820");
    if (!printWindow) {
      toast.error("Please allow popups to print the invoice");
      return;
    }

    const invoiceDate = formatDate(row?.createdAt);
    const invoiceNo = `PL-${row?.Id || Date.now()}`;
    const invoiceSalesType = escapeHtml(
      row?.salesType || salesType?.value || "-",
    );

    const reportRowsHtml =
      allCalcReports.length > 0
        ? allCalcReports
            .map(
              (r) => `<tr>
                <td>${escapeHtml(r.reportDate || "-")}</td>
                <td>${escapeHtml(r.name || "-")}</td>
                <td>${safeNumber(r.failedGiven)}/${safeNumber(r.failedReceived)}</td>
                <td>${safeNumber(r.pendingGiven)}/${safeNumber(r.pendingReceived)}</td>
                <td>${safeNumber(r.leadGiven)}/${safeNumber(r.leadReceived)}</td>
                <td>${safeNumber(r.crossReceived)}</td>
                <td>${safeNumber(r.ideskGiven)}/${safeNumber(r.ideskReceived)}</td>
                <td>${safeNumber(r.callDone)}/${safeNumber(r.callReceived)}</td>
                <td>${safeNumber(r.whatsappDone)}/${safeNumber(r.whatsappReceived)}</td>
                <td>${safeNumber(r.totalAssign)}</td>
                <td>${safeNumber(r.totalOrder)}</td>
                <td class="amount">${escapeHtml(formatCurrency(r.totalAmount))}</td>
              </tr>`,
            )
            .join("")
        : `<tr><td colspan="12" style="text-align:center;padding:20px;color:#94a3b8;">কোনো employee report নেই</td></tr>`;

    const historyRowsHtml =
      profitLossRows.length > 0
        ? profitLossRows
            .map((hr) => {
              const pl = safeNumber(hr?.profitLoss);
              const plColor = pl >= 0 ? "#059669" : "#dc2626";
              return `<tr>
                <td>${escapeHtml(formatDate(hr?.createdAt))}</td>
                <td>${escapeHtml(hr?.salesType || "-")}</td>
                <td class="amount">${escapeHtml(formatCurrency(hr?.revenue))}</td>
                <td class="amount">${escapeHtml(formatCurrency(hr?.return))}</td>
                <td class="amount">${escapeHtml(formatCurrency(hr?.cost))}</td>
                <td class="amount" style="color:${plColor}">${escapeHtml(formatCurrency(hr?.profitLoss))}</td>
              </tr>`;
            })
            .join("")
        : `<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;">কোনো saved history নেই</td></tr>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Profit Loss Invoice (By User) - ${escapeHtml(invoiceNo)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; font-size: 13px; }
            h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
            h2 { font-size: 15px; font-weight: 700; margin: 28px 0 10px; color: #1e293b; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
            .meta { color: #475569; font-size: 12px; margin-bottom: 3px; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
            th { background: #f8fafc; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px; color: #475569; }
            .amount { font-weight: 700; }
            .breakdown { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 8px; }
            .breakdown-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
            .breakdown-item .lbl { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
            .breakdown-item .val { font-size: 15px; font-weight: 700; margin-top: 5px; }
            .profit { color: #059669; }
            .loss { color: #dc2626; }
            .span2 { grid-column: span 2; }
            @media print { body { padding: 16px; } }
          </style>
        </head>
        <body>
          <h1>Profit/Loss Invoice (By User)</h1>
          <div class="meta">Invoice No: ${escapeHtml(invoiceNo)}</div>
          <div class="meta">Date: ${escapeHtml(invoiceDate)}</div>
          <div class="meta">Sales Type: ${invoiceSalesType}</div>
          <div class="meta">Date Range: ${escapeHtml(fromDate || "-")} to ${escapeHtml(toDate || "-")}</div>

          <h2>Employee Reports</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Name</th><th>Failed</th><th>Pending</th>
                <th>Lead</th><th>Cross</th><th>Inbox</th><th>Call</th><th>WhatsApp</th>
                <th>Assign</th><th>Order</th><th>Amount</th>
              </tr>
            </thead>
            <tbody>${reportRowsHtml}</tbody>
          </table>

          <h2>Calculation Breakdown</h2>
          <div class="breakdown">
            <div class="breakdown-item">
              <div class="lbl">Total Amount</div>
              <div class="val">${escapeHtml(formatCurrency(summary.revenue))}</div>
            </div>
            <div class="breakdown-item">
              <div class="lbl">Marketing Spends</div>
              <div class="val">${escapeHtml(formatCurrency(summary.mktCost))}</div>
            </div>
            <div class="breakdown-item">
              <div class="lbl">Other Expenses</div>
              <div class="val">${escapeHtml(formatCurrency(summary.otherCost))}</div>
            </div>
            <div class="breakdown-item">
              <div class="lbl">Return (${summary.returnRate.toFixed(2)}%)</div>
              <div class="val">${escapeHtml(formatCurrency(summary.returnDeduction))}</div>
            </div>
            <div class="breakdown-item span2">
              <div class="lbl">Gross Profit</div>
              <div class="val">${escapeHtml(formatCurrency(summary.grossProfit))}</div>
            </div>
            <div class="breakdown-item span2">
              <div class="lbl">Net Profit/Loss</div>
              <div class="val ${summary.finalProfit >= 0 ? "profit" : "loss"}">${escapeHtml(formatCurrency(summary.finalProfit))}</div>
            </div>
          </div>

          <h2>Saved Profit/Loss History</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Sales Type</th><th>Sale</th>
                <th>Return</th><th>Cost</th><th>Profit/Loss</th>
              </tr>
            </thead>
            <tbody>${historyRowsHtml}</tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleSendEmail = (row) => {
    setSelectedInvoiceRow(row);
    setClientEmail("");
    setIsEmailModalOpen(true);
  };

  const handleCloseEmailModal = () => {
    setIsEmailModalOpen(false);
    setSelectedInvoiceRow(null);
    setClientEmail("");
  };

  const handleSubmitInvoiceEmail = async () => {
    if (!clientEmail.trim()) {
      toast.error("Please enter client email");
      return;
    }
    if (!selectedInvoiceRow) {
      toast.error("No invoice selected");
      return;
    }

    const employeeReportDetails = allCalcReports.map((r) => ({
      reportDate: r.reportDate || "-",
      name: r.name || "-",
      failed: `${safeNumber(r.failedGiven)}/${safeNumber(r.failedReceived)}`,
      pending: `${safeNumber(r.pendingGiven)}/${safeNumber(r.pendingReceived)}`,
      lead: `${safeNumber(r.leadGiven)}/${safeNumber(r.leadReceived)}`,
      cross: safeNumber(r.crossReceived),
      inbox: `${safeNumber(r.ideskGiven)}/${safeNumber(r.ideskReceived)}`,
      call: `${safeNumber(r.callDone)}/${safeNumber(r.callReceived)}`,
      whatsapp: `${safeNumber(r.whatsappDone)}/${safeNumber(r.whatsappReceived)}`,
      totalAssign: safeNumber(r.totalAssign),
      totalOrder: safeNumber(r.totalOrder),
      totalAmount: safeNumber(r.totalAmount),
    }));

    const savedHistoryDetails = profitLossRows.map((hr) => ({
      date: formatDate(hr?.createdAt),
      salesType: hr?.salesType || "-",
      revenue: safeNumber(hr?.revenue),
      return: safeNumber(hr?.return),
      cost: safeNumber(hr?.cost),
      profitLoss: safeNumber(hr?.profitLoss),
    }));

    const payload = {
      clientEmail: clientEmail.trim(),
      invoiceNumber: `PL-${selectedInvoiceRow?.Id || Date.now()}`,
      companyName: "Kafelamart Accounts",
      reportTitle: "Profit & Loss Invoice (By User)",
      reportDate: selectedInvoiceRow?.createdAt,
      profitLossId: selectedInvoiceRow?.Id,
      salesType: selectedInvoiceRow?.salesType || "",
      products: safeNumber(selectedInvoiceRow?.products),
      purchase: safeNumber(selectedInvoiceRow?.purchase),
      revenue: safeNumber(selectedInvoiceRow?.revenue),
      return: safeNumber(selectedInvoiceRow?.return),
      cost: safeNumber(selectedInvoiceRow?.cost),
      profitLoss: safeNumber(selectedInvoiceRow?.profitLoss),
      employeeReports: employeeReportDetails,
      calculationSummary: {
        revenue: summary.revenue,
        returnRate: summary.returnRate,
        returnDeduction: summary.returnDeduction,
        marketingCost: summary.mktCost,
        otherCost: summary.otherCost,
        grossProfit: summary.grossProfit,
        finalProfit: summary.finalProfit,
      },
      savedHistory: savedHistoryDetails,
    };

    try {
      const res = await sendProfitLossInvoice(payload).unwrap();
      if (res?.success) {
        toast.success("Invoice sent successfully");
        handleCloseEmailModal();
      } else {
        toast.error(res?.message || "Failed to send invoice");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to send invoice");
    }
  };

  // ── Effects ──
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedEmployee, fromDate, toDate]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyStartDate, historyEndDate, salesTypeSearch]);

  return (
    <div className="relative z-10 flex-1">
      <Header title="Daily Profit & Loss By User" />

      <main className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-8xl space-y-6">
          {/* ── Stats ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.name}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: stat.iconBg }}
                >
                  <stat.icon size={22} style={{ color: stat.iconColor }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.name}
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Employee Reports Table ── */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {canManageReports ? "All Employee Reports" : "My Reports"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Search by name and filter with start and end date.
                </p>
              </div>
              <div className="text-sm font-semibold text-slate-600">
                Showing {reports.length} of {totalReports}
              </div>
            </div>

            <div
              className={`mt-5 grid gap-3 ${
                canManageReports
                  ? "lg:grid-cols-[260px_1fr_160px_160px]"
                  : "lg:grid-cols-[1fr_160px_160px]"
              }`}
            >
              {canManageReports && (
                <Select
                  value={selectedEmployee}
                  onChange={setSelectedEmployee}
                  options={employeeOptions}
                  isClearable
                  placeholder="Select employee"
                  className="text-sm text-slate-900"
                  styles={selectStyles}
                />
              )}
              <label className="relative block">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search something..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[1040px] w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Failed</th>
                    <th className="px-4 py-3">Pending</th>
                    <th className="px-4 py-3">Lead</th>
                    <th className="px-4 py-3">Cross</th>
                    <th className="px-4 py-3">Inbox</th>
                    <th className="px-4 py-3">Call</th>
                    <th className="px-4 py-3">WhatsApp</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {isLoading && (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        Loading reports...
                      </td>
                    </tr>
                  )}
                  {!isLoading && reports.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        No cs work report found.
                      </td>
                    </tr>
                  )}
                  {!isLoading &&
                    reports.map((row) => {
                      const canMutateRow =
                        Number(row.user?.Id) === currentUserId;
                      return (
                        <tr key={row.Id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {row.reportDate}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">
                              {row.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {row.user?.Email || "-"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {row.failedGiven || 0} / {row.failedReceived || 0}
                          </td>
                          <td className="px-4 py-3">
                            {row.pendingGiven || 0} / {row.pendingReceived || 0}
                          </td>
                          <td className="px-4 py-3">
                            {row.leadGiven || 0} / {row.leadReceived || 0}
                          </td>
                          <td className="px-4 py-3">
                            {row.crossReceived || 0}
                          </td>
                          <td className="px-4 py-3">
                            {row.ideskGiven || 0} / {row.ideskReceived || 0}
                          </td>
                          <td className="px-4 py-3">
                            {row.callDone || 0} / {row.callReceived || 0}
                          </td>
                          <td className="px-4 py-3">
                            {row.whatsappDone || 0} /{" "}
                            {row.whatsappReceived || 0}
                          </td>
                          <td className="px-4 py-3">
                            {canMutateRow ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(row)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                                  title="Edit"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(row)}
                                  disabled={deleting}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                                  title="Delete"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            ) : (
                              <div className="text-right text-xs font-semibold text-slate-400">
                                View only
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="px-3 text-sm font-semibold text-slate-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </section>

          {/* ── Calculation Section ── */}
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">
                Calculation Date
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Select the date for this profit/loss calculation and saved
                history.
              </p>
              <input
                type="date"
                value={calculationDate}
                onChange={(e) => setCalculationDate(e.target.value)}
                className="mt-4 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">
                Marketing Spends
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                (Optional) Enter any marketing spends for the day to include in
                the profit/loss calculation.
              </p>
              <input
                type="number"
                min="0"
                step="0.01"
                value={marketingSpends}
                onChange={(e) => setMarketingSpends(e.target.value)}
                className="mt-4 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">
                Other Expenses
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                (Optional) Enter any other expenses for the day to include in
                the profit/loss calculation.
              </p>
              <input
                type="number"
                min="0"
                step="0.01"
                value={otherExpenses}
                onChange={(e) => setOtherExpenses(e.target.value)}
                className="mt-4 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">
                Return Percentage
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                (Optional) Enter return percentage to deduct from units sold
                (e.g. 20 for 20%).
              </p>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={returnPercentage}
                onChange={(e) => setReturnPercentage(e.target.value)}
                className="mt-4 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Actions</h3>
              <Select
                value={salesType}
                onChange={setSalesType}
                options={salesTypeOptions}
                isClearable
                placeholder="Select sales type"
                className="mt-4 text-sm text-slate-900"
                styles={selectStyles}
              />
              <button
                type="button"
                onClick={handleSaveProfitLoss}
                disabled={saving}
                className="mt-3 h-11 w-full rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Calculate Profit/Loss"}
              </button>
              <button
                type="button"
                onClick={handleResetCalculation}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Reset
              </button>
            </div>
          </div>

          {/* ── Summary Bar ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
              Gross Profit:{" "}
              <span
                className={
                  summary.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"
                }
              >
                {formatCurrency(summary.grossProfit)}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
              Marketing Spends: {formatCurrency(summary.mktCost)}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
              Other Expenses: {formatCurrency(summary.otherCost)}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
              Return Deduction ({summary.returnRate.toFixed(2)}%):{" "}
              {formatCurrency(summary.returnDeduction)}
            </div>
          </div>

          {/* ── Saved Profit/Loss History ── */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Saved Profit/Loss History
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Date filter, sales type search আর pagination সহ saved data
                  দেখা যাবে।
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    Start Date
                  </span>
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    End Date
                  </span>
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => setHistoryEndDate(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    Sales Type
                  </span>
                  <input
                    type="text"
                    value={salesTypeSearch}
                    onChange={(e) => setSalesTypeSearch(e.target.value)}
                    placeholder="Search by sales type"
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Sales Type</th>
                    <th className="px-4 py-3">Sale</th>
                    <th className="px-4 py-3">Return</th>
                    <th className="px-4 py-3">Cost</th>
                    <th className="px-4 py-3">Profit/Loss</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {profitLossLoading && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        Loading history...
                      </td>
                    </tr>
                  )}
                  {!profitLossLoading && profitLossRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        No saved profit/loss records found.
                      </td>
                    </tr>
                  )}
                  {!profitLossLoading &&
                    profitLossRows.map((row) => (
                      <tr key={row.Id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {formatDate(row.date || row.createdAt)}
                        </td>
                        <td className="px-4 py-3">{row.salesType || "-"}</td>
                        <td className="px-4 py-3 font-semibold">
                          {formatCurrency(row.revenue)}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {formatCurrency(row.return)}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {formatCurrency(row.cost)}
                        </td>
                        <td
                          className={`px-4 py-3 font-bold ${safeNumber(row.profitLoss) >= 0 ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {formatCurrency(row.profitLoss)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handlePrintInvoice(row)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                            >
                              <Printer size={14} /> Print
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendEmail(row)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                            >
                              <Mail size={14} /> Email
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteProfitLossHistory(row?.Id)
                              }
                              disabled={deletingProfitLoss}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Total: {totalProfitLossCount} records
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setHistoryPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={historyPage === 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2 text-sm font-semibold text-slate-600">
                  Page {historyPage} / {historyTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setHistoryPage((prev) =>
                      Math.min(prev + 1, historyTotalPages),
                    )
                  }
                  disabled={historyPage === historyTotalPages}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ── Edit Work Report Modal ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Edit Work Report
            </h3>
            <form className="mt-4 space-y-4" onSubmit={handleEditSubmit}>
              <label className="block">
                <div className="mb-2 text-sm font-semibold text-slate-700">
                  Report Date
                </div>
                <input
                  type="date"
                  value={editForm.reportDate}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      reportDate: e.target.value,
                    }))
                  }
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </label>
              <label className="block">
                <div className="mb-2 text-sm font-semibold text-slate-700">
                  Sale Type
                </div>
                <select
                  value={editForm.saleType || ""}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      saleType: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="">Select sale type</option>
                  {salesTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid max-h-[50vh] gap-3 overflow-y-auto sm:grid-cols-2">
                {REPORT_FIELDS.map((field) => (
                  <label key={field.key} className="block">
                    <div className="mb-2 text-sm font-semibold text-slate-700">
                      {field.label}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step={field.step || "1"}
                      value={editForm[field.key]}
                      onChange={(e) =>
                        setEditForm((prev) => {
                          const next = {
                            ...prev,
                            [field.key]: e.target.value,
                          };
                          if (!AUTO_TOTAL_SOURCE_FIELDS.includes(field.key)) {
                            return next;
                          }
                          return withAutoReportTotals(next);
                        })
                      }
                      readOnly={AUTO_TOTAL_FIELDS.includes(field.key)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingId(null);
                  }}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {updating ? "Saving..." : "Update Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Email Invoice Modal ── */}
      {isEmailModalOpen && selectedInvoiceRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Send Invoice Email
            </h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-900">
                  Invoice #{`PL-${selectedInvoiceRow.Id}`}
                </p>
                <p className="mt-1 text-slate-600">
                  Date: {formatDate(selectedInvoiceRow.createdAt)}
                </p>
                <p className="text-slate-600">
                  Sales Type: {selectedInvoiceRow.salesType || "-"}
                </p>
                <p className="text-slate-600">
                  Profit/Loss:{" "}
                  <span
                    className={`font-bold ${safeNumber(selectedInvoiceRow.profitLoss) >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {formatCurrency(selectedInvoiceRow.profitLoss)}
                  </span>
                </p>
              </div>
              <label className="block">
                <div className="mb-2 text-sm font-semibold text-slate-700">
                  Client Email
                </div>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="Enter client email"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseEmailModal}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitInvoiceEmail}
                  disabled={sendingEmail}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {sendingEmail ? "Sending..." : "Send Email"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyProfitLossUserPage;
