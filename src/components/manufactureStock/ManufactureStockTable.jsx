import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import {
  ShoppingBasket,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  FileSpreadsheet,
  FileText,
  Printer,
} from "lucide-react";
import toast from "react-hot-toast";

import { useLayout } from "../../context/LayoutContext";
import { translations } from "../../utils/translations";
import { useGetAllItemWithoutQueryQuery } from "../../features/item/item";
import { useGetAllItemMasterQuery } from "../../features/manufactureStock/manufactureStock";
import { useGetAllManufactureStockQuery } from "../../features/manufactureStockBalance/manufactureStockBalance";
import { useGetAllManufacturerWithoutQueryQuery } from "../../features/manufacturer/manufacturer";
import { useGetAllLogoQuery } from "../../features/logo/logo";
import {
  DEFAULT_COMPANY_NAME,
  buildAssetUrl,
  drawPdfBrandBlock,
} from "../../utils/pdfBranding";

const ManufactureStockTable = ({ stockType = "item" }) => {
  const { language } = useLayout();
  const t = translations[language] || translations.EN;
  const isManufactureStock = stockType === "manufacture";
  const [rows, setRows] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [productName, setProductName] = useState("");
  const [manufacturerId, setManufacturerId] = useState("");

  const { data: logoData } = useGetAllLogoQuery();
  const logoRecord = Array.isArray(logoData?.data)
    ? logoData.data[0]
    : logoData?.data;
  const logoUrl = useMemo(() => buildAssetUrl(logoRecord?.file), [logoRecord]);

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

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

  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [startDate, endDate, productName, manufacturerId, itemsPerPage]);

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const handlePageChange = (p) => {
    setCurrentPage(p);
    if (p < startPage) setStartPage(p);
    else if (p > endPage) setStartPage(p - pagesPerSet + 1);
  };

  const handlePreviousSet = () =>
    setStartPage((prev) => Math.max(prev - pagesPerSet, 1));
  const handleNextSet = () =>
    setStartPage((prev) =>
      Math.min(prev + pagesPerSet, Math.max(1, totalPages - pagesPerSet + 1)),
    );

  const { data: allProductsRes, isLoading: isLoadingAllProducts } =
    useGetAllItemWithoutQueryQuery();
  const productsData = allProductsRes?.data || [];
  const { data: allManufacturersRes, isLoading: isLoadingManufacturers } =
    useGetAllManufacturerWithoutQueryQuery(undefined, {
      skip: !isManufactureStock,
    });
  const manufacturersData = allManufacturersRes?.data || [];

  const productDropdownOptions = useMemo(() => {
    return (productsData || []).map((p) => ({
      value: String(p.Id),
      label: p.name,
    }));
  }, [productsData]);

  const manufacturerDropdownOptions = useMemo(() => {
    return (manufacturersData || []).map((manufacturer) => ({
      value: String(manufacturer.Id),
      label: manufacturer.name,
    }));
  }, [manufacturersData]);

  // const productNameMap = useMemo(() => {
  //   const m = new Map();
  //   (productsData || []).forEach((p) => m.set(String(p.Id), p.name));
  //   return m;
  // }, [productsData]);

  // const resolveProductName = (rp) => {
  //   const pid = rp.productId ?? rp.product_id ?? rp.ProductId ?? rp.product?.Id;
  //   if (rp.productName) return rp.productName;
  //   if (rp.product?.name) return rp.product?.name;
  //   if (!pid) return "N/A";
  //   return productNameMap.get(String(pid)) || pid;
  // };

  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      name: productName || undefined,
      manufacturerId: isManufactureStock
        ? manufacturerId || undefined
        : undefined,
    };
    Object.keys(args).forEach((k) => {
      if (!args[k]) delete args[k];
    });
    return args;
  }, [
    currentPage,
    itemsPerPage,
    startDate,
    endDate,
    productName,
    manufacturerId,
    isManufactureStock,
  ]);

  const itemStockQuery = useGetAllItemMasterQuery(queryArgs, {
    skip: isManufactureStock,
  });
  const manufactureStockQuery = useGetAllManufactureStockQuery(queryArgs, {
    skip: !isManufactureStock,
  });
  const { data, isLoading } = isManufactureStock
    ? manufactureStockQuery
    : itemStockQuery;

  useEffect(() => {
    if (!isLoading && data) {
      setRows(data.data || []);
      setTotalPages(
        Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)),
      );
    }
  }, [data, isLoading, itemsPerPage]);

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 14,
      borderColor: state.isFocused ? "#6366f1" : "#e2e8f0",
      boxShadow: state.isFocused ? "0 0 0 4px rgba(99,102,241,0.1)" : "none",
      "&:hover": { borderColor: "#cbd5e1" },
      backgroundColor: "white",
    }),
    placeholder: (base) => ({ ...base, color: "#94a3b8", fontSize: "14px" }),
    singleValue: (base) => ({
      ...base,
      color: "#1e293b",
      fontSize: "14px",
      fontWeight: "500",
    }),
    menu: (base) => ({
      ...base,
      borderRadius: 14,
      overflow: "hidden",
      border: "1px solid #f1f5f9",
      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
      zIndex: 50,
    }),
  };

  const getUnitCost = (row) => {
    const cost = Number(row?.cost || 0);
    const unitValue = Number(row?.unitValue || 0);
    if (cost && unitValue) return cost / unitValue;
    return Number(row?.lastUnitCost || 0);
  };

  const getItemBalance = (row) => {
    const cost = Number(row?.cost || 0);
    const unitValue = Number(row?.unitValue || 0);
    const unitCost = getUnitCost(row);
    if (cost > 0) return cost;
    return unitValue * unitCost;
  };

  const totalBalance = useMemo(() => {
    if (
      data?.meta?.totalBalance !== undefined &&
      data?.meta?.totalBalance !== null
    ) {
      return Number(data.meta.totalBalance);
    }
    return (rows || []).reduce((acc, row) => acc + getItemBalance(row), 0);
  }, [data?.meta?.totalBalance, rows]);

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleDownloadExcel = async () => {
    if (!rows || rows.length === 0) {
      toast.error("No data available to export.");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const title = isManufactureStock ? "Factory Stock" : "Item Stock";

      const exportData = rows.map((rp, index) => {
        const itemBal = getItemBalance(rp);
        const unitCostVal = getUnitCost(rp);
        const rowData = {
          SL: index + 1,
          "Last Updated": rp.updatedAt
            ? new Date(rp.updatedAt).toLocaleDateString()
            : "—",
          "Item Detail": rp.name || "N/A",
        };

        if (isManufactureStock) {
          rowData["Manufacturer"] = rp.manufacturerName || "N/A";
        }

        rowData["In Hand Value"] = `${Number(rp.unitValue || 0)} ${rp.unit || "Pcs"}`;
        rowData["Unit Cost"] = Number(unitCostVal.toFixed(2));
        rowData["Balance"] = Number(itemBal.toFixed(2));

        return rowData;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, title);
      XLSX.writeFile(
        workbook,
        `${title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      toast.success("Google Sheet / Excel file exported!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export Google Sheet.");
    }
  };

  const handleDownloadPdf = async () => {
    if (!rows || rows.length === 0) {
      toast.error("No data available to export.");
      return;
    }
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const title = isManufactureStock
        ? "Factory Stock Report"
        : "Item Stock Report";
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();

      let startY = 36;
      if (logoUrl) {
        try {
          await drawPdfBrandBlock({
            pdf: doc,
            logoUrl,
            companyName: DEFAULT_COMPANY_NAME,
            x: 14,
            topY: 12,
            logoMaxWidth: 65,
            logoMaxHeight: 22,
            companySize: 11,
            subtitle: title,
            subtitleSize: 8,
          });
          startY = 48;
        } catch (logoErr) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(16);
          doc.setTextColor(30, 41, 59);
          doc.text(title, 14, 18);
        }
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text(DEFAULT_COMPANY_NAME, 14, 16);
        doc.setFontSize(11);
        doc.setTextColor(71, 85, 105);
        doc.text(title, 14, 23);
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated: ${new Date().toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`,
        14,
        startY - 4,
      );
      doc.text(
        `Total Balance: ${formatMoney(totalBalance)}`,
        pageWidth - 14,
        startY - 4,
        { align: "right" },
      );

      doc.setDrawColor(226, 232, 240);
      doc.line(14, startY, pageWidth - 14, startY);

      const headers = isManufactureStock
        ? [
            "SL",
            "Last Updated",
            "Item Detail",
            "Manufacturer",
            "In Hand Value",
            "Unit Cost",
            "Balance",
          ]
        : [
            "SL",
            "Last Updated",
            "Item Detail",
            "In Hand Value",
            "Unit Cost",
            "Balance",
          ];

      const bodyData = rows.map((rp, index) => {
        const updated = rp.updatedAt
          ? new Date(rp.updatedAt).toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "—";
        const inHand = `${Number(rp.unitValue || 0)} ${rp.unit || "Pcs"}`;
        const unitCostStr = formatMoney(getUnitCost(rp));
        const balanceStr = formatMoney(getItemBalance(rp));

        if (isManufactureStock) {
          return [
            index + 1,
            updated,
            rp.name || "N/A",
            rp.manufacturerName || "N/A",
            inHand,
            unitCostStr,
            balanceStr,
          ];
        }
        return [
          index + 1,
          updated,
          rp.name || "N/A",
          inHand,
          unitCostStr,
          balanceStr,
        ];
      });

      autoTable(doc, {
        startY: startY + 4,
        head: [headers],
        body: bodyData,
        theme: "striped",
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 12 },
          [headers.length - 2]: { halign: "right" },
          [headers.length - 1]: { halign: "right" },
        },
      });

      doc.save(`${title.replace(/\s+/g, "_")}_A4.pdf`);
      toast.success("A4 PDF downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF.");
    }
  };

  const handlePrint = () => {
    if (!rows || rows.length === 0) {
      toast.error("No data available to print.");
      return;
    }

    const title = isManufactureStock
      ? "Factory Stock Report"
      : "Item Stock Report";
    const dateStr = new Date().toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="Company Logo" style="max-height: 48px; max-width: 180px; object-fit: contain; margin-bottom: 6px;" />`
      : `<h1 class="title">${DEFAULT_COMPANY_NAME}</h1>`;

    const headersHtml = isManufactureStock
      ? `<th>SL</th><th>Last Updated</th><th>Item Detail</th><th>Manufacturer</th><th style="text-align:center;">In Hand Value</th><th style="text-align:right;">Unit Cost</th><th style="text-align:right;">Balance</th>`
      : `<th>SL</th><th>Last Updated</th><th>Item Detail</th><th style="text-align:center;">In Hand Value</th><th style="text-align:right;">Unit Cost</th><th style="text-align:right;">Balance</th>`;

    const rowsHtml = rows
      .map((rp, index) => {
        const updated = rp.updatedAt
          ? new Date(rp.updatedAt).toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "—";
        const inHand = `${Number(rp.unitValue || 0)} ${rp.unit || "Pcs"}`;
        const unitCostStr = formatMoney(getUnitCost(rp));
        const balanceStr = formatMoney(getItemBalance(rp));

        if (isManufactureStock) {
          return `
            <tr>
              <td style="text-align:center;">${index + 1}</td>
              <td>${updated}</td>
              <td style="font-weight:600;">${rp.name || "N/A"}</td>
              <td>${rp.manufacturerName || "N/A"}</td>
              <td style="text-align:center;">${inHand}</td>
              <td style="text-align:right;">${unitCostStr}</td>
              <td style="text-align:right; font-weight:600;">${balanceStr}</td>
            </tr>
          `;
        }
        return `
          <tr>
            <td style="text-align:center;">${index + 1}</td>
            <td>${updated}</td>
            <td style="font-weight:600;">${rp.name || "N/A"}</td>
            <td style="text-align:center;">${inHand}</td>
            <td style="text-align:right;">${unitCostStr}</td>
            <td style="text-align:right; font-weight:600;">${balanceStr}</td>
          </tr>
        `;
      })
      .join("");

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      toast.error("Please allow popups to print.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              border-bottom: 2px solid #6366f1;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .title {
              font-size: 18px;
              font-weight: 800;
              color: #0f172a;
              margin: 4px 0 0 0;
            }
            .meta {
              font-size: 11px;
              color: #64748b;
              margin-top: 4px;
            }
            .total-badge {
              text-align: right;
            }
            .total-label {
              font-size: 10px;
              font-weight: 800;
              color: #6366f1;
              text-transform: uppercase;
              letter-spacing: 0.1em;
            }
            .total-val {
              font-size: 18px;
              font-weight: 900;
              color: #1e1b4b;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 11px;
            }
            th {
              background-color: #f8fafc;
              color: #475569;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 9px;
              letter-spacing: 0.05em;
              padding: 8px 10px;
              border-bottom: 1px solid #cbd5e1;
            }
            td {
              padding: 8px 10px;
              border-bottom: 1px solid #f1f5f9;
            }
            tr:nth-child(even) {
              background-color: #fafafa;
            }
            .footer {
              margin-top: 30px;
              padding-top: 10px;
              border-top: 1px solid #e2e8f0;
              font-size: 10px;
              color: #94a3b8;
              display: flex;
              justify-content: space-between;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              ${logoHtml}
              <h2 class="title">${title}</h2>
              <div class="meta">Generated Date: ${dateStr}</div>
            </div>
            <div class="total-badge">
              <div class="total-label">Total Balance</div>
              <div class="total-val">${formatMoney(totalBalance)}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>${headersHtml}</tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            <div>Printed from Accounts System</div>
            <div>A4 Format</div>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-sm rounded-3xl p-4 sm:p-8 border border-slate-100 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {isManufactureStock ? "Factory Stock" : "Item Stock"}
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            {isManufactureStock
              ? "Real-time factory stock levels"
              : "Real-time item stock levels"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition active:scale-95 shadow-sm shadow-emerald-50"
            >
              <FileSpreadsheet size={17} />
              Google Sheet
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-xs font-bold text-rose-700 hover:bg-rose-100 transition active:scale-95 shadow-sm shadow-rose-50"
            >
              <FileText size={17} />
              PDF (A4)
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95 shadow-sm"
            >
              <Printer size={17} />
              Print
            </button>
          </div>

          <div className="inline-flex items-center gap-4 bg-indigo-50 border border-indigo-100 px-6 py-3 rounded-2xl shadow-sm shadow-indigo-50">
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
              <ShoppingBasket size={20} />
            </div>
            <div>
              <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                {t.total_balance || "Total Balance"}
              </div>
              <div className="text-xl font-black text-indigo-900 tabular-nums">
                {isLoading ? t.syncing : formatMoney(totalBalance)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 items-end ${
          isManufactureStock ? "xl:grid-cols-5" : "md:grid-cols-4"
        }`}
      >
        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            {t.per_page_label}
          </label>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold text-sm appearance-none cursor-pointer"
          >
            {[10, 20, 50, 100].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            {t.search_product}
          </label>
          <Select
            options={productDropdownOptions}
            value={
              productDropdownOptions.find((o) => o.label === productName) ||
              null
            }
            onChange={(selected) => setProductName(selected?.label || "")}
            placeholder={isLoadingAllProducts ? t.syncing : t.select_assets}
            isClearable
            isDisabled={isLoadingAllProducts}
            styles={selectStyles}
            className="text-black"
          />
        </div>

        {isManufactureStock && (
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
              Manufacturer
            </label>
            <Select
              options={manufacturerDropdownOptions}
              value={
                manufacturerDropdownOptions.find(
                  (option) => option.value === manufacturerId,
                ) || null
              }
              onChange={(selected) => setManufacturerId(selected?.value || "")}
              placeholder={
                isLoadingManufacturers ? t.syncing : "Select manufacturer"
              }
              isClearable
              isDisabled={isLoadingManufacturers}
              styles={selectStyles}
              className="text-black"
            />
          </div>
        )}

        <button
          className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 transition rounded-xl px-4 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 border border-slate-200"
          onClick={() => {
            setProductName("");
            setManufacturerId("");
            setStartDate("");
            setEndDate("");
          }}
          type="button"
        >
          <X size={16} /> {t.clear_filters}
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.last_updated || "Last Updated"}
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.item_detail || "Item Detail"}
                </th>
                {isManufactureStock && (
                  <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                    Manufacturer
                  </th>
                )}
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.in_hand_qty || "In Hand Value"}
                </th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.unit_cost || "Unit Cost"}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {rows.map((rp) => (
                <motion.tr
                  key={rp.Id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-indigo-50/30 transition-colors group"
                >
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-500 group-hover:text-indigo-600">
                      <Calendar size={14} className="opacity-40" />
                      {rp.updatedAt
                        ? new Date(rp.updatedAt).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight">
                      {/* {resolveProductName(rp)} */}
                      {rp.name || "N/A"}
                    </div>
                  </td>
                  {isManufactureStock && (
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900">
                        {rp.manufacturerName || "N/A"}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    <span className="inline-flex items-center px-4 py-1.5 rounded-2xl text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm shadow-indigo-50 tabular-nums">
                      {Number(rp.unitValue || 0)} {rp.unit || "Pcs"}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    <span className="inline-flex items-center px-4 py-1.5 rounded-2xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm shadow-emerald-50 tabular-nums">
                      {formatMoney(getUnitCost(rp))}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {isLoading && (
            <div className="py-24 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-[3px] border-indigo-600/20 border-t-indigo-600"></div>
              <p className="text-slate-500 text-sm mt-4 font-bold tracking-tight">
                Analyzing Stock Levels...
              </p>
            </div>
          )}

          {!isLoading && rows.length === 0 && (
            <div className="py-24 text-center text-slate-400">
              <div className="text-4xl mb-4 opacity-20">📦</div>
              <p className="font-bold text-sm italic">
                Nothing found in inventory matches your filter
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between mt-10 gap-6 px-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Showing Page <span className="text-indigo-600">{currentPage}</span> of{" "}
          <span className="text-slate-900">{totalPages}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousSet}
            disabled={startPage === 1}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <div className="flex items-center gap-1.5">
            {[...Array(endPage - startPage + 1)].map((_, index) => {
              const pageNum = startPage + index;
              const active = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`h-11 w-11 rounded-2xl font-black text-sm transition-all active:scale-90 ${
                    active
                      ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100"
                      : "bg-white text-slate-600 border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleNextSet}
            disabled={endPage === totalPages}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ManufactureStockTable;
