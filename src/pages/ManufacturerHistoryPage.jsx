import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Factory,
  Printer,
  ReceiptText,
  Wallet,
} from "lucide-react";
import jsPDF from "jspdf";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import Header from "../components/common/Header";
import {
  useGetManufacturerTransactionsQuery,
  useGetSingleManufacturerQuery,
  usePayManufacturerAmountMutation,
} from "../features/manufacturer/manufacturer";
import { useGetAllLogoQuery } from "../features/logo/logo";
import {
  DEFAULT_COMPANY_NAME,
  buildAssetUrl,
  drawPdfBrandBlock,
} from "../utils/pdfBranding";

const formatMoney = (value) =>
  `৳${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const toNumber = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const today = () => new Date().toISOString().slice(0, 10);

const firstFilled = (...values) =>
  values.find((value) => String(value || "").trim()) || "";

const createManufacturerPaymentInvoicePdf = async ({
  transaction,
  manufacturer,
  logoUrl,
}) => {
  const recordId = transaction?.Id ?? transaction?.id ?? 1;
  const invoiceNo = `MWI-${String(recordId).padStart(4, "0")}`;
  const amount = Number(transaction?.credit || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  pdf.setDrawColor(55, 65, 81);
  pdf.setLineWidth(0.35);
  pdf.rect(margin - 4, 14, contentWidth + 8, pageHeight - 30);

  await drawPdfBrandBlock({
    pdf,
    logoUrl,
    companyName: DEFAULT_COMPANY_NAME,
    x: margin + 2,
    topY: y,
    logoMaxWidth: 62,
    logoMaxHeight: 17.5,
    companySize: 12.5,
    subtitle: "Manufacturer Payment Invoice",
    subtitleSize: 9.2,
  });

  pdf.setTextColor(17, 24, 39);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15.5);
  pdf.text("MANUFACTURER PAYMENT INVOICE", pageWidth - margin, y + 12, {
    align: "right",
  });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  pdf.text(`Date: ${transaction?.date || "-"}`, pageWidth - margin, y + 19, {
    align: "right",
  });

  y += 36;
  pdf.setDrawColor(156, 163, 175);
  pdf.setLineWidth(0.25);
  pdf.line(margin, y, pageWidth - margin, y);

  y += 10;
  pdf.setDrawColor(31, 41, 55);
  pdf.setLineWidth(0.25);
  pdf.rect(margin, y, 62, 13);
  pdf.setTextColor(75, 85, 99);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("Invoice No", margin + 4, y + 5);
  pdf.setTextColor(17, 24, 39);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(invoiceNo, margin + 4, y + 10);

  pdf.rect(pageWidth - margin - 48, y, 48, 13);
  pdf.setFontSize(10);
  pdf.text("PAID", pageWidth - margin - 24, y + 8.5, { align: "center" });

  y += 24;
  const manufacturerName =
    manufacturer?.name || transaction?.manufacturerName || "Manufacturer";
  const manufacturerPhone = firstFilled(
    manufacturer?.phone,
    manufacturer?.Phone,
    manufacturer?.mobile,
    manufacturer?.Mobile,
  );
  const manufacturerAddress = firstFilled(
    manufacturer?.address,
    manufacturer?.Address,
  );
  const detailRows = [
    ["Manufacturer", manufacturerName],
    ["Payment Type", "Manufacturer Wage Payment"],
    ["Reference", transaction?.description || "-"],
    ["Phone", manufacturerPhone || "-"],
    ["Address", manufacturerAddress || "-"],
  ];
  const detailsRowHeight = 11.5;
  const detailsHeaderHeight = 13;
  const detailsBoxHeight =
    detailsHeaderHeight + detailRows.length * detailsRowHeight;

  pdf.setDrawColor(156, 163, 175);
  pdf.setLineWidth(0.25);
  pdf.rect(margin, y, contentWidth, detailsBoxHeight);
  pdf.setTextColor(17, 24, 39);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Payment Details", margin + 5, y + 8.5);
  pdf.setDrawColor(209, 213, 219);
  pdf.line(margin, y + detailsHeaderHeight, pageWidth - margin, y + detailsHeaderHeight);

  const labelColumnWidth = 48;
  const labelX = margin + 5;
  const valueX = margin + labelColumnWidth + 5;
  let rowTop = y + detailsHeaderHeight;

  pdf.setFontSize(9);
  detailRows.forEach(([label, value], index) => {
    const textY = rowTop + 7.2;
    if (index > 0) {
      pdf.setDrawColor(229, 231, 235);
      pdf.line(margin, rowTop, pageWidth - margin, rowTop);
    }
    pdf.setDrawColor(229, 231, 235);
    pdf.line(
      margin + labelColumnWidth,
      rowTop,
      margin + labelColumnWidth,
      rowTop + detailsRowHeight,
    );
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(55, 65, 81);
    pdf.text(label, labelX, textY);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(17, 24, 39);
    pdf.setFontSize(9);
    pdf.text(
      pdf.splitTextToSize(String(value), contentWidth - labelColumnWidth - 12),
      valueX,
      textY,
    );
    rowTop += detailsRowHeight;
  });

  y += detailsBoxHeight + 12;
  const amountBoxHeight = 22;
  pdf.setDrawColor(31, 41, 55);
  pdf.setLineWidth(0.35);
  pdf.rect(margin, y, contentWidth, amountBoxHeight);
  pdf.setTextColor(75, 85, 99);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("Paid Amount", margin + 6, y + 9);
  pdf.setTextColor(17, 24, 39);
  const amountRightX = pageWidth - margin - 6;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  const currency = "BDT";
  const currencyWidth = pdf.getTextWidth(currency);
  pdf.text(currency, amountRightX, y + 14, { align: "right" });
  pdf.setFontSize(19);
  pdf.text(amount, amountRightX - currencyWidth - 3, y + 15, {
    align: "right",
  });

  y += amountBoxHeight + 18;
  pdf.setTextColor(17, 24, 39);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Note", margin, y);

  y += 7;
  const noteBoxY = y;
  const noteBoxHeight = 24;
  pdf.setDrawColor(156, 163, 175);
  pdf.setLineWidth(0.25);
  pdf.rect(margin, noteBoxY, contentWidth, noteBoxHeight);
  pdf.setDrawColor(31, 41, 55);
  pdf.setLineWidth(0.45);
  pdf.line(margin, noteBoxY, margin, noteBoxY + noteBoxHeight);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(55, 65, 81);
  pdf.setFontSize(10);
  const noteLines = pdf.splitTextToSize(
    String(transaction?.note || "-"),
    contentWidth - 14,
  );
  pdf.text(noteLines.slice(0, 3), margin + 7, noteBoxY + 9);

  y = noteBoxY + noteBoxHeight + 22;
  pdf.setDrawColor(75, 85, 99);
  pdf.setLineWidth(0.2);
  pdf.setTextColor(55, 65, 81);
  const signatureWidth = 44;
  const signatureGap = 18;
  const signatureGroupWidth = signatureWidth * 3 + signatureGap * 2;
  const preparedX = (pageWidth - signatureGroupWidth) / 2;
  [
    [preparedX, "Prepared By"],
    [preparedX + signatureWidth + signatureGap, "Checked By"],
    [preparedX + (signatureWidth + signatureGap) * 2, "Approved By"],
  ].forEach(([x, label]) => {
    pdf.line(x, y, x + signatureWidth, y);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(label, x + signatureWidth / 2, y + 7, { align: "center" });
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  pdf.text(
    "This invoice is generated electronically from Kafela Mart accounts system.",
    pageWidth / 2,
    y + 20,
    { align: "center" },
  );

  return { pdf, filename: `${invoiceNo}.pdf` };
};

const ManufacturerHistoryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: today(),
    phone: "",
    address: "",
    note: "",
  });

  const { data, isLoading, refetch } = useGetManufacturerTransactionsQuery(
    { id, page, limit: 20 },
    { skip: !id },
  );
  const { data: singleManufacturerData } = useGetSingleManufacturerQuery(id, {
    skip: !id,
  });
  const { data: logoData } = useGetAllLogoQuery();
  const logoUrl = buildAssetUrl(logoData?.data?.file);
  const [payManufacturerAmount, payState] = usePayManufacturerAmountMutation();

  const rows = data?.data || [];
  const rawManufacturer = data?.manufacturer || {};
  const latestManufacturer = singleManufacturerData?.data || {};
  const rawSummary = data?.summary || {};
  const rowSummary = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          totalDebit: acc.totalDebit + toNumber(row.debit),
          totalCredit: acc.totalCredit + toNumber(row.credit),
        }),
        { totalDebit: 0, totalCredit: 0 },
      ),
    [rows],
  );
  const summary = useMemo(() => {
    const apiTotalDebit = toNumber(rawSummary.totalDebit);
    const apiTotalCredit = toNumber(
      rawSummary.paidAmount ?? rawSummary.totalCredit,
    );
    const shouldUseRowFallback =
      rows.length > 0 &&
      apiTotalDebit === 0 &&
      apiTotalCredit === 0 &&
      (rowSummary.totalDebit > 0 || rowSummary.totalCredit > 0);

    const totalDebit = shouldUseRowFallback
      ? rowSummary.totalDebit
      : apiTotalDebit;
    const totalCredit = shouldUseRowFallback
      ? rowSummary.totalCredit
      : apiTotalCredit;

    return {
      totalDebit,
      totalCredit,
      paidAmount: totalCredit,
      unpaidAmount: totalDebit - totalCredit,
    };
  }, [rawSummary, rowSummary, rows.length]);
  const manufacturer = useMemo(
    () => ({
      ...rawManufacturer,
      ...latestManufacturer,
      name:
        latestManufacturer.name ||
        rawManufacturer.name ||
        rows[0]?.manufacturerName ||
        "Manufacturer",
      phone: firstFilled(
        latestManufacturer.phone,
        latestManufacturer.Phone,
        rawManufacturer.phone,
        rawManufacturer.Phone,
      ),
      address: firstFilled(
        latestManufacturer.address,
        latestManufacturer.Address,
        rawManufacturer.address,
        rawManufacturer.Address,
      ),
    }),
    [latestManufacturer, rawManufacturer, rows],
  );

  useEffect(() => {
    setPaymentForm((prev) => ({
      ...prev,
      phone: prev.phone || manufacturer.phone || "",
      address: prev.address || manufacturer.address || "",
    }));
  }, [manufacturer.phone, manufacturer.address]);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.meta?.count || 0) / 20)),
    [data?.meta?.count],
  );

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast.error("Please enter valid paid amount");
      return;
    }

    try {
      const res = await payManufacturerAmount({
        id,
        data: paymentForm,
      }).unwrap();

      if (res?.success !== false) {
        toast.success("Payment saved successfully");
        setPaymentForm((prev) => ({
          amount: "",
          date: today(),
          phone: prev.phone,
          address: prev.address,
          note: "",
        }));
        setPage(1);
        refetch?.();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Payment failed!");
    }
  };

  const buildPaymentInvoice = (transaction) =>
    createManufacturerPaymentInvoicePdf({
      transaction,
      manufacturer,
      logoUrl,
    });

  const handleInvoiceDownload = async (transaction) => {
    try {
      const { pdf, filename } = await buildPaymentInvoice(transaction);
      pdf.save(filename);
    } catch (err) {
      console.error("Invoice download failed:", err);
      toast.error("Invoice download failed");
    }
  };

  const handleInvoicePrint = async (transaction) => {
    try {
      const { pdf } = await buildPaymentInvoice(transaction);
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank");

      if (!printWindow) {
        URL.revokeObjectURL(url);
        toast.error("Please allow popup to print invoice.");
        return;
      }

      printWindow.addEventListener("load", () => {
        printWindow.focus();
        printWindow.print();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    } catch (err) {
      console.error("Invoice print failed:", err);
      toast.error("Invoice print failed");
    }
  };

  const cards = [
    {
      label: "Total Wage",
      value: summary.totalDebit,
      icon: ReceiptText,
      className: "text-slate-900",
    },
    {
      label: "Paid Amount",
      value: summary.paidAmount,
      icon: CreditCard,
      className: "text-emerald-600",
    },
    {
      label: "Unpaid Amount",
      value: summary.unpaidAmount,
      icon: Wallet,
      className: "text-rose-600",
    },
  ];

  return (
    <div className="flex-1 relative z-10">
      <Header title="Manufacturer History" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <motion.div
          className="bg-white/90 backdrop-blur-md shadow-sm rounded-3xl p-4 sm:p-8 border border-slate-100 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 mb-8">
            <div>
              <button
                type="button"
                onClick={() => navigate("/manufacturer")}
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition mb-4"
              >
                <ArrowLeft size={17} /> Back to Manufacturer
              </button>
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Factory size={22} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {manufacturer.name || "Manufacturer"}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1 font-medium">
                    {manufacturer.phone || "No phone"} ·{" "}
                    {manufacturer.address || "No address"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-3xl border border-slate-100 bg-slate-50/60 p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                      {card.label}
                    </div>
                    <div className="h-10 w-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-500">
                      <Icon size={18} />
                    </div>
                  </div>
                  <div className={`mt-3 text-2xl font-black ${card.className}`}>
                    {formatMoney(card.value)}
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={handlePaymentSubmit}
            className="rounded-3xl border border-slate-100 bg-white p-5 mb-8 shadow-sm"
          >
            <div className="flex flex-col lg:flex-row lg:items-end gap-4">
              <div className="flex-1">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  Paid Amount
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  className="h-12 border border-slate-200 rounded-2xl px-4 w-full text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold"
                  placeholder="Enter paid amount"
                />
              </div>
              <div className="lg:w-64">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={paymentForm.phone}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  className="h-12 border border-slate-200 rounded-2xl px-4 w-full text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold"
                  placeholder="Phone number"
                />
              </div>
              <div className="lg:w-48">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  Date
                </label>
                <input
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className="h-12 border border-slate-200 rounded-2xl px-4 w-full text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold"
                />
              </div>
              <button
                type="submit"
                disabled={payState.isLoading}
                className="h-12 px-8 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-60"
              >
                {payState.isLoading ? "Saving..." : "Add Paid Amount"}
              </button>
            </div>
            <textarea
              value={paymentForm.address}
              onChange={(e) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  address: e.target.value,
                }))
              }
              className="mt-4 min-h-16 border border-slate-200 rounded-2xl px-4 py-3 w-full text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium resize-y"
              placeholder="Manufacturer address..."
            />
            <textarea
              value={paymentForm.note}
              onChange={(e) =>
                setPaymentForm((prev) => ({ ...prev, note: e.target.value }))
              }
              className="mt-4 min-h-20 border border-slate-200 rounded-2xl px-4 py-3 w-full text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium resize-y"
              placeholder="Payment note..."
            />
          </form>

          <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/70">
                  <tr>
                    {[
                      "Date",
                      "Type",
                      "Description",
                      "Unpaid/Debit",
                      "Paid/Credit",
                      "Note",
                      "Invoice",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.Id} className="hover:bg-indigo-50/30">
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-slate-600">
                        {formatDate(row.date || row.createdAt)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-widest text-slate-500">
                          {row.type || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4 min-w-72 text-sm font-medium text-slate-700">
                        {row.description || "-"}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-black text-rose-600">
                        {formatMoney(row.debit)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-black text-emerald-600">
                        {formatMoney(row.credit)}
                      </td>
                      <td className="px-5 py-4 min-w-64 text-sm font-medium text-slate-500">
                        {row.note || "-"}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {String(row.type || "").toUpperCase() === "PAYMENT" ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleInvoicePrint(row)}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95"
                              title="Print invoice"
                            >
                              <Printer size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInvoiceDownload(row)}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 active:scale-95"
                              title="Download invoice"
                            >
                              <Download size={15} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-slate-300">
                            -
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {isLoading && (
                <div className="py-20 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600/20 border-t-indigo-600"></div>
                  <p className="text-slate-500 text-sm mt-4 font-bold tracking-tight">
                    Loading transaction history...
                  </p>
                </div>
              )}

              {!isLoading && rows.length === 0 && (
                <div className="py-20 text-center text-slate-400">
                  <ReceiptText size={42} className="mx-auto mb-4 opacity-25" />
                  <p className="font-bold text-sm italic">
                    No transaction history found
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between mt-8 gap-6 px-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Showing page <span className="text-indigo-600">{page}</span> of{" "}
              <span className="text-slate-900">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button
                type="button"
                className="h-11 w-11 rounded-2xl font-black text-sm bg-indigo-600 text-white shadow-xl shadow-indigo-100"
              >
                {page}
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default ManufacturerHistoryPage;
