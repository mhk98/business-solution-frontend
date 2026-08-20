import { generateRenderedCashReportPdf } from "../renderedPdfReport";

export const generatePettyCashPdf = async ({
  products = [],
  bookName = "",
  summary = {},
  metadata = {},
  logoUrl = "",
}) =>
  generateRenderedCashReportPdf({
    products,
    bookName,
    summary,
    metadata,
    logoUrl,
    defaultTitle: "Petty Cash In/Out Report",
  });
