import { motion } from "framer-motion";
import {
  Edit,
  FileText,
  Minus,
  Notebook,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import jsPDF from "jspdf";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useDeleteCashInOutMutation,
  useGetAllCashInOutWithoutQueryQuery,
  useGetAllCashInOutQuery,
  useInsertCashInOutMutation,
  useUpdateCashInOutMutation,
} from "../../features/cashInOut/cashInOut";
import { useGetAllLoanWithoutQueryQuery } from "../../features/loan/loan";
import { useParams } from "react-router-dom";
import Select from "react-select";
import ReportMenu from "./ReportMenu";
import ReportPreviewModal from "./ReportPreviewModal";

import { generateCashInOutPdf } from "../../utils/report/generateCashInOutPdf";
import { generateCashInOutXlsx } from "../../utils/report/generateCashInOutXlsx";
import { useGetSingleBookDataByIdQuery } from "../../features/book/book";
import {
  useGetAllCategoryQuery,
  useInsertCategoryMutation,
} from "../../features/category/category";
import Modal from "../common/Modal";
import DateRangeFilter, { getDatePresetRange } from "../common/DateRangeFilter";
import { useLayout } from "../../context/LayoutContext";
import { translations } from "../../utils/translations";
import { useGetAllSupplierWithoutQueryQuery } from "../../features/supplier/supplier";
import { useGetAllSupplierHistoryQuery } from "../../features/supplierHistory/supplierHistory";
import { useGetAllDollarSupplierWithoutQueryQuery } from "../../features/dollarSupplier/dollarSupplier";
import { useGetAllDollarSupplierHistoryQuery } from "../../features/dollarSupplierHistory/dollarSupplierHistory";
import { useGetAllOwnerWithoutQueryQuery } from "../../features/ownerTransaction/ownerTransaction";
import { useGetAllDirectorWithoutQueryQuery } from "../../features/ownerTransaction/directorProfitShare";
import { useGetAllManufacturerWithoutQueryQuery } from "../../features/manufacturer/manufacturer";
import { useGetAllPackagingManufacturerWithoutQueryQuery } from "../../features/packagingManufacturer/packagingManufacturer";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import useDebounce from "../../hooks/useDebounce";

import {
  useGetAllBankAccountWithoutQueryQuery,
  useInsertBankAccountMutation,
} from "../../features/bankAccount/bankAccount";
import { useGetAllLogoQuery } from "../../features/logo/logo";
import { DEFAULT_COMPANY_NAME, buildAssetUrl } from "../../utils/pdfBranding";

const escapeVoucherHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const drawWrappedText = (
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines = 3,
) => {
  const normalizedText = String(text || "-")
    .replace(/\s+/g, " ")
    .trim();
  const words = normalizedText.split(" ");
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const testLine = line ? line + " " + word : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });

  if (line) lines.push(line);

  lines.slice(0, maxLines).forEach((lineText, index) => {
    ctx.fillText(lineText, x, y + index * lineHeight);
  });
};

const loadImageForCanvas = (url) =>
  new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });

const renderVoucherPdfFromCanvas = async ({
  voucherNo,
  refNo,
  voucherTitle,
  isCashOut,
  date,
  detailRows,
  amount,
  note,
  widthMm,
  heightMm,
  logoUrl,
}) => {
  if (document.fonts?.ready) await document.fonts.ready;

  const scale = 2;
  const width = 575;
  const height = 825;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  const fontFamily = "Hind Siliguri, Plus Jakarta Sans, Arial, sans-serif";
  const setFont = (size, weight = 400) => {
    ctx.font = String(weight) + " " + size + "px " + fontFamily;
  };

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 2;
  ctx.strokeRect(38, 30, width - 76, height - 60);

  const left = 54;
  const right = width - 54;
  let topY = 42;

  const logoImg = logoUrl ? await loadImageForCanvas(logoUrl) : null;
  let headerBottomY = topY + 48;

  if (logoImg && logoImg.width && logoImg.height) {
    const maxW = 210;
    const maxH = 60;
    const scaleFactor = Math.min(maxW / logoImg.width, maxH / logoImg.height);
    const w = logoImg.width * scaleFactor;
    const h = logoImg.height * scaleFactor;
    ctx.drawImage(logoImg, left, topY, w, h);
    ctx.fillStyle = "#64748b";
    setFont(12, 400);
    ctx.fillText("Control Panel Cash Memo", left, topY + h + 15);
    headerBottomY = topY + h + 24;
  } else {
    ctx.fillStyle = "#111827";
    setFont(20, 800);
    ctx.fillText(DEFAULT_COMPANY_NAME, left, topY + 22);
    ctx.fillStyle = "#64748b";
    setFont(13, 400);
    ctx.fillText("Control Panel Cash Memo", left, topY + 44);
    headerBottomY = topY + 54;
  }

  ctx.fillStyle = "#111827";
  setFont(22, 900);
  ctx.textAlign = "right";
  ctx.fillText(
    String(voucherTitle || "Cash Memo").toUpperCase(),
    right,
    topY + 22,
  );
  ctx.fillStyle = "#64748b";
  setFont(13, 400);
  ctx.fillText("Date: " + (date || "-"), right, topY + 44);
  ctx.textAlign = "left";

  let y = Math.max(115, headerBottomY);
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();

  y = y + 24;
  const typeBoxWidth = 136;
  const metaGap = 14;
  const metaRemainingWidth = right - left - typeBoxWidth - metaGap * 2;
  const voucherBoxWidth = metaRemainingWidth / 2;
  const refBoxWidth = metaRemainingWidth / 2;
  const refBoxX = left + voucherBoxWidth + metaGap;
  ctx.strokeStyle = "#334155";
  ctx.strokeRect(left, y, voucherBoxWidth, 50);
  ctx.strokeRect(refBoxX, y, refBoxWidth, 50);
  ctx.strokeRect(right - typeBoxWidth, y, typeBoxWidth, 50);

  ctx.fillStyle = "#64748b";
  setFont(12, 700);
  ctx.fillText("Voucher No", left + 13, y + 19);
  ctx.fillText("Ref No", refBoxX + 13, y + 19);
  ctx.fillStyle = "#111827";
  setFont(15, 900);
  drawWrappedText(
    ctx,
    voucherNo,
    left + 13,
    y + 38,
    voucherBoxWidth - 26,
    16,
    1,
  );
  drawWrappedText(
    ctx,
    refNo || "-",
    refBoxX + 13,
    y + 38,
    refBoxWidth - 26,
    16,
    1,
  );

  ctx.textAlign = "center";
  setFont(14, 900);
  ctx.fillText(
    isCashOut ? "CASH OUT" : "CASH IN",
    right - typeBoxWidth / 2,
    y + 31,
  );
  ctx.textAlign = "left";

  y = 206;
  const tableWidth = right - left;
  const headerHeight = 38;
  const rowHeight = 31;
  const labelWidth = 150;
  const tableHeight = headerHeight + rowHeight * detailRows.length;

  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 1;
  ctx.strokeRect(left, y, tableWidth, tableHeight);
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(left + 1, y + 1, tableWidth - 2, headerHeight - 1);
  ctx.fillStyle = "#111827";
  setFont(15, 900);
  ctx.fillText("Transaction Details", left + 12, y + 24);

  ctx.beginPath();
  ctx.moveTo(left, y + headerHeight);
  ctx.lineTo(right, y + headerHeight);
  ctx.moveTo(left + labelWidth, y + headerHeight);
  ctx.lineTo(left + labelWidth, y + tableHeight);
  ctx.stroke();

  detailRows.forEach(([label, value], index) => {
    const rowY = y + headerHeight + index * rowHeight;
    if (index > 0) {
      ctx.beginPath();
      ctx.moveTo(left, rowY);
      ctx.lineTo(right, rowY);
      ctx.stroke();
    }
    ctx.fillStyle = "#334155";
    setFont(13, 900);
    ctx.fillText(String(label), left + 12, rowY + 20);
    ctx.fillStyle = "#111827";
    setFont(13, 400);
    drawWrappedText(
      ctx,
      value,
      left + labelWidth + 12,
      rowY + 20,
      tableWidth - labelWidth - 24,
      15,
      1,
    );
  });

  y += tableHeight + 24;
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 2;
  ctx.strokeRect(left, y, tableWidth, 58);
  ctx.fillStyle = "#64748b";
  setFont(15, 700);
  ctx.fillText("Paid Amount", left + 14, y + 35);
  ctx.fillStyle = "#111827";
  ctx.textAlign = "right";
  setFont(25, 900);
  ctx.fillText(String(amount), right - 45, y + 36);
  setFont(10, 900);
  ctx.fillText("BDT", right - 14, y + 36);
  ctx.textAlign = "left";

  y += 82;
  ctx.fillStyle = "#111827";
  setFont(14, 900);
  ctx.fillText("Note", left, y);
  y += 12;
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 1;
  ctx.strokeRect(left, y, tableWidth, 104);
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(left, y + 104);
  ctx.stroke();
  ctx.fillStyle = "#111827";
  setFont(14, 400);
  drawWrappedText(ctx, note, left + 16, y + 32, tableWidth - 32, 22, 3);

  y = height - 96;
  const sigGap = 30;
  const sigWidth = (tableWidth - sigGap * 2) / 3;
  const labels = ["Prepared By", "Checked By", "Approved By"];
  labels.forEach((label, index) => {
    const sigX = left + index * (sigWidth + sigGap);
    ctx.strokeStyle = "#4b5563";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sigX, y);
    ctx.lineTo(sigX + sigWidth, y);
    ctx.stroke();
    ctx.fillStyle = "#374151";
    setFont(11, 900);
    ctx.textAlign = "center";
    ctx.fillText(label, sigX + sigWidth / 2, y + 25);
  });
  ctx.textAlign = "left";

  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: [widthMm, heightMm],
  });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, widthMm, heightMm);
  return pdf;
};

const STATIC_CATEGORIES = [
  "Office Expense",
  "Marketing",
  "Salary",
  "Transport",
  "Utility Bill",
  "Other",
];

const FILE_SERVER_BASE_URL = import.meta.env.VITE_API_URL;

const buildFileUrl = (filePath) => {
  const normalizedPath = String(filePath || "")
    .trim()
    .replace(/\\/g, "/");

  if (!normalizedPath) return "";

  if (/^https?:\/\//i.test(normalizedPath)) {
    return encodeURI(normalizedPath);
  }

  const safeBaseUrl = FILE_SERVER_BASE_URL.trim().replace(/\/+$/, "");
  const safePath = normalizedPath.startsWith("/")
    ? normalizedPath
    : `/${normalizedPath}`;

  return encodeURI(`${safeBaseUrl}${safePath}`);
};

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "null");
  } catch {
    return null;
  }
};

const getReportUserName = () => {
  const user = readStoredUser();
  const fullName = `${user?.FirstName || ""} ${user?.LastName || ""}`.trim();

  return (
    fullName ||
    user?.Name ||
    user?.name ||
    user?.Email ||
    user?.email ||
    localStorage.getItem("role") ||
    "Unknown"
  );
};

const formatReportDate = (value) => {
  if (!value) return "";
  const parts = String(value).slice(0, 10).split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return String(value);
};

