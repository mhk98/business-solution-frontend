import { useState } from "react";
import toast from "react-hot-toast";
import {
  useLazyGetMonthlyReportingSummaryQuery,
  useLazyGetBookStatementQuery,
} from "../features/monthlyReportingBook/monthlyReportingBook";
import { useLazyGetInventoryReportsQuery } from "../features/inventoryOverview/inventoryOverview";
import { useGetAllLogoQuery } from "../features/logo/logo";
import { useGetAllCompanyInfoQuery } from "../features/companyInfo/companyInfo";
import { DEFAULT_COMPANY_NAME, buildAssetUrl } from "../utils/pdfBranding";
import { generateBookStatementPdf } from "../utils/report/generateBookStatementPdf";

const REPORT_ROW_LIMIT = 5000;

const EMPTY_PREVIEW = {
  open: false,
  loading: false,
  autoPrint: false,
  blobUrl: "",
  title: "Statement",
  downloadName: "statement.pdf",
};

const toSafeFileName = (text) =>
  String(text || "statement")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();

// Generates the "All Books" (or single-book) statement PDF for a date range —
// shared by Monthly Reporting Book and the Dashboard's Print/Download Book action.
export const useBookStatementExport = () => {
  const [preview, setPreview] = useState(EMPTY_PREVIEW);
  const { data: logoData } = useGetAllLogoQuery();
  const logoUrl = buildAssetUrl(logoData?.data?.file);
  const { data: companyInfoRes } = useGetAllCompanyInfoQuery();
  const companyInfo = companyInfoRes?.data || {};

  const [fetchSummaryRows] = useLazyGetMonthlyReportingSummaryQuery();
  const [fetchBookStatement] = useLazyGetBookStatementQuery();
  const [fetchInventoryReports] = useLazyGetInventoryReportsQuery();

  const closePreview = () => {
    if (preview.blobUrl) URL.revokeObjectURL(preview.blobUrl);
    setPreview(EMPTY_PREVIEW);
  };

  const resolveTargetBooks = async ({ range, bookId, bookName, searchTerm }) => {
    if (bookId) {
      return [{ Id: bookId, name: bookName || "Book" }];
    }

    const result = await fetchSummaryRows({
      startDate: range.from,
      endDate: range.to,
      searchTerm: searchTerm || undefined,
      page: 1,
      limit: REPORT_ROW_LIMIT,
    }).unwrap();

    const seen = new Map();
    (result?.data || []).forEach((row) => {
      if (row.bookId && !seen.has(row.bookId)) {
        seen.set(row.bookId, { Id: row.bookId, name: row.bookName || "Book" });
      }
    });

    return Array.from(seen.values());
  };

  const exportStatement = async ({
    range,
    bookId,
    bookName,
    searchTerm,
    autoPrint,
    title,
  }) => {
    const reportTitle = title || (bookName ? `${bookName} — ${range.label}` : `All Books — ${range.label}`);

    setPreview({
      ...EMPTY_PREVIEW,
      open: true,
      loading: true,
      autoPrint,
      title: reportTitle,
      downloadName: `${toSafeFileName(reportTitle)}.pdf`,
    });

    try {
      const targetBooks = await resolveTargetBooks({
        range,
        bookId,
        bookName,
        searchTerm,
      });

      if (!targetBooks.length) {
        toast.error("No transactions found for this period");
        closePreview();
        return;
      }

      const statementResults = await Promise.all(
        targetBooks.map((book) =>
          fetchBookStatement({
            bookId: book.Id,
            startDate: range.from,
            endDate: range.to,
          }).unwrap(),
        ),
      );

      const booksForPdf = statementResults.map((result, index) => ({
        bookName: result?.meta?.bookName || targetBooks[index].name,
        transactions: result?.data || [],
        totalCredit: result?.meta?.totalCredit || 0,
        totalDebit: result?.meta?.totalDebit || 0,
        netBalance: result?.meta?.netBalance,
        pettyCashTotalCredit: result?.meta?.pettyCashTotalCredit || 0,
        pettyCashTotalDebit: result?.meta?.pettyCashTotalDebit || 0,
        pettyCashNetBalance: result?.meta?.pettyCashNetBalance || 0,
        netBalanceWithPettyCash: result?.meta?.netBalanceWithPettyCash,
        openingByCategory: result?.meta?.openingByCategory || {},
        openingTotalCredit: result?.meta?.openingTotalCredit || 0,
        openingTotalDebit: result?.meta?.openingTotalDebit || 0,
        openingNetBalance: result?.meta?.openingNetBalance || 0,
        statementStartDate: result?.meta?.startDate || null,
        statementEndDate: result?.meta?.endDate || null,
      }));
      const statementInventoryStockReport = statementResults.find(
        (result) => result?.meta?.inventoryStockReport,
      )?.meta?.inventoryStockReport;
      const statementAssetsSummary = statementResults.find(
        (result) => result?.meta?.assetsSummary,
      )?.meta?.assetsSummary;
      const statementPaymentModeSummary = statementResults.find(
        (result) => result?.meta?.paymentModeSummary,
      )?.meta?.paymentModeSummary;
      const inventoryReportsResult =
        statementInventoryStockReport ||
        (await fetchInventoryReports({
          from: range.from,
          to: range.to,
          page: 1,
          limit: REPORT_ROW_LIMIT,
        }).unwrap());
      const inventoryStockReport = statementInventoryStockReport || {
        meta: inventoryReportsResult?.meta,
        data: inventoryReportsResult?.data || [],
      };

      const blob = await generateBookStatementPdf({
        companyName: DEFAULT_COMPANY_NAME,
        companyInfo,
        logoUrl,
        periodLabel: range.label,
        books: booksForPdf,
        assetsSummary: statementAssetsSummary || null,
        paymentModeSummary: statementPaymentModeSummary || null,
        inventoryStockReport,
        itemFactoryStock: statementInventoryStockReport?.itemFactoryStock || null,
        packagingStock: statementInventoryStockReport?.packagingStock || null,
        courierProductStock:
          statementInventoryStockReport?.courierProductStock || null,
        supplierReceivable:
          statementInventoryStockReport?.supplierReceivable || null,
        dollarSupplierReceivable:
          statementInventoryStockReport?.dollarSupplierReceivable || null,
        manufacturerReceivable:
          statementInventoryStockReport?.manufacturerReceivable || null,
        packagingManufacturerReceivable:
          statementInventoryStockReport?.packagingManufacturerReceivable ||
          null,
        lenderReceivable:
          statementInventoryStockReport?.lenderReceivable || null,
        salesDue: statementInventoryStockReport?.salesDue || null,
        salaryAdvance: statementInventoryStockReport?.salaryAdvance || null,
        pendingPayrollSalary:
          statementInventoryStockReport?.pendingPayrollSalary || null,
        supplierDue: statementInventoryStockReport?.supplierDue || null,
        dollarSupplierDue:
          statementInventoryStockReport?.dollarSupplierDue || null,
        manufacturerDue: statementInventoryStockReport?.manufacturerDue || null,
        lenderPayable: statementInventoryStockReport?.lenderPayable || null,
        directorInvestment:
          statementInventoryStockReport?.directorInvestment || null,
      });

      const url = URL.createObjectURL(blob);
      setPreview((prev) => ({ ...prev, loading: false, blobUrl: url }));
    } catch (err) {
      console.error("Statement PDF generation failed:", err);
      toast.error("Failed to generate statement PDF");
      closePreview();
    }
  };

  return { preview, closePreview, exportStatement };
};
