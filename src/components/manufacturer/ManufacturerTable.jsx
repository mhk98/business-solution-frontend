import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Factory,
  History,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import Modal from "../common/Modal";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import {
  useDeleteManufacturerMutation,
  useGetAllManufacturerQuery,
  useInsertManufacturerMutation,
  useUpdateManufacturerMutation,
} from "../../features/manufacturer/manufacturer";

const emptyForm = {
  name: "",
  phone: "",
  address: "",
};

const formatMoney = (value) =>
  `৳${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const ManufacturerTable = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const canManage = role === "superAdmin" || role === "admin";

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      searchTerm: searchTerm?.trim() || undefined,
    };
    Object.keys(args).forEach((key) => {
      if (!args[key]) delete args[key];
    });
    return args;
  }, [currentPage, itemsPerPage, searchTerm]);

  const { data, isLoading, refetch } = useGetAllManufacturerQuery(queryArgs);
  const rows = data?.data || [];
  const totalEntries = data?.meta?.count || 0;

  useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(totalEntries / itemsPerPage)));
  }, [itemsPerPage, totalEntries]);

  const [insertManufacturer, insertState] = useInsertManufacturerMutation();
  const [updateManufacturer, updateState] = useUpdateManufacturerMutation();
  const [deleteManufacturer] = useDeleteManufacturerMutation();

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await insertManufacturer(createForm).unwrap();
      if (res?.success !== false) {
        toast.success("Manufacturer created successfully");
        setCreateForm(emptyForm);
        setIsCreateOpen(false);
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await updateManufacturer({
        id: editForm.Id,
        data: {
          name: editForm.name,
          phone: editForm.phone,
          address: editForm.address,
        },
      }).unwrap();
      if (res?.success !== false) {
        toast.success("Manufacturer updated successfully");
        setIsEditOpen(false);
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleDelete = async (id) => {
    if (
      await requestDeleteConfirmation({
        message: "Do you want to delete this manufacturer?",
      })
    ) {
      try {
        const res = await deleteManufacturer(id).unwrap();
        if (res?.success !== false) {
          toast.success("Manufacturer deleted successfully");
          refetch();
        }
      } catch (err) {
        toast.error(err?.data?.message || "Delete failed!");
      }
    }
  };

  const openEdit = (row) => {
    setEditForm({
      Id: row.Id,
      name: row.name || "",
      phone: row.phone || "",
      address: row.address || "",
    });
    setIsEditOpen(true);
  };

  const openHistory = (row) => {
    navigate(`/manufacturer/${row.Id}`);
  };

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  const renderForm = (form, setForm, onSubmit, isSaving) => (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
          Name
        </label>
        <input
          type="text"
          required
          value={form?.name || ""}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="h-12 border border-slate-200 rounded-2xl px-4 w-full text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold"
          placeholder="Manufacturer name"
        />
      </div>

      <div>
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
          Phone
        </label>
        <input
          type="text"
          value={form?.phone || ""}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="h-12 border border-slate-200 rounded-2xl px-4 w-full text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold"
          placeholder="Phone number"
        />
      </div>

      <div>
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
          Address
        </label>
        <textarea
          value={form?.address || ""}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="min-h-28 border border-slate-200 rounded-2xl px-4 py-3 w-full text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold resize-y"
          placeholder="Address"
        />
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
        <button
          type="button"
          className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition active:scale-95"
          onClick={() => {
            setIsCreateOpen(false);
            setIsEditOpen(false);
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
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
            Manufacturer
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Manage manufacturer name, phone and address
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="inline-flex items-center gap-4 bg-indigo-50 border border-indigo-100 px-6 py-3 rounded-2xl shadow-sm shadow-indigo-50">
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
              <Factory size={20} />
            </div>
            <div>
              <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                Total Entries
              </div>
              <div className="text-xl font-black text-indigo-900 tabular-nums">
                {totalEntries.toLocaleString()}
              </div>
            </div>
          </div>

          {canManage && (
            <button
              className="group relative inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 active:scale-95"
              onClick={() => setIsCreateOpen(true)}
              type="button"
            >
              <Plus size={18} /> Add New
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_180px] gap-4 mb-10 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 items-end">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 block">
            Search
          </label>
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium text-sm w-full"
              placeholder="Search name, phone or address..."
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 block">
            Per Page
          </label>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold text-sm appearance-none cursor-pointer w-full"
          >
            {[10, 20, 50, 100].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <button
          className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 transition rounded-xl px-4 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 border border-slate-200"
          onClick={() => setSearchTerm("")}
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
                  Name
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Phone
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Address
                </th>
                <th className="px-6 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Paid
                </th>
                <th className="px-6 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Unpaid
                </th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <motion.tr
                  key={row.Id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-indigo-50/30 transition-colors group"
                >
                  <td className="px-6 py-5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openHistory(row)}
                      className="text-left text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors hover:underline underline-offset-4"
                      title="View transaction history"
                    >
                      {row.name}
                    </button>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-slate-600">
                    {row.phone || "N/A"}
                  </td>
                  <td className="px-6 py-5 min-w-80 text-sm font-medium text-slate-600">
                    {row.address || "N/A"}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-black text-emerald-600">
                    {formatMoney(row.paidAmount)}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-black text-rose-600">
                    {formatMoney(row.unpaidAmount)}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openHistory(row)}
                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition shadow-sm active:scale-90"
                        title="Transaction History"
                        type="button"
                      >
                        <History className="text-slate-600" size={16} />
                      </button>
                      {canManage && (
                        <>
                        <button
                          onClick={() => openEdit(row)}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition shadow-sm active:scale-90"
                          title="Edit"
                          type="button"
                        >
                          <Edit className="text-indigo-600" size={16} />
                        </button>
                        </>
                      )}

                      {canManage && (
                        <button
                          onClick={() => handleDelete(row.Id)}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition shadow-sm active:scale-90"
                          title="Delete"
                          type="button"
                        >
                          <Trash2 className="text-red-600" size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {isLoading && (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600/20 border-t-indigo-600"></div>
              <p className="text-slate-500 text-sm mt-4 font-bold tracking-tight">
                Loading manufacturers...
              </p>
            </div>
          )}

          {!isLoading && rows.length === 0 && (
            <div className="py-20 text-center text-slate-400">
              <Factory size={42} className="mx-auto mb-4 opacity-25" />
              <p className="font-bold text-sm italic">
                No manufacturer found
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between mt-10 gap-6 px-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Showing page <span className="text-indigo-600">{currentPage}</span>{" "}
          of <span className="text-slate-900">{totalPages}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <button className="h-11 w-11 rounded-2xl font-black text-sm bg-indigo-600 text-white shadow-xl shadow-indigo-100">
            {currentPage}
          </button>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Manufacturer"
      >
        {renderForm(
          createForm,
          setCreateForm,
          handleCreate,
          insertState.isLoading,
        )}
      </Modal>

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Manufacturer"
      >
        {editForm &&
          renderForm(editForm, setEditForm, handleUpdate, updateState.isLoading)}
      </Modal>
    </motion.div>
  );
};

export default ManufacturerTable;
