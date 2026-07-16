import { Edit, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import DateRangeFilter from "../common/DateRangeFilter";
import Modal from "../common/Modal";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import { useGetAllPackagingItemWithoutQueryQuery } from "../../features/packagingItem/packagingItem";
import { useGetAllPackagingManufacturerWithoutQueryQuery } from "../../features/packagingManufacturer/packagingManufacturer";
import {
  useDeletePackagingFactoryMutation,
  useGetAllPackagingFactoryQuery,
  useInsertPackagingFactoryMutation,
  useUpdatePackagingFactoryMutation,
} from "../../features/packagingFactory/packagingFactory";

const unitOptions = ["Pcs", "Kg", "Ml", "Gram", "Yard", "Inch", "Feet"].map(
  (unit) => ({ value: unit, label: unit }),
);
const emptyFactoryItem = {
  packagingItemId: "",
  unit: "Pcs",
  unitValue: "",
};
const emptyForm = {
  packagingItemId: "",
  manufacturerId: "",
  unit: "Pcs",
  unitValue: "",
  unitCost: "",
  items: [emptyFactoryItem],
  date: new Date().toISOString().slice(0, 10),
  note: "",
};
const selectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 44,
    borderRadius: 12,
    borderColor: "#e2e8f0",
  }),
  menu: (base) => ({ ...base, zIndex: 50 }),
};
const compactSelectStyles = {
  ...selectStyles,
  control: (base) => ({
    ...selectStyles.control(base),
    minHeight: 48,
    borderRadius: 16,
  }),
};
const getUnitCost = (row) =>
  Number(row?.unitValue || 0) > 0
    ? Number(row?.cost || 0) / Number(row.unitValue)
    : 0;
