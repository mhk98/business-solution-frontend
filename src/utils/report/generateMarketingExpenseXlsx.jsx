import * as XLSX from "xlsx";

export const generateMarketingExpenseXlsx = ({
  products = [],
  bookId = "",
  bookName = "",
}) => {
  // ✅ Title
  const title = bookName ? `Report: ${bookName}` : "Cash In/Out Report";

  // Header + rows
  const header = ["#", "Date", "Payment Mode", "Status", "Remarks", "Amount"];

  // const fmtDate = (d) => {
  //   if (!d) return "-";
  //   const dt = new Date(d);
  //   if (Number.isNaN(dt.getTime())) return "-";
  //   return dt.toLocaleDateString();
  // };

  const rows = products.map((p, idx) => [
    idx + 1,
    // fmtDate(p.date),
    p.date,
    p.paymentMode || "-",
    p.paymentStatus || "-",
    p.remarks || "-",
    Number(p.amount || 0).toFixed(2),
  ]);

  const aoa = [
    [title],
    [`BookId: ${bookId || "-"}`],
    [`Total Rows: ${products.length}`],
    [],
    header,
    ...rows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // ✅ Merge title across columns (A1:F1)
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }];

  // ✅ column width (6 columns)
  ws["!cols"] = [
    { wch: 5 }, // #
    { wch: 14 }, // Date
    { wch: 16 }, // Payment Mode
    { wch: 12 }, // Status
    { wch: 45 }, // Remarks
    { wch: 12 }, // Amount
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "CashInOut");

  // ArrayBuffer -> Blob
  const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  // Preview data (React table এ দেখানোর জন্য)
  return {
    blob,
    preview: {
      title, // ✅ চাইলে modal এ উপরে দেখাতে পারবে
      header,
      rows,
    },
  };
};
