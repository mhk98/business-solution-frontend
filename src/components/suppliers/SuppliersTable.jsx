import { motion } from "framer-motion";
import { Edit, Trash2, X, ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import Select from "react-select";

import {
  useDeleteSupplierMutation,
  useGetAllSupplierQuery,
  useGetAllSupplierWithoutQueryQuery,
  useInsertSupplierMutation,
  useUpdateSupplierMutation,
} from "../../features/supplier/supplier";
import Modal from "../common/Modal";
import DateRangeFilter from "../common/DateRangeFilter";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";

const SuppliersTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [isModalOpen1, setIsModalOpen1] = useState(false);
  const [createSupplier, setCreateSupplier] = useState({
    name: "",
    remarks: "",
  });
  const [suppliers, setSuppliers] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [supplierIdFilter, setSupplierIdFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);
  const [itemsPerPage] = useState(10);

  const { data: allSupplierRes } = useGetAllSupplierWithoutQueryQuery();
  const suppliersData = allSupplierRes?.data || [];

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

  const { data, isLoading, refetch } = useGetAllSupplierQuery({
    startDate,
    endDate,
    supplierId: supplierIdFilter,
    page: currentPage,
    limit: itemsPerPage,
  });

  useEffect(() => {
    if (!isLoading && data?.data) {
      setSuppliers(data.data);
      setTotalPages(Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)));
    }
  }, [data, isLoading, itemsPerPage]);

  const handleEditClick = (supplier) => {
    setCurrentSupplier(supplier);
    setIsModalOpen(true);
  };

  const [insertSupplier] = useInsertSupplierMutation();
  const handlecreateSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await insertSupplier(createSupplier).unwrap();
      if (res.success) {
        toast.success("Successfully created supplier");
        setIsModalOpen1(false);
        setCreateSupplier({ name: "", remarks: "" });
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  const [updateSupplier] = useUpdateSupplierMutation();
  const handleUpdateSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await updateSupplier({
        id: currentSupplier.Id,
        data: {
          name: currentSupplier.name,
          remarks: currentSupplier.remarks,
        },
      }).unwrap();
      if (res.success) {
        toast.success("Successfully updated supplier!");
        setIsModalOpen(false);
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const [deleteSupplier] = useDeleteSupplierMutation();
  const handleDeleteSupplier = async (id) => {
    if (await requestDeleteConfirmation({ message: "Do you want to delete this supplier?" })) {
      try {
        const res = await deleteSupplier(id).unwrap();
        if (res?.success !== false) {
          toast.success("Successfully deleted supplier!");
          refetch();
        }
      } catch (err) {
        toast.error(err?.data?.message || "Delete failed!");
      }
    }
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSupplierIdFilter("");
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    if (pageNumber < startPage) setStartPage(pageNumber);
    else if (pageNumber > Math.min(startPage + pagesPerSet - 1, totalPages)) setStartPage(pageNumber - pagesPerSet + 1);
  };

  const handlePreviousSet = () => setStartPage((prev) => Math.max(prev - pagesPerSet, 1));
  const handleNextSet = () => setStartPage((prev) => Math.min(prev + pagesPerSet, Math.max(1, totalPages - pagesPerSet + 1)));

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const supplierOptions = useMemo(() => suppliersData.map((s) => ({
    value: s.Id,
    label: s.name,
  })), [suppliersData]);

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 12,
      borderColor: state.isFocused ? "#6366f1" : "#e2e8f0",
      boxShadow: state.isFocused ? "0 0 0 4px rgba(99, 102, 241, 0.1)" : "none",
      "&:hover": { borderColor: "#cbd5e1" },
      backgroundColor: "white",
    }),
    placeholder: (base) => ({ ...base, color: "#94a3b8", fontSize: "14px" }),
    singleValue: (base) => ({ ...base, color: "#1e293b", fontSize: "14px", fontWeight: "500" }),
    menu: (base) => ({
      ...base,
      borderRadius: 14,
      overflow: "hidden",
      border: "1px solid #f1f5f9",
      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
      zIndex: 50
    }),
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-sm rounded-3xl p-4 sm:p-8 border border-slate-100 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Suppliers Directory</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Manage and track your business suppliers</p>
        </div>
        <button
          className="group relative inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 active:scale-95 overflow-hidden"
          onClick={() => setIsModalOpen1(true)}
          type="button"
        >
          <UserPlus size={18} /> Add New Supplier
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 items-end">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          compact
          className="md:col-span-2"
        />

        <div className="flex flex-col lg:col-span-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Search Supplier</label>
          <Select
            options={supplierOptions}
            value={supplierOptions.find(o => String(o.value) === String(supplierIdFilter)) || null}
            onChange={(s) => setSupplierIdFilter(s?.value || "")}
            placeholder="Search name..."
            isClearable
            styles={selectStyles}
          />
        </div>

        <button
          className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 transition rounded-xl px-4 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 border border-slate-200"
          onClick={clearFilters}
          type="button"
        >
          <X size={16} /> Clear Filters
        </button>
      </div>

      {/* Table */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Supplier Name
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Due Amount
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Remarks
                </th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {suppliers.map((supplier) => (
                <motion.tr
                  key={supplier.Id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-indigo-50/30 transition-colors group"
                >
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                      {supplier.name}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black border tracking-tighter shadow-sm ${Number(supplier.due_amount || 0) > 0
                        ? "bg-rose-50 text-rose-700 border-rose-100 shadow-rose-50"
                        : "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-50"
                      }`}>
                      ৳ {Number(supplier.due_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-xs text-slate-500 font-medium line-clamp-1 max-w-[200px]" title={supplier.remarks}>
                      {supplier.remarks || "—"}
                    </div>
                  </td>

                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEditClick(supplier)}
                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition shadow-sm active:scale-90"
                        title="Edit"
                        type="button"
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        onClick={() => handleDeleteSupplier(supplier.Id)}
                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition shadow-sm active:scale-90"
                        title="Delete"
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {isLoading && (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600/20 border-t-indigo-600"></div>
              <p className="text-slate-500 text-sm mt-4 font-bold tracking-tight">Loading Suppliers...</p>
            </div>
          )}

          {!isLoading && suppliers.length === 0 && (
            <div className="py-20 text-center text-slate-400">
              <div className="text-4xl mb-4 opacity-20">👥</div>
              <p className="font-bold text-sm italic">No suppliers found</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between mt-10 gap-6 px-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Showing Page <span className="text-indigo-600">{currentPage}</span> of <span className="text-slate-900">{totalPages}</span>
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
                  className={`h-11 w-11 rounded-2xl font-black text-sm transition-all active:scale-90 ${active ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100" : "bg-white text-slate-600 border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600"
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

      {/* Modals */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit Supplier info"
      >
        <form onSubmit={handleUpdateSupplier} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Supplier Name</label>
            <input
              type="text"
              required
              value={currentSupplier?.name || ""}
              onChange={(e) => setCurrentSupplier({ ...currentSupplier, name: e.target.value })}
              className="h-12 border border-slate-200 rounded-2xl px-4 w-full text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold"
              placeholder="e.g. Acme Corp"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Remarks</label>
            <textarea
              value={currentSupplier?.remarks || ""}
              onChange={(e) => setCurrentSupplier({ ...currentSupplier, remarks: e.target.value })}
              className="border border-slate-200 rounded-2xl p-4 w-full text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium min-h-[120px]"
              placeholder="Add any internal notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition active:scale-95"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 active:scale-95"
            >
              Update Supplier
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isModalOpen1}
        onClose={() => setIsModalOpen1(false)}
        title="Register New Supplier"
      >
        <form onSubmit={handlecreateSupplier} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Supplier Name</label>
            <input
              type="text"
              required
              value={createSupplier.name}
              onChange={(e) => setCreateSupplier({ ...createSupplier, name: e.target.value })}
              className="h-12 border border-slate-200 rounded-2xl px-4 w-full bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold"
              placeholder="e.g. Global Supplies Ltd"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Remarks (Optional)</label>
            <textarea
              value={createSupplier.remarks}
              onChange={(e) => setCreateSupplier({ ...createSupplier, remarks: e.target.value })}
              className="border border-slate-200 rounded-2xl p-4 w-full bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium min-h-[120px]"
              placeholder="Internal notes about this supplier..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition active:scale-95"
              onClick={() => setIsModalOpen1(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 active:scale-95"
            >
              Add Supplier
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default SuppliersTable;
