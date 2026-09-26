import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  PackagePlus,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";

import Modal from "../common/Modal";
import DateRangeFilter from "../common/DateRangeFilter";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import {
  useDeleteComboProductionMutation,
  useGetAllComboProductionQuery,
  useGetComboProductionCombosQuery,
  useInsertComboProductionMutation,
} from "../../features/comboProduction/comboProduction";
import { useGetAllWirehouseWithoutQueryQuery } from "../../features/wirehouse/wirehouse";

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  productId: "",
  warehouseId: "",
  quantity: "",
  date: today(),
  note: "",
};

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 14,
    borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 4px rgba(99,102,241,0.15)" : "none",
    "&:hover": { borderColor: "#cbd5e1" },
  }),
  valueContainer: (base) => ({ ...base, padding: "0 12px" }),
  placeholder: (base) => ({ ...base, color: "#64748b" }),
  menu: (base) => ({ ...base, borderRadius: 14, overflow: "hidden" }),
  menuPortal: (base) => ({ ...base, zIndex: 10000 }),
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 4 });

const headerCell =
  "px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]";
const inputClass =
  "w-full h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition text-sm";

const RecipePreview = ({ combo, quantity }) => {
  if (!combo) return null;
  const qty = Number(quantity) || 0;
  const rows = [
    ...combo.mixItems.map((item) => ({
      ...item,
      source: combo.manufacturerId ? "Factory Stock" : "Item Stock",
    })),
    ...combo.packagingItems.map((item) => ({ ...item, source: "Item Stock (Packaging)" })),
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
        Stock that will be used
        {combo.manufacturerName ? ` · ${combo.manufacturerName}` : ""}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] text-slate-500 uppercase">
            <th className="pb-2 font-bold">Item</th>
            <th className="pb-2 font-bold">Per combo</th>
            <th className="pb-2 font-bold text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((item) => (
            <tr key={`${item.source}-${item.manufactureId || item.itemMasterId}`}>
              <td className="py-2 text-slate-800">
                {item.name}
                <div className="text-[11px] text-slate-400">{item.source}</div>
              </td>
              <td className="py-2 text-slate-600">
                {formatNumber(item.perCombo)} {item.unit}
              </td>
              <td className="py-2 text-right font-semibold text-slate-900 tabular-nums">
                {qty > 0 ? `${formatNumber(item.perCombo * qty)} ${item.unit}` : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ComboProductionTable = () => {
  const role = localStorage.getItem("role");
  const canDelete = role === "superAdmin" || role === "admin";

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [comboFilter, setComboFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useGetAllComboProductionQuery({
    page: currentPage,
    limit: itemsPerPage,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    name: comboFilter || undefined,
  });
  const { data: combosRes, isLoading: isLoadingCombos } =
    useGetComboProductionCombosQuery();
  const { data: warehousesRes, isLoading: isLoadingWarehouses } =
    useGetAllWirehouseWithoutQueryQuery();
  const [insertComboProduction, { isLoading: isSaving }] =
    useInsertComboProductionMutation();
  const [deleteComboProduction] = useDeleteComboProductionMutation();

  const combos = useMemo(() => combosRes?.data || [], [combosRes?.data]);
  const comboOptions = useMemo(
    () => combos.map((combo) => ({ value: String(combo.productId), label: combo.name })),
    [combos],
  );
  const warehouseOptions = useMemo(
    () =>
      (warehousesRes?.data || []).map((warehouse) => ({
        value: String(warehouse.Id ?? warehouse.id),
        label: warehouse.name,
      })),
    [warehousesRes?.data],
  );
  const warehouseNames = useMemo(
    () => new Map(warehouseOptions.map((option) => [option.value, option.label])),
    [warehouseOptions],
  );
  const selectedCombo = combos.find(
    (combo) => String(combo.productId) === String(form.productId),
  );

  const rows = data?.data || [];
  const totalCount = data?.meta?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  const openModal = () => {
    setForm({ ...EMPTY_FORM, date: today() });
    setIsModalOpen(true);
  };

  const handleComboChange = (option) => {
    const combo = combos.find((item) => String(item.productId) === option?.value);
    setForm((prev) => ({
      ...prev,
      productId: option?.value || "",
      // Default to the warehouse the combo was last mixed into.
      warehouseId: combo?.warehouseId ? String(combo.warehouseId) : prev.warehouseId,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.productId) return toast.error("Please select a combo");
    if (!form.warehouseId) return toast.error("Please select a warehouse");
    if (!(Number(form.quantity) > 0)) return toast.error("Quantity must be greater than 0");

    try {
      await insertComboProduction({
        productId: Number(form.productId),
        warehouseId: Number(form.warehouseId),
        quantity: Number(form.quantity),
        date: form.date || today(),
        note: form.note,
      }).unwrap();
      toast.success("Combo added to Stock Product");
      setIsModalOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || "Combo production failed");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await requestDeleteConfirmation({
      message:
        "Delete this entry? The used items go back to Item/Factory Stock and the combos are removed from Stock Product.",
    });
    if (!confirmed) return;

    try {
      await deleteComboProduction(id).unwrap();
      toast.success("Entry deleted");
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed");
    }
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setComboFilter("");
    setCurrentPage(1);
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgba(15,23,42,0.04)] rounded-2xl p-4 sm:p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Combo Production
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Make more of a Mixer combo — items are taken from Item/Factory Stock
            using its Mixer recipe
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="inline-flex items-center gap-3 bg-indigo-50 border border-indigo-100 px-5 py-2.5 rounded-2xl shadow-sm shadow-indigo-50">
            <div className="h-8 w-8 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
              <PackagePlus size={18} />
            </div>
            <div>
              <div className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                Total Entries
              </div>
              <div className="text-base font-black text-indigo-900 tabular-nums leading-none">
                {isLoading ? "..." : totalCount.toLocaleString()}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 active:scale-95 w-full sm:w-auto"
          >
            <Plus size={18} /> Add New
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-10 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 items-end">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={(value) => {
            setStartDate(value);
            setCurrentPage(1);
          }}
          onEndDateChange={(value) => {
            setEndDate(value);
            setCurrentPage(1);
          }}
          compact
          className="md:col-span-2"
        />

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Per Page
          </label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold text-sm cursor-pointer"
          >
            {[10, 20, 50, 100].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Combo
          </label>
          <Select
            options={comboOptions}
            value={comboOptions.find((o) => o.label === comboFilter) || null}
            onChange={(selected) => {
              setComboFilter(selected?.label || "");
              setCurrentPage(1);
            }}
            placeholder="Search..."
            isClearable
            isDisabled={isLoadingCombos}
            styles={selectStyles}
            className="text-black"
          />
        </div>

        <button
          type="button"
          className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 transition rounded-xl px-4 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 border border-slate-200"
          onClick={clearFilters}
        >
          <X size={16} /> Clear Filters
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className={headerCell}>Date</th>
                <th className={headerCell}>Combo</th>
                <th className={headerCell}>Warehouse</th>
                <th className={headerCell}>Quantity</th>
                <th className={headerCell}>Purchase Price</th>
                <th className={headerCell}>Sale Price</th>
                <th className={headerCell}>Note</th>
                {canDelete && (
                  <th className={`${headerCell} text-center`}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row) => (
                <tr key={row.Id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {row.date || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    {row.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {warehouseNames.get(String(row.warehouseId)) || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 tabular-nums">
                    {formatNumber(row.combo)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 tabular-nums">
                    {formatNumber(row.purchase_price)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 tabular-nums">
                    {formatNumber(row.sale_price)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {row.note || "-"}
                  </td>
                  {canDelete && (
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(row.Id)}
                        className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition"
                        aria-label="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={canDelete ? 8 : 7}
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    No combo production entries yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-2 rounded-xl border border-slate-200 disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold text-slate-600">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-2 rounded-xl border border-slate-200 disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Combo Production"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Combo Name
            </label>
            <Select
              options={comboOptions}
              value={comboOptions.find((o) => o.value === form.productId) || null}
              onChange={handleComboChange}
              placeholder={isLoadingCombos ? "Loading..." : "Select combo"}
              isDisabled={isLoadingCombos}
              styles={selectStyles}
              menuPortalTarget={document.body}
              className="text-black"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Warehouse
              </label>
              <Select
                options={warehouseOptions}
                value={
                  warehouseOptions.find((o) => o.value === form.warehouseId) || null
                }
                onChange={(option) =>
                  setForm((prev) => ({ ...prev, warehouseId: option?.value || "" }))
                }
                placeholder="Select warehouse"
                isDisabled={isLoadingWarehouses}
                styles={selectStyles}
                menuPortalTarget={document.body}
                className="text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.quantity}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, quantity: e.target.value }))
                }
                className={inputClass}
                placeholder="How many combos"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Note (optional)
              </label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <RecipePreview combo={selectedCombo} quantity={form.quantity} />

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Add to Stock"}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default ComboProductionTable;
