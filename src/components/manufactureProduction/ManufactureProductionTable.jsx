import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Factory,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";

import Modal from "../common/Modal";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import { useGetAllItemWithoutQueryQuery } from "../../features/item/item";
import { useGetAllManufacturerWithoutQueryQuery } from "../../features/manufacturer/manufacturer";
import {
  useDeleteManufactureProductionMutation,
  useGetAllManufactureProductionQuery,
  useInsertManufactureProductionMutation,
  useUpdateManufactureProductionMutation,
} from "../../features/manufactureProduction/manufactureProduction";

const createItemLine = () => ({
  itemId: "",
  unitValue: "",
  unit: "Pcs",
});

const initialForm = {
  itemId: "",
  items: [createItemLine()],
  manufacturerId: "",
  unitValue: "",
  unit: "Pcs",
  date: new Date().toISOString().slice(0, 10),
  note: "",
};

const unitOptions = [
  "Pcs",
  "Kg",
  "Liter",
  "Ml",
  "Gram",
  "Yard",
  "Inch",
  "Feet",
].map((unit) => ({ value: unit, label: unit }));

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 14,
    borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 4px rgba(99,102,241,0.15)" : "none",
    "&:hover": { borderColor: "#cbd5e1" },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 50,
    borderRadius: 14,
    overflow: "hidden",
  }),
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const ManufactureProductionTable = () => {
  const role = localStorage.getItem("role");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [manufacturerId, setManufacturerId] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [manufacturerId, itemsPerPage]);

  const { data: itemsRes, isLoading: isItemsLoading } =
    useGetAllItemWithoutQueryQuery();
  const { data: manufacturersRes, isLoading: isManufacturersLoading } =
    useGetAllManufacturerWithoutQueryQuery();

  const itemOptions = useMemo(
    () =>
      (itemsRes?.data || []).map((item) => ({
        value: String(item.Id),
        label: item.name,
      })),
    [itemsRes?.data],
  );
  const manufacturerOptions = useMemo(
    () =>
      (manufacturersRes?.data || []).map((manufacturer) => ({
        value: String(manufacturer.Id),
        label: manufacturer.name,
      })),
    [manufacturersRes?.data],
  );

  const queryArgs = useMemo(
    () => ({
      page: currentPage,
      limit: itemsPerPage,
      manufacturerId: manufacturerId || undefined,
    }),
    [currentPage, itemsPerPage, manufacturerId],
  );

  const { data, isLoading, refetch } =
    useGetAllManufactureProductionQuery(queryArgs);
  const rows = data?.data || [];

  useEffect(() => {
    setTotalPages(
      Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)),
    );
  }, [data?.meta?.count, itemsPerPage]);

  const [insertManufacture, insertState] =
    useInsertManufactureProductionMutation();
  const [updateManufacture, updateState] =
    useUpdateManufactureProductionMutation();
  const [deleteManufacture] = useDeleteManufactureProductionMutation();

  const openCreateModal = () => {
    setEditingRow(null);
    setForm(initialForm);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRow(null);
    setForm(initialForm);
  };

  const handleEdit = (row) => {
    setEditingRow(row);
    setForm({
      itemId: row.itemId ? String(row.itemId) : "",
      items: [createItemLine()],
      manufacturerId: row.manufacturerId ? String(row.manufacturerId) : "",
      unitValue: row.unitValue ? String(Number(row.unitValue || 0)) : "",
      unit: row.unit || "Pcs",
      date: row.date || new Date().toISOString().slice(0, 10),
      note: row.note || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.manufacturerId)
      return toast.error("Please select a manufacturer");

    const selectedItems = editingRow?.Id
      ? [form.itemId].filter(Boolean)
      : (form.items || []).filter((item) => item.itemId);
    const selectedItemIds = editingRow?.Id
      ? selectedItems
      : selectedItems.map((item) => item.itemId).filter(Boolean);

    if (!selectedItemIds.length) return toast.error("Please select an item");

    if (
      !editingRow?.Id &&
      new Set(selectedItemIds).size !== selectedItemIds.length
    ) {
      return toast.error("Please remove duplicate items");
    }

    if (editingRow?.Id) {
      const unitValue = Number(form.unitValue || 0);
      if (unitValue <= 0) return toast.error("Please enter valid quantity");
    } else {
      const invalidItem = selectedItems.find(
        (item) => Number(item.unitValue || 0) <= 0,
      );
      if (invalidItem)
        return toast.error("Please enter quantity for every item");
    }

    try {
      const basePayload = {
        manufacturerId: Number(form.manufacturerId),
        date: form.date || "",
        note: form.note || "",
      };

      const res = editingRow?.Id
        ? await updateManufacture({
            id: editingRow.Id,
            data: {
              ...basePayload,
              itemId: Number(selectedItemIds[0]),
              unit: form.unit || "Pcs",
              unitValue: Number(form.unitValue || 0),
            },
          }).unwrap()
        : await Promise.all(
            selectedItems.map((item) => {
              const unitValue = Number(item.unitValue || 0);
              return insertManufacture({
                ...basePayload,
                itemId: Number(item.itemId),
                unit: item.unit || "Pcs",
                unitValue,
              }).unwrap();
            }),
          );

      const isSuccess = Array.isArray(res)
        ? res.every((entry) => entry?.success !== false)
        : res?.success !== false;

      if (isSuccess) {
        toast.success(
          editingRow?.Id
            ? "Factory updated successfully"
            : "Factory created successfully",
        );
        closeModal();
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Save failed!");
    }
  };

  const updateCreateItem = (index, changes) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items || [createItemLine()]).map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    }));
  };

  const addCreateItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...(prev.items || []), createItemLine()],
    }));
  };

  const removeCreateItem = (index) => {
    setForm((prev) => {
      const nextItems = (prev.items || []).filter(
        (_, itemIndex) => itemIndex !== index,
      );

      return {
        ...prev,
        items: nextItems.length ? nextItems : [createItemLine()],
      };
    });
  };

  const handleDelete = async (id) => {
    const confirmed = await requestDeleteConfirmation({
      message: "Do you want to delete this factory entry?",
    });
    if (!confirmed) return;

    try {
      const res = await deleteManufacture(id).unwrap();
      if (res?.success !== false) {
        toast.success("Factory deleted successfully");
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
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
            Factory History
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Select manufacturer and transfer item stock into factory stock
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 active:scale-95"
        >
          <Plus size={18} /> Add New
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_180px] gap-4 mb-10 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 items-end">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 block">
            Manufacturer
          </label>
          <Select
            options={manufacturerOptions}
            value={
              manufacturerOptions.find((o) => o.value === manufacturerId) ||
              null
            }
            onChange={(selected) => setManufacturerId(selected?.value || "")}
            isClearable
            isDisabled={isManufacturersLoading}
            placeholder="Select manufacturer..."
            styles={selectStyles}
            className="text-black"
          />
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
          onClick={() => setManufacturerId("")}
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
                {[
                  "Date",
                  "Manufacturer",
                  "Item",
                  "Unit Value",
                  "Unit Cost",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.Id} className="hover:bg-indigo-50/30">
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">
                    {row.date || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    {row.manufacturerName || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    {row.name || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">
                    {Number(row.unitValue || 0)} {row.unit || "Pcs"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">
                    {formatMoney(
                      Number(row.unitValue || 0) > 0
                        ? Number(row.cost || 0) / Number(row.unitValue || 1)
                        : 0,
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {(role === "superAdmin" || role === "admin") && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(row)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition shadow-sm"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.Id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition shadow-sm"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <Factory
                      size={42}
                      className="mx-auto mb-4 text-slate-300"
                    />
                    <p className="font-bold text-sm italic text-slate-400">
                      No factory entries found
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between mt-10 gap-6 px-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Showing Page <span className="text-indigo-600">{currentPage}</span> of{" "}
          <span className="text-slate-900">{totalPages}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingRow?.Id ? "Edit Factory" : "Add Factory"}
        maxWidth={editingRow?.Id ? "max-w-2xl" : "max-w-4xl"}
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-4 overflow-x-hidden px-1"
        >
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              Manufacturer
            </label>
            <Select
              options={manufacturerOptions}
              value={
                manufacturerOptions.find(
                  (o) => o.value === String(form.manufacturerId),
                ) || null
              }
              onChange={(selected) =>
                setForm({ ...form, manufacturerId: selected?.value || "" })
              }
              placeholder="Select manufacturer..."
              isDisabled={isManufacturersLoading}
              styles={selectStyles}
              className="text-black"
            />
          </div>

          {editingRow?.Id ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Item
              </label>
              <Select
                options={itemOptions}
                value={
                  itemOptions.find((o) => o.value === String(form.itemId)) ||
                  null
                }
                onChange={(selected) =>
                  setForm({ ...form, itemId: selected?.value || "" })
                }
                placeholder="Select item..."
                isDisabled={isItemsLoading}
                styles={selectStyles}
                className="text-black"
              />
            </div>
          ) : (
            <div>
              <div className="sticky top-0 z-20 -mx-1 mb-3 flex items-center justify-between gap-3 border-b border-slate-100 bg-white/95 px-1 py-2 backdrop-blur">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Item
                </label>
                <button
                  type="button"
                  onClick={addCreateItem}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-3 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition active:scale-95"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>

              <div className="space-y-3">
                {(form.items || [createItemLine()]).map((item, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3"
                  >
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,1.35fr)_minmax(260px,1fr)_44px] lg:items-end">
                      <div className="min-w-0">
                        <label className="mb-1.5 ml-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Item
                        </label>
                        <Select
                          options={itemOptions}
                          value={
                            itemOptions.find(
                              (o) => o.value === String(item.itemId),
                            ) || null
                          }
                          onChange={(selected) =>
                            updateCreateItem(index, {
                              itemId: selected?.value || "",
                            })
                          }
                          placeholder="Select item..."
                          isDisabled={isItemsLoading}
                          styles={selectStyles}
                          className="text-black"
                        />
                      </div>

                      <div className="min-w-0">
                        <label className="mb-1.5 ml-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Unit Details
                        </label>
                        <div className="grid grid-cols-[minmax(0,1fr)_128px] gap-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.unitValue || ""}
                            onChange={(e) =>
                              updateCreateItem(index, {
                                unitValue: e.target.value,
                              })
                            }
                            // placeholder="Quantity"
                            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                          />
                          <Select
                            options={unitOptions}
                            value={{
                              value: item.unit || "Pcs",
                              label: item.unit || "Pcs",
                            }}
                            onChange={(selected) =>
                              updateCreateItem(index, {
                                unit: selected?.value || "Pcs",
                              })
                            }
                            styles={selectStyles}
                            className="text-black"
                          />
                        </div>
                      </div>

                      <div className="flex lg:justify-end">
                        {(form.items || []).length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeCreateItem(index)}
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 transition active:scale-95"
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <div className="hidden h-11 w-11 lg:block" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {editingRow?.Id && (
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-3">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.unitValue}
                onChange={(e) =>
                  setForm({ ...form, unitValue: e.target.value })
                }
                // placeholder="Quantity"
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              />
              <Select
                options={unitOptions}
                value={{ value: form.unit, label: form.unit }}
                onChange={(selected) =>
                  setForm({ ...form, unit: selected?.value || "Pcs" })
                }
                styles={selectStyles}
                className="text-black"
              />
            </div>
          )}

          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition w-full"
          />

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={closeModal}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={insertState.isLoading || updateState.isLoading}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-60"
            >
              {insertState.isLoading || updateState.isLoading
                ? "Saving..."
                : editingRow?.Id
                  ? "Update"
                  : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default ManufactureProductionTable;
