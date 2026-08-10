import { generateRenderedCashReportPdf } from "../renderedPdfReport";

export const generateMarketingExpensePdf = async ({
  products = [],
  bookName = "",
}) =>
  generateRenderedCashReportPdf({
    products,
    bookName,
    defaultTitle: "Cash In/Out Report",
  });
