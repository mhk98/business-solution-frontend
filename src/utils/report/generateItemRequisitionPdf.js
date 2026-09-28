import {
  escapeHtml,
  formatAmount,
  safeAssetToDataUrl,
  getEmbeddedFonts,
  PAGE_WIDTH,
} from "../renderedPdfReport";

// Item Requisition History report — same rendered-page approach as
// generateItemPurchaseHistoryPdf (HTML → canvas → jsPDF, so Bangla renders),
// plus the supplier's Total Paid / Advance / Due on the first page.

const PAGE_HEIGHT = 1123;
const ROWS_PER_PAGE = 18;

const COLUMNS = [
  { label: "Date", key: "date", width: "12%" },
  { label: "Item", key: "item", width: "22%" },
  { label: "Supplier", key: "supplier", width: "22%" },
  { label: "Quantity", key: "quantity", width: "13%" },
  { label: "Amount", key: "amount", width: "15%", className: "amount" },
  { label: "Status", key: "status", width: "16%" },
];

const chunkRows = (rows) => {
  const pages = [];
  for (let index = 0; index < rows.length; index += ROWS_PER_PAGE) {
    pages.push(rows.slice(index, index + ROWS_PER_PAGE));
  }
  return pages.length ? pages : [[]];
};

const summaryItem = (label, value, tone = "") => `
  <div class="pdf-summary-item ${tone}">
    <div class="pdf-summary-label">${escapeHtml(label)}</div>
    <div class="pdf-summary-value">${escapeHtml(formatAmount(value))}</div>
  </div>`;

