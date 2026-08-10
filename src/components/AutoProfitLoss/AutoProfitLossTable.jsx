import { motion } from "framer-motion";
import { Mail, Printer, RefreshCcw, Save, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useGetAllInTransitProductQuery } from "../../features/inTransitProduct/inTransitProduct";
import { useGetAllReturnProductQuery } from "../../features/returnProduct/returnProduct";
import {
  useGetAllProfitLossQuery,
  useInsertProfitLossMutation,
  useDeleteProfitLossMutation,
  useSendProfitLossInvoiceMutation,
} from "../../features/profitLoss/profitLoss";
import DateRangeFilter from "../common/DateRangeFilter";
import EmailChipsInput from "../common/EmailChipsInput";
import Modal from "../common/Modal";
import { useCanUseMasterPermission } from "../../utils/masterPermissions";

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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

const getProductKey = (row) =>
  String(row?.productId ?? row?.receivedId ?? row?.name ?? row?.Id ?? "");

const addRowToGroup = (map, row, type) => {
  const key = getProductKey(row);
  if (!key) return;

  const current = map.get(key) || {
    key,
    name: row?.name || "Unnamed Product",
    inTransitQty: 0,
    inTransitPurchase: 0,
    inTransitRevenue: 0,
    returnQty: 0,
    returnPurchase: 0,
    returnRevenue: 0,
  };

  if (type === "inTransit") {
    current.inTransitQty += safeNumber(row?.quantity);
    current.inTransitPurchase += safeNumber(row?.purchase_price);
    current.inTransitRevenue += safeNumber(row?.sale_price);
  } else {
    current.returnQty += safeNumber(row?.quantity);
    current.returnPurchase += safeNumber(row?.purchase_price);
    current.returnRevenue += safeNumber(row?.sale_price);
  }

  map.set(key, current);
};

