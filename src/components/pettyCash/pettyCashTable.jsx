import { motion } from "framer-motion";
import { Edit, Minus, Notebook, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useApprovePettyCashMutation,
  useDeletePettyCashMutation,
  useGetAllPettyCashQuery,
  useInsertPettyCashMutation,
  useUpdatePettyCashMutation,
} from "../../features/pettyCash/pettyCash";
import ReportPreviewModal from "./ReportPreviewModal";
import ReportMenu from "./ReportMenu";
import { generatePettyCashXlsx } from "../../utils/pettyCashReport/generatePettyCashXlsx";
import { generatePettyCashPdf } from "../../utils/pettyCashReport/generatePettyCashPdf";
import Modal from "../common/Modal";
import {
  useGetAllCategoryQuery,
  useInsertCategoryMutation,
} from "../../features/category/category";
import Select from "react-select";
import { useGetAllBookWithoutQueryQuery } from "../../features/book/book";
import { translations } from "../../utils/translations";
import { useLayout } from "../../context/LayoutContext";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import useDebounce from "../../hooks/useDebounce";

import {
  useGetAllBankAccountWithoutQueryQuery,
  useInsertBankAccountMutation,
} from "../../features/bankAccount/bankAccount";

const STATIC_CATEGORIES = [
  "Office Expense",
  "Marketing",
  "Salary",
  "Transport",
  "Utility Bill",
  "Other",
];
const PettyCashTable = ({ mode = "default" }) => {
  const isRequisitionMode = mode === "requisition";
  const [isModalOpen, setIsModalOpen] = useState(false); // edit
  const [isModalOpen1, setIsModalOpen1] = useState(false); // add
  const [cashInFormMode, setCashInFormMode] = useState(
    isRequisitionMode ? "requisition" : "cashIn",
  );
  const [currentProduct, setCurrentProduct] = useState(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterBook, setFilterBook] = useState("");
  const { language } = useLayout();
  const t = translations[language] || translations.EN;

  const [createProduct, setCreateProduct] = useState({
    paymentMode: "",
    paymentStatus: "",
    bankName: "",
    category: "",
    remarks: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    file: null,
    bookId: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const [products, setProducts] = useState([]);

  // filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterPaymentMode, setFilterPaymentMode] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  const userId = localStorage.getItem("userId");

  // ✅ Category states
  const [categories, setCategories] = useState([]);
  const [isNewCategoryAdd, setIsNewCategoryAdd] = useState(false);
  const [newCategoryNameAdd, setNewCategoryNameAdd] = useState("");
  const [isNewCategoryEdit, setIsNewCategoryEdit] = useState(false);
  const [newCategoryNameEdit, setNewCategoryNameEdit] = useState("");

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

  // reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [startDate, endDate, filterPaymentMode, filterPaymentStatus]);

  // endDate safety
  useEffect(() => {
    if (startDate && endDate && startDate > endDate) setEndDate(startDate);
  }, [startDate, endDate]);

  // ✅ Bank না হলে bankName reset (Add)
  useEffect(() => {
    if (createProduct.paymentMode !== "Bank" && createProduct.bankName) {
      setCreateProduct((p) => ({ ...p, bankName: "" }));
    }
  }, [createProduct.paymentMode]);

  // ✅ Bank না হলে bankName reset (Edit)
  useEffect(() => {
    if (!currentProduct) return;
    if (currentProduct.paymentMode !== "Bank" && currentProduct.bankName) {
      setCurrentProduct((p) => ({ ...p, bankName: "" }));
    }
  }, [currentProduct?.paymentMode]);

  // query args memo
  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      category: filterCategory || undefined,
      bookId: filterBook || undefined,
      paymentMode: filterPaymentMode || undefined,
      paymentStatus: isRequisitionMode
        ? "CashIn"
        : filterPaymentStatus || undefined,
      status: isRequisitionMode
        ? "Pending,Approved"
        : "Pending,Approved,Active",
      mode: isRequisitionMode ? "requisition" : undefined,
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
    filterPaymentMode,
    filterPaymentStatus,
    filterCategory,
    filterBook,
    searchTerm,
    isRequisitionMode,
  ]);


  const { data, isLoading, isError, error, refetch } =
    useGetAllPettyCashQuery(queryArgs);

  useEffect(() => {
    if (isError) console.error("Error:", error);
    if (!isLoading && data) {
      setProducts(data?.data ?? []);
      setTotalPages(Math.ceil((data?.meta?.count || 0) / itemsPerPage) || 1);
    }
  }, [data, isLoading, isError, error, itemsPerPage]);


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

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 14,
      borderColor: state.isFocused ? "#c7d2fe" : "#cbd5e1",
      boxShadow: state.isFocused ? "0 0 0 4px rgba(99,102,241,0.15)" : "none",
      "&:hover": { borderColor: "#cbd5e1" },
    }),
    valueContainer: (base) => ({ ...base, padding: "0 12px" }),
    placeholder: (base) => ({ ...base, color: "#64748b" }),
    menu: (base) => ({
      ...base,
      borderRadius: 14,
      overflow: "hidden",
      zIndex: 9999,
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  };

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

  const bankAccountOptions = useMemo(
    () =>
      bankAccountsFromDB.map((ba) => ({
        value: ba.accountNumber,
        label: `${ba.accountNumber} (${ba.bankName})`,
      })),
    [bankAccountsFromDB],
  );

  const bankAccountSelectOptions = useMemo(
    () => [
      ...bankAccountOptions,
      { value: "__new_bank__", label: "+ New Bank Account" },
    ],
    [bankAccountOptions],
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

  const statusOptions = useMemo(
    () =>
      ["Active", "Approved", "Pending"].map((status) => ({
        value: status,
        label: status,
      })),
    [],
  );

  // ✅ Insert category mutation
  const [insertCategory] = useInsertCategoryMutation();

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
        const createdId = String(created?.Id ?? created?.id ?? created?._id);
        return createdId;
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

  // modals
  const handleAddCashIn = () => {
    setCashInFormMode("cashIn");
    setIsModalOpen1(true);
  };
  const handleAddRequisition = () => {
    setCashInFormMode("requisition");
    setIsModalOpen1(true);
  };
  const handleAddCashOut = () => setIsModalOpen3(true);
  const handleModalClose1 = () => {
    setIsModalOpen1(false);
    setCashInFormMode(isRequisitionMode ? "requisition" : "cashIn");
    setIsNewCategoryAdd(false);
    setNewCategoryNameAdd("");
  };

  const role = localStorage.getItem("role");
  const [updatePettyCash] = useUpdatePettyCashMutation();
  const [isModalOpen2, setIsModalOpen2] = useState(false);
  const [isModalOpen3, setIsModalOpen3] = useState(false);

  const handleModalClose2 = () => setIsModalOpen2(false);
  const handleModalClose3 = () => setIsModalOpen3(false);

  const handleEditClick1 = (rp) => {
    setCurrentProduct({
      ...rp,
      paymentMode: rp.paymentMode ?? "",
      paymentStatus: rp.paymentStatus ?? "",
      note: rp.note ?? "",
      status: rp.status ?? "",
      bankName: rp.bankName ?? "",
      remarks: rp.remarks ?? "",
      amount: rp.amount ?? "",
      userId: userId,
      file: null,
      category: rp.category,
      bookId: rp.bookId ?? "",
    });
    setIsModalOpen2(true);
  };

  const handleUpdateProduct1 = async () => {
    const rowId = currentProduct?.Id ?? currentProduct?.id;
    if (!rowId) return toast.error("Invalid item!");

    try {
      let finalCategoryName = currentProduct.category;

      // If the category is new and being added dynamically
      if (isNewCategoryEdit) {
        const createdCategoryName =
          await addCategoryByName(newCategoryNameEdit);
        if (!createdCategoryName) return;
        finalCategoryName = createdCategoryName; // Using the newly created category name
      }

      const formData = new FormData();
      formData.append("paymentMode", currentProduct.paymentMode);
      formData.append("paymentStatus", currentProduct.paymentStatus);
      if (isRequisitionMode) formData.append("mode", "requisition");
      formData.append("note", currentProduct.note);
      formData.append("date", currentProduct.date);
      formData.append("status", currentProduct.status);
      formData.append("category", finalCategoryName); // Using category name here

      formData.append("userId", userId);
      formData.append("actorRole", role);
      formData.append(
        "bankName",
        currentProduct.paymentMode === "Bank" ? currentProduct.bankName : "",
      );
      formData.append("remarks", currentProduct.remarks?.trim() || "");
      formData.append("amount", String(Number(currentProduct.amount)));
      if (currentProduct.file) formData.append("file", currentProduct.file);
      if (currentProduct.bookId)
        formData.append("bookId", currentProduct.bookId);

      const res = await updatePettyCash({ id: rowId, data: formData }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated!");

        setIsModalOpen(false);
        setCurrentProduct(null);
        setIsNewCategoryEdit(false);
        setNewCategoryNameEdit("");
        refetch?.();
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleEditClick = (rp) => {
    setCurrentProduct({
      ...rp,
      paymentMode: rp.paymentMode ?? "",
      paymentStatus: rp.paymentStatus ?? "",
      note: rp.note ?? "",
      status: rp.status ?? "",
      bankName: rp.bankName ?? "",
      remarks: rp.remarks ?? "",
      amount: rp.amount ?? "",
      date: rp.date ?? "",
      userId: userId,
      file: null,
      category: rp.category,
      bookId: rp.bookId ?? "",
    });
    setIsModalOpen(true);
  };

  const handleUpdateProduct = async () => {
    const rowId = currentProduct?.Id ?? currentProduct?.id;
    if (!rowId) return toast.error("Invalid item!");

    try {
      const formData = new FormData();
      formData.append("paymentMode", currentProduct.paymentMode);
      formData.append("paymentStatus", currentProduct.paymentStatus);
      if (isRequisitionMode) formData.append("mode", "requisition");
      formData.append("note", currentProduct.note);
      formData.append("status", currentProduct.status);
      formData.append("date", currentProduct.date);
      formData.append("userId", userId);
      formData.append("actorRole", role);
      formData.append(
        "bankName",
        currentProduct.paymentMode === "Bank" ? currentProduct.bankName : "",
      );
      formData.append("remarks", currentProduct.remarks?.trim() || "");
      formData.append("amount", String(Number(currentProduct.amount)));
      if (currentProduct.file) formData.append("file", currentProduct.file);
      if (currentProduct.bookId)
        formData.append("bookId", currentProduct.bookId);

      const res = await updatePettyCash({ id: rowId, data: formData }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated!");

        setIsModalOpen(false);
        setCurrentProduct(null);
        setIsNewCategoryEdit(false);
        setNewCategoryNameEdit("");
        refetch?.();
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // insert
  const [insertPettyCash] = useInsertPettyCashMutation();
  const [approvePettyCash] = useApprovePettyCashMutation();
  const handleCreateProduct = async (e) => {
    e.preventDefault();

    if (!createProduct.amount) return toast.error("Amount is required!");
    if (!createProduct.paymentMode)
      return toast.error("Payment Mode is required!");
    if (createProduct.paymentMode === "Bank" && !createProduct.bankName)
      return toast.error("Bank Account is required!");
    // Category check - Make sure categoryName is either selected or added
    if (!createProduct.category && !isNewCategoryAdd) {
      return toast.error("Category is required!");
    }
    try {
      // Handling new category creation
      let finalCategoryName = createProduct.category;

      // If the category is new and being added dynamically
      if (isNewCategoryAdd) {
        const createdCategoryName = await addCategoryByName(newCategoryNameAdd);
        if (!createdCategoryName) return;
        finalCategoryName = createdCategoryName; // Using the newly created category name
      }

      const formData = new FormData();
      formData.append("paymentMode", createProduct.paymentMode);
      formData.append("date", createProduct.date);
      formData.append("paymentStatus", "CashIn");
      const shouldCreateRequisition =
        isRequisitionMode && cashInFormMode === "requisition";

      if (shouldCreateRequisition) {
        formData.append("status", "Pending");
        formData.append("mode", "requisition");
      } else {
        formData.append("mode", "cashIn");
      }
      formData.append(
        "bankName",
        createProduct.paymentMode === "Bank" ? createProduct.bankName : "",
      );
      formData.append("category", finalCategoryName); // Using category name here

      formData.append("remarks", createProduct.remarks?.trim() || "");
      formData.append("amount", String(Number(createProduct.amount)));
      if (createProduct.file) formData.append("file", createProduct.file);
      if (createProduct.bookId) formData.append("bookId", createProduct.bookId);

      const res = await insertPettyCash(formData).unwrap();

      if (res?.success) {
        toast.success("Successfully created!");
        setIsModalOpen1(false);
        setCreateProduct({
          paymentMode: "",
          paymentStatus: "",
          bankName: "",
          bankAccount: "",
          remarks: "",
          amount: "",
          category: "", // Reset the category name
          date: "",
          file: null,
          bookId: "",
        });
        refetch?.();
      } else toast.error(res?.message || "Create failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  const handleApproveRequisition = async (rowId) => {
    try {
      const res = await approvePettyCash(rowId).unwrap();
      if (res?.success) {
        toast.success("Requisition approved successfully!");
        refetch?.();
      } else {
        toast.error(res?.message || "Approval failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Approval failed!");
    }
  };

  const handleCreateProduct1 = async (e) => {
    e.preventDefault();

    if (!createProduct.amount) return toast.error("Amount is required!");
    if (!createProduct.paymentMode)
      return toast.error("Payment Mode is required!");
    if (createProduct.paymentMode === "Bank" && !createProduct.bankName)
      return toast.error("Bank Account is required!");

    if (!createProduct.category && !isNewCategoryAdd) {
      return toast.error("Category is required!");
    }

    try {
      let finalCategoryName = createProduct.category;

      if (isNewCategoryAdd) {
        const createdCategoryName = await addCategoryByName(newCategoryNameAdd);
        if (!createdCategoryName) return;
        finalCategoryName = createdCategoryName;
      }

      const formData = new FormData();

      formData.append("paymentMode", createProduct.paymentMode);
      formData.append("date", createProduct.date);
      formData.append("paymentStatus", "CashOut");

      formData.append(
        "bankName",
        createProduct.paymentMode === "Bank" ? createProduct.bankName : "",
      );

      formData.append("category", finalCategoryName);
      formData.append("remarks", createProduct.remarks?.trim() || "");
      formData.append("amount", String(Number(createProduct.amount)));

      if (createProduct.file) formData.append("file", createProduct.file);
      if (createProduct.bookId) formData.append("bookId", createProduct.bookId);

      const res = await insertPettyCash(formData).unwrap();

      if (res?.success) {
        toast.success("Successfully created!");
        setIsModalOpen3(false);

        setCreateProduct({
          paymentMode: "",
          paymentStatus: "",
          bankName: "",
          bankAccount: "",
          remarks: "",
          amount: "",
          category: "",
          date: new Date().toISOString().slice(0, 10),
          file: null,
          bookId: "",
        });

        setIsNewCategoryAdd(false);
        setNewCategoryNameAdd("");

        refetch?.();
      } else {
        toast.error(res?.message || "Create failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  // delete
  const [deletePettyCash] = useDeletePettyCashMutation();
  const handleDeleteProduct = async (rowId) => {
    if (!rowId) return toast.error("Invalid item!");
    if (
      !(await requestDeleteConfirmation({
        message: "Do you want to delete this item?",
      }))
    )
      return;

    try {
      const res = await deletePettyCash({
        id: rowId,
        mode: isRequisitionMode ? "requisition" : undefined,
      }).unwrap();
      if (res?.success) {
        toast.success("Deleted!");
        refetch?.();
      } else toast.error(res?.message || "Delete failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setFilterPaymentMode("");
    setFilterPaymentStatus("");
    setFilterCategory("");
    setFilterBook("");
  };

  // report states
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);
  const [reportType, setReportType] = useState(""); // "pdf" | "sheet"
  const [reportBlob, setReportBlob] = useState(null);
  const [reportBlobUrl, setReportBlobUrl] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [sheetPreview, setSheetPreview] = useState({ header: [], rows: [] });

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

  const handleReportPdf = async () => {
    try {
      if (!products.length) return toast.error("No data found!");

      setReportType("pdf");
      setReportLoading(true);
      setIsReportPreviewOpen(true);
      setIsReportMenuOpen(false);

      const blob = await generatePettyCashPdf({ products });

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

      const { blob, preview } = generatePettyCashXlsx({ products });

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

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  const handleNoteClick = (note) => {
    setNoteContent(note);
    setIsNoteModalOpen(true); // Open the modal
  };

  const handleNoteModalClose = () => {
    setIsNoteModalOpen(false); // Close the modal
  };

  const selectMenuProps = {
    menuPortalTarget: typeof document !== "undefined" ? document.body : null,
    menuPosition: "fixed",
  };

  // ✅ Books
  const {
    data: allBookRes,
    isError: isErrorBook,
    error: errorBook,
  } = useGetAllBookWithoutQueryQuery();
  const books = allBookRes?.data || [];


  useEffect(() => {
    if (isErrorBook) console.error("Error fetching Books", errorBook);
  }, [isErrorBook, errorBook]);

  const bookOptions = useMemo(
    () =>
      (books || []).map((s) => ({
        value: String(s?.Id ?? ""),
        label: s?.name || "Unnamed Book",
      })),
    [books],
  );


  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {!isRequisitionMode && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          {/* CashIn */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-emerald-50/70 to-transparent" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Total CashIn
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
                  Total CashOut
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
                  Net Balance
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
      )}

      {/* Header row */}
      {/* <div className="my-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
     
        <button
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition w-full sm:w-auto"
          onClick={handleAddProduct}
          type="button"
        >
          Add <Plus size={18} className="ml-2" />
        </button>

        <div className="flex justify-end">
          <ReportMenu
            isOpen={isReportMenuOpen}
            setIsOpen={setIsReportMenuOpen}
            onGoogleSheet={handleReportSheet}
            onPdf={handleReportPdf}
            disabled={isLoading}
          />
        </div>
      </div> */}

      <div className="my-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Actions */}
        <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center sm:gap-5">
          {/* Cash In (Primary) */}

          {isRequisitionMode && (
            <button
              type="button"
              onClick={
                isRequisitionMode ? handleAddRequisition : handleAddCashIn
              }
              className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 active:bg-indigo-800 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/30 sm:w-auto"
            >
              Petty Cash Requisition
            </button>
          )}

          {!isRequisitionMode && (
            <button
              type="button"
              onClick={handleAddCashOut}
              className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-indigo-600  px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 active:bg-indigo-800 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/30 sm:w-auto"
            >
              <Minus size={18} className="text-white" />
              Cash Out
            </button>
          )}
        </div>

        {/* Right: Search Input */}
        <div className="relative w-full sm:max-w-[520px]">
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
              setStartPage(1);
            }}
            placeholder="Search..."
            className="w-full rounded-lg border border-gray-200 bg-white px-5 py-3 pr-12 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 shadow-sm"
          />
          <Search
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
            size={18}
          />
        </div>

        {/* Right: Report Menu */}
        {!isRequisitionMode && (
          <div className="flex w-full justify-end sm:w-auto">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-md">
              <ReportMenu
                isOpen={isReportMenuOpen}
                setIsOpen={setIsReportMenuOpen}
                onGoogleSheet={handleReportSheet}
                onPdf={handleReportPdf}
                disabled={isLoading}
              />
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center mb-6 w-full justify-center mx-auto">
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 outline-none
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 outline-none
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Payment Mode:</label>
          <Select
            options={paymentModeOptions}
            value={
              paymentModeOptions.find(
                (option) => option.value === filterPaymentMode,
              ) || null
            }
            onChange={(selected) => setFilterPaymentMode(selected?.value || "")}
            placeholder="All"
            isClearable
            styles={selectStyles}
            className="text-black"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">
            {t.book || "Book"}:
          </label>
          <Select
            options={bookOptions}
            value={
              bookOptions.find(
                (option) => String(option.value) === String(filterBook),
              ) || null
            }
            onChange={(selected) => setFilterBook(selected?.value || "")}
            placeholder="All"
            isClearable
            styles={selectStyles}
            {...selectMenuProps}
            className="text-black"
          />
        </div>

        {!isRequisitionMode && (
          <div className="flex flex-col">
            <label className="text-sm text-slate-600 mb-1">
              Payment Status:
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
              placeholder="All"
              isClearable
              styles={selectStyles}
              className="text-black"
            />
          </div>
        )}
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Category:</label>
          <Select
            options={categoryOptions.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
            value={
              categoryOptions
                .map((c) => ({ value: c.id, label: c.name }))
                .find(
                  (option) => String(option.value) === String(filterCategory),
                ) || null
            }
            onChange={(selected) => setFilterCategory(selected?.value || "")}
            placeholder="All"
            isClearable
            styles={selectStyles}
            className="text-black"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Per Page</label>
          <Select
            options={[10, 20, 50, 100].map((v) => ({
              value: v,
              label: String(v),
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

        <div>
          <button
            className="flex items-center mt-0 md:mt-6 bg-indigo-600 hover:bg-indigo-700 text-white transition duration-200 p-2 rounded-lg w-36 justify-center mx-auto md:col-span-5"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 bg-white">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Book
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Document
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Payment Mode
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Bank Account
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Payment Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Remarks
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {products.map((rp) => {
              const rowId = rp.Id ?? rp.id;

              const safePath = String(rp.file || "").replace(/\\/g, "/");
              const fileUrl = safePath
                ? `${import.meta.env.VITE_API_URL}${safePath}`
                : "";
              const ext = safePath.split(".").pop()?.toLowerCase();
              const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(
                ext,
              );
              const isPdf = ext === "pdf";

              return (
                <motion.tr
                  key={rowId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.date || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.book?.name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {!safePath ? (
                      "-"
                    ) : isImage ? (
                      <a href={fileUrl} target="_blank" rel="noreferrer">
                        <img
                          src={fileUrl}
                          alt="document"
                          className="h-12 w-12 object-cover rounded border border-slate-200 hover:opacity-80"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </a>
                    ) : isPdf ? (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 rounded bg-indigo-600 text-white text-xs hover:bg-indigo-700"
                      >
                        View PDF
                      </a>
                    ) : (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 underline"
                      >
                        Open File
                      </a>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.category || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.paymentMode || "-"}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.paymentMode === "Bank" ? rp.bankName || "-" : "-"}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.paymentStatus || "-"}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.remarks || "-"}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 tabular-nums">
                    {Number(rp.amount || 0).toFixed(2)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    <span
                      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                        rp.status === "Approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100"
                          : rp.status === "Active"
                            ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-100"
                            : "bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-100"
                      }`}
                    >
                      {rp.status}
                    </span>
                  </td>

                  {/* <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                      className="text-indigo-600 hover:text-indigo-800"
                      type="button"
                    >
                      <Edit size={18} />
                    </button>

                    {role === "superAdmin" || role === "admin" ? (
                      <button
                        onClick={() => handleDeleteProduct(rowId)}
                        className="text-red-600 hover:text-red-800 ms-4"
                        type="button"
                      >
                        <Trash2 size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEditClick1(rp)}
                        className="text-red-600 hover:text-red-800 ms-4"
                        type="button"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td> */}

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-3">
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

                      {/* {isRequisitionMode &&
                      (role === "superAdmin" || role === "admin") ? (
                        <button
                          onClick={() => handleApproveRequisition(rowId)}
                          className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          type="button"
                        >
                          Approve
                        </button>
                      ) : null} */}

                      {isRequisitionMode &&
                      (role === "superAdmin" || role === "admin") &&
                      String(rp.status || "").toLowerCase() !== "approved" ? (
                        <button
                          onClick={() => handleApproveRequisition(rowId)}
                          className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          type="button"
                        >
                          Approve
                        </button>
                      ) : null}

                      {role === "superAdmin" || role === "admin" ? (
                        <button
                          onClick={() => handleDeleteProduct(rowId)}
                          className="text-red-600 hover:text-red-700"
                          type="button"
                        >
                          <Trash2 size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEditClick1(rp)}
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
                  colSpan={11}
                  className="px-6 py-6 text-center text-sm text-slate-600"
                >
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center flex-wrap gap-2 mt-6">
        <button
          onClick={handlePreviousSet}
          disabled={startPage === 1}
          className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
        >
          Prev
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

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen && !!currentProduct}
        onClose={() => {
          setIsModalOpen(false);
          setCurrentProduct(null);
        }}
        title="Edit Petty Cash Record"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Date
              </label>
              <input
                type="date"
                value={currentProduct?.date || ""}
                onChange={(e) =>
                  setCurrentProduct({ ...currentProduct, date: e.target.value })
                }
                className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={currentProduct?.amount || ""}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    amount: e.target.value,
                  })
                }
                className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              />
            </div>
            {/* <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.book || "Book"}
              </label>
              <Select
                options={bookOptions}
                value={
                  bookOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(currentProduct?.bookId || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCurrentProduct({
                    ...currentProduct,
                    bookId: selected?.value || "",
                  })
                }
                placeholder={t.select_book || "Select Book"}
                isClearable
                styles={selectStyles}
                {...selectMenuProps}
                className="text-black bg-white"
              />
            </div> */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Payment Mode
              </label>
              <Select
                options={paymentModeOptions}
                value={
                  paymentModeOptions.find(
                    (option) => option.value === currentProduct?.paymentMode,
                  ) || null
                }
                onChange={(selected) =>
                  setCurrentProduct({
                    ...currentProduct,
                    paymentMode: selected?.value || "",
                  })
                }
                styles={selectStyles}
                className="text-black"
              />
            </div>
            {currentProduct?.paymentMode === "Bank" && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  Bank Account
                </label>
                <Select
                  options={bankAccountSelectOptions}
                  value={
                    isNewBankAccountEdit
                      ? { value: "__new_bank__", label: "+ New Bank Account" }
                      : bankAccountOptions.find(
                          (option) => option.value === currentProduct?.bankName,
                        ) || null
                  }
                  onChange={(selected) => {
                    if (selected?.value === "__new_bank__") {
                      setIsNewBankAccountEdit(true);
                    } else {
                      setIsNewBankAccountEdit(false);
                      setCurrentProduct({
                        ...currentProduct,
                        bankName: selected?.value || "",
                      });
                    }
                  }}
                  styles={selectStyles}
                  className="text-black"
                />
                {isNewBankAccountEdit && (
                  <div className="flex gap-2 mt-2 items-end">
                    <input
                      type="text"
                      value={newBankNameEdit}
                      onChange={(e) => setNewBankNameEdit(e.target.value)}
                      placeholder="Bank Name"
                      className="flex-1 h-11 border border-slate-200 rounded-2xl px-4 text-sm text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10"
                    />
                    <input
                      type="text"
                      value={newAccountNumberEdit}
                      onChange={(e) => setNewAccountNumberEdit(e.target.value)}
                      placeholder="Account Number"
                      className="flex-1 h-11 border border-slate-200 rounded-2xl px-4 text-sm text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10"
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
                            bankName: created.accountNumber,
                          });
                          setIsNewBankAccountEdit(false);
                          setNewBankNameEdit("");
                          setNewAccountNumberEdit("");
                        }
                      }}
                      className="h-11 px-5 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Category
            </label>
            <div className="flex gap-2">
              <Select
                options={categorySelectOptions}
                value={
                  isNewCategoryEdit
                    ? { value: "__new__", label: "+ New Category" }
                    : categorySelectOptions.find(
                        (option) => option.value === currentProduct?.category,
                      ) || null
                }
                onChange={(selected) => {
                  const v = selected?.value || "";
                  if (v === "__new__") {
                    setIsNewCategoryEdit(true);
                  } else {
                    setIsNewCategoryEdit(false);
                    setCurrentProduct({ ...currentProduct, category: v });
                  }
                }}
                placeholder="Select Category"
                styles={selectStyles}
                className="flex-1 text-black"
              />
            </div>
            {isNewCategoryEdit && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newCategoryNameEdit}
                  onChange={(e) => setNewCategoryNameEdit(e.target.value)}
                  placeholder="Enter category name"
                  className="flex-1 h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition shadow-inner"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const id = await addCategoryByName(newCategoryNameEdit);
                    if (id) {
                      setCurrentProduct({
                        ...currentProduct,
                        category: newCategoryNameEdit,
                      });
                      setIsNewCategoryEdit(false);
                      setNewCategoryNameEdit("");
                    }
                  }}
                  className="px-6 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Remarks
            </label>
            <textarea
              value={currentProduct?.remarks || ""}
              onChange={(e) =>
                setCurrentProduct({
                  ...currentProduct,
                  remarks: e.target.value,
                })
              }
              className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              rows={3}
            />
          </div>

          {role === "superAdmin" && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Status
              </label>
              <Select
                options={statusOptions}
                value={
                  statusOptions.find(
                    (option) => option.value === currentProduct?.status,
                  ) || null
                }
                onChange={(selected) =>
                  setCurrentProduct({
                    ...currentProduct,
                    status: selected?.value || "",
                  })
                }
                styles={selectStyles}
                className="text-black"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setCurrentProduct(null);
              }}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateProduct}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Cash In Modal */}
      <Modal
        isOpen={isModalOpen1}
        onClose={handleModalClose1}
        title={
          isRequisitionMode && cashInFormMode === "requisition"
            ? "Add Petty Cash Requisition"
            : "Add Petty Cash In"
        }
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateProduct} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Date
              </label>
              <input
                type="date"
                value={createProduct.date}
                onChange={(e) =>
                  setCreateProduct({ ...createProduct, date: e.target.value })
                }
                className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={createProduct.amount}
                onChange={(e) =>
                  setCreateProduct({ ...createProduct, amount: e.target.value })
                }
                className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.book || "Book"}
              </label>
              <Select
                options={bookOptions}
                value={
                  bookOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(createProduct?.bookId || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCreateProduct({
                    ...createProduct,
                    bookId: selected?.value || "",
                  })
                }
                placeholder={t.select_book || "Select Book"}
                isClearable
                styles={selectStyles}
                {...selectMenuProps}
                className="text-black bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Payment Mode
              </label>
              <Select
                options={paymentModeOptions}
                value={
                  paymentModeOptions.find(
                    (option) => option.value === createProduct.paymentMode,
                  ) || null
                }
                onChange={(selected) =>
                  setCreateProduct({
                    ...createProduct,
                    paymentMode: selected?.value || "",
                  })
                }
                placeholder="Select Mode"
                styles={selectStyles}
                className="text-black"
              />
            </div>
            {createProduct.paymentMode === "Bank" && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  Bank Account
                </label>
                <Select
                  options={bankAccountSelectOptions}
                  value={
                    isNewBankAccountAdd
                      ? { value: "__new_bank__", label: "+ New Bank Account" }
                      : bankAccountOptions.find(
                          (option) => option.value === createProduct.bankName,
                        ) || null
                  }
                  onChange={(selected) => {
                    if (selected?.value === "__new_bank__") {
                      setIsNewBankAccountAdd(true);
                    } else {
                      setIsNewBankAccountAdd(false);
                      setCreateProduct({
                        ...createProduct,
                        bankName: selected?.value || "",
                      });
                    }
                  }}
                  placeholder="Select Bank Account"
                  styles={selectStyles}
                  className="text-black"
                />
                {isNewBankAccountAdd && (
                  <div className="flex gap-2 mt-2 items-end">
                    <input
                      type="text"
                      value={newBankNameAdd}
                      onChange={(e) => setNewBankNameAdd(e.target.value)}
                      placeholder="Bank Name"
                      className="flex-1 h-11 border border-slate-200 rounded-2xl px-4 text-sm text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10"
                    />
                    <input
                      type="text"
                      value={newAccountNumberAdd}
                      onChange={(e) => setNewAccountNumberAdd(e.target.value)}
                      placeholder="Account Number"
                      className="flex-1 h-11 border border-slate-200 rounded-2xl px-4 text-sm text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10"
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
                            bankName: created.accountNumber,
                          });
                          setIsNewBankAccountAdd(false);
                          setNewBankNameAdd("");
                          setNewAccountNumberAdd("");
                        }
                      }}
                      className="h-11 px-5 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Category
            </label>
            <div className="flex gap-2">
              <Select
                options={categorySelectOptions}
                value={
                  isNewCategoryAdd
                    ? { value: "__new__", label: "+ New Category" }
                    : categorySelectOptions.find(
                        (option) => option.value === createProduct.category,
                      ) || null
                }
                onChange={(selected) => {
                  const v = selected?.value || "";
                  if (v === "__new__") {
                    setIsNewCategoryAdd(true);
                  } else {
                    setIsNewCategoryAdd(false);
                    setCreateProduct({ ...createProduct, category: v });
                  }
                }}
                placeholder="Select Category"
                styles={selectStyles}
                className="flex-1 text-black"
              />
            </div>
            {isNewCategoryAdd && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newCategoryNameAdd}
                  onChange={(e) => setNewCategoryNameAdd(e.target.value)}
                  placeholder="Enter category name"
                  className="flex-1 h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition shadow-inner"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const id = await addCategoryByName(newCategoryNameAdd);
                    if (id) {
                      setCreateProduct({
                        ...createProduct,
                        category: newCategoryNameAdd,
                      });
                      setIsNewCategoryAdd(false);
                      setNewCategoryNameAdd("");
                    }
                  }}
                  className="px-6 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Remarks
            </label>
            <textarea
              value={createProduct.remarks}
              onChange={(e) =>
                setCreateProduct({ ...createProduct, remarks: e.target.value })
              }
              className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              rows={2}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleModalClose1}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              {isRequisitionMode && cashInFormMode === "requisition"
                ? "Submit Requisition"
                : "Confirm Cash In"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Cash Out Modal */}
      <Modal
        isOpen={isModalOpen3}
        onClose={handleModalClose3}
        title="Add Petty Cash Out"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateProduct1} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Date
              </label>
              <input
                type="date"
                value={createProduct.date}
                onChange={(e) =>
                  setCreateProduct({ ...createProduct, date: e.target.value })
                }
                className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={createProduct.amount}
                onChange={(e) =>
                  setCreateProduct({ ...createProduct, amount: e.target.value })
                }
                className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.book || "Book"}
              </label>
              <Select
                options={bookOptions}
                value={
                  bookOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(createProduct?.bookId || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCreateProduct({
                    ...createProduct,
                    bookId: selected?.value || "",
                  })
                }
                placeholder={t.select_book || "Select Book"}
                isClearable
                styles={selectStyles}
                {...selectMenuProps}
                className="text-black bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Payment Mode
              </label>
              <Select
                options={paymentModeOptions}
                value={
                  paymentModeOptions.find(
                    (option) => option.value === createProduct.paymentMode,
                  ) || null
                }
                onChange={(selected) =>
                  setCreateProduct({
                    ...createProduct,
                    paymentMode: selected?.value || "",
                  })
                }
                placeholder="Select Mode"
                styles={selectStyles}
                className="text-black"
              />
            </div>
            {createProduct.paymentMode === "Bank" && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  Bank Account
                </label>
                <Select
                  options={bankAccountSelectOptions}
                  value={
                    isNewBankAccountAdd
                      ? { value: "__new_bank__", label: "+ New Bank Account" }
                      : bankAccountOptions.find(
                          (option) => option.value === createProduct.bankName,
                        ) || null
                  }
                  onChange={(selected) => {
                    if (selected?.value === "__new_bank__") {
                      setIsNewBankAccountAdd(true);
                    } else {
                      setIsNewBankAccountAdd(false);
                      setCreateProduct({
                        ...createProduct,
                        bankName: selected?.value || "",
                      });
                    }
                  }}
                  placeholder="Select Bank Account"
                  styles={selectStyles}
                  className="text-black"
                />
                {isNewBankAccountAdd && (
                  <div className="flex gap-2 mt-2 items-end">
                    <input
                      type="text"
                      value={newBankNameAdd}
                      onChange={(e) => setNewBankNameAdd(e.target.value)}
                      placeholder="Bank Name"
                      className="flex-1 h-11 border border-slate-200 rounded-2xl px-4 text-sm text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10"
                    />
                    <input
                      type="text"
                      value={newAccountNumberAdd}
                      onChange={(e) => setNewAccountNumberAdd(e.target.value)}
                      placeholder="Account Number"
                      className="flex-1 h-11 border border-slate-200 rounded-2xl px-4 text-sm text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10"
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
                            bankName: created.accountNumber,
                          });
                          setIsNewBankAccountAdd(false);
                          setNewBankNameAdd("");
                          setNewAccountNumberAdd("");
                        }
                      }}
                      className="h-11 px-5 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Category
            </label>
            <div className="flex gap-2">
              <Select
                options={categorySelectOptions}
                value={
                  isNewCategoryAdd
                    ? { value: "__new__", label: "+ New Category" }
                    : categorySelectOptions.find(
                        (option) => option.value === createProduct.category,
                      ) || null
                }
                onChange={(selected) => {
                  const v = selected?.value || "";
                  if (v === "__new__") {
                    setIsNewCategoryAdd(true);
                  } else {
                    setIsNewCategoryAdd(false);
                    setCreateProduct({ ...createProduct, category: v });
                  }
                }}
                placeholder="Select Category"
                styles={selectStyles}
                className="flex-1 text-black"
              />
            </div>
            {isNewCategoryAdd && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newCategoryNameAdd}
                  onChange={(e) => setNewCategoryNameAdd(e.target.value)}
                  placeholder="Enter category name"
                  className="flex-1 h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition shadow-inner"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const id = await addCategoryByName(newCategoryNameAdd);
                    if (id) {
                      setCreateProduct({
                        ...createProduct,
                        category: newCategoryNameAdd,
                      });
                      setIsNewCategoryAdd(false);
                      setNewCategoryNameAdd("");
                    }
                  }}
                  className="px-6 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Remarks
            </label>
            <textarea
              value={createProduct.remarks}
              onChange={(e) =>
                setCreateProduct({ ...createProduct, remarks: e.target.value })
              }
              className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              rows={2}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleModalClose3}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              Confirm Cash Out
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete/Status Modal */}
      <Modal
        isOpen={isModalOpen2 && !!currentProduct}
        onClose={handleModalClose2}
        title={role === "superAdmin" ? "Update Status" : "Delete Request"}
      >
        <div className="space-y-6">
          {role === "superAdmin" ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Status
              </label>
              <Select
                options={statusOptions}
                value={
                  statusOptions.find(
                    (option) => option.value === currentProduct?.status,
                  ) || null
                }
                onChange={(selected) =>
                  setCurrentProduct({
                    ...currentProduct,
                    status: selected?.value || "",
                  })
                }
                styles={selectStyles}
                className="text-black"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Reason for Deletion
              </label>
              <textarea
                value={currentProduct?.note || ""}
                onChange={(e) =>
                  setCurrentProduct({ ...currentProduct, note: e.target.value })
                }
                className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                rows={4}
                placeholder="Briefly explain why this record should be removed..."
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={handleModalClose2}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateProduct1}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              Confirm Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Note View Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={handleNoteModalClose}
        title="Record Note"
      >
        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
              {noteContent}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={handleNoteModalClose}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              Close
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
    </motion.div>
  );
};

export default PettyCashTable;