const CashInOutTable = () => {
  const { language } = useLayout();
  const t = translations[language] || translations.EN;
  const { id } = useParams(); // bookId

  const [isModalOpen, setIsModalOpen] = useState(false); // edit
  const [isModalOpen1, setIsModalOpen1] = useState(false); // add
  const [, setIsModalOpen2] = useState(false); // delete/note
  const [isModalOpen3, setIsModalOpen3] = useState(false); // delete/note
  const [currentProduct, setCurrentProduct] = useState(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLoanId, setFilterLoanId] = useState("");
  const [isCreateNoteFocused, setIsCreateNoteFocused] = useState(false);
  const [isCreateCashOutNoteFocused, setIsCreateCashOutNoteFocused] =
    useState(false);

  const userId = localStorage.getItem("userId");

  const [createProduct, setCreateProduct] = useState({
    paymentMode: "",
    paymentStatus: "",
    bankName: "",
    bankAccount: "",
    partyType: "",
    supplierId: "",
    dollarSupplierId: "",
    manufacturerId: "",
    packagingManufacturerId: "",
    ownerId: "",
    directorId: "",
    lender: "",
    loanId: "",
    note: "",
    status: "",
    category: "",
    categoryId: "",
    remarks: "",
    refNo: "",
    fromParty: "",
    amount: "",
    file: null,
    date: new Date().toISOString().slice(0, 10),
  });
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const [products, setProducts] = useState([]);

  // filters
  const defaultDateRange = useMemo(() => getDatePresetRange("last30"), []);
  const [startDate, setStartDate] = useState(defaultDateRange.from);
  const [endDate, setEndDate] = useState(defaultDateRange.to);
  const [filterPaymentMode, setFilterPaymentMode] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");

  // ✅ Category states
  const [categories, setCategories] = useState([]);
  const [isNewCategoryAdd, setIsNewCategoryAdd] = useState(false);
  const [newCategoryNameAdd, setNewCategoryNameAdd] = useState("");
  const role = localStorage.getItem("role");
  const [isNewCategoryEdit, setIsNewCategoryEdit] = useState(false);
  const [newCategoryNameEdit, setNewCategoryNameEdit] = useState("");
  const [supplier, setSupplier] = useState("");

  const [isNewBankAccountAdd, setIsNewBankAccountAdd] = useState(false);
  const [newBankNameAdd, setNewBankNameAdd] = useState("");
  const [newAccountNumberAdd, setNewAccountNumberAdd] = useState("");
  const [isNewBankAccountEdit, setIsNewBankAccountEdit] = useState(false);
  const [newBankNameEdit, setNewBankNameEdit] = useState("");
  const [newAccountNumberEdit, setNewAccountNumberEdit] = useState("");

  //Pagination calculation start
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

  const isLoanCategory = (category) =>
    String(category || "")
      .trim()
      .toLowerCase() === "loan";

  const getPartyTypeFromRow = (row) => {
    if (row?.supplierId) return "Supplier";
    if (row?.dollarSupplierId) return "Dollar Supplier";
    if (row?.manufacturerId) return "Manufacturer";
    if (row?.packagingManufacturerId) return "Packaging Manufacturer";
    if (row?.loanId) return "Lender";
    if (row?.ownerId) return "Owner";
    if (row?.directorId) return "Director";
    return "";
  };

  const getPartySelectionError = (value) => {
    if (
      value?.partyType === "Supplier" &&
      !String(value?.supplierId || "").trim()
    ) {
      return "Supplier is required!";
    }
    if (
      value?.partyType === "Dollar Supplier" &&
      !String(value?.dollarSupplierId || "").trim()
    ) {
      return "Dollar Supplier is required!";
    }
    if (
      value?.partyType === "Manufacturer" &&
      !String(value?.manufacturerId || "").trim()
    ) {
      return "Manufacturer is required!";
    }
    if (
      value?.partyType === "Packaging Manufacturer" &&
      !String(value?.packagingManufacturerId || "").trim()
    ) {
      return "Packaging Manufacturer is required!";
    }
    if (value?.partyType === "Lender" && !String(value?.loanId || "").trim()) {
      return "Lender is required!";
    }
    if (value?.partyType === "Owner" && !String(value?.ownerId || "").trim()) {
      return "Owner is required!";
    }
    if (
      value?.partyType === "Director" &&
      !String(value?.directorId || "").trim()
    ) {
      return "Director is required!";
    }
    return "";
  };

  useEffect(() => {
    const updatePagesPerSet = () => {
      if (window.innerWidth < 640) setPagesPerSet(5);
      else if (window.innerWidth < 1024) setPagesPerSet(7);
      else setPagesPerSet(10);
    };
    updatePagesPerSet();
    window.addEventListener("resize", updatePagesPerSet);
    return () => window.removeEventListener("resize", updatePagesPerSet);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [startDate, endDate, itemsPerPage]);

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    if (pageNumber < startPage) setStartPage(pageNumber);
    else if (pageNumber > endPage) setStartPage(pageNumber - pagesPerSet + 1);
  };

  const handlePreviousSet = () =>
    setStartPage((prev) => Math.max(prev - pagesPerSet, 1));

  const handleNextSet = () =>
    setStartPage((prev) =>
      Math.min(prev + pagesPerSet, totalPages - pagesPerSet + 1),
    );

  //Pagination calculation end

  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [
    startDate,
    endDate,
    filterPaymentMode,
    filterPaymentStatus,
    filterCategory,
    filterLoanId,
  ]);

  useEffect(() => {
    if (startDate && endDate && startDate > endDate) setEndDate(startDate);
  }, [startDate, endDate]);

  // ✅ Bank না হলে bank fields reset (Add)
  useEffect(() => {
    if (createProduct.paymentMode !== "Bank") {
      if (createProduct.bankName || createProduct.bankAccount) {
        setCreateProduct((p) => ({ ...p, bankName: "", bankAccount: "" }));
      }
    }
  }, [createProduct.paymentMode]);

  useEffect(() => {
    if (
      !isLoanCategory(createProduct.category) &&
      createProduct.partyType !== "Lender" &&
      (createProduct.lender || createProduct.loanId)
    ) {
      setCreateProduct((p) => ({ ...p, lender: "", loanId: "" }));
    }
  }, [createProduct.category, createProduct.partyType]);

  // ✅ Bank না হলে bank fields reset (Edit)
  useEffect(() => {
    if (!currentProduct) return;
    if (currentProduct.paymentMode !== "Bank") {
      if (currentProduct.bankName || currentProduct.bankAccount) {
        setCurrentProduct((p) => ({ ...p, bankName: "", bankAccount: "" }));
      }
    }
  }, [currentProduct?.paymentMode]);

  useEffect(() => {
    if (!currentProduct) return;
    if (
      !isLoanCategory(currentProduct.category) &&
      currentProduct.partyType !== "Lender" &&
      (currentProduct.lender || currentProduct.loanId)
    ) {
      setCurrentProduct((p) => ({ ...p, lender: "", loanId: "" }));
    }
  }, [currentProduct?.category, currentProduct?.partyType]);

  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      bookId: id,
      category: filterCategory || undefined,
      loanId: filterLoanId || undefined,
      supplierId: supplier || undefined,
      paymentMode: filterPaymentMode || undefined,
      paymentStatus: filterPaymentStatus || undefined,
      searchTerm: debouncedSearchTerm || undefined, // ensure it's included in the query
    };

    Object.keys(args).forEach((k) => {
      if (args[k] === undefined || args[k] === null || args[k] === "")
        delete args[k]; // Clean empty or undefined values
    });

    return args;
  }, [
    currentPage,
    itemsPerPage,
    startDate,
    endDate,
    id,
    filterPaymentMode,
    filterPaymentStatus,
    filterCategory,
    filterLoanId,
    supplier,
    debouncedSearchTerm,
  ]);

  const { data, isLoading, isError, error, refetch } =
    useGetAllCashInOutQuery(queryArgs);
  const { data: allCashInOutRes } = useGetAllCashInOutWithoutQueryQuery();
  const { data: logoData } = useGetAllLogoQuery();
  const logoUrl = buildAssetUrl(logoData?.data?.file);
  useEffect(() => {
    if (isError) console.error("Error:", error);
    if (!isLoading && data) {
      setProducts(data?.data ?? []);
      setTotalPages(Math.ceil((data?.meta?.count || 0) / itemsPerPage) || 1);
    }
  }, [data, isLoading, isError, error, itemsPerPage]);

  const formatVoucherDate = (value) => {
    if (!value) return "-";
    const normalizedDate = String(value).slice(0, 10);
    const parts = normalizedDate.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("en-GB");
  };

  const previousVoucherSuggestions = useMemo(() => {
    const rows = Array.isArray(allCashInOutRes?.data)
      ? allCashInOutRes.data
      : [];
    const currentNote = String(createProduct.remarks || "")
      .trim()
      .toLowerCase();

    return rows
      .filter((row) => String(row?.bookId ?? "") === String(id ?? ""))
      .filter((row) => String(row?.remarks || row?.note || "").trim())
      .filter((row) => {
        if (!currentNote) return true;
        const text = [
          row?.remarks,
          row?.note,
          row?.category,
          row?.voucherNo,
          row?.voucher_no,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(currentNote);
      })
      .sort((a, b) => new Date(b?.date || 0) - new Date(a?.date || 0))
      .slice(0, 6)
      .map((row) => ({
        id: row?.Id ?? row?.id,
        date: formatVoucherDate(row?.date),
        category: row?.category || "-",
        note: row?.remarks || row?.note || "",
        voucherNo:
          row?.voucherNo || row?.voucher_no || row?.voucherNumber || "-",
      }));
  }, [allCashInOutRes, createProduct.remarks, id]);

  const { data: allLoanRes } = useGetAllLoanWithoutQueryQuery();
  const loans = Array.isArray(allLoanRes?.data) ? allLoanRes.data : [];
  const activeLoans = useMemo(
    () =>
      loans.filter(
        (loan) =>
          String(loan.status || "Active")
            .trim()
            .toLowerCase() === "active",
      ),
    [loans],
  );

  // book info (name for report header)
  const { data: bookRes } = useGetSingleBookDataByIdQuery(id, { skip: !id });
  const bookName = bookRes?.data?.name || "";

  // ✅ Category: fetch all
  const {
    data: categoryRes,
    isLoading: categoryLoading,
    isError: isCategoryError,
    error: categoryError,
  } = useGetAllCategoryQuery();

  useEffect(() => {
    if (isCategoryError) console.error("Category error:", categoryError);
    if (!categoryLoading && categoryRes) {
      setCategories(categoryRes?.data ?? []);
    }
  }, [categoryRes, categoryLoading, isCategoryError, categoryError]);

  // ✅ Category options: static + api
  const categoryOptions = useMemo(() => {
    const staticOnes = STATIC_CATEGORIES.map((name) => ({
      id: `static:${name}`,
      name,
      isStatic: true,
    }));

    const fromApi = (categories || []).map((c) => ({
      id: String(c.Id ?? c.id ?? c._id),
      name: c.name,
      isStatic: false,
    }));

    // de-dup by name
    const seen = new Set();
    const merged = [...staticOnes, ...fromApi].filter((x) => {
      const k = String(x.name || "")
        .toLowerCase()
        .trim();
      if (!k) return false;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    return merged;
  }, [categories]);

  const paymentModeOptions = useMemo(
    () =>
      ["Cash", "Bkash", "Nagad", "Rocket", "Bank", "Card"].map((mode) => ({
        value: mode,
        label: mode,
      })),
    [],
  );

  const paymentStatusOptions = useMemo(
    () =>
      ["CashIn", "CashOut"].map((status) => ({
        value: status,
        label: status,
      })),
    [],
  );

  const { data: bankAccountRes } = useGetAllBankAccountWithoutQueryQuery();
  const bankAccountsFromDB = bankAccountRes?.data || [];
  const [insertBankAccount] = useInsertBankAccountMutation();

  const bankOptions = useMemo(() => {
    const seen = new Set();
    return bankAccountsFromDB
      .filter((ba) => {
        const key = (ba.bankName || "").toLowerCase().trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((ba) => ({ value: ba.bankName, label: ba.bankName }));
  }, [bankAccountsFromDB]);

  const getBankAccountOptions = (bankName = "") =>
    bankAccountsFromDB
      .filter(
        (ba) =>
          !bankName || String(ba.bankName || "") === String(bankName || ""),
      )
      .map((ba) => ({
        value: ba.accountNumber,
        label: `${ba.accountNumber} (${ba.bankName})`,
        bankName: ba.bankName,
      }));

  const getBankAccountSelectOptions = (bankName = "") => [
    ...getBankAccountOptions(bankName),
    { value: "__new_bank__", label: "+ New Bank Account" },
  ];

  const categoryFilterOptions = useMemo(
    () =>
      categoryOptions.map((c) => ({
        value: c.name,
        label: c.name,
      })),
    [categoryOptions],
  );

  const categorySelectOptions = useMemo(
    () => [
      ...categoryOptions.map((c) => ({
        value: c.name,
        label: c.name,
      })),
      { value: "__new__", label: "+ New Category" },
    ],
    [categoryOptions],
  );

  const findCategoryOptionByName = (name) => {
    const key = String(name || "")
      .trim()
      .toLowerCase();
    if (!key) return null;

    return (
      categoryOptions.find(
        (category) =>
          String(category.name || "")
            .trim()
            .toLowerCase() === key,
      ) || null
    );
  };

  // ✅ Insert category mutation
  const [insertCategory, { isLoading: isAddingCategory }] =
    useInsertCategoryMutation();

  const addCategoryByName = async (name) => {
    const n = name.trim();
    if (!n) {
      toast.error("New category name is required!");
      return null;
    }

    try {
      const res = await insertCategory({ name: n }).unwrap();
      if (res?.success) {
        const created = res?.data;
        return {
          id: String(created?.Id ?? created?.id ?? created?._id ?? ""),
          name: created?.name || n,
        };
      }
      toast.error(res?.message || "Category add failed!");
      return null;
    } catch (err) {
      toast.error(err?.data?.message || "Category add failed!");
      return null;
    }
  };

  const addBankAccount = async (bankName, accountNumber) => {
    if (!bankName?.trim() || !accountNumber?.trim()) {
      toast.error("Bank name and account number are required!");
      return null;
    }
    try {
      const res = await insertBankAccount({
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
      }).unwrap();
      if (res?.success) {
        toast.success("Bank account added!");
        return res?.data;
      }
      toast.error(res?.message || "Bank account add failed!");
      return null;
    } catch (err) {
      toast.error(err?.data?.message || "Bank account add failed!");
      return null;
    }
  };

  const resetCreateProduct = () => {
    setCreateProduct({
      paymentMode: "",
      paymentStatus: "",
      bankName: "",
      bankAccount: "",
      partyType: "",
      supplierId: "",
      dollarSupplierId: "",
      manufacturerId: "",
      packagingManufacturerId: "",
      ownerId: "",
      directorId: "",
      lender: "",
      loanId: "",
      note: "",
      status: "",
      category: "",
      categoryId: "",
      remarks: "",
      refNo: "",
      fromParty: "",
      amount: "",
      file: null,
      date: new Date().toISOString().slice(0, 10),
    });
    setIsNewCategoryAdd(false);
    setNewCategoryNameAdd("");
    setIsNewBankAccountAdd(false);
    setNewBankNameAdd("");
    setNewAccountNumberAdd("");
  };

  // modals
  const handleAddCashIn = () => {
    resetCreateProduct();
    setIsModalOpen1(true);
  };
  const handleAddCashOut = () => {
    resetCreateProduct();
    setIsModalOpen3(true);
  };
  const handleModalClose1 = () => {
    setIsModalOpen1(false);
    setIsNewCategoryAdd(false);
    setNewCategoryNameAdd("");
    setIsNewBankAccountAdd(false);
    setNewBankNameAdd("");
    setNewAccountNumberAdd("");
  };
  const handleModalClose3 = () => {
    setIsModalOpen3(false);
    setIsNewCategoryAdd(false);
    setNewCategoryNameAdd("");
    setIsNewBankAccountAdd(false);
    setNewBankNameAdd("");
    setNewAccountNumberAdd("");
  };

  const handleEditClick = (rp) => {
    setCurrentProduct({
      ...rp,
      paymentMode: rp.paymentMode ?? "",
      paymentStatus: rp.paymentStatus ?? "",
      amount: rp.amount ?? "",
      bankName: rp.bankName ?? "",
      bankAccount: rp.bankAccount ?? "",
      partyType: getPartyTypeFromRow(rp),
      supplierId: rp.supplierId ?? "",
      dollarSupplierId: rp.dollarSupplierId ?? "",
      manufacturerId: rp.manufacturerId ?? "",
      packagingManufacturerId: rp.packagingManufacturerId ?? "",
      ownerId: rp.ownerId ?? "",
      directorId: rp.directorId ?? "",
      loanId: rp.loanId ?? rp.loan?.Id ?? "",
      lender:
        rp.loan?.name ??
        rp.lender ??
        rp.loanName ??
        rp.loan_person_name ??
        rp.loanPersonName ??
        "",
      note: rp.note ?? "",
      status: rp.status ?? "",
      date: rp.date ?? "",
      userId: userId,
      category: rp.categoryInfo?.name ?? rp.category ?? "",
      categoryId: rp.categoryId ?? rp.categoryInfo?.Id ?? "",
      refNo: rp.refNo ?? "",
      file: null,
    });
    setIsNewCategoryEdit(false);
    setNewCategoryNameEdit("");
    setIsNewBankAccountEdit(false);
    setNewBankNameEdit("");
    setNewAccountNumberEdit("");
    setIsModalOpen(true);
  };

  const handleEditClick1 = (rp) => {
    setCurrentProduct({
      ...rp,
      paymentMode: rp.paymentMode ?? "",
      paymentStatus: rp.paymentStatus ?? "",
      amount: rp.amount ?? "",
      bankName: rp.bankName ?? "",
      partyType: getPartyTypeFromRow(rp),
      supplierId: rp.supplierId ?? "",
      dollarSupplierId: rp.dollarSupplierId ?? "",
      manufacturerId: rp.manufacturerId ?? "",
      packagingManufacturerId: rp.packagingManufacturerId ?? "",
      ownerId: rp.ownerId ?? "",
      directorId: rp.directorId ?? "",
      loanId: rp.loanId ?? rp.loan?.Id ?? "",
      lender:
        rp.loan?.name ??
        rp.lender ??
        rp.loanName ??
        rp.loan_person_name ??
        rp.loanPersonName ??
        "",
      bankAccount: rp.bankAccount ?? "",
      note: rp.note ?? "",
      status: rp.status ?? "",
      userId: userId,
      category: rp.categoryInfo?.name ?? rp.category ?? "",
      categoryId: rp.categoryId ?? rp.categoryInfo?.Id ?? "",
      refNo: rp.refNo ?? "",
      file: null,
    });
    setIsNewCategoryEdit(false);
    setNewCategoryNameEdit("");
    setIsNewBankAccountEdit(false);
    setNewBankNameEdit("");
    setNewAccountNumberEdit("");
    setIsModalOpen2(true);
  };

  // update
  const [updateCashInOut] = useUpdateCashInOutMutation();

  const handleUpdateProduct = async () => {
    const rowId = currentProduct?.Id ?? currentProduct?.id;
    if (!rowId) return toast.error("Invalid item!");

    try {
      let finalCategoryName = currentProduct.category;
      let finalCategoryId = currentProduct.categoryId || "";

      if (
        (isLoanCategory(finalCategoryName) ||
          currentProduct.partyType === "Lender") &&
        !String(currentProduct.loanId || "").trim()
      ) {
        return toast.error("Loan is required!");
      }

      const partySelectionError = getPartySelectionError(currentProduct);
      if (partySelectionError) return toast.error(partySelectionError);

      // If the category is new and being added dynamically
      if (isNewCategoryEdit) {
        const createdCategory = await addCategoryByName(newCategoryNameEdit);
        if (!createdCategory) return;
        finalCategoryName = createdCategory.name;
        finalCategoryId = createdCategory.id;
      } else {
        const selectedCategory = findCategoryOptionByName(finalCategoryName);
        finalCategoryId = selectedCategory?.isStatic
          ? ""
          : selectedCategory?.id || finalCategoryId;
      }

      const formData = new FormData();
      formData.append("paymentMode", currentProduct.paymentMode);
      formData.append("paymentStatus", currentProduct.paymentStatus);
      formData.append(
        "note",
        (currentProduct.note || currentProduct.remarks || "").trim(),
      );
      formData.append("partyType", currentProduct?.partyType || "");
      formData.append(
        "supplierId",
        currentProduct?.partyType === "Supplier"
          ? currentProduct?.supplierId || ""
          : "",
      );
      formData.append(
        "dollarSupplierId",
        currentProduct?.partyType === "Dollar Supplier"
          ? currentProduct?.dollarSupplierId || ""
          : "",
      );
      formData.append(
        "manufacturerId",
        currentProduct?.partyType === "Manufacturer"
          ? currentProduct?.manufacturerId || ""
          : "",
      );
      formData.append(
        "packagingManufacturerId",
        currentProduct?.partyType === "Packaging Manufacturer"
          ? currentProduct?.packagingManufacturerId || ""
          : "",
      );
      formData.append(
        "loanId",
        currentProduct?.partyType === "Lender" ||
          isLoanCategory(finalCategoryName)
          ? currentProduct?.loanId || ""
          : "",
      );
      formData.append(
        "ownerId",
        currentProduct?.partyType === "Owner"
          ? currentProduct?.ownerId || ""
          : "",
      );
      formData.append(
        "directorId",
        currentProduct?.partyType === "Director"
          ? currentProduct?.directorId || ""
          : "",
      );
      formData.append("lender", selectedEditLoan?.name || "");
      formData.append("status", currentProduct.status);
      formData.append("date", currentProduct.date);
      formData.append("userId", userId);
      formData.append("actorRole", role);
      formData.append("bookId", id);

      formData.append(
        "bankName",
        currentProduct.paymentMode === "Bank" ? currentProduct.bankName : "",
      );
      formData.append(
        "bankAccount",
        currentProduct.paymentMode === "Bank"
          ? String(currentProduct.bankAccount)
          : "",
      );

      formData.append("category", finalCategoryName);
      formData.append("categoryId", finalCategoryId);
      formData.append("remarks", currentProduct.remarks?.trim() || "");
      formData.append("refNo", currentProduct.refNo?.trim() || "");
      formData.append("fromParty", currentProduct.fromParty?.trim() || "");
      formData.append("amount", String(Number(currentProduct.amount)));
      if (currentProduct.file) formData.append("file", currentProduct.file);

      const res = await updateCashInOut({ id: rowId, data: formData }).unwrap();
      if (res?.success) {
        toast.success("Successfully updated!");

        setIsModalOpen(false);
        setCurrentProduct(null);
        setIsNewCategoryEdit(false);
        setNewCategoryNameEdit("");
        setIsNewBankAccountEdit(false);
        setNewBankNameEdit("");
        setNewAccountNumberEdit("");
        refetch?.();
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const [insertCashIn] = useInsertCashInOutMutation();

  const handleCreateProduct = async (e) => {
    e.preventDefault();

    // Ensure required fields are filled
    if (!createProduct.amount) return toast.error("Amount is required!");
    if (!createProduct.paymentMode)
      return toast.error("Payment Mode is required!");

    // Bank details check
    if (createProduct.paymentMode === "Bank") {
      if (!createProduct.bankName) return toast.error("Bank Name is required!");
      if (!createProduct.bankAccount)
        return toast.error("Bank Account is required!");
    }

    // Category check - Make sure categoryName is either selected or added
    if (!createProduct.category && !isNewCategoryAdd) {
      return toast.error("Category is required!");
    }

    try {
      // Handling new category creation
      let finalCategoryName = createProduct.category;
      let finalCategoryId = createProduct.categoryId || "";

      // If the category is new and being added dynamically
      if (isNewCategoryAdd) {
        const createdCategory = await addCategoryByName(newCategoryNameAdd);
        if (!createdCategory) return;
        finalCategoryName = createdCategory.name;
        finalCategoryId = createdCategory.id;
      } else {
        const selectedCategory = findCategoryOptionByName(finalCategoryName);
        finalCategoryId = selectedCategory?.isStatic
          ? ""
          : selectedCategory?.id || finalCategoryId;
      }

      if (
        (isLoanCategory(finalCategoryName) ||
          createProduct.partyType === "Lender") &&
        !String(createProduct.loanId || "").trim()
      ) {
        return toast.error("Loan is required!");
      }

      const partySelectionError = getPartySelectionError(createProduct);
      if (partySelectionError) return toast.error(partySelectionError);

      // Form data preparation for submission
      const formData = new FormData();
      formData.append("voucherPrefix", "KM-");
      formData.append("paymentMode", createProduct.paymentMode);
      formData.append("paymentStatus", "CashIn");
      formData.append("fromParty", createProduct.fromParty?.trim() || "");
      formData.append("date", createProduct.date);
      formData.append(
        "note",
        (createProduct.note || createProduct.remarks || "").trim(),
      );

      formData.append(
        "bankName",
        createProduct.paymentMode === "Bank" ? createProduct.bankName : "",
      );
      formData.append(
        "bankAccount",
        createProduct.paymentMode === "Bank"
          ? String(createProduct.bankAccount)
          : "",
      );

      formData.append("category", finalCategoryName);
      formData.append("categoryId", finalCategoryId);
      formData.append("remarks", createProduct.remarks?.trim() || "");
      formData.append("refNo", createProduct.refNo?.trim() || "");
      formData.append("amount", String(Number(createProduct.amount)));
      formData.append("bookId", id);
      formData.append("actorRole", role);
      formData.append("partyType", createProduct?.partyType || "");
      formData.append(
        "supplierId",
        createProduct?.partyType === "Supplier"
          ? createProduct?.supplierId || ""
          : "",
      );
      formData.append(
        "dollarSupplierId",
        createProduct?.partyType === "Dollar Supplier"
          ? createProduct?.dollarSupplierId || ""
          : "",
      );
      formData.append(
        "manufacturerId",
        createProduct?.partyType === "Manufacturer"
          ? createProduct?.manufacturerId || ""
          : "",
      );
      formData.append(
        "packagingManufacturerId",
        createProduct?.partyType === "Packaging Manufacturer"
          ? createProduct?.packagingManufacturerId || ""
          : "",
      );
      formData.append(
        "loanId",
        createProduct?.partyType === "Lender" ||
          isLoanCategory(finalCategoryName)
          ? createProduct?.loanId || ""
          : "",
      );
      formData.append(
        "ownerId",
        createProduct?.partyType === "Owner"
          ? createProduct?.ownerId || ""
          : "",
      );
      formData.append(
        "directorId",
        createProduct?.partyType === "Director"
          ? createProduct?.directorId || ""
          : "",
      );
      formData.append("lender", selectedCreateLoan?.name || "");
      if (createProduct.file) formData.append("file", createProduct.file);

      const res = await insertCashIn(formData).unwrap();

      if (res?.success) {
        toast.success("Successfully created!");
        setIsModalOpen1(false);
        setIsNewCategoryAdd(false);
        setNewCategoryNameAdd("");
        resetCreateProduct();
        refetch?.();
      } else toast.error(res?.message || "Create failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  const handleCreateProduct1 = async (e) => {
    e.preventDefault();

    // Ensure required fields are filled
    if (!createProduct.amount) return toast.error("Amount is required!");
    if (!createProduct.paymentMode)
      return toast.error("Payment Mode is required!");

    // Bank details check
    if (createProduct.paymentMode === "Bank") {
      if (!createProduct.bankName) return toast.error("Bank Name is required!");
      if (!createProduct.bankAccount)
        return toast.error("Bank Account is required!");
    }

    // Category check - Make sure category is either selected or added
    if (!createProduct.category && !isNewCategoryAdd) {
      return toast.error("Category is required!");
    }

    try {
      // Handling new category creation
      let finalCategoryName = createProduct.category;
      let finalCategoryId = createProduct.categoryId || "";

      // If the category is new and being added dynamically
      if (isNewCategoryAdd) {
        const createdCategory = await addCategoryByName(newCategoryNameAdd);
        if (!createdCategory) return;
        finalCategoryName = createdCategory.name;
        finalCategoryId = createdCategory.id;
      } else {
        const selectedCategory = findCategoryOptionByName(finalCategoryName);
        finalCategoryId = selectedCategory?.isStatic
          ? ""
          : selectedCategory?.id || finalCategoryId;
      }

      if (
        (isLoanCategory(finalCategoryName) ||
          createProduct.partyType === "Lender") &&
        !String(createProduct.loanId || "").trim()
      ) {
        return toast.error("Loan is required!");
      }

      const partySelectionError = getPartySelectionError(createProduct);
      if (partySelectionError) return toast.error(partySelectionError);

      // Form data preparation for submission
      const formData = new FormData();
      formData.append("voucherPrefix", "KM-");
      formData.append("paymentMode", createProduct.paymentMode);
      formData.append("paymentStatus", "CashOut");
      formData.append("date", createProduct.date);
      formData.append(
        "note",
        (createProduct.note || createProduct.remarks || "").trim(),
      );

      formData.append(
        "bankName",
        createProduct.paymentMode === "Bank" ? createProduct.bankName : "",
      );
      formData.append(
        "bankAccount",
        createProduct.paymentMode === "Bank"
          ? String(createProduct.bankAccount)
          : "",
      );

      formData.append("category", finalCategoryName);
      formData.append("categoryId", finalCategoryId);
      formData.append("remarks", createProduct.remarks?.trim() || "");
      formData.append("refNo", createProduct.refNo?.trim() || "");
      formData.append("amount", String(Number(createProduct.amount)));
      formData.append("bookId", id);
      formData.append("actorRole", role);
      formData.append("partyType", createProduct?.partyType || "");
      formData.append(
        "supplierId",
        createProduct?.partyType === "Supplier"
          ? createProduct?.supplierId || ""
          : "",
      );
      formData.append(
        "dollarSupplierId",
        createProduct?.partyType === "Dollar Supplier"
          ? createProduct?.dollarSupplierId || ""
          : "",
      );
      formData.append(
        "manufacturerId",
        createProduct?.partyType === "Manufacturer"
          ? createProduct?.manufacturerId || ""
          : "",
      );
      formData.append(
        "packagingManufacturerId",
        createProduct?.partyType === "Packaging Manufacturer"
          ? createProduct?.packagingManufacturerId || ""
          : "",
      );
      formData.append(
        "loanId",
        createProduct?.partyType === "Lender" ||
          isLoanCategory(finalCategoryName)
          ? createProduct?.loanId || ""
          : "",
      );
      formData.append(
        "ownerId",
        createProduct?.partyType === "Owner"
          ? createProduct?.ownerId || ""
          : "",
      );
      formData.append(
        "directorId",
        createProduct?.partyType === "Director"
          ? createProduct?.directorId || ""
          : "",
      );
      formData.append("lender", selectedCreateLoan?.name || "");
      if (createProduct.file) formData.append("file", createProduct.file);

      const res = await insertCashIn(formData).unwrap();

      if (res?.success) {
        toast.success("Successfully created!");
        setIsModalOpen3(false);
        setIsNewCategoryAdd(false);
        setNewCategoryNameAdd("");
        setCreateProduct({
          paymentMode: "",
          paymentStatus: "",
          bankName: "",
          bankAccount: "",
          partyType: "",
          lender: "",
          loanId: "",
          supplierId: "",
          dollarSupplierId: "",
          manufacturerId: "",
          packagingManufacturerId: "",
          ownerId: "",
          directorId: "",
          category: "",
          categoryId: "",
          remarks: "",
          refNo: "",
          amount: "",
          date: "",
          file: null,
        });
        refetch?.();
      } else toast.error(res?.message || "Create failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  // delete
  const [deleteCashInOut, { isLoading: isDeletingCashInOut }] =
    useDeleteCashInOutMutation();
  const [deleteRequestId, setDeleteRequestId] = useState(null); // non-admin request delete
  const [deleteRequestNote, setDeleteRequestNote] = useState("");
  const [isDeleteRequestOpen, setIsDeleteRequestOpen] = useState(false);

  const isPrivilegedUser = role === "superAdmin" || role === "admin";

  const handleDeleteIconClick = (rowId) => {
    if (!rowId) return;
    if (isPrivilegedUser) {
      void handleDeleteProduct(rowId);
      return;
    }
    setDeleteRequestId(rowId);
    setDeleteRequestNote("");
    setIsDeleteRequestOpen(true);
  };

  const closeDeleteRequestModal = () => {
    setIsDeleteRequestOpen(false);
    setDeleteRequestId(null);
    setDeleteRequestNote("");
  };

  const submitDeleteRequest = async () => {
    if (!deleteRequestId) return;
    const note = String(deleteRequestNote || "").trim();
    if (!note) return toast.error("Delete request note is required!");

    try {
      const res = await deleteCashInOut({ id: deleteRequestId, note }).unwrap();
      if (res?.success) {
        toast.success(res?.message || "Delete request submitted!");
        closeDeleteRequestModal();
        refetch?.();
      } else toast.error(res?.message || "Delete request failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Delete request failed!");
    }
  };

  const handleDeleteProduct = async (id) => {
    const confirmed = await requestDeleteConfirmation({
      title: "Delete transaction?",
      message:
        "This transaction will be removed permanently. This action cannot be undone.",
    });
    if (!confirmed) return;

    try {
      const res = await deleteCashInOut({ id }).unwrap();
      if (res?.success !== false) {
        toast.success("Deleted!");
        refetch?.();
      } else toast.error(res?.message || "Delete failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStartDate(defaultDateRange.from);
    setEndDate(defaultDateRange.to);
    setFilterPaymentMode("");
    setFilterPaymentStatus("");
    setFilterCategory("");
    setFilterLoanId("");
    setSupplier("");
    setCurrentPage(1);
    setStartPage(1);
  };

  // report states
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);
  const [reportType, setReportType] = useState(""); // "pdf" | "sheet"
  const [reportBlob, setReportBlob] = useState(null);
  const [reportBlobUrl, setReportBlobUrl] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [sheetPreview, setSheetPreview] = useState({ header: [], rows: [] });
  const [voucherPreview, setVoucherPreview] = useState({
    open: false,
    blob: null,
    url: "",
    filename: "",
    title: "Voucher",
  });

  const closeReportPreview = () => {
    setIsReportPreviewOpen(false);
    setReportType("");
    setReportBlob(null);
    setSheetPreview({ header: [], rows: [] });
    setReportLoading(false);

    if (reportBlobUrl) {
      URL.revokeObjectURL(reportBlobUrl);
      setReportBlobUrl("");
    }
  };

  const closeVoucherPreview = () => {
    if (voucherPreview.url) URL.revokeObjectURL(voucherPreview.url);
    setVoucherPreview({
      open: false,
      blob: null,
      url: "",
      filename: "",
      title: "Voucher",
    });
  };

  const getReportMetadata = () => ({
    duration:
      startDate && endDate
        ? `${formatReportDate(startDate)} - ${formatReportDate(endDate)}`
        : startDate
          ? `From ${formatReportDate(startDate)}`
          : endDate
            ? `Until ${formatReportDate(endDate)}`
            : "All Data",
    generatedBy: getReportUserName(),
    generatedAt: new Date().toLocaleString(),
  });

  const handleReportPdf = async () => {
    try {
      if (!products.length) return toast.error("No data found!");

      setReportType("pdf");
      setReportLoading(true);
      setIsReportPreviewOpen(true);
      setIsReportMenuOpen(false);

      const blob = await generateCashInOutPdf({
        products,
        bookId: id,
        bookName,
        summary: data?.meta,
        metadata: getReportMetadata(),
        logoUrl,
      });

      const url = URL.createObjectURL(blob);
      setReportBlob(blob);
      setReportBlobUrl(url);
    } catch (e) {
      toast.error("PDF report generate failed!");
      closeReportPreview();
    } finally {
      setReportLoading(false);
    }
  };

  const handleReportSheet = () => {
    try {
      if (!products.length) return toast.error("No data found!");

      setReportType("sheet");
      setReportLoading(true);
      setIsReportPreviewOpen(true);
      setIsReportMenuOpen(false);

      const { blob, preview } = generateCashInOutXlsx({
        products,
        bookId: id,
        bookName,
        summary: data?.meta,
        metadata: getReportMetadata(),
      });

      const url = URL.createObjectURL(blob);

      setReportBlob(blob);
      setReportBlobUrl(url);
      setSheetPreview(preview);
    } catch (e) {
      toast.error("Sheet report generate failed!");
      closeReportPreview();
    } finally {
      setReportLoading(false);
    }
  };

  const createVoucherPdf = async (row) => {
    const voucherNo = row?.voucherNo || "-";
    const refNo = row?.refNo || "-";
    const voucherTitle = "Cash Memo";
    const isCashOut = row?.paymentStatus === "CashOut";
    const rowSupplier = suppliers.find(
      (item) => String(item.Id) === String(row?.supplierId),
    );
    const rowManufacturer = manufacturers.find(
      (item) => String(item.Id) === String(row?.manufacturerId),
    );
    const rowDollarSupplier = dollarSuppliers.find(
      (item) => String(item.Id) === String(row?.dollarSupplierId),
    );
    const receiverName =
      row?.supplier?.name ||
      row?.supplierName ||
      rowSupplier?.name ||
      rowSupplier?.supplierName ||
      row?.dollarSupplier?.name ||
      rowDollarSupplier?.name ||
      row?.manufacturer?.name ||
      rowManufacturer?.name ||
      "-";
    const amount = Number(row?.amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const voucherWidthMm = 5.75 * 25.4;
    const voucherHeightMm = 8.25 * 25.4;
    const safe = escapeVoucherHtml;
    const noteText = row?.remarks || row?.note || "-";
    // Cash In: money is received BY the company FROM the entered party.
    // Cash Out: money goes FROM the company TO the supplier/party.
    const companyName = bookName || "Kafela Mart";
    const fromLabel = isCashOut ? bookName || "-" : row?.fromParty || "-";
    const receiverLabel = isCashOut ? receiverName : companyName;
    const detailRows = [
      ["From", fromLabel],
      ["Receiver", receiverLabel],
      ["Category", row?.category || "-"],
      ["Payment Mode", row?.paymentMode || "-"],
      ["Bank", row?.paymentMode === "Bank" ? row?.bankName || "-" : "-"],
      [
        "Bank Account",
        row?.paymentMode === "Bank" ? row?.bankAccount || "-" : "-",
      ],
    ];
    const pdf = await renderVoucherPdfFromCanvas({
      voucherNo,
      refNo,
      voucherTitle,
      isCashOut,
      date: row?.date || "-",
      detailRows,
      amount,
      note: noteText,
      widthMm: voucherWidthMm,
      heightMm: voucherHeightMm,
      logoUrl,
    });

    return {
      pdf,
      filename: `${voucherNo}.pdf`,
      title: voucherTitle,
    };
  };

  const handleVoucherOpen = async (row) => {
    try {
      if (voucherPreview.url) URL.revokeObjectURL(voucherPreview.url);
      const { pdf, filename, title } = await createVoucherPdf(row);
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      setVoucherPreview({ open: true, blob, url, filename, title });
    } catch (error) {
      console.error("Voucher preview failed:", error);
      toast.error(
        `Voucher preview failed: ${error?.message || "Unknown error"}`,
      );
    }
  };

  const handleVoucherDownload = () => {
    if (!voucherPreview.blob || !voucherPreview.url) return;
    const a = document.createElement("a");
    a.href = voucherPreview.url;
    a.download = voucherPreview.filename || "cash-in-out-voucher.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleVoucherPrint = () => {
    if (!voucherPreview.url) return;
    const printWindow = window.open(voucherPreview.url, "_blank");
    if (!printWindow) {
      toast.error("Please allow popup to print voucher.");
      return;
    }
    printWindow.addEventListener("load", () => {
      printWindow.focus();
      printWindow.print();
    });
  };

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  const stripWorkflowNote = (value) =>
    String(value || "")
      .replace(/\[Approval pending for update\]/g, "")
      .replace(/\[Update request approved\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const handleNoteClick = (note) => {
    const cleaned = stripWorkflowNote(note);
    setNoteContent(cleaned || String(note || ""));
    setIsNoteModalOpen(true); // Open the modal
  };

  const handleModalClose = () => {
    setIsNoteModalOpen(false); // Close the modal
  };

  // ✅ suppliers
  const {
    data: allSupplierRes,
    isError: isErrorSupplier,
    error: errorSupplier,
  } = useGetAllSupplierWithoutQueryQuery();
  const suppliers = allSupplierRes?.data || [];

  useEffect(() => {
    if (isErrorSupplier)
      console.error("Error fetching suppliers", errorSupplier);
  }, [isErrorSupplier, errorSupplier]);

  // ✅ dollar suppliers (Book party type "Dollar Supplier", CashOut only)
  const { data: allDollarSupplierRes } =
    useGetAllDollarSupplierWithoutQueryQuery();
  const dollarSuppliers = allDollarSupplierRes?.data || [];
  const dollarSupplierOptions = useMemo(
    () =>
      (dollarSuppliers || []).map((s) => ({
        value: s.Id,
        label: s.name,
      })),
    [dollarSuppliers],
  );

  const supplierOptions = useMemo(
    () =>
      (suppliers || []).map((s) => ({
        value: s.Id,
        label: s.name,
      })),
    [suppliers],
  );

  const { data: allOwnerRes, isLoading: isOwnerLoading } =
    useGetAllOwnerWithoutQueryQuery();
  const owners = allOwnerRes?.data || [];
  const { data: allDirectorRes, isLoading: isDirectorLoading } =
    useGetAllDirectorWithoutQueryQuery();
  const directors = allDirectorRes?.data || [];

  const ownerOptions = useMemo(
    () =>
      (owners || []).map((owner) => ({
        value: owner.Id,
        label: `${owner.name} (Owner)`,
      })),
    [owners],
  );

  const directorOptions = useMemo(
    () =>
      (directors || []).map((director) => ({
        value: director.Id,
        label: `${director.name} (Director)`,
      })),
    [directors],
  );

  const { data: allManufacturerRes, isLoading: isManufacturerLoading } =
    useGetAllManufacturerWithoutQueryQuery();
  const manufacturers = allManufacturerRes?.data || [];

  const manufacturerOptions = useMemo(
    () =>
      (manufacturers || []).map((manufacturer) => ({
        value: manufacturer.Id,
        label: manufacturer.name,
      })),
    [manufacturers],
  );

  const renderManufacturerBalance = (manufacturerId) => {
    if (!manufacturerId) return null;

    if (isManufacturerLoading) {
      return (
        <p className="mt-2 text-xs font-semibold text-slate-500">
          Loading manufacturer balance...
        </p>
      );
    }

    const manufacturer = manufacturers.find(
      (item) => String(item.Id) === String(manufacturerId),
    );

    return (
      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-rose-700">
          Due: ৳{Number(manufacturer?.totalDue || 0).toLocaleString()}
        </span>
        <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-sky-700">
          Advance: ৳{Number(manufacturer?.totalAdvance || 0).toLocaleString()}
        </span>
      </div>
    );
  };

  const {
    data: allPackagingManufacturerRes,
    isLoading: isPackagingManufacturerLoading,
  } = useGetAllPackagingManufacturerWithoutQueryQuery();
  const packagingManufacturers = allPackagingManufacturerRes?.data || [];

  const packagingManufacturerOptions = useMemo(
    () =>
      (packagingManufacturers || []).map((manufacturer) => ({
        value: manufacturer.Id,
        label: manufacturer.name,
      })),
    [packagingManufacturers],
  );

  const renderPackagingManufacturerBalance = (packagingManufacturerId) => {
    if (!packagingManufacturerId) return null;

    if (isPackagingManufacturerLoading) {
      return (
        <p className="mt-2 text-xs font-semibold text-slate-500">
          Loading packaging manufacturer balance...
        </p>
      );
    }

    const manufacturer = packagingManufacturers.find(
      (item) => String(item.Id) === String(packagingManufacturerId),
    );

    return (
      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-rose-700">
          Due: ৳{Number(manufacturer?.totalDue || 0).toLocaleString()}
        </span>
        <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-sky-700">
          Advance: ৳{Number(manufacturer?.totalAdvance || 0).toLocaleString()}
        </span>
      </div>
    );
  };

  const getSupplierName = (row) => {
    const rowSupplier = suppliers.find(
      (item) => String(item.Id) === String(row?.supplierId),
    );

    return (
      row?.supplier?.name ||
      row?.supplierName ||
      rowSupplier?.name ||
      rowSupplier?.supplierName ||
      "---"
    );
  };

  const loanSelectOptions = useMemo(
    () =>
      (activeLoans || []).map((loan) => ({
        value: loan.Id,
        label: `${loan.name} (Lender)`,
      })),
    [activeLoans],
  );

  const partyTypeOptions = [
    { value: "Supplier", label: "Supplier" },
    { value: "Dollar Supplier", label: "Dollar Supplier" },
    { value: "Manufacturer", label: "Manufacturer" },
    { value: "Packaging Manufacturer", label: "Packaging Manufacturer" },
    { value: "Lender", label: "Lender" },
    { value: "Owner", label: "Owner" },
    { value: "Director", label: "Director" },
  ];
  const cashInPartyTypeOptions = partyTypeOptions.filter(
    (option) =>
      option.value !== "Supplier" &&
      option.value !== "Dollar Supplier" &&
      option.value !== "Manufacturer" &&
      option.value !== "Packaging Manufacturer",
  );

  const findLoanById = (loanId) =>
    activeLoans.find((loan) => String(loan.Id) === String(loanId));

  const selectedCreateLoan = findLoanById(createProduct?.loanId);
  const selectedEditLoan = findLoanById(currentProduct?.loanId);

  const renderLoanBalance = (loan) => {
    if (!loan) return null;
    return (
      <div className="mt-2 grid grid-cols-1 gap-1 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 sm:grid-cols-3">
        <span>
          নিয়েছি: ৳{Number(loan.totalLoanTaken || 0).toLocaleString()}
        </span>
        <span>পরিশোধ: ৳{Number(loan.totalLoanPaid || 0).toLocaleString()}</span>
        <span>পাবে: ৳{Number(loan.netBalance || 0).toLocaleString()}</span>
      </div>
    );
  };

  const [suppliersDue, setSuppliersDue] = useState([]);
  // ✅ Suppliers Due
  const activeSupplierId =
    createProduct?.supplierId || currentProduct?.supplierId || undefined;

  const queryArgs1 = useMemo(() => {
    const args = {
      supplierId: activeSupplierId,
    };
    Object.keys(args).forEach((k) => {
      if (args[k] === undefined || args[k] === null || args[k] === "")
        delete args[k];
    });
    return args;
  }, [activeSupplierId]);

  const {
    data: supplierHistoryData,
    isLoading: isSupplierHistoryLoading,
    isError: isSupplierHistoryError,
    error: supplierHistoryError,
  } = useGetAllSupplierHistoryQuery(queryArgs1);

  useEffect(() => {
    if (isSupplierHistoryError) {
      console.error(
        "Error fetching received product data",
        supplierHistoryError,
      );
      return;
    }
    if (!isSupplierHistoryLoading && supplierHistoryData) {
      setSuppliersDue(supplierHistoryData || []);
    }
  }, [
    supplierHistoryData,
    isSupplierHistoryLoading,
    isSupplierHistoryError,
    supplierHistoryError,
  ]);

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 14,
      borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0",
      boxShadow: state.isFocused ? "0 0 0 4px rgba(99,102,241,0.15)" : "none",
      "&:hover": { borderColor: "#cbd5e1" },
    }),
    valueContainer: (base) => ({ ...base, padding: "0 12px" }),
    placeholder: (base) => ({ ...base, color: "#64748b" }),
    menu: (base) => ({ ...base, borderRadius: 14, overflow: "hidden" }),
  };

  const supplierBalance = suppliersDue?.meta || {};
  const supplierDueAmount = Number(
    supplierBalance.totalDue ?? supplierBalance.totalUnpaid ?? 0,
  );
  const supplierAdvanceAmount = Number(
    supplierBalance.totalAdvance ?? supplierBalance.netBalance ?? 0,
  );
  const renderSupplierBalance = (supplierId) => {
    if (!supplierId) return null;

    if (isSupplierHistoryLoading) {
      return (
        <p className="mt-2 text-xs font-semibold text-slate-500">
          Loading supplier balance...
        </p>
      );
    }

    return (
      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-rose-700">
          Due: ৳{supplierDueAmount.toLocaleString()}
        </span>
        <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-sky-700">
          Advance: ৳{supplierAdvanceAmount.toLocaleString()}
        </span>
      </div>
    );
  };

  // ✅ Dollar supplier balance (Due / Paid / Advance)
  const activeDollarSupplierId =
    createProduct?.dollarSupplierId ||
    currentProduct?.dollarSupplierId ||
    undefined;

  const dollarSupplierHistoryArgs = useMemo(() => {
    const args = { dollarSupplierId: activeDollarSupplierId };
    Object.keys(args).forEach((k) => {
      if (args[k] === undefined || args[k] === null || args[k] === "")
        delete args[k];
    });
    return args;
  }, [activeDollarSupplierId]);

  const {
    data: dollarSupplierHistoryData,
    isLoading: isDollarSupplierHistoryLoading,
  } = useGetAllDollarSupplierHistoryQuery(dollarSupplierHistoryArgs, {
    skip: !activeDollarSupplierId,
  });

  const dollarSupplierBalance = dollarSupplierHistoryData?.meta || {};
  const dollarSupplierDueAmount = Number(
    dollarSupplierBalance.totalDue ?? dollarSupplierBalance.totalUnpaid ?? 0,
  );
  const dollarSupplierPaidAmount = Number(
    dollarSupplierBalance.totalPaid ?? 0,
  );
  const dollarSupplierAdvanceAmount = Number(
    dollarSupplierBalance.totalAdvance ?? dollarSupplierBalance.netBalance ?? 0,
  );

  const renderDollarSupplierBalance = (dollarSupplierId) => {
    if (!dollarSupplierId) return null;

    if (isDollarSupplierHistoryLoading) {
      return (
        <p className="mt-2 text-xs font-semibold text-slate-500">
          Loading dollar supplier balance...
        </p>
      );
    }

    return (
      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-rose-700">
          Due: ৳{dollarSupplierDueAmount.toLocaleString()}
        </span>
        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-emerald-700">
          Paid: ৳{dollarSupplierPaidAmount.toLocaleString()}
        </span>
        <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-sky-700">
          Advance: ৳{dollarSupplierAdvanceAmount.toLocaleString()}
        </span>
      </div>
    );
  };

  const renderPartyFields = (
    value,
    onChange,
    { showBalance = true, options = partyTypeOptions } = {},
  ) => {
    const partyType = value?.partyType || "";
    const selectedPartyTypeOption =
      options.find((option) => option.value === partyType) || null;
    const updatePartyType = (nextType) => {
      onChange({
        ...value,
        partyType: nextType,
        supplierId: "",
        dollarSupplierId: "",
        manufacturerId: "",
        packagingManufacturerId: "",
        loanId: "",
        lender: "",
        ownerId: "",
        directorId: "",
      });
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1">
            Party Type
          </label>
          <Select
            options={options}
            value={selectedPartyTypeOption}
            onChange={(selectedOption) =>
              updatePartyType(selectedOption?.value || "")
            }
            placeholder="Select Party Type"
            className="text-sm"
            styles={selectStyles}
            isClearable
          />
        </div>

        {partyType === "Supplier" && selectedPartyTypeOption && (
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Supplier Name
            </label>
            <Select
              options={supplierOptions}
              value={
                supplierOptions.find(
                  (option) =>
                    String(option.value) === String(value?.supplierId),
                ) || null
              }
              onChange={(selectedOption) =>
                onChange({
                  ...value,
                  supplierId: selectedOption?.value || "",
                  dollarSupplierId: "",
                  manufacturerId: "",
                  packagingManufacturerId: "",
                  loanId: "",
                  lender: "",
                  ownerId: "",
                  directorId: "",
                })
              }
              placeholder={t.select_supplier || "Select Supplier"}
              className="text-sm"
              styles={selectStyles}
              isClearable
            />
            {showBalance && renderSupplierBalance(value?.supplierId)}
          </div>
        )}

        {partyType === "Dollar Supplier" && selectedPartyTypeOption && (
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Dollar Supplier Name
            </label>
            <Select
              options={dollarSupplierOptions}
              value={
                dollarSupplierOptions.find(
                  (option) =>
                    String(option.value) === String(value?.dollarSupplierId),
                ) || null
              }
              onChange={(selectedOption) =>
                onChange({
                  ...value,
                  supplierId: "",
                  dollarSupplierId: selectedOption?.value || "",
                  manufacturerId: "",
                  packagingManufacturerId: "",
                  loanId: "",
                  lender: "",
                  ownerId: "",
                  directorId: "",
                })
              }
              placeholder="Select Dollar Supplier"
              className="text-sm"
              styles={selectStyles}
              isClearable
            />
            {showBalance && renderDollarSupplierBalance(value?.dollarSupplierId)}
          </div>
        )}

        {partyType === "Manufacturer" && selectedPartyTypeOption && (
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Manufacturer Name
            </label>
            <Select
              options={manufacturerOptions}
              value={
                manufacturerOptions.find(
                  (option) =>
                    String(option.value) === String(value?.manufacturerId),
                ) || null
              }
              onChange={(selectedOption) =>
                onChange({
                  ...value,
                  supplierId: "",
                  manufacturerId: selectedOption?.value || "",
                  packagingManufacturerId: "",
                  loanId: "",
                  lender: "",
                  ownerId: "",
                  directorId: "",
                })
              }
              placeholder={
                isManufacturerLoading
                  ? "Loading Manufacturers..."
                  : "Select Manufacturer"
              }
              className="text-sm"
              styles={selectStyles}
              isClearable
              isLoading={isManufacturerLoading}
            />
            {showBalance && renderManufacturerBalance(value?.manufacturerId)}
          </div>
        )}

        {partyType === "Packaging Manufacturer" && selectedPartyTypeOption && (
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Packaging Manufacturer Name
            </label>
            <Select
              options={packagingManufacturerOptions}
              value={
                packagingManufacturerOptions.find(
                  (option) =>
                    String(option.value) ===
                    String(value?.packagingManufacturerId),
                ) || null
              }
              onChange={(selectedOption) =>
                onChange({
                  ...value,
                  supplierId: "",
                  manufacturerId: "",
                  packagingManufacturerId: selectedOption?.value || "",
                  loanId: "",
                  lender: "",
                  ownerId: "",
                  directorId: "",
                })
              }
              placeholder={
                isPackagingManufacturerLoading
                  ? "Loading Packaging Manufacturers..."
                  : "Select Packaging Manufacturer"
              }
              className="text-sm"
              styles={selectStyles}
              isClearable
              isLoading={isPackagingManufacturerLoading}
            />
            {showBalance &&
              renderPackagingManufacturerBalance(
                value?.packagingManufacturerId,
              )}
          </div>
        )}

        {partyType === "Lender" && (
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Lender Name
            </label>
            <Select
              options={loanSelectOptions}
              value={
                loanSelectOptions.find(
                  (option) => String(option.value) === String(value?.loanId),
                ) || null
              }
              onChange={(selectedOption) =>
                onChange({
                  ...value,
                  supplierId: "",
                  manufacturerId: "",
                  packagingManufacturerId: "",
                  loanId: selectedOption?.value || "",
                  lender: selectedOption?.label || "",
                  ownerId: "",
                  directorId: "",
                })
              }
              placeholder="Select Lender"
              className="text-sm"
              styles={selectStyles}
              isClearable
            />
            {renderLoanBalance(findLoanById(value?.loanId))}
          </div>
        )}

        {partyType === "Owner" && (
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Owner Name
            </label>
            <Select
              options={ownerOptions}
              value={
                ownerOptions.find(
                  (option) => String(option.value) === String(value?.ownerId),
                ) || null
              }
              onChange={(selectedOption) =>
                onChange({
                  ...value,
                  supplierId: "",
                  manufacturerId: "",
                  packagingManufacturerId: "",
                  loanId: "",
                  lender: "",
                  ownerId: selectedOption?.value || "",
                  directorId: "",
                })
              }
              placeholder={
                isOwnerLoading ? "Loading Owners..." : "Select Owner"
              }
              className="text-sm"
              styles={selectStyles}
              isClearable
              isLoading={isOwnerLoading}
            />
          </div>
        )}

        {partyType === "Director" && (
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Director Name
            </label>
            <Select
              options={directorOptions}
              value={
                directorOptions.find(
                  (option) =>
                    String(option.value) === String(value?.directorId),
                ) || null
              }
              onChange={(selectedOption) =>
                onChange({
                  ...value,
                  supplierId: "",
                  manufacturerId: "",
                  packagingManufacturerId: "",
                  loanId: "",
                  lender: "",
                  ownerId: "",
                  directorId: selectedOption?.value || "",
                })
              }
              placeholder={
                isDirectorLoading ? "Loading Directors..." : "Select Director"
              }
              className="text-sm"
              styles={selectStyles}
              isClearable
              isLoading={isDirectorLoading}
            />
          </div>
        )}
      </div>
    );
  };
  return (
    <motion.div
      className="w-full max-w-full min-w-0 bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {/* CashIn */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-emerald-50/70 to-transparent" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">
                {t.total_cashin || "Total CashIn"}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
                {isLoading
                  ? "—"
                  : Number(data?.meta?.totalCashIn || 0).toLocaleString()}
              </p>
            </div>

            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-emerald-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 19V5" />
                <path d="M5 12l7-7 7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* CashOut */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-rose-50/70 to-transparent" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">
                {t.total_cashout || "Total CashOut"}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
                {isLoading
                  ? "—"
                  : Number(data?.meta?.totalCashOut || 0).toLocaleString()}
              </p>
            </div>

            <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-rose-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 5v14" />
                <path d="M19 12l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Net */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-indigo-50/70 to-transparent" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">
                {t.net_balance || "Net Balance"}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
                {isLoading
                  ? "—"
                  : Number(data?.meta?.netBalance || 0).toLocaleString()}
              </p>
            </div>

            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-indigo-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 19V5" />
                <path d="M8 17V7" />
                <path d="M12 19V9" />
                <path d="M16 15V5" />
                <path d="M20 19V11" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="my-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Actions */}
        <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center sm:gap-5">
          {/* Cash In (Primary) */}
          <button
            type="button"
            onClick={handleAddCashIn}
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 active:bg-indigo-800 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/30 sm:w-auto"
          >
            <Plus size={18} />
            {t.cash_in || "Cash In"}
          </button>

          {/* Cash Out (Secondary / Neutral) */}
          <button
            type="button"
            onClick={handleAddCashOut}
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-800 border border-slate-200 shadow-md hover:bg-slate-50 active:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:w-auto"
          >
            <Minus size={18} className="text-slate-700" />
            {t.cash_out || "Cash Out"}
          </button>
        </div>

        {/* Right: Search Input + Per Page Dropdown + Report Menu */}
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-[300px] md:w-[380px]">
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
                setStartPage(1);
              }}
              placeholder={t.search}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 shadow-sm"
            />
            <Search
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
          </div>

          {/* Per Page Dropdown (right side of search bar) */}
          <div className="w-full sm:w-[100px]">
            <Select
              options={[10, 20, 50, 100].map((value) => ({
                value,
                label: String(value),
              }))}
              value={{ value: itemsPerPage, label: String(itemsPerPage) }}
              onChange={(selected) => {
                setItemsPerPage(selected?.value || 10);
                setCurrentPage(1);
                setStartPage(1);
              }}
              styles={selectStyles}
              className="text-black"
            />
          </div>

          {/* Report Menu */}
          <div className="flex shrink-0 justify-end sm:w-auto">
            <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-sm">
              <ReportMenu
                isOpen={isReportMenuOpen}
                setIsOpen={setIsReportMenuOpen}
                onGoogleSheet={handleReportSheet}
                onPdf={handleReportPdf}
                disabled={isLoading || !id}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Full Width Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 items-end mb-6 w-full [&>*]:min-w-0">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          defaultFilter="last30"
          compact
          className="w-full"
        />

        <div className="flex flex-col w-full">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
            {t.payment_mode}
          </label>
          <Select
            options={paymentModeOptions}
            value={
              paymentModeOptions.find(
                (option) => option.value === filterPaymentMode,
              ) || null
            }
            onChange={(selected) => setFilterPaymentMode(selected?.value || "")}
            placeholder={t.all || "All"}
            isClearable
            styles={selectStyles}
            className="text-black w-full"
          />
        </div>

        <div className="flex flex-col w-full">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
            {t.payment_status}
          </label>
          <Select
            options={paymentStatusOptions}
            value={
              paymentStatusOptions.find(
                (option) => option.value === filterPaymentStatus,
              ) || null
            }
            onChange={(selected) =>
              setFilterPaymentStatus(selected?.value || "")
            }
            placeholder={t.all || "All"}
            isClearable
            styles={selectStyles}
            className="text-black w-full"
          />
        </div>

        <div className="flex flex-col w-full">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
            Loan
          </label>
          <Select
            options={loanSelectOptions}
            value={
              loanSelectOptions.find(
                (option) => String(option.value) === String(filterLoanId),
              ) || null
            }
            onChange={(selected) => setFilterLoanId(selected?.value || "")}
            placeholder="Search loan"
            isClearable
            styles={selectStyles}
            className="text-black w-full"
          />
        </div>

        <div className="flex flex-col w-full">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
            {t.category || "Category"}
          </label>
          <Select
            options={categoryFilterOptions}
            value={
              categoryFilterOptions.find(
                (option) => option.value === filterCategory,
              ) || null
            }
            onChange={(selected) => setFilterCategory(selected?.value || "")}
            placeholder={t.all || "All"}
            isClearable
            styles={selectStyles}
            className="text-black w-full"
          />
        </div>

        <div className="flex flex-col w-full">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
            {t.supplier}
          </label>
          <Select
            options={supplierOptions}
            value={
              supplierOptions.find(
                (o) => String(o.value) === String(supplier),
              ) || null
            }
            onChange={(selected) => {
              setSupplier(selected?.value || "");
              setCurrentPage(1);
              setStartPage(1);
            }}
            placeholder={t.search}
            isClearable
            styles={selectStyles}
            className="text-black w-full"
          />
        </div>

        <div className="flex flex-col w-full">
          <label className="text-sm text-transparent mb-1.5 select-none hidden sm:block">
            Clear
          </label>
          <button
            className="h-11 w-full bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 transition rounded-xl px-4 text-sm font-semibold flex items-center justify-center"
            onClick={clearFilters}
            type="button"
          >
            {t.clear_filters}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[900px] divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t.date}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t.category || "Category"}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t.payment_mode}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t.payment_status}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t.note}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t.total_amount || "Total Amount"}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t.status}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {products.map((rp) => {
              const rowId = rp.Id ?? rp.id;

              return (
                <motion.tr
                  key={rowId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.date || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    <div className="space-y-1">
                      <div>{rp.category || "---"}</div>
                      {(rp.loan?.name ||
                        rp.lender ||
                        rp.loanName ||
                        rp.loan_person_name ||
                        rp.loanPersonName) && (
                        <div className="text-xs font-medium text-amber-700">
                          {rp.paymentStatus === "CashOut" ? "To: " : "From: "}
                          {rp.loan?.name ||
                            rp.lender ||
                            rp.loanName ||
                            rp.loan_person_name ||
                            rp.loanPersonName}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.paymentMode || "---"}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.paymentStatus || "---"}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.remarks || "---"}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 tabular-nums">
                    {Number(rp.amount || 0).toFixed(2)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                        rp.status === "Approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : rp.status === "Pending"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {rp.status || "Active"}
                    </span>
                  </td>

                  {/* <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-3">
                      {rp.note ? (
                        <div className="relative">
                          <button
                            // className="text-slate-600 hover:text-slate-900"
                            className="relative h-10 w-10 rounded-md  flex items-center justify-center"
                            title={rp.note}
                            type="button"
                          >
                            <Notebook size={18} className="text-slate-700" />
                          </button>

                          <span className="absolute top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
                            {rp.note ? 1 : null}
                          </span>
                        </div>
                      ) : (
                        <button
                          // className="text-slate-600 hover:text-slate-900"
                          className=" h-10 w-10 rounded-md   flex items-center justify-center"
                          title={rp.note}
                          type="button"
                        >
                          <Notebook size={18} className="text-slate-700" />
                        </button>
                      )}

                      <button
                        onClick={() => handleEditClick(rp)}
                        className="text-indigo-600 hover:text-indigo-700"
                        type="button"
                      >
                        <Edit size={18} />
                      </button>

                      {role === "superAdmin" || role === "admin" ? (
                        <button
                          onClick={() => handleDeleteIconClick(rowId)}
                          className="text-red-600 hover:text-red-700"
                          type="button"
                        >
                          <Trash2 size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteIconClick(rowId)}
                          className="text-red-600 hover:text-red-700"
                          type="button"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td> */}

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-3">
                      <button
                        className="h-10 w-10 rounded-md flex items-center justify-center text-violet-600 hover:bg-violet-50"
                        title="Voucher"
                        type="button"
                        onClick={() => handleVoucherOpen(rp)}
                      >
                        <FileText size={18} />
                      </button>

                      {rp.note ? (
                        <div className="relative">
                          <button
                            className="relative h-10 w-10 rounded-md flex items-center justify-center"
                            title={rp.note}
                            type="button"
                            onClick={() => handleNoteClick(rp.note)} // Open modal on click
                          >
                            <Notebook size={18} className="text-slate-700" />
                          </button>

                          <span className="absolute top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
                            {rp.note ? 1 : null}
                          </span>
                        </div>
                      ) : (
                        <button
                          className="h-10 w-10 rounded-md flex items-center justify-center"
                          title={rp.note}
                          type="button"
                        >
                          <Notebook size={18} className="text-slate-700" />
                        </button>
                      )}

                      <button
                        onClick={() => handleEditClick(rp)}
                        className="text-indigo-600 hover:text-indigo-700"
                        type="button"
                      >
                        <Edit size={18} />
                      </button>

                      {role === "superAdmin" || role === "admin" ? (
                        <button
                          onClick={() => handleDeleteIconClick(rowId)}
                          className="text-red-600 hover:text-red-700"
                          type="button"
                        >
                          <Trash2 size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteIconClick(rowId)}
                          className="text-red-600 hover:text-red-700"
                          type="button"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}

            {!isLoading && products.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-8 text-center text-sm text-slate-600"
                >
                  {t.no_data_found}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination + Page Jump Dropdown */}
      <div className="flex items-center justify-center flex-wrap gap-2 mt-6">
        <button
          onClick={handlePreviousSet}
          disabled={startPage === 1}
          className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
        >
          {t.prev}
        </button>

        {[...Array(endPage - startPage + 1)].map((_, index) => {
          const pageNum = startPage + index;
          const active = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`px-4 py-2 rounded-xl border transition ${
                active
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={handleNextSet}
          disabled={endPage === totalPages}
          className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
        >
          Next
        </button>
      </div>

      <Modal
        isOpen={isModalOpen && !!currentProduct}
        onClose={() => {
          setIsModalOpen(false);
          setCurrentProduct(null);
          setIsNewCategoryEdit(false);
          setNewCategoryNameEdit("");
          setIsNewBankAccountEdit(false);
          setNewBankNameEdit("");
          setNewAccountNumberEdit("");
        }}
        title={t.edit_item || "Edit Item"}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-700">{t.date}</label>
            <input
              type="date"
              value={currentProduct?.date || ""}
              onChange={(e) =>
                setCurrentProduct((p) => ({ ...p, date: e.target.value }))
              }
              className="border bg-white border-slate-200 rounded-xl p-2 w-full mt-1 text-slate-900 outline-none
                         focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Payment Status
            </label>
            <select
              value={currentProduct?.paymentStatus || ""}
              onChange={(e) =>
                setCurrentProduct((p) => ({
                  ...p,
                  paymentStatus: e.target.value,
                }))
              }
              className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white outline-none
                         focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              required
            >
              <option value="">Select Payment Status</option>
              <option value="CashIn">CashIn</option>
              <option value="CashOut">CashOut</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">
              {t.payment_mode}
            </label>
            <select
              value={currentProduct?.paymentMode}
              onChange={(e) =>
                setCurrentProduct({
                  ...currentProduct,
                  paymentMode: e.target.value,
                })
              }
              className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white outline-none
                         focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              required
            >
              <option value="">
                {t.select_payment_mode || "Select Payment Mode"}
              </option>
              <option value="Cash">Cash</option>
              <option value="Bkash">Bkash</option>
              <option value="Nagad">Nagad</option>
              <option value="Rocket">Rocket</option>
              <option value="Bank">Bank</option>
              <option value="Card">Card</option>
            </select>
          </div>

          {currentProduct?.paymentMode === "Bank" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Bank Name
                  </label>
                  <Select
                    options={bankOptions}
                    value={
                      bankOptions.find(
                        (option) => option.value === currentProduct.bankName,
                      ) || null
                    }
                    onChange={(selected) =>
                      setCurrentProduct({
                        ...currentProduct,
                        bankName: selected?.value || "",
                      })
                    }
                    placeholder={t.select_bank || "Select Bank"}
                    className="text-sm"
                    styles={selectStyles}
                    isClearable
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Bank Account
                  </label>
                  <Select
                    options={getBankAccountSelectOptions(
                      currentProduct.bankName,
                    )}
                    value={
                      isNewBankAccountEdit
                        ? { value: "__new_bank__", label: "+ New Bank Account" }
                        : getBankAccountOptions(currentProduct.bankName).find(
                            (option) =>
                              option.value === currentProduct.bankAccount,
                          ) || null
                    }
                    onChange={(selected) => {
                      if (selected?.value === "__new_bank__") {
                        setIsNewBankAccountEdit(true);
                      } else {
                        setIsNewBankAccountEdit(false);
                        setCurrentProduct({
                          ...currentProduct,
                          bankAccount: selected?.value || "",
                          bankName:
                            selected?.bankName || currentProduct.bankName || "",
                        });
                      }
                    }}
                    placeholder="Select Bank Account"
                    className="text-sm"
                    styles={selectStyles}
                    isClearable
                  />
                </div>
              </div>
              {isNewBankAccountEdit && (
                <div className="flex gap-2 mt-2 items-end">
                  <input
                    type="text"
                    value={newBankNameEdit}
                    onChange={(e) => setNewBankNameEdit(e.target.value)}
                    placeholder="Bank Name"
                    className="flex-1 h-11 border border-slate-200 rounded-xl px-3 text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <input
                    type="text"
                    value={newAccountNumberEdit}
                    onChange={(e) => setNewAccountNumberEdit(e.target.value)}
                    placeholder="Account Number"
                    className="flex-1 h-11 border border-slate-200 rounded-xl px-3 text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const created = await addBankAccount(
                        newBankNameEdit,
                        newAccountNumberEdit,
                      );
                      if (created) {
                        setCurrentProduct({
                          ...currentProduct,
                          bankName: created.bankName,
                          bankAccount: created.accountNumber,
                        });
                        setIsNewBankAccountEdit(false);
                        setNewBankNameEdit("");
                        setNewAccountNumberEdit("");
                      }
                    }}
                    className="h-11 px-5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition"
                  >
                    Add
                  </button>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Category
            </label>
            <select
              value={
                isNewCategoryEdit ? "__new__" : currentProduct?.category || ""
              }
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__new__") {
                  setIsNewCategoryEdit(true);
                  setCurrentProduct((p) => ({
                    ...p,
                    category: "",
                    categoryId: "",
                  }));
                  return;
                }
                const selectedCategory = findCategoryOptionByName(v);
                setIsNewCategoryEdit(false);
                setNewCategoryNameEdit("");
                setCurrentProduct((p) => ({
                  ...p,
                  category: v,
                  categoryId: selectedCategory?.isStatic
                    ? ""
                    : selectedCategory?.id || "",
                }));
              }}
              className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white outline-none
                         focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
            >
              <option value="">Select Category</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
              <option value="__new__">+ New Category</option>
            </select>
            {isNewCategoryEdit && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newCategoryNameEdit}
                  onChange={(e) => setNewCategoryNameEdit(e.target.value)}
                  placeholder="New category name"
                  className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white outline-none"
                />
              </div>
            )}
          </div>

          {renderPartyFields(currentProduct, setCurrentProduct)}

          {currentProduct?.paymentStatus !== "CashOut" && (
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                From (Received From)
              </label>
              <input
                type="text"
                value={currentProduct?.fromParty || ""}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    fromParty: e.target.value,
                  })
                }
                placeholder="Who the cash was received from"
                className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Note</label>
              <input
                type="text"
                value={currentProduct?.remarks}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    remarks: e.target.value,
                  })
                }
                className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={currentProduct?.amount}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    amount: e.target.value,
                  })
                }
                className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">Ref No</label>
            <input
              type="text"
              value={currentProduct?.refNo || ""}
              onChange={(e) =>
                setCurrentProduct({
                  ...currentProduct,
                  refNo: e.target.value,
                })
              }
              className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white"
              placeholder="Reference number"
            />
          </div>

          {isPrivilegedUser && (
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                {t.status || "Status"}
              </label>
              <select
                value={currentProduct?.status || ""}
                onChange={(e) =>
                  setCurrentProduct((p) => ({
                    ...p,
                    status: e.target.value,
                  }))
                }
                className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white outline-none
                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              >
                <option value="">{t.select_status || "Select Status"}</option>
                <option value="Active">{t.active_status || "Active"}</option>
                <option value="Approved">
                  {t.approved_status || "Approved"}
                </option>
                <option value="Pending">{t.pending_status || "Pending"}</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Upload Document
            </label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) =>
                setCurrentProduct({
                  ...currentProduct,
                  file: e.target.files?.[0] || null,
                })
              }
              className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white"
            />
            {currentProduct?.file && (
              <p className="mt-2 text-xs text-slate-600">
                {t.selected || "Selected"}: {currentProduct.file.name}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setCurrentProduct(null);
                setIsNewCategoryEdit(false);
                setNewCategoryNameEdit("");
                setIsNewBankAccountEdit(false);
                setNewBankNameEdit("");
                setNewAccountNumberEdit("");
              }}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateProduct}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              {t.update_changes || "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen1}
        onClose={handleModalClose1}
        title={t.add_cash_in || "Add Cash In"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-700">Date</label>
              <input
                type="date"
                value={createProduct?.date || ""}
                onChange={(e) =>
                  setCreateProduct((p) => ({ ...p, date: e.target.value }))
                }
                className="border bg-white border-slate-200 rounded-xl p-2 w-full mt-1 text-slate-900 outline-none
                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Payment Mode
              </label>
              <Select
                options={paymentModeOptions}
                value={
                  paymentModeOptions.find(
                    (option) => option.value === createProduct.paymentMode,
                  ) || null
                }
                onChange={(selectedOption) =>
                  setCreateProduct({
                    ...createProduct,
                    paymentMode: selectedOption?.value || "",
                    bankName:
                      selectedOption?.value === "Bank"
                        ? createProduct.bankName
                        : "",
                    bankAccount:
                      selectedOption?.value === "Bank"
                        ? createProduct.bankAccount
                        : "",
                  })
                }
                placeholder="Select Payment Mode"
                className="text-sm"
                styles={selectStyles}
                isClearable
                required
              />
            </div>
          </div>

          {createProduct.paymentMode === "Bank" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Bank Name
                  </label>
                  <Select
                    options={bankOptions}
                    value={
                      bankOptions.find(
                        (option) => option.value === createProduct.bankName,
                      ) || null
                    }
                    onChange={(selectedOption) =>
                      setCreateProduct({
                        ...createProduct,
                        bankName: selectedOption?.value || "",
                      })
                    }
                    placeholder="Select Bank"
                    className="text-sm"
                    styles={selectStyles}
                    isClearable
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Bank Account
                  </label>
                  <Select
                    options={getBankAccountSelectOptions(
                      createProduct.bankName,
                    )}
                    value={
                      isNewBankAccountAdd
                        ? { value: "__new_bank__", label: "+ New Bank Account" }
                        : getBankAccountOptions(createProduct.bankName).find(
                            (option) =>
                              option.value === createProduct.bankAccount,
                          ) || null
                    }
                    onChange={(selected) => {
                      if (selected?.value === "__new_bank__") {
                        setIsNewBankAccountAdd(true);
                      } else {
                        setIsNewBankAccountAdd(false);
                        setCreateProduct({
                          ...createProduct,
                          bankAccount: selected?.value || "",
                          bankName:
                            selected?.bankName || createProduct.bankName || "",
                        });
                      }
                    }}
                    placeholder="Select Bank Account"
                    className="text-sm"
                    styles={selectStyles}
                    isClearable
                  />
                </div>
              </div>
              {isNewBankAccountAdd && (
                <div className="flex gap-2 mt-2 items-end">
                  <input
                    type="text"
                    value={newBankNameAdd}
                    onChange={(e) => setNewBankNameAdd(e.target.value)}
                    placeholder="Bank Name"
                    className="flex-1 h-11 border border-slate-200 rounded-xl px-3 text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <input
                    type="text"
                    value={newAccountNumberAdd}
                    onChange={(e) => setNewAccountNumberAdd(e.target.value)}
                    placeholder="Account Number"
                    className="flex-1 h-11 border border-slate-200 rounded-xl px-3 text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const created = await addBankAccount(
                        newBankNameAdd,
                        newAccountNumberAdd,
                      );
                      if (created) {
                        setCreateProduct({
                          ...createProduct,
                          bankName: created.bankName,
                          bankAccount: created.accountNumber,
                        });
                        setIsNewBankAccountAdd(false);
                        setNewBankNameAdd("");
                        setNewAccountNumberAdd("");
                      }
                    }}
                    className="h-11 px-5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition"
                  >
                    Add
                  </button>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Category
            </label>
            <Select
              options={categorySelectOptions}
              value={
                categorySelectOptions.find(
                  (option) =>
                    option.value ===
                    (isNewCategoryAdd ? "__new__" : createProduct.category),
                ) || null
              }
              onChange={(selectedOption) => {
                const value = selectedOption?.value || "";
                if (value === "__new__") {
                  setIsNewCategoryAdd(true);
                  setCreateProduct((p) => ({
                    ...p,
                    category: "",
                    categoryId: "",
                  }));
                  return;
                }
                const selectedCategory = findCategoryOptionByName(value);
                setIsNewCategoryAdd(false);
                setNewCategoryNameAdd("");
                setCreateProduct((p) => ({
                  ...p,
                  category: value,
                  categoryId: selectedCategory?.isStatic
                    ? ""
                    : selectedCategory?.id || "",
                }));
              }}
              placeholder="Select Category"
              className="text-sm text-black"
              styles={selectStyles}
              isClearable
              required
            />

            {isNewCategoryAdd && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newCategoryNameAdd}
                  onChange={(e) => setNewCategoryNameAdd(e.target.value)}
                  placeholder="New category name"
                  className="h-11 text-black border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white outline-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const createdCategory =
                      await addCategoryByName(newCategoryNameAdd);
                    if (!createdCategory) return;
                    setCreateProduct((p) => ({
                      ...p,
                      category: createdCategory.name,
                      categoryId: createdCategory.id,
                    }));
                    setIsNewCategoryAdd(false);
                    setNewCategoryNameAdd("");
                  }}
                  disabled={isAddingCategory}
                  className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  {isAddingCategory ? "..." : "Add"}
                </button>
              </div>
            )}
          </div>

          {renderPartyFields(createProduct, setCreateProduct, {
            options: cashInPartyTypeOptions,
          })}

          <div>
            <label className="block text-sm text-slate-600 mb-1">
              From (Received From)
            </label>
            <input
              type="text"
              value={createProduct.fromParty || ""}
              onChange={(e) =>
                setCreateProduct({
                  ...createProduct,
                  fromParty: e.target.value,
                })
              }
              placeholder="Who the cash was received from"
              className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white"
            />
            <p className="mt-1 text-xs text-slate-400">
              Shown as “From” on the cash memo. Receiver is always the company.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm text-slate-600 mb-1">Note</label>
              <input
                type="text"
                value={createProduct.remarks}
                onChange={(e) =>
                  setCreateProduct({
                    ...createProduct,
                    remarks: e.target.value,
                  })
                }
                onFocus={() => setIsCreateNoteFocused(true)}
                onBlur={() =>
                  window.setTimeout(() => setIsCreateNoteFocused(false), 120)
                }
                className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white"
              />
              {isCreateNoteFocused && previousVoucherSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                  {previousVoucherSuggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setCreateProduct((p) => ({
                          ...p,
                          remarks: item.note,
                          category: p.category || item.category,
                        }));
                        setIsCreateNoteFocused(false);
                      }}
                      className="w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 last:border-b-0 hover:bg-slate-50"
                    >
                      <div className="font-semibold text-slate-900">
                        {item.date}, {item.category}, {item.note}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        Voucher No: {item.voucherNo}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={createProduct.amount}
                onChange={(e) =>
                  setCreateProduct({ ...createProduct, amount: e.target.value })
                }
                className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">Ref No</label>
            <input
              type="text"
              value={createProduct.refNo || ""}
              onChange={(e) =>
                setCreateProduct({ ...createProduct, refNo: e.target.value })
              }
              className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white"
              placeholder="Reference number"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Upload Document
            </label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) =>
                setCreateProduct({
                  ...createProduct,
                  file: e.target.files?.[0] || null,
                })
              }
              className="h-11 border border-slate-200 rounded-xl px-3 w-full"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleModalClose1}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl"
            >
              {t.save_cash_in || "Save Cash In"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isModalOpen3}
        onClose={handleModalClose3}
        title={t.add_cash_out || "Add Cash Out"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateProduct1} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-700">Date</label>
              <input
                type="date"
                value={createProduct?.date || ""}
                onChange={(e) =>
                  setCreateProduct((p) => ({ ...p, date: e.target.value }))
                }
                className="border bg-white border-slate-200 rounded-xl p-2 w-full mt-1 text-slate-900 outline-none
                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Payment Mode
              </label>
              <Select
                options={paymentModeOptions}
                value={
                  paymentModeOptions.find(
                    (option) => option.value === createProduct.paymentMode,
                  ) || null
                }
                onChange={(selectedOption) =>
                  setCreateProduct({
                    ...createProduct,
                    paymentMode: selectedOption?.value || "",
                    bankName:
                      selectedOption?.value === "Bank"
                        ? createProduct.bankName
                        : "",
                    bankAccount:
                      selectedOption?.value === "Bank"
                        ? createProduct.bankAccount
                        : "",
                  })
                }
                placeholder="Select Payment Mode"
                className="text-sm"
                styles={selectStyles}
                isClearable
                required
              />
            </div>
          </div>

          {createProduct.paymentMode === "Bank" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Bank Name
                  </label>
                  <Select
                    options={bankOptions}
                    value={
                      bankOptions.find(
                        (option) => option.value === createProduct.bankName,
                      ) || null
                    }
                    onChange={(selectedOption) =>
                      setCreateProduct({
                        ...createProduct,
                        bankName: selectedOption?.value || "",
                      })
                    }
                    placeholder="Select Bank"
                    className="text-sm"
                    styles={selectStyles}
                    isClearable
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Bank Account
                  </label>
                  <Select
                    options={getBankAccountSelectOptions(
                      createProduct.bankName,
                    )}
                    value={
                      isNewBankAccountAdd
                        ? { value: "__new_bank__", label: "+ New Bank Account" }
                        : getBankAccountOptions(createProduct.bankName).find(
                            (option) =>
                              option.value === createProduct.bankAccount,
                          ) || null
                    }
                    onChange={(selected) => {
                      if (selected?.value === "__new_bank__") {
                        setIsNewBankAccountAdd(true);
                      } else {
                        setIsNewBankAccountAdd(false);
                        setCreateProduct({
                          ...createProduct,
                          bankAccount: selected?.value || "",
                          bankName:
                            selected?.bankName || createProduct.bankName || "",
                        });
                      }
                    }}
                    placeholder="Select Bank Account"
                    className="text-sm"
                    styles={selectStyles}
                    isClearable
                  />
                </div>
              </div>
              {isNewBankAccountAdd && (
                <div className="flex gap-2 mt-2 items-end">
                  <input
                    type="text"
                    value={newBankNameAdd}
                    onChange={(e) => setNewBankNameAdd(e.target.value)}
                    placeholder="Bank Name"
                    className="flex-1 h-11 border border-slate-200 rounded-xl px-3 text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <input
                    type="text"
                    value={newAccountNumberAdd}
                    onChange={(e) => setNewAccountNumberAdd(e.target.value)}
                    placeholder="Account Number"
                    className="flex-1 h-11 border border-slate-200 rounded-xl px-3 text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const created = await addBankAccount(
                        newBankNameAdd,
                        newAccountNumberAdd,
                      );
                      if (created) {
                        setCreateProduct({
                          ...createProduct,
                          bankName: created.bankName,
                          bankAccount: created.accountNumber,
                        });
                        setIsNewBankAccountAdd(false);
                        setNewBankNameAdd("");
                        setNewAccountNumberAdd("");
                      }
                    }}
                    className="h-11 px-5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition"
                  >
                    Add
                  </button>
                </div>
              )}
            </>
          )}

          {renderPartyFields(createProduct, setCreateProduct)}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Category
              </label>
              <Select
                options={categorySelectOptions}
                value={
                  categorySelectOptions.find(
                    (option) =>
                      option.value ===
                      (isNewCategoryAdd ? "__new__" : createProduct.category),
                  ) || null
                }
                onChange={(selectedOption) => {
                  const value = selectedOption?.value || "";
                  if (value === "__new__") {
                    setIsNewCategoryAdd(true);
                    setCreateProduct((p) => ({
                      ...p,
                      category: "",
                      categoryId: "",
                    }));
                    return;
                  }
                  const selectedCategory = findCategoryOptionByName(value);
                  setIsNewCategoryAdd(false);
                  setNewCategoryNameAdd("");
                  setCreateProduct((p) => ({
                    ...p,
                    category: value,
                    categoryId: selectedCategory?.isStatic
                      ? ""
                      : selectedCategory?.id || "",
                  }));
                }}
                placeholder="Select Category"
                className="text-sm"
                styles={selectStyles}
                isClearable
                required
              />

              {isNewCategoryAdd && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newCategoryNameAdd}
                    onChange={(e) => setNewCategoryNameAdd(e.target.value)}
                    placeholder="New category name"
                    className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const createdCategory =
                        await addCategoryByName(newCategoryNameAdd);
                      if (!createdCategory) return;
                      setCreateProduct((p) => ({
                        ...p,
                        category: createdCategory.name,
                        categoryId: createdCategory.id,
                      }));
                      setIsNewCategoryAdd(false);
                      setNewCategoryNameAdd("");
                    }}
                    disabled={isAddingCategory}
                    className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  >
                    {isAddingCategory ? "..." : "Add"}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={createProduct.amount}
                onChange={(e) =>
                  setCreateProduct({ ...createProduct, amount: e.target.value })
                }
                className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Note</label>
            <input
              type="text"
              value={createProduct.remarks}
              onChange={(e) =>
                setCreateProduct({
                  ...createProduct,
                  remarks: e.target.value,
                })
              }
              onFocus={() => setIsCreateCashOutNoteFocused(true)}
              onBlur={() =>
                window.setTimeout(
                  () => setIsCreateCashOutNoteFocused(false),
                  120,
                )
              }
              className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white"
            />
            {isCreateCashOutNoteFocused &&
              previousVoucherSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                  {previousVoucherSuggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setCreateProduct((p) => ({
                          ...p,
                          remarks: item.note,
                          category: p.category || item.category,
                        }));
                        setIsCreateCashOutNoteFocused(false);
                      }}
                      className="w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 last:border-b-0 hover:bg-slate-50"
                    >
                      <div className="font-semibold text-slate-900">
                        {item.date}, {item.category}, {item.note}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        Voucher No: {item.voucherNo}
                      </div>
                    </button>
                  ))}
                </div>
              )}
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Ref No</label>
            <input
              type="text"
              value={createProduct.refNo || ""}
              onChange={(e) =>
                setCreateProduct({ ...createProduct, refNo: e.target.value })
              }
              className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white"
              placeholder="Reference number"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Upload Document
            </label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) =>
                setCreateProduct({
                  ...createProduct,
                  file: e.target.files?.[0] || null,
                })
              }
              className="h-11 border border-slate-200 rounded-xl px-3 w-full"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleModalClose3}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl"
            >
              {t.save_cash_out || "Save Cash Out"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ✅ Global Note View Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={handleModalClose}
        title={t.transaction_note || "Transaction Note"}
      >
        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
              {noteContent}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={handleModalClose}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              {t.close}
            </button>
          </div>
        </div>
      </Modal>

      <ReportPreviewModal
        open={isReportPreviewOpen}
        onClose={closeReportPreview}
        type={reportType}
        blob={reportBlob}
        blobUrl={reportBlobUrl}
        sheetPreview={sheetPreview}
        loading={reportLoading}
      />

      <Modal
        isOpen={voucherPreview.open}
        onClose={closeVoucherPreview}
        title={voucherPreview.title || "Voucher"}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleVoucherPrint}
              className="h-10 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Print
            </button>
            <button
              type="button"
              onClick={handleVoucherDownload}
              className="h-10 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Download
            </button>
          </div>

          <div className="h-[70vh] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {voucherPreview.url ? (
              <object
                data={voucherPreview.url}
                type="application/pdf"
                className="h-full w-full"
                aria-label={`${voucherPreview.title || "Voucher"} Preview`}
              >
                <iframe
                  src={voucherPreview.url}
                  title={`${voucherPreview.title || "Voucher"} Preview`}
                  className="h-full w-full"
                />
              </object>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Voucher preview is not available.
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteRequestOpen}
        onClose={closeDeleteRequestModal}
        title="Request Delete"
        maxWidth="max-w-lg"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Note</label>
            <textarea
              value={deleteRequestNote}
              onChange={(e) => setDeleteRequestNote(e.target.value)}
              rows={3}
              placeholder="Why do you want to delete this transaction?"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={closeDeleteRequestModal}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
              disabled={isDeletingCashInOut}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitDeleteRequest}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl"
              disabled={isDeletingCashInOut}
            >
              {isDeletingCashInOut ? "..." : "Submit"}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default CashInOutTable;
