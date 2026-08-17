import notoSansBengaliBoldUrl from "../assets/fonts/NotoSansBengali-Bold.ttf?url";
import notoSansBengaliRegularUrl from "../assets/fonts/NotoSansBengali-Regular.ttf?url";

const REPORT_COLUMNS = [
  { label: "Date", key: "date" },
  { label: "Document", key: "document" },
  { label: "Category", key: "category" },
  { label: "Payment Mode", key: "paymentMode" },
  { label: "Remarks", key: "remarks", className: "remarks" },
  { label: "CashIn", key: "cashIn", className: "amount cash-in-amount" },
  { label: "CashOut", key: "cashOut", className: "amount cash-out-amount" },
];

const ROWS_PER_PAGE = 16;
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

let embeddedFontPromise = null;

const escapeHtml = (value) =>
  String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getDocumentName = (filePath) => {
  const normalizedPath = String(filePath || "").replace(/\\/g, "/").trim();
  if (!normalizedPath) return "---";

  return normalizedPath.split("/").pop() || normalizedPath;
};

const hasNumberValue = (value) =>
  value !== undefined && value !== null && value !== "";

const formatAmount = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const normalizeReportMeta = (metadata = {}) => ({
  duration: metadata.duration || "All Data",
  generatedBy: metadata.generatedBy || "Unknown",
  generatedAt: metadata.generatedAt || new Date().toLocaleString(),
});

const buildSummary = (products = [], summary = {}) => {
  const rowTotals = products.reduce(
    (totals, product) => {
      const amount = Number(product.amount || 0);
      const paymentStatus = String(product.paymentStatus || "").toLowerCase();

      if (paymentStatus === "cashin") totals.cashIn += amount;
      if (paymentStatus === "cashout") totals.cashOut += amount;

      return totals;
    },
    { cashIn: 0, cashOut: 0 },
  );

  const cashIn = hasNumberValue(summary.totalCashIn)
    ? Number(summary.totalCashIn || 0)
    : rowTotals.cashIn;
  const cashOut = hasNumberValue(summary.totalCashOut)
    ? Number(summary.totalCashOut || 0)
    : rowTotals.cashOut;
  const finalBalance = hasNumberValue(summary.netBalance)
    ? Number(summary.netBalance || 0)
    : cashIn - cashOut;

  return { cashIn, cashOut, finalBalance };
};

const normalizeRows = (products) =>
  products.map((product) => {
    const amount = Number(product.amount || 0).toFixed(2);
    const paymentStatus = String(product.paymentStatus || "").toLowerCase();

    return {
      date: product.date || "-",
      document: getDocumentName(product.file),
      category: product.categoryInfo?.name || product.category || "---",
      paymentMode: product.paymentMode || "-",
      remarks: product.remarks || "-",
      cashIn: paymentStatus === "cashin" ? amount : "",
      cashOut: paymentStatus === "cashout" ? amount : "",
    };
  });

const chunkRows = (rows) => {
  const pages = [];

  for (let index = 0; index < rows.length; index += ROWS_PER_PAGE) {
    pages.push(rows.slice(index, index + ROWS_PER_PAGE));
  }

  return pages.length ? pages : [[]];
};

