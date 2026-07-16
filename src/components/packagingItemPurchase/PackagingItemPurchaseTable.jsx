import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Plus,
  ShoppingBasket,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";

import DateRangeFilter from "../common/DateRangeFilter";
import Modal from "../common/Modal";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import { useGetAllPackagingItemWithoutQueryQuery } from "../../features/packagingItem/packagingItem";
import { useGetAllSupplierWithoutQueryQuery } from "../../features/supplier/supplier";
import {
  useDeletePackagingItemPurchaseMutation,
  useGetAllPackagingItemPurchaseQuery,
  useInsertPackagingItemPurchaseMutation,
  useUpdatePackagingItemPurchaseMutation,
} from "../../features/packagingItemPurchase/packagingItemPurchase";

const unitOptions = ["Pcs", "Kg", "Ml", "Gram", "Yard", "Inch", "Feet"].map(
  (unit) => ({ value: unit, label: unit }),
);

const emptyPurchaseItem = {
  packagingItemId: "",
  unit: "Pcs",
  unitValue: "",
  unitCost: "",
};

const emptyForm = {
  packagingItemId: "",
  unit: "Pcs",
  unitValue: "",
  unitCost: "",
  items: [emptyPurchaseItem],
  supplierId: "",
  date: new Date().toISOString().slice(0, 10),
  note: "",
};

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
  menu: (base) => ({
    ...base,
    zIndex: 50,
    borderRadius: 14,
    overflow: "hidden",
  }),
  placeholder: (base) => ({ ...base, color: "#94a3b8", fontSize: 14 }),
  singleValue: (base) => ({
    ...base,
    color: "#1e293b",
    fontSize: 14,
    fontWeight: 500,
  }),
};

const compactSelectStyles = {
  ...selectStyles,
  control: (base, state) => ({
    ...selectStyles.control(base, state),
    minHeight: 48,
    borderRadius: 14,
  }),
};

const getUnitCost = (row) => {
  const savedUnitCost = Number(row?.unitCost || 0);
  if (savedUnitCost) return savedUnitCost;

  const cost = Number(row?.cost || 0);
  const unitValue = Number(row?.unitValue || 0);
  if (!cost || !unitValue) return 0;
  return cost / unitValue;
};

const getLineTotal = (item) =>
  Number(item?.unitValue || 0) * Number(item?.unitCost || 0);

