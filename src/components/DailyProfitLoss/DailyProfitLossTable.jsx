import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Printer,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import Modal from "../common/Modal";
import DateRangeFilter from "../common/DateRangeFilter";
import { useGetAllInventoryOverviewWithoutQueryQuery } from "../../features/inventoryOverview/inventoryOverview";
import useDebounce from "../../hooks/useDebounce";

import {
  useGetAllProfitLossQuery,
  useInsertProfitLossMutation,
  useDeleteProfitLossMutation,
  useSendProfitLossInvoiceMutation,
} from "../../features/profitLoss/profitLoss";

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

const getProductName = (item) =>
  item?.name ||
  item?.productName ||
  item?.product?.name ||
  item?.title ||
  "Unnamed Product";

const getProductSku = (item) =>
  item?.sku ||
  item?.productSku ||
  item?.product?.sku ||
  item?.SKU ||
  `SKU-BASE-${item?.Id || item?.id || Math.floor(Math.random() * 100000)}`;

const getSellingPrice = (item) =>
  safeNumber(
    item?.sellingPrice ??
      item?.sale_price ??
      item?.salePrice ??
      item?.selling_price ??
      item?.unitPrice ??
      item?.price ??
      item?.mrp,
  );

const getStockQuantity = (item) =>
  safeNumber(
    item?.quantity ??
      item?.stockQuantity ??
      item?.inHandQuantity ??
      item?.availableQuantity ??
      item?.qty ??
      item?.stock,
  );

const getCostPrice = (item) =>
  safeNumber(
    item?.costPrice ??
      item?.purchase_price ??
      item?.purchasePrice ??
      item?.buyingPrice ??
      item?.cost_price ??
      item?.buyPrice,
  );

const normalizeReceivedProducts = (items = []) =>
  items.map((item, index) => ({
    id: String(item?.Id ?? item?.id ?? item?.productId ?? index),
    productId: item?.productId ?? item?.Id ?? item?.id ?? index,
    name: getProductName(item),
    sku: getProductSku(item),
    quantity: getStockQuantity(item),
    costPrice: getCostPrice(item),
    sellingPrice: getSellingPrice(item),
    unitsSold: safeNumber(
      item?.unitsSold ?? item?.soldQty ?? item?.quantitySold,
    ),
  }));

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 48,
    borderRadius: 16,
    borderColor: state.isFocused ? "#a5b4fc" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 4px rgba(99, 102, 241, 0.12)" : "none",
    "&:hover": {
      borderColor: state.isFocused ? "#a5b4fc" : "#cbd5e1",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "4px 12px",
  }),
  placeholder: (base) => ({
    ...base,
    color: "#64748b",
    fontWeight: 500,
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "#eef2ff",
    borderRadius: 10,
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "#3730a3",
    fontWeight: 700,
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "#4338ca",
    ":hover": {
      backgroundColor: "#c7d2fe",
      color: "#312e81",
    },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 18,
    overflow: "hidden",
    zIndex: 30,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#e0e7ff"
      : state.isFocused
        ? "#f8fafc"
        : "#ffffff",
    color: "#0f172a",
    padding: 14,
  }),
};

const salesTypeOptions = [
  { value: "Regular Sale", label: "Regular Sale" },
  { value: "Up Sale", label: "Up Sale" },
  { value: "Cross Sale", label: "Cross Sale" },
  { value: "Organic Sale", label: "Organic Sale" },
  { value: "Office Sale", label: "Office Sale" },
];

