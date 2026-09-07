import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { LucideTruck, Pencil, Plus, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  useDeleteSupplierMutation,
  useGetAllSupplierQuery,
  useGetAllSupplierWithoutQueryQuery,
  useInsertSupplierMutation,
  useUpdateSupplierMutation,
} from "../../features/supplier/supplier";
import Modal from "../common/Modal";
import DateRangeFilter from "../common/DateRangeFilter";
import TableSkeleton from "../common/TableSkeleton";
import { Link } from "react-router-dom";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import useDebounce from "../../hooks/useDebounce";

const formatAmount = (value) => Number(value || 0).toLocaleString();

const getAdvanceAmount = (item) =>
  Math.max(Number(item?.totalAdvance ?? item?.netBalance ?? 0), 0);

const SupplierTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false); // Edit modal
  const [isModalOpen1, setIsModalOpen1] = useState(false); // Add modal

  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");

  const [currentProduct, setCurrentProduct] = useState(null);
  const [createProduct, setCreateProduct] = useState({ name: "" });

  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const dateParams = { startDate: dateRange.from || undefined, endDate: dateRange.to || undefined };

  const handleDateFilter = (_type, range) => {
    if (range.from && range.to && range.from > range.to) {
      toast.error("Start date must be on or before end date");
      return;
    }
    setDateRange(range);
    setCurrentPage(1);
    setStartPage(1);
  };

  const [name, setName] = useState("");
  const debouncedName = useDebounce(name, 400); // search term

  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handlePerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
    setStartPage(1);
  };

  // ✅ Responsive pagination window
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

  const { currentData: data, isFetching, isError, error, refetch } = useGetAllSupplierQuery(
    {
      page: currentPage,
      limit: itemsPerPage,
      searchTerm: debouncedName || undefined,
      ...dateParams,
    },
    {
      pollingInterval: 3000,
      refetchOnFocus: true,
      refetchOnMountOrArgChange: true,
      refetchOnReconnect: true,
    },
  );

  // ✅ Get all suppliers summary from the same balance source used by rows
  const { currentData: summaryData, isFetching: summaryFetching } =
    useGetAllSupplierWithoutQueryQuery(dateParams, {
      pollingInterval: 3000,
      refetchOnFocus: true,
      refetchOnMountOrArgChange: true,
      refetchOnReconnect: true,
    });

  // Keep existing rows mounted during polling so the page height and scroll stay stable.
  const isLoading = isFetching && !data;
  const summaryLoading = summaryFetching && !summaryData;
  const suppliers = data?.data ?? [];

  useEffect(() => {
    if (isError) {
      console.error("Error fetching supplier data", error);
      return;
    }
    if (!isLoading && data?.meta?.count != null) {
      setTotalPages(Math.max(1, Math.ceil(data.meta.count / itemsPerPage)));
    }
  }, [data, isLoading, isError, error, itemsPerPage]);

  // ✅ Modals
  const handleModalClose = () => setIsModalOpen(false);
  const handleModalClose1 = () => setIsModalOpen1(false);

  const handleEditSupplier = (item) => {
    setCurrentProduct(item);
    setIsModalOpen(true);
  };

  const handleAddSupplier = () => {
    setCreateProduct({ name: "" });
    setIsModalOpen1(true);
  };

  // ✅ Create
  const [insertSupplier] = useInsertSupplierMutation();
  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!createProduct.name?.trim()) return toast.error("Name is required!");

    try {
      const payload = { name: createProduct.name.trim() };
      const res = await insertSupplier(payload).unwrap();

      if (res?.success) {
        toast.success("Supplier created successfully!");
        setIsModalOpen1(false);
        setCreateProduct({ name: "" });
        refetch?.();
      } else toast.error(res?.message || "Create failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  // ✅ Update
  const [updateSupplier] = useUpdateSupplierMutation();
  const handleUpdateSupplier = async () => {
    if (!currentProduct?.Id) return toast.error("Invalid supplier selected!");
    if (!currentProduct?.name?.trim()) return toast.error("Name is required!");

    try {
      const updated = {
        name: currentProduct.name.trim(),
        userId: userId,
        actorRole: role,
      };
      const res = await updateSupplier({
        id: currentProduct.Id,
        data: updated,
      }).unwrap();

      if (res?.success) {
        toast.success("Supplier updated successfully!");
        setIsModalOpen(false);
        setCurrentProduct(null);
        refetch?.();
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // ✅ Delete
  const [deleteSupplier] = useDeleteSupplierMutation();
  const handleDeleteSupplier = async (id) => {
    const confirmDelete = await requestDeleteConfirmation({
      message: "Do you want to delete this supplier?",
    });
    if (!confirmDelete) return toast.info("Delete action was cancelled.");

    try {
      const res = await deleteSupplier(id).unwrap();
      if (res?.success !== false) {
        toast.success("Supplier deleted successfully!");
        refetch?.();
      } else toast.error(res?.message || "Delete failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  // ✅ Pagination
  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const handlePageChange = (pageNumber) => {
    const p = Number(pageNumber);
    setCurrentPage(p);

    if (p < startPage) setStartPage(p);
    else if (p > endPage) setStartPage(p - pagesPerSet + 1);
  };

  const handlePreviousSet = () =>
    setStartPage((p) => Math.max(p - pagesPerSet, 1));

  const handleNextSet = () =>
    setStartPage((p) =>
      Math.min(p + pagesPerSet, Math.max(1, totalPages - pagesPerSet + 1)),
    );

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <DateRangeFilter
        startDate={dateRange.from}
        endDate={dateRange.to}
        onFilterTypeChange={handleDateFilter}
        label="Transaction Date"
        className="mb-6"
      />
      {dateRange.from || dateRange.to ? (
        <p className="mb-4 text-sm text-slate-500">
          Paid, advance and due reflect transactions in the selected date range.
        </p>
      ) : null}
      {/* Summary Cards */}
      {(() => {
        const summarySuppliers = Array.isArray(summaryData?.data)
          ? summaryData.data
          : [];
        const totals = summarySuppliers.reduce(
          (acc, item) => {
            acc.totalPaid += Number(item.totalPaid || 0);
            acc.totalAdvance += Number(item.totalAdvance || 0);
            acc.totalDue += Number(item.totalDue ?? item.totalUnpaid ?? 0);
            return acc;
          },
          { totalPaid: 0, totalAdvance: 0, totalDue: 0 },
        );

        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-6">
            {/* Total Paid */}
            <div className="group relative overflow-hidden rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-emerald-50/70 to-transparent" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                    Total Paid
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Supplier payment completed
                  </p>
                  <p className="mt-2 text-2xl font-bold text-emerald-700 tabular-nums">
                    {summaryLoading ? "—" : `৳${formatAmount(totals.totalPaid)}`}
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

            {/* Total Advance */}
            <div className="group relative overflow-hidden rounded-2xl border border-sky-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-sky-50/70 to-transparent" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide">
                    Total Advance
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Extra paid to suppliers
                  </p>
                  <p className="mt-2 text-2xl font-bold text-sky-700 tabular-nums">
                    {summaryLoading
                      ? "—"
                      : `৳${formatAmount(totals.totalAdvance)}`}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 text-sky-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 12h16" />
                    <path d="M12 4v16" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total Due */}
            <div className="group relative overflow-hidden rounded-2xl border border-rose-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-rose-50/70 to-transparent" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide">
                    Total Due
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Supplier amount still due
                  </p>
                  <p className="mt-2 text-2xl font-bold text-rose-600 tabular-nums">
                    {summaryLoading ? "—" : `৳${formatAmount(totals.totalDue)}`}
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

          </div>
        );
      })()}

      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-[520px]">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setCurrentPage(1);
              setStartPage(1);
            }}
            placeholder="Search supplier..."
            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm text-slate-700 outline-none
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          />
          <Search
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Per Page */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="supplierPerPage"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Per Page
            </label>
            <select
              id="supplierPerPage"
              value={itemsPerPage}
              onChange={handlePerPageChange}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* Add button */}
          <button
            onClick={handleAddSupplier}
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#8400ff] px-4 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            <Plus size={18} />
            Add New Supplier
          </button>
        </div>
      </div>

      {/* List */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
        {isLoading && <TableSkeleton rows={8} columns={4} />}
        {!isLoading && suppliers.length > 0 && (
          <table className="min-w-[820px] w-full table-fixed text-sm">
            <colgroup>
              <col className="w-auto" />
              <col className="w-[150px]" />
              <col className="w-[150px]" />
              <col className="w-[150px]" />
              <col className="w-[112px]" />
            </colgroup>
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Name
                </th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                  Paid
                </th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                  Advance
                </th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                  Due
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {suppliers.map((item) => (
                <tr key={item.Id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-4">
                    <Link
                      to={`/supplier-history/${item.Id}`}
                      className="flex min-w-0 items-center gap-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                        <LucideTruck className="text-indigo-600" size={18} />
                      </div>

                      <div className="truncate text-[15px] font-semibold text-slate-900 hover:text-indigo-600">
                        {item.name}
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-right font-semibold tabular-nums text-emerald-600">
                    ৳{formatAmount(item.totalPaid)}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold tabular-nums text-sky-600">
                    ৳{formatAmount(getAdvanceAmount(item))}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold tabular-nums text-rose-600">
                    ৳{formatAmount(item.totalUnpaid)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {role === "superAdmin" || role === "admin" ? (
                        <>
                          <button
                            onClick={() => handleEditSupplier(item)}
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent transition hover:border-slate-200 hover:bg-white"
                            title="Edit"
                          >
                            <Pencil className="text-indigo-600" size={18} />
                          </button>

                          <button
                            onClick={() => handleDeleteSupplier(item.Id)}
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent transition hover:border-slate-200 hover:bg-white"
                            title="Delete"
                          >
                            <Trash2 className="text-red-600" size={18} />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!isLoading && suppliers.length === 0 && (
          <div className="px-6 py-10 text-sm text-slate-500">No data found</div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
        <button
          onClick={handlePreviousSet}
          disabled={startPage === 1}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
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
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
        >
          Next
        </button>
      </div>

      {/* ✅ Edit Modal */}
      <Modal
        isOpen={isModalOpen && !!currentProduct}
        onClose={handleModalClose}
        title="Rename Supplier"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Supplier Name
            </label>
            <input
              type="text"
              value={currentProduct?.name || ""}
              onChange={(e) =>
                setCurrentProduct((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              className="h-11 px-3 border border-slate-200 rounded-xl w-full text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              placeholder="Enter supplier name"
            />
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
              onClick={handleModalClose}
            >
              Cancel
            </button>
            <button
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition"
              onClick={handleUpdateSupplier}
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* ✅ Add Modal */}
      <Modal
        isOpen={isModalOpen1}
        onClose={handleModalClose1}
        title="Add New Supplier"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Supplier Name
            </label>
            <input
              type="text"
              value={createProduct.name}
              onChange={(e) => setCreateProduct({ name: e.target.value })}
              className="h-11 px-3 border border-slate-200 rounded-xl w-full text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              placeholder="Enter supplier name"
              required
            />
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
              onClick={handleModalClose1}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition"
            >
              Add Supplier
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default SupplierTable;
