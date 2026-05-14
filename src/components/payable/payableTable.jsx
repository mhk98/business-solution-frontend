import { motion } from "framer-motion";
import {
  Edit,
  Notebook,
  Plus,
  Trash2,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  Building2,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useDeletePayableMutation,
  useGetAllPayableQuery,
  useInsertPayableMutation,
  useUpdatePayableMutation,
} from "../../features/payable/payable";
import Modal from "../common/Modal";
import useDebounce from "../../hooks/useDebounce";


const PayableTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen1, setIsModalOpen1] = useState(false);
  const [, setIsModalOpen2] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");

  const [currentProduct, setCurrentProduct] = useState(null);
  const [noteContent, setNoteContent] = useState("");

  const [createProduct, setCreateProduct] = useState({
    name: "",
    remarks: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    file: null,
  });

  const [products, setProducts] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterName, setFilterName] = useState("");
  const debouncedFilterName = useDebounce(filterName, 400);

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

  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [startDate, endDate, filterName]);

  const queryArgs = useMemo(
    () => ({
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      searchTerm: debouncedFilterName?.trim() || undefined,
    }),
    [currentPage, startDate, endDate, filterName],
  );

  const { data, isLoading, refetch } = useGetAllPayableQuery(queryArgs);

  useEffect(() => {
    if (!isLoading && data) {
      setProducts(data?.data ?? []);
      setTotalPages(
        Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)),
      );
    }
  }, [data, isLoading, itemsPerPage]);

  const [insertPayable] = useInsertPayableMutation();
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("name", createProduct.name.trim());
      formData.append("date", createProduct.date);
      formData.append("remarks", createProduct.remarks?.trim() || "");
      formData.append("amount", String(Number(createProduct.amount)));
      if (createProduct.file) formData.append("file", createProduct.file);

      const res = await insertPayable(formData).unwrap();
      if (res?.success) {
        toast.success("Payable entry created");
        setIsModalOpen1(false);
        setCreateProduct({
          name: "",
          remarks: "",
          amount: "",
          date: new Date().toISOString().slice(0, 10),
          file: null,
        });
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Creation failed");
    }
  };

  const [updatePayable] = useUpdatePayableMutation();
  const handleUpdateProduct = async (e) => {
    e?.preventDefault();
    const rowId = currentProduct?.Id || currentProduct?.id;
    try {
      const fd = new FormData();
      fd.append("name", currentProduct?.name?.trim() || "");
      fd.append("date", currentProduct?.date || "");
      fd.append("remarks", currentProduct?.remarks?.trim() || "");
      fd.append("note", currentProduct?.note?.trim() || "");
      fd.append("status", currentProduct?.status?.trim() || "");
      fd.append("userId", userId);
      fd.append("actorRole", role);
      fd.append("amount", String(Number(currentProduct?.amount || 0)));
      if (currentProduct.file instanceof File) {
        fd.append("file", currentProduct.file);
      }

      const res = await updatePayable({ id: rowId, data: fd }).unwrap();
      if (res?.success) {
        toast.success("Updated successfully");
        setIsModalOpen(false);
        setIsModalOpen2(false);
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed");
    }
  };

  const [deletePayable] = useDeletePayableMutation();
  const handleDeleteProduct = async (id) => {
    if (
      await requestDeleteConfirmation({ message: "Delete this payable entry?" })
    ) {
      try {
        const res = await deletePayable(id).unwrap();
        if (res?.success) {
          toast.success("Deleted successfully");
          refetch();
        }
      } catch (err) {
        toast.error(err?.data?.message || "Delete failed");
      }
    }
  };

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);
  const handlePageChange = (p) => {
    setCurrentPage(p);
    if (p < startPage) setStartPage(p);
    else if (p > endPage) setStartPage(p - pagesPerSet + 1);
  };

  const handlePreviousSet = () =>
    setStartPage((p) => Math.max(p - pagesPerSet, 1));
  const handleNextSet = () =>
    setStartPage((p) =>
      Math.min(p + pagesPerSet, Math.max(totalPages - pagesPerSet + 1, 1)),
    );

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-sm rounded-3xl p-4 sm:p-8 border border-slate-100 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Accounts Payable
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Manage and track outstanding obligations to suppliers
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="inline-flex items-center gap-3 bg-amber-50 border border-amber-100 px-5 py-2.5 rounded-2xl shadow-sm shadow-amber-50">
            <div className="h-8 w-8 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm">
              <TrendingUp size={18} />
            </div>
            <div>
              <div className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em]">
                Total Due
              </div>
              <div className="text-base font-black text-amber-900 tabular-nums leading-none">
                ৳{(data?.meta?.countAmount || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen1(true)}
            className="group relative inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 active:scale-95 overflow-hidden w-full sm:w-auto"
          >
            <Plus size={18} /> New Payable Entry
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 items-end">
        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            From Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium text-sm"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            To Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium text-sm"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Search Entity
          </label>
          <input
            type="text"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            placeholder="Search by name..."
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium text-sm"
          />
        </div>

        <button
          className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 transition rounded-xl px-4 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 border border-slate-200"
          onClick={() => {
            setStartDate("");
            setEndDate("");
            setFilterName("");
          }}
        >
          <X size={16} /> Reset Filters
        </button>
      </div>

      {/* Table */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Entity / Supplier
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Document
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Due Amount
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Status
                </th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {products.map((rp) => {
                const rowId = rp.Id || rp.id;
                const safePath = String(rp.file || "").replace(/\\/g, "/");
                const fileUrl = safePath
                  ? `${import.meta.env.VITE_API_URL}${safePath}`
                  : "";
                const ext = safePath.split(".").pop()?.toLowerCase();
                const isImage = ["jpg", "jpeg", "png", "webp"].includes(ext);

                return (
                  <motion.tr
                    key={rowId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-indigo-50/30 transition-colors group"
                  >
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {rp?.supplier?.name || rp.name}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                          Date: {rp.date}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {safePath ? (
                        <div className="flex items-center">
                          {isImage ? (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block h-10 w-10 rounded-xl overflow-hidden border border-slate-200 hover:scale-105 transition active:scale-95 shadow-sm"
                            >
                              <img
                                src={fileUrl}
                                alt="doc"
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ) : (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-black uppercase hover:bg-indigo-100 transition shadow-sm active:scale-95"
                            >
                              <FileText size={14} /> PDF
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-300 italic">
                          No document
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="inline-flex items-center px-4 py-1.5 rounded-2xl text-xs font-black bg-rose-50 text-rose-700 border border-rose-100 shadow-sm shadow-rose-50 tabular-nums">
                        ৳ {Number(rp.amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          rp.status === "Approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : rp.status === "Active"
                              ? "bg-blue-50 text-blue-700 border-blue-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}
                      >
                        {rp.status || "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setNoteContent(rp.note);
                            setIsNoteModalOpen(true);
                          }}
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition shadow-sm active:scale-90"
                          title="View Note"
                        >
                          <Notebook size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setCurrentProduct(rp);
                            setIsModalOpen(true);
                          }}
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition shadow-sm active:scale-90"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(rowId)}
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition shadow-sm active:scale-90"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>

          {isLoading && (
            <div className="py-24 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-[3px] border-indigo-600/20 border-t-indigo-600"></div>
            </div>
          )}

          {!isLoading && products.length === 0 && (
            <div className="py-24 text-center text-slate-400">
              <div className="text-4xl mb-4 opacity-20">💸</div>
              <p className="font-bold text-sm italic">
                No payable obligations found
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between mt-10 gap-6 px-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Showing Page <span className="text-indigo-600">{currentPage}</span> of{" "}
          <span className="text-slate-900">{totalPages}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousSet}
            disabled={startPage === 1}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <div className="flex items-center gap-1.5">
            {[...Array(endPage - startPage + 1)].map((_, index) => {
              const pageNum = startPage + index;
              const active = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`h-11 w-11 rounded-2xl font-black text-sm transition-all active:scale-90 ${
                    active
                      ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100"
                      : "bg-white text-slate-600 border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleNextSet}
            disabled={endPage === totalPages}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Note Preview Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title="Commentary Note"
      >
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 min-h-[120px]">
          <p className="text-slate-600 text-sm italic leading-relaxed whitespace-pre-wrap">
            {noteContent || "No detailed note provided for this entry."}
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setIsNoteModalOpen(false)}
            className="px-10 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition shadow-lg active:scale-95"
          >
            Done
          </button>
        </div>
      </Modal>

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen1}
        onClose={() => setIsModalOpen1(false)}
        title="New Payable Obligation"
      >
        <form onSubmit={handleCreateProduct} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                <Building2 size={12} className="text-indigo-500" /> Entity Name
              </label>
              <input
                type="text"
                required
                value={createProduct.name}
                onChange={(e) =>
                  setCreateProduct({ ...createProduct, name: e.target.value })
                }
                className="h-12 w-full px-4 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                <Calendar size={12} className="text-indigo-500" /> Transaction
                Date
              </label>
              <input
                type="date"
                required
                value={createProduct.date}
                onChange={(e) =>
                  setCreateProduct({ ...createProduct, date: e.target.value })
                }
                className="h-12 w-full px-4 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <Wallet size={12} className="text-indigo-500" /> Amount Payable
              (৳)
            </label>
            <input
              type="number"
              required
              value={createProduct.amount}
              onChange={(e) =>
                setCreateProduct({ ...createProduct, amount: e.target.value })
              }
              className="h-12 w-full px-4 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Summary / Remarks
            </label>
            <textarea
              value={createProduct.remarks}
              onChange={(e) =>
                setCreateProduct({ ...createProduct, remarks: e.target.value })
              }
              className="w-full min-h-[80px] px-4 py-3 rounded-xl border border-slate-200 bg-white font-medium text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none"
              placeholder="Add context..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Supporting Document
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
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen1(false)}
              className="px-6 py-2.5 border border-slate-200 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-xl shadow-indigo-100"
            >
              Create Payable
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Update Payable Record"
      >
        {currentProduct && (
          <form onSubmit={handleUpdateProduct} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  Entity Name
                </label>
                <input
                  type="text"
                  required
                  value={currentProduct.name}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      name: e.target.value,
                    })
                  }
                  className="h-12 w-full px-4 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={currentProduct.date}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      date: e.target.value,
                    })
                  }
                  className="h-12 w-full px-4 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Amount Payable (৳)
              </label>
              <input
                type="number"
                required
                value={currentProduct.amount}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    amount: e.target.value,
                  })
                }
                className="h-12 w-full px-4 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-indigo-600">
                  Admin Control: Status
                </label>
                <select
                  value={currentProduct.status || ""}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      status: e.target.value,
                    })
                  }
                  className="h-12 w-full px-4 rounded-xl border border-slate-200 bg-white font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition appearance-none cursor-pointer"
                  disabled={role !== "superAdmin"}
                >
                  <option value="Pending">Pending Review</option>
                  <option value="Active">Active Obligation</option>
                  <option value="Approved">Verified / Approved</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  Administrative Note
                </label>
                <input
                  type="text"
                  value={currentProduct.note || ""}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      note: e.target.value,
                    })
                  }
                  className="h-12 w-full px-4 rounded-xl border border-slate-200 bg-white font-medium text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  placeholder="Internal notes..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                New Document (Optional)
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
                className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 border border-slate-200 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-10 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-xl shadow-indigo-100"
              >
                Save Updates
              </button>
            </div>
          </form>
        )}
      </Modal>
    </motion.div>
  );
};

export default PayableTable;
