import notoSansBengaliBoldUrl from "../assets/fonts/NotoSansBengali-Bold.ttf?url";
import notoSansBengaliRegularUrl from "../assets/fonts/NotoSansBengali-Regular.ttf?url";

const REPORT_COLUMNS = [
  { label: "#", key: "index", className: "center" },
  { label: "Date", key: "date" },
  { label: "Payment Mode", key: "paymentMode" },
  { label: "Status", key: "paymentStatus" },
  { label: "Remarks", key: "remarks", className: "remarks" },
  { label: "Amount", key: "amount", className: "amount" },
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

const normalizeRows = (products) =>
  products.map((product, index) => ({
    index: index + 1,
    date: product.date || "-",
    paymentMode: product.paymentMode || "-",
    paymentStatus: product.paymentStatus || "-",
    remarks: product.remarks || "-",
    amount: Number(product.amount || 0).toFixed(2),
  }));

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

      .pdf-render-title {
        margin: 0;
        font-size: 24px;
        line-height: 1.25;
        font-weight: 700;
      }

      .pdf-render-rule {
        margin: 7px 0 16px;
        border: 0;
        border-top: 1px solid #d1d5db;
      }

      .pdf-render-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      .pdf-render-table th {
        background: #4f46e5;
        color: #ffffff;
        font-size: 12px;
        font-weight: 700;
        padding: 7px 8px;
        text-align: left;
      }

      .pdf-render-table td {
        border: 1px solid #c7c7c7;
        padding: 7px 8px;
        vertical-align: top;
        word-break: break-word;
      }

      .pdf-render-table th:first-child,
      .pdf-render-table td:first-child {
        width: 30px;
      }

      .pdf-render-table th:nth-child(2),
      .pdf-render-table td:nth-child(2) {
        width: 80px;
      }

      .pdf-render-table th:nth-child(3),
      .pdf-render-table td:nth-child(3) {
        width: 106px;
      }

      .pdf-render-table th:nth-child(4),
      .pdf-render-table td:nth-child(4) {
        width: 76px;
      }

      .pdf-render-table th:last-child,
      .pdf-render-table td:last-child {
        width: 84px;
      }

      .center {
        text-align: center;
      }

      .remarks {
        white-space: pre-wrap;
      }

      .amount {
        text-align: right;
      }

      .pdf-render-footer {
        margin-top: 16px;
        text-align: right;
        color: #6b7280;
        font-size: 11px;
      }
    </style>

    <h1 class="pdf-render-title">${escapeHtml(title)}</h1>
    <hr class="pdf-render-rule" />
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
}) => {
  const { jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;
  const title = bookName ? `Report: ${bookName}` : defaultTitle;
  const pages = chunkRows(normalizeRows(products));
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