const DailyProfitLossTable = () => {
  const {
    data: receivedRes,
    isLoading: receivedLoading,
    isError: receivedError,
    error: receivedErrObj,
  } = useGetAllInventoryOverviewWithoutQueryQuery();

  const receivedData = useMemo(() => receivedRes?.data || [], [receivedRes]);

  useEffect(() => {
    if (receivedError) console.error("Received fetch error:", receivedErrObj);
  }, [receivedError, receivedErrObj]);

  const normalizedProducts = useMemo(
    () => normalizeReceivedProducts(receivedData),
    [receivedData],
  );
  const [insertProfitLoss, { isLoading: isSavingProfitLoss }] =
    useInsertProfitLossMutation();
  const [sendProfitLossInvoice, { isLoading: isSendingProfitLossInvoice }] =
    useSendProfitLossInvoiceMutation();
  const [deleteProfitLoss, { isLoading: isDeletingProfitLoss }] =
    useDeleteProfitLossMutation();

  const [selectedRows, setSelectedRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [marketingSpends, setMarketingSpends] = useState(0);
  const [otherExpenses, setOtherExpenses] = useState(0);
  const [returnPercentage, setReturnPercentage] = useState(0);
  const [calculationDate, setCalculationDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [salesType, setSalesType] = useState(null);
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [salesTypeSearch, setSalesTypeSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedInvoiceRow, setSelectedInvoiceRow] = useState(null);
  const [clientEmail, setClientEmail] = useState("");
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [historyStartDate, historyEndDate, salesTypeSearch]);

  const profitLossQueryArgs = useMemo(
    () => ({
      page: currentPage,
      limit: itemsPerPage,
      startDate: historyStartDate || undefined,
      endDate: historyEndDate || undefined,
      name: salesTypeSearch || undefined,
      searchTerm: salesTypeSearch || undefined,
      mode: "product",
    }),
    [currentPage, historyEndDate, historyStartDate, salesTypeSearch],
  );

  const {
    data: profitLossRes,
    isLoading: profitLossLoading,
    isFetching: profitLossFetching,
  } = useGetAllProfitLossQuery(profitLossQueryArgs);

  const profitLossRows = useMemo(
    () => profitLossRes?.data || [],
    [profitLossRes],
  );
  const totalProfitLossCount = safeNumber(profitLossRes?.meta?.count);
  const totalPages = Math.max(
    1,
    Math.ceil(totalProfitLossCount / itemsPerPage),
  );

  useEffect(() => {
    setSelectedRows((prev) => {
      const prevMap = new Map(prev.map((item) => [item.id, item]));
      const normalizedMap = new Map(
        normalizedProducts.map((item) => [item.id, item]),
      );

      return prev
        .map((item) => {
          const updatedItem = normalizedMap.get(item.id);
          if (!updatedItem) return null;

          const existing = prevMap.get(item.id);
          return existing
            ? {
                ...updatedItem,
                costPrice: existing.costPrice,
                sellingPrice: existing.sellingPrice,
                unitsSold: existing.unitsSold,
              }
            : updatedItem;
        })
        .filter(Boolean);
    });
  }, [normalizedProducts]);

  const productOptions = useMemo(
    () =>
      normalizedProducts.map((item) => ({
        value: item.id,
        label: item.name,
        sku: item.sku,
        quantity: item.quantity,
        data: item,
      })),
    [normalizedProducts],
  );

  const selectedProductOptions = useMemo(() => {
    const selectedIdSet = new Set(selectedRows.map((item) => item.id));

    return productOptions.filter((option) => selectedIdSet.has(option.value));
  }, [productOptions, selectedRows]);

  const handleProductSelect = (selectedOptions) => {
    const options = selectedOptions || [];
    setSelectedRows((prev) => {
      const prevMap = new Map(prev.map((item) => [item.id, item]));

      return options.map((option) => {
        const item = option.data;
        const existing = prevMap.get(option.value);
        return existing
          ? {
              ...item,
              costPrice: existing.costPrice,
              sellingPrice: existing.sellingPrice,
              unitsSold: existing.unitsSold,
            }
          : item;
      });
    });
  };

  const handleFieldChange = (id, field, value) => {
    setSelectedRows((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value === "" ? "" : safeNumber(value),
            }
          : item,
      ),
    );
  };

  const handleRemoveRow = (id) => {
    setSelectedRows((prev) => prev.filter((item) => item.id !== id));
  };

  const handleReset = () => {
    setSelectedRows([]);
    setSearchTerm("");
    setMarketingSpends(0);
    setOtherExpenses(0);
    setReturnPercentage(0);
    setCalculationDate(new Date().toISOString().slice(0, 10));
    setSalesType(null);
  };

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return selectedRows;

    return selectedRows.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term),
    );
  }, [searchTerm, selectedRows]);

  const summary = useMemo(() => {
    const returnRate = Math.min(Math.max(safeNumber(returnPercentage), 0), 100);

    const baseSummary = filteredRows.reduce(
      (acc, item) => {
        const sellingPrice = safeNumber(item.sellingPrice);
        const costPrice = safeNumber(item.costPrice);
        const unitsSold = Math.max(safeNumber(item.unitsSold), 0);
        const returnedUnits = (unitsSold * returnRate) / 100;
        const effectiveUnitsSold = unitsSold - returnedUnits;
        const grossCost = costPrice * unitsSold;
        const grossRevenue = sellingPrice * unitsSold;
        const revenue = sellingPrice * effectiveUnitsSold;
        const totalCost = costPrice * effectiveUnitsSold;
        const profit = revenue - totalCost;

        acc.rawCost += grossCost;
        acc.rawRevenue += grossRevenue;
        acc.totalRevenue += revenue;
        acc.totalCost += totalCost;
        acc.totalProfit += profit;
        acc.totalUnits += effectiveUnitsSold;
        acc.rawTotalUnits += unitsSold;
        acc.returnUnits += returnedUnits;
        return acc;
      },
      {
        rawCost: 0,
        rawRevenue: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        totalUnits: 0,
        rawTotalUnits: 0,
        returnUnits: 0,
      },
    );

    const marketingCost = safeNumber(marketingSpends);
    const otherCost = safeNumber(otherExpenses);
    const extraCost = marketingCost + otherCost;
    const adjustedTotalRevenue = baseSummary.totalRevenue;
    const finalProfit =
      adjustedTotalRevenue - baseSummary.totalCost - extraCost;

    return {
      ...baseSummary,
      rawRevenue: baseSummary.rawRevenue,
      rawCost: baseSummary.rawCost,
      totalRevenue: adjustedTotalRevenue,
      revenueBeforeReturn: baseSummary.rawRevenue,
      marketingCost,
      otherCost,
      extraCost,
      returnRate,
      returnDeduction: baseSummary.rawCost - baseSummary.totalCost,
      finalProfit,
    };
  }, [filteredRows, marketingSpends, otherExpenses, returnPercentage]);

  const handleSaveProfitLoss = async () => {
    if (!selectedRows.length) {
      toast.error("Please select at least one product");
      return;
    }

    if (!salesType?.value) {
      toast.error("Please select a sales type");
      return;
    }

    const payload = {
      mode: "product",
      products: selectedRows.length,
      purchase: Math.round(summary.totalCost),
      revenue: Math.round(summary.totalRevenue),
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
        handleReset();
      } else {
        toast.error(res?.message || "Save failed");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Save failed");
    }
  };

  const handleDeleteProfitLossHistory = async (id) => {
    if (!window.confirm("Delete this saved profit/loss record?")) return;

    try {
      const res = await deleteProfitLoss(id).unwrap();
      if (res?.success) {
        toast.success("Profit/Loss history deleted");
      } else {
        toast.error(res?.message || "Delete failed");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Delete failed");
    }
  };

  const handlePrintInvoice = (row) => {
    const printWindow = window.open("", "_blank", "width=1050,height=820");
    if (!printWindow) {
      toast.error("Please allow popups to print the invoice");
      return;
    }

    const invoiceDate = formatDate(row?.createdAt || row?.date);
    const invoiceNo = `PL-${row?.Id || row?.id || Date.now()}`;
    const invoiceSalesType = escapeHtml(
      row?.salesType || salesType?.value || "-",
    );

    const productRowsHtml =
      selectedRows.length > 0
        ? selectedRows
            .map((item) => {
              const unitsSold = safeNumber(item.unitsSold);
              const sellingPrice = safeNumber(item.sellingPrice);
              const costPrice = safeNumber(item.costPrice);
              const totalRevenue = sellingPrice * unitsSold;
              const totalCost = costPrice * unitsSold;
              const profit = totalRevenue - totalCost;
              const profitColor = profit >= 0 ? "#059669" : "#dc2626";
              return `<tr>
                <td>${escapeHtml(item.name)}</td>
                <td style="color:#64748b">${escapeHtml(item.sku)}</td>
                <td>${unitsSold.toLocaleString()}</td>
                <td class="amount">${escapeHtml(formatCurrency(totalCost))}</td>
                <td class="amount">${escapeHtml(formatCurrency(totalRevenue))}</td>
                <td class="amount" style="color:${profitColor}">${escapeHtml(formatCurrency(profit))}</td>
              </tr>`;
            })
            .join("")
        : `<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;">কোনো product select করা হয়নি</td></tr>`;

    const historyRowsHtml =
      profitLossRows.length > 0
        ? profitLossRows
            .map((hr) => {
              const pl = safeNumber(hr?.profitLoss);
              const plColor = pl >= 0 ? "#059669" : "#dc2626";
              return `<tr>
                <td>${escapeHtml(formatDate(hr?.createdAt || hr?.date))}</td>
                <td>${escapeHtml(hr?.salesType || "-")}</td>
                <td>${safeNumber(hr?.products)}</td>
                <td class="amount">${escapeHtml(formatCurrency(hr?.purchase))}</td>
                <td class="amount">${escapeHtml(formatCurrency(hr?.revenue))}</td>
                <td class="amount">${escapeHtml(formatCurrency(hr?.return))}</td>
                <td class="amount">${escapeHtml(formatCurrency(hr?.cost))}</td>
                <td class="amount" style="color:${plColor}">${escapeHtml(formatCurrency(hr?.profitLoss))}</td>
              </tr>`;
            })
            .join("")
        : `<tr><td colspan="8" style="text-align:center;padding:20px;color:#94a3b8;">কোনো saved history নেই</td></tr>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Profit Loss Invoice - ${escapeHtml(invoiceNo)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; font-size: 13px; }
            h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
            h2 { font-size: 15px; font-weight: 700; margin: 28px 0 10px; color: #1e293b; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
            .meta { color: #475569; font-size: 12px; margin-bottom: 3px; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            th, td { border: 1px solid #e2e8f0; padding: 9px 11px; text-align: left; }
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
          <h1>Profit/Loss Invoice</h1>
          <div class="meta">Invoice No: ${escapeHtml(invoiceNo)}</div>
          <div class="meta">Date: ${escapeHtml(invoiceDate)}</div>
          <div class="meta">Sales Type: ${invoiceSalesType}</div>

          <h2>Product Variants</h2>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Units Sold</th>
                <th>Total Purchase</th>
                <th>Total Sale</th>
                <th>Profit/Loss</th>
              </tr>
            </thead>
            <tbody>${productRowsHtml}</tbody>
          </table>

          <h2>Calculation Breakdown</h2>
          <div class="breakdown">
            <div class="breakdown-item">
              <div class="lbl">Gross Profit</div>
              <div class="val">${escapeHtml(formatCurrency(summary.totalProfit))}</div>
            </div>
            <div class="breakdown-item">
              <div class="lbl">Marketing Spends</div>
              <div class="val">${escapeHtml(formatCurrency(summary.marketingCost))}</div>
            </div>
            <div class="breakdown-item">
              <div class="lbl">Other Expenses</div>
              <div class="val">${escapeHtml(formatCurrency(summary.otherCost))}</div>
            </div>
            <div class="breakdown-item">
              <div class="lbl">Return (${safeNumber(summary.returnRate).toFixed(2)}%)</div>
              <div class="val">${escapeHtml(formatCurrency(summary.returnDeduction))}</div>
            </div>
            <div class="breakdown-item span2">
              <div class="lbl">Total Purchase</div>
              <div class="val">${escapeHtml(formatCurrency(summary.totalCost))}</div>
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
                <th>Date</th>
                <th>Sales Type</th>
                <th>Products</th>
                <th>Purchase</th>
                <th>Sale</th>
                <th>Return</th>
                <th>Cost</th>
                <th>Profit/Loss</th>
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

    const productDetails = selectedRows.map((item) => {
      const unitsSold = safeNumber(item.unitsSold);
      const sellingPrice = safeNumber(item.sellingPrice);
      const costPrice = safeNumber(item.costPrice);
      const totalRevenue = sellingPrice * unitsSold;
      const totalCost = costPrice * unitsSold;
      return {
        name: item.name,
        sku: item.sku,
        unitsSold,
        totalCost,
        totalRevenue,
        profit: totalRevenue - totalCost,
      };
    });

    const savedHistoryDetails = profitLossRows.map((hr) => ({
      date: formatDate(hr?.createdAt || hr?.date),
      salesType: hr?.salesType || "-",
      products: safeNumber(hr?.products),
      purchase: safeNumber(hr?.purchase),
      revenue: safeNumber(hr?.revenue),
      return: safeNumber(hr?.return),
      cost: safeNumber(hr?.cost),
      profitLoss: safeNumber(hr?.profitLoss),
    }));

    const payload = {
      clientEmail: clientEmail.trim(),
      invoiceNumber: `PL-${selectedInvoiceRow?.Id || selectedInvoiceRow?.id || Date.now()}`,
      companyName: "Kafela Mart Accounts",
      reportTitle: "Profit & Loss Invoice",
      reportDate: selectedInvoiceRow?.createdAt || selectedInvoiceRow?.date,
      profitLossId: selectedInvoiceRow?.Id || selectedInvoiceRow?.id,
      salesType: selectedInvoiceRow?.salesType || "",
      products: safeNumber(selectedInvoiceRow?.products),
      purchase: safeNumber(selectedInvoiceRow?.purchase),
      revenue: safeNumber(selectedInvoiceRow?.revenue),
      return: safeNumber(selectedInvoiceRow?.return),
      cost: safeNumber(selectedInvoiceRow?.cost),
      profitLoss: safeNumber(selectedInvoiceRow?.profitLoss),
      selectedProducts: productDetails,
      calculationSummary: {
        totalCost: summary.totalCost,
        totalRevenue: summary.totalRevenue,
        grossProfit: summary.totalProfit,
        marketingCost: summary.marketingCost,
        otherCost: summary.otherCost,
        returnRate: summary.returnRate,
        returnDeduction: summary.returnDeduction,
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

  const summaryCards = [
    {
      label: "Selected Products",
      value: selectedRows.length,
      tone: "text-slate-900",
      bg: "from-slate-50 to-white",
    },
    {
      label: "Units Sold",
      value: summary.totalUnits,
      tone: "text-sky-700",
      bg: "from-sky-50 to-white",
    },
    {
      label: "Total Purchase",
      value: formatCurrency(summary.totalCost),
      tone: "text-amber-700",
      bg: "from-amber-50 to-white",
    },
    {
      label: "Total Sale",
      value: formatCurrency(summary.totalRevenue),
      tone: "text-indigo-700",
      bg: "from-indigo-50 to-white",
    },
    {
      label: "Profit/Loss",
      value: formatCurrency(summary.finalProfit),
      tone: summary.finalProfit >= 0 ? "text-emerald-600" : "text-rose-600",
      bg:
        summary.finalProfit >= 0
          ? "from-emerald-50 to-white"
          : "from-rose-50 to-white",
    },
  ];

  return (
    <motion.div
      className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Selected Product Variants
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Received product list থেকে cost, sold unit, revenue আর profit/loss
              live calculate হচ্ছে।
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-[320px] flex-1">
              <Select
                isMulti
                options={productOptions}
                value={selectedProductOptions}
                onChange={handleProductSelect}
                isLoading={receivedLoading}
                isDisabled={receivedLoading || normalizedProducts.length === 0}
                closeMenuOnSelect={false}
                hideSelectedOptions={false}
                placeholder="Select product by variants"
                styles={selectStyles}
                formatOptionLabel={(option) => (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {option.label}
                      </div>
                      <div className="text-xs font-medium text-slate-500">
                        SKU: {option.sku}
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      Qty: {Number(option.quantity || 0).toLocaleString()}
                    </div>
                  </div>
                )}
              />
            </div>

            <label className="relative min-w-[260px] flex-1">
              {/* <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              /> */}
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search selected product or SKU"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </label>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCcw size={16} />
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${card.bg} p-4`}
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                {card.label}
              </p>
              <p className={`mt-3 text-2xl font-black ${card.tone}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-[1120px] w-full border-separate border-spacing-0">
          <thead>
            <tr className="text-left">
              {[
                "Product",
                "SKU",
                // "Purchase Price",
                // "Selling Price",
                "Units Sold",
                "Total Purchase Price",
                "Total Selling Price",
                "Profit/Loss",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  className="border-b border-slate-200 px-3 py-4 text-sm font-bold text-slate-700 first:pl-2"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {receivedLoading ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-16 text-center text-sm font-medium text-slate-500"
                >
                  Loading received products...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-16 text-center text-sm font-medium text-slate-500"
                >
                  {selectedRows.length === 0
                    ? "Dropdown থেকে product select করলে এখানে দেখা যাবে।"
                    : "Search অনুযায়ী কোনো product পাওয়া যায়নি।"}
                </td>
              </tr>
            ) : (
              filteredRows.map((item) => {
                const unitsSold = safeNumber(item.unitsSold);
                const sellingPrice = safeNumber(item.sellingPrice);
                const costPrice = safeNumber(item.costPrice);
                const totalRevenue = sellingPrice * unitsSold;
                const totalCost = costPrice * unitsSold;
                const profit = totalRevenue - totalCost;

                return (
                  <tr key={item.id} className="group">
                    <td className="border-b border-slate-100 px-3 py-4 first:pl-2">
                      <div className="space-y-2">
                        <div className="max-w-[270px] truncate text-[15px] font-semibold text-slate-900">
                          {item.name}
                        </div>
                        <div className="inline-flex w-fit items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          Qty: {Number(item.quantity || 0).toLocaleString()}
                        </div>
                      </div>
                    </td>

                    <td className="border-b border-slate-100 px-3 py-4 text-sm font-medium text-slate-500">
                      {item.sku}
                    </td>

                    {/* <td className="border-b border-slate-100 px-3 py-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.costPrice}
                        onChange={(e) =>
                          handleFieldChange(
                            item.id,
                            "costPrice",
                            e.target.value,
                          )
                        }
                        className="h-10 w-[110px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                      />
                    </td> */}

                    {/* <td className="border-b border-slate-100 px-3 py-4 text-[15px] font-semibold text-slate-800">
                      {safeNumber(item.sellingPrice).toFixed(2)}
                    </td> */}

                    <td className="border-b border-slate-100 px-3 py-4">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.unitsSold}
                        onChange={(e) =>
                          handleFieldChange(
                            item.id,
                            "unitsSold",
                            e.target.value,
                          )
                        }
                        className="h-10 w-[82px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                      />
                    </td>
                    <td className="border-b border-slate-100 px-3 py-4 text-[15px] font-semibold text-slate-700">
                      {formatCurrency(totalCost)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-4 text-[15px] font-semibold text-slate-900">
                      {formatCurrency(totalRevenue)}
                    </td>

                    <td
                      className={`border-b border-slate-100 px-3 py-4 text-[15px] font-bold ${
                        profit >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {formatCurrency(profit)}
                    </td>

                    <td className="border-b border-slate-100 px-3 py-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(item.id)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-rose-500 transition hover:bg-rose-50 hover:text-rose-600"
                        title="Remove row"
                      >
                        <Trash2 size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-2xl font-bold text-slate-900">
            Calculation Date
          </h3>
          <p className="mt-6 text-sm leading-7 text-slate-500">
            Select the date for this profit/loss calculation and saved history.
          </p>
          <input
            type="date"
            value={calculationDate}
            onChange={(e) => setCalculationDate(e.target.value)}
            className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-2xl font-bold text-slate-900">
            Marketing Spends
          </h3>
          <p className="mt-6 text-sm leading-7 text-slate-500">
            (Optional) Enter any marketing spends for the day to include in the
            profit/loss calculation.
          </p>
          <input
            type="number"
            min="0"
            step="0.01"
            value={marketingSpends}
            onChange={(e) => setMarketingSpends(e.target.value)}
            className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-2xl font-bold text-slate-900">Other Expenses</h3>
          <p className="mt-6 text-sm leading-7 text-slate-500">
            (Optional) Enter any other expenses for the day to include in the
            profit/loss calculation.
          </p>
          <input
            type="number"
            min="0"
            step="0.01"
            value={otherExpenses}
            onChange={(e) => setOtherExpenses(e.target.value)}
            className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-2xl font-bold text-slate-900">
            Return Percentage
          </h3>
          <p className="mt-6 text-sm leading-7 text-slate-500">
            (Optional) Enter return percentage to deduct from units sold (e.g.
            20 for 20%).
          </p>
          <input
            type="number"
            min="0"
            step="0.01"
            value={returnPercentage}
            onChange={(e) => setReturnPercentage(e.target.value)}
            className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-2xl font-bold text-slate-900">Actions</h3>
          <div className="mt-6">
            <Select
              options={salesTypeOptions}
              value={salesType}
              onChange={setSalesType}
              placeholder="Select sales type"
              styles={selectStyles}
            />
          </div>
          <button
            type="button"
            onClick={handleSaveProfitLoss}
            disabled={isSavingProfitLoss}
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            {isSavingProfitLoss ? "Saving..." : "Calculate Profit/Loss"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="grid grid-cols-1 gap-3 text-sm font-medium text-slate-600 md:grid-cols-2 xl:grid-cols-4">
          <div>
            Gross Profit:{" "}
            <span className="font-bold text-slate-900">
              {formatCurrency(summary.totalProfit)}
            </span>
          </div>
          <div>
            Marketing Spends:{" "}
            <span className="font-bold text-slate-900">
              {formatCurrency(summary.marketingCost)}
            </span>
          </div>
          <div>
            Other Expenses:{" "}
            <span className="font-bold text-slate-900">
              {formatCurrency(summary.otherCost)}
            </span>
          </div>
          <div>
            Return Deduction ({safeNumber(summary.returnRate).toFixed(2)}%):{" "}
            <span className="font-bold text-slate-900">
              {formatCurrency(summary.returnDeduction)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.04)] sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900">
              Saved Profit/Loss History
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Date filter, sales type search আর pagination সহ saved data দেখা
              যাবে।
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <DateRangeFilter
              startDate={historyStartDate}
              endDate={historyEndDate}
              onStartDateChange={setHistoryStartDate}
              onEndDateChange={setHistoryEndDate}
              compact
              className="sm:col-span-2"
            />

            <label className="min-w-[220px]">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Sales Type
              </span>
              <input
                type="text"
                value={salesTypeSearch}
                onChange={(e) => setSalesTypeSearch(e.target.value)}
                placeholder="Search by sales type"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[920px] w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left">
                {[
                  "Date",
                  "Sales Type",
                  "Products",
                  "Purchase",
                  "Sale",
                  "Return",
                  "Cost",
                  "Profit/Loss",
                  "Action",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="border-b border-slate-200 px-3 py-4 text-sm font-bold text-slate-700 first:pl-2"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {profitLossLoading || profitLossFetching ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-16 text-center text-sm font-medium text-slate-500"
                  >
                    Loading saved profit/loss data...
                  </td>
                </tr>
              ) : profitLossRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-16 text-center text-sm font-medium text-slate-500"
                  >
                    কোনো saved profit/loss data পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                profitLossRows.map((row) => (
                  <tr key={row?.Id} className="group">
                    <td className="border-b border-slate-100 px-3 py-4 text-sm font-medium text-slate-700 first:pl-2">
                      {formatDate(row?.date || row?.createdAt)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-900">
                      {row?.salesType || "-"}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-4 text-sm font-medium text-slate-700">
                      {safeNumber(row?.products)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-900">
                      {formatCurrency(row?.purchase)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-700">
                      {formatCurrency(row?.revenue)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-700">
                      {formatCurrency(row?.return)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-700">
                      {formatCurrency(row?.cost)}
                    </td>
                    <td
                      className={`border-b border-slate-100 px-3 py-4 text-sm font-bold ${
                        safeNumber(row?.profitLoss) >= 0
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {formatCurrency(row?.profitLoss)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePrintInvoice(row)}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Printer size={14} />
                          Print
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendEmail(row)}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Mail size={14} />
                          Email
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProfitLossHistory(row?.Id)}
                          disabled={isDeletingProfitLoss}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
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
            Total: {totalProfitLossCount} records
          </p>

          <div className="flex items-center gap-2 self-end">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
              Page {currentPage} / {totalPages}
            </div>

            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight size={18} />
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
              {selectedInvoiceRow?.salesType || "Profit/Loss Invoice"}
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
              Client Email
            </span>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="Enter email address"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
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
              disabled={isSendingProfitLossInvoice}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSendingProfitLossInvoice ? "Sending..." : "Send Email"}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default DailyProfitLossTable;
