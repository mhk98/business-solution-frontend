import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { LucideTruck, Pencil, Plus, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  useDeleteSupplierMutation,
  useGetAllSupplierQuery,
  useInsertSupplierMutation,
  useUpdateSupplierMutation,
} from "../../features/supplier/supplier";
import { useGetAllSupplierHistoryWithoutQueryQuery } from "../../features/supplierHistory/supplierHistory";
import Modal from "../common/Modal";
import TableSkeleton from "../common/TableSkeleton";
import { Link } from "react-router-dom";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import useDebounce from "../../hooks/useDebounce";


const formatAmount = (value) => Number(value || 0).toLocaleString();

const NetBadge = ({ value }) => {
  const n = Number(value || 0);
  if (n > 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-200">
        পাবেন ৳{formatAmount(n)}
      </span>
    );
  if (n < 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600 border border-rose-200">
        দিবেন ৳{formatAmount(Math.abs(n))}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 border border-slate-200">
      সমতুল্য
    </span>
  );
};

const SupplierTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false); // Edit modal
  const [isModalOpen1, setIsModalOpen1] = useState(false); // Add modal

  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");

  const [currentProduct, setCurrentProduct] = useState(null);
  const [createProduct, setCreateProduct] = useState({ name: "" });

  const [name, setName] = useState("");
  const debouncedName = useDebounce(name, 400); // search term

  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

  const itemsPerPage = 10;

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

  const { data, isLoading, isError, error, refetch } = useGetAllSupplierQuery({
    page: currentPage,
    limit: itemsPerPage,
    searchTerm: debouncedName || undefined,
  });

  // ✅ Get all suppliers summary (total paid, unpaid, net balance)
  const { data: summaryData, isLoading: summaryLoading } =
    useGetAllSupplierHistoryWithoutQueryQuery();

  const suppliers = data?.data ?? [];

  useEffect(() => {
    if (isError) {
      console.error("Error fetching supplier data", error);
      return;
    }
    if (!isLoading && data?.meta?.count != null) {
      setTotalPages(Math.max(1, Math.ceil(data.meta.count / itemsPerPage)));
    }
  }, [data, isLoading, isError, error]);

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
      {/* Summary Cards */}
      {(() => {
        const totalPaid   = Number(summaryData?.data?.meta?.totalPaid   || 0);
        const totalUnpaid = Number(summaryData?.data?.meta?.totalUnpaid || 0);
        const netBalance  = Number(summaryData?.data?.meta?.netBalance  || 0);
        const netPositive = netBalance > 0;
        const netZero     = netBalance === 0;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-6">
            {/* মোট পরিশোধ */}
            <div className="group relative overflow-hidden rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-emerald-50/70 to-transparent" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">মোট পরিশোধ</p>
                  <p className="mt-1 text-[11px] text-slate-400">Supplier-দের মোট payment করা হয়েছে</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-700 tabular-nums">
                    {summaryLoading ? "—" : `৳${formatAmount(totalPaid)}`}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 19V5" /><path d="M5 12l7-7 7 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* মোট বাকি */}
            <div className="group relative overflow-hidden rounded-2xl border border-rose-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-rose-50/70 to-transparent" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide">মোট বাকি</p>
                  <p className="mt-1 text-[11px] text-slate-400">Supplier-দের কাছে এখনো বাকি আছে</p>
                  <p className="mt-2 text-2xl font-bold text-rose-600 tabular-nums">
                    {summaryLoading ? "—" : `৳${formatAmount(totalUnpaid)}`}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-rose-600" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14" /><path d="M19 12l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* পাবেন / দিবেন */}
            <div className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:shadow-md bg-white ${netZero ? "border-slate-200" : netPositive ? "border-emerald-200" : "border-rose-200"}`}>
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br ${netZero ? "from-slate-50/70" : netPositive ? "from-emerald-50/70" : "from-rose-50/70"} to-transparent`} />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${netZero ? "text-slate-500" : netPositive ? "text-emerald-600" : "text-rose-600"}`}>
                    {netZero ? "সমতুল্য" : netPositive ? "আপনি পাবেন" : "আপনি দিবেন"}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {netZero ? "সব হিসাব সমান" : netPositive ? "Supplier-রা আপনার কাছে ঋণী" : "আপনি Supplier-দের কাছে ঋণী"}
                  </p>
                  <p className={`mt-2 text-2xl font-bold tabular-nums ${netZero ? "text-slate-600" : netPositive ? "text-emerald-700" : "text-rose-600"}`}>
                    {summaryLoading ? "—" : `৳${formatAmount(Math.abs(netBalance))}`}
                  </p>
                </div>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${netZero ? "bg-slate-50 border-slate-100" : netPositive ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
                  <svg viewBox="0 0 24 24" className={`h-5 w-5 ${netZero ? "text-slate-500" : netPositive ? "text-emerald-600" : "text-rose-600"}`} fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19V5" /><path d="M8 17V7" /><path d="M12 19V9" /><path d="M16 15V5" /><path d="M20 19V11" />
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

      {/* List */}
      <div className="mt-6 rounded-2xl border border-slate-200 overflow-hidden">
        {isLoading && <TableSkeleton rows={8} columns={4} />}
        {!isLoading && suppliers.map((item) => (
          <div
            key={item.Id}
            className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200 bg-white hover:bg-slate-50 transition"
          >
            {/* Left */}
            <Link
              to={`/supplier-history/${item.Id}`}
              className="flex min-w-0 items-center gap-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
                <LucideTruck className="text-indigo-600" size={18} />
              </div>

              <div className="truncate text-[15px] font-semibold text-slate-900 hover:text-indigo-600">
                {item.name}
              </div>
            </Link>

            {/* Right */}
            <div className="flex shrink-0 items-center gap-4">
              {/* Paid / Unpaid / Net */}
              <div className="hidden sm:flex items-center gap-4 text-right">
                <div className="min-w-[90px]">
                  <p className="text-[10px] font-medium text-emerald-500 uppercase">পরিশোধ</p>
                  <p className="text-sm font-semibold tabular-nums text-emerald-600">
                    ৳{formatAmount(item.totalPaid)}
                  </p>
                </div>
                <div className="min-w-[90px]">
                  <p className="text-[10px] font-medium text-rose-500 uppercase">বাকি</p>
                  <p className="text-sm font-semibold tabular-nums text-rose-600">
                    ৳{formatAmount(item.totalUnpaid)}
                  </p>
                </div>
              </div>
              <div className="min-w-[110px] text-right">
                <p className="text-[10px] font-medium text-slate-400 uppercase mb-1">নেট</p>
                <NetBadge value={item.netBalance} />
              </div>

              {(role === "superAdmin" || role === "admin") && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditSupplier(item)}
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white border border-transparent hover:border-slate-200 transition"
                    title="Edit"
                  >
                    <Pencil className="text-indigo-600" size={18} />
                  </button>

                  <button
                    onClick={() => handleDeleteSupplier(item.Id)}
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white border border-transparent hover:border-slate-200 transition"
                    title="Delete"
                  >
                    <Trash2 className="text-red-600" size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

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
