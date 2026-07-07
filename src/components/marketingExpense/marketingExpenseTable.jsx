import { motion } from "framer-motion";
import { Edit, Minus, Notebook, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Modal from "../common/Modal";
import DateRangeFilter from "../common/DateRangeFilter";
import { useParams } from "react-router-dom";

import ReportMenu from "./ReportMenu";
import ReportPreviewModal from "./ReportPreviewModal";

import { generateMarketingExpensePdf } from "../../utils/report/generateMarketingExpensePdf";
import { generateMarketingExpenseXlsx } from "../../utils/report/generateMarketingExpenseXlsx";

import {
  useDeleteMarketingExpenseMutation,
  useGetAllMarketingExpenseQuery,
  useGetSingleMarketingExpenseQuery,
  useInsertMarketingExpenseMutation,
  useUpdateMarketingExpenseMutation,
} from "../../features/marketingExpense/marketingExpense";
import { useLayout } from "../../context/LayoutContext";
import { translations } from "../../utils/translations";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import useDebounce from "../../hooks/useDebounce";


// const BANKS = [
//   "Al Arafah",
//   "BRAC Bank",
//   "Bank Asia",
//   "City Bank",
//   "Dutch-Bangla Bank",
//   "Dhaka Bank",
//   "Eastern Bank",
//   "Islami Bank",
//   "Janata Bank",
//   "Mutual Trust Bank",
//   "One Bank",
//   "Prime Bank",
//   "Pubali Bank",
//   "Premier Bank",
//   "United Commercial Bank",
//   "Sonali Bank",
//   "Standard Chartered",
//   "Trust Bank",
// ];

const MarketingExpenseTable = () => {
  const { language } = useLayout();
  const t = translations[language] || translations.EN;
  const { id } = useParams(); // bookId

  const [isModalOpen, setIsModalOpen] = useState(false); // edit
  const [isModalOpen1, setIsModalOpen1] = useState(false); // add
  const [isModalOpen2, setIsModalOpen2] = useState(false); // delete/note
  const [isModalOpen3, setIsModalOpen3] = useState(false); // delete/note
  const [currentProduct, setCurrentProduct] = useState(null);
  const [filterCategory, setFilterCategory] = useState("");

  const userId = localStorage.getItem("userId");

  const [createProduct, setCreateProduct] = useState({
    paymentMode: "",
    paymentStatus: "",
    bankName: "",
    bankAccount: "",
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

  const role = localStorage.getItem("role");

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

  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [startDate, endDate, filterPaymentMode, filterPaymentStatus]);

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

  // ✅ Bank না হলে bank fields reset (Edit)
  useEffect(() => {
    if (!currentProduct) return;
    if (currentProduct.paymentMode !== "Bank") {
      if (currentProduct.bankName || currentProduct.bankAccount) {
        setCurrentProduct((p) => ({ ...p, bankName: "", bankAccount: "" }));
      }
    }
  }, [currentProduct?.paymentMode]);

  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      bookId: id,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      paymentMode: filterPaymentMode || undefined,
      paymentStatus: filterPaymentStatus || undefined,
      category: filterCategory || undefined,
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
    id,
    startDate,
    endDate,
    searchTerm, // searchTerm should be included
    filterPaymentMode,
    filterPaymentStatus,
    filterCategory,
  ]);

  const shouldSkip = !id;

  const { data, isLoading, isError, error, refetch } =
    useGetAllMarketingExpenseQuery(queryArgs, { skip: shouldSkip });

  useEffect(() => {
    if (isError) console.error("Error:", error);
    if (!isLoading && data) {
      setProducts(data?.data ?? []);
      setTotalPages(Math.ceil((data?.meta?.count || 0) / itemsPerPage) || 1);
    }
  }, [data, isLoading, isError, error, itemsPerPage]);

  // book info (name for report header)
  const { data: bookRes } = useGetSingleMarketingExpenseQuery(id, {
    skip: !id,
  });
  const bookName = bookRes?.data?.name || "";

  // modals
  const handleAddCashIn = () => setIsModalOpen1(true);
  const handleAddCashOut = () => setIsModalOpen3(true);
  const handleModalClose1 = () => {
    setIsModalOpen1(false);
  };
  const handleModalClose3 = () => {
    setIsModalOpen3(false);
  };

  const handleEditClick = (rp) => {
    setCurrentProduct({
      ...rp,
      // paymentMode: rp.paymentMode ?? "",
      paymentStatus: rp.paymentStatus ?? "",
      amount: rp.amount ?? "",
      bankName: rp.bankName ?? "",
      bankAccount: rp.bankAccount ?? "",
      note: rp.note ?? "",
      // status: rp.status ?? "",
      date: rp.date ?? "",
      userId: userId,
      category: rp.category,
      file: null,
    });
    setIsModalOpen(true);
  };

  const handleEditClick1 = (rp) => {
    setCurrentProduct({
      ...rp,
      // paymentMode: rp.paymentMode ?? "",
      paymentStatus: rp.paymentStatus ?? "",
      amount: rp.amount ?? "",
      // bankName: rp.bankName ?? "",
      bankAccount: rp.bankAccount ?? "",
      note: rp.note ?? "",
      status: rp.status ?? "",
      userId: userId,
      category: rp.category,
      file: null,
    });
    setIsModalOpen2(true);
  };

  // update
  const [updateMarketingExpense] = useUpdateMarketingExpenseMutation();

  const handleUpdateProduct = async () => {
    const rowId = currentProduct?.Id ?? currentProduct?.id;
    if (!rowId) return toast.error("Invalid item!");

    try {
      // let finalCategoryName = currentProduct.category;

      // // If the category is new and being added dynamically
      // if (isNewCategoryEdit) {
      //   const createdCategoryName =
      //     await addCategoryByName(newCategoryNameEdit);
      //   if (!createdCategoryName) return;
      //   finalCategoryName = createdCategoryName; // Using the newly created category name
      // }

      const formData = new FormData();
      // formData.append("paymentMode", currentProduct.paymentMode);
      formData.append("paymentStatus", currentProduct.paymentStatus);
      formData.append("note", currentProduct.note);
      formData.append("category", currentProduct.category);
      formData.append("status", currentProduct.status);
      formData.append("date", currentProduct.date);
      formData.append("userId", userId);
      formData.append("actorRole", role);
      formData.append("bookId", id);

      // formData.append(
      //   "bankName",
      //   currentProduct.paymentMode === "Bank" ? currentProduct.bankName : "",
      // );
      // formData.append(
      //   "bankAccount",
      //   currentProduct.paymentMode === "Bank"
      //     ? String(currentProduct.bankAccount)
      //     : "",
      // );

      // Use categoryName (not categoryId)
      // formData.append("category", finalCategoryName); // Using category name here
      formData.append("remarks", currentProduct.remarks?.trim() || "");
      formData.append("amount", String(Number(currentProduct.amount)));
      if (currentProduct.file) formData.append("file", currentProduct.file);

      const res = await updateMarketingExpense({
        id: rowId,
        data: formData,
      }).unwrap();
      if (res?.success) {
        toast.success("Successfully updated!");
        setIsModalOpen(false);
        setCurrentProduct(null);
        refetch?.();
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleUpdateProduct1 = async () => {
    const rowId = currentProduct?.Id ?? currentProduct?.id;
    if (!rowId) return toast.error("Invalid item!");

    try {
      const formData = new FormData();
      formData.append("note", currentProduct.note);
      formData.append("status", currentProduct.status);
      formData.append("userId", userId);
      formData.append("actorRole", role);
      formData.append("bookId", id);

      const res = await updateMarketingExpense({
        id: rowId,
        data: formData,
      }).unwrap();
      if (res?.success) {
        toast.success("Successfully updated!");

        setIsModalOpen2(false);
        setCurrentProduct(null);
        refetch?.();
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const [insertMarketingExpense] = useInsertMarketingExpenseMutation();

  const handleCreateProduct = async (e) => {
    e.preventDefault();

    // Ensure required fields are filled
    if (!createProduct.amount) return toast.error("Amount is required!");
    // if (!createProduct.paymentMode)
    //   return toast.error("Payment Mode is required!");

    // if (createProduct.paymentMode === "Bank") {
    //   if (!createProduct.bankName) return toast.error("Bank Name is required!");
    //   if (!createProduct.bankAccount)
    //     return toast.error("Bank Account is required!");
    // }

    try {
      // Form data preparation for submission
      const formData = new FormData();
      // formData.append("paymentMode", createProduct.paymentMode);
      formData.append("paymentStatus", "CashIn");
      formData.append("date", createProduct.date);
      formData.append("note", createProduct.note);
      formData.append("category", createProduct.category);

      // formData.append(
      //   "bankName",
      //   createProduct.paymentMode === "Bank" ? createProduct.bankName : "",
      // );
      // formData.append(
      //   "bankAccount",
      //   createProduct.paymentMode === "Bank"
      //     ? String(createProduct.bankAccount)
      //     : "",
      // );

      // Use categoryName (not category)
      // formData.append("category", finalCategoryName); // Using category name here
      formData.append("remarks", createProduct.remarks?.trim() || "");
      formData.append("amount", String(Number(createProduct.amount)));
      formData.append("bookId", id);
      if (createProduct.file) formData.append("file", createProduct.file);

      const res = await insertMarketingExpense(formData).unwrap();

      if (res?.success) {
        toast.success("Successfully created!");
        setIsModalOpen1(false);
        setCreateProduct({
          paymentMode: "",
          paymentStatus: "",
          bankName: "",
          bankAccount: "",
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
    // if (!createProduct.paymentMode)
    //   return toast.error("Payment Mode is required!");

    // // Bank details check
    // if (createProduct.paymentMode === "Bank") {
    //   if (!createProduct.bankName) return toast.error("Bank Name is required!");
    //   if (!createProduct.bankAccount)
    //     return toast.error("Bank Account is required!");
    // }

    try {
      // Form data preparation for submission
      const formData = new FormData();
      // formData.append("paymentMode", createProduct.paymentMode);
      formData.append("paymentStatus", "CashOut");
      formData.append("date", createProduct.date);
      formData.append("note", createProduct.note);
      formData.append("category", createProduct.category);

      // formData.append(
      //   "bankName",
      //   createProduct.paymentMode === "Bank" ? createProduct.bankName : "",
      // );
      // formData.append(
      //   "bankAccount",
      //   createProduct.paymentMode === "Bank"
      //     ? String(createProduct.bankAccount)
      //     : "",
      // );

      // Use category (not category)
      // formData.append("category", finalCategoryName); // Using category name here
      formData.append("remarks", createProduct.remarks?.trim() || "");
      formData.append("amount", String(Number(createProduct.amount)));
      formData.append("bookId", id);
      if (createProduct.file) formData.append("file", createProduct.file);

      const res = await insertMarketingExpense(formData).unwrap();

      if (res?.success) {
        toast.success("Successfully created!");
        setIsModalOpen3(false);
        setCreateProduct({
          paymentMode: "",
          paymentStatus: "",
          bankName: "",
          bankAccount: "",
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
  const [deleteMarketingExpense] = useDeleteMarketingExpenseMutation();

  const handleDeleteProduct = async (rowId) => {
    if (
      !(await requestDeleteConfirmation({
        message: "Do you want to delete this item?",
      }))
    )
      return;

    try {
      const res = await deleteMarketingExpense(rowId).unwrap();
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

      const blob = await generateMarketingExpensePdf({
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

      const { blob, preview } = generateMarketingExpenseXlsx({
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

  const handleNoteClick = (note) => {
    setNoteContent(note);
    setIsNoteModalOpen(true); // Open the modal
  };

  const handleModalClose = () => {
    setIsNoteModalOpen(false); // Close the modal
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
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
                {t.total_cash_in}
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
                {t.total_cash_out}
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
                {t.net_balance}
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
            {t.cash_in_btn}
          </button>

          {/* Cash Out (Secondary / Neutral) */}
          <button
            type="button"
            onClick={handleAddCashOut}
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-800 border border-slate-200 shadow-md hover:bg-slate-50 active:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:w-auto"
          >
            <Minus size={18} className="text-slate-700" />
            {t.cash_out_btn}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 items-end mb-6 w-full">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          compact
          className="md:col-span-2"
        />

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">
            {t.payment_mode}
          </label>
          <select
            value={filterPaymentMode}
            onChange={(e) => setFilterPaymentMode(e.target.value)}
            className="h-11 border border-slate-200 rounded-xl px-3 text-slate-900 bg-white outline-none
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          >
            <option value="">All</option>
            <option value="Cash">Cash</option>
            <option value="Bkash">Bkash</option>
            <option value="Nagad">Nagad</option>
            <option value="Rocket">Rocket</option>
            <option value="Bank">Bank</option>
            <option value="Card">Card</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">
            {t.payment_status}
          </label>
          <select
            value={filterPaymentStatus}
            onChange={(e) => setFilterPaymentStatus(e.target.value)}
            className="h-11 border border-slate-200 rounded-xl px-3 text-slate-900 bg-white outline-none
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          >
            <option value="">All</option>
            <option value="CashIn">CashIn</option>
            <option value="CashOut">CashOut</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Category</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-11 border border-slate-200 rounded-xl px-3 text-slate-900 bg-white outline-none
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          >
            <option value="">All</option>
            <option value="Facebook">Facebook</option>
            <option value="Google">Google</option>
            <option value="Tiktok">Tiktok</option>
            <option value="SEO">SEO</option>
          </select>
        </div>

        {/* ✅ Per Page Dropdown (same position like your screenshot) */}
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Per Page</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
              setStartPage(1);
            }}
            className="px-3 py-[10px] rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div className="sm:col-span-2 xl:col-span-6">
          <button
            className="h-11 w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 transition rounded-xl px-4 text-sm font-semibold"
            onClick={clearFilters}
            type="button"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Date
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
                Bank
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

          <tbody className="divide-y divide-slate-200 bg-white">
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
                    {rp.category || "---"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.paymentMode || "---"}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.paymentMode === "Bank" ? rp.bankName || "---" : "---"}
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
                          : rp.status === "Active"
                            ? "bg-blue-50 text-blue-700 border-blue-200" // New color for Active
                            : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {rp.status}
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
                  colSpan={8}
                  className="px-6 py-8 text-center text-sm text-slate-600"
                >
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Note Modal */}
      <Modal isOpen={isNoteModalOpen} onClose={handleModalClose} title="Note">
        <p className="mt-4 text-sm text-slate-700">{noteContent}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={handleModalClose}
            className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Pagination + Page Jump Dropdown */}
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
        title="Edit Marketing Expense"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Date
            </label>
            <input
              type="date"
              value={currentProduct?.date || ""}
              onChange={(e) =>
                setCurrentProduct((p) => ({ ...p, date: e.target.value }))
              }
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
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
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              required
            >
              <option value="">Select Payment Status</option>
              <option value="CashIn">CashIn</option>
              <option value="CashOut">CashOut</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Category
            </label>
            <select
              value={currentProduct?.category || ""}
              onChange={(e) =>
                setCurrentProduct((p) => ({ ...p, category: e.target.value }))
              }
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              required
            >
              <option value="">Select Category</option>
              <option value="Facebook">Facebook</option>
              <option value="Google">Google</option>
              <option value="Tiktok">Tiktok</option>
              <option value="SEO">SEO</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Remarks
            </label>
            <input
              type="text"
              value={currentProduct?.remarks || ""}
              onChange={(e) =>
                setCurrentProduct((p) => ({ ...p, remarks: e.target.value }))
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
                setCurrentProduct((p) => ({ ...p, amount: e.target.value }))
              }
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              required
            />
          </div>

          {role === "superAdmin" || role === "admin" ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Status
              </label>
              <select
                value={currentProduct?.status || ""}
                onChange={(e) =>
                  setCurrentProduct((p) => ({ ...p, status: e.target.value }))
                }
                className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-bold text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                required
              >
                <option value="">Select Status</option>
                <option value="Active">Active</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Note
              </label>
              <textarea
                value={currentProduct?.note || ""}
                onChange={(e) =>
                  setCurrentProduct((p) => ({ ...p, note: e.target.value }))
                }
                className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                rows={3}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Upload Document
            </label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) =>
                setCurrentProduct((p) => ({
                  ...p,
                  file: e.target.files?.[0] || null,
                }))
              }
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 py-2 text-sm font-medium text-slate-900 bg-white"
            />
            {currentProduct?.file && (
              <p className="mt-2 text-xs text-slate-600">
                Selected: {currentProduct.file.name}
              </p>
            )}
          </div>

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

      {/* Note/Status Modal (Secondary Request Delete/Add Note) */}
      <Modal
        isOpen={isModalOpen2 && !!currentProduct}
        onClose={() => {
          setIsModalOpen2(false);
          setCurrentProduct(null);
        }}
        title="Update Status / Note"
      >
        <div className="space-y-4">
          {role === "superAdmin" || role === "admin" ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Status
              </label>
              <select
                value={currentProduct?.status || ""}
                onChange={(e) =>
                  setCurrentProduct((p) => ({ ...p, status: e.target.value }))
                }
                className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-bold text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                required
              >
                <option value="">Select Status</option>
                <option value="Active">Active</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Note / Reason
              </label>
              <textarea
                value={currentProduct?.note || ""}
                onChange={(e) =>
                  setCurrentProduct((p) => ({ ...p, note: e.target.value }))
                }
                className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                rows={4}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={() => {
                setIsModalOpen2(false);
                setCurrentProduct(null);
              }}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateProduct1}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              Save changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Cash In Modal */}
      <Modal
        isOpen={isModalOpen1}
        onClose={handleModalClose1}
        title="Add Cash In Entry"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Date
            </label>
            <input
              type="date"
              value={createProduct?.date || ""}
              onChange={(e) =>
                setCreateProduct((p) => ({ ...p, date: e.target.value }))
              }
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Category
            </label>
            <select
              value={createProduct.category || ""}
              onChange={(e) =>
                setCreateProduct({
                  ...createProduct,
                  category: e.target.value,
                })
              }
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              required
            >
              <option value="">Select Category</option>
              <option value="Facebook">Facebook</option>
              <option value="Google">Google</option>
              <option value="Tiktok">Tiktok</option>
              <option value="SEO">SEO</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
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
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              placeholder="Internal notes..."
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
                setCreateProduct({
                  ...createProduct,
                  amount: e.target.value,
                })
              }
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
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
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 py-2 text-sm font-medium text-slate-900 bg-white"
            />
            {createProduct.file && (
              <p className="mt-2 text-xs text-slate-600">
                Selected: {createProduct.file.name}
              </p>
            )}
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
              Save Entry
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Cash Out Modal */}
      <Modal
        isOpen={isModalOpen3}
        onClose={handleModalClose3}
        title="Add Cash Out Entry"
      >
        <form onSubmit={handleCreateProduct1} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Date
            </label>
            <input
              type="date"
              value={createProduct?.date || ""}
              onChange={(e) =>
                setCreateProduct((p) => ({ ...p, date: e.target.value }))
              }
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Category
            </label>
            <select
              value={createProduct.category || ""}
              onChange={(e) =>
                setCreateProduct({
                  ...createProduct,
                  category: e.target.value,
                })
              }
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              required
            >
              <option value="">Select Category</option>
              <option value="Facebook">Facebook</option>
              <option value="Google">Google</option>
              <option value="Tiktok">Tiktok</option>
              <option value="SEO">SEO</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
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
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              placeholder="Internal notes..."
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
                setCreateProduct({
                  ...createProduct,
                  amount: e.target.value,
                })
              }
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
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
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 py-2 text-sm font-medium text-slate-900 bg-white"
            />
            {createProduct.file && (
              <p className="mt-2 text-xs text-slate-600">
                Selected: {createProduct.file.name}
              </p>
            )}
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
              Save Entry
            </button>
          </div>
        </form>
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

export default MarketingExpenseTable;
