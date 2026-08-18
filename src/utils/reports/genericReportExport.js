import * as XLSX from "xlsx";
import { drawPdfBrandBlock, DEFAULT_COMPANY_NAME } from "../pdfBranding";

const isPlainObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value);

const formatDateOnly = (value) => {
  if (typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
  return null;
};

const toTitle = (key) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const hiddenObjectKeys = new Set([
  "id",
  "Id",
  "_id",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "productId",
  "ProductId",
  "itemId",
  "ItemId",
]);

const hiddenReportKeys = new Set([
  "id",
  "Id",
  "_id",
  "password",
  "token",
  "refreshToken",
  "deletedAt",
  "updatedAt",
  "productId",
  "ProductId",
  "inventoryMasterId",
  "InventoryMasterId",
  "warehouseId",
  "WarehouseId",
  "supplierId",
  "SupplierId",
  "customerId",
  "CustomerId",
  "userId",
  "UserId",
  "employeeId",
  "EmployeeId",
  "itemId",
  "ItemId",
  "file",
  "image",
  "images",
  "document",
]);

const A4_PAPER_SIZE = 9;

const c = (label, candidates, options = {}) => ({
  label,
  candidates: Array.isArray(candidates) ? candidates : [candidates],
  ...options,
});

const baseProductColumns = [
  c("Product", ["name", "productName", "Product.name", "product.name"]),
  c("SKU", "sku"),
  c("Variants", ["variations", "variants"], {
    type: "variants",
    alwaysShow: true,
  }),
  c("Status", "status"),
  c("Created Date", "createdAt"),
  c("Note", "note"),
];

const inventoryReportColumns = [
  c(
    "Products Name",
    ["productsName", "name", "productName", "Product.name", "product.name"],
    { alwaysShow: true },
  ),
  c("Stock Product", ["stockProduct", "stock", "quantity"], {
    alwaysShow: true,
  }),
  c("Damage Stock", ["damageStock", "damageQuantity"], { alwaysShow: true }),
  c("Repairing Stock", ["repairingStock", "repairingQuantity"], {
    alwaysShow: true,
  }),
  c("Total Products", ["totalProducts", "totalQuantity"], { alwaysShow: true }),
  c("Total Purchase Cost", ["totalPurchaseCost", "totalPurchaseValue"], {
    alwaysShow: true,
  }),
  c("Total Sales Cost", ["totalSalesCost", "totalSaleValue"], {
    alwaysShow: true,
  }),
];

const productStockColumns = [
  c("Product", ["name", "productName", "Product.name", "product.name"]),
  c("In Hand Qty", [
    "inHandQuantity",
    "inHandQty",
    "currentQuantity",
    "quantity",
    "stock",
  ]),
  c("Purchase Price", ["unitPurchasePrice", "purchasePrice", "buyPrice"]),
  c("Sale Price", ["unitSalePrice", "salePrice", "sellPrice"]),
  c("Stock Balance", ["stockBalance", "totalStockBalance", "balance"]),
  c("Variants", ["variations", "variants"], {
    type: "variants",
    alwaysShow: true,
  }),
  c("Status", "status"),
];

const purchaseColumns = [
  c("Date", ["date", "createdAt"]),
  c("Product", ["productName", "name", "Product.name", "product.name"]),
  c("Supplier", ["supplierName", "Supplier.name", "supplier.name"]),
  c("Warehouse", ["warehouseName", "Warehouse.name", "warehouse.name"]),
  c("Quantity", "quantity"),
  c("Unit", "unit"),
  c("Purchase Price", ["unitPurchasePrice", "purchasePrice", "buyPrice"]),
  c("Sale Price", ["unitSalePrice", "salePrice", "sellPrice"]),
  c("Variants", ["variants", "variations"], {
    type: "variants",
    alwaysShow: true,
  }),
  c("Status", "status"),
  c("Note", "note"),
];

const movementColumns = [
  c("Date", ["date", "createdAt"]),
  c("Product", ["productName", "name", "Product.name", "product.name"]),
  c("Quantity", "quantity"),
  c("Type", ["type", "movementType", "sourceType"]),
  c("From", ["fromWarehouse", "from", "fromFactory"]),
  c("To", ["toWarehouse", "to", "toFactory"]),
  c("Balance", ["balance", "stockBalance"]),
  c("Status", "status"),
  c("Note", "note"),
];

const financeColumns = [
  c("Date", ["date", "createdAt"]),
  c("Name", [
    "name",
    "title",
    "accountName",
    "partyName",
    "supplierName",
    "customerName",
  ]),
  c("Type", ["type", "transactionType", "category"]),
  c("Debit", ["debit", "debitAmount"]),
  c("Credit", ["credit", "creditAmount"]),
  c("Amount", ["amount", "totalAmount", "paidAmount"]),
  c("Balance", ["balance", "due", "remainingAmount"]),
  c("Status", "status"),
  c("Note", "note"),
];

const peopleColumns = [
  c("Name", ["name", "employeeName", "username"]),
  c("Phone", ["phone", "mobile", "contactNo"]),
  c("Email", "email"),
  c("Department", ["department", "Department.name", "department.name"]),
  c("Designation", ["designation", "Designation.name", "designation.name"]),
  c("Status", "status"),
  c("Created Date", "createdAt"),
];

const REPORT_COLUMN_PRESETS = {
  products: baseProductColumns,
  "inventory-reports": inventoryReportColumns,
  "inventory-overview": productStockColumns,
  "stock-product": productStockColumns,
  "stock-alert": [
    ...productStockColumns,
    c("Alert Qty", ["alertQuantity", "lowStockQuantity", "minimumQuantity"]),
  ],
  warehouse: [
    c("Warehouse", ["name", "warehouseName"]),
    c("Phone", ["phone", "mobile"]),
    c("Address", "address"),
    c("Status", "status"),
  ],
  supplier: [
    c("Supplier", ["name", "supplierName"]),
    c("Phone", ["phone", "mobile"]),
    c("Address", "address"),
    c("Balance", ["balance", "due", "payable"]),
    c("Status", "status"),
  ],
  "received-product": purchaseColumns,
  "intransit-product": purchaseColumns,
  "courier-no-entry": [
    c("Date", ["date", "createdAt"]),
    c("Courier No", ["courierNo", "trackingNo", "consignmentNo"]),
    c("Product", ["productName", "name", "Product.name", "product.name"]),
    c("Quantity", "quantity"),
    c("Amount", ["amount", "totalAmount"]),
    c("Status", "status"),
    c("Note", "note"),
  ],
  "sales-return": [
    c("Date", ["date", "createdAt"]),
    c("Product", ["productName", "name", "Product.name", "product.name"]),
    c("Customer", ["customerName", "Customer.name", "customer.name"]),
    c("Quantity", "quantity"),
    c("Sale Price", ["unitSalePrice", "salePrice", "sellPrice"]),
    c("Reason", ["reason", "returnReason"]),
    c("Status", "status"),
    c("Note", "note"),
  ],
  "purchase-return": [
    c("Date", ["date", "createdAt"]),
    c("Product", ["productName", "name", "Product.name", "product.name"]),
    c("Supplier", ["supplierName", "Supplier.name", "supplier.name"]),
    c("Quantity", "quantity"),
    c("Purchase Price", ["unitPurchasePrice", "purchasePrice", "buyPrice"]),
    c("Reason", ["reason", "returnReason"]),
    c("Status", "status"),
    c("Note", "note"),
  ],
  "confirm-order": [
    c("Date", ["date", "createdAt"]),
    c("Invoice", ["invoiceId", "invoiceNo", "orderId"]),
    c("Customer", ["customerName", "Customer.name", "customer.name"]),
    c("Phone", ["phone", "customerPhone"]),
    c("Items", ["items", "products", "orderItems"]),
    c("Total", ["total", "grandTotal", "totalAmount"]),
    c("Status", "status"),
  ],
  "pos-report": [
    c("Date", ["date", "createdAt"]),
    c("Invoice", ["invoiceId", "invoiceNo"]),
    c("Customer", ["customerName", "Customer.name", "customer.name"]),
    c("Items", ["items", "products", "saleItems"]),
    c("Total Sale", ["totalSale", "grandTotal", "totalAmount"]),
    c("Profit", ["profit", "totalProfit"]),
    c("Payment", ["paymentMethod", "paymentType"]),
    c("Status", "status"),
  ],
  "assets-stock": [
    c("Asset", ["name", "assetName"]),
    c("Category", "category"),
    c("Quantity", "quantity"),
    c("Unit Price", ["unitPrice", "purchasePrice"]),
    c("Balance", ["balance", "stockBalance"]),
    c("Status", "status"),
  ],
  "assets-requisition": [
    c("Date", ["date", "createdAt"]),
    c("Asset", ["name", "assetName", "Assets.name", "asset.name"]),
    c("Quantity", "quantity"),
    c("Amount", "amount"),
    c("Requested By", ["requestedBy", "employeeName", "Employee.name"]),
    c("Status", "status"),
    c("Note", "note"),
  ],
  "assets-purchase": purchaseColumns,
  "assets-sale": [
    c("Date", ["date", "createdAt"]),
    c("Asset", ["name", "assetName", "Assets.name", "asset.name"]),
    c("Quantity", "quantity"),
    c("Sale Price", ["salePrice", "unitSalePrice"]),
    c("Total", ["total", "totalAmount", "amount"]),
    c("Status", "status"),
    c("Note", "note"),
  ],
  "assets-damage": [
    c("Date", ["date", "createdAt"]),
    c("Asset", ["name", "assetName", "Assets.name", "asset.name"]),
    c("Quantity", "quantity"),
    c("Reason", "reason"),
    c("Status", "status"),
    c("Note", "note"),
  ],
  "damage-stock": productStockColumns,
  "damage-product": purchaseColumns,
  "damage-repairing-stock": productStockColumns,
  "damage-repair": [
    c("Date", ["date", "createdAt"]),
    c("Product", ["productName", "name", "Product.name", "product.name"]),
    c("Quantity", "quantity"),
    c("Repair Cost", ["repairCost", "cost", "amount"]),
    c("Status", "status"),
    c("Note", "note"),
  ],
  "damage-repaired": [
    c("Date", ["date", "createdAt"]),
    c("Product", ["productName", "name", "Product.name", "product.name"]),
    c("Quantity", "quantity"),
    c("Repair Cost", ["repairCost", "cost", "amount"]),
    c("Status", "status"),
    c("Note", "note"),
  ],
  "marketing-book": financeColumns,
  "marketing-expense": financeColumns,
  "meta-expense": financeColumns,
  "google-expense": financeColumns,
  "tiktok-expense": financeColumns,
  "seo-expense": financeColumns,
  "ads-campaign-kpi": [
    c("Date", ["date", "createdAt"]),
    c("Campaign", ["campaignName", "name"]),
    c("Spend", ["spend", "cost", "amount"]),
    c("Orders", ["orders", "orderCount"]),
    c("Revenue", ["revenue", "sales", "totalSale"]),
    c("ROAS", ["roas"]),
    c("Status", "status"),
  ],
  "profit-loss": [
    c("Date", ["date", "createdAt"]),
    c("Product", ["productName", "name", "Product.name", "product.name"]),
    c("Quantity", "quantity"),
    c("Sale", ["sale", "totalSale", "revenue"]),
    c("Cost", ["cost", "totalCost"]),
    c("Profit", ["profit", "netProfit"]),
  ],
  "profit-loss-user": [
    c("Date", ["date", "createdAt"]),
    c("User", ["userName", "name", "User.name", "user.name"]),
    c("Orders", ["orders", "orderCount"]),
    c("Sale", ["sale", "totalSale", "revenue"]),
    c("Cost", ["cost", "totalCost"]),
    c("Profit", ["profit", "netProfit"]),
  ],
  book: financeColumns,
  "cash-in-out": financeColumns,
  expense: financeColumns,
  "petty-cash": financeColumns,
  "petty-cash-requisition": financeColumns,
  loan: financeColumns,
  owner: peopleColumns,
  "owner-transaction": financeColumns,
  "credit-ledger": financeColumns,
  payable: financeColumns,
  receivable: financeColumns,
  "packaging-item": baseProductColumns,
  "packaging-item-stock": productStockColumns,
  "packaging-item-purchase": purchaseColumns,
  "packaging-manufacturer": peopleColumns,
  "packaging-factory": peopleColumns,
  "packaging-factory-stock": productStockColumns,
  "packaging-mixer": [
    c("Date", ["date", "createdAt"]),
    c("Product", ["productName", "name", "Product.name", "product.name"]),
    c("Combo Qty", ["comboQty", "quantity"]),
    c("Manufacture Items", ["manufactureItems", "items"]),
    c("Packaging Items", ["packagingItems"]),
    c("Status", "status"),
  ],
  item: baseProductColumns,
  "item-requisition": [
    c("Date", ["date", "createdAt"]),
    c("Item", ["itemName", "name", "Item.name", "item.name"]),
    c("Quantity", "quantity"),
    c("Unit", "unit"),
    c("Amount", "amount"),
    c("Supplier", ["supplierName", "Supplier.name", "supplier.name"]),
    c("Status", "status"),
    c("Note", "note"),
  ],
  "item-stock": productStockColumns,
  "item-purchase": purchaseColumns,
  manufacturer: peopleColumns,
  "manufacture-stock": productStockColumns,
  manufacture: purchaseColumns,
  "stock-adjustment": movementColumns,
  "stock-movement": movementColumns,
  mixer: [
    c("Date", ["date", "createdAt"]),
    c("Product", ["productName", "name", "Product.name", "product.name"]),
    c("Combo Qty", ["comboQty", "quantity"]),
    c("Manufacture Items", ["manufactureItems", "items"]),
    c("Packaging Items", ["packagingItems"]),
    c("Status", "status"),
  ],
  "employee-list": peopleColumns,
  employee: peopleColumns,
  "user-management": peopleColumns,
  "employee-kpi": [
    c("Date", ["date", "createdAt"]),
    c("Employee", ["employeeName", "name", "Employee.name"]),
    c("KPI", ["kpi", "title"]),
    c("Target", "target"),
    c("Achievement", ["achievement", "achieved"]),
    c("Score", "score"),
    c("Status", "status"),
  ],
  salary: [
    c("Date", ["date", "createdAt"]),
    c("Employee", ["employeeName", "name", "Employee.name"]),
    c("Salary", ["salary", "amount", "netSalary"]),
    c("Paid", ["paid", "paidAmount"]),
    c("Due", ["due", "dueAmount"]),
    c("Status", "status"),
  ],
  departments: [
    c("Department", ["name", "departmentName"]),
    c("Status", "status"),
  ],
  designations: [
    c("Designation", ["name", "designationName"]),
    c("Status", "status"),
  ],
  teams: [
    c("Team", ["name", "teamName"]),
    c("Leader", ["leader", "leaderName"]),
    c("Status", "status"),
  ],
  "daily-work-reports": [
    c("Date", ["date", "createdAt"]),
    c("Employee", ["employeeName", "name", "Employee.name"]),
    c("Work", ["work", "task", "description"]),
    c("Status", "status"),
    c("Note", "note"),
  ],
  "employee-work-reports": [
    c("Date", ["date", "createdAt"]),
    c("Employee", ["employeeName", "name", "Employee.name"]),
    c("Work", ["work", "task", "description"]),
    c("Status", "status"),
    c("Note", "note"),
  ],
  "logistic-work-reports": [
    c("Date", ["date", "createdAt"]),
    c("Employee", ["employeeName", "name", "Employee.name"]),
    c("Work", ["work", "task", "description"]),
    c("Status", "status"),
    c("Note", "note"),
  ],
  "logistic-updates": [
    c("Date", ["date", "createdAt"]),
    c("Order", ["orderId", "invoiceId", "invoiceNo"]),
    c("Update", ["update", "message", "description"]),
    c("Status", "status"),
    c("Note", "note"),
  ],
  "log-history": [
    c("Date", ["date", "createdAt"]),
    c("User", ["userName", "name", "User.name"]),
    c("Module", "module"),
    c("Action", "action"),
    c("Details", ["details", "description"]),
  ],
  "shifa-call-history": [
    c("Date", ["date", "createdAt"]),
    c("Patient", ["patientName", "name"]),
    c("Phone", ["phone", "mobile"]),
    c("Summary", ["summary", "details", "note"]),
    c("Status", "status"),
  ],
  "shifa-starting-situation": [
    c("Date", ["date", "createdAt"]),
    c("Patient", ["patientName", "name"]),
    c("Situation", ["situation", "details", "description"]),
    c("Status", "status"),
  ],
  "shifa-problem-history": [
    c("Date", ["date", "createdAt"]),
    c("Patient", ["patientName", "name"]),
    c("Problem", ["problem", "details", "description"]),
    c("Status", "status"),
  ],
  "shifa-patient-update": [
    c("Date", ["date", "createdAt"]),
    c("Patient", ["patientName", "name"]),
    c("Update", ["update", "details", "description"]),
    c("Status", "status"),
  ],
};

const parseJsonValue = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || !["[", "{"].includes(trimmed[0])) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const formatObjectValue = (value) => {
  const entries = Object.entries(value).filter(([key, entryValue]) => {
    if (hiddenObjectKeys.has(key)) return false;
    if (entryValue === null || entryValue === undefined || entryValue === "")
      return false;
    if (
      typeof entryValue === "string" &&
      ["-", "n/a"].includes(entryValue.trim().toLowerCase())
    )
      return false;
    if (Array.isArray(entryValue) && !entryValue.length) return false;
    return true;
  });

  if (!entries.length) return "-";
  if (entries.length === 1) return formatReportValue(entries[0][1]);

  const displayOnlyKeys = ["name", "title", "label", "username", "email"];
  const displayOnlyKey = displayOnlyKeys.find(
    (key) => value[key] && entries.length <= 2,
  );
  if (displayOnlyKey) return value[displayOnlyKey];

  return entries
    .map(
      ([key, entryValue]) =>
        `${toTitle(key)}: ${formatReportValue(entryValue)}`,
    )
    .join(", ");
};

