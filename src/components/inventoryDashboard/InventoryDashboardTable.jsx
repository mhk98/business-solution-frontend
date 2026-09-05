import { useEffect, useMemo, useRef, useState } from "react";
import {
  useGetInventoryListQuery,
  useLazyGetInventoryListQuery,
} from "../../features/inventoryDashboard/inventoryDashboard";
import { useGetAllProductWithoutQueryQuery } from "../../features/product/product";
import { useGetAllLogoQuery } from "../../features/logo/logo";
import Select from "react-select";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";
import {
  ShoppingBasket,
  TrendingUp,
  TrendingDown,
  Printer,
  FileDown,
  FileSpreadsheet,
} from "lucide-react";
import DateRangeFilter from "../common/DateRangeFilter";
import { DEFAULT_COMPANY_NAME, buildAssetUrl, drawPdfBrandBlock } from "../../utils/pdfBranding";

const MAX_REPORT_ROWS = 5000;

const printCellStyle = {
  border: "1px solid #cbd5e1",
  padding: "6px 8px",
  verticalAlign: "top",
};

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return `৳${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getUnitPrice = (value) => Number(value || 0);

const getVariantDisplayRows = (variants) => {
  const list = Array.isArray(variants) ? variants : [];

  return list
    .filter((item) => item && (item.size || item.color || item.quantity))
    .map((item) => ({
      size: item?.size ? String(item.size) : "",
      color: item?.color ? String(item.color) : "",
      quantity: Number(item?.quantity) || 0,
      purchase_price: Number(item?.purchase_price) || 0,
      sale_price: Number(item?.sale_price) || 0,
    }));
};

const getNumberValue = (...values) => {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue) && numberValue > 0) return numberValue;
  }

  return 0;
};

const inventorySourceLabels = {
  "Purchase Return Product": "Purchase Return",
  "In Transit Product": "Intransit Product",
  "Sales Return Product": "Sales Return",
  "Confirm Order": "POS",
  "Received Product": "Purchase Product",
};

const getInventorySourceLabel = (source) =>
  inventorySourceLabels[source] || source || "-";

const getInventoryTotalPages = ({ meta, rows, page, limit }) => {
  const explicitTotalPages = getNumberValue(
    meta?.totalPages,
    meta?.totalPage,
    meta?.lastPage,
    meta?.pageCount,
    meta?.pagination?.totalPages,
    meta?.pagination?.lastPage,
  );

  if (explicitTotalPages) return explicitTotalPages;

  const totalCount = getNumberValue(
    meta?.total,
    meta?.totalCount,
    meta?.totalItems,
    meta?.totalRecords,
    meta?.recordsTotal,
    meta?.pagination?.total,
    meta?.pagination?.totalItems,
    meta?.count,
  );

  const pagesFromCount = totalCount ? Math.ceil(totalCount / limit) : 0;
  const hasNextPage =
    Boolean(
      meta?.hasNextPage ??
      meta?.hasNext ??
      meta?.pagination?.hasNextPage ??
      meta?.pagination?.hasNext,
    ) ||
    getNumberValue(meta?.nextPage, meta?.pagination?.nextPage) > page ||
    rows.length >= limit;

  return Math.max(1, pagesFromCount, hasNextPage ? page + 1 : page);
};

const describeVariantsForExport = (variants) => {
  const rows = getVariantDisplayRows(variants);
  if (!rows.length) return "-";
  return rows
    .map((v) => `${v.size || "-"}/${v.color || "-"} x${v.quantity}`)
    .join(", ");
};

const buildExportRow = (rp) => {
  const variantRows = getVariantDisplayRows(rp.variants);
  const hasVariants = variantRows.length > 0;

  return {
    date: rp.date,
    product: rp.name || "-",
    category: getInventorySourceLabel(rp.source),
    quantity: Number(rp.quantity || 0),
    purchasePrice: hasVariants ? null : getUnitPrice(rp.unitPurchasePrice),
    salePrice: hasVariants ? null : getUnitPrice(rp.unitSalePrice),
    variants: describeVariantsForExport(rp.variants),
  };
};

const InventoryOverviewTable = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [startPage, setStartPage] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

  // Filters for product, start date, end date, and category
  const [productName, setProductName] = useState("");
  const [startDate, setStartDate] = useState(""); // from
  const [endDate, setEndDate] = useState(""); // to
  const [category, setCategory] = useState(""); // source category

  // ✅ Query params sent to the API
  const query = useMemo(() => {
    return {
      page,
      limit,
      from: startDate || undefined,
      to: endDate || undefined,
      name: productName || undefined,
      source: category || undefined, // Ensure the category is passed correctly
    };
  }, [page, limit, startDate, endDate, productName, category]);

  const { data, isLoading, isError, error } = useGetInventoryListQuery(query);

  // Flatten the data if it contains nested arrays
  const rows = (data?.data ?? []).flat();

  const totalPages = getInventoryTotalPages({
    meta: data?.meta,
    rows,
    page,
    limit,
  });
  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  // ✅ Report (Print / PDF / Excel) support
  const { data: logoRes } = useGetAllLogoQuery();
  const logoUrl = useMemo(() => {
    const logoRecord = Array.isArray(logoRes?.data) ? logoRes.data[0] : logoRes?.data;
    return buildAssetUrl(logoRecord?.file);
  }, [logoRes]);

  const [fetchInventoryReportRows, { isFetching: isPreparingReport }] =
    useLazyGetInventoryListQuery();
  const [reportRows, setReportRows] = useState([]);
  const printRef = useRef(null);

  const triggerPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Inventory_Overview_${new Date().toISOString().slice(0, 10)}`,
  });

  const getFilterSummaryText = () => {
    const parts = [];
    parts.push(category || "All Data");
    if (startDate || endDate) parts.push(`${startDate || "…"} to ${endDate || "…"}`);
    if (productName) parts.push(`Product: ${productName}`);
    return parts.join(" · ");
  };

  const loadFullReportRows = async () => {
    const count = Number(data?.meta?.count || 0);
    if (!count) {
      toast.error("No data to export for the current filters");
      return null;
    }
    if (count > MAX_REPORT_ROWS) {
      toast.error(
        `Too many rows (${count.toLocaleString()}) to export at once. Please narrow the date range or filters (max ${MAX_REPORT_ROWS.toLocaleString()}).`,
      );
      return null;
    }
    try {
      const res = await fetchInventoryReportRows({
        ...query,
        page: 1,
        limit: count,
      }).unwrap();
      return (res?.data ?? []).flat();
    } catch (err) {
      console.error("Failed to prepare inventory report:", err);
      toast.error("Failed to prepare report data");
      return null;
    }
  };

  const handlePrintReport = async () => {
    const fullRows = await loadFullReportRows();
    if (!fullRows) return;
    setReportRows(fullRows);
  };

  useEffect(() => {
    if (reportRows.length) triggerPrint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportRows]);

  const handleDownloadPdf = async () => {
    const fullRows = await loadFullReportRows();
    if (!fullRows) return;

    const doc = new jsPDF({ orientation: "landscape" });
    // jsPDF's built-in fonts have no glyph for ৳ (U+09F3) and corrupt the
    // whole string when it appears, so PDF-native text uses "Tk" instead.
    const formatMoneyForPdf = (value) =>
      `Tk ${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    await drawPdfBrandBlock({
      pdf: doc,
      logoUrl,
      companyName: DEFAULT_COMPANY_NAME,
      x: 14,
      topY: 12,
      logoMaxWidth: 32,
      logoMaxHeight: 18,
      subtitle: "Inventory Overview Report",
    });

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Filters: ${getFilterSummaryText()}`, 14, 46);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 51);

    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text(`Total Units: ${(data?.meta?.totalQuantity ?? 0).toLocaleString()}`, 14, 59);
    doc.text(`Total Purchase: ${formatMoneyForPdf(data?.meta?.totalPurchaseValue ?? 0)}`, 110, 59);
    doc.text(`Total Sale: ${formatMoneyForPdf(data?.meta?.totalSaleValue ?? 0)}`, 210, 59);

    const body = fullRows.map((rp) => {
      const exportRow = buildExportRow(rp);
      return [
        exportRow.date,
        exportRow.product,
        exportRow.category,
        exportRow.quantity,
        exportRow.purchasePrice === null ? "Variant wise" : formatMoneyForPdf(exportRow.purchasePrice),
        exportRow.salePrice === null ? "Variant wise" : formatMoneyForPdf(exportRow.salePrice),
        exportRow.variants,
      ];
    });

    autoTable(doc, {
      head: [["Date", "Product", "Category", "Quantity", "Purchase Price", "Sale Price", "Variants"]],
      body,
      startY: 66,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
      columnStyles: {
        3: { cellWidth: 20 },
        4: { cellWidth: 28 },
        5: { cellWidth: 28 },
      },
    });

    doc.save(`Inventory_Overview_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF report downloaded");
  };

  const handleExportExcel = async () => {
    const fullRows = await loadFullReportRows();
    if (!fullRows) return;

    const header = ["Date", "Product", "Category", "Quantity", "Purchase Price", "Sale Price", "Variants"];
    const rowsAoa = fullRows.map((rp) => {
      const exportRow = buildExportRow(rp);
      return [
        exportRow.date,
        exportRow.product,
        exportRow.category,
        exportRow.quantity,
        exportRow.purchasePrice === null ? "Variant wise" : exportRow.purchasePrice,
        exportRow.salePrice === null ? "Variant wise" : exportRow.salePrice,
        exportRow.variants,
      ];
    });

    const aoa = [
      [DEFAULT_COMPANY_NAME],
      ["Inventory Overview Report"],
      [`Filters: ${getFilterSummaryText()}`],
      [`Generated on: ${new Date().toLocaleString()}`],
      [],
      ["Total Units", "Total Purchase", "Total Sale"],
      [
        data?.meta?.totalQuantity ?? 0,
        Number(data?.meta?.totalPurchaseValue ?? 0).toFixed(2),
        Number(data?.meta?.totalSaleValue ?? 0).toFixed(2),
      ],
      [],
      header,
      ...rowsAoa,
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: header.length - 1 } },
    ];
    ws["!cols"] = [
      { wch: 14 },
      { wch: 24 },
      { wch: 20 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 40 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory Overview");
    XLSX.writeFile(wb, `Inventory_Overview_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Excel report downloaded — open it directly in Google Sheets or Excel");
  };

  useEffect(() => {
    if (isError) console.error("Inventory list error:", error);
  }, [isError, error]);

  useEffect(() => {
    const updatePagesPerSet = () => {
      if (window.innerWidth < 640) setPagesPerSet(5);
      else if (window.innerWidth < 1024) setPagesPerSet(7);
      else setPagesPerSet(10);
    };

    updatePagesPerSet();
    window.addEventListener("resize", updatePagesPerSet);

    return () => window.removeEventListener("resize", updatePagesPerSet);
  }, []);

  // Fetching all products for dropdown filter
  const {
    data: allProductsRes,
    isLoading: isLoadingAllProducts,
    isError: isErrorAllProducts,
    error: errorAllProducts,
  } = useGetAllProductWithoutQueryQuery();

  useEffect(() => {
    if (isErrorAllProducts)
      console.error("Error fetching products", errorAllProducts);
  }, [isErrorAllProducts, errorAllProducts]);

  const productDropdownOptions = useMemo(() => {
    return (allProductsRes?.data || []).map((p) => ({
      value: String(p.Id ?? p.id ?? p._id),
      label: p.name,
    }));
  }, [allProductsRes?.data]);

  const categoryDropdownOptions = useMemo(
    () => [
      { value: "Purchase Product", label: "Purchase Product" },
      { value: "Purchase Return", label: "Purchase Return" },
      { value: "Intransit Product", label: "Intransit Product" },
      { value: "Sales Return", label: "Sales Return" },
      { value: "POS", label: "POS" },
      { value: "Damage Product", label: "Damage Product" },
      { value: "Damage Repair", label: "Damage Repair" },
      { value: "Damage Repaired", label: "Damage Repaired" },
    ],
    [],
  );

  // Filters reset logic
  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setProductName("");
    setCategory("");
    setPage(1);
    setStartPage(1);
  };

  // Whenever filters change, reset the page to 1
  useEffect(() => {
    setPage(1);
    setStartPage(1);
  }, [startDate, endDate, productName, category, limit]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
      return;
    }

    if (page < startPage || page > endPage) {
      setStartPage(Math.floor((page - 1) / pagesPerSet) * pagesPerSet + 1);
    }
  }, [page, totalPages, startPage, endPage, pagesPerSet]);

  const handlePageChange = (pageNumber) => {
    setPage(pageNumber);
    if (pageNumber < startPage) setStartPage(pageNumber);
    else if (pageNumber > endPage) setStartPage(pageNumber - pagesPerSet + 1);
  };

  const handlePreviousSet = () =>
    setStartPage((prev) => Math.max(prev - pagesPerSet, 1));

  const handleNextSet = () =>
    setStartPage((prev) =>
      Math.min(prev + pagesPerSet, Math.max(1, totalPages - pagesPerSet + 1)),
    );

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 14,
      borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0",
      boxShadow: state.isFocused ? "0 0 0 4px rgba(99,102,241,0.15)" : "none",
      "&:hover": { borderColor: "#cbd5e1" },
    }),
    valueContainer: (base) => ({ ...base, padding: "0 12px" }),
    placeholder: (base) => ({ ...base, color: "#64748b" }),
    menu: (base) => ({ ...base, borderRadius: 14, overflow: "hidden" }),
  };

  // Table rendering and pagination
  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Overview History
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Use the filters to analyze specific time periods, products, or
            categories for better inventory management.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="inline-flex items-center gap-3 bg-indigo-50 border border-indigo-100 px-5 py-2.5 rounded-2xl shadow-sm shadow-indigo-50">
            <div className="h-8 w-8 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
              <ShoppingBasket size={18} />
            </div>
            <div>
              <div className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                Total Units
              </div>
              <div className="text-base font-black text-indigo-900 tabular-nums leading-none">
                {isLoading
                  ? "..."
                  : (data?.meta?.totalQuantity ?? 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-3 bg-emerald-50 border border-emerald-100 px-5 py-2.5 rounded-2xl shadow-sm shadow-emerald-50">
            <div className="h-8 w-8 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
              <TrendingDown size={18} />
            </div>
            <div>
              <div className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">
                Total Purchase
              </div>
              <div className="text-base font-black text-emerald-900 tabular-nums leading-none">
                {isLoading
                  ? "..."
                  : formatMoney(data?.meta?.totalPurchaseValue ?? 0)}
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-3 bg-sky-50 border border-sky-100 px-5 py-2.5 rounded-2xl shadow-sm shadow-sky-50">
            <div className="h-8 w-8 bg-white rounded-xl flex items-center justify-center text-sky-600 shadow-sm">
              <TrendingUp size={18} />
            </div>
            <div>
              <div className="text-[9px] font-black text-sky-500 uppercase tracking-[0.2em]">
                Total Sale
              </div>
              <div className="text-base font-black text-sky-900 tabular-nums leading-none">
                {isLoading
                  ? "..."
                  : formatMoney(data?.meta?.totalSaleValue ?? 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          type="button"
          onClick={handlePrintReport}
          disabled={isLoading || isPreparingReport}
          className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer size={16} /> Print Report
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isLoading || isPreparingReport}
          className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileDown size={16} /> Download PDF
        </button>
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={isLoading || isPreparingReport}
          className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet size={16} /> Excel / Google Sheet
        </button>
        {isPreparingReport ? (
          <span className="text-xs font-semibold text-slate-400">Preparing report…</span>
        ) : null}
      </div>

      <div className="max-w-8xl mx-auto px-4 lg:px-8 py-6">
        {/* Filters row */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-6 gap-4 items-end w-full">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          compact
          className="md:col-span-2"
        />

          {/* Product Filter */}
          <div className="flex flex-col">
            <label className="text-sm text-slate-600 mb-1">Product</label>
            <Select
              options={productDropdownOptions}
              value={
                productDropdownOptions.find((o) => o.label === productName) ||
                null
              }
              onChange={(selected) => setProductName(selected?.label || "")}
              placeholder={
                isLoadingAllProducts ? "Loading..." : "Select Product"
              }
              isClearable
              className="text-black"
              isDisabled={isLoadingAllProducts}
              styles={selectStyles}
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-col">
            <label className="text-sm text-slate-600 mb-1">Category</label>
            <Select
              options={categoryDropdownOptions}
              value={
                categoryDropdownOptions.find(
                  (option) => option.value === category,
                ) || null
              }
              onChange={(selected) => setCategory(selected?.value || "")}
              placeholder="Select Category"
              isClearable
              className="text-black"
              styles={selectStyles}
            />
          </div>

          {/* Clear Filters Button */}
          <button
            type="button"
            className="h-11 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 transition rounded-xl px-4 text-sm font-semibold"
            onClick={clearFilters}
          >
            Clear Filters
          </button>

          {/* Items per page */}
          <div className="flex flex-col">
            <label className="text-sm text-slate-600 mb-1">Per Page</label>
            <Select
              options={[10, 20, 50, 100].map((x) => ({
                value: x,
                label: String(x),
              }))}
              value={{ value: limit, label: String(limit) }}
              onChange={(selected) => setLimit(selected?.value || 10)}
              className="text-black"
              styles={selectStyles}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto mt-6 rounded-2xl border border-slate-200">
          <table className="w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Date
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Category
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Quantity
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Purchase Price
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Sale Price
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Variants
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(7)].map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 rounded-lg bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading &&
                rows.map((rp) => {
                  const variantDisplayRows = getVariantDisplayRows(
                    rp.variants,
                  );
                  const hasVariants = variantDisplayRows.length > 0;
                  const unitPurchasePrice = getUnitPrice(rp.unitPurchasePrice);
                  const unitSalePrice = getUnitPrice(rp.unitSalePrice);

                  return (
                    <motion.tr
                      key={rp.Id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {rp.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                        {rp.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                        {getInventorySourceLabel(rp.source)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        {Number(rp.quantity || 0)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasVariants ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
                            Variant wise
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-slate-900 tabular-nums">
                            {formatMoney(unitPurchasePrice)}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasVariants ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
                            Variant wise
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-slate-900 tabular-nums">
                            {formatMoney(unitSalePrice)}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 min-w-[300px]">
                        {hasVariants ? (
                          <div className="flex flex-wrap gap-2">
                            {variantDisplayRows.map((variant, index) => (
                              <div
                                key={`${rp.Id}-variant-${index}`}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                              >
                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-800">
                                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                                    {variant.size || "N/A"}
                                  </span>
                                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-indigo-700">
                                    {variant.color || "N/A"}
                                  </span>
                                </div>
                                <div className="mt-1.5 text-[11px] font-medium text-slate-500">
                                  Qty{" "}
                                  <span className="font-bold text-slate-900">
                                    {variant.quantity}
                                  </span>
                                </div>
                                <div className="mt-1.5 grid grid-cols-2 gap-2 text-[10px] font-semibold">
                                  <div className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700">
                                    <span className="block uppercase tracking-wide text-emerald-500">
                                      Buy
                                    </span>
                                    {formatMoney(
                                      variant.purchase_price || unitPurchasePrice,
                                    )}
                                  </div>
                                  <div className="rounded-lg bg-sky-50 px-2 py-1 text-sky-700">
                                    <span className="block uppercase tracking-wide text-sky-500">
                                      Sell
                                    </span>
                                    {formatMoney(
                                      variant.sale_price || unitSalePrice,
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-dashed border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-400">
                            No variants
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}

              {!isLoading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    No data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center flex-wrap gap-2 mt-5">
          <button
            type="button"
            onClick={handlePreviousSet}
            disabled={startPage === 1 || isLoading}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed hover:bg-slate-50 transition"
          >
            Prev
          </button>

          {[...Array(endPage - startPage + 1)].map((_, index) => {
            const pageNumber = startPage + index;

            return (
              <button
                key={pageNumber}
                type="button"
                onClick={() => handlePageChange(pageNumber)}
                disabled={isLoading}
                className={`px-4 py-2 rounded-xl border transition ${
                  pageNumber === page
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {pageNumber}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleNextSet}
            disabled={endPage === totalPages || isLoading}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed hover:bg-slate-50 transition"
          >
            Next
          </button>
        </div>
      </div>

      {/* Off-screen printable report, cloned by react-to-print on demand */}
      <div style={{ position: "fixed", left: "-10000px", top: 0 }} aria-hidden="true">
        <div
          ref={printRef}
          style={{
            width: "1000px",
            padding: "24px",
            fontFamily: "Arial, sans-serif",
            color: "#111827",
            background: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              borderBottom: "2px solid #4f46e5",
              paddingBottom: 12,
              marginBottom: 16,
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ height: 48, objectFit: "contain" }} />
            ) : null}
            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{DEFAULT_COMPANY_NAME}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Inventory Overview Report</div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: "#475569", marginBottom: 12 }}>
            <div>Filters: {getFilterSummaryText()}</div>
            <div>Generated on: {new Date().toLocaleString()}</div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "#6366f1", textTransform: "uppercase", fontWeight: 700 }}>
                Total Units
              </div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>
                {(data?.meta?.totalQuantity ?? 0).toLocaleString()}
              </div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "#059669", textTransform: "uppercase", fontWeight: 700 }}>
                Total Purchase
              </div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>
                {formatMoney(data?.meta?.totalPurchaseValue ?? 0)}
              </div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "#0284c7", textTransform: "uppercase", fontWeight: 700 }}>
                Total Sale
              </div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>
                {formatMoney(data?.meta?.totalSaleValue ?? 0)}
              </div>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                {["Date", "Product", "Category", "Quantity", "Purchase Price", "Sale Price", "Variants"].map((h) => (
                  <th
                    key={h}
                    style={{
                      border: "1px solid #cbd5e1",
                      background: "#4f46e5",
                      color: "#ffffff",
                      padding: "6px 8px",
                      textAlign: "left",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportRows.map((rp) => {
                const exportRow = buildExportRow(rp);
                return (
                  <tr key={rp.Id}>
                    <td style={printCellStyle}>{exportRow.date}</td>
                    <td style={printCellStyle}>{exportRow.product}</td>
                    <td style={printCellStyle}>{exportRow.category}</td>
                    <td style={printCellStyle}>{exportRow.quantity}</td>
                    <td style={printCellStyle}>
                      {exportRow.purchasePrice === null ? "Variant wise" : formatMoney(exportRow.purchasePrice)}
                    </td>
                    <td style={printCellStyle}>
                      {exportRow.salePrice === null ? "Variant wise" : formatMoney(exportRow.salePrice)}
                    </td>
                    <td style={printCellStyle}>{exportRow.variants}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default InventoryOverviewTable;
