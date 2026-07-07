import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Pagination from "../common/Pagination";
import {
  useDeleteMarketingBookMutation,
  useGetAllMarketingBookQuery,
  useInsertMarketingBookMutation,
  useUpdateMarketingBookMutation,
} from "../../features/marketingBook/marketingBook.jsx";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import Modal from "../common/Modal";
import { useGetOverviewSummaryQuery } from "../../features/marketingExpense/marketingExpense.jsx";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import useDebounce from "../../hooks/useDebounce";
import DateRangeFilter from "../common/DateRangeFilter";


// ✅ helper: default range (এই মাসের ১ তারিখ → আজ)
const getDefaultRange = () => {
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const from = `${yyyy}-${mm}-01`;
  const to = `${yyyy}-${mm}-${dd}`;
  return { from, to };
};

const MarketingBookTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false); // Edit modal
  const [isModalOpen1, setIsModalOpen1] = useState(false); // Add modal

  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");
  const [currentProduct, setCurrentProduct] = useState(null);

  const [createProduct, setCreateProduct] = useState({ name: "" });
  const [name, setName] = useState("");
  const debouncedName = useDebounce(name, 400); // search state

  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);
  const itemsPerPage = 10;

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

  const { data, isLoading, isError, error, refetch } =
    useGetAllMarketingBookQuery({
      page: currentPage,
      limit: itemsPerPage,
      searchTerm: debouncedName || undefined,
    });

  const books = data?.data ?? [];


  useEffect(() => {
    if (isError) {
      console.error("Error fetching book data", error);
    } else if (!isLoading && data?.meta?.count != null) {
      setTotalPages(Math.max(1, Math.ceil(data.meta.count / itemsPerPage)));
    }
  }, [data, isLoading, isError, error, itemsPerPage]);

  const handleModalClose = () => setIsModalOpen(false);
  const handleModalClose1 = () => setIsModalOpen1(false);

  const handleEditBook = (item) => {
    setCurrentProduct(item);
    setIsModalOpen(true);
  };

  const handleAddBook = () => {
    setCreateProduct({ name: "" });
    setIsModalOpen1(true);
  };

  // Create
  const [insertMarketingBook] = useInsertMarketingBookMutation();
  const handleCreateBook = async (e) => {
    e.preventDefault();
    try {
      const payload = { name: createProduct.name };
      const res = await insertMarketingBook(payload).unwrap();

      if (res?.success) {
        toast.success("Successfully created book");
        setIsModalOpen1(false);
        setCreateProduct({ name: "" });
        refetch?.();
      } else {
        toast.error("Create failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  // Update
  const [updateMarketingBook] = useUpdateMarketingBookMutation();
  const handleUpdateBook = async () => {
    if (!currentProduct?.Id) return toast.error("Invalid book selected!");

    try {
      const updated = {
        name: currentProduct.name || "",
        userId: userId,
        actorRole: role,
      };
      const res = await updateMarketingBook({
        id: currentProduct.Id,
        data: updated,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated book!");
        setIsModalOpen(false);
        setCurrentProduct(null);
        refetch?.();
      } else toast.error("Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // Delete
  const [deleteMarketingBook] = useDeleteMarketingBookMutation();
  const handleDeleteBook = async (id) => {
    const confirmDelete = await requestDeleteConfirmation({ message: "Do you want to delete this book?" });
    if (!confirmDelete) return toast.info("Delete action was cancelled.");

    try {
      const res = await deleteMarketingBook(id).unwrap();
      if (res?.success !== false) {
        toast.success("Book deleted successfully!");
        refetch?.();
      } else toast.error("Delete failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    if (pageNumber < startPage) setStartPage(pageNumber);
    else if (pageNumber > endPage) setStartPage(pageNumber - pagesPerSet + 1);
  };

  const handlePreviousSet = () =>
    setStartPage((p) => Math.max(p - pagesPerSet, 1));
  const handleNextSet = () =>
    setStartPage((p) =>
      Math.min(p + pagesPerSet, Math.max(1, totalPages - pagesPerSet + 1)),
    );

  const defaultRange = useMemo(() => getDefaultRange(), []);

  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [applied, setApplied] = useState(defaultRange);

  const {
    data: summaryRes,
    isLoading1,
    isError1,
    error1,
  } = useGetOverviewSummaryQuery({ from: applied.from, to: applied.to });

  const summary = summaryRes?.data || {};


  if (isError1) console.error("Overview Summary error:", error1);

  // ✅ values (fallback 0)
  const totalCashIn = Number(summary?.totalCashInAmount || 0);
  const totalCashOut = Number(summary?.totalCashOutAmount || 0);
  const netBalance = totalCashIn - totalCashOut;


  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,300px)_minmax(260px,1fr)_auto] gap-4 items-end mb-6 w-full">
        <DateRangeFilter
          startDate={from}
          endDate={to}
          onStartDateChange={setFrom}
          onEndDateChange={setTo}
          onFilterTypeChange={(_, range) => setApplied(range)}
          defaultFilter="this_month"
          compact
        />

        {/* <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Payment Status</label>
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
        </div> */}
        {/* Add button */}

        <div className="relative w-full sm:max-w-[520px]">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setCurrentPage(1);
              setStartPage(1);
            }}
            placeholder="Search by channel name..."
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 pr-12 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          />
          <Search
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
            size={18}
          />
        </div>
        <button
          onClick={handleAddBook}
          type="button"
          className="inline-flex h-11 w-full sm:w-[260px] items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          <Plus size={18} />
          Add DM Channel
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {/* CashIn */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-emerald-50/70 to-transparent" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total CashIn</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
                {isLoading1 ? "—" : Number(totalCashIn || 0).toLocaleString()}
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
                {isLoading1 ? "—" : Number(totalCashOut || 0).toLocaleString()}
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
              <p className="text-xs font-medium text-slate-500">Net Balance</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
                {isLoading1 ? "—" : Number(netBalance || 0).toLocaleString()}
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
      {/* Top bar */}

      {/* List */}
      <div className="mt-8">
        {books.map((item) => (
          <div
            key={item.Id}
            className="flex items-center justify-between border-b border-gray-200 py-5"
          >
            {/* Left */}
            <Link
              to={`/marketing-book/${item.Id}`}
              className="flex-1 rounded-lg -mx-2 px-2 py-2 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100">
                  <BookOpen className="text-indigo-600" size={18} />
                </div>

                <div>
                  <div className="text-[16px] font-semibold text-gray-900">
                    {item.name}
                  </div>
                  {/* <div className="mt-1 text-sm text-gray-600">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString()
                      : "-"}
                  </div> */}
                </div>
              </div>
            </Link>

            {/* Right */}
            {(role === "superAdmin" || role === "admin") && (
              <div className="flex items-center gap-3 pl-4 pr-2">
                <button
                  onClick={() => handleEditBook(item)}
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition"
                  title="Edit"
                >
                  <Pencil className="text-indigo-600" size={18} />
                </button>

                <button
                  onClick={() => handleDeleteBook(item.Id)}
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-red-50 transition"
                  title="Delete"
                >
                  <Trash2 className="text-red-600" size={18} />
                </button>
              </div>
            )}
          </div>
        ))}

        {!isLoading && books.length === 0 && (
          <div className="py-10 text-sm text-gray-500">No data found</div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen && !!currentProduct}
        onClose={handleModalClose}
        title="Rename Channel"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Channel Name</label>
            <input
              type="text"
              value={currentProduct?.name || ""}
              onChange={(e) =>
                setCurrentProduct((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              placeholder="e.g. Facebook Ads"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={handleModalClose}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateBook}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen1}
        onClose={handleModalClose1}
        title="Add Marketing Channel"
      >
        <form onSubmit={handleCreateBook} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Channel Name</label>
            <input
              type="text"
              value={createProduct.name}
              onChange={(e) => setCreateProduct({ name: e.target.value })}
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              placeholder="e.g. Google Search"
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
              Create Channel
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default MarketingBookTable;