export const formatReportValue = (rawValue) => {
  const value = parseJsonValue(rawValue);
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (!value.length) return "-";
    const hasObjects = value.some(isPlainObject);
    const formattedItems = value
      .map(formatReportValue)
      .filter((item) => item && item !== "-");
    return formattedItems.length
      ? formattedItems.join(hasObjects ? "\n" : ", ")
      : "-";
  }
  const dateOnly = formatDateOnly(value);
  if (dateOnly) return dateOnly;
  if (isPlainObject(value)) return formatObjectValue(value);
  return value;
};

const isEmptyVariantValue = (value) =>
  value === null ||
  value === undefined ||
  value === "" ||
  (typeof value === "string" &&
    ["-", "n/a", "na", "none", "null"].includes(value.trim().toLowerCase()));

const getFirstPresent = (source, keys) => {
  for (const key of keys) {
    const value = source?.[key];
    if (!isEmptyVariantValue(value)) return value;
  }
  return undefined;
};

const formatSingleVariant = (variant) => {
  const parsed = parseJsonValue(variant);
  if (!isPlainObject(parsed)) return null;

  const size = getFirstPresent(parsed, ["size", "Size"]);
  const code = getFirstPresent(parsed, ["code", "Code"]);
  const color = getFirstPresent(parsed, ["color", "Color"]);
  const quantity = getFirstPresent(parsed, [
    "quantity",
    "qty",
    "Quantity",
    "Qty",
  ]);

  const parts = [];
  if (size !== undefined) parts.push(`Size: ${formatReportValue(size)}`);
  if (code !== undefined) parts.push(`Code: ${formatReportValue(code)}`);
  if (color !== undefined) parts.push(`Color: ${formatReportValue(color)}`);
  if (quantity !== undefined) parts.push(`Qty: ${formatReportValue(quantity)}`);

  return parts.length ? parts.join(", ") : null;
};

