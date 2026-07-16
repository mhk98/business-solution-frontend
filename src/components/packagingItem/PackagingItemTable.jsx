import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Edit, PackagePlus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";

import DateRangeFilter from "../common/DateRangeFilter";
import Modal from "../common/Modal";
import {
  useDeletePackagingItemMutation,
  useGetAllPackagingItemQuery,
  useGetAllPackagingItemWithoutQueryQuery,
  useInsertPackagingItemMutation,
  useUpdatePackagingItemMutation,
} from "../../features/packagingItem/packagingItem";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";

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
  singleValue: (base) => ({
    ...base,
    color: "#1e293b",
    fontSize: "14px",
    fontWeight: "500",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid #f1f5f9",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
    zIndex: 50,
  }),
};

const PackagingItemTable = () => {
  const role = localStorage.getItem("role");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [createItem, setCreateItem] = useState({ name: "" });
  const [items, setItems] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [name, setName] = useState("");
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
  }, [startDate, endDate, name, itemsPerPage]);

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
      Math.min(prev + pagesPerSet, Math.max(1, totalPages - pagesPerSet + 1)),
    );

  const { data: allItemsRes } = useGetAllPackagingItemWithoutQueryQuery();
  const allItems = allItemsRes?.data || [];
  const itemOptions = useMemo(
    () => allItems.map((item) => ({ value: item.name, label: item.name })),
    [allItems],
  );

  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      name: name?.trim() ? name.trim() : undefined,
    };
    Object.keys(args).forEach((key) => {
      if (!args[key]) delete args[key];
    });
    return args;
  }, [currentPage, endDate, itemsPerPage, name, startDate]);

  const { data, isLoading, refetch } = useGetAllPackagingItemQuery(queryArgs);
  const [insertPackagingItem] = useInsertPackagingItemMutation();
  const [updatePackagingItem] = useUpdatePackagingItemMutation();
  const [deletePackagingItem] = useDeletePackagingItemMutation();

  useEffect(() => {
    if (!isLoading && data?.data) {
      setItems(data.data);
      setTotalPages(
        Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)),
      );
    }
  }, [data, isLoading, itemsPerPage]);

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      const res = await insertPackagingItem(createItem).unwrap();
      if (res?.success) {
        toast.success("Packaging item created successfully");
        setIsCreateModalOpen(false);
        setCreateItem({ name: "" });
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    try {
      const res = await updatePackagingItem({
        id: currentItem.Id,
        data: { name: currentItem.name },
      }).unwrap();
      if (res?.success) {
        toast.success("Packaging item updated successfully");
        setIsEditModalOpen(false);
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleDeleteItem = async (id) => {
    if (
      await requestDeleteConfirmation({
        message: "Do you want to delete this packaging item?",
      })
    ) {
      try {
        const res = await deletePackagingItem(id).unwrap();
        if (res?.success !== false) {
          toast.success("Packaging item deleted successfully");
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
    setName("");
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
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Packaging Items
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Manage packaging items used in manufacturing workflows.
          </p>
        </div>
        {(role === "superAdmin" || role === "admin") && (
          <button
            className="group relative inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 active:scale-95 overflow-hidden"
            onClick={() => setIsCreateModalOpen(true)}
            type="button"
          >
            Add
            <Plus size={18} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 items-end">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          startLabel="Start Date"
          endLabel="End Date"
          compact
          className="sm:col-span-2"
        />

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Per Page
          </label>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold text-sm appearance-none cursor-pointer"
          >
            {[10, 20, 50, 100].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Packaging Item
          </label>
          <Select
            options={itemOptions}
            value={itemOptions.find((option) => option.value === name) || null}
            onChange={(selected) => setName(selected?.value || "")}
            placeholder="Search..."
            isClearable
            styles={selectStyles}
            className="text-black"
          />
        </div>

        <button
          className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 transition rounded-xl px-4 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 border border-slate-200"
          onClick={clearFilters}
          type="button"
        >
          <X size={16} /> Clear
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Packaging Item Details
                </th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <motion.tr
                  key={item.Id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-indigo-50/30 transition-colors group"
                >
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <span className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <PackagePlus size={16} />
                      </span>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {item.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    {(role === "superAdmin" || role === "admin") && (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setCurrentItem({ ...item });
                            setIsEditModalOpen(true);
                          }}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 transition shadow-sm active:scale-90"
                          title="Edit"
                          type="button"
                        >
                          <Edit className="text-indigo-600" size={16} />
                        </button>

                        <button
                          onClick={() => handleDeleteItem(item.Id)}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:border-rose-200 hover:bg-rose-50 transition shadow-sm active:scale-90"
                          title="Delete"
                          type="button"
                        >
                          <Trash2 className="text-red-600" size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {isLoading && (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600/20 border-t-indigo-600" />
              <p className="text-slate-500 text-sm mt-4 font-bold tracking-tight">
                Syncing packaging items...
              </p>
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="py-20 text-center text-slate-400">
              <PackagePlus className="mx-auto mb-4 opacity-30" size={42} />
              <p className="font-bold text-sm italic">
                No packaging item found.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between mt-10 gap-6 px-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Showing Page <span className="text-indigo-600">{currentPage}</span>{" "}
          of <span className="text-slate-900">{totalPages}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousSet}
            disabled={startPage === 1}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
            type="button"
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
                  type="button"
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
            type="button"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Packaging Item"
      >
        <form onSubmit={handleUpdateItem} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
              Packaging Item Name
            </label>
            <input
              type="text"
              required
              value={currentItem?.name || ""}
              onChange={(e) =>
                setCurrentItem({ ...currentItem, name: e.target.value })
              }
              className="h-12 border border-slate-200 rounded-2xl px-4 w-full text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold"
              placeholder="Enter packaging item name"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition active:scale-95"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 active:scale-95"
            >
              Update
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Packaging Item"
      >
        <form onSubmit={handleCreateItem} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
              Packaging Item Name
            </label>
            <input
              type="text"
              required
              value={createItem.name}
              onChange={(e) =>
                setCreateItem({ ...createItem, name: e.target.value })
              }
              className="h-12 border border-slate-200 rounded-2xl px-4 w-full bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold"
              placeholder="e.g. Light Packet"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition active:scale-95"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 active:scale-95"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default PackagingItemTable;