const createPageHtml = ({
  title,
  rows,
  pageNumber,
  totalPages,
  regularFontDataUrl,
  boldFontDataUrl,
  totals,
  metadata,
  logoDataUrl,
}) => `
  <div class="pdf-render-page">
    <style>
      @font-face {
        font-family: "PdfNotoSansBengali";
        src: url("${regularFontDataUrl}") format("truetype");
        font-weight: 400;
      }
      @font-face {
        font-family: "PdfNotoSansBengali";
        src: url("${boldFontDataUrl}") format("truetype");
        font-weight: 700;
      }
      .pdf-render-page {
        box-sizing: border-box;
        width: ${PAGE_WIDTH}px;
        min-height: ${PAGE_HEIGHT}px;
        padding: 60px 48px;
        background: #ffffff;
        color: #111827;
        font-family: "PdfNotoSansBengali", Arial, sans-serif;
        font-size: 13px;
        line-height: 1.45;
      }
      .pdf-header {
        display: flex;
        align-items: center;
        gap: 14px;
        margin: 0 0 14px;
        padding: 14px 16px;
        border: 1px solid #dbe3ef;
        background: #f5f7ff;
      }
      .pdf-logo { max-width: 180px; max-height: 54px; object-fit: contain; display: block; }
      .pdf-logo-fallback { color: #4f46e5; font-size: 20px; font-weight: 700; }
      .pdf-title { margin: 0; font-size: 23px; line-height: 1.25; font-weight: 700; }
      .pdf-subtitle { margin-top: 5px; color: #64748b; font-size: 12px; }
      .pdf-meta {
        margin: 0 0 14px;
        border: 1px solid #d1d5db;
        padding: 10px 12px;
        font-size: 12.5px;
      }
      .pdf-meta strong { font-weight: 700; }
      .pdf-meta-sep { color: #9ca3af; padding: 0 8px; }
      .pdf-summary {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        margin: 0 0 16px;
        border: 1px solid #d1d5db;
      }
      .pdf-summary-item { padding: 12px 12px 11px; border-right: 1px solid #e5e7eb; }
      .pdf-summary-item:last-child { border-right: 0; }
      .pdf-summary-label { color: #6b7280; font-size: 12px; margin-bottom: 6px; }
      .pdf-summary-value { font-size: 15px; font-weight: 700; line-height: 1.25; }
      .paid .pdf-summary-value { color: #047857; }
      .advance .pdf-summary-value { color: #1d4ed8; }
      .due .pdf-summary-value { color: #b91c1c; }
      .pdf-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      .pdf-table th {
        background: #4f46e5;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        padding: 6px;
        text-align: left;
      }
      .pdf-table td {
        border: 1px solid #c7c7c7;
        padding: 6px;
        vertical-align: top;
        overflow-wrap: anywhere;
      }
      .amount { text-align: right; }
      .pdf-total-row td { font-weight: 700; background: #f5f7ff; }
      .pdf-footer { margin-top: 14px; text-align: right; color: #6b7280; font-size: 11px; }
    </style>

    <div class="pdf-header">
      ${
        logoDataUrl
          ? `<img class="pdf-logo" src="${logoDataUrl}" alt="Logo" />`
          : `<div class="pdf-logo-fallback">KM</div>`
      }
      <div>
        <h1 class="pdf-title">${escapeHtml(title)}</h1>
        <div class="pdf-subtitle">Item Requisition History Report</div>
      </div>
    </div>
    ${
      pageNumber === 1
        ? `<div class="pdf-meta">
            <strong>Supplier:</strong> ${escapeHtml(metadata.supplier)}
            <span class="pdf-meta-sep">|</span>
            <strong>Duration:</strong> ${escapeHtml(metadata.duration)}
            ${metadata.item ? `<span class="pdf-meta-sep">|</span><strong>Item:</strong> ${escapeHtml(metadata.item)}` : ""}
            ${metadata.status ? `<span class="pdf-meta-sep">|</span><strong>Status:</strong> ${escapeHtml(metadata.status)}` : ""}
            <br />
            <strong>Generated by:</strong> ${escapeHtml(metadata.generatedBy)}
            <span class="pdf-meta-sep">|</span>
            <strong>Generated on:</strong> ${escapeHtml(metadata.generatedAt)}
          </div>
          <div class="pdf-summary">
            ${summaryItem("Requisition Amount", totals.amount)}
            ${summaryItem("Total Paid", totals.paid, "paid")}
            ${summaryItem("Total Advance", totals.advance, "advance")}
            ${summaryItem("Total Due", totals.due, "due")}
          </div>`
        : ""
    }
    <table class="pdf-table">
      <colgroup>${COLUMNS.map((c) => `<col style="width:${c.width}" />`).join("")}</colgroup>
      <thead>
        <tr>${COLUMNS.map((c) => `<th class="${c.className || ""}">${escapeHtml(c.label)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${
          rows.length
            ? rows
                .map(
                  (row) =>
                    `<tr>${COLUMNS.map(
                      (c) => `<td class="${c.className || ""}">${escapeHtml(row[c.key])}</td>`,
                    ).join("")}</tr>`,
                )
                .join("")
            : `<tr><td colspan="${COLUMNS.length}" style="text-align:center;color:#9ca3af;">No data found</td></tr>`
        }
        ${
          pageNumber === totalPages && rows.length
            ? `<tr class="pdf-total-row">
                <td colspan="4">Total</td>
                <td class="amount">${escapeHtml(formatAmount(totals.amount))}</td>
                <td></td>
              </tr>`
            : ""
        }
      </tbody>
    </table>
    ${totalPages > 1 ? `<div class="pdf-footer">Page ${pageNumber} of ${totalPages}</div>` : ""}
  </div>`;

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

// rows: [{ date, item, supplier, quantity, amount (number), status }]
// supplierTotals: { purchase, paid, advance, due } — Supplier History within
// the date filter (purchase = due posted in the range)
export const generateItemRequisitionPdf = async ({
  rows = [],
  title = "Item Requisition History",
  metadata = {},
  supplierTotals = {},
  logoUrl = "",
}) => {
  const { jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;

  const totals = {
    amount: rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    purchase: Number(supplierTotals.purchase || 0),
    paid: Number(supplierTotals.paid || 0),
    advance: Number(supplierTotals.advance || 0),
    due: Number(supplierTotals.due || 0),
  };
  const pages = chunkRows(
    rows.map((row) => ({ ...row, amount: formatAmount(row.amount) })),
  );
  const reportMetadata = {
    supplier: metadata.supplier || "All Suppliers",
    duration: metadata.duration || "All Data",
    item: metadata.item || "",
    status: metadata.status || "",
    generatedBy: metadata.generatedBy || "Unknown",
    generatedAt: metadata.generatedAt || new Date().toLocaleString(),
  };

  const logoDataUrl = await safeAssetToDataUrl(logoUrl);
  const [regularFontDataUrl, boldFontDataUrl] = await getEmbeddedFonts();

  const doc = new jsPDF("p", "mm", "a4");
  const iframe = createRenderFrame();

  try {
    for (let index = 0; index < pages.length; index += 1) {
      const html = createPageHtml({
        title,
        rows: pages[index],
        pageNumber: index + 1,
        totalPages: pages.length,
        regularFontDataUrl,
        boldFontDataUrl,
        totals,
        metadata: reportMetadata,
        logoDataUrl,
      });
      const frameDocument = iframe.contentDocument;
      frameDocument.open();
      frameDocument.write(
        `<!doctype html><html><body style="margin:0;background:#fff;">${html}</body></html>`,
      );
      frameDocument.close();

      await Promise.all([
        frameDocument.fonts?.load('400 13px "PdfNotoSansBengali"', "মাধ্যমে"),
        frameDocument.fonts?.load('700 23px "PdfNotoSansBengali"', title),
        frameDocument.fonts?.ready,
      ]);

      const canvas = await html2canvas(
        frameDocument.querySelector(".pdf-render-page"),
        {
          backgroundColor: "#ffffff",
          scale: 2,
          logging: false,
          windowWidth: PAGE_WIDTH,
          windowHeight: PAGE_HEIGHT,
        },
      );
      if (index > 0) doc.addPage();
      doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
    }
  } finally {
    iframe.remove();
  }

  return doc.output("blob");
};