const formatVariantsValue = (rawValue) => {
  const value = parseJsonValue(rawValue);
  const variants = Array.isArray(value)
    ? value
    : isPlainObject(value)
      ? [value]
      : [];
  const formattedVariants = variants.map(formatSingleVariant).filter(Boolean);

  return formattedVariants.length
    ? formattedVariants.join("\n")
    : "No Variants";
};

const isBlankValue = (value) =>
  value === null ||
  value === undefined ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

const getPathValue = (source, path) => {
  if (!source || !path) return undefined;
  if (Object.prototype.hasOwnProperty.call(source, path)) return source[path];

  return String(path)
    .split(".")
    .reduce((current, key) => {
      if (current === null || current === undefined) return undefined;
      return current[key];
    }, source);
};

const getColumnValue = (row, column) => {
  const candidates = column.candidates || [];
  for (const candidate of candidates) {
    const value = getPathValue(row, candidate);
    if (!isBlankValue(value)) return value;
  }
  return undefined;
};

const hasColumnValue = (rows, column) =>
  rows.some((row) => !isBlankValue(getColumnValue(row, column)));

const getDefaultColumns = (keys) => {
  const priorityKeys = [
    "date",
    "createdAt",
    "name",
    "title",
    "sku",
    "quantity",
    "unit",
    "amount",
    "total",
    "status",
    "note",
  ];

  const visibleKeys = keys.filter((key) => !hiddenReportKeys.has(key));

  return [
    ...priorityKeys
      .filter((key) => visibleKeys.includes(key))
      .map((key) => c(toTitle(key), key)),
    ...visibleKeys
      .filter((key) => !priorityKeys.includes(key))
      .slice(0, 8)
      .map((key) => c(toTitle(key), key)),
  ];
};