const AutoProfitLossTable = () => {
  const [reportStartDate, setReportStartDate] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [reportEndDate, setReportEndDate] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [marketingSpends, setMarketingSpends] = useState(0);
  const [otherExpenses, setOtherExpenses] = useState(0);
  const [incentiveType, setIncentiveType] = useState("flat");
  const [incentiveValue, setIncentiveValue] = useState(0);
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedInvoiceRow, setSelectedInvoiceRow] = useState(null);
  const [clientEmail, setClientEmail] = useState("");
  const emailInputRef = useRef(null);
  const itemsPerPage = 10;
  const { canUseMasterPermission } = useCanUseMasterPermission();
  const canSeeSensitiveProfitLoss = canUseMasterPermission;

  const reportQueryArgs = useMemo(
    () => ({
      page: 1,
      limit: 10000,
      startDate: reportStartDate || undefined,
      endDate: reportEndDate || undefined,
    }),
    [reportEndDate, reportStartDate],
  );

  const {
    data: inTransitRes,
    isLoading: inTransitLoading,
    isFetching: inTransitFetching,
    refetch: refetchInTransit,
  } = useGetAllInTransitProductQuery(reportQueryArgs);

  const {
    data: returnRes,
    isLoading: returnLoading,
    isFetching: returnFetching,
    refetch: refetchReturn,
  } = useGetAllReturnProductQuery(reportQueryArgs);

  const historyQueryArgs = useMemo(
    () => ({
      page: currentPage,
      limit: itemsPerPage,
      startDate: historyStartDate || undefined,
      endDate: historyEndDate || undefined,
      mode: "auto",
    }),
    [currentPage, historyEndDate, historyStartDate],
  );

  const {
    data: profitLossRes,
    isLoading: historyLoading,
    isFetching: historyFetching,
  } = useGetAllProfitLossQuery(historyQueryArgs);

  const [insertProfitLoss, { isLoading: isSaving }] =
    useInsertProfitLossMutation();
  const [deleteProfitLoss, { isLoading: isDeleting }] =
    useDeleteProfitLossMutation();
  const [sendProfitLossInvoice, { isLoading: isSendingInvoice }] =
    useSendProfitLossInvoiceMutation();

  const sourceRows = useMemo(() => {
    const grouped = new Map();
    (inTransitRes?.data || []).forEach((row) =>
      addRowToGroup(grouped, row, "inTransit"),
    );
    (returnRes?.data || []).forEach((row) =>
      addRowToGroup(grouped, row, "return"),
    );

    return Array.from(grouped.values())
      .map((item) => {
        const netQty = Math.max(item.inTransitQty - item.returnQty, 0);
        const netPurchase = Math.max(
          item.inTransitPurchase - item.returnPurchase,
          0,
        );
        const netRevenue = Math.max(
          item.inTransitRevenue - item.returnRevenue,
          0,
        );

        return {
          ...item,
          netQty,
          netPurchase,
          netRevenue,
          profitLoss: netRevenue - netPurchase,
        };
      })
      .filter((item) => item.inTransitQty > 0 || item.returnQty > 0);
  }, [inTransitRes, returnRes]);

  const summary = useMemo(() => {
    const totals = sourceRows.reduce(
      (acc, item) => {
        acc.products += item.netQty > 0 ? 1 : 0;
        acc.inTransitQty += item.inTransitQty;
        acc.returnQty += item.returnQty;
        acc.netQty += item.netQty;
        acc.purchase += item.netPurchase;
        acc.revenue += item.netRevenue;
        acc.returnAmount += item.returnRevenue;
        acc.grossProfit += item.profitLoss;
        return acc;
      },
      {
        products: 0,
        inTransitQty: 0,
        returnQty: 0,
        netQty: 0,
        purchase: 0,
        revenue: 0,
        returnAmount: 0,
        grossProfit: 0,
      },
    );

    const incentiveInput = safeNumber(incentiveValue);
    const incentiveAmount =
      incentiveType === "percentage"
        ? (Math.max(totals.grossProfit, 0) * incentiveInput) / 100
        : incentiveInput;
    const extraCost =
      safeNumber(marketingSpends) + safeNumber(otherExpenses) + incentiveAmount;
    return {
      ...totals,
      marketingCost: safeNumber(marketingSpends),
      otherCost: safeNumber(otherExpenses),
      incentiveType,
      incentiveValue: incentiveInput,
      incentiveAmount,
      extraCost,
      finalProfit: totals.grossProfit - extraCost,
    };
  }, [
    incentiveType,
    incentiveValue,
    marketingSpends,
    otherExpenses,
    sourceRows,
  ]);

  const historyRows = profitLossRes?.data || [];
  const totalHistoryCount = safeNumber(
    profitLossRes?.meta?.count ?? profitLossRes?.meta?.total,
  );
  const totalPages = Math.max(1, Math.ceil(totalHistoryCount / itemsPerPage));
  const isLoading = inTransitLoading || returnLoading;
  const isFetching = inTransitFetching || returnFetching;

  const handleRefresh = () => {
    refetchInTransit();
    refetchReturn();
  };

  const handleSave = async () => {
    if (!reportStartDate || !reportEndDate) {
      toast.error("Please select report date");
      return;
    }

    if (!summary.netQty) {
      toast.error("No remaining quantity found for this date");
      return;
    }

    const payload = {
      mode: "auto",
      salesType: "Intransit Profit & Loss",
      products: Math.round(summary.products),
      purchase: Math.round(summary.purchase),
      revenue: Math.round(summary.revenue),
      return: Math.round(summary.returnAmount),
      marketingSpends: safeNumber(marketingSpends),
      otherExpenses: safeNumber(otherExpenses),
      incentiveType,
      incentiveValue: safeNumber(incentiveValue),
      incentiveAmount: Math.round(summary.incentiveAmount),
      returnPercentage: 0,
      cost: Math.round(summary.extraCost),
      profitLoss: Math.round(summary.finalProfit),
      note:
        reportStartDate === reportEndDate
          ? `Auto calculation date: ${reportStartDate}`
          : `Auto calculation date range: ${reportStartDate} to ${reportEndDate}`,
    };

    try {
      const res = await insertProfitLoss(payload).unwrap();
      if (res?.success) {
        toast.success("Intransit Profit/Loss saved successfully");
      } else {
        toast.error(res?.message || "Save failed");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Save failed");
    }
  };

  const handleDeleteHistory = async (id) => {
    if (!window.confirm("Delete this saved profit/loss record?")) return;

    try {
      const res = await deleteProfitLoss({ id, mode: "auto" }).unwrap();
      if (res?.success) {
        toast.success("Profit/Loss history deleted");
      } else {
        toast.error(res?.message || "Delete failed");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Delete failed");
    }
  };

  const getInvoiceProducts = () =>
    sourceRows.map((row) => ({
      name: row.name,
      sku: row.key,
      unitsSold: row.netQty,
      totalCost: row.netPurchase,
      totalRevenue: row.netRevenue,
      profit: row.profitLoss,
    }));

  const getInvoiceSummary = (row) => {
    const invoiceGrossProfit =
      safeNumber(row?.profitLoss) + safeNumber(row?.cost);
    const invoiceIncentiveType = row?.incentiveType || incentiveType;
    const invoiceIncentiveValue = safeNumber(
      row?.incentiveValue ?? incentiveValue,
    );
    const invoiceIncentiveAmount =
      row?.incentiveAmount != null
        ? safeNumber(row.incentiveAmount)
        : invoiceIncentiveType === "percentage"
          ? (Math.max(invoiceGrossProfit, 0) * invoiceIncentiveValue) / 100
          : invoiceIncentiveValue;

    return {
      totalCost: safeNumber(row?.purchase),
      totalRevenue: safeNumber(row?.revenue),
      revenue: safeNumber(row?.revenue),
      grossProfit: invoiceGrossProfit,
      marketingCost: safeNumber(row?.marketingSpends ?? marketingSpends),
      otherCost: safeNumber(row?.otherExpenses ?? otherExpenses),
      incentiveType: invoiceIncentiveType,
      incentiveValue: invoiceIncentiveValue,
      incentiveAmount: invoiceIncentiveAmount,
      returnRate: safeNumber(row?.returnPercentage),
      returnDeduction: safeNumber(row?.return),
      finalProfit: safeNumber(row?.profitLoss),
    };
  };

  const handlePrintInvoice = (row) => {
    if (!canSeeSensitiveProfitLoss) return;

    const invoiceNo = `PL-${row?.Id || row?.id || Date.now()}`;
    const invoiceDate = formatDate(row?.createdAt || row?.date);
    const products = getInvoiceProducts();
    const summaryDetails = getInvoiceSummary(row);
    const productsHtml =
      products.length > 0
        ? products
            .map((item) => {
              const profit = safeNumber(item.profit);
              const profitColor = profit >= 0 ? "#059669" : "#dc2626";
              return `<tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.sku)}</td>
                <td>${safeNumber(item.unitsSold).toLocaleString()}</td>
                <td class="amount">${escapeHtml(formatCurrency(item.totalCost))}</td>
                <td class="amount">${escapeHtml(formatCurrency(item.totalRevenue))}</td>
                <td class="amount" style="color:${profitColor}">${escapeHtml(formatCurrency(profit))}</td>
              </tr>`;
            })
            .join("")
        : `<tr><td colspan="6" style="padding:18px;text-align:center;color:#94a3b8;">No product details available</td></tr>`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print invoice");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Intransit Profit/Loss Invoice - ${escapeHtml(invoiceNo)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; font-size: 13px; }
            h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
            h2 { font-size: 15px; font-weight: 700; margin: 28px 0 10px; color: #1e293b; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
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
            .amount { font-weight: 700; }
            .breakdown { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 8px; }
            .breakdown-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
            .breakdown-item .lbl { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
            .breakdown-item .val { font-size: 15px; font-weight: 700; margin-top: 5px; }
            .profit { color: #059669; }
            .loss { color: #dc2626; }
            @media print { body { padding: 16px; } }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <div class="invoice-title">
              <h1>Kafela Mart Accounts</h1>
              <div class="subtitle">Intransit Profit &amp; Loss Invoice</div>
            </div>
            <div class="invoice-meta">
              <div class="meta"><strong>Invoice No:</strong> ${escapeHtml(invoiceNo)}</div>
              <div class="meta"><strong>Date:</strong> ${escapeHtml(invoiceDate)}</div>
              <div class="meta"><strong>Sales Type:</strong> ${escapeHtml(row?.salesType || "Intransit Profit & Loss")}</div>
            </div>
          </div>

          <h2>Calculation Breakdown</h2>
          <div class="breakdown">
            <div class="breakdown-item"><div class="lbl">Purchase</div><div class="val">${escapeHtml(formatCurrency(summaryDetails.totalCost))}</div></div>
            <div class="breakdown-item"><div class="lbl">Sale</div><div class="val">${escapeHtml(formatCurrency(summaryDetails.totalRevenue))}</div></div>
            <div class="breakdown-item"><div class="lbl">Return (${summaryDetails.returnRate.toFixed(2)}%)</div><div class="val">${escapeHtml(formatCurrency(summaryDetails.returnDeduction))}</div></div>
            <div class="breakdown-item"><div class="lbl">Marketing Spends</div><div class="val">${escapeHtml(formatCurrency(summaryDetails.marketingCost))}</div></div>
            <div class="breakdown-item"><div class="lbl">Other Expenses</div><div class="val">${escapeHtml(formatCurrency(summaryDetails.otherCost))}</div></div>
            <div class="breakdown-item"><div class="lbl">Incentive${summaryDetails.incentiveType === "percentage" ? ` (${summaryDetails.incentiveValue.toFixed(2)}%)` : ""}</div><div class="val">${escapeHtml(formatCurrency(summaryDetails.incentiveAmount))}</div></div>
            <div class="breakdown-item"><div class="lbl">Cost</div><div class="val">${escapeHtml(formatCurrency(row?.cost))}</div></div>
            <div class="breakdown-item"><div class="lbl">Net Profit/Loss</div><div class="val ${safeNumber(row?.profitLoss) >= 0 ? "profit" : "loss"}">${escapeHtml(formatCurrency(row?.profitLoss))}</div></div>
          </div>

          <h2>Product Variants</h2>
          <table>
            <thead>
              <tr>
                <th>Product</th><th>SKU</th><th>Units Sold</th>
                <th>Total Purchase</th><th>Total Sale</th><th>Profit/Loss</th>
              </tr>
            </thead>
            <tbody>${productsHtml}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const buildInvoicePayload = (row, recipientEmail) => ({
    clientEmail: recipientEmail,
    invoiceNumber: `PL-${row?.Id || Date.now()}`,
    companyName: "Kafela Mart Accounts",
    reportTitle: "Intransit Profit & Loss Invoice",
    reportDate: row?.createdAt || row?.date,
    profitLossId: row?.Id,
    salesType: row?.salesType || "Intransit Profit & Loss",
    products: safeNumber(row?.products),
    purchase: safeNumber(row?.purchase),
    revenue: safeNumber(row?.revenue),
    return: safeNumber(row?.return),
    cost: safeNumber(row?.cost),
    profitLoss: safeNumber(row?.profitLoss),
    selectedProducts: getInvoiceProducts(),
    calculationSummary: getInvoiceSummary(row),
  });

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
    setClientEmail("");
    setIsEmailModalOpen(true);
  };

  const handleCloseEmailModal = () => {
    setSelectedInvoiceRow(null);
    setClientEmail("");
    setIsEmailModalOpen(false);
  };

  const handleSubmitInvoiceEmail = async () => {
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

  const summaryCards = [
    ["Intransit Qty", summary.inTransitQty],
    ["Sales Return Qty", summary.returnQty],
    ["Net Qty", summary.netQty],
    ["Purchase", formatCurrency(summary.purchase)],
    ["Net Sale", formatCurrency(summary.revenue)],
    ["Profit/Loss", formatCurrency(summary.finalProfit)],
  ];

  return (
    <motion.div
      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-5 lg:rounded-[28px] lg:p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Intransit Profit & Loss
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Intransit product থেকে Sales Return বাদ দিয়ে remaining quantity
              অনুযায়ী profit/loss calculate হচ্ছে।
            </p>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-end xl:w-auto xl:flex-wrap xl:justify-end">
            <DateRangeFilter
              startDate={reportStartDate}
              endDate={reportEndDate}
              onStartDateChange={setReportStartDate}
              onEndDateChange={setReportEndDate}
              label="Report Date"
              startLabel="From"
              endLabel="To"
              defaultFilter="today"
              compact
              className="min-w-0 sm:min-w-[180px]"
            />
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:mt-auto"
            >
              <RefreshCcw
                size={16}
                className={isFetching ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {canSeeSensitiveProfitLoss && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            {summaryCards.map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4"
              >
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  {label}
                </p>
                <p
                  className={`mt-3 truncate text-xl font-black sm:text-2xl ${
                    label === "Profit/Loss" && summary.finalProfit < 0
                      ? "text-rose-600"
                      : label === "Profit/Loss"
                        ? "text-emerald-600"
                        : "text-slate-900"
                  }`}
                >
                  {typeof value === "number" ? value.toLocaleString() : value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 max-w-full overflow-x-auto rounded-2xl border border-slate-100">
        <table
          className={`w-full border-separate border-spacing-0 text-sm ${
            canSeeSensitiveProfitLoss ? "min-w-[980px]" : "min-w-[640px]"
          }`}
        >
          <thead>
            <tr className="text-left">
              {["Product", "Intransit Qty", "Sales Return", "Net Qty"]
                .concat(
                  canSeeSensitiveProfitLoss
                    ? ["Purchase", "Sale", "Profit/Loss"]
                    : [],
                )
                .map((heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap border-b border-slate-200 px-3 py-4 text-sm font-bold text-slate-700 first:pl-4"
                  >
                    {heading}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={canSeeSensitiveProfitLoss ? 7 : 4}
                  className="px-3 py-16 text-center text-sm font-medium text-slate-500"
                >
                  Loading intransit profit/loss data...
                </td>
              </tr>
            ) : sourceRows.length === 0 ? (
              <tr>
                <td
                  colSpan={canSeeSensitiveProfitLoss ? 7 : 4}
                  className="px-3 py-16 text-center text-sm font-medium text-slate-500"
                >
                  এই date-এ কোনো intransit বা sales return data পাওয়া যায়নি।
                </td>
              </tr>
            ) : (
              sourceRows.map((row) => (
                <tr key={row.key} className="group">
                  <td className="border-b border-slate-100 px-3 py-4 text-[15px] font-semibold text-slate-900 first:pl-4">
                    <div className="w-72 min-w-0 truncate">{row.name}</div>
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-4 text-sm font-medium text-slate-700">
                    {row.inTransitQty.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-4 text-sm font-medium text-slate-700">
                    {row.returnQty.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-4 text-sm font-bold text-slate-900">
                    {row.netQty.toLocaleString()}
                  </td>
                  {canSeeSensitiveProfitLoss && (
                    <>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-700">
                        {formatCurrency(row.netPurchase)}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-900">
                        {formatCurrency(row.netRevenue)}
                      </td>
                      <td
                        className={`whitespace-nowrap border-b border-slate-100 px-3 py-4 text-sm font-bold ${
                          row.profitLoss >= 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {formatCurrency(row.profitLoss)}
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">Marketing Spends</h3>
          <input
            type="number"
            min="0"
            step="0.01"
            value={marketingSpends}
            onChange={(event) => setMarketingSpends(event.target.value)}
            className="mt-4 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">Other Expenses</h3>
          <input
            type="number"
            min="0"
            step="0.01"
            value={otherExpenses}
            onChange={(event) => setOtherExpenses(event.target.value)}
            className="mt-4 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">Incentive</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[130px_1fr]">
            <select
              value={incentiveType}
              onChange={(event) => setIncentiveType(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="flat">Flat</option>
              <option value="percentage">Percentage</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={incentiveValue}
              onChange={(event) => setIncentiveValue(event.target.value)}
              placeholder={incentiveType === "percentage" ? "0%" : "0"}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Incentive: {formatCurrency(summary.incentiveAmount)}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">Calculation</h3>
          {canSeeSensitiveProfitLoss && (
            <div className="mt-4 space-y-2 text-sm font-medium text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <span>Gross Profit</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(summary.grossProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Total Extra Cost</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(summary.extraCost)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Incentive</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(summary.incentiveAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2">
                <span>Final Profit/Loss</span>
                <span
                  className={`font-bold ${
                    summary.finalProfit >= 0
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  {formatCurrency(summary.finalProfit)}
                </span>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Calculate & Save"}
          </button>
        </div>
      </div>

      <div className="mt-6 min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.04)] sm:p-5 lg:rounded-[28px] lg:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <h3 className="text-xl font-bold tracking-tight text-slate-900">
              Saved Profit/Loss History
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Intransit Profit & Loss calculation save করলে এখানে history দেখা যাবে।
            </p>
          </div>

          <DateRangeFilter
            startDate={historyStartDate}
            endDate={historyEndDate}
            onStartDateChange={(value) => {
              setHistoryStartDate(value);
              setCurrentPage(1);
            }}
            onEndDateChange={(value) => {
              setHistoryEndDate(value);
              setCurrentPage(1);
            }}
            onFilterTypeChange={() => setCurrentPage(1)}
            label="Report Date"
            startLabel="From"
            endLabel="To"
            compact
            className="min-w-0 xl:min-w-[180px]"
          />
        </div>

        <div className="mt-6 max-w-full overflow-x-auto rounded-2xl border border-slate-100">
          <table
            className={`w-full border-separate border-spacing-0 text-sm ${
              canSeeSensitiveProfitLoss ? "min-w-[980px]" : "min-w-[620px]"
            }`}
          >
            <thead>
              <tr className="text-left">
                {["Date", "Sales Type", "Products"]
                  .concat(
                    canSeeSensitiveProfitLoss
                      ? ["Purchase", "Sale", "Return", "Cost", "Profit/Loss"]
                      : [],
                  )
                  .concat(["Action"])
                  .map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap border-b border-slate-200 px-3 py-4 text-sm font-bold text-slate-700 first:pl-4"
                    >
                      {heading}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {historyLoading || historyFetching ? (
                <tr>
                  <td
                    colSpan={canSeeSensitiveProfitLoss ? 9 : 4}
                    className="px-3 py-16 text-center text-sm font-medium text-slate-500"
                  >
                    Loading saved profit/loss data...
                  </td>
                </tr>
              ) : historyRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={canSeeSensitiveProfitLoss ? 9 : 4}
                    className="px-3 py-16 text-center text-sm font-medium text-slate-500"
                  >
                    কোনো saved intransit profit/loss data পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                historyRows.map((row) => (
                  <tr key={row?.Id}>
                    <td className="whitespace-nowrap border-b border-slate-100 px-3 py-4 text-sm font-medium text-slate-700 first:pl-4">
                      {formatDate(row?.createdAt || row?.date)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-900">
                      <div className="w-40 min-w-0 truncate">
                        {row?.salesType || "-"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap border-b border-slate-100 px-3 py-4 text-sm font-medium text-slate-700">
                      {safeNumber(row?.products)}
                    </td>
                    {canSeeSensitiveProfitLoss && (
                      <>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-900">
                          {formatCurrency(row?.purchase)}
                        </td>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-700">
                          {formatCurrency(row?.revenue)}
                        </td>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-700">
                          {formatCurrency(row?.return)}
                        </td>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-700">
                          {formatCurrency(row?.cost)}
                        </td>
                        <td
                          className={`whitespace-nowrap border-b border-slate-100 px-3 py-4 text-sm font-bold ${
                            safeNumber(row?.profitLoss) >= 0
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {formatCurrency(row?.profitLoss)}
                        </td>
                      </>
                    )}
                    <td className="border-b border-slate-100 px-3 py-4">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        {canSeeSensitiveProfitLoss && (
                          <button
                            type="button"
                            onClick={() => handlePrintInvoice(row)}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            <Printer size={14} />
                            Print
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSendEmail(row)}
                          disabled={isSendingInvoice}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Mail size={14} />
                          Email
                        </button>
                        {canSeeSensitiveProfitLoss && (
                          <button
                            type="button"
                            onClick={() => handleDeleteHistory(row?.Id)}
                            disabled={isDeleting}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-500">
            Total: {totalHistoryCount} records
          </p>
          <div className="flex max-w-full items-center gap-2 self-end overflow-x-auto pb-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm font-semibold text-slate-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isEmailModalOpen}
        onClose={handleCloseEmailModal}
        title="Send Profit/Loss Invoice"
        maxWidth="max-w-lg"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              {selectedInvoiceRow?.salesType || "Intransit Profit & Loss"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Date:{" "}
              {formatDate(
                selectedInvoiceRow?.createdAt || selectedInvoiceRow?.date,
              )}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Invoice No: PL-
              {selectedInvoiceRow?.Id || selectedInvoiceRow?.id || "-"}
            </p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Client Emails
            </span>
            <EmailChipsInput
              ref={emailInputRef}
              value={clientEmail}
              onChange={setClientEmail}
              placeholder="Type email and press Enter"
              disabled={isSendingInvoice}
            />
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleCloseEmailModal}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitInvoiceEmail}
              disabled={isSendingInvoice}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSendingInvoice ? "Sending..." : "Send Email"}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default AutoProfitLossTable;
