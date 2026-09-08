import {
  escapeHtml,
  formatAmount,
  safeAssetToDataUrl,
  getEmbeddedFonts,
} from "../renderedPdfReport";

// Page geometry, all in mm (A4). The frame is drawn natively by jsPDF on
// every page; content is composed from independently-rendered section
// images so a section (a table + its total row) is never sliced mid-way
// across a page boundary — if it doesn't fit, it moves to a fresh page.
const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const CONTENT_MARGIN_MM = 18;
const CONTENT_WIDTH_MM = PAGE_W_MM - 2 * CONTENT_MARGIN_MM;
const SECTION_GAP_MM = 4;
const PRINTABLE_BOTTOM_MM = PAGE_H_MM - CONTENT_MARGIN_MM;

const MM_TO_PX = 794 / PAGE_W_MM; // matches the ~96dpi assumption used elsewhere in these reports
const CONTENT_WIDTH_PX = Math.round(CONTENT_WIDTH_MM * MM_TO_PX);
const RENDER_SCALE = 2;

const pad2 = (value) => String(value).padStart(2, "0");

const formatShortDate = (date) =>
  `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${pad2(date.getFullYear() % 100)}`;

const formatRowDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? formatShortDate(date) : "-";
};

const formatQuantity = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

// A category's rows may span several days within the period — show the
// span ("07/04/26-22/04/26") rather than just one transaction's date.
const formatDateRangeLabel = (minDate, maxDate) => {
  if (!minDate && !maxDate) return "-";
  if (!minDate || !maxDate) return formatShortDate(minDate || maxDate);

  const minLabel = formatShortDate(minDate);
  const maxLabel = formatShortDate(maxDate);
  return minLabel === maxLabel ? minLabel : `${minLabel}-${maxLabel}`;
};

const getCategoryName = (row) =>
  row.categoryInfo?.name || row.category || "Uncategorized";

const getTransactionDescription = (row) => row.remarks || row.note || "-";

// Each Credit/Debit row here is one category, aggregated across every
// transaction in the period, with the date range it spans — the summary
// view that comes before the full per-transaction detail below it.
// Category key used to line a row up with its opening balance from the API
// (which keys strictly by categoryId).
const getCategoryKey = (row) =>
  row.categoryId !== undefined && row.categoryId !== null
    ? String(row.categoryId)
    : row.categoryInfo?.name ?? row.category ?? "uncategorized";

const getOpeningAmount = (openingByCategory, key, tone) =>
  Number(openingByCategory?.[key]?.[tone] || 0);

const groupTransactionsByCategory = (
  transactions = [],
  openingByCategory = {},
) => {
  const groupsByStatus = { credit: new Map(), debit: new Map() };

  transactions.forEach((row) => {
    const status =
      String(row.paymentStatus || "").toLowerCase() === "cashin"
        ? "credit"
        : "debit";
    const key = getCategoryKey(row);
    const groups = groupsByStatus[status];
    const parsedDate = row.date ? new Date(row.date) : null;
    const validDate =
      parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        description: getCategoryName(row),
        amount: 0,
        minDate: validDate,
        maxDate: validDate,
      });
    }

    const group = groups.get(key);
    group.amount += Number(row.amount || 0);
    if (validDate) {
      if (!group.minDate || validDate < group.minDate)
        group.minDate = validDate;
      if (!group.maxDate || validDate > group.maxDate)
        group.maxDate = validDate;
    }
  });

  const toSortedRows = (groups, tone) =>
    Array.from(groups.values())
      .map((group) => {
        const opening = getOpeningAmount(openingByCategory, group.key, tone);
        return {
          date: formatDateRangeLabel(group.minDate, group.maxDate),
          description: group.description,
          opening,
          amount: group.amount,
          ending: opening + group.amount,
          // ব্যালেন্স পার্থক্য = (সমাপনী ব্যালেন্স column) − (শুরু ব্যালেন্স column)
          balanceDiff: group.amount - opening,
          tone,
          sortDate: group.minDate ? group.minDate.getTime() : 0,
        };
      })
      .sort((a, b) => a.sortDate - b.sortDate);

  return {
    credit: toSortedRows(groupsByStatus.credit, "credit"),
    debit: toSortedRows(groupsByStatus.debit, "debit"),
  };
};

// One row per real transaction (no aggregation) — Category is its own
// column, Description comes from the transaction's note/remarks — split
// into Credit and Debit lists and sorted chronologically.
const getFlatTransactionRows = (transactions = [], openingByCategory = {}) => {
  const credit = [];
  const debit = [];

  transactions.forEach((row) => {
    const parsedDate = row.date ? new Date(row.date) : null;
    const sortDate =
      parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate.getTime()
        : 0;

    const isCredit = String(row.paymentStatus || "").toLowerCase() === "cashin";
    const entry = {
      date: formatRowDate(row.date),
      category: getCategoryName(row),
      categoryKey: getCategoryKey(row),
      description: getTransactionDescription(row),
      amount: Number(row.amount || 0),
      tone: isCredit ? "credit" : "debit",
      sortDate,
    };

    if (isCredit) {
      credit.push(entry);
    } else {
      debit.push(entry);
    }
  });

  // Group same-category rows together (all Loan rows, then all Steadfast
  // Courier rows, etc.) instead of interleaving by date; sort by date within
  // each category so the grouping still reads chronologically.
  const byCategoryThenDate = (a, b) => {
    const categoryCompare = a.category.localeCompare(b.category);
    return categoryCompare !== 0 ? categoryCompare : a.sortDate - b.sortDate;
  };

  // Running balance per category, seeded from that category's opening balance.
  const withRunningBalance = (rows, tone) => {
    const running = {};
    return rows.map((row) => {
      if (!(row.categoryKey in running)) {
        running[row.categoryKey] = getOpeningAmount(
          openingByCategory,
          row.categoryKey,
          tone,
        );
      }
      const opening = running[row.categoryKey];
      const ending = opening + row.amount;
      running[row.categoryKey] = ending;
      return { ...row, opening, ending, balanceDiff: row.amount - opening };
    });
  };

  return {
    credit: withRunningBalance(credit.sort(byCategoryThenDate), "credit"),
    debit: withRunningBalance(debit.sort(byCategoryThenDate), "debit"),
  };
};

// Column layout for the category-summary tables (matches the original
// letterhead design — no separate category column, since the category
// name *is* what fills that column for an aggregated row).
// The period movement (formerly labelled ব্যালেন্স পার্থক্য) is shown as
// সমাপনী ব্যালেন্স right after শুরু ব্যালেন্স; the actual opening+movement
// ending balance is no longer displayed as a separate column. ব্যালেন্স
// পার্থক্য (amount − opening, i.e. সমাপনী − শুরু of the two shown columns)
// follows as its own column.
const AGGREGATE_COLUMNS = [
  { key: "sl", label: "ক্র. নং", widthPct: 7 },
  { key: "date", label: "তারিখ", widthPct: 15 },
  { key: "description", label: "ক্যাটেগরি", widthPct: 28 },
  { key: "opening", label: "শুরু ব্যালেন্স", widthPct: 17, isAmount: true },
  { key: "amount", label: "সমাপনী ব্যালেন্স", widthPct: 17, isAmount: true },
  { key: "balanceDiff", label: "ব্যালেন্স পার্থক্য", widthPct: 16, isAmount: true },
];

// Same layout as AGGREGATE_COLUMNS, but for the Total Credit & Debit
// roll-up, whose rows are descriptive summary lines rather than categories.
const TOTAL_SUMMARY_COLUMNS = [
  { key: "sl", label: "ক্র. নং", widthPct: 7 },
  { key: "date", label: "তারিখ", widthPct: 15 },
  { key: "description", label: "বিবরণ", widthPct: 28 },
  { key: "opening", label: "শুরু ব্যালেন্স", widthPct: 17, isAmount: true },
  { key: "amount", label: "সমাপনী ব্যালেন্স", widthPct: 17, isAmount: true },
  { key: "balanceDiff", label: "ব্যালেন্স পার্থক্য", widthPct: 16, isAmount: true },
];

// Column layout for the per-transaction detail tables — one row per real
// transaction, with its own Category column and note-based description.
const DETAIL_COLUMNS = [
  { key: "sl", label: "ক্র. নং", widthPct: 6 },
  { key: "date", label: "তারিখ", widthPct: 11 },
  { key: "category", label: "ক্যাটেগরি", widthPct: 13 },
  { key: "description", label: "বিবরণ", widthPct: 22 },
  { key: "opening", label: "শুরু ব্যালেন্স", widthPct: 16, isAmount: true },
  { key: "amount", label: "সমাপনী ব্যালেন্স", widthPct: 16, isAmount: true },
  { key: "balanceDiff", label: "ব্যালেন্স পার্থক্য", widthPct: 16, isAmount: true },
];

// Each inventory stock pool (Stock Product / Damage Stock / Repairing Stock)
// is rendered as its own table with an opening/closing/difference stock ledger:
// # | product name | শুরু স্টক | সমাপনী স্টক | স্টক পার্থক্য | purchase price |
// closing purchase cost.
const INVENTORY_STOCK_COLUMNS = [
  { key: "sl", label: "#", widthPct: 5 },
  { key: "productsName", label: "প্রোডাক্টস নাম", widthPct: 27 },
  { key: "openingStock", label: "শুরু স্টক", widthPct: 12, isQuantity: true },
  { key: "closingStock", label: "সমাপনী স্টক", widthPct: 12, isQuantity: true },
  { key: "stockDiff", label: "স্টক পার্থক্য", widthPct: 12, isQuantity: true },
  {
    key: "purchasePrice",
    label: "পারচেস প্রাইস",
    widthPct: 14,
    isAmount: true,
  },
  {
    key: "totalPurchaseCost",
    label: "ক্লোজিং পারচেস কস্ট",
    widthPct: 18,
    isAmount: true,
  },
];

const INVENTORY_STOCK_POOLS = [
  { title: "স্টক প্রোডাক্ট", stockType: "stockProduct" },
  { title: "ড্যামেজ স্টক", stockType: "damageStock" },
  { title: "রিপেয়ারিং স্টক", stockType: "repairingStock" },
];