const money = (v) =>
  Number(v || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const PackagingFactoryTable = () => {
  const role = localStorage.getItem("role");
  const canManage = role === "superAdmin" || role === "admin";
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [name, setName] = useState("");
  const [manufacturerId, setManufacturerId] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => setPage(1), [startDate, endDate, name, manufacturerId]);

  const { data: itemRes } = useGetAllPackagingItemWithoutQueryQuery();
  const { data: manufacturerRes } =
    useGetAllPackagingManufacturerWithoutQueryQuery();
  const itemOptions = useMemo(
    () =>
      (itemRes?.data || []).map((x) => ({
        value: String(x.Id),
        label: x.name,
      })),
    [itemRes?.data],
  );
  const itemNameOptions = useMemo(
    () => (itemRes?.data || []).map((x) => ({ value: x.name, label: x.name })),
    [itemRes?.data],
  );
  const manufacturerOptions = useMemo(
    () =>
      (manufacturerRes?.data || []).map((x) => ({
        value: String(x.Id),
        label: x.name,
      })),
    [manufacturerRes?.data],
  );

  const queryArgs = useMemo(
    () => ({
      page,
      limit,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      name: name || undefined,
      manufacturerId: manufacturerId || undefined,
    }),
    [endDate, manufacturerId, name, page, startDate],
  );
  const { data, isLoading, refetch } =
    useGetAllPackagingFactoryQuery(queryArgs);
  const rows = data?.data || [];
  const totalPages = Math.max(1, Math.ceil((data?.meta?.count || 0) / limit));
  const [insertFactory] = useInsertPackagingFactoryMutation();
  const [updateFactory] = useUpdatePackagingFactoryMutation();
  const [deleteFactory] = useDeletePackagingFactoryMutation();

  const payload = (value) => ({
    packagingItemId: Number(value.packagingItemId),
    manufacturerId: Number(value.manufacturerId),
    unit: value.unit || "Pcs",
    unitValue: Number(value.unitValue || 0),
    cost: Number(value.unitCost || 0) * Number(value.unitValue || 0),
    date: value.date,
    note: value.note || "",
  });

  const createPayload = (item) => ({
    packagingItemId: Number(item.packagingItemId),
    manufacturerId: Number(form.manufacturerId),
    unit: item.unit || "Pcs",
    unitValue: Number(item.unitValue || 0),
    cost: 0,
    date: form.date,
    note: form.note || "",
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
      items: [...prev.items, { ...emptyFactoryItem }],
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

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, items: [{ ...emptyFactoryItem }] });
    setIsOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      ...row,
      packagingItemId: String(row.packagingItemId),
      manufacturerId: String(row.manufacturerId),
      unitCost: getUnitCost(row),
      items: [
        {
          packagingItemId: String(row.packagingItemId),
          unit: row.unit || "Pcs",
          unitValue: row.unitValue || "",
        },
      ],
      date: row.date || new Date().toISOString().slice(0, 10),
      note: row.note || "",
    });
    setIsOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.manufacturerId)
      return toast.error("Please select a packaging manufacturer");

    if (editing) {
      if (!form.packagingItemId)
        return toast.error("Please select a packaging item");
      if (Number(form.unitValue || 0) <= 0)
        return toast.error("Quantity must be greater than 0");
    } else {
      if (!form.items?.length) return toast.error("Please add packaging item");
      if (form.items.some((item) => !item.packagingItemId))
        return toast.error("Please select every packaging item");
      if (form.items.some((item) => Number(item.unitValue || 0) <= 0))
        return toast.error("Quantity must be greater than 0");
    }

    try {
      if (editing) {
        const res = await updateFactory({
          id: editing.Id,
          data: payload(form),
        }).unwrap();
        if (!res?.success) return;
      } else {
        await Promise.all(
          form.items.map((item) => insertFactory(createPayload(item)).unwrap()),
        );
      }

      toast.success(
        editing ? "Packaging factory updated" : "Packaging factory created",
      );
      setIsOpen(false);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Save failed!");
    }
  };

  const remove = async (id) => {
    if (
      !(await requestDeleteConfirmation({
        message: "Do you want to delete this factory record?",
      }))
    )
      return;
    try {
      const res = await deleteFactory(id).unwrap();
      if (res?.success !== false) {
        toast.success("Packaging factory deleted");
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  const renderFactoryItemSection = () => {
    if (editing) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_2fr] gap-4 border border-slate-100 rounded-2xl p-4 bg-slate-50/40">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
              Item
            </label>
            <Select
              options={itemOptions}
              value={
                itemOptions.find(
                  (o) => o.value === String(form.packagingItemId),
                ) || null
              }
              onChange={(s) =>
                setForm({ ...form, packagingItemId: s?.value || "" })
              }
              placeholder="Search item..."
              styles={selectStyles}
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
              Unit Details
            </label>
            <div className="grid grid-cols-[minmax(170px,1fr)_150px] gap-2">
              <input
                type="number"
                step="any"
                value={form.unitValue || ""}
                onChange={(e) =>
                  setForm({ ...form, unitValue: e.target.value })
                }
                placeholder="20"
                className="h-12 bg-white border border-slate-200 rounded-2xl px-4 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
              />
              <Select
                options={unitOptions}
                value={
                  unitOptions.find((o) => o.value === form.unit) ||
                  unitOptions[0]
                }
                onChange={(s) => setForm({ ...form, unit: s?.value || "Pcs" })}
                styles={compactSelectStyles}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={addCreateItem}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 text-sm font-black hover:bg-indigo-100"
        >
          <Plus size={16} /> Add Packaging Item
        </button>

        <div className="space-y-3">
          {(form.items || []).map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 lg:grid-cols-[1.4fr_2fr_auto] gap-4 items-end border border-slate-100 rounded-2xl p-4 bg-slate-50/40"
            >
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  Item
                </label>
                <Select
                  options={itemOptions}
                  value={
                    itemOptions.find(
                      (o) => o.value === String(item.packagingItemId),
                    ) || null
                  }
                  onChange={(s) =>
                    updateCreateItem(index, {
                      packagingItemId: s?.value || "",
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
                <div className="grid grid-cols-[minmax(170px,1fr)_150px] gap-2">
                  <input
                    type="number"
                    step="any"
                    value={item.unitValue || ""}
                    onChange={(e) =>
                      updateCreateItem(index, { unitValue: e.target.value })
                    }
                    placeholder="20"
                    className="h-12 bg-white border border-slate-200 rounded-2xl px-4 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                  />
                  <Select
                    options={unitOptions}
                    value={
                      unitOptions.find((o) => o.value === item.unit) ||
                      unitOptions[0]
                    }
                    onChange={(s) =>
                      updateCreateItem(index, { unit: s?.value || "Pcs" })
                    }
                    styles={compactSelectStyles}
                  />
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
      </div>
    );
  };

  return (
    <div className="bg-white/90 rounded-3xl p-4 sm:p-8 border border-slate-100 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Packaging Factory
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Move packaging item stock to manufacturer factory stock.
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm"
            type="button"
          >
            Add <Plus size={18} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 items-end">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          compact
          className="sm:col-span-2"
        />
        <Select
          options={itemNameOptions}
          value={itemNameOptions.find((o) => o.value === name) || null}
          onChange={(s) => setName(s?.value || "")}
          placeholder="Packaging item..."
          isClearable
          styles={selectStyles}
        />
        <Select
          options={manufacturerOptions}
          value={
            manufacturerOptions.find((o) => o.value === manufacturerId) || null
          }
          onChange={(s) => setManufacturerId(s?.value || "")}
          placeholder="Manufacturer..."
          isClearable
          styles={selectStyles}
        />
        <button
          onClick={() => {
            setStartDate("");
            setEndDate("");
            setName("");
            setManufacturerId("");
          }}
          className="h-11 bg-slate-100 text-slate-600 rounded-xl px-4 font-bold flex items-center justify-center gap-2 border"
          type="button"
        >
          <X size={16} /> Clear
        </button>
      </div>
      <div className="overflow-hidden rounded-3xl border border-slate-100">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/50">
            <tr>
              {[
                "Date",
                "Packaging Item",
                "Manufacturer",
                "Quantity",
                "Unit Cost",
                "Total",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.Id}>
                <td className="px-6 py-5 text-sm">
                  {row.date || row.createdAt?.slice(0, 10)}
                </td>
                <td className="px-6 py-5 text-sm font-bold">{row.name}</td>
                <td className="px-6 py-5 text-sm">
                  {row.manufacturerName || "N/A"}
                </td>
                <td className="px-6 py-5 text-sm">
                  {Number(row.unitValue || 0)} {row.unit || "Pcs"}
                </td>
                <td className="px-6 py-5 text-sm">{money(getUnitCost(row))}</td>
                <td className="px-6 py-5 text-sm font-bold">
                  {money(row.cost)}
                </td>
                <td className="px-6 py-5">
                  {canManage && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(row)}
                        className="h-9 w-9 border rounded-xl flex items-center justify-center"
                        type="button"
                      >
                        <Edit className="text-indigo-600" size={16} />
                      </button>
                      <button
                        onClick={() => remove(row.Id)}
                        className="h-9 w-9 border rounded-xl flex items-center justify-center"
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
          <div className="py-16 text-center text-slate-500 font-bold">
            Syncing...
          </div>
        )}
        {!isLoading && rows.length === 0 && (
          <div className="py-16 text-center text-slate-400 font-bold">
            No packaging factory record found.
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-8">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="h-10 px-5 border rounded-xl disabled:opacity-50"
          type="button"
        >
          Prev
        </button>
        <span className="h-10 px-5 rounded-xl bg-indigo-600 text-white font-bold flex items-center">
          {page} / {totalPages}
        </span>
        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="h-10 px-5 border rounded-xl disabled:opacity-50"
          type="button"
        >
          Next
        </button>
      </div>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editing ? "Edit Packaging Factory" : "Add Packaging Factory"}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={submit} className="space-y-5">
          {renderFactoryItemSection()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Packaging Manufacturer
              </label>
              <Select
                options={manufacturerOptions}
                value={
                  manufacturerOptions.find(
                    (o) => o.value === String(form.manufacturerId),
                  ) || null
                }
                onChange={(s) =>
                  setForm({ ...form, manufacturerId: s?.value || "" })
                }
                placeholder="Packaging manufacturer..."
                styles={selectStyles}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Date
              </label>
              <input
                type="date"
                value={form.date || ""}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="h-12 w-full text-black bg-white border border-slate-200 rounded-2xl px-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
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
              placeholder="Note"
              className="min-h-24 w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end pt-6 border-t border-slate-100">
            <button
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold"
              type="submit"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PackagingFactoryTable;
