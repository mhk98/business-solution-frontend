export const generateMarketingExpensePdf = async ({
  products = [],
  bookName = "",
}) => {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF("p", "mm", "a4");

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);

  const title = bookName ? `Report: ${bookName}` : "Cash In/Out Report";
  doc.text(title, 14, 16);

  // ✅ subtle line under title (optional but looks standard)
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.line(14, 18, 196, 18);

  // const fmtDate = (d) => {
  //   if (!d) return "-";
  //   const dt = new Date(d);
  //   if (Number.isNaN(dt.getTime())) return "-";
  //   return dt.toLocaleDateString();
  // };

  const rows = products.map((p, idx) => [
    idx + 1,
    p.date,
    p.paymentMode || "-",
    p.paymentStatus || "-",
    p.remarks || "-",
    Number(p.amount || 0).toFixed(2),
  ]);

  autoTable(doc, {
    head: [["#", "Date", "Payment Mode", "Status", "Remarks", "Amount"]],
    body: rows,

    // ✅ was 34 (too much). Standard is ~22-24
    startY: 22,

    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 2,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 22 },
      2: { cellWidth: 28 },
      3: { cellWidth: 20 },
      4: { cellWidth: 85 },
      5: { cellWidth: 22, halign: "right" },
    },
  });

  return doc.output("blob");
};