// Item / Factory / Packaging-Item / Packaging-Factory stock pools each render
// as their own table with the same opening/closing/difference stock ledger as
// the inventory-stock pools: # | নাম | শুরু স্টক | সমাপনী স্টক | স্টক পার্থক্য |
// পারচেস প্রাইস | ক্লোজিং পারচেস কস্ট.
const SPLIT_STOCK_COLUMNS = [
  { key: "sl", label: "#", widthPct: 5 },
  { key: "name", label: "নাম", widthPct: 27 },
  { key: "openingStock", label: "শুরু স্টক", widthPct: 12, isQuantity: true },
  { key: "closingStock", label: "সমাপনী স্টক", widthPct: 12, isQuantity: true },
  { key: "stockDiff", label: "স্টক পার্থক্য", widthPct: 12, isQuantity: true },
  {
    key: "purchasePrice",
    label: "পারচেস প্রাইস",
    widthPct: 14,
    isAmount: true,
  },
  {
    key: "totalPurchaseCost",
    label: "ক্লোজিং পারচেস কস্ট",
    widthPct: 18,
    isAmount: true,
  },
];

const ITEM_FACTORY_STOCK_POOLS = [
  { title: "আইটেম স্টক", prefix: "itemStock" },
  { title: "ফ্যাক্টরি স্টক", prefix: "factoryStock" },
];

const PACKAGING_STOCK_POOLS = [
  { title: "প্যাকেজিং আইটেম স্টক", prefix: "packagingItemStock" },
  { title: "প্যাকেজিং ফ্যাক্টরি স্টক", prefix: "packagingFactoryStock" },
];

// Courier Product Stock is summarised one row per status over the filter's
// date range: তারিখ shows the range, শুরু স্টক = that status's total before the
// range, সমাপনী স্টক = opening + range total, স্টক পার্থক্য = the range total,
// and পরিমান (far right) = the same range total.
const COURIER_PRODUCT_STOCK_COLUMNS = [
  { key: "sl", label: "#", widthPct: 5 },
  { key: "date", label: "তারিখ", widthPct: 21 },
  { key: "status", label: "স্ট্যাটাস", widthPct: 18 },
  { key: "openingStock", label: "শুরু স্টক", widthPct: 14, isAmount: true },
  { key: "closingStock", label: "সমাপনী স্টক", widthPct: 14, isAmount: true },
  { key: "stockDiff", label: "স্টক পার্থক্য", widthPct: 14, isAmount: true },
  { key: "amount", label: "পরিমান", widthPct: 14, isAmount: true },
];

// The snapshot receivable / due sections (Sales Due, Salary Advance, the four
// "কোম্পানি পাবে" receivables, and the three "company owes" dues). শুরু
// ব্যালেন্স / সমাপনী ব্যালেন্স are the party's balance scoped to the date
// filter's start / end; ব্যালেন্স পার্থক্য is their difference. The far-right
// amount column holds the party's current (unfiltered) total — labelled
// "এডভান্স" for the advance-natured sections, "বাকি" for the due ones.
const buildReceivableLedgerColumns = (nameLabel, amountLabel) => [
  { key: "sl", label: "#", widthPct: 5 },
  { key: "name", label: nameLabel, widthPct: 25 },
  {
    key: "openingBalance",
    label: "শুরু ব্যালেন্স",
    widthPct: 18,
    isAmount: true,
  },
  {
    key: "endingBalance",
    label: "সমাপনী ব্যালেন্স",
    widthPct: 18,
    isAmount: true,
  },
  {
    key: "balanceDiff",
    label: "ব্যালেন্স পার্থক্য",
    widthPct: 18,
    isAmount: true,
  },
  { key: "amount", label: amountLabel, widthPct: 16, isAmount: true },
];

const SALES_DUE_COLUMNS = buildReceivableLedgerColumns("নাম", "বাকি");

const SALARY_ADVANCE_COLUMNS = buildReceivableLedgerColumns("নাম", "এডভান্স");

const PENDING_PAYROLL_SALARY_COLUMNS = [
  { key: "sl", label: "#", widthPct: 8 },
  { key: "name", label: "কর্মচারী", widthPct: 62 },
  { key: "amount", label: "বেতন", widthPct: 30, isAmount: true },
];

const MANUFACTURER_DUE_COLUMNS =
  buildReceivableLedgerColumns("ম্যানুফ্যাকচার", "বাকি");

const SUPPLIER_DUE_COLUMNS = buildReceivableLedgerColumns("সাপ্লাইয়ার", "বাকি");

const SUPPLIER_RECEIVABLE_COLUMNS =
  buildReceivableLedgerColumns("সাপ্লাইয়ার", "এডভান্স");

const MANUFACTURER_RECEIVABLE_COLUMNS =
  buildReceivableLedgerColumns("ম্যানুফ্যাকচার", "এডভান্স");

const PACKAGING_MANUFACTURER_RECEIVABLE_COLUMNS =
  buildReceivableLedgerColumns("প্যাকেজিং ম্যানুফ্যাকচার", "এডভান্স");

const LENDER_RECEIVABLE_COLUMNS =
  buildReceivableLedgerColumns("লেন্ডার", "এডভান্স");

const LENDER_PAYABLE_COLUMNS = buildReceivableLedgerColumns("লেন্ডার", "বাকি");

const DIRECTOR_INVESTMENT_COLUMNS = [
  { key: "sl", label: "#", widthPct: 8 },
  { key: "name", label: "ডিরেক্টর", widthPct: 62 },
  { key: "amount", label: "ইনভেস্ট", widthPct: 30, isAmount: true },
];

const GRAND_TOTAL_COLUMNS = [
  { key: "sl", label: "#", widthPct: 10 },
  { key: "description", label: "বিবরণ", widthPct: 60 },
  { key: "amount", label: "পরিমান", widthPct: 30, isAmount: true },
];

const PAYABLE_TOTAL_COLUMNS = GRAND_TOTAL_COLUMNS;

// Net cash per payment mode (Cash / Bank / …) over the date filter — sits
// between Profit/Loss and the Assets sections. বর্তমান ব্যালেন্স (far right)
// is the live figure, ignoring the date filter.
const PAYMENT_MODE_COLUMNS = [
  { key: "sl", label: "#", widthPct: 5 },
  { key: "mode", label: "পেমেন্ট মোড", widthPct: 25 },
  { key: "opening", label: "শুরু ব্যালেন্স", widthPct: 17, isAmount: true },
  { key: "ending", label: "সমাপনী ব্যালেন্স", widthPct: 17, isAmount: true },
  { key: "diff", label: "ব্যালেন্স পার্থক্য", widthPct: 17, isAmount: true },
  { key: "current", label: "বর্তমান ব্যালেন্স", widthPct: 19, isAmount: true },
];

// Assets sections at the bottom of the statement. Purchase / Sale / Damage
// carry a date; Stock is a live snapshot.
const ASSETS_DATED_COLUMNS = [
  { key: "sl", label: "ক্র. নং", widthPct: 8 },
  { key: "date", label: "তারিখ", widthPct: 15 },
  { key: "name", label: "নাম", widthPct: 33 },
  { key: "quantity", label: "পরিমাণ", widthPct: 12, isQuantity: true },
  { key: "price", label: "দর", widthPct: 14, isAmount: true },
  { key: "amount", label: "মোট", widthPct: 18, isAmount: true },
];

const ASSETS_STOCK_COLUMNS = [
  { key: "sl", label: "ক্র. নং", widthPct: 8 },
  { key: "name", label: "নাম", widthPct: 46 },
  { key: "quantity", label: "পরিমাণ", widthPct: 14, isQuantity: true },
  { key: "price", label: "দর", widthPct: 14, isAmount: true },
  { key: "amount", label: "মোট", widthPct: 18, isAmount: true },
];

const normalizeAssetGroupRows = (group, { withDate }) => {
  const rows = group?.data || [];
  const normalized = rows.map((row) => ({
    date: withDate ? formatRowDate(row.date) : "-",
    name: row.name || "-",
    quantity: Number(row.quantity || 0),
    price: Number(row.price || 0),
    amount: Number(row.total || 0),
  }));

  return [
    ...normalized,
    {
      isTotal: true,
      date: "",
      name: "মোট",
      quantity: Number(group?.totalQuantity || 0),
      price: null,
      amount: Number(group?.total || 0),
    },
  ];
};

const getPayableTotalAmount = ({
  pendingPayrollSalary,
  manufacturerDue,
  supplierDue,
  lenderPayable,
}) =>
  Number(pendingPayrollSalary?.meta?.totalSalary || 0) +
  Number(manufacturerDue?.meta?.totalDue || 0) +
  Number(supplierDue?.meta?.totalDue || 0) +
  Number(lenderPayable?.meta?.totalDue || 0);

const getDirectorInvestmentTotalAmount = (directorInvestment) =>
  Number(directorInvestment?.meta?.totalInvestAmount || 0);

const getPayableAndDirectorInvestmentTotalAmount = ({
  pendingPayrollSalary,
  manufacturerDue,
  supplierDue,
  lenderPayable,
  directorInvestment,
}) =>
  getPayableTotalAmount({
    pendingPayrollSalary,
    manufacturerDue,
    supplierDue,
    lenderPayable,
  }) + getDirectorInvestmentTotalAmount(directorInvestment);

// Total closing stock value (ক্লোজিং পারচেস কস্ট) across every stock section
// plus the courier product stock — folded into the grand total alongside cash
// and receivables.
const getStockValueTotal = ({
  inventoryStockReport,
  itemFactoryStock,
  packagingStock,
  courierProductStock,
}) =>
  Number(inventoryStockReport?.meta?.totalPurchaseCost || 0) +
  Number(itemFactoryStock?.meta?.totalPurchaseCost || 0) +
  Number(packagingStock?.meta?.totalPurchaseCost || 0) +
  Number(courierProductStock?.meta?.totalEndingAmount || 0);

