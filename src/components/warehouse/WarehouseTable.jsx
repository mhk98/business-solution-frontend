import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2, Warehouse, ChevronLeft, ChevronRight, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  useDeleteWirehouseMutation,
  useGetAllWirehouseQuery,
  useInsertWirehouseMutation,
  useUpdateWirehouseMutation,
} from "../../features/wirehouse/wirehouse";
import Modal from "../common/Modal";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import useDebounce from "../../hooks/useDebounce";


const WarehouseTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false); // Edit modal
  const [isModalOpen1, setIsModalOpen1] = useState(false); // Add modal

  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");

  const [currentWarehouse, setCurrentWarehouse] = useState(null);
  const [createWarehouse, setCreateWarehouse] = useState({ name: "" });
  const [name, setName] = useState("");
  const debouncedName = useDebounce(name, 400); // search term

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

  const { data, isLoading, refetch } = useGetAllWirehouseQuery({
    page: currentPage,
    limit: itemsPerPage,
    searchTerm: debouncedName || undefined,
  });

  const warehouses = data?.data ?? [];

  useEffect(() => {
    if (!isLoading && data?.meta?.count != null) {
      setTotalPages(Math.max(1, Math.ceil(data.meta.count / itemsPerPage)));
    }
  }, [data, isLoading]);

  const handleEditWarehouse = (item) => {
    setCurrentWarehouse(item);
    setIsModalOpen(true);
  };

  const [insertWirehouse] = useInsertWirehouseMutation();
  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    try {
      const res = await insertWirehouse({ name: createWarehouse.name.trim() }).unwrap();
      if (res?.success) {
        toast.success("Warehouse created successfully!");
        setIsModalOpen1(false);
        setCreateWarehouse({ name: "" });
        refetch?.();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  const [updateWirehouse] = useUpdateWirehouseMutation();
  const handleUpdateWarehouseAction = async (e) => {
    e.preventDefault();
    try {
      const res = await updateWirehouse({
        id: currentWarehouse.Id,
        data: { name: currentWarehouse.name.trim(), userId, actorRole: role },
      }).unwrap();
      if (res?.success) {
        toast.success("Warehouse updated successfully!");
        setIsModalOpen(false);
        refetch?.();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const [deleteWirehouse] = useDeleteWirehouseMutation();
  const handleDeleteWarehouse = async (id) => {
    if (await requestDeleteConfirmation({ message: "Do you want to delete this warehouse?" })) {
      try {
        const res = await deleteWirehouse(id).unwrap();
        if (res?.success !== false) {
          toast.success("Warehouse deleted successfully!");
          refetch?.();
        }
      } catch (err) {
        toast.error(err?.data?.message || "Delete failed!");
      }
    }
  };

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);
  const handlePageChange = (p) => {
    setCurrentPage(p);
    if (p < startPage) setStartPage(p);
    else if (p > endPage) setStartPage(p - pagesPerSet + 1);
  };

  const handlePreviousSet = () => setStartPage((p) => Math.max(p - pagesPerSet, 1));
  const handleNextSet = () => setStartPage((p) => Math.min(p + pagesPerSet, Math.max(1, totalPages - pagesPerSet + 1)));

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-sm rounded-3xl p-4 sm:p-8 border border-slate-100 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Warehouse Management</h2>
          <p className="text-slate-500 text-sm font-medium">Coordinate your storage locations and inventory</p>
        </div>
        <button
          onClick={() => setIsModalOpen1(true)}
          className="group relative inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 active:scale-95 overflow-hidden"
        >
          <Plus size={18} /> Add New Warehouse
        </button>
      </div>

      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="text-slate-400" size={18} />
        </div>
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setCurrentPage(1); setStartPage(1); }}
          placeholder="Search by warehouse name..."
          className="w-full h-12 rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium"
        />
        {name && (
          <button onClick={() => setName("")} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="rounded-3xl border border-slate-100 overflow-hidden bg-white shadow-sm">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600/20 border-t-indigo-600"></div>
          </div>
        ) : warehouses.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {warehouses.map((item) => (
              <motion.div
                key={item.Id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between px-6 py-5 hover:bg-indigo-50/30 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100 group-hover:scale-110 transition-transform">
                    <Warehouse size={20} />
                  </div>
                  <div>
                    <div className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                      {item.name}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">Storage Unit ID: #{String(item.Id).padStart(4, "0")}</div>
                  </div>
                </div>

                {(role === "superAdmin" || role === "admin") && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditWarehouse(item)}
                      className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition shadow-sm active:scale-90"
                      title="Edit"
                    >
                      <Pencil className="text-indigo-600" size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteWarehouse(item.Id)}
                      className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition shadow-sm active:scale-90"
                      title="Delete"
                    >
                      <Trash2 className="text-red-600" size={18} />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center">
            <div className="text-4xl mb-4 opacity-20">🏢</div>
            <p className="text-slate-400 font-bold text-sm italic">No storage locations found matching your search</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between mt-10 gap-6 px-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Results: <span className="text-indigo-600">{warehouses.length}</span> / Page <span className="text-slate-900">{currentPage}</span>
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
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`h-11 w-11 rounded-2xl font-black text-sm transition-all active:scale-90 ${pageNum === currentPage ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100" : "bg-white text-slate-600 border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600"
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Update Warehouse Details">
        <form onSubmit={handleUpdateWarehouseAction} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Location Name</label>
            <input
              type="text"
              required
              value={currentWarehouse?.name || ""}
              onChange={(e) => setCurrentWarehouse((prev) => ({ ...prev, name: e.target.value }))}
              className="h-12 border border-slate-200 rounded-2xl px-4 w-full text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold"
              placeholder="e.g. Dhaka Central Warehouse"
            />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100">Save Changes</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isModalOpen1} onClose={() => setIsModalOpen1(false)} title="Add New Storage Location">
        <form onSubmit={handleCreateWarehouse} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Warehouse Name</label>
            <input
              type="text"
              required
              value={createWarehouse.name}
              onChange={(e) => setCreateWarehouse({ name: e.target.value })}
              className="h-12 border border-slate-200 rounded-2xl px-4 w-full bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold"
              placeholder="e.g. Chittagong Port Unit"
            />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen1(false)} className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100">Register Warehouse</button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default WarehouseTable;
