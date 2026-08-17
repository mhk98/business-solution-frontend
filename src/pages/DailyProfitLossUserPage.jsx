import { useEffect, useMemo, useRef, useState } from "react";
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
  Search,
  Trash2,
} from "lucide-react";
import Select from "react-select";
import toast from "react-hot-toast";
import Header from "../components/common/Header";
import DateRangeFilter from "../components/common/DateRangeFilter";
import EmailChipsInput from "../components/common/EmailChipsInput";
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
import { useGetMasterPermissionEmailOptionsQuery } from "../features/masterPermission/masterPermission";
import {
  DEFAULT_MASTER_PERMISSION_EMAIL,
  normalizePermissionEmail,
  useCanUseMasterPermission,
} from "../utils/masterPermissions";

const today = new Date().toISOString().slice(0, 10);

const REPORT_FIELDS = [
  { key: "failedGiven", label: "Failed দেওয়া হয়েছে" },
  { key: "failedReceived", label: "Failed থেকে আসছে" },
  { key: "pendingGiven", label: "Pending দেওয়া হয়েছে" },
  { key: "pendingReceived", label: "Pending থেকে আসছে" },
  { key: "notResponseGiven", label: "Not Response দেওয়া হয়েছে" },
  { key: "notResponseReceived", label: "Not Response থেকে আসছে" },
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

const REPORT_FIELD_MAP = new Map(
  REPORT_FIELDS.map((field) => [field.key, field]),
);
const getReportFields = (keys) =>
  keys.map((key) => REPORT_FIELD_MAP.get(key)).filter(Boolean);
const GIVEN_REPORT_FIELDS = getReportFields([
  "failedGiven",
  "pendingGiven",
  "leadGiven",
  "ideskGiven",
  "callDone",
  "whatsappDone",
  "notResponseGiven",
  "totalAssign",
  "totalAmount",
]);
const RECEIVED_REPORT_FIELDS = getReportFields([
  "failedReceived",
  "pendingReceived",
  "leadReceived",
  "ideskReceived",
  "callReceived",
  "whatsappReceived",
  "pendingReturnReceived",
  "crossReceived",
  "canceledReceived",
  "holdReceived",
  "notResponseReceived",
  "totalOrder",
]);

const TOTAL_ASSIGN_SOURCE_FIELDS = [
  "failedGiven",
  "pendingGiven",
  "notResponseGiven",
  "leadGiven",
  "ideskGiven",
  "callDone",
  "whatsappDone",
];
const TOTAL_ORDER_SOURCE_FIELDS = [
  "failedReceived",
  "pendingReceived",
  "notResponseReceived",
  "pendingReturnReceived",
  "leadReceived",
  "crossReceived",
  "canceledReceived",
  "holdReceived",
  "ideskReceived",
  "callReceived",
  "whatsappReceived",
];
const ORDER_REPORT_COLUMNS = [
  { key: "reportDate", label: "Date" },
  { key: "name", label: "Name" },
  { key: "failedReceived", label: "Failed" },
  { key: "pendingReceived", label: "Pending" },
  { key: "leadReceived", label: "Lead" },
  { key: "crossReceived", label: "Cross" },
  { key: "ideskReceived", label: "Inbox" },
  { key: "callReceived", label: "Call" },
  { key: "whatsappReceived", label: "WhatsApp" },
  { key: "pendingReturnReceived", label: "Pending Return" },
  { key: "canceledReceived", label: "Canceled" },
  { key: "holdReceived", label: "Hold" },
  { key: "notResponseReceived", label: "Not Response" },
  { key: "totalOrder", label: "Total Order" },
  { key: "totalAmount", label: "Total Amount" },
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

const isEmailSent = (row) =>
  row?.emailSent === true ||
  row?.emailSent === 1 ||
  row?.emailSent === "1" ||
  String(row?.emailSent || "").toLowerCase() === "true";

const getSavedCalculationSummary = (row, fallbackSummary) => {
  const marketingCost = safeNumber(row?.marketingSpends);
  const otherCost = safeNumber(row?.otherExpenses);
  const incentiveType =
    row?.incentiveType || fallbackSummary.incentiveType || "flat";
  const incentiveValue = safeNumber(
    row?.incentiveValue ?? fallbackSummary.incentiveValue,
  );
  const incentiveAmount = safeNumber(
    row?.incentiveAmount ?? fallbackSummary.incentiveAmount,
  );
  const returnRate = safeNumber(row?.returnPercentage);
  const returnDeduction = safeNumber(row?.return);
  const revenue = safeNumber(row?.revenue);
  const grossProfit = revenue - returnDeduction;

  return {
    revenue: revenue || fallbackSummary.revenue,
    returnRate,
    returnDeduction,
    marketingCost,
    otherCost,
    incentiveType,
    incentiveValue,
    incentiveAmount,
    grossProfit: revenue ? grossProfit : fallbackSummary.grossProfit,
    finalProfit: safeNumber(row?.profitLoss),
  };
};

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
  valueContainer: (base) => ({
    ...base,
    minWidth: 0,
  }),
  singleValue: (base) => ({
    ...base,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),
  placeholder: (base) => ({
    ...base,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),
};

const DailyProfitLossUserPage = () => {
  const role = localStorage.getItem("role") || "user";
  const isSuperAdmin = role === "superAdmin";
  const canManageReports = ["superAdmin", "admin", "marketer"].includes(role);
  const currentUserId = Number(localStorage.getItem("userId") || 0);
  const { canUseMasterPermission } = useCanUseMasterPermission();
  const canSeeSensitiveSummary = canUseMasterPermission;
  const canManageProfitLossHistoryActions = canUseMasterPermission;
  const { data: masterPermissionData } = useGetMasterPermissionEmailOptionsQuery();
  const masterPermissionEmailOptions = useMemo(() => {
    const emails = new Set([DEFAULT_MASTER_PERMISSION_EMAIL]);

    (masterPermissionData?.data || []).forEach((row) => {
      const email = normalizePermissionEmail(row?.email);
      if (email) emails.add(email);
    });

    return Array.from(emails).map((email) => ({
      value: email,
      label: email,
    }));
  }, [masterPermissionData]);
  const pageSize = 10;
  const historyPageSize = 10;

  // Employee reports state
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);

  // Edit report modal
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);

  // Calculation inputs
  const [marketingSpends, setMarketingSpends] = useState(0);
  const [otherExpenses, setOtherExpenses] = useState(0);
  const [returnPercentage, setReturnPercentage] = useState(0);
  const [incentiveType, setIncentiveType] = useState("flat");
  const [incentiveValue, setIncentiveValue] = useState(0);
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
  const emailInputRef = useRef(null);

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
      searchTerm: debouncedSearchTerm || undefined,
      employeeId: selectedEmployee?.value || undefined,
      startDate: fromDate || undefined,
      endDate: toDate || undefined,
    }),
    [debouncedSearchTerm, selectedEmployee, fromDate, toDate],
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
  const pagesPerSet = 10;
  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);
  const visiblePages = Array.from(
    { length: Math.max(0, endPage - startPage + 1) },
    (_, index) => startPage + index,
  );
  const isLoading = allReportsLoading || myReportsLoading;

  const calcReportRes = canManageReports
    ? allReportsForCalcRes
    : myReportsForCalcRes;
  const allCalcReports = calcReportRes?.data || [];
  const calcMeta = calcReportRes?.meta || {};

  const totals = {
    totalAssign:
      calcMeta.totalAssign ??
      allCalcReports.reduce(
        (sum, row) => sum + Number(row.totalAssign || 0),
        0,
      ),
    totalOrder:
      calcMeta.totalOrder ??
      allCalcReports.reduce((sum, row) => sum + Number(row.totalOrder || 0), 0),
    totalAmount:
      calcMeta.totalAmount ??
      allCalcReports.reduce(
        (sum, row) => sum + Number(row.totalAmount || 0),
        0,
      ),
  };

  const totalCalcReports = Number(calcMeta.count ?? allCalcReports.length);

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
    const grossProfit = revenue - returnDeduction;
    const incentiveInput = safeNumber(incentiveValue);
    const incentiveAmount =
      incentiveType === "percentage"
        ? (Math.max(grossProfit, 0) * incentiveInput) / 100
        : incentiveInput;
    const extraCost = mktCost + otherCost + incentiveAmount;
    const finalProfit = grossProfit - extraCost;

    return {
      revenue,
      returnRate,
      returnDeduction,
      mktCost,
      otherCost,
      incentiveType,
      incentiveValue: incentiveInput,
      incentiveAmount,
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
    incentiveType,
    incentiveValue,
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
          (acc, field) => ({
            ...acc,
            [field.key]: reportValues[field.key] || 0,
          }),
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
    if (!canManageProfitLossHistoryActions) {
      toast.error("You are not allowed to delete this record");
      return;
    }

    const ok = window.confirm("Delete this saved profit/loss record?");
    if (!ok) return;

    try {
      const res = await deleteProfitLoss({ id, mode: "user" }).unwrap();
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
    setIncentiveType("flat");
    setIncentiveValue(0);
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
    if (!fromDate || !toDate) {
      toast.error("Please select a date filter first");
      return;
    }

    const payload = {
      mode: "user",
      products: summary.employeeCount,
      purchase: 0,
      revenue: Math.round(summary.revenue),
      return: Math.round(summary.returnDeduction),
      marketingSpends: safeNumber(marketingSpends),
      otherExpenses: safeNumber(otherExpenses),
      incentiveType,
      incentiveValue: safeNumber(incentiveValue),
      incentiveAmount: Math.round(summary.incentiveAmount),
      returnPercentage: summary.returnRate,
      cost: Math.round(summary.extraCost),
      profitLoss: Math.round(summary.finalProfit),
      salesType: salesType.value,
      date: fromDate,
      note:
        fromDate === toDate
          ? `Calculation date: ${fromDate}`
          : `Calculation date range: ${fromDate} to ${toDate}`,
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
    if (!canManageProfitLossHistoryActions) {
      toast.error("You are not allowed to print this invoice");
      return;
    }

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
    const invoiceSummary = getSavedCalculationSummary(row, summary);

    const reportRowsHtml =
      allCalcReports.length > 0
        ? allCalcReports
            .map(
              (r) => `<tr>
                <td class="date-cell">${escapeHtml(r.reportDate || "-")}</td>
                <td>${escapeHtml(r.employee?.name || r.name || "-")}</td>
                <td>${safeNumber(r.failedReceived)}</td>
                <td>${safeNumber(r.pendingReceived)}</td>
                <td>${safeNumber(r.leadReceived)}</td>
                <td>${safeNumber(r.crossReceived)}</td>
                <td>${safeNumber(r.ideskReceived)}</td>
                <td>${safeNumber(r.callReceived)}</td>
                <td>${safeNumber(r.whatsappReceived)}</td>
                <td>${safeNumber(r.pendingReturnReceived)}</td>
                <td>${safeNumber(r.canceledReceived)}</td>
                <td>${safeNumber(r.holdReceived)}</td>
                <td>${safeNumber(r.notResponseReceived)}</td>
                <td>${safeNumber(r.totalOrder)}</td>
                <td class="amount">${escapeHtml(formatCurrency(r.totalAmount))}</td>
              </tr>`,
            )
            .join("")
        : `<tr><td colspan="15" style="text-align:center;padding:20px;color:#94a3b8;">কোনো employee report নেই</td></tr>`;

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
            .invoice-header { display: table; width: 100%; background: #11204a; color: #fff; padding: 22px 24px; border-radius: 12px 12px 0 0; margin-bottom: 22px; }
            .invoice-title { display: table-cell; vertical-align: top; }
            .invoice-title h1 { color: #fff; margin: 0 0 6px; }
            .invoice-title .subtitle { color: #dbeafe; font-size: 13px; font-weight: 700; }
            .invoice-meta { display: table-cell; vertical-align: top; text-align: right; min-width: 250px; }
            .invoice-meta .meta { color: #e0e7ff; font-size: 12px; margin-bottom: 5px; }
            .invoice-meta strong { color: #fff; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
            th { background: #f8fafc; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px; color: #475569; }
            .date-cell { min-width: 68px; white-space: nowrap; }
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
          <div class="invoice-header">
            <div class="invoice-title">
              <h1>Kafela Mart Accounts</h1>
              <div class="subtitle">Profit &amp; Loss Invoice (By User)</div>
            </div>
            <div class="invoice-meta">
              <div class="meta"><strong>Invoice No:</strong> ${escapeHtml(invoiceNo)}</div>
              <div class="meta"><strong>Date:</strong> ${escapeHtml(invoiceDate)}</div>
              <div class="meta"><strong>Sales Type:</strong> ${invoiceSalesType}</div>
              <div class="meta"><strong>Date Range:</strong> ${escapeHtml(fromDate || "-")} to ${escapeHtml(toDate || "-")}</div>
            </div>
          </div>

          <h2>Calculation Breakdown</h2>
          <div class="breakdown">
            <div class="breakdown-item">
              <div class="lbl">Total Amount</div>
              <div class="val">${escapeHtml(formatCurrency(invoiceSummary.revenue))}</div>
            </div>
            <div class="breakdown-item">
              <div class="lbl">Marketing Spends</div>
              <div class="val">${escapeHtml(formatCurrency(invoiceSummary.marketingCost))}</div>
            </div>
            <div class="breakdown-item">
              <div class="lbl">Other Expenses</div>
              <div class="val">${escapeHtml(formatCurrency(invoiceSummary.otherCost))}</div>
            </div>
            <div class="breakdown-item">
              <div class="lbl">Incentive${invoiceSummary.incentiveType === "percentage" ? ` (${invoiceSummary.incentiveValue.toFixed(2)}%)` : ""}</div>
              <div class="val">${escapeHtml(formatCurrency(invoiceSummary.incentiveAmount))}</div>
            </div>
            <div class="breakdown-item">
              <div class="lbl">Return (${invoiceSummary.returnRate.toFixed(2)}%)</div>
              <div class="val">${escapeHtml(formatCurrency(invoiceSummary.returnDeduction))}</div>
            </div>
            <div class="breakdown-item span2">
              <div class="lbl">Gross Profit</div>
              <div class="val">${escapeHtml(formatCurrency(invoiceSummary.grossProfit))}</div>
            </div>
            <div class="breakdown-item span2">
              <div class="lbl">Net Profit/Loss</div>
              <div class="val ${invoiceSummary.finalProfit >= 0 ? "profit" : "loss"}">${escapeHtml(formatCurrency(invoiceSummary.finalProfit))}</div>
            </div>
          </div>

          <h2>Employee Reports</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Name</th><th>Failed</th><th>Pending</th>
                <th>Lead</th><th>Cross</th><th>Inbox</th><th>Call</th><th>WhatsApp</th>
                <th>Pending Return</th><th>Canceled</th><th>Hold</th><th>Not Response</th>
                <th>Total Order</th><th>Amount</th>
              </tr>
            </thead>
            <tbody>${reportRowsHtml}</tbody>
          </table>

        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const buildInvoicePayload = (row, recipientEmail) => {
    const invoiceSummary = getSavedCalculationSummary(row, summary);
    const employeeReportDetails = allCalcReports.map((r) => ({
      reportDate: r.reportDate || "-",
      name: r.employee?.name || r.name || "-",
      failed: safeNumber(r.failedReceived),
      pending: safeNumber(r.pendingReceived),
      lead: safeNumber(r.leadReceived),
      cross: safeNumber(r.crossReceived),
      inbox: safeNumber(r.ideskReceived),
      call: safeNumber(r.callReceived),
      whatsapp: safeNumber(r.whatsappReceived),
      pendingReturn: safeNumber(r.pendingReturnReceived),
      canceled: safeNumber(r.canceledReceived),
      hold: safeNumber(r.holdReceived),
      notResponse: safeNumber(r.notResponseReceived),
      totalOrder: safeNumber(r.totalOrder),
      totalAmount: safeNumber(r.totalAmount),
    }));

    const savedHistoryDetails = profitLossRows.map((hr) => ({
      date: formatDate(hr?.createdAt),
      salesType: hr?.salesType || "-",
      ...(isSuperAdmin || canSeeSensitiveSummary
        ? {
            revenue: safeNumber(hr?.revenue),
            return: safeNumber(hr?.return),
            cost: safeNumber(hr?.cost),
            profitLoss: safeNumber(hr?.profitLoss),
          }
        : {}),
    }));

    return {
      clientEmail: recipientEmail,
      invoiceNumber: `PL-${row?.Id || Date.now()}`,
      companyName: "Kafela Mart Accounts",
      reportTitle: "Profit & Loss Invoice (By User)",
      reportDate: row?.createdAt,
      profitLossId: row?.Id,
      mode: row?.mode || "user",
      salesType: row?.salesType || "",
      employeeReports: employeeReportDetails,
      savedHistory: savedHistoryDetails,
      calculationSummary: {
        revenue: invoiceSummary.revenue,
        returnRate: invoiceSummary.returnRate,
        returnDeduction: invoiceSummary.returnDeduction,
        marketingCost: invoiceSummary.marketingCost,
        otherCost: invoiceSummary.otherCost,
        incentiveType: invoiceSummary.incentiveType,
        incentiveValue: invoiceSummary.incentiveValue,
        incentiveAmount: invoiceSummary.incentiveAmount,
        grossProfit: invoiceSummary.grossProfit,
        finalProfit: invoiceSummary.finalProfit,
      },
      ...(isSuperAdmin || canSeeSensitiveSummary
        ? {
            products: safeNumber(row?.products),
            purchase: safeNumber(row?.purchase),
            revenue: safeNumber(row?.revenue),
            return: safeNumber(row?.return),
            cost: safeNumber(row?.cost),
            profitLoss: safeNumber(row?.profitLoss),
          }
        : {}),
    };
  };

  const sendInvoiceEmail = async (row, recipientEmail, { closeModal } = {}) => {
    if (!row) {
      toast.error("No invoice selected");
      return;
    }

    const payload = buildInvoicePayload(row, recipientEmail);
    try {
      const res = await sendProfitLossInvoice(payload).unwrap();
      if (res?.success) {
        toast.success("Invoice sent successfully");
        if (closeModal) handleCloseEmailModal();
      } else {
        toast.error(res?.message || "Failed to send invoice");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to send invoice");
    }
  };

  const handleSendEmail = (row) => {
    setSelectedInvoiceRow(row);
    setClientEmail(
      canUseMasterPermission ? "" : masterPermissionEmailOptions[0]?.value || "",
    );
    setIsEmailModalOpen(true);
  };

  const handleCloseEmailModal = () => {
    setIsEmailModalOpen(false);
    setSelectedInvoiceRow(null);
    setClientEmail("");
  };

  const handleSubmitInvoiceEmail = async () => {
    if (!canUseMasterPermission) {
      if (!clientEmail) {
        toast.error("Please select a master permission email");
        return;
      }

      await sendInvoiceEmail(selectedInvoiceRow, clientEmail, {
        closeModal: true,
      });
      return;
    }

    const pendingEmails = emailInputRef.current?.commitPendingEmails?.();
    if (pendingEmails?.invalidEmails?.length) {
      toast.error(`Invalid email: ${pendingEmails.invalidEmails.join(", ")}`);
      return;
    }

    const recipientEmail = (pendingEmails?.value || clientEmail).trim();
    if (!recipientEmail) {
      toast.error("Please enter at least one client email");
      return;
    }

    await sendInvoiceEmail(selectedInvoiceRow, recipientEmail, {
      closeModal: true,
    });
  };

  // ── Effects ──
  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [searchTerm, selectedEmployee, fromDate, toDate]);

  useEffect(() => {
    if (currentPage < startPage) {
      setStartPage(currentPage);
    } else if (currentPage > endPage) {
      setStartPage(
        Math.max(
          1,
          Math.floor((currentPage - 1) / pagesPerSet) * pagesPerSet + 1,
        ),
      );
    }
  }, [currentPage, startPage, endPage, pagesPerSet]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }

    setStartPage((prev) =>
      Math.min(prev, Math.max(1, totalPages - pagesPerSet + 1)),
    );
  }, [currentPage, totalPages, pagesPerSet]);

  const handleReportPageChange = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;

    setCurrentPage(pageNumber);
    if (pageNumber < startPage) {
      setStartPage(pageNumber);
    } else if (pageNumber > endPage) {
      setStartPage(pageNumber - pagesPerSet + 1);
    }
  };

  const handlePreviousPageSet = () => {
    setStartPage((prev) => Math.max(prev - pagesPerSet, 1));
    setCurrentPage((prev) => Math.max(prev - pagesPerSet, 1));
  };

  const handleNextPageSet = () => {
    const nextStart = Math.min(
      startPage + pagesPerSet,
      Math.max(1, totalPages - pagesPerSet + 1),
    );
    setStartPage(nextStart);
    setCurrentPage(nextStart);
  };

  useEffect(() => {
    setHistoryPage(1);
  }, [historyStartDate, historyEndDate, salesTypeSearch]);

  return (
    <div className="relative z-10 flex-1">
      <Header title="Daily Profit & Loss By User" />

      <main className="min-h-[calc(100vh-64px)] min-w-0 bg-slate-50 px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
        <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 sm:space-y-6">
          {/* ── Stats ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.name}
                className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:gap-4 sm:p-5"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12"
                  style={{ backgroundColor: stat.iconBg }}
                >
                  <stat.icon size={22} style={{ color: stat.iconColor }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">
                    {stat.name}
                  </p>
                  <p className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Employee Reports Table ── */}
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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
              className={`mt-5 grid min-w-0 grid-cols-1 items-end gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 ${
                canManageReports
                  ? "md:grid-cols-2 2xl:grid-cols-[260px_minmax(220px,1fr)_minmax(360px,520px)]"
                  : "lg:grid-cols-[minmax(220px,1fr)_minmax(360px,520px)]"
              }`}
            >
              {canManageReports && (
                <div className="min-w-0">
                  <label className="mb-1.5 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Employee
                  </label>
                  <Select
                    value={selectedEmployee}
                    onChange={setSelectedEmployee}
                    options={employeeOptions}
                    isClearable
                    placeholder="Select employee"
                    className="text-sm text-slate-900"
                    styles={selectStyles}
                  />
                </div>
              )}
              <label className="block min-w-0">
                <span className="mb-1.5 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Search
                </span>
                <span className="relative block">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search something..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </span>
              </label>
              <DateRangeFilter
                startDate={fromDate}
                endDate={toDate}
                onStartDateChange={setFromDate}
                onEndDateChange={setToDate}
                compact
                className={
                  canManageReports
                    ? "min-w-0 md:col-span-2 2xl:col-span-1"
                    : "min-w-0"
                }
              />
            </div>

            {fromDate || toDate ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Date: {fromDate || "..."} to {toDate || "..."}
                </span>
              </div>
            ) : null}

            <div className="mt-5 max-w-full overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[1120px] divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    {ORDER_REPORT_COLUMNS.map((column) => (
                      <th key={column.key} className="px-4 py-3">
                        {column.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {isLoading && (
                    <tr>
                      <td
                        colSpan={ORDER_REPORT_COLUMNS.length + 1}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        Loading reports...
                      </td>
                    </tr>
                  )}
                  {!isLoading && reports.length === 0 && (
                    <tr>
                      <td
                        colSpan={ORDER_REPORT_COLUMNS.length + 1}
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
                          {ORDER_REPORT_COLUMNS.map((column) => {
                            const value =
                              column.key === "name"
                                ? row.employee?.name || row.name || "-"
                                : column.key === "totalAmount"
                                  ? Number(row.totalAmount || 0).toLocaleString(
                                      undefined,
                                      {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      },
                                    )
                                  : column.key === "reportDate"
                                    ? row.reportDate || "-"
                                    : Number(
                                        row[column.key] || 0,
                                      ).toLocaleString();

                            return (
                              <td
                                key={column.key}
                                className={`whitespace-nowrap px-4 py-3 ${
                                  [
                                    "name",
                                    "totalOrder",
                                    "totalAmount",
                                  ].includes(column.key)
                                    ? "font-semibold text-slate-900"
                                    : ""
                                }`}
                              >
                                {column.key === "name" ? (
                                  <div className="w-52 min-w-0">
                                    <div className="truncate font-semibold text-slate-900">
                                      {value}
                                    </div>
                                    <div className="truncate text-xs text-slate-500">
                                      {row.user?.Email || "-"}
                                    </div>
                                  </div>
                                ) : (
                                  value
                                )}
                              </td>
                            );
                          })}
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
              <div className="mt-6 flex flex-col items-center justify-between gap-4 px-1 sm:flex-row">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Showing page{" "}
                  <span className="text-indigo-600">{currentPage}</span> of{" "}
                  <span className="text-slate-900">{totalPages}</span>
                </p>

                <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-2">
                  <button
                    type="button"
                    onClick={handlePreviousPageSet}
                    disabled={startPage === 1}
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>

                  {visiblePages.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => handleReportPageChange(pageNumber)}
                      className={`h-11 w-11 shrink-0 rounded-2xl text-sm font-black transition-all active:scale-90 ${
                        pageNumber === currentPage
                          ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100"
                          : "border border-slate-100 bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleNextPageSet}
                    disabled={endPage === totalPages}
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ── Calculation Section ── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
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
              <h3 className="text-lg font-bold text-slate-900">Incentive</h3>
              <p className="mt-1 text-sm text-slate-500">
                Flat amount অথবা gross profit percentage deduct করুন।
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
                <select
                  value={incentiveType}
                  onChange={(e) => setIncentiveType(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="flat">Flat</option>
                  <option value="percentage">Percent</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={incentiveValue}
                  onChange={(e) => setIncentiveValue(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
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
          <div
            className={`grid gap-4 sm:grid-cols-2 ${
              canSeeSensitiveSummary ? "lg:grid-cols-5" : "lg:grid-cols-2"
            }`}
          >
            {canSeeSensitiveSummary && (
              <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
                Gross Profit:{" "}
                <span
                  className={
                    summary.grossProfit >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }
                >
                  {formatCurrency(summary.grossProfit)}
                </span>
              </div>
            )}
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
              Marketing Spends: {formatCurrency(summary.mktCost)}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
              Other Expenses: {formatCurrency(summary.otherCost)}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
              Incentive: {formatCurrency(summary.incentiveAmount)}
            </div>
            {canSeeSensitiveSummary && (
              <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
                Return Deduction ({summary.returnRate.toFixed(2)}%):{" "}
                {formatCurrency(summary.returnDeduction)}
              </div>
            )}
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
              <div className="flex w-full flex-col gap-3 lg:w-auto xl:flex-row xl:flex-wrap xl:items-center">
                <DateRangeFilter
                  startDate={historyStartDate}
                  endDate={historyEndDate}
                  onStartDateChange={(value) => {
                    setHistoryStartDate(value);
                    setHistoryPage(1);
                  }}
                  onEndDateChange={(value) => {
                    setHistoryEndDate(value);
                    setHistoryPage(1);
                  }}
                  onFilterTypeChange={() => setHistoryPage(1)}
                  compact
                  className="min-w-0"
                />
                <label className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    Sales Type
                  </span>
                  <input
                    type="text"
                    value={salesTypeSearch}
                    onChange={(e) => setSalesTypeSearch(e.target.value)}
                    placeholder="Search by sales type"
                    className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 sm:w-48"
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[760px] divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Sales Type</th>
                    {isSuperAdmin && (
                      <>
                        <th className="px-4 py-3">Sale</th>
                        <th className="px-4 py-3">Return</th>
                        <th className="px-4 py-3">Cost</th>
                        <th className="px-4 py-3">Profit/Loss</th>
                      </>
                    )}
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {profitLossLoading && (
                    <tr>
                      <td
                        colSpan={isSuperAdmin ? 8 : 4}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        Loading history...
                      </td>
                    </tr>
                  )}
                  {!profitLossLoading && profitLossRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={isSuperAdmin ? 8 : 4}
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
                        {isSuperAdmin && (
                          <>
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
                          </>
                        )}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              isEmailSent(row)
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                            }`}
                          >
                            {isEmailSent(row) ? "Send" : "Not send"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            {canManageProfitLossHistoryActions && (
                              <button
                                type="button"
                                onClick={() => handlePrintInvoice(row)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                              >
                                <Printer size={14} /> Print
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSendEmail(row)}
                              disabled={sendingEmail}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Mail size={14} /> Email
                            </button>
                            {canManageProfitLossHistoryActions && (
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
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Total: {totalProfitLossCount} records
              </p>
              <div className="flex items-center justify-end gap-2">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-3 sm:p-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-6">
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
              <div className="grid max-h-[55vh] items-start gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {[GIVEN_REPORT_FIELDS, RECEIVED_REPORT_FIELDS].map(
                  (fields, columnIndex) => (
                    <div
                      key={columnIndex === 0 ? "given" : "received"}
                      className="space-y-3"
                    >
                      {fields.map((field) => (
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
                                if (
                                  !AUTO_TOTAL_SOURCE_FIELDS.includes(field.key)
                                ) {
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
                  ),
                )}
              </div>
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-3 sm:p-6">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-6">
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
                  {isSuperAdmin && (
                    <p className="text-slate-600">
                      Profit/Loss:{" "}
                      <span
                        className={`font-bold ${safeNumber(selectedInvoiceRow.profitLoss) >= 0 ? "text-emerald-600" : "text-red-600"}`}
                      >
                        {formatCurrency(selectedInvoiceRow.profitLoss)}
                      </span>
                    </p>
                  )}
                </div>
                <label className="block">
                  <div className="mb-2 text-sm font-semibold text-slate-700">
                    Client Emails
                  </div>
                  {canUseMasterPermission ? (
                    <EmailChipsInput
                      ref={emailInputRef}
                      value={clientEmail}
                      onChange={setClientEmail}
                      placeholder="Type email and press Enter"
                      disabled={sendingEmail}
                    />
                  ) : (
                    <Select
                      value={
                        masterPermissionEmailOptions.find(
                          (option) => option.value === clientEmail,
                        ) || null
                      }
                      onChange={(option) => setClientEmail(option?.value || "")}
                      options={masterPermissionEmailOptions}
                      placeholder="Select master permission email"
                      isDisabled={sendingEmail}
                      isSearchable
                      styles={selectStyles}
                    />
                  )}
                </label>
                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
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
