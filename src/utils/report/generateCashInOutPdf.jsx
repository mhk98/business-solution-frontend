import { generateRenderedCashReportPdf } from "../renderedPdfReport";

export const generateCashInOutPdf = async ({
  products = [],
  bookName = "",
}) =>
  generateRenderedCashReportPdf({
    products,
    bookName,
    defaultTitle: "Cash In/Out Report",
  });
