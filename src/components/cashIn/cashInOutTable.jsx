import { motion } from "framer-motion";
import { Edit, Minus, Notebook, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useDeleteCashInOutMutation,
  useGetAllCashInOutQuery,
  useGetAllCashInOutWithoutQueryQuery,
  useInsertCashInOutMutation,
  useUpdateCashInOutMutation,
} from "../../features/cashInOut/cashInOut";
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
import { useLayout } from "../../context/LayoutContext";
import { translations } from "../../utils/translations";
import { useGetAllSupplierWithoutQueryQuery } from "../../features/supplier/supplier";
import { useGetAllSupplierHistoryQuery } from "../../features/supplierHistory/supplierHistory";
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
  const [filterLender, setFilterLender] = useState("");

  const userId = localStorage.getItem("userId");

  const [createProduct, setCreateProduct] = useState({
    paymentMode: "",
    paymentStatus: "",
    bankName: "",
    bankAccount: "",
    supplierId: "",
    lender: "",
    note: "",
    status: "",
    category: "",
    remarks: "",
    amount: "",
    file: null,
    date: new Date().toISOString().slice(0, 10),
  });
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const [products, setProducts] = useState([]);

  // filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
    filterLender,
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
    if (!isLoanCategory(createProduct.category) && createProduct.lender) {
      setCreateProduct((p) => ({ ...p, lender: "" }));
    }
  }, [createProduct.category]);

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
    if (!isLoanCategory(currentProduct.category) && currentProduct.lender) {
      setCurrentProduct((p) => ({ ...p, lender: "" }));
    }
  }, [currentProduct?.category]);

  // const queryArgs = useMemo(() => {
  //   const args = {
  //     page: currentPage,
  //     limit: itemsPerPage,
  //     bookId: id,
  //     startDate: startDate || undefined,
  //     endDate: endDate || undefined,
  //     paymentMode: filterPaymentMode || undefined,
  //     paymentStatus: filterPaymentStatus || undefined,
  //     category: filterCategory || undefined,
  //     searchTerm: debouncedSearchTerm || undefined, // ensure it's included in the query
  //   };

  //   Object.keys(args).forEach((k) => {
  //     if (args[k] === undefined || args[k] === null || args[k] === "")
  //       delete args[k]; // Clean empty or undefined values
  //   });

  //   return args;
  // }, [
  //   currentPage,
  //   itemsPerPage,
  //   id,
  //   startDate,
  //   endDate,
  //   searchTerm, // searchTerm should be included
  //   filterPaymentMode,
  //   filterPaymentStatus,
  //   filterCategory,
  // ]);

  // const shouldSkip = !id;

  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      bookId: id,
      category: filterCategory || undefined,
      lender: filterLender || undefined,
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
    filterLender,
    searchTerm,
  ]);

  const { data, isLoading, isError, error, refetch } = useGetAllCashInOutQuery(
    queryArgs,
    // { skip: shouldSkip },
  );

  useEffect(() => {
    if (isError) console.error("Error:", error);
    if (!isLoading && data) {
      setProducts(data?.data ?? []);
      setTotalPages(Math.ceil((data?.meta?.count || 0) / itemsPerPage) || 1);
    }
  }, [data, isLoading, isError, error, itemsPerPage]);

  const { data: allCashInOutRes } = useGetAllCashInOutWithoutQueryQuery();

  const lenderOptions = useMemo(() => {
    const rows = Array.isArray(allCashInOutRes?.data)
      ? allCashInOutRes.data
      : Array.isArray(products)
        ? products
        : [];

    const values = [
      ...rows.map(
        (row) =>
          row?.lender ??
          row?.loanName ??
          row?.loan_person_name ??
          row?.loanPersonName ??
          "",
      ),
      createProduct?.lender || "",
      currentProduct?.lender || "",
    ];

    const seen = new Set();

    return values.filter((value) => {
      const normalized = String(value || "").trim();
      const key = normalized.toLowerCase();

      if (!normalized || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [
    allCashInOutRes?.data,
    products,
    createProduct?.lender,
    currentProduct?.lender,
  ]);

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

  const resetCreateProduct = () => {
    setCreateProduct({
      paymentMode: "",
      paymentStatus: "",
      bankName: "",
      bankAccount: "",
      supplierId: "",
      lender: "",
      note: "",
      status: "",
      category: "",
      remarks: "",
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
      supplierId: rp.supplierId ?? "",
      lender:
        rp.lender ??
        rp.loanName ??
        rp.loan_person_name ??
        rp.loanPersonName ??
        "",
      note: rp.note ?? "",
      status: rp.status ?? "",
      date: rp.date ?? "",
      userId: userId,
      category: rp.category,
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
      supplierId: rp.supplierId ?? "",
      lender:
        rp.lender ??
        rp.loanName ??
        rp.loan_person_name ??
        rp.loanPersonName ??
        "",
      bankAccount: rp.bankAccount ?? "",
      note: rp.note ?? "",
      status: rp.status ?? "",
      userId: userId,
      category: rp.category,
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

      if (
        isLoanCategory(finalCategoryName) &&
        !String(currentProduct.lender || "").trim()
      ) {
        return toast.error("Lender name is required!");
      }

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
      formData.append(
        "note",
        (currentProduct.note || currentProduct.remarks || "").trim(),
      );
      formData.append("supplierId", currentProduct?.supplierId || "");
      formData.append("lender", currentProduct?.lender?.trim() || "");
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

      // Use categoryName (not categoryId)
      formData.append("category", finalCategoryName); // Using category name here
      formData.append("remarks", currentProduct.remarks?.trim() || "");
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

      // If the category is new and being added dynamically
      if (isNewCategoryAdd) {
        const createdCategoryName = await addCategoryByName(newCategoryNameAdd);
        if (!createdCategoryName) return;
        finalCategoryName = createdCategoryName; // Using the newly created category name
      }

      if (
        isLoanCategory(finalCategoryName) &&
        !String(createProduct.lender || "").trim()
      ) {
        return toast.error("Lender name is required!");
      }

      // Form data preparation for submission
      const formData = new FormData();
      formData.append("paymentMode", createProduct.paymentMode);
      formData.append("paymentStatus", "CashIn");
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

      // Use categoryName (not category)
      formData.append("category", finalCategoryName); // Using category name here
      formData.append("remarks", createProduct.remarks?.trim() || "");
      formData.append("amount", String(Number(createProduct.amount)));
      formData.append("bookId", id);
      formData.append("actorRole", role);
      formData.append("supplierId", createProduct?.supplierId);
      formData.append("lender", createProduct?.lender?.trim() || "");
      if (createProduct.file) formData.append("file", createProduct.file);

      const res = await insertCashIn(formData).unwrap();

      if (res?.success) {
        toast.success("Successfully created!");
        setIsModalOpen1(false);
        setIsNewCategoryAdd(false);
        setNewCategoryNameAdd("");
        setCreateProduct({
          paymentMode: "",
          paymentStatus: "",
          bankName: "",
          bankAccount: "",
          lender: "",
          category: "", // Reset the category name
          remarks: "",
          note: "",
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

      // If the category is new and being added dynamically
      if (isNewCategoryAdd) {
        const createdCategoryName = await addCategoryByName(newCategoryNameAdd);
        if (!createdCategoryName) return;
        finalCategoryName = createdCategoryName; // Using the newly created category name
      }

      if (
        isLoanCategory(finalCategoryName) &&
        !String(createProduct.lender || "").trim()
      ) {
        return toast.error("Lender name is required!");
      }

      // Form data preparation for submission
      const formData = new FormData();
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

      // Use category (not category)
      formData.append("category", finalCategoryName); // Using category name here
      formData.append("remarks", createProduct.remarks?.trim() || "");
      formData.append("amount", String(Number(createProduct.amount)));
      formData.append("bookId", id);
      formData.append("actorRole", role);
      formData.append("supplierId", createProduct?.supplierId);
      formData.append("lender", createProduct?.lender?.trim() || "");
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
          lender: "",
          category: "", // Reset the category name
          remarks: "",
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
    setStartDate("");
    setEndDate("");
    setFilterPaymentMode("");
    setFilterPaymentStatus("");
    setFilterCategory("");
    setFilterLender("");
    setSupplier("");
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

      const blob = await generateCashInOutPdf({
        products,
        bookId: id,
        bookName,
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

  const supplierOptions = useMemo(
    () =>
      (suppliers || []).map((s) => ({
        value: s.Id,
        label: s.name,
      })),
    [suppliers],
  );

  const lenderSelectOptions = useMemo(
    () =>
      (lenderOptions || []).map((name) => ({
        value: name,
        label: name,
      })),
    [lenderOptions],
  );

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

        {/* Right: Search Input */}
        <div className="relative w-full sm:max-w-[520px]">
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
              setStartPage(1);
            }}
            placeholder={t.search}
            className="w-full rounded-lg border border-gray-200 bg-white px-5 py-3 pr-12 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 shadow-sm"
          />
          <Search
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
            size={18}
          />
        </div>

        {/* Right: Report Menu */}
        <div className="flex w-full justify-end sm:w-auto">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-md">
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

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-4 items-end mb-6 w-full [&>*]:min-w-0">
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">{t.from}</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">{t.to}</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">
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
            className="text-black"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">
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
            className="text-black"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Lender</label>
          <Select
            options={lenderSelectOptions}
            value={
              lenderSelectOptions.find(
                (option) => option.value === filterLender,
              ) || null
            }
            onChange={(selected) => setFilterLender(selected?.value || "")}
            placeholder="Search lender"
            isClearable
            styles={selectStyles}
            className="text-black"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">
            {t.category || "Category"}:
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
            className="text-black"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            {t.supplier}
          </label>
          <Select
            options={supplierOptions}
            value={
              supplierOptions.find(
                (o) => String(o.value) === String(supplier),
              ) || null
            }
            onChange={(selected) => setSupplier(selected?.value || "")}
            placeholder={t.search}
            isClearable
            styles={selectStyles}
            className="text-black"
          />
        </div>
        {/* ✅ Per Page Dropdown (same position like your screenshot) */}
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">
            {t.per_page_label}
          </label>
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
        <div className="sm:col-span-2 xl:col-span-7">
          <button
            className="h-11 w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 transition rounded-xl px-4 text-sm font-semibold"
            onClick={clearFilters}
            type="button"
          >
            {t.clear_filters}
          </button>
        </div>
      </div>

      <datalist id="cashinout-lender-options">
        {lenderOptions.map((lender) => (
          <option key={lender} value={lender} />
        ))}
      </datalist>

      {/* Table */}
      <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[1400px] divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t.date}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t.document || "Document"}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t.category || "Category"}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t.payment_mode}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t.bank || "Bank"}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t.bank_account || "Bank Account"}
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

              const safePath = String(rp.file || "").replace(/\\/g, "/");
              const fileUrl = buildFileUrl(rp.file);
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
                  transition={{ duration: 0.2 }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.date || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {!safePath ? (
                      "---"
                    ) : isImage ? (
                      <a href={fileUrl} target="_blank" rel="noreferrer">
                        <img
                          src={fileUrl}
                          alt="document"
                          className="h-12 w-12 object-cover rounded-xl border border-slate-200 hover:opacity-80"
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
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs hover:bg-indigo-700"
                      >
                        {t.view_pdf || "View PDF"}
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
                    <div className="space-y-1">
                      <div>{rp.category || "---"}</div>
                      {(rp.lender ||
                        rp.loanName ||
                        rp.loan_person_name ||
                        rp.loanPersonName) && (
                        <div className="text-xs font-medium text-amber-700">
                          {rp.paymentStatus === "CashOut" ? "To: " : "From: "}
                          {rp.lender ||
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
                    {rp.paymentMode === "Bank" ? rp.bankName || "---" : "---"}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.paymentMode === "Bank"
                      ? rp.bankAccount || "---"
                      : "---"}
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
                    options={bankAccountSelectOptions}
                    value={
                      isNewBankAccountEdit
                        ? { value: "__new_bank__", label: "+ New Bank Account" }
                        : bankAccountOptions.find(
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
                  setCurrentProduct((p) => ({ ...p, category: "" }));
                  return;
                }
                setIsNewCategoryEdit(false);
                setNewCategoryNameEdit("");
                setCurrentProduct((p) => ({ ...p, category: v }));
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

          {isLoanCategory(currentProduct?.category) && (
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                {/* {currentProduct?.paymentStatus === "CashOut"
                  ? "Loan Given To"
                  : "Loan Taken From"} */}
              </label>
              <input
                type="text"
                value={currentProduct?.lender || ""}
                onChange={(e) =>
                  setCurrentProduct((p) => ({
                    ...p,
                    lender: e.target.value,
                  }))
                }
                list="cashinout-lender-options"
                placeholder={
                  currentProduct?.paymentStatus === "CashOut"
                    ? "Enter receiver name"
                    : "Enter provider name"
                }
                className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white outline-none
                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.supplier || "Supplier"}
            </label>
            <select
              value={currentProduct?.supplierId || ""}
              onChange={(e) =>
                setCurrentProduct({
                  ...currentProduct,
                  supplierId: e.target.value,
                })
              }
              className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
            >
              <option value="">{t.select_supplier || "Select Supplier"}</option>
              {suppliers?.map((s) => (
                <option key={s.Id} value={s.Id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

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
                    options={bankAccountSelectOptions}
                    value={
                      isNewBankAccountAdd
                        ? { value: "__new_bank__", label: "+ New Bank Account" }
                        : bankAccountOptions.find(
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
                  setCreateProduct((p) => ({ ...p, category: "" }));
                  return;
                }
                setIsNewCategoryAdd(false);
                setNewCategoryNameAdd("");
                setCreateProduct((p) => ({ ...p, category: value }));
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
                    const createdCategoryName =
                      await addCategoryByName(newCategoryNameAdd);
                    if (!createdCategoryName) return;
                    setCreateProduct((p) => ({
                      ...p,
                      category: createdCategoryName,
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

          {isLoanCategory(createProduct.category) && (
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Loan Taken From
              </label>
              <input
                type="text"
                value={createProduct.lender || ""}
                onChange={(e) =>
                  setCreateProduct((p) => ({
                    ...p,
                    lender: e.target.value,
                  }))
                }
                list="cashinout-lender-options"
                placeholder="Enter provider name"
                className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white outline-none
                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Remarks
              </label>
              <input
                type="text"
                value={createProduct.remarks}
                onChange={(e) =>
                  setCreateProduct({
                    ...createProduct,
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
                    options={bankAccountSelectOptions}
                    value={
                      isNewBankAccountAdd
                        ? { value: "__new_bank__", label: "+ New Bank Account" }
                        : bankAccountOptions.find(
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
                    setCreateProduct((p) => ({ ...p, category: "" }));
                    return;
                  }
                  setIsNewCategoryAdd(false);
                  setNewCategoryNameAdd("");
                  setCreateProduct((p) => ({ ...p, category: value }));
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
                      const createdCategoryName =
                        await addCategoryByName(newCategoryNameAdd);
                      if (!createdCategoryName) return;
                      setCreateProduct((p) => ({
                        ...p,
                        category: createdCategoryName,
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

            {isLoanCategory(createProduct.category) && (
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Loan Given To
                </label>
                <input
                  type="text"
                  value={createProduct.lender || ""}
                  onChange={(e) =>
                    setCreateProduct((p) => ({
                      ...p,
                      lender: e.target.value,
                    }))
                  }
                  list="cashinout-lender-options"
                  placeholder="Enter receiver name"
                  className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white outline-none
                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                />
              </div>
            )}
            {/* <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.supplier || "Supplier"}
              </label>
              <select
                value={createProduct?.supplierId || ""}
                onChange={(e) =>
                  setCreateProduct({
                    ...createProduct,
                    supplierId: e.target.value,
                  })
                }
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              >
                <option value="">
                  {t.select_supplier || "Select Supplier"}
                </option>
                {suppliers?.map((s) => (
                  <option key={s.Id} value={s.Id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div> */}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.supplier || "Supplier"}
              </label>

              <Select
                options={supplierOptions}
                value={
                  supplierOptions.find(
                    (option) => option.value === createProduct?.supplierId,
                  ) || null
                }
                onChange={(selectedOption) =>
                  setCreateProduct({
                    ...createProduct,
                    supplierId: selectedOption?.value || "",
                  })
                }
                placeholder={t.select_supplier || "Select Supplier"}
                className="text-sm"
                styles={selectStyles}
                isClearable
              />

              {createProduct?.supplierId && (
                <p className="mt-2 text-xs font-semibold text-amber-600">
                  Total Due: ৳
                  {Number(
                    suppliersDue?.meta?.totalUnpaid || 0,
                  ).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
