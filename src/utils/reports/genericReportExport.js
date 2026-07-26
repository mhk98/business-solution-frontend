import * as XLSX from "xlsx";

const isPlainObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value);

const formatDateOnly = (value) => {
  if (typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
  return null;
};

export const formatReportValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(formatReportValue).join(", ");
  const dateOnly = formatDateOnly(value);
  if (dateOnly) return dateOnly;
  if (isPlainObject(value)) {
    return (
      value.name ||
      value.title ||
      value.label ||
      value.username ||
      value.email ||
      JSON.stringify(value)
    );
  }
  return value;
};

const toTitle = (key) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const buildReportTable = (rows = []) => {
  const keys = Array.from(
    rows.reduce((set, row) => {
      if (isPlainObject(row)) {
        Object.keys(row).forEach((key) => {
          if (!["password", "token", "refreshToken"].includes(key)) {
            set.add(key);
          }
        });
      }
      return set;
    }, new Set()),
  );

  const orderedKeys = [
    ...["Id", "id", "date", "createdAt", "name", "title", "sku", "quantity", "amount", "status"].filter((key) =>
      keys.includes(key),
    ),
    ...keys.filter(
      (key) =>
        !["Id", "id", "date", "createdAt", "name", "title", "sku", "quantity", "amount", "status"].includes(key),
    ),
  ];

  const headers = ["#", ...orderedKeys.map(toTitle)];
  const body = rows.map((row, index) => [
    index + 1,
    ...orderedKeys.map((key) => formatReportValue(row?.[key])),
  ]);

  return { headers, body };
};

export const downloadGenericReportXlsx = ({ title, rows, filename }) => {
  const { headers, body } = buildReportTable(rows);
  const worksheet = XLSX.utils.aoa_to_sheet([
    [title],
    [`Generated: ${new Date().toISOString().slice(0, 10)}`],
    [`Total Rows: ${rows.length}`],
    [],
    headers,
    ...body,
  ]);

  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(headers.length - 1, 0) } },
  ];
  worksheet["!cols"] = headers.map((header) => ({
    wch: Math.min(Math.max(String(header).length + 6, 12), 36),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const downloadGenericReportPdf = async ({ title, rows, filename }) => {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const { headers, body } = buildReportTable(rows);

  const doc = new jsPDF("l", "mm", "a4");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toISOString().slice(0, 10)} | Total Rows: ${rows.length}`, 14, 20);

  autoTable(doc, {
    head: [headers],
    body,
    startY: 25,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.8, overflow: "linebreak" },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
  });

  doc.save(`${filename}.pdf`);
};
