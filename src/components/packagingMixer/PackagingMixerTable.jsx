import { Edit, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import DateRangeFilter from "../common/DateRangeFilter";
import Modal from "../common/Modal";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import { useGetAllItemWithoutQueryQuery } from "../../features/item/item";
import { useGetAllPackagingManufacturerWithoutQueryQuery } from "../../features/packagingManufacturer/packagingManufacturer";
import { useGetAllPackagingFactoryStockQuery } from "../../features/packagingFactoryStock/packagingFactoryStock";
import {
  useDeletePackagingMixerMutation,
  useGetAllPackagingMixerQuery,
  useInsertPackagingMixerMutation,
  useUpdatePackagingMixerMutation,
} from "../../features/packagingMixer/packagingMixer";

const unitOptions = ["Pcs", "Kg", "Ml", "Gram", "Yard", "Inch", "Feet"].map(
  (unit) => ({ value: unit, label: unit }),
);
const createPackagingLine = () => ({
  packagingFactoryStockId: "",
  unitValue: "",
});
const emptyForm = {
  itemId: "",
  manufacturerId: "",
  packagingItems: [createPackagingLine()],
  unit: "Pcs",
  unitValue: "",
  unitCost: "",
  wage: "",
  itemQuantity: "",
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
const money = (v) =>
  Number(v || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const unitCost = (row) =>
  Number(
    row?.unitCost ||
      (Number(row?.unitValue || 0) ? Number(row?.unitValue || 0) : 0),
  );

const PackagingMixerTable = () => {
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

  const { data: itemRes } = useGetAllItemWithoutQueryQuery();
  const { data: manufacturerRes } =
    useGetAllPackagingManufacturerWithoutQueryQuery();
  const { data: stockRes } = useGetAllPackagingFactoryStockQuery({
    page: 1,
    limit: 1000,
  });
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
  const stockOptions = useMemo(
    () =>
      (stockRes?.data || []).map((x) => ({
        value: String(x.Id),
        label: `${x.name} - ${x.manufacturerName || "N/A"} (Stock: ${Number(x.unitValue || 0)} ${x.unit || "Pcs"})`,
        unit: x.unit || "Pcs",
      })),
    [stockRes?.data],
  );

  const { data, isLoading, refetch } = useGetAllPackagingMixerQuery({
    page,
    limit,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    name: name || undefined,
    manufacturerId: manufacturerId || undefined,
  });
  const rows = data?.data || [];
  const totalPages = Math.max(1, Math.ceil((data?.meta?.count || 0) / limit));
  const [insertMixer] = useInsertPackagingMixerMutation();
  const [updateMixer] = useUpdatePackagingMixerMutation();
  const [deleteMixer] = useDeletePackagingMixerMutation();

  const submitPayload = (value) => ({
    itemId: Number(value.itemId),
    manufacturerId: Number(value.manufacturerId),
    packagingItems: (value.packagingItems || [])
      .filter((x) => x.packagingFactoryStockId && Number(x.unitValue || 0) > 0)
      .map((x) => ({
        packagingFactoryStockId: Number(x.packagingFactoryStockId),
        unitValue: Number(x.unitValue),
      })),
    unit: value.unit || "Pcs",
    unitValue: Number(value.unitValue || 0),
    unitCost: Number(value.unitCost || 0),
    wage: Number(value.wage || 0),
    itemQuantity: Number(value.itemQuantity || 0),
    date: value.date,
    note: value.note || "",
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      itemId: String(row.itemId),
      manufacturerId: String(row.manufacturerId),
      packagingItems: row.packagingItems?.length
        ? row.packagingItems.map((x) => ({
            packagingFactoryStockId: String(x.packagingFactoryStockId),
            unitValue: x.unitValue,
          }))
        : [createPackagingLine()],
      unit: row.unit || "Pcs",
      unitValue: row.unitValue || "",
      unitCost: row.unitCost || "",
      wage: row.wage || "",
      itemQuantity: row.itemQuantity || "",
      date: row.date || new Date().toISOString().slice(0, 10),
      note: row.note || "",
    });
    setIsOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = submitPayload(form);
    if (!payload.itemId) return toast.error("Please select item");
    if (!payload.manufacturerId)
      return toast.error("Please select packaging manufacturer");
    if (!payload.packagingItems.length)
      return toast.error("Please add packaging item");
    if (payload.unitValue <= 0)
      return toast.error("Unit details must be greater than 0");
    try {
      const res = editing
        ? await updateMixer({ id: editing.Id, data: payload }).unwrap()
        : await insertMixer(payload).unwrap();
      if (res?.success) {
        toast.success(
          editing ? "Packaging mixer updated" : "Packaging mixer created",
        );
        setIsOpen(false);
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Save failed!");
    }
  };

  const remove = async (id) => {
    if (
      !(await requestDeleteConfirmation({
        message: "Do you want to delete this packaging mixer?",
      }))
    )
      return;
    try {
      const res = await deleteMixer(id).unwrap();
      if (res?.success !== false) {
        toast.success("Packaging mixer deleted");
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  const updateLine = (index, next) =>
    setForm((prev) => ({
      ...prev,
      packagingItems: prev.packagingItems.map((line, i) =>
        i === index ? { ...line, ...next } : line,
      ),
    }));

  return (
    <div className="bg-white/90 rounded-3xl p-4 sm:p-8 border border-slate-100 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Packaging Mixer
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Consume packaging factory stock, create item stock, and record
            manufacturer wage.
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
          placeholder="Item..."
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
                "Item",
                "Manufacturer",
                "Unit Details",
                // "Unit Cost",
                "Wage Amount",
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
                <td className="px-6 py-5 text-sm">{row.manufacturerName}</td>
                <td className="px-6 py-5 text-sm">
                  {Number(row.unitValue || 0)} {row.unit || "Pcs"}
                </td>
                {/* <td className="px-6 py-5 text-sm">{money(row.unitCost)}</td> */}
                <td className="px-6 py-5 text-sm font-bold">
                  {money(row.wageAmount)}
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
            No packaging mixer found.
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
        title={editing ? "Edit Packaging Mixer" : "Add Packaging Mixer"}
      >
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              options={itemOptions}
              value={
                itemOptions.find((o) => o.value === String(form.itemId)) || null
              }
              onChange={(s) => setForm({ ...form, itemId: s?.value || "" })}
              placeholder="Select Item..."
              styles={selectStyles}
            />
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
              placeholder="Select Packaging Manufacturer..."
              styles={selectStyles}
            />
          </div>
          <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-slate-800">Packaging Item</h3>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    packagingItems: [
                      ...form.packagingItems,
                      createPackagingLine(),
                    ],
                  })
                }
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm"
              >
                Add Packaging Item
              </button>
            </div>
            {form.packagingItems.map((line, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-[1fr_160px_44px] gap-3"
              >
                <Select
                  options={stockOptions}
                  value={
                    stockOptions.find(
                      (o) => o.value === String(line.packagingFactoryStockId),
                    ) || null
                  }
                  onChange={(s) =>
                    updateLine(index, {
                      packagingFactoryStockId: s?.value || "",
                    })
                  }
                  placeholder="Select packaging factory stock..."
                  styles={selectStyles}
                />
                <input
                  type="number"
                  step="any"
                  value={line.unitValue || ""}
                  onChange={(e) =>
                    updateLine(index, { unitValue: e.target.value })
                  }
                  placeholder="Quantity"
                  className="h-11 bg-white border rounded-xl px-3"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      packagingItems: form.packagingItems.filter(
                        (_, i) => i !== index,
                      ),
                    })
                  }
                  className="h-11 border rounded-xl text-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="number"
              step="any"
              value={form.unitValue || ""}
              onChange={(e) => setForm({ ...form, unitValue: e.target.value })}
              placeholder="Unit Details"
              className="h-12 bg-white border rounded-2xl px-4"
            />
            <Select
              options={unitOptions}
              value={
                unitOptions.find((o) => o.value === form.unit) || unitOptions[0]
              }
              onChange={(s) => setForm({ ...form, unit: s?.value || "Pcs" })}
              styles={selectStyles}
            />
            <input
              type="number"
              step="any"
              value={form.unitCost || ""}
              onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
              placeholder="Unit Cost"
              className="h-12 bg-white border rounded-2xl px-4"
            />
            <input
              type="number"
              step="any"
              value={form.wage || ""}
              onChange={(e) => setForm({ ...form, wage: e.target.value })}
              placeholder="Wage"
              className="h-12 bg-white border rounded-2xl px-4"
            />
            {/* <input type="number" step="any" value={form.itemQuantity || ""} onChange={(e) => setForm({ ...form, itemQuantity: e.target.value })} placeholder="Item Quantity" className="h-12 bg-white border rounded-2xl px-4" /> */}
            <input
              type="date"
              value={form.date || ""}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="h-12 text-black border rounded-2xl px-4"
            />
          </div>
          <textarea
            value={form.note || ""}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Note"
            className="min-h-24 bg-white border rounded-2xl px-4 py-3 w-full"
          />
          <div className="text-sm font-bold text-slate-700">
            Wage Amount:{" "}
            {money(Number(form.unitValue || 0) * Number(form.wage || 0))}
          </div>
          <div className="flex justify-end pt-4 border-t">
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

export default PackagingMixerTable;
