import { generateRenderedCashReportPdf } from "../renderedPdfReport";

export const generateCashInOutPdf = async ({
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
    defaultTitle: "Cash In/Out Report",
  });