const getAllPackagingItemCost = (items = []) =>
  items.reduce((total, item) => total + getLineTotal(item), 0);

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const PackagingItemPurchaseTable = () => {
  const role = localStorage.getItem("role");
  const canManage = role === "superAdmin" || role === "admin";
  const [rows, setRows] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [currentRow, setCurrentRow] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [name, setName] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [startDate, endDate, name, itemsPerPage]);

  const { data: itemRes } = useGetAllPackagingItemWithoutQueryQuery();
  const { data: supplierRes } = useGetAllSupplierWithoutQueryQuery();
  const itemOptions = useMemo(
    () =>
      (itemRes?.data || []).map((item) => ({
        value: String(item.Id),
        label: item.name,
      })),
    [itemRes?.data],
  );
  const supplierOptions = useMemo(
    () =>
      (supplierRes?.data || []).map((item) => ({
        value: String(item.Id),
        label: item.name,
      })),
    [supplierRes?.data],
  );
  const filterItemOptions = useMemo(
    () =>
      (itemRes?.data || []).map((item) => ({
        value: item.name,
        label: item.name,
      })),
    [itemRes?.data],
  );

  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      name: name || undefined,
    };
    Object.keys(args).forEach((key) => !args[key] && delete args[key]);
    return args;
  }, [currentPage, endDate, itemsPerPage, name, startDate]);

  const { data, isLoading, refetch } =
    useGetAllPackagingItemPurchaseQuery(queryArgs);
  const [insertPurchase] = useInsertPackagingItemPurchaseMutation();
  const [updatePurchase] = useUpdatePackagingItemPurchaseMutation();
  const [deletePurchase] = useDeletePackagingItemPurchaseMutation();

  useEffect(() => {
    if (!isLoading && data) {
      setRows(data.data || []);
      setTotalPages(
        Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)),
      );
    }
  }, [data, isLoading, itemsPerPage]);

  const submitPayload = (value) => ({
    packagingItemId: Number(value.packagingItemId),
    supplierId: value.supplierId ? Number(value.supplierId) : null,
    unit: value.unit || "Pcs",
    unitValue: Number(value.unitValue || 0),
    unitCost: Number(value.unitCost || 0),
    cost: getLineTotal(value),
    totalCost: getLineTotal(value),
    date: value.date || new Date().toISOString().slice(0, 10),
    note: value.note || "",
  });

  const submitCreatePayload = (value) => ({
    supplierId: value.supplierId ? Number(value.supplierId) : null,
    date: value.date || new Date().toISOString().slice(0, 10),
    note: value.note || "",
    items: (value.items || []).map((item) => ({
      packagingItemId: Number(item.packagingItemId),
      unit: item.unit || "Pcs",
      unitValue: Number(item.unitValue || 0),
      unitCost: Number(item.unitCost || 0),
      totalCost: getLineTotal(item),
    })),
  });

  const updateCreateItem = (index, changes) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    }));
  };

  const addCreateItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...emptyPurchaseItem }],
    }));
  };

  const removeCreateItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items:
        prev.items.length === 1
          ? prev.items
          : prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.items?.length) return toast.error("Please add packaging item");

    const hasEmptyItem = form.items.some((item) => !item.packagingItemId);
    if (hasEmptyItem) return toast.error("Please select every packaging item");

    const hasInvalidQuantity = form.items.some(
      (item) => Number(item.unitValue || 0) <= 0,
    );
    if (hasInvalidQuantity)
      return toast.error("Quantity must be greater than 0");

    const hasInvalidCost = form.items.some(
      (item) => Number(item.unitCost || 0) <= 0,
    );
    if (hasInvalidCost) return toast.error("Unit cost must be greater than 0");

    try {
      const res = await insertPurchase(submitCreatePayload(form)).unwrap();
      if (res?.success) {
        toast.success("Packaging item purchase created");
        setIsCreateOpen(false);
        setForm({ ...emptyForm, items: [{ ...emptyPurchaseItem }] });
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!currentRow.packagingItemId)
      return toast.error("Please select a packaging item");
    if (Number(currentRow.unitValue || 0) <= 0)
      return toast.error("Quantity must be greater than 0");
    if (Number(currentRow.unitCost || 0) <= 0)
      return toast.error("Unit cost must be greater than 0");

    try {
      const res = await updatePurchase({
        id: currentRow.Id,
        data: submitPayload(currentRow),
      }).unwrap();
      if (res?.success) {
        toast.success("Packaging item purchase updated");
        setIsEditOpen(false);
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleDelete = async (id) => {
    if (
      !(await requestDeleteConfirmation({
        message: "Do you want to delete this purchase?",
      }))
    ) {
      return;
    }
    try {
      const res = await deletePurchase(id).unwrap();
      if (res?.success !== false) {
        toast.success("Packaging item purchase deleted");
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  const endPage = Math.min(startPage + 9, totalPages);
  const handlePageChange = (page) => {
    setCurrentPage(page);
    if (page < startPage) setStartPage(page);
    else if (page > endPage) setStartPage(page - 9);
  };

  const renderCreateForm = () => (
    <form onSubmit={handleCreate} className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <button
          type="button"
          onClick={addCreateItem}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 text-sm font-black hover:bg-indigo-100"
        >
          <Plus size={16} /> Add Packaging Item
        </button>
        <div className="inline-flex items-center justify-between gap-4 h-11 px-5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black">
          <span className="text-[11px] uppercase tracking-widest">
            All Packaging Item Cost
          </span>
          <span>৳{formatMoney(getAllPackagingItemCost(form.items))}</span>
        </div>
      </div>

      <div className="space-y-4">
        {(form.items || []).map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-1 xl:grid-cols-[1.45fr_2.3fr_1fr_1fr_auto] gap-3 items-end border border-slate-100 rounded-2xl p-4 bg-slate-50/40"
          >
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Item
              </label>
              <Select
                options={itemOptions}
                value={
                  itemOptions.find(
                    (option) => option.value === String(item.packagingItemId),
                  ) || null
                }
                onChange={(selected) =>
                  updateCreateItem(index, {
                    packagingItemId: selected?.value || "",
                  })
                }
                placeholder="Search item..."
                styles={selectStyles}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Unit Details
              </label>
              <div className="grid grid-cols-[minmax(150px,1fr)_150px] gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={item.unitValue}
                  onChange={(e) =>
                    updateCreateItem(index, { unitValue: e.target.value })
                  }
                  placeholder="20"
                  className="h-12 bg-white border border-slate-200 rounded-2xl px-4 w-full text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                  style={{ backgroundColor: "#ffffff", colorScheme: "light" }}
                />
                <Select
                  options={unitOptions}
                  value={
                    unitOptions.find((option) => option.value === item.unit) ||
                    unitOptions[0]
                  }
                  onChange={(selected) =>
                    updateCreateItem(index, {
                      unit: selected?.value || "Pcs",
                    })
                  }
                  styles={compactSelectStyles}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Unit Cost
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={item.unitCost}
                onChange={(e) =>
                  updateCreateItem(index, { unitCost: e.target.value })
                }
                className="h-12 bg-white border border-slate-200 rounded-2xl px-4 w-full text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                style={{ backgroundColor: "#ffffff", colorScheme: "light" }}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Total Cost
              </label>
              <div className="h-12 flex items-center px-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black">
                ৳{formatMoney(getLineTotal(item))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeCreateItem(index)}
              disabled={(form.items || []).length === 1}
              className="h-12 w-12 rounded-2xl border border-slate-200 bg-white flex items-center justify-center disabled:opacity-40"
            >
              <Trash2 className="text-red-600" size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Supplier
          </label>
          <Select
            options={supplierOptions}
            value={
              supplierOptions.find(
                (option) => option.value === String(form.supplierId),
              ) || null
            }
            onChange={(selected) =>
              setForm({ ...form, supplierId: selected?.value || "" })
            }
            placeholder="Select supplier..."
            isClearable
            styles={selectStyles}
          />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Date
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="h-12 bg-white border border-slate-200 rounded-2xl px-4 w-full text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
            style={{ backgroundColor: "#ffffff", colorScheme: "light" }}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
          Note
        </label>
        <textarea
          value={form.note || ""}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          className="min-h-24 bg-white border border-slate-200 rounded-2xl px-4 py-3 w-full text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
          style={{ backgroundColor: "#ffffff", colorScheme: "light" }}
        />
      </div>
      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
        <button
          type="submit"
          className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700"
        >
          Save
        </button>
      </div>
    </form>
  );

  const renderForm = (value, setValue, onSubmit) => (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Packaging Item
          </label>
          <Select
            options={itemOptions}
            value={
              itemOptions.find(
                (option) => option.value === String(value.packagingItemId),
              ) || null
            }
            onChange={(selected) =>
              setValue({ ...value, packagingItemId: selected?.value || "" })
            }
            placeholder="Select packaging item..."
            styles={selectStyles}
          />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Supplier
          </label>
          <Select
            options={supplierOptions}
            value={
              supplierOptions.find(
                (option) => option.value === String(value.supplierId),
              ) || null
            }
            onChange={(selected) =>
              setValue({ ...value, supplierId: selected?.value || "" })
            }
            placeholder="Select supplier..."
            isClearable
            styles={selectStyles}
          />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Unit Details
          </label>
          <div className="grid grid-cols-[minmax(160px,1fr)_150px] gap-2">
            <input
              type="number"
              min="0"
              step="any"
              value={value.unitValue}
              onChange={(e) =>
                setValue({ ...value, unitValue: e.target.value })
              }
              className="h-12 bg-white border border-slate-200 rounded-2xl px-4 w-full text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
              style={{ backgroundColor: "#ffffff", colorScheme: "light" }}
            />
            <Select
              options={unitOptions}
              value={
                unitOptions.find((option) => option.value === value.unit) ||
                unitOptions[0]
              }
              onChange={(selected) =>
                setValue({ ...value, unit: selected?.value || "Pcs" })
              }
              styles={compactSelectStyles}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Unit Cost
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={value.unitCost}
            onChange={(e) => setValue({ ...value, unitCost: e.target.value })}
            className="h-12 bg-white border border-slate-200 rounded-2xl px-4 w-full text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
            style={{ backgroundColor: "#ffffff", colorScheme: "light" }}
          />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Total Cost
          </label>
          <div className="h-12 flex items-center px-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black">
            ৳{formatMoney(getLineTotal(value))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Date
          </label>
          <input
          type="date"
          value={value.date}
          onChange={(e) => setValue({ ...value, date: e.target.value })}
            className="h-12 bg-white border border-slate-200 rounded-2xl px-4 w-full text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
            style={{ backgroundColor: "#ffffff", colorScheme: "light" }}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
          Note
        </label>
        <textarea
          value={value.note || ""}
          onChange={(e) => setValue({ ...value, note: e.target.value })}
          className="min-h-24 bg-white border border-slate-200 rounded-2xl px-4 py-3 w-full text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
          style={{ backgroundColor: "#ffffff", colorScheme: "light" }}
        />
      </div>
      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
        <button
          type="submit"
          className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700"
        >
          Save
        </button>
      </div>
    </form>
  );

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-sm rounded-3xl p-4 sm:p-8 border border-slate-100 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Packaging Item Purchase
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Purchase packaging items and update stock automatically.
          </p>
        </div>
        {canManage && (
          <button
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100"
            onClick={() => {
              setForm({ ...emptyForm, items: [{ ...emptyPurchaseItem }] });
              setIsCreateOpen(true);
            }}
            type="button"
          >
            Add Packaging Item <Plus size={18} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 items-end">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          compact
          className="sm:col-span-2"
        />
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 block">
            Per Page
          </label>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none w-full font-bold text-sm"
          >
            {[10, 20, 50, 100].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 block">
            Packaging Item
          </label>
          <Select
            options={filterItemOptions}
            value={
              filterItemOptions.find((option) => option.value === name) || null
            }
            onChange={(selected) => setName(selected?.value || "")}
            placeholder="Search..."
            isClearable
            styles={selectStyles}
          />
        </div>
        <button
          className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl px-4 text-sm font-bold flex items-center justify-center gap-2 border border-slate-200"
          onClick={() => {
            setStartDate("");
            setEndDate("");
            setName("");
          }}
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
                  "Packaging Item",
                  "Supplier",
                  "Quantity",
                  "Unit Cost",
                  "Total",
                  "Actions",
                ].map((head) => (
                  <th
                    key={head}
                    className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.Id} className="hover:bg-indigo-50/30">
                  <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                    {row.date || row.createdAt?.slice(0, 10)}
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-900">
                    {row.name}
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-600">
                    {row.supplier?.name || "N/A"}
                  </td>
                  <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                    {Number(row.unitValue || 0)} {row.unit || "Pcs"}
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-700">
                    {formatMoney(getUnitCost(row))}
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-900">
                    {formatMoney(row.cost)}
                  </td>
                  <td className="px-6 py-5">
                    {canManage && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCurrentRow({
                              ...row,
                              packagingItemId: String(row.packagingItemId),
                              supplierId: row.supplierId
                                ? String(row.supplierId)
                                : "",
                              unitCost: getUnitCost(row),
                            });
                            setIsEditOpen(true);
                          }}
                          className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center"
                          type="button"
                        >
                          <Edit className="text-indigo-600" size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(row.Id)}
                          className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center"
                          type="button"
                        >
                          <Trash2 className="text-red-600" size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoading && (
            <div className="py-20 text-center text-slate-500 font-bold">
              Syncing...
            </div>
          )}
          {!isLoading && rows.length === 0 && (
            <div className="py-20 text-center text-slate-400">
              <ShoppingBasket className="mx-auto mb-4 opacity-30" size={42} />
              <p className="font-bold text-sm italic">
                No packaging item purchase found.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-10 gap-6 px-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Showing Page <span className="text-indigo-600">{currentPage}</span> of{" "}
          <span className="text-slate-900">{totalPages}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={startPage === 1}
            onClick={() => setStartPage((prev) => Math.max(prev - 10, 1))}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm disabled:opacity-50 flex items-center gap-2"
            type="button"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          {[...Array(endPage - startPage + 1)].map((_, index) => {
            const page = startPage + index;
            return (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`h-11 w-11 rounded-2xl font-black text-sm ${page === currentPage ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-100"}`}
                type="button"
              >
                {page}
              </button>
            );
          })}
          <button
            disabled={endPage === totalPages}
            onClick={() =>
              setStartPage((prev) =>
                Math.min(prev + 10, Math.max(1, totalPages - 9)),
              )
            }
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm disabled:opacity-50 flex items-center gap-2"
            type="button"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Packaging Item Purchase"
        maxWidth="max-w-5xl"
      >
        {renderCreateForm()}
      </Modal>
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Packaging Item Purchase"
        maxWidth="max-w-3xl"
      >
        {currentRow && renderForm(currentRow, setCurrentRow, handleUpdate)}
      </Modal>
    </motion.div>
  );
};

export default PackagingItemPurchaseTable;