const assetToDataUrl = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load PDF render asset: ${url}`);
  }

  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
};

const safeAssetToDataUrl = async (url) => {
  if (!url) return "";

  try {
    return await assetToDataUrl(url);
  } catch (error) {
    console.warn("Failed to load report logo:", error);
    return "";
  }
};

const getEmbeddedFonts = () => {
  if (!embeddedFontPromise) {
    embeddedFontPromise = Promise.all([
      assetToDataUrl(notoSansBengaliRegularUrl),
      assetToDataUrl(notoSansBengaliBoldUrl),
    ]);
  }

  return embeddedFontPromise;
};

const createPageHtml = ({
  title,
  rows,
  pageNumber,
  totalPages,
  regularFontDataUrl,
  boldFontDataUrl,
  summary,
  metadata,
  logoDataUrl,
}) => {
  const page = document.createElement("div");
  page.className = "pdf-render-page";
  page.innerHTML = `
    <style>
      @font-face {
        font-family: "PdfNotoSansBengali";
        src: url("${regularFontDataUrl}") format("truetype");
        font-weight: 400;
        font-style: normal;
      }

      @font-face {
        font-family: "PdfNotoSansBengali";
        src: url("${boldFontDataUrl}") format("truetype");
        font-weight: 700;
        font-style: normal;
      }

      .pdf-render-page {
        box-sizing: border-box;
        width: ${PAGE_WIDTH}px;
        min-height: ${PAGE_HEIGHT}px;
        padding: 68px 54px;
        background: #ffffff;
        color: #111827;
        font-family: "PdfNotoSansBengali", Arial, sans-serif;
        font-size: 13px;
        line-height: 1.45;
      }

      .pdf-render-header {
        display: flex;
        align-items: center;
        gap: 14px;
        margin: 0 0 14px;
        padding: 14px 16px;
        border: 1px solid #dbe3ef;
        background: #f5f7ff;
      }

      .pdf-render-logo-box {
        width: 54px;
        height: 54px;
        border-radius: 12px;
        background: #ffffff;
        border: 1px solid #dbe3ef;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex: 0 0 auto;
      }

      .pdf-render-logo-box img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        display: block;
      }

      .pdf-render-logo-fallback {
        color: #4f46e5;
        font-size: 20px;
        font-weight: 700;
      }

      .pdf-render-heading {
        min-width: 0;
      }

      .pdf-render-title {
        margin: 0;
        color: #111827;
        font-size: 23px;
        line-height: 1.25;
        font-weight: 700;
      }

      .pdf-render-subtitle {
        margin-top: 5px;
        color: #64748b;
        font-size: 12px;
      }

      .pdf-render-rule {
        margin: 0 0 16px;
        border: 0;
        border-top: 1px solid #d1d5db;
      }

      .pdf-render-summary {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        margin: 0 0 16px;
        border: 1px solid #d1d5db;
      }

      .pdf-render-meta {
        margin: 0 0 16px;
        border: 1px solid #d1d5db;
        padding: 11px 12px;
        font-size: 13px;
        color: #111827;
      }

      .pdf-render-meta strong {
        font-weight: 700;
      }

      .pdf-render-meta-separator {
        color: #9ca3af;
        padding: 0 8px;
      }

      .pdf-render-summary-item {
        padding: 14px 14px 13px;
        border-right: 1px solid #d1d5db;
      }

      .pdf-render-summary-item:last-child {
        border-right: 0;
      }

      .pdf-render-summary-label {
        color: #6b7280;
        font-size: 13px;
        margin-bottom: 8px;
      }

      .pdf-render-summary-value {
        color: #111827;
        font-size: 18px;
        font-weight: 700;
        line-height: 1.25;
      }

      .pdf-render-summary-value.cash-in-amount {
        color: #15803d;
      }

      .pdf-render-summary-value.cash-out-amount {
        color: #dc2626;
      }

      .pdf-render-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      .pdf-render-table th {
        background: #4f46e5;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        padding: 6px 6px;
        text-align: left;
      }

      .pdf-render-table td {
        box-sizing: border-box;
        border: 1px solid #c7c7c7;
        padding: 6px 6px;
        vertical-align: top;
        overflow-wrap: anywhere;
        word-break: normal;
      }

      .pdf-render-table th {
        box-sizing: border-box;
      }

      .pdf-render-table th:first-child,
      .pdf-render-table td:first-child {
        width: 12%;
      }

      .pdf-render-table th:nth-child(2),
      .pdf-render-table td:nth-child(2) {
        width: 13%;
      }

      .pdf-render-table th:nth-child(3),
      .pdf-render-table td:nth-child(3) {
        width: 15%;
      }

      .pdf-render-table th:nth-child(4),
      .pdf-render-table td:nth-child(4) {
        width: 13%;
      }

      .pdf-render-table th:nth-child(5),
      .pdf-render-table td:nth-child(5) {
        width: 25%;
      }

      .pdf-render-table th:nth-child(6),
      .pdf-render-table td:nth-child(6),
      .pdf-render-table th:nth-child(7),
      .pdf-render-table td:nth-child(7) {
        width: 11%;
      }

      .remarks {
        white-space: pre-wrap;
      }

      .amount {
        text-align: right;
      }

      .cash-in-amount {
        color: #15803d;
      }

      .cash-out-amount {
        color: #dc2626;
      }

      .pdf-render-footer {
        margin-top: 16px;
        text-align: right;
        color: #6b7280;
        font-size: 11px;
      }
    </style>

    <div class="pdf-render-header">
      <div class="pdf-render-logo-box">
        ${
          logoDataUrl
            ? `<img src="${logoDataUrl}" alt="Logo" />`
            : `<div class="pdf-render-logo-fallback">KM</div>`
        }
      </div>
      <div class="pdf-render-heading">
        <h1 class="pdf-render-title">${escapeHtml(title)}</h1>
        <div class="pdf-render-subtitle">Cash In/Out Report</div>
      </div>
    </div>
    <hr class="pdf-render-rule" />
    ${
      pageNumber === 1
        ? `<div class="pdf-render-meta">
            <strong>Duration:</strong> ${escapeHtml(metadata.duration)}
            <span class="pdf-render-meta-separator">|</span>
            <strong>Generated by:</strong> ${escapeHtml(metadata.generatedBy)}
            <span class="pdf-render-meta-separator">|</span>
            <strong>Generated on:</strong> ${escapeHtml(metadata.generatedAt)}
          </div>
          <div class="pdf-render-summary">
            <div class="pdf-render-summary-item">
              <div class="pdf-render-summary-label">Total Cash In</div>
              <div class="pdf-render-summary-value cash-in-amount">${escapeHtml(formatAmount(summary.cashIn))}</div>
            </div>
            <div class="pdf-render-summary-item">
              <div class="pdf-render-summary-label">Total Cash Out</div>
              <div class="pdf-render-summary-value cash-out-amount">${escapeHtml(formatAmount(summary.cashOut))}</div>
            </div>
            <div class="pdf-render-summary-item">
              <div class="pdf-render-summary-label">Final Balance</div>
              <div class="pdf-render-summary-value">${escapeHtml(formatAmount(summary.finalBalance))}</div>
            </div>
          </div>`
        : ""
    }
    <table class="pdf-render-table">
      <thead>
        <tr>
          ${REPORT_COLUMNS.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                ${REPORT_COLUMNS.map(
                  (column) =>
                    `<td class="${column.className || ""}">${escapeHtml(row[column.key])}</td>`,
                ).join("")}
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
    ${totalPages > 1 ? `<div class="pdf-render-footer">Page ${pageNumber} of ${totalPages}</div>` : ""}
  `;

  return page;
};

const createRenderFrame = () => {
  const iframe = document.createElement("iframe");

  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = `${PAGE_WIDTH}px`;
  iframe.style.height = `${PAGE_HEIGHT}px`;
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  return iframe;
};

export const generateRenderedCashReportPdf = async ({
  products = [],
  bookName = "",
  defaultTitle = "Cash In/Out Report",
  summary = {},
  metadata = {},
  logoUrl = "",
}) => {
  const { jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;
  const title = bookName ? `Report: ${bookName}` : defaultTitle;
  const pages = chunkRows(normalizeRows(products));
  const reportSummary = buildSummary(products, summary);
  const reportMetadata = normalizeReportMeta(metadata);
  const logoDataUrl = await safeAssetToDataUrl(logoUrl);
  const doc = new jsPDF("p", "mm", "a4");
  const [regularFontDataUrl, boldFontDataUrl] = await getEmbeddedFonts();
  const iframe = createRenderFrame();

  try {
    for (let index = 0; index < pages.length; index += 1) {
      const page = createPageHtml({
        title,
        rows: pages[index],
        pageNumber: index + 1,
        totalPages: pages.length,
        regularFontDataUrl,
        boldFontDataUrl,
        summary: reportSummary,
        metadata: reportMetadata,
        logoDataUrl,
      });
      const frameDocument = iframe.contentDocument;

      frameDocument.open();
      frameDocument.write(`<!doctype html><html><body style="margin:0;background:#fff;">${page.outerHTML}</body></html>`);
      frameDocument.close();

      await Promise.all([
        frameDocument.fonts?.load('400 13px "PdfNotoSansBengali"', "মাধ্যমে"),
        frameDocument.fonts?.load('700 24px "PdfNotoSansBengali"', title),
        frameDocument.fonts?.ready,
      ]);

      const renderPage = frameDocument.querySelector(".pdf-render-page");
      const canvas = await html2canvas(renderPage, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        windowWidth: PAGE_WIDTH,
        windowHeight: PAGE_HEIGHT,
      });
      const image = canvas.toDataURL("image/png");

      if (index > 0) {
        doc.addPage();
      }

      doc.addImage(image, "PNG", 0, 0, 210, 297, undefined, "FAST");
    }
  } finally {
    iframe.remove();
  }

  return doc.output("blob");
};
