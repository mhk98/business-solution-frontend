import {
  escapeHtml,
  formatAmount,
  safeAssetToDataUrl,
  getEmbeddedFonts,
  PAGE_WIDTH,
} from "../renderedPdfReport";

const PAGE_HEIGHT = 1123;
const ROWS_PER_PAGE = 18;

const COLUMNS = [
  { label: "Date", key: "date" },
  { label: "Product", key: "product" },
  { label: "Supplier", key: "supplier" },
  { label: "Unit Value", key: "unitValue" },
  { label: "Unit Cost", key: "unitCost", className: "amount" },
  { label: "Total Cost", key: "totalCost", className: "amount total-cost" },
];

const normalizeRows = (rows = []) =>
  rows.map((row) => {
    const unitValue = Number(row.unitValue || 0);
    const unitCost = Number(row.unitCost || 0);

    return {
      date: row.date || "-",
      product: row.product || "-",
      supplier: row.supplier || "-",
      unitValue: `${unitValue}${row.unit ? ` ${row.unit}` : ""}`,
      unitCost: formatAmount(unitCost),
      totalCost: formatAmount(unitValue * unitCost),
    };
  });

const chunkRows = (rows) => {
  const pages = [];

  for (let index = 0; index < rows.length; index += ROWS_PER_PAGE) {
    pages.push(rows.slice(index, index + ROWS_PER_PAGE));
  }

  return pages.length ? pages : [[]];
};

const createPageHtml = ({
  title,
  rows,
  pageNumber,
  totalPages,
  regularFontDataUrl,
  boldFontDataUrl,
  totalCost,
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
        max-width: 180px;
        max-height: 54px;
        border-radius: 8px;
        background: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex: 0 0 auto;
      }

      .pdf-render-logo-box img {
        max-width: 180px;
        max-height: 54px;
        object-fit: contain;
        display: block;
      }

      .pdf-render-logo-fallback {
        color: #4f46e5;
        font-size: 20px;
        font-weight: 700;
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

      .pdf-render-summary {
        display: grid;
        grid-template-columns: 1fr;
        margin: 0 0 16px;
        border: 1px solid #d1d5db;
      }

      .pdf-render-summary-item {
        padding: 14px 14px 13px;
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
        box-sizing: border-box;
      }

      .pdf-render-table td {
        box-sizing: border-box;
        border: 1px solid #c7c7c7;
        padding: 6px 6px;
        vertical-align: top;
        overflow-wrap: anywhere;
        word-break: normal;
      }

      .pdf-render-table th:nth-child(1),
      .pdf-render-table td:nth-child(1) {
        width: 14%;
      }

      .pdf-render-table th:nth-child(2),
      .pdf-render-table td:nth-child(2) {
        width: 24%;
      }

      .pdf-render-table th:nth-child(3),
      .pdf-render-table td:nth-child(3) {
        width: 22%;
      }

      .pdf-render-table th:nth-child(4),
      .pdf-render-table td:nth-child(4) {
        width: 14%;
      }

      .pdf-render-table th:nth-child(5),
      .pdf-render-table td:nth-child(5),
      .pdf-render-table th:nth-child(6),
      .pdf-render-table td:nth-child(6) {
        width: 13%;
      }

      .amount {
        text-align: right;
      }

      .total-cost {
        font-weight: 700;
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
      <div>
        <h1 class="pdf-render-title">${escapeHtml(title)}</h1>
        <div class="pdf-render-subtitle">Item Purchase History Report</div>
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
              <div class="pdf-render-summary-label">Total Purchase Amount</div>
              <div class="pdf-render-summary-value">${escapeHtml(formatAmount(totalCost))}</div>
            </div>
          </div>`
        : ""
    }
    <table class="pdf-render-table">
      <thead>
        <tr>
          ${COLUMNS.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${
          rows.length
            ? rows
                .map(
                  (row) => `
                    <tr>
                      ${COLUMNS.map(
                        (column) =>
                          `<td class="${column.className || ""}">${escapeHtml(row[column.key])}</td>`,
                      ).join("")}
                    </tr>
                  `,
                )
                .join("")
            : `<tr><td colspan="${COLUMNS.length}" style="text-align:center;color:#9ca3af;">No data found</td></tr>`
        }
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

export const generateItemPurchaseHistoryPdf = async ({
  rows = [],
  title = "Item Purchase History",
  metadata = {},
  logoUrl = "",
}) => {
  const { jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;

  const pages = chunkRows(normalizeRows(rows));
  const totalCost = rows.reduce(
    (sum, row) => sum + Number(row.unitValue || 0) * Number(row.unitCost || 0),
    0,
  );
  const reportMetadata = {
    duration: metadata.duration || "All Data",
    generatedBy: metadata.generatedBy || "Unknown",
    generatedAt: metadata.generatedAt || new Date().toLocaleString(),
  };

  const logoDataUrl = await safeAssetToDataUrl(logoUrl);
  const [regularFontDataUrl, boldFontDataUrl] = await getEmbeddedFonts();

  const doc = new jsPDF("p", "mm", "a4");
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
        totalCost,
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
