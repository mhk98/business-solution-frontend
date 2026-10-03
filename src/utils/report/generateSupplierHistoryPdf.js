import {
  escapeHtml,
  formatAmount,
  safeAssetToDataUrl,
  getEmbeddedFonts,
  PAGE_WIDTH,
} from "../renderedPdfReport";

const PAGE_HEIGHT = 1123;
const FIRST_PAGE_ROWS = 16;
const ROWS_PER_PAGE = 22;

const STATUS_STYLES = {
  Paid: { color: "#047857", bg: "#ecfdf5", border: "#a7f3d0" },
  Due: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  Discount: { color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
};

const SUMMARY_CARDS = [
  { key: "totalPaid", label: "Total Paid", color: "#047857", bg: "#ecfdf5", border: "#a7f3d0" },
  { key: "totalDiscount", label: "Total Discount", color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  { key: "totalAdvance", label: "Total Advance", color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd" },
  { key: "totalDue", label: "Total Due", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
];

// First page carries the header/summary, so it fits fewer rows.
const chunkRows = (rows) => {
  const pages = [rows.slice(0, FIRST_PAGE_ROWS)];
  for (let i = FIRST_PAGE_ROWS; i < rows.length; i += ROWS_PER_PAGE) {
    pages.push(rows.slice(i, i + ROWS_PER_PAGE));
  }
  return pages;
};

const renderStatus = (status) => {
  const style = STATUS_STYLES[status];
  if (!style) return escapeHtml(status || "-");
  return `<span class="status" style="color:${style.color};background:${style.bg};border-color:${style.border};">${escapeHtml(status)}</span>`;
};

const renderProduct = (row) => {
  if (!row.productName) return `<span class="muted">—</span>`;
  // Qty stays on the same line so every row has the same height and the
  // fixed rows-per-page never spills past the footer.
  return `<span class="product-name">${escapeHtml(row.productName)}</span>${
    row.productQty ? `<span class="product-qty"> · ${escapeHtml(row.productQty)}</span>` : ""
  }`;
};

const createPageHtml = ({
  rows,
  rowOffset,
  pageNumber,
  totalPages,
  regularFontDataUrl,
  boldFontDataUrl,
  supplierName,
  metadata,
  summary,
  logoDataUrl,
  companyName,
}) => `
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
    .page {
      box-sizing: border-box;
      width: ${PAGE_WIDTH}px;
      height: ${PAGE_HEIGHT}px;
      padding: 44px 48px 36px;
      background: #ffffff;
      color: #0f172a;
      font-family: "PdfNotoSansBengali", Arial, sans-serif;
      font-size: 12.5px;
      line-height: 1.45;
      position: relative;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 16px;
      border-bottom: 3px solid #4f46e5;
    }
    .brand { display: flex; align-items: center; gap: 14px; }
    .logo img { max-width: 150px; max-height: 52px; object-fit: contain; display: block; }
    .logo-fallback {
      width: 52px; height: 52px; border-radius: 12px;
      background: #4f46e5; color: #fff; font-weight: 700; font-size: 20px;
      display: flex; align-items: center; justify-content: center;
    }
    .company { font-size: 15px; font-weight: 700; color: #0f172a; }
    .company-sub { font-size: 11px; color: #64748b; }
    .doc-title { text-align: right; }
    .doc-title .label {
      font-size: 10.5px; font-weight: 700; letter-spacing: 1.5px;
      text-transform: uppercase; color: #4f46e5;
    }
    .doc-title .name { font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.2; }
    .meta {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 16px 0 14px;
      padding: 10px 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }
    .meta .k { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; }
    .meta .v { font-size: 12px; font-weight: 700; color: #0f172a; }
    .cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .card { border: 1px solid; border-radius: 10px; padding: 10px 12px; }
    .card .k { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; }
    .card .v { font-size: 17px; font-weight: 700; margin-top: 4px; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
    th {
      background: #4f46e5; color: #fff;
      font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;
      padding: 9px 10px; text-align: left;
    }
    th:first-child { border-top-left-radius: 8px; }
    th:last-child { border-top-right-radius: 8px; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    tr:nth-child(even) td { background: #f8fafc; }
    .c-sl { width: 6%; color: #94a3b8; }
    .c-date { width: 13%; }
    .c-product { width: 29%; }
    .c-cost { width: 12%; text-align: right; color: #475569; }
    .c-amount { width: 13%; text-align: right; font-weight: 700; }
    .c-status { width: 15%; text-align: center; }
    .product-name { font-weight: 700; color: #0f172a; }
    .product-qty { font-size: 11px; color: #64748b; }
    .muted { color: #cbd5e1; }
    .status {
      display: inline-block; min-width: 58px; padding: 2px 10px;
      border: 1px solid; border-radius: 999px;
      font-size: 11px; font-weight: 700; text-align: center;
    }
    .footer {
      position: absolute; left: 48px; right: 48px; bottom: 26px;
      display: flex; justify-content: space-between;
      padding-top: 8px; border-top: 1px solid #e2e8f0;
      font-size: 10.5px; color: #94a3b8;
    }
  </style>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">${
          logoDataUrl
            ? `<img src="${logoDataUrl}" alt="Logo" />`
            : `<div class="logo-fallback">KM</div>`
        }</div>
        <div>
          <div class="company">${escapeHtml(companyName)}</div>
          <div class="company-sub">Supplier Ledger Statement</div>
        </div>
      </div>
      <div class="doc-title">
        <div class="label">Supplier History</div>
        <div class="name">${escapeHtml(supplierName)}</div>
      </div>
    </div>
    ${
      pageNumber === 1
        ? `<div class="meta">
            <div><div class="k">Duration</div><div class="v">${escapeHtml(metadata.duration)}</div></div>
            <div><div class="k">Book</div><div class="v">${escapeHtml(metadata.book)}</div></div>
            <div><div class="k">Generated by</div><div class="v">${escapeHtml(metadata.generatedBy)}</div></div>
            <div><div class="k">Generated on</div><div class="v">${escapeHtml(metadata.generatedAt)}</div></div>
          </div>
          <div class="cards">
            ${SUMMARY_CARDS.map(
              (c) => `<div class="card" style="background:${c.bg};border-color:${c.border};">
                <div class="k" style="color:${c.color};">${c.label}</div>
                <div class="v" style="color:${c.color};">${escapeHtml(formatAmount(summary[c.key]))}</div>
              </div>`,
            ).join("")}
          </div>`
        : `<div style="height:16px;"></div>`
    }
    <table>
      <thead>
        <tr>
          <th class="c-sl">#</th>
          <th class="c-date">Date</th>
          <th class="c-product">Product</th>
          <th class="c-cost">Product Cost</th>
          <th class="c-cost">Other Cost</th>
          <th class="c-amount">Amount</th>
          <th class="c-status">Payment Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row, i) => `<tr>
              <td class="c-sl">${rowOffset + i + 1}</td>
              <td class="c-date">${escapeHtml(row.date || "-")}</td>
              <td class="c-product">${renderProduct(row)}</td>
              <td class="c-cost">${row.productCost === "" || row.productCost == null ? "—" : escapeHtml(formatAmount(row.productCost))}</td>
              <td class="c-cost">${row.otherCost === "" || row.otherCost == null ? "—" : escapeHtml(formatAmount(row.otherCost))}</td>
              <td class="c-amount">${escapeHtml(formatAmount(row.amount))}</td>
              <td class="c-status">${renderStatus(row.status)}</td>
            </tr>`,
          )
          .join("")}
      </tbody>
    </table>
    <div class="footer">
      <span>${escapeHtml(companyName)} · ${escapeHtml(supplierName)} Supplier History</span>
      <span>Page ${pageNumber} of ${totalPages}</span>
    </div>
  </div>
`;

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

// rows: [{ date, productName, productQty, productCost, otherCost, amount, status }]
// productCost/otherCost are "" for rows that aren't requisition dues.
// summary: { totalPaid, totalDiscount, totalAdvance, totalDue }
export const generateSupplierHistoryPdf = async ({
  rows = [],
  supplierName = "Supplier",
  summary = {},
  metadata = {},
  logoUrl = "",
  companyName = "Kafela Mart",
}) => {
  const { jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;

  const pages = chunkRows(rows);
  const reportMetadata = {
    duration: metadata.duration || "All Dates",
    book: metadata.book || "All Books",
    generatedBy: metadata.generatedBy || "Unknown",
    generatedAt: metadata.generatedAt || new Date().toLocaleString(),
  };

  const logoDataUrl = await safeAssetToDataUrl(logoUrl);
  const [regularFontDataUrl, boldFontDataUrl] = await getEmbeddedFonts();

  const doc = new jsPDF("p", "mm", "a4");
  const iframe = createRenderFrame();

  try {
    let rowOffset = 0;
    for (let index = 0; index < pages.length; index += 1) {
      const html = createPageHtml({
        rows: pages[index],
        rowOffset,
        pageNumber: index + 1,
        totalPages: pages.length,
        regularFontDataUrl,
        boldFontDataUrl,
        supplierName,
        metadata: reportMetadata,
        summary,
        logoDataUrl,
        companyName,
      });
      rowOffset += pages[index].length;

      const frameDocument = iframe.contentDocument;
      frameDocument.open();
      frameDocument.write(
        `<!doctype html><html><body style="margin:0;background:#fff;">${html}</body></html>`,
      );
      frameDocument.close();

      await Promise.all([
        frameDocument.fonts?.load('400 13px "PdfNotoSansBengali"', "মাধ্যমে"),
        frameDocument.fonts?.load('700 22px "PdfNotoSansBengali"', supplierName),
        frameDocument.fonts?.ready,
      ]);

      const canvas = await html2canvas(frameDocument.querySelector(".page"), {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        windowWidth: PAGE_WIDTH,
        windowHeight: PAGE_HEIGHT,
      });

      if (index > 0) doc.addPage();
      doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
    }
  } finally {
    iframe.remove();
  }

  return doc.output("blob");
};
