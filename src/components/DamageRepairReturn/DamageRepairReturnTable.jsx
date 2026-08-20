import { motion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import {
  useDeleteDamageRepairReturnMutation,
  useGetAllDamageRepairReturnQuery,
  useInsertDamageRepairReturnMutation,
} from "../../features/damageRepairReturn/damageRepairReturn";
import { useGetAllDamageRepairingStockRawWithoutQueryQuery } from "../../features/damageRepairingStock/damageRepairingStock";
import { useGetAllSupplierWithoutQueryQuery } from "../../features/supplier/supplier";
import { useGetAllWirehouseWithoutQueryQuery } from "../../features/wirehouse/wirehouse";
import Modal from "../common/Modal";
import DateRangeFilter from "../common/DateRangeFilter";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";

const initialCreateForm = {
  warehouseId: "",
  supplierId: "",
  receivedId: "",
  productId: "",
  quantity: "",
  note: "",
  date: new Date().toISOString().slice(0, 10),
};

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return `৳${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const DamageRepairReturnTable = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [productName, setProductName] = useState("");

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: repairingStockRes } = useGetAllDamageRepairingStockRawWithoutQueryQuery();
  const repairingStockData = repairingStockRes?.data || [];

  const { data: supplierRes } = useGetAllSupplierWithoutQueryQuery();
  const supplierList = supplierRes?.data || [];

  const { data: warehouseRes } = useGetAllWirehouseWithoutQueryQuery();
  const warehouseList = warehouseRes?.data || [];

  const queryParams = useMemo(
    () => ({
      page: currentPage,
      limit: itemsPerPage,
      startDate,
      endDate,
      searchTerm: productName,
    }),
    [currentPage, itemsPerPage, startDate, endDate, productName],
  );

  const { data: responseData, isLoading } = useGetAllDamageRepairReturnQuery(queryParams);
  const [insertDamageRepairReturn, { isLoading: isCreating }] = useInsertDamageRepairReturnMutation();
  const [deleteDamageRepairReturn] = useDeleteDamageRepairReturnMutation();

  const rows = responseData?.data?.data || [];
  const totalItems = responseData?.data?.meta?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const stockDropdownOptions = useMemo(() => {
    return repairingStockData.map((s) => ({
      value: String(s.Id),
      label: `${s.name} (Stock: ${s.quantity})`,
      stock: s,
    }));
  }, [repairingStockData]);

  const supplierOptions = useMemo(
    () => supplierList.map((s) => ({ value: String(s.Id), label: s.name })),
    [supplierList],
  );

  const warehouseOptions = useMemo(
    () => warehouseList.map((w) => ({ value: String(w.Id), label: w.name })),
    [warehouseList],
  );

  const selectedStock = useMemo(
    () => repairingStockData.find((item) => String(item.Id) === String(createForm.receivedId)),
    [repairingStockData, createForm.receivedId],
  );

  const openAdd = () => {
    setCreateForm(initialCreateForm);
    setIsAddOpen(true);
  };

  const closeAdd = () => {
    setIsAddOpen(false);
    setCreateForm(initialCreateForm);
  };

  const handleStockSelect = (option) => {
    if (!option) {
      setCreateForm((prev) => ({ ...prev, receivedId: "", productId: "" }));
      return;
    }
    const found = repairingStockData.find((s) => String(s.Id) === String(option.value));
    setCreateForm((prev) => ({
      ...prev,
      receivedId: String(found?.Id || ""),
      productId: String(found?.productId || found?.Id || ""),
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.receivedId) {
      toast.error("Please select a damage repairing stock item");
      return;
    }
    const qty = Number(createForm.quantity);
    if (!qty || qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    if (selectedStock && qty > Number(selectedStock.quantity || 0)) {
      toast.error(`Quantity cannot exceed available repairing stock (${selectedStock.quantity})`);
      return;
    }

    try {
      await insertDamageRepairReturn({
        receivedId: createForm.receivedId,
        productId: createForm.productId,
        quantity: qty,
        supplierId: createForm.supplierId || null,
        warehouseId: createForm.warehouseId || null,
        note: createForm.note,
        date: createForm.date,
      }).unwrap();

      toast.success("Damage Repairing Return created successfully");
      closeAdd();
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to create Damage Repairing Return");
    }
  };

  const handleDelete = async (record) => {
    const confirmed = await requestDeleteConfirmation({
      title: "Delete Damage Repairing Return?",
      message: `Are you sure you want to delete ${record.name}? This will restore Damage Repairing Stock.`,
    });

    if (!confirmed) return;

    try {
      await deleteDamageRepairReturn(record.Id).unwrap();
      toast.success("Damage Repairing Return record deleted");
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm"
    >
      <div className="p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Damage Repairing Return History</h2>
            <p className="mt-1 text-sm text-slate-500">
              Return repairing items from Damage Repairing Stock
            </p>
          </div>

          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
          >
            <Plus size={18} />
            Add Damage Repairing Return
          </button>
        </div>

        {/* Filters */}
        <div className="mt-8 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-5 lg:grid-cols-4">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(val) => {
              setStartDate(val);
              setCurrentPage(1);
            }}
            onEndDateChange={(val) => {
              setEndDate(val);
              setCurrentPage(1);
            }}
            compact
            className="lg:col-span-2"
          />
          <input
            type="text"
            placeholder="Search by product name..."
            value={productName}
            onChange={(e) => {
              setProductName(e.target.value);
              setCurrentPage(1);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setProductName("");
              setCurrentPage(1);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-200"
          >
            <X size={16} /> Clear Filters
          </button>
        </div>

        {/* Table */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {["Date", "Product", "Supplier", "Quantity", "Amount", "Note", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length > 0 ? (
                  rows.map((row) => (
                    <tr key={row.Id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-sm text-slate-600">{row.date || "-"}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{row.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{row.supplier?.name || "-"}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{row.quantity}</td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-600">{formatMoney(row.purchase_price)}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{row.note || "-"}</td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                      No Damage Repairing Return records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={closeAdd} title="Add Damage Repairing Return" maxWidth="max-w-xl">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Select Item from Damage Repairing Stock
            </label>
            <Select
              options={stockDropdownOptions}
              value={stockDropdownOptions.find((o) => o.value === String(createForm.receivedId)) || null}
              onChange={handleStockSelect}
              placeholder="Search & select damage repairing stock item..."
              classNamePrefix="react-select"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Supplier
              </label>
              <Select
                options={supplierOptions}
                value={supplierOptions.find((o) => o.value === String(createForm.supplierId)) || null}
                onChange={(opt) => setCreateForm((prev) => ({ ...prev, supplierId: opt?.value || "" }))}
                placeholder="Select supplier"
                isClearable
                classNamePrefix="react-select"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Warehouse
              </label>
              <Select
                options={warehouseOptions}
                value={warehouseOptions.find((o) => o.value === String(createForm.warehouseId)) || null}
                onChange={(opt) => setCreateForm((prev) => ({ ...prev, warehouseId: opt?.value || "" }))}
                placeholder="Select warehouse"
                isClearable
                classNamePrefix="react-select"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                placeholder="Quantity to return"
                value={createForm.quantity}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, quantity: e.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-indigo-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={createForm.date}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, date: e.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Note
            </label>
            <textarea
              rows={2}
              placeholder="Remarks or reason for return..."
              value={createForm.note}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, note: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={closeAdd}
              className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="h-11 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {isCreating ? "Saving..." : "Save Return"}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default DamageRepairReturnTable;
