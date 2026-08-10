import { generateRenderedCashReportPdf } from "../renderedPdfReport";

export const generatePettyCashPdf = async ({
  products = [],
  bookName = "",
}) =>
  generateRenderedCashReportPdf({
    products,
    bookName,
    defaultTitle: "Petty Cash In/Out Report",
  });