export const buildReportTable = (rows = [], report = null) => {
  const keys = Array.from(
    rows.reduce((set, row) => {
      if (isPlainObject(row)) {
        Object.keys(row).forEach((key) => {
          if (!hiddenReportKeys.has(key)) {
            set.add(key);
          }
        });
      }
      return set;
    }, new Set()),
  );

  const presetColumns = REPORT_COLUMN_PRESETS[report?.key] || [];
  const columns = (
    presetColumns.length ? presetColumns : getDefaultColumns(keys)
  ).filter(
    (column) =>
      column.label !== "Status" &&
      (column.alwaysShow || hasColumnValue(rows, column)),
  );

  const safeColumns = columns.length
    ? columns
    : getDefaultColumns(keys).filter(
        (column) => column.label !== "Status" && hasColumnValue(rows, column),
      );

  const headers = ["#", ...safeColumns.map((column) => column.label)];
  const body = rows.map((row, index) => [
    index + 1,
    ...safeColumns.map((column) => {
      const value = getColumnValue(row, column);
      return column.type === "variants"
        ? formatVariantsValue(value)
        : formatReportValue(value);
    }),
  ]);

  return { headers, body };
};

export const downloadGenericReportXlsx = ({
  title,
  rows,
  filename,
  report,
  companyName = DEFAULT_COMPANY_NAME,
}) => {
  const { headers, body } = buildReportTable(rows, report);
  const worksheet = XLSX.utils.aoa_to_sheet([
    [companyName],
    [title],
    [`Generated: ${new Date().toISOString().slice(0, 10)}`],
    [`Total Rows: ${rows.length}`],
    [],
    headers,
    ...body,
  ]);

  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(headers.length - 1, 0) } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(headers.length - 1, 0) } },
  ];
  worksheet["!cols"] = headers.map((header) => ({
    wch: Math.min(Math.max(String(header).length + 6, 12), 36),
  }));
  worksheet["!pageSetup"] = {
    paperSize: A4_PAPER_SIZE,
    orientation: "portrait",
    fitToWidth: 1,
    fitToHeight: 0,
    scale: 80,
  };
  Object.values(worksheet).forEach((cell) => {
    if (
      cell &&
      typeof cell === "object" &&
      typeof cell.v === "string" &&
      cell.v.includes("\n")
    ) {
      cell.s = {
        ...(cell.s || {}),
        alignment: { wrapText: true, vertical: "top" },
      };
    }
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const downloadGenericReportPdf = async ({
  title,
  rows,
  filename,
  report,
  logoUrl = "",
  companyName = DEFAULT_COMPANY_NAME,
}) => {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const { headers, body } = buildReportTable(rows, report);

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 12;
  const top = 12;

  await drawPdfBrandBlock({
    pdf: doc,
    logoUrl,
    companyName,
    x: left,
    topY: top,
    logoMaxWidth: 42,
    logoMaxHeight: 14,
    companySize: 12,
    subtitle: title,
    subtitleSize: 8,
  });

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(left, 40, pageWidth - left * 2, 13, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Report: ${title}`, left + 4, 48);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Generated: ${new Date().toISOString().slice(0, 10)}   |   Total Rows: ${rows.length}`,
    pageWidth - left - 4,
    48,
    { align: "right" },
  );

  autoTable(doc, {
    head: [headers],
    body,
    startY: 59,
    theme: "grid",
    margin: { left, right: left },
    tableWidth: pageWidth - left * 2,
    styles: {
      font: "helvetica",
      fontStyle: "normal",
      fontSize: 7.4,
      cellPadding: 2,
      overflow: "linebreak",
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      font: "helvetica",
      fontStyle: "bold",
      fontSize: 7.6,
      halign: "left",
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 58 },
    },
    didDrawPage: (data) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Page ${doc.internal.getNumberOfPages()}`,
        pageWidth - left,
        pageHeight - 8,
        { align: "right" },
      );
      if (data.pageNumber > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(title, left, 12);
      }
    },
  });

  doc.save(`${filename}.pdf`);
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const printGenericReport = ({
  title,
  rows,
  report,
  logoUrl = "",
  companyName = DEFAULT_COMPANY_NAME,
}) => {
  const { headers, body } = buildReportTable(rows, report);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName)}" style="height: 44px; max-width: 200px; object-fit: contain; margin-bottom: 6px;" />`
    : "";

  const dateStr = new Date().toISOString().slice(0, 10);

  const tableHeadersHtml = headers
    .map((h) => `<th>${escapeHtml(h)}</th>`)
    .join("");

  const tableRowsHtml = body
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td>${escapeHtml(cell)}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(title)} - Print</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 12px;
            color: #0f172a;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 2px solid #6366f1;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .brand-title {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
            letter-spacing: -0.02em;
          }
          .report-title {
            font-size: 15px;
            font-weight: 700;
            color: #4f46e5;
            margin: 4px 0 0 0;
          }
          .meta-info {
            font-size: 11px;
            color: #64748b;
            text-align: right;
            line-height: 1.6;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-top: 8px;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            text-align: left;
            vertical-align: top;
            word-break: break-word;
          }
          th {
            background-color: #4f46e5;
            color: #ffffff;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.05em;
          }
          tbody tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .print-footer {
            margin-top: 16px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #94a3b8;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div>
            ${logoHtml}
            <h1 class="brand-title">${escapeHtml(companyName)}</h1>
            <p class="report-title">${escapeHtml(title)}</p>
          </div>
          <div class="meta-info">
            <div><strong>Generated:</strong> ${escapeHtml(dateStr)}</div>
            <div><strong>Total Rows:</strong> ${rows.length}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>${tableHeadersHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="print-footer">
          <div>Printed from ${escapeHtml(companyName)} Accounts System</div>
          <div>Report Date: ${escapeHtml(dateStr)}</div>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