const getGrandTotalAmount = ({
  totalCashBalance,
  salesDue,
  salaryAdvance,
  supplierReceivable,
  manufacturerReceivable,
  packagingManufacturerReceivable,
  lenderReceivable,
  inventoryStockReport,
  itemFactoryStock,
  packagingStock,
  courierProductStock,
}) =>
  Number(totalCashBalance || 0) +
  Number(salesDue?.meta?.totalDue || 0) +
  Number(salaryAdvance?.meta?.totalDue || 0) +
  Number(supplierReceivable?.meta?.totalAdvance || 0) +
  Number(manufacturerReceivable?.meta?.totalAdvance || 0) +
  Number(packagingManufacturerReceivable?.meta?.totalAdvance || 0) +
  Number(lenderReceivable?.meta?.totalAdvance || 0) +
  getStockValueTotal({
    inventoryStockReport,
    itemFactoryStock,
    packagingStock,
    courierProductStock,
  });

const FRAGMENT_STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  .frag {
    width: ${CONTENT_WIDTH_PX}px;
    color: #111827;
    font-family: "PdfNotoSansBengali", Arial, sans-serif;
    font-size: 13px;
    line-height: 1.5;
  }

  .book-stmt-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 14px;
    border-bottom: 3px solid #14294f;
  }

  .book-stmt-brand {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .book-stmt-logo-box {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #eef2ff;
    border: 2px solid #c9a227;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex: 0 0 auto;
  }

  .book-stmt-logo-box img {
    max-width: 56px;
    max-height: 56px;
    object-fit: contain;
  }

  .book-stmt-company-name {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: #14294f;
  }

  .book-stmt-book-name {
    margin-top: 2px;
    font-size: 12px;
    font-weight: 700;
    color: #334155;
  }

  .book-stmt-address {
    margin-top: 3px;
    font-size: 11px;
    color: #64748b;
    max-width: 320px;
  }

  .book-stmt-contact {
    text-align: right;
    font-size: 11px;
    color: #334155;
  }

  .contact-title {
    font-weight: 700;
    color: #14294f;
    margin-bottom: 3px;
  }

  .contact-line {
    margin-bottom: 3px;
  }

  .book-stmt-title-bar {
    background: #eef1f6;
    border: 1px solid #cbd5e1;
    padding: 8px 16px;
    text-align: center;
  }

  .book-stmt-title {
    font-size: 14px;
    font-weight: 700;
    color: #14294f;
  }

  .ledger-heading {
    background: #14294f;
    color: #ffffff;
    font-weight: 700;
    font-size: 12px;
    padding: 6px 12px;
  }

  .ledger-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .ledger-table th {
    background: #eef1f6;
    color: #14294f;
    font-size: 11px;
    font-weight: 700;
    padding: 6px 8px;
    text-align: left;
    border: 1px solid #cbd5e1;
  }

  .ledger-table td {
    box-sizing: border-box;
    border: 1px solid #cbd5e1;
    padding: 6px 8px;
    vertical-align: top;
    overflow-wrap: anywhere;
    font-size: 12px;
  }

  .ledger-table .amount { text-align: right; }
  .ledger-table .quantity { text-align: right; }
  .ledger-table .amount-credit { color: #15803d; }
  .ledger-table .amount-debit { color: #dc2626; }
  .ledger-table .empty { text-align: center; color: #94a3b8; }
  .ledger-table .summary-row td {
    font-weight: 700;
    background: #e6f4ea;
    color: #1f6b3a;
  }

  .ledger-table tfoot td {
    font-weight: 700;
    background: #e6f4ea;
    color: #1f6b3a;
  }

  .ledger-table tfoot tr.loss td {
    background: #fdecec;
    color: #b91c1c;
  }
`;

const buildCell = (tag, column, content, tone) => {
  const classes = [];
  if (column.isAmount) {
    classes.push("amount");
    if (tone === "credit") classes.push("amount-credit");
    if (tone === "debit") classes.push("amount-debit");
  }
  if (column.isQuantity) classes.push("quantity");
  const cellClass = classes.length ? ` class="${classes.join(" ")}"` : "";
  return `<${tag} style="width:${column.widthPct}%;"${cellClass}>${content}</${tag}>`;
};

const buildTableRows = (rows, startIndex, columns) =>
  rows
    .map((row, index) => {
      const cells = columns
        .map((column) => {
          if (column.key === "sl")
            return buildCell(
              "td",
              column,
              row.isTotal ? "" : startIndex + index,
            );
          if (column.isAmount)
            return buildCell(
              "td",
              column,
              formatAmount(row[column.key]),
              row.tone,
            );
          if (column.isQuantity)
            return buildCell("td", column, formatQuantity(row[column.key]));
          return buildCell("td", column, escapeHtml(row[column.key] ?? "-"));
        })
        .join("");
      return `<tr${row.isTotal ? ' class="summary-row"' : ""}>${cells}</tr>`;
    })
    .join("");

const buildTableHead = (columns) => `
  <thead>
    <tr>
      ${columns.map((column) => buildCell("th", column, escapeHtml(column.label))).join("")}
    </tr>
  </thead>
`;

// One ledger section's navy title bar, on its own so it can be measured and
// placed independently of the rows that follow it.
const buildLedgerHeadingFragment = (title) => `
  <div class="frag">
    <div class="ledger-heading">${escapeHtml(title)}</div>
  </div>
`;

// The table's total row. Default: one label cell spanning all-but-last column
// plus the single `total`. When `footerTotals` (a map of column key -> value)
// is given, every amount column gets its own total cell instead.
const buildLedgerFooter = (columns, totalLabel, total, footerTotals, totalTone) => {
  const lossClass = totalTone === "loss" ? ' class="loss"' : "";

  if (!footerTotals) {
    return `<tfoot>
      <tr${lossClass}>
        <td colspan="${columns.length - 1}">${escapeHtml(totalLabel)}</td>
        <td class="amount">${formatAmount(total)}</td>
      </tr>
    </tfoot>`;
  }

  const amountColumns = columns.filter((column) => column.isAmount);
  const labelSpan = columns.length - amountColumns.length;
  const amountCells = amountColumns
    .map((column) => {
      const value = footerTotals[column.key];
      return `<td class="amount">${
        value === undefined || value === null ? "" : formatAmount(value)
      }</td>`;
    })
    .join("");

  return `<tfoot>
    <tr${lossClass}>
      <td colspan="${labelSpan}">${escapeHtml(totalLabel)}</td>
      ${amountCells}
    </tr>
  </tfoot>`;
};

// A page-sized "slice" of a ledger table: the column header row (repeated on
// every continuation page) plus a subset of the rows, and the total row only
// on the final slice — so a row is never split across pages, and the header
// re-appears whenever a section continues onto a new page. `columns` picks
// between the category-summary layout and the per-transaction detail layout.
const buildLedgerTableChunkFragment = ({
  rows,
  startIndex,
  includeFooter,
  totalLabel,
  total,
  footerTotals,
  columns,
  totalTone,
}) => `
  <div class="frag">
    <table class="ledger-table">
      ${buildTableHead(columns)}
      <tbody>
        ${
          rows.length
            ? buildTableRows(rows, startIndex, columns)
            : `<tr><td colspan="${columns.length}" class="empty">কোন এন্ট্রি নেই</td></tr>`
        }
      </tbody>
      ${
        includeFooter && totalLabel
          ? buildLedgerFooter(columns, totalLabel, total, footerTotals, totalTone)
          : ""
      }
    </table>
  </div>
`;

// One inventory stock pool (Stock Product / Damage Stock / Repairing Stock) as
// its own set of rows: name + opening stock + closing stock + their difference
// (period movement) + purchase price + closing purchase cost, plus a trailing
// "মোট" summary row. Products with no opening/closing stock and no cost in this
// pool are dropped.
const normalizeInventoryStockPoolRows = (inventoryStockReport, { stockType }) => {
  if (!inventoryStockReport) return [];

  const rows = inventoryStockReport.data || [];
  if (!rows.length) return [];

  const openingKey = `${stockType}Opening`;
  const closingKey = `${stockType}Closing`;
  const priceKey = `${stockType}PurchasePrice`;
  const costKey = `${stockType}ClosingPurchaseCost`;

  const normalizedRows = rows
    .map((row) => {
      const openingStock = Number(row[openingKey] || 0);
      const closingStock = Number(row[closingKey] || 0);
      const purchasePrice = Number(row[priceKey] || 0);
      const totalPurchaseCost =
        row[costKey] != null
          ? Number(row[costKey] || 0)
          : closingStock * purchasePrice;

      return {
        productsName: row.productsName || "-",
        openingStock,
        closingStock,
        stockDiff: closingStock - openingStock,
        purchasePrice,
        totalPurchaseCost,
      };
    })
    .filter(
      (row) =>
        row.openingStock !== 0 ||
        row.closingStock !== 0 ||
        row.totalPurchaseCost > 0,
    );

  if (!normalizedRows.length) return [];

  const total = normalizedRows.reduce(
    (acc, row) => ({
      openingStock: acc.openingStock + row.openingStock,
      closingStock: acc.closingStock + row.closingStock,
      totalPurchaseCost: acc.totalPurchaseCost + row.totalPurchaseCost,
    }),
    { openingStock: 0, closingStock: 0, totalPurchaseCost: 0 },
  );

  return [
    ...normalizedRows,
    {
      isTotal: true,
      productsName: "মোট",
      openingStock: total.openingStock,
      closingStock: total.closingStock,
      stockDiff: total.closingStock - total.openingStock,
      purchasePrice: 0,
      totalPurchaseCost: total.totalPurchaseCost,
    },
  ];
};

// One Item/Factory/Packaging stock pool as its own set of rows: name + opening
// stock + closing stock + their difference + purchase price + closing purchase
// cost, plus a trailing "মোট" summary row. Reads `${prefix}Opening` /
// `${prefix}Closing` off each report row (see computeStockMovementClosingReport).
const normalizeSplitStockPoolRows = (report, { prefix }) => {
  if (!report) return [];

  const rows = report.data || [];
  if (!rows.length) return [];

  const openingKey = `${prefix}Opening`;
  const closingKey = `${prefix}Closing`;

  const normalizedRows = rows
    .map((row) => {
      const openingStock = Number(row[openingKey] || 0);
      const closingStock = Number(row[closingKey] || 0);
      const purchasePrice = Number(row.purchasePrice || 0);

      return {
        name: row.name || "-",
        openingStock,
        closingStock,
        stockDiff: closingStock - openingStock,
        purchasePrice,
        totalPurchaseCost: closingStock * purchasePrice,
      };
    })
    .filter(
      (row) =>
        row.openingStock !== 0 ||
        row.closingStock !== 0 ||
        row.totalPurchaseCost > 0,
    );

  if (!normalizedRows.length) return [];

  const total = normalizedRows.reduce(
    (acc, row) => ({
      openingStock: acc.openingStock + row.openingStock,
      closingStock: acc.closingStock + row.closingStock,
      totalPurchaseCost: acc.totalPurchaseCost + row.totalPurchaseCost,
    }),
    { openingStock: 0, closingStock: 0, totalPurchaseCost: 0 },
  );

  return [
    ...normalizedRows,
    {
      isTotal: true,
      name: "মোট",
      openingStock: total.openingStock,
      closingStock: total.closingStock,
      stockDiff: total.closingStock - total.openingStock,
      purchasePrice: 0,
      totalPurchaseCost: total.totalPurchaseCost,
    },
  ];
};

// Courier Product Stock: one row per status over the filter's date range.
// Backend (`getCourierProductStockReport`) groups by status and returns
// `{ status, openingAmount (before the range), periodAmount (inside it),
// endingAmount }`. পরিমান = periodAmount, শুরু স্টক = openingAmount,
// সমাপনী স্টক = endingAmount, স্টক পার্থক্য = periodAmount. তারিখ shows the
// range label. "মোট" row sums each column.
const normalizeCourierProductStockRows = (courierProductStock, periodLabel) => {
  if (!courierProductStock) return [];

  const rows = courierProductStock.data || [];
  if (!rows.length) return [];

  const meta = courierProductStock.meta || {};
  const fromDate =
    meta.from && new Date(meta.from).getFullYear() >= 2000
      ? new Date(meta.from)
      : null;
  const toDate = meta.to ? new Date(meta.to) : null;
  const rangeLabel =
    periodLabel ||
    (fromDate || toDate ? formatDateRangeLabel(fromDate, toDate) : "-");

  const normalizedRows = rows.map((row) => {
    const openingStock = Number(row.openingAmount || 0);
    const periodAmount = Number(row.periodAmount || 0);
    const closingStock =
      row.endingAmount != null
        ? Number(row.endingAmount)
        : openingStock + periodAmount;
    return {
      date: rangeLabel,
      status: row.status || "-",
      amount: periodAmount,
      openingStock,
      closingStock,
      stockDiff: periodAmount,
    };
  });

  const sum = (key) => normalizedRows.reduce((acc, row) => acc + row[key], 0);

  return [
    ...normalizedRows,
    {
      isTotal: true,
      date: "",
      status: "মোট",
      amount: sum("amount"),
      openingStock: sum("openingStock"),
      closingStock: sum("closingStock"),
      stockDiff: sum("amount"),
    },
  ];
};

// Builds the ledger rows for the snapshot receivable / due sections. Each input
// row is `{ name, amount (current unfiltered total → বাকি/পরিমান column),
// openingBalance (balance as of the filter start), endingBalance (as of the
// filter end) }`. ব্যালেন্স পার্থক্য = ending − opening. A "মোট" row summing
// every column is appended.
const toReceivableLedgerRows = (ledgerInputRows) => {
  const ledgerRows = ledgerInputRows.map((row) => ({
    name: row.name || "-",
    amount: Number(row.amount || 0),
    openingBalance: Number(row.openingBalance || 0),
    endingBalance: Number(row.endingBalance || 0),
    balanceDiff: Number(row.endingBalance || 0) - Number(row.openingBalance || 0),
  }));

  const sum = (key) => ledgerRows.reduce((acc, row) => acc + row[key], 0);

  return [
    ...ledgerRows,
    {
      isTotal: true,
      name: "মোট",
      amount: sum("amount"),
      openingBalance: sum("openingBalance"),
      endingBalance: sum("endingBalance"),
      balanceDiff: sum("endingBalance") - sum("openingBalance"),
    },
  ];
};

// Sales Due and Salary Advance: বাকি = the entry's current outstanding (never
// date-filtered); শুরু/সমাপনী ব্যালেন্স come from the backend scoped to the
// filter range.
const normalizeSalesDueRows = (salesDue) => {
  if (!salesDue) return [];

  const rows = salesDue.data || [];
  if (!rows.length) return [];

  return toReceivableLedgerRows(
    rows.map((row) => ({
      name: row.name,
      amount: row.due,
      openingBalance: row.openingBalance,
      endingBalance: row.endingBalance,
    })),
  );
};

const normalizeSalaryAdvanceRows = (salaryAdvance) => {
  if (!salaryAdvance) return [];

  const rows = salaryAdvance.data || [];
  if (!rows.length) return [];

  return toReceivableLedgerRows(
    rows.map((row) => ({
      name: row.name,
      amount: row.due,
      openingBalance: row.openingBalance,
      endingBalance: row.endingBalance,
    })),
  );
};

const normalizePendingPayrollSalaryRows = (pendingPayrollSalary) => {
  if (!pendingPayrollSalary) return [];

  const rows = pendingPayrollSalary.data || [];
  if (!rows.length) return [];

  const normalizedRows = rows.map((row) => ({
    name: row.name || "-",
    amount: Number(row.salary || 0),
  }));

  const total = normalizedRows.reduce((sum, row) => sum + row.amount, 0);

  return [
    ...normalizedRows,
    {
      isTotal: true,
      name: "মোট",
      amount: total,
    },
  ];
};

// Supplier Due / Manufacturer Due / Lender Payable — the "company owes"
// mirror of the receivable sections. বাকি = the party's current unfiltered
// due; শুরু/সমাপনী ব্যালেন্স come from the backend scoped to the date filter.
const normalizeDueRows = (report) => {
  if (!report) return [];

  const rows = report.data || [];
  if (!rows.length) return [];

  return toReceivableLedgerRows(
    rows.map((row) => ({
      name: row.name,
      amount: row.due,
      openingBalance: row.openingBalance,
      endingBalance: row.endingBalance,
    })),
  );
};

const normalizeLenderPayableRows = (lenderPayable) =>
  normalizeDueRows(lenderPayable);

const normalizeDirectorInvestmentRows = (directorInvestment) => {
  if (!directorInvestment) return [];

  const rows = directorInvestment.data || [];
  if (!rows.length) return [];

  const normalizedRows = rows.map((row) => ({
    name: row.name || "-",
    amount: Number(row.investAmount || 0),
  }));

  const total = normalizedRows.reduce((sum, row) => sum + row.amount, 0);

  return [
    ...normalizedRows,
    {
      isTotal: true,
      name: "মোট",
      amount: total,
    },
  ];
};

// Payment-mode net cash: backend rows are `{ mode, opening, ending, diff,
// current }` (diff = the period movement; current = live, filter-independent).
// A "মোট" row summing each column is appended.
const normalizePaymentModeRows = (paymentModeSummary) => {
  if (!Array.isArray(paymentModeSummary) || !paymentModeSummary.length) return [];

  const rows = paymentModeSummary.map((row) => {
    const opening = Number(row.opening || 0);
    const ending = Number(row.ending || 0);
    return {
      mode: row.mode || "-",
      opening,
      ending,
      diff: row.diff != null ? Number(row.diff) : ending - opening,
      current: Number(row.current || 0),
    };
  });

  const sum = (key) => rows.reduce((acc, row) => acc + row[key], 0);

  return [
    ...rows,
    {
      isTotal: true,
      mode: "মোট",
      opening: sum("opening"),
      ending: sum("ending"),
      diff: sum("diff"),
      current: sum("current"),
    },
  ];
};

// Suppliers the company has overpaid (as of the report's `to` date) — money
// the company will receive back from that supplier, either as goods or a
// refund. Same plain detail-row shape as Courier Product Stock: one row per
// supplier plus a "মোট" total row.
const normalizeSupplierReceivableRows = (supplierReceivable) => {
  if (!supplierReceivable) return [];

  const rows = supplierReceivable.data || [];
  if (!rows.length) return [];

  return toReceivableLedgerRows(
    rows.map((row) => ({
      name: row.name,
      amount: row.advance,
      openingBalance: row.openingBalance,
      endingBalance: row.endingBalance,
    })),
  );
};

// Manufacturers the company has overpaid (as of the report's `to` date) —
// money the company will receive back from that manufacturer, either as
// wage work or a refund. Same shape as normalizeSupplierReceivableRows.
const normalizeManufacturerReceivableRows = (manufacturerReceivable) => {
  if (!manufacturerReceivable) return [];

  const rows = manufacturerReceivable.data || [];
  if (!rows.length) return [];

  return toReceivableLedgerRows(
    rows.map((row) => ({
      name: row.name,
      amount: row.advance,
      openingBalance: row.openingBalance,
      endingBalance: row.endingBalance,
    })),
  );
};

// Packaging manufacturers the company has overpaid (as of the report's `to`
// date) — money the company will receive back from that packaging
// manufacturer, either as wage work or a refund. Same shape as
// normalizeManufacturerReceivableRows.
const normalizePackagingManufacturerReceivableRows = (
  packagingManufacturerReceivable,
) => {
  if (!packagingManufacturerReceivable) return [];

  const rows = packagingManufacturerReceivable.data || [];
  if (!rows.length) return [];

  return toReceivableLedgerRows(
    rows.map((row) => ({
      name: row.name,
      amount: row.advance,
      openingBalance: row.openingBalance,
      endingBalance: row.endingBalance,
    })),
  );
};

// Lenders the company has overpaid (as of the report's `to` date) — money
// the company will receive back from that lender, since it repaid more than
// it ever borrowed from them. Same shape as normalizeManufacturerReceivableRows.
const normalizeLenderReceivableRows = (lenderReceivable) => {
  if (!lenderReceivable) return [];

  const rows = lenderReceivable.data || [];
  if (!rows.length) return [];

  return toReceivableLedgerRows(
    rows.map((row) => ({
      name: row.name,
      amount: row.advance,
      openingBalance: row.openingBalance,
      endingBalance: row.endingBalance,
    })),
  );
};

const buildContactLine = (value) =>
  value ? `<div class="contact-line">${escapeHtml(value)}</div>` : "";

const buildHeaderFragment = ({
  companyName,
  companyInfo,
  logoDataUrl,
  bookName,
}) => `
  <div class="frag">
    <div class="book-stmt-header">
      <div class="book-stmt-brand">
        <div class="book-stmt-logo-box">
          ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" />` : ""}
        </div>
        <div>
          <p class="book-stmt-company-name">${escapeHtml(companyName)}</p>
          <div class="book-stmt-book-name">Book: ${escapeHtml(bookName)}</div>
          ${
            companyInfo?.address
              ? `<div class="book-stmt-address">${escapeHtml(companyInfo.address)}</div>`
              : ""
          }
        </div>
      </div>

      <div class="book-stmt-contact">
        <div class="contact-title">Hotline:</div>
        ${buildContactLine(companyInfo?.hotline)}
        ${buildContactLine(companyInfo?.whatsapp)}
        ${buildContactLine(companyInfo?.website)}
        ${buildContactLine(companyInfo?.email)}
      </div>
    </div>
  </div>
`;

const buildTitleBarFragment = (periodLabel) => `
  <div class="frag">
    <div class="book-stmt-title-bar">
      <div class="book-stmt-title">${escapeHtml(periodLabel)}</div>
    </div>
  </div>
`;

const createRenderFrame = () => {
  const iframe = document.createElement("iframe");

  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = `${CONTENT_WIDTH_PX}px`;
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  return iframe;
};

// Renders one fragment (header, title bar, a ledger section, or the
// signature) in isolation and returns it as a single image + its height in
// mm, so the caller can place it as one atomic, unsplittable block.
const renderFragment = async (
  html2canvas,
  fragmentHtml,
  regularFontDataUrl,
  boldFontDataUrl,
) => {
  const html = `
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
      ${FRAGMENT_STYLES}
    </style>
    ${fragmentHtml}
  `;

  const iframe = createRenderFrame();

  try {
    const frameDocument = iframe.contentDocument;
    frameDocument.open();
    frameDocument.write(`<!doctype html><html><body>${html}</body></html>`);
    frameDocument.close();

    await Promise.all([
      frameDocument.fonts?.load('400 13px "PdfNotoSansBengali"', "মাধ্যমে"),
      frameDocument.fonts?.load('700 21px "PdfNotoSansBengali"', "মাধ্যমে"),
      frameDocument.fonts?.ready,
    ]);

    const contentEl = frameDocument.querySelector(".frag");
    const heightPx = Math.ceil(contentEl.getBoundingClientRect().height);
    iframe.style.height = `${heightPx}px`;

    const canvas = await html2canvas(contentEl, {
      backgroundColor: "#ffffff",
      scale: RENDER_SCALE,
      logging: false,
      windowWidth: CONTENT_WIDTH_PX,
      windowHeight: heightPx,
    });

    return {
      dataUrl: canvas.toDataURL("image/png"),
      heightMm: heightPx / MM_TO_PX,
    };
  } finally {
    iframe.remove();
  }
};

const drawPageFrame = (doc) => {
  doc.setDrawColor(20, 41, 79); // navy
  doc.setLineWidth(1.2);
  doc.roundedRect(8, 8, PAGE_W_MM - 16, PAGE_H_MM - 16, 1, 1);
  doc.setDrawColor(201, 162, 39); // gold
  doc.setLineWidth(0.35);
  doc.roundedRect(11, 11, PAGE_W_MM - 22, PAGE_H_MM - 22, 1, 1);
};

// Places one rendered fragment into `doc` at the running cursor position,
// starting a fresh (framed) page first if it wouldn't otherwise fit.
const placeFragment = (doc, cursor, fragment) => {
  const startsNewPage =
    !cursor.pageHasContent ||
    cursor.y + fragment.heightMm > PRINTABLE_BOTTOM_MM;

  if (startsNewPage) {
    if (cursor.pageHasContent) doc.addPage();
    drawPageFrame(doc);
    cursor.y = CONTENT_MARGIN_MM;
    cursor.pageHasContent = false;
  }

  doc.addImage(
    fragment.dataUrl,
    "PNG",
    CONTENT_MARGIN_MM,
    cursor.y,
    CONTENT_WIDTH_MM,
    fragment.heightMm,
    undefined,
    "FAST",
  );

  cursor.y += fragment.heightMm + SECTION_GAP_MM;
  cursor.pageHasContent = true;
};

// Same as placeFragment, but assumes the fit check already happened and the
// image is meant to go at the current cursor position regardless.
const placeFragmentDirect = (doc, cursor, fragment) => {
  doc.addImage(
    fragment.dataUrl,
    "PNG",
    CONTENT_MARGIN_MM,
    cursor.y,
    CONTENT_WIDTH_MM,
    fragment.heightMm,
    undefined,
    "FAST",
  );

  cursor.y += fragment.heightMm + SECTION_GAP_MM;
  cursor.pageHasContent = true;
};

// Places a full ledger section (heading + table + total row), packing as
// many rows per page as actually fit — never cutting a row in half — and
// repeating the column header whenever the table continues onto a new page.
const placeLedgerSection = async (
  doc,
  html2canvas,
  cursor,
  {
    title,
    rows,
    totalLabel,
    total,
    totalTone,
    footerTotals,
    columns,
    regularFontDataUrl,
    boldFontDataUrl,
  },
) => {
  const render = (html) =>
    renderFragment(html2canvas, html, regularFontDataUrl, boldFontDataUrl);

  const headingFragment = await render(buildLedgerHeadingFragment(title));

  if (!rows.length) {
    const emptyChunk = await render(
      buildLedgerTableChunkFragment({
        rows: [],
        startIndex: 1,
        includeFooter: true,
        totalLabel,
        total,
        totalTone,
        footerTotals,
        columns,
      }),
    );

    // Orphan avoidance: keep the heading with its (empty) table together.
    if (
      cursor.pageHasContent &&
      cursor.y + headingFragment.heightMm + emptyChunk.heightMm >
        PRINTABLE_BOTTOM_MM
    ) {
      doc.addPage();
      drawPageFrame(doc);
      cursor.y = CONTENT_MARGIN_MM;
      cursor.pageHasContent = false;
    }

    placeFragment(doc, cursor, headingFragment);
    placeFragment(doc, cursor, emptyChunk);
    return;
  }

  // Estimate an average row height by comparing an empty table (header only)
  // against the full table (header + all rows), then use that to decide how
  // many whole rows fit in the space actually left on the page.
  const headerOnly = await render(
    buildLedgerTableChunkFragment({
      rows: [],
      startIndex: 1,
      includeFooter: false,
      totalLabel,
      total,
      columns,
    }),
  );
  const fullBody = await render(
    buildLedgerTableChunkFragment({
      rows,
      startIndex: 1,
      includeFooter: false,
      totalLabel,
      total,
      columns,
    }),
  );
  const perRowHeightMm = Math.max(
    3,
    (fullBody.heightMm - headerOnly.heightMm) / rows.length,
  );

  // Orphan avoidance: a heading shouldn't sit alone at the bottom of a page
  // with its table starting fresh on the next — require room for the
  // heading plus at least the column header and one data row together.
  const minFollowHeightMm = headerOnly.heightMm + perRowHeightMm;
  if (
    cursor.pageHasContent &&
    cursor.y + headingFragment.heightMm + minFollowHeightMm >
      PRINTABLE_BOTTOM_MM
  ) {
    doc.addPage();
    drawPageFrame(doc);
    cursor.y = CONTENT_MARGIN_MM;
    cursor.pageHasContent = false;
  }

  placeFragment(doc, cursor, headingFragment);

  let startIndex = 0;

  while (startIndex < rows.length) {
    // Proactively move to a fresh page once there's only room for a token
    // row or two — otherwise we'd cram in 1 row here, then immediately have
    // to push the *next* row to a new page anyway, splitting what should be
    // one continuous table into two small ones with a duplicated header.
    if (
      cursor.pageHasContent &&
      PRINTABLE_BOTTOM_MM - cursor.y < headerOnly.heightMm + perRowHeightMm
    ) {
      doc.addPage();
      drawPageFrame(doc);
      cursor.y = CONTENT_MARGIN_MM;
      cursor.pageHasContent = false;
    }

    const remainingMm = PRINTABLE_BOTTOM_MM - cursor.y;
    const availableForRowsMm = remainingMm - headerOnly.heightMm;
    let rowsThatFit = Math.min(
      rows.length - startIndex,
      Math.max(1, Math.floor(availableForRowsMm / perRowHeightMm)),
    );

    // perRowHeightMm is a section-wide average — a locally-dense cluster of
    // wrapped, multi-line rows (e.g. long descriptions) can be taller than
    // that average predicts. Render the candidate chunk, and if it actually
    // overflows the page, shrink it row-by-row and re-render until it truly
    // fits — this check must run even for a chunk that's first on a fresh
    // page, since that's exactly the case a page-relative check alone misses.
    let chunkFragment;
    let isLastChunk;

    let fits;

    for (;;) {
      isLastChunk = startIndex + rowsThatFit >= rows.length;
      chunkFragment = await render(
        buildLedgerTableChunkFragment({
          rows: rows.slice(startIndex, startIndex + rowsThatFit),
          startIndex: startIndex + 1,
          includeFooter: isLastChunk,
          totalLabel,
          total,
          totalTone,
          footerTotals,
          columns,
        }),
      );

      fits = cursor.y + chunkFragment.heightMm <= PRINTABLE_BOTTOM_MM;
      if (fits || rowsThatFit <= 1) break;

      rowsThatFit -= 1;
    }

    // The estimate can also under-fill a page (same averaging issue, other
    // direction) — greedily add more rows while there's still room, so a
    // page is never left with just enough leftover space for a small
    // trailing chunk that would render its own duplicate header below.
    while (fits && startIndex + rowsThatFit < rows.length) {
      const grownRowsThatFit = rowsThatFit + 1;
      const grownIsLastChunk = startIndex + grownRowsThatFit >= rows.length;
      const grownChunkFragment = await render(
        buildLedgerTableChunkFragment({
          rows: rows.slice(startIndex, startIndex + grownRowsThatFit),
          startIndex: startIndex + 1,
          includeFooter: grownIsLastChunk,
          totalLabel,
          total,
          totalTone,
          footerTotals,
          columns,
        }),
      );

      if (cursor.y + grownChunkFragment.heightMm > PRINTABLE_BOTTOM_MM) break;

      rowsThatFit = grownRowsThatFit;
      isLastChunk = grownIsLastChunk;
      chunkFragment = grownChunkFragment;
    }

    // Still doesn't fit even shrunk to 1 row — only possible when we're
    // mid-page (a fresh page always has room for a single row). Start a
    // fresh page and re-size this same chunk against the full page height.
    if (
      cursor.pageHasContent &&
      cursor.y + chunkFragment.heightMm > PRINTABLE_BOTTOM_MM
    ) {
      doc.addPage();
      drawPageFrame(doc);
      cursor.y = CONTENT_MARGIN_MM;
      cursor.pageHasContent = false;
      continue;
    }

    placeFragmentDirect(doc, cursor, chunkFragment);
    startIndex += rowsThatFit;
  }
};

// Renders one book's statement and appends it to `doc`, always starting on
// a fresh page. Each section (header, ledger tables, signature) is composed
// independently so none of them ever get sliced across a page boundary.
const appendBookStatement = async (doc, html2canvas, cursor, book) => {
  const openingByCategory = book.openingByCategory || {};
  const { credit: summaryCredit, debit: summaryDebit } =
    groupTransactionsByCategory(book.transactions, openingByCategory);
  const { credit: detailCredit, debit: detailDebit } = getFlatTransactionRows(
    book.transactions,
    openingByCategory,
  );
  const totalCredit = book.totalCredit ?? 0;
  const totalDebit = book.totalDebit ?? 0;
  const netBalance =
    book.netBalance !== undefined ? book.netBalance : totalCredit - totalDebit;
  const openingCredit = book.openingTotalCredit ?? 0;
  const openingDebit = book.openingTotalDebit ?? 0;
  const openingNetBalance =
    book.openingNetBalance !== undefined
      ? book.openingNetBalance
      : openingCredit - openingDebit;
  const creditFooterTotals = {
    opening: openingCredit,
    amount: totalCredit,
    ending: openingCredit + totalCredit,
    balanceDiff: totalCredit - openingCredit,
  };
  const debitFooterTotals = {
    opening: openingDebit,
    amount: totalDebit,
    ending: openingDebit + totalDebit,
    balanceDiff: totalDebit - openingDebit,
  };

  // A new book always starts on its own fresh page.
  cursor.pageHasContent = false;

  const placeAtomic = async (fragmentHtml) => {
    const fragment = await renderFragment(
      html2canvas,
      fragmentHtml,
      book.regularFontDataUrl,
      book.boldFontDataUrl,
    );
    placeFragment(doc, cursor, fragment);
  };

  const placeSection = (args) =>
    placeLedgerSection(doc, html2canvas, cursor, {
      ...args,
      regularFontDataUrl: book.regularFontDataUrl,
      boldFontDataUrl: book.boldFontDataUrl,
    });

  await placeAtomic(buildHeaderFragment(book));
  await placeAtomic(buildTitleBarFragment(book.periodLabel));

  // Category summary first (one row per category, date range, summed
  // amount) — followed by the Total Credit & Debit roll-up.
  await placeSection({
    title: "ক্রেডিট",
    rows: summaryCredit,
    totalLabel: "মোট ক্রেডিট :",
    total: totalCredit,
    footerTotals: creditFooterTotals,
    columns: AGGREGATE_COLUMNS,
  });

  await placeSection({
    title: "ডেবিট",
    rows: summaryDebit,
    totalLabel: "মোট ডেবিট :",
    total: totalDebit,
    footerTotals: debitFooterTotals,
    columns: AGGREGATE_COLUMNS,
  });

  // Then the full per-transaction detail (Category column, note-based
  // description) for every Credit and Debit transaction.
  await placeSection({
    title: "ক্রেডিট",
    rows: detailCredit,
    totalLabel: "মোট ক্রেডিট :",
    total: totalCredit,
    footerTotals: creditFooterTotals,
    columns: DETAIL_COLUMNS,
  });

  await placeSection({
    title: "ডেবিট",
    rows: detailDebit,
    totalLabel: "মোট ডেবিট :",
    total: totalDebit,
    footerTotals: debitFooterTotals,
    columns: DETAIL_COLUMNS,
  });

  await placeSection({
    title: "মোট ক্রেডিট ও ডেবিট",
    rows: [
      {
        date: book.periodLabel,
        description: `${book.periodLabel} পর্যন্ত মোট ক্রেডিট`,
        opening: openingCredit,
        amount: totalCredit,
        ending: openingCredit + totalCredit,
        balanceDiff: totalCredit - openingCredit,
        tone: "credit",
      },
      {
        date: book.periodLabel,
        description: `${book.periodLabel} পর্যন্ত মোট ডেবিট`,
        opening: openingDebit,
        amount: totalDebit,
        ending: openingDebit + totalDebit,
        balanceDiff: totalDebit - openingDebit,
        tone: "debit",
      },
    ],
    totalLabel: `একাউন্টে মোট ক্যাশ থাকবে (${book.periodLabel} পর্যন্ত)`,
    total: netBalance,
    footerTotals: {
      opening: openingNetBalance,
      amount: netBalance,
      ending: openingNetBalance + netBalance,
      balanceDiff: netBalance - openingNetBalance,
    },
    columns: TOTAL_SUMMARY_COLUMNS,
  });
};

const appendInventoryStockReport = async (
  doc,
  html2canvas,
  cursor,
  { inventoryStockReport, regularFontDataUrl, boldFontDataUrl },
) => {
  for (const pool of INVENTORY_STOCK_POOLS) {
    const rows = normalizeInventoryStockPoolRows(inventoryStockReport, pool);
    if (!rows.length) continue;

    await placeLedgerSection(doc, html2canvas, cursor, {
      title: pool.title,
      rows,
      totalLabel: null,
      total: 0,
      columns: INVENTORY_STOCK_COLUMNS,
      regularFontDataUrl,
      boldFontDataUrl,
    });
  }
};

const appendCourierProductStockSection = async (
  doc,
  html2canvas,
  cursor,
  { courierProductStock, periodLabel, regularFontDataUrl, boldFontDataUrl },
) => {
  const rows = normalizeCourierProductStockRows(courierProductStock, periodLabel);
  if (!rows.length) return;

  await placeLedgerSection(doc, html2canvas, cursor, {
    title: "কুরিয়ার প্রোডাক্ট স্টক",
    rows,
    totalLabel: null,
    total: 0,
    columns: COURIER_PRODUCT_STOCK_COLUMNS,
    regularFontDataUrl,
    boldFontDataUrl,
  });
};

const appendSalesDueSection = async (
  doc,
  html2canvas,
  cursor,
  { salesDue, regularFontDataUrl, boldFontDataUrl },
) => {
  const rows = normalizeSalesDueRows(salesDue);
  if (!rows.length) return;

  await placeLedgerSection(doc, html2canvas, cursor, {
    title: "সেলস বাকি",
    rows,
    totalLabel: null,
    total: 0,
    columns: SALES_DUE_COLUMNS,
    regularFontDataUrl,
    boldFontDataUrl,
  });
};

const appendSalaryAdvanceSection = async (
  doc,
  html2canvas,
  cursor,
  { salaryAdvance, regularFontDataUrl, boldFontDataUrl },
) => {
  const rows = normalizeSalaryAdvanceRows(salaryAdvance);
  if (!rows.length) return;

  await placeLedgerSection(doc, html2canvas, cursor, {
    title: "বেতন অগ্রিম",
    rows,
    totalLabel: null,
    total: 0,
    columns: SALARY_ADVANCE_COLUMNS,
    regularFontDataUrl,
    boldFontDataUrl,
  });
};

const appendSupplierReceivableSection = async (
  doc,
  html2canvas,
  cursor,
  { supplierReceivable, regularFontDataUrl, boldFontDataUrl },
) => {
  const rows = normalizeSupplierReceivableRows(supplierReceivable);
  if (!rows.length) return;

  await placeLedgerSection(doc, html2canvas, cursor, {
    title: "কোম্পানি পাবে (সাপ্লাইয়ার)",
    rows,
    totalLabel: null,
    total: 0,
    columns: SUPPLIER_RECEIVABLE_COLUMNS,
    regularFontDataUrl,
    boldFontDataUrl,
  });
};

const appendManufacturerReceivableSection = async (
  doc,
  html2canvas,
  cursor,
  { manufacturerReceivable, regularFontDataUrl, boldFontDataUrl },
) => {
  const rows = normalizeManufacturerReceivableRows(manufacturerReceivable);
  if (!rows.length) return;

  await placeLedgerSection(doc, html2canvas, cursor, {
    title: "কোম্পানি পাবে (ম্যানুফ্যাকচার)",
    rows,
    totalLabel: null,
    total: 0,
    columns: MANUFACTURER_RECEIVABLE_COLUMNS,
    regularFontDataUrl,
    boldFontDataUrl,
  });
};

const appendPackagingManufacturerReceivableSection = async (
  doc,
  html2canvas,
  cursor,
  { packagingManufacturerReceivable, regularFontDataUrl, boldFontDataUrl },
) => {
  const rows = normalizePackagingManufacturerReceivableRows(
    packagingManufacturerReceivable,
  );
  if (!rows.length) return;

  await placeLedgerSection(doc, html2canvas, cursor, {
    title: "কোম্পানি পাবে (প্যাকেজিং ম্যানুফ্যাকচার)",
    rows,
    totalLabel: null,
    total: 0,
    columns: PACKAGING_MANUFACTURER_RECEIVABLE_COLUMNS,
    regularFontDataUrl,
    boldFontDataUrl,
  });
};

const appendLenderReceivableSection = async (
  doc,
  html2canvas,
  cursor,
  { lenderReceivable, regularFontDataUrl, boldFontDataUrl },
) => {
  const rows = normalizeLenderReceivableRows(lenderReceivable);
  if (!rows.length) return;

  await placeLedgerSection(doc, html2canvas, cursor, {
    title: "কোম্পানি পাবে (লেন্ডার)",
    rows,
    totalLabel: null,
    total: 0,
    columns: LENDER_RECEIVABLE_COLUMNS,
    regularFontDataUrl,
    boldFontDataUrl,
  });
};

const appendPendingPayrollSalarySection = async (
  doc,
  html2canvas,
  cursor,
  { pendingPayrollSalary, regularFontDataUrl, boldFontDataUrl },
) => {
  const rows = normalizePendingPayrollSalaryRows(pendingPayrollSalary);
  if (!rows.length) return;

  await placeLedgerSection(doc, html2canvas, cursor, {
    title: "পেন্ডিং বেতন",
    rows,
    totalLabel: null,
    total: 0,
    columns: PENDING_PAYROLL_SALARY_COLUMNS,
    regularFontDataUrl,
    boldFontDataUrl,
  });
};

const appendManufacturerDueSection = async (
  doc,
  html2canvas,
  cursor,
  { manufacturerDue, regularFontDataUrl, boldFontDataUrl },
) => {
  const rows = normalizeDueRows(manufacturerDue);
  if (!rows.length) return;

  await placeLedgerSection(doc, html2canvas, cursor, {
    title: "ম্যানুফ্যাকচার বাকি",
    rows,
    totalLabel: null,
    total: 0,
    columns: MANUFACTURER_DUE_COLUMNS,
    regularFontDataUrl,
    boldFontDataUrl,
  });
};

const appendSupplierDueSection = async (
  doc,
  html2canvas,
  cursor,
  { supplierDue, regularFontDataUrl, boldFontDataUrl },
) => {
  const rows = normalizeDueRows(supplierDue);
  if (!rows.length) return;

  await placeLedgerSection(doc, html2canvas, cursor, {
    title: "সাপ্লাইয়ার বাকি",
    rows,
    totalLabel: null,
    total: 0,
    columns: SUPPLIER_DUE_COLUMNS,
    regularFontDataUrl,
    boldFontDataUrl,
  });
};

const appendLenderPayableSection = async (
  doc,
  html2canvas,
  cursor,
  { lenderPayable, regularFontDataUrl, boldFontDataUrl },
) => {
  const rows = normalizeLenderPayableRows(lenderPayable);
  if (!rows.length) return;

  await placeLedgerSection(doc, html2canvas, cursor, {
    title: "কোম্পানির কাছে পাবে (লেন্ডার)",
    rows,
    totalLabel: null,
    total: 0,
    columns: LENDER_PAYABLE_COLUMNS,
    regularFontDataUrl,
    boldFontDataUrl,
  });
};

const appendPayableTotalSection = async (
  doc,
  html2canvas,
  cursor,
  {
    pendingPayrollSalary,
    manufacturerDue,
    supplierDue,
    lenderPayable,
    regularFontDataUrl,
    boldFontDataUrl,
  },
) => {
  const pendingSalaryTotal = Number(
    pendingPayrollSalary?.meta?.totalSalary || 0,
  );
  const manufacturerDueTotal = Number(manufacturerDue?.meta?.totalDue || 0);
  const supplierDueTotal = Number(supplierDue?.meta?.totalDue || 0);
  const lenderPayableTotal = Number(lenderPayable?.meta?.totalDue || 0);
  const total = getPayableTotalAmount({
    pendingPayrollSalary,
    manufacturerDue,
    supplierDue,
    lenderPayable,
  });

  if (total <= 0) return;

  await placeLedgerSection(doc, html2canvas, cursor, {
    title: "সর্বমোট বাকি",
    rows: [
      { description: "পেন্ডিং বেতন", amount: pendingSalaryTotal },
      { description: "ম্যানুফ্যাকচার বাকি", amount: manufacturerDueTotal },
      { description: "সাপ্লাইয়ার বাকি", amount: supplierDueTotal },
      {
        description: "কোম্পানির কাছে পাবে (লেন্ডার)",
        amount: lenderPayableTotal,
      },
    ],
    totalLabel: "সর্বমোট",
    total,
    columns: PAYABLE_TOTAL_COLUMNS,
    regularFontDataUrl,
    boldFontDataUrl,
  });
};

const appendPayableAndDirectorInvestmentTotalSection = async (
  doc,
  html2canvas,
  cursor,
  {
    pendingPayrollSalary,
    manufacturerDue,
    supplierDue,
    lenderPayable,
    directorInvestment,
    regularFontDataUrl,
    boldFontDataUrl,
  },
) => {
  const payableTotal = getPayableTotalAmount({
    pendingPayrollSalary,
    manufacturerDue,
    supplierDue,
    lenderPayable,
  });
  const directorInvestTotal =
    getDirectorInvestmentTotalAmount(directorInvestment);
  const total = getPayableAndDirectorInvestmentTotalAmount({
    pendingPayrollSalary,
    manufacturerDue,
    supplierDue,
    lenderPayable,
    directorInvestment,
  });

  if (total <= 0) return;

  await placeLedgerSection(doc, html2canvas, cursor, {
    title: "সর্বমোট বাকি ও ডিরেক্টর ইনভেস্ট",
    rows: [
      { description: "সর্বমোট বাকি", amount: payableTotal },
      { description: "ডিরেক্টর ইনভেস্ট", amount: directorInvestTotal },
    ],
    totalLabel: "সর্বমোট",
    total,
    columns: PAYABLE_TOTAL_COLUMNS,
    regularFontDataUrl,
    boldFontDataUrl,
  });
};

const appendProfitLossSection = async (
  doc,
  html2canvas,
  cursor,
  {
    totalCashBalance,
    salesDue,
    salaryAdvance,
    supplierReceivable,
    manufacturerReceivable,
    packagingManufacturerReceivable,
    lenderReceivable,
    pendingPayrollSalary,
    manufacturerDue,
    supplierDue,
    lenderPayable,
    directorInvestment,
    inventoryStockReport,
    itemFactoryStock,
    packagingStock,
    courierProductStock,
    regularFontDataUrl,
    boldFontDataUrl,
  },
) => {
  const grandTotal = getGrandTotalAmount({
    totalCashBalance,
    salesDue,
    salaryAdvance,
    supplierReceivable,
    manufacturerReceivable,
    packagingManufacturerReceivable,
    lenderReceivable,
    inventoryStockReport,
    itemFactoryStock,
    packagingStock,
    courierProductStock,
  });
  const payableAndInvestmentTotal = getPayableAndDirectorInvestmentTotalAmount({
    pendingPayrollSalary,
    manufacturerDue,
    supplierDue,
    lenderPayable,
    directorInvestment,
  });
  const result = grandTotal - payableAndInvestmentTotal;
  const isLoss = result < 0;
  const resultLabel = isLoss ? "Loss" : "Profit";

  await placeLedgerSection(doc, html2canvas, cursor, {
    title: "Profit / Loss",
    rows: [
      {
        description: "গ্র্যান্ড টোটাল (ক্যাশ, প্রাপ্য ও স্টক)",
        amount: grandTotal,
      },
      {
        description: "সর্বমোট বাকি ও ডিরেক্টর ইনভেস্ট",
        amount: payableAndInvestmentTotal,
      },
    ],
    totalLabel: resultLabel,
    total: Math.abs(result),
    totalTone: isLoss ? "loss" : "profit",
    columns: PAYABLE_TOTAL_COLUMNS,
    regularFontDataUrl,
    boldFontDataUrl,
  });
};

const appendPaymentModeSection = async (
  doc,
  html2canvas,
  cursor,
  { paymentModeSummary, regularFontDataUrl, boldFontDataUrl },
) => {
  const rows = normalizePaymentModeRows(paymentModeSummary);
  if (!rows.length) return;

  await placeLedgerSection(doc, html2canvas, cursor, {
    title: "পেমেন্ট মোড অনুযায়ী ব্যালেন্স",
    rows,
    totalLabel: null,
    total: 0,
    columns: PAYMENT_MODE_COLUMNS,
    regularFontDataUrl,
    boldFontDataUrl,
  });
};

const appendDirectorInvestmentSection = async (
  doc,
  html2canvas,
  cursor,
  { directorInvestment, regularFontDataUrl, boldFontDataUrl },
) => {
  const rows = normalizeDirectorInvestmentRows(directorInvestment);
  if (!rows.length) return;

  await placeLedgerSection(doc, html2canvas, cursor, {
    title: "ডিরেক্টর ইনভেস্ট",
    rows,
    totalLabel: null,
    total: 0,
    columns: DIRECTOR_INVESTMENT_COLUMNS,
    regularFontDataUrl,
    boldFontDataUrl,
  });
};

// Assets Stock / Purchase / Sale / Damage — date-filtered, each with its own
// total, placed at the very bottom of the statement.
const appendAssetsSections = async (
  doc,
  html2canvas,
  cursor,
  { assetsSummary, regularFontDataUrl, boldFontDataUrl },
) => {
  if (!assetsSummary) return;

  const sections = [
    {
      key: "stock",
      title: "অ্যাসেট স্টক",
      withDate: false,
      columns: ASSETS_STOCK_COLUMNS,
    },
    {
      key: "purchase",
      title: "অ্যাসেট ক্রয়",
      withDate: true,
      columns: ASSETS_DATED_COLUMNS,
    },
    {
      key: "sale",
      title: "অ্যাসেট বিক্রয়",
      withDate: true,
      columns: ASSETS_DATED_COLUMNS,
    },
    {
      key: "damage",
      title: "অ্যাসেট ড্যামেজ",
      withDate: true,
      columns: ASSETS_DATED_COLUMNS,
    },
  ];

  for (const section of sections) {
    try {
      const rows = normalizeAssetGroupRows(assetsSummary[section.key], {
        withDate: section.withDate,
      });

      await placeLedgerSection(doc, html2canvas, cursor, {
        title: section.title,
        rows,
        totalLabel: null,
        total: 0,
        columns: section.columns,
        regularFontDataUrl,
        boldFontDataUrl,
      });
    } catch (error) {
      console.error(`Assets section "${section.title}" failed:`, error);
    }
  }
};

// Combines the account's net cash position with every "money owed to the
// company" figure already computed above (Sales Due, Salary Advance, and
// the four receivable sections) into one grand total — the bottom-line
// summary the rest of this report builds up to.
const appendGrandTotalSection = async (
  doc,
  html2canvas,
  cursor,
  {
    totalCashBalance,
    salesDue,
    salaryAdvance,
    supplierReceivable,
    manufacturerReceivable,
    packagingManufacturerReceivable,
    lenderReceivable,
    inventoryStockReport,
    itemFactoryStock,
    packagingStock,
    courierProductStock,
    regularFontDataUrl,
    boldFontDataUrl,
  },
) => {
  const cashTotal = Number(totalCashBalance || 0);
  const salesDueTotal = Number(salesDue?.meta?.totalDue || 0);
  const salaryAdvanceTotal = Number(salaryAdvance?.meta?.totalDue || 0);
  const supplierTotal = Number(supplierReceivable?.meta?.totalAdvance || 0);
  const manufacturerTotal = Number(
    manufacturerReceivable?.meta?.totalAdvance || 0,
  );
  const packagingManufacturerTotal = Number(
    packagingManufacturerReceivable?.meta?.totalAdvance || 0,
  );
  const lenderTotal = Number(lenderReceivable?.meta?.totalAdvance || 0);
  const inv = inventoryStockReport?.meta || {};
  const itemFactory = itemFactoryStock?.meta || {};
  const packaging = packagingStock?.meta || {};
  const grandTotal = getGrandTotalAmount({
    totalCashBalance,
    salesDue,
    salaryAdvance,
    supplierReceivable,
    manufacturerReceivable,
    packagingManufacturerReceivable,
    lenderReceivable,
    inventoryStockReport,
    itemFactoryStock,
    packagingStock,
    courierProductStock,
  });

  const rows = [
    { description: "একাউন্টে মোট ক্যাশ", amount: cashTotal },
    { description: "সেলস বাকি", amount: salesDueTotal },
    { description: "বেতন অগ্রিম", amount: salaryAdvanceTotal },
    { description: "কোম্পানি পাবে (সাপ্লাইয়ার)", amount: supplierTotal },
    {
      description: "কোম্পানি পাবে (ম্যানুফ্যাকচার)",
      amount: manufacturerTotal,
    },
    {
      description: "কোম্পানি পাবে (প্যাকেজিং ম্যানুফ্যাকচার)",
      amount: packagingManufacturerTotal,
    },
    { description: "কোম্পানি পাবে (লেন্ডার)", amount: lenderTotal },
    {
      description: "মোট স্টক প্রোডাক্ট",
      amount: Number(inv.stockProductPurchaseCost || 0),
    },
    {
      description: "মোট ড্যামেজ স্টক",
      amount: Number(inv.damageStockPurchaseCost || 0),
    },
    {
      description: "মোট রিপেয়ারিং স্টক",
      amount: Number(inv.repairingStockPurchaseCost || 0),
    },
    {
      description: "মোট আইটেম স্টক",
      amount: Number(itemFactory.itemStockPurchaseCost || 0),
    },
    {
      description: "মোট ফ্যাক্টরি স্টক",
      amount: Number(itemFactory.factoryStockPurchaseCost || 0),
    },
    {
      description: "মোট প্যাকেজিং আইটেম স্টক",
      amount: Number(packaging.packagingItemStockPurchaseCost || 0),
    },
    {
      description: "মোট প্যাকেজিং ফ্যাক্টরি স্টক",
      amount: Number(packaging.packagingFactoryStockPurchaseCost || 0),
    },
    {
      description: "কুরিয়ার প্রোডাক্ট স্টক",
      amount: Number(courierProductStock?.meta?.totalEndingAmount || 0),
    },
  ];

  await placeLedgerSection(doc, html2canvas, cursor, {
    title: "গ্র্যান্ড টোটাল (ক্যাশ, প্রাপ্য ও স্টক)",
    rows,
    totalLabel: "সর্বমোট",
    total: grandTotal,
    columns: GRAND_TOTAL_COLUMNS,
    regularFontDataUrl,
    boldFontDataUrl,
  });
};

const appendSplitStockSection = async (
  doc,
  html2canvas,
  cursor,
  { report, pools, regularFontDataUrl, boldFontDataUrl },
) => {
  for (const pool of pools) {
    const rows = normalizeSplitStockPoolRows(report, pool);
    if (!rows.length) continue;

    await placeLedgerSection(doc, html2canvas, cursor, {
      title: pool.title,
      rows,
      totalLabel: null,
      total: 0,
      columns: SPLIT_STOCK_COLUMNS,
      regularFontDataUrl,
      boldFontDataUrl,
    });
  }
};

// Generates one PDF containing every book's Credit/Debit statement, each
// book starting on its own page — used for both the single-book "Statement"
// action and the "All Books" combined report.
export const generateBookStatementPdf = async ({
  companyName = "KAFELA MART",
  companyInfo = {},
  logoUrl = "",
  periodLabel = "",
  books = [],
  inventoryStockReport = null,
  itemFactoryStock = null,
  packagingStock = null,
  courierProductStock = null,
  supplierReceivable = null,
  manufacturerReceivable = null,
  packagingManufacturerReceivable = null,
  lenderReceivable = null,
  salesDue = null,
  salaryAdvance = null,
  pendingPayrollSalary = null,
  supplierDue = null,
  manufacturerDue = null,
  lenderPayable = null,
  directorInvestment = null,
  assetsSummary = null,
  paymentModeSummary = null,
}) => {
  const { jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;

  const [logoDataUrl, [regularFontDataUrl, boldFontDataUrl]] =
    await Promise.all([safeAssetToDataUrl(logoUrl), getEmbeddedFonts()]);

  const doc = new jsPDF("p", "mm", "a4");
  const cursor = { y: CONTENT_MARGIN_MM, pageHasContent: false };

  const totalCashBalance = books.reduce((sum, book) => {
    const totalCredit = book.totalCredit ?? 0;
    const totalDebit = book.totalDebit ?? 0;
    const netBalance =
      book.netBalance !== undefined
        ? book.netBalance
        : totalCredit - totalDebit;
    return sum + netBalance;
  }, 0);

  for (const book of books) {
    await appendBookStatement(doc, html2canvas, cursor, {
      ...book,
      companyName,
      companyInfo,
      logoDataUrl,
      bookName: book.bookName || "Book",
      periodLabel,
      regularFontDataUrl,
      boldFontDataUrl,
    });
  }

  await appendInventoryStockReport(doc, html2canvas, cursor, {
    inventoryStockReport,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendSplitStockSection(doc, html2canvas, cursor, {
    report: itemFactoryStock,
    pools: ITEM_FACTORY_STOCK_POOLS,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendSplitStockSection(doc, html2canvas, cursor, {
    report: packagingStock,
    pools: PACKAGING_STOCK_POOLS,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendCourierProductStockSection(doc, html2canvas, cursor, {
    courierProductStock,
    periodLabel,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendSalesDueSection(doc, html2canvas, cursor, {
    salesDue,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendSalaryAdvanceSection(doc, html2canvas, cursor, {
    salaryAdvance,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendSupplierReceivableSection(doc, html2canvas, cursor, {
    supplierReceivable,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendManufacturerReceivableSection(doc, html2canvas, cursor, {
    manufacturerReceivable,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendPackagingManufacturerReceivableSection(doc, html2canvas, cursor, {
    packagingManufacturerReceivable,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendLenderReceivableSection(doc, html2canvas, cursor, {
    lenderReceivable,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendGrandTotalSection(doc, html2canvas, cursor, {
    totalCashBalance,
    salesDue,
    salaryAdvance,
    supplierReceivable,
    manufacturerReceivable,
    packagingManufacturerReceivable,
    lenderReceivable,
    inventoryStockReport,
    itemFactoryStock,
    packagingStock,
    courierProductStock,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendPendingPayrollSalarySection(doc, html2canvas, cursor, {
    pendingPayrollSalary,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendManufacturerDueSection(doc, html2canvas, cursor, {
    manufacturerDue,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendSupplierDueSection(doc, html2canvas, cursor, {
    supplierDue,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendLenderPayableSection(doc, html2canvas, cursor, {
    lenderPayable,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendPayableTotalSection(doc, html2canvas, cursor, {
    pendingPayrollSalary,
    manufacturerDue,
    supplierDue,
    lenderPayable,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendDirectorInvestmentSection(doc, html2canvas, cursor, {
    directorInvestment,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendPayableAndDirectorInvestmentTotalSection(
    doc,
    html2canvas,
    cursor,
    {
      pendingPayrollSalary,
      manufacturerDue,
      supplierDue,
      lenderPayable,
      directorInvestment,
      regularFontDataUrl,
      boldFontDataUrl,
    },
  );

  await appendProfitLossSection(doc, html2canvas, cursor, {
    totalCashBalance,
    salesDue,
    salaryAdvance,
    supplierReceivable,
    manufacturerReceivable,
    packagingManufacturerReceivable,
    lenderReceivable,
    pendingPayrollSalary,
    manufacturerDue,
    supplierDue,
    lenderPayable,
    directorInvestment,
    inventoryStockReport,
    itemFactoryStock,
    packagingStock,
    courierProductStock,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendPaymentModeSection(doc, html2canvas, cursor, {
    paymentModeSummary,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  await appendAssetsSections(doc, html2canvas, cursor, {
    assetsSummary,
    regularFontDataUrl,
    boldFontDataUrl,
  });

  // Page count isn't known until every section above has been placed, so
  // the footer numbering is stamped on as a final pass over every page.
  const totalPages = doc.internal.getNumberOfPages();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.text(
      `Page ${pageNumber} of ${totalPages}`,
      PAGE_W_MM / 2,
      PAGE_H_MM - 12,
      {
        align: "center",
      },
    );
  }

  return doc.output("blob");
};
