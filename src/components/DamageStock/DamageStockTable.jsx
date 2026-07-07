import { motion } from "framer-motion";
import { Edit, Notebook, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import DateRangeFilter from "../common/DateRangeFilter";

import { useGetAllWirehouseWithoutQueryQuery } from "../../features/wirehouse/wirehouse";
import { useGetAllSupplierWithoutQueryQuery } from "../../features/supplier/supplier";
import { useGetAllProductWithoutQueryQuery } from "../../features/product/product";
import {
  useDeleteDamageStockMutation,
  useGetAllDamageStockQuery,
  useInsertDamageStockMutation,
  useUpdateDamageStockMutation,
} from "../../features/damageStock/damageStock";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";

const getVariantDisplayRows = (record) => {
  if (Array.isArray(record?.variants)) {
    return record.variants.filter(
      (item) => item && (item.size || item.color || item.quantity),
    );
  }

  if (typeof record?.variants === "string") {
    try {
      const parsed = JSON.parse(record.variants);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item) => item && (item.size || item.color || item.quantity),
        );
      }
    } catch {
      return [];
    }
  }

  return [];
};

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return `৳${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getUnitPrice = (amount, quantity) => {
  const qty = Number(quantity || 0);
  if (!qty) return 0;
  return Number(amount || 0) / qty;
};

const getStockUnitPrice = (record, field) =>
  getUnitPrice(record?.[field], record?.quantity);

const getVariantUnitPrice = (record, variant, field) => {
  const directValue = Number(variant?.[field] || 0);
  if (directValue) return directValue;
  return getStockUnitPrice(record, field);
};

const DamageStockTable = () => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditOpen1, setIsEditOpen1] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [warehouse, setWarehouse] = useState("");
  const [supplier, setSupplier] = useState("");

  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");
  const [currentItem, setCurrentItem] = useState(null);

  // create form
  const [createForm, setCreateForm] = useState({
    warehouseId: "",
    supplierId: "",
    receivedId: "",
    quantity: "",
    note: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const [rows, setRows] = useState([]);

  // filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [productName, setProductName] = useState("");

  // ✅ pagination
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

  // ✅ all received products (for dropdown)
  const {
    data: receivedRes,
    isLoading: receivedLoading,
    isError: receivedError,
    error: receivedErrObj,
  } = useGetAllProductWithoutQueryQuery();

  const receivedData = receivedRes?.data || [];

  useEffect(() => {
    if (receivedError) console.error("Received fetch error:", receivedErrObj);
  }, [receivedError, receivedErrObj]);

  const receivedDropdownOptions = useMemo(() => {
    return receivedData.map((r) => ({
      value: String(r.Id),
      label: r.name,
    }));
  }, [receivedData]);

  // ✅ react-select light styles
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 14,
      borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0",
      boxShadow: state.isFocused ? "0 0 0 4px rgba(99,102,241,0.15)" : "none",
      "&:hover": { borderColor: "#cbd5e1" },
      backgroundColor: "#fff",
    }),
    valueContainer: (base) => ({ ...base, padding: "0 12px" }),
    placeholder: (base) => ({ ...base, color: "#64748b" }),
    singleValue: (base) => ({ ...base, color: "#0f172a" }),
    menu: (base) => ({ ...base, borderRadius: 14, overflow: "hidden" }),
  };

  // ✅ responsive pagesPerSet
  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640) setPagesPerSet(5);
      else if (window.innerWidth < 1024) setPagesPerSet(7);
      else setPagesPerSet(10);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // reset page when filters / perPage change
  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [startDate, endDate, productName, itemsPerPage]);

  // fix endDate if startDate > endDate
  useEffect(() => {
    if (startDate && endDate && startDate > endDate) setEndDate(startDate);
  }, [startDate, endDate]);

  // ✅ query
  const queryArgs = {
    page: currentPage,
    limit: itemsPerPage,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    name: productName || undefined,
  };

  const { data, isLoading, isError, error, refetch } =
    useGetAllDamageStockQuery(queryArgs);

  useEffect(() => {
    if (isError) console.error("DamageProduct fetch error:", error);
    if (!isLoading && data) {
      setRows(data?.data ?? []);
      setTotalPages(
        Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)),
      );
    }
  }, [data, isLoading, isError, error, itemsPerPage]);

  // product name resolver
  const resolveProductName = (rp) => {
    if (rp?.name) return rp.name;

    const productId = rp?.productId;
    if (!productId) return "N/A";

    // receivedData likely has productId
    const match = receivedData.find(
      (r) => Number(r.productId) === Number(productId),
    );

    return match?.name || "N/A";
  };

  // modal handlers
  // const openAdd = () => setIsAddOpen(true);
  const closeAdd = () => setIsAddOpen(false);

  const openEdit = (rp) => {
    setCurrentItem({
      ...rp,
      receivedId: String(rp.receivedId ?? rp.productId ?? ""),
      quantity: rp.quantity ?? "",
      note: rp.note ?? "",
      status: rp.status ?? "",
      date: rp.date ?? "",
    });
    setIsEditOpen(true);
  };
  const closeEdit = () => {
    setIsEditOpen(false);
    setCurrentItem(null);
  };

  const openEdit1 = (rp) => {
    setCurrentItem({
      ...rp,
      receivedId: String(rp.receivedId ?? rp.productId ?? ""),
      quantity: rp.quantity ?? "",
      note: rp.note ?? "",
      status: rp.status ?? "",
    });
    setIsEditOpen1(true);
  };
  const closeEdit1 = () => {
    setIsEditOpen1(false);
    setCurrentItem(null);
  };

  // mutations
  const [insertDamageStock] = useInsertDamageStockMutation();
  const [updateDamageStock] = useUpdateDamageStockMutation();
  const [deleteDamageStock] = useDeleteDamageStockMutation();

  // create
  const handleCreate = async (e) => {
    e.preventDefault();

    if (!createForm.receivedId) return toast.error("Please select a product");
    if (!createForm.quantity || Number(createForm.quantity) <= 0)
      return toast.error("Please enter valid quantity");

    try {
      const payload = {
        receivedId: Number(createForm.receivedId),
        supplierId: Number(createForm.supplierId),
        warehouseId: Number(createForm.warehouseId),
        quantity: Number(createForm.quantity),
        date: createForm.date,
      };

      const res = await insertDamageStock(payload).unwrap();
      if (res?.success) {
        toast.success("Created!");
        setCreateForm({ receivedId: "", quantity: "" });
        closeAdd();
        refetch?.();
      } else toast.error(res?.message || "Create failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  // update
  const handleUpdate = async () => {
    if (!currentItem?.Id) return toast.error("Invalid item");
    if (!currentItem?.receivedId) return toast.error("Please select a product");
    if (!currentItem.quantity || Number(currentItem.quantity) <= 0)
      return toast.error("Please enter valid quantity");

    try {
      const payload = {
        note: currentItem.note,
        date: currentItem.date,
        status: currentItem.status,
        quantity: Number(currentItem.quantity),
        receivedId: Number(currentItem.receivedId),
        supplierId: Number(currentItem.supplierId),
        warehouseId: Number(currentItem.warehouseId),
        userId: userId,
        actorRole: role,
      };

      const res = await updateDamageStock({
        id: currentItem.Id,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated!");

        closeEdit();
        refetch?.();
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleUpdate1 = async () => {
    if (!currentItem?.Id) return toast.error("Invalid item");

    try {
      const payload = {
        note: currentItem.note,
        status: currentItem.status,
        quantity: Number(currentItem.quantity || 0),
        receivedId: Number(currentItem.receivedId),
        userId: userId,
        actorRole: role,
      };

      const res = await updateDamageStock({
        id: currentItem.Id,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated!");

        closeEdit1();
        refetch?.();
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // delete
  const handleDelete = async (id) => {
    if (!await requestDeleteConfirmation({ message: "Do you want to delete this item?" })) return;

    try {
      const res = await deleteDamageStock(id).unwrap();
      if (res?.success !== false) {
        toast.success("Deleted!");
        refetch?.();
      } else toast.error(res?.message || "Delete failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  // clear filters
  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setProductName("");
  };

  // pagination helpers
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
      Math.min(prev + pagesPerSet, Math.max(totalPages - pagesPerSet + 1, 1)),
    );

  // ✅ suppliers
  const {
    data: allSupplierRes,
    isLoading: isLoadingSupplier,
    isError: isErrorSupplier,
    error: errorSupplier,
  } = useGetAllSupplierWithoutQueryQuery();
  const suppliers = allSupplierRes?.data || [];

  useEffect(() => {
    if (isErrorSupplier)
      console.error("Error fetching suppliers", errorSupplier);
  }, [isErrorSupplier, errorSupplier]);

  // ✅ Dropdown options

  const supplierOptions = useMemo(
    () =>
      (suppliers || []).map((w) => ({
        value: w.Id,
        label: w.name,
      })),
    [suppliers],
  );

  // ✅ warehouses
  const {
    data: allWarehousesRes,
    isLoading: isLoadingWarehouse,
    isError: isErrorWarehouse,
    error: errorWarehouse,
  } = useGetAllWirehouseWithoutQueryQuery();
  const warehouses = allWarehousesRes?.data || [];

  useEffect(() => {
    if (isErrorWarehouse)
      console.error("Error fetching warehouses", errorWarehouse);
  }, [isErrorWarehouse, errorWarehouse]);

  const warehouseOptions = useMemo(
    () =>
      (warehouses || []).map((w) => ({
        value: w.Id,
        label: w.name,
      })),
    [warehouses],
  );

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  const handleNoteClick = (note) => {
    setNoteContent(note);
    setIsNoteModalOpen(true); // Open the modal
  };

  const handleNoteModalClose = () => {
    setIsNoteModalOpen(false); // Close the modal
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="my-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          Add <Plus size={18} className="ml-2" />
        </button> */}
        <div></div>

        <div className="flex items-center justify-between sm:justify-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <RotateCcw size={18} className="text-amber-500" />
            <span className="text-sm">Total Damage Stock</span>
          </div>
          <span className="text-slate-900 font-semibold tabular-nums">
            {isLoading ? "Loading..." : (data?.meta?.totalQuantity ?? 0)}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-5 gap-4 items-end w-full">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          compact
          className="md:col-span-2"
        />

        {/* ✅ Per Page */}
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Per Page</label>
          <Select
            options={[10, 20, 50, 100].map((v) => ({
              value: v,
              label: String(v),
            }))}
            value={{ value: itemsPerPage, label: String(itemsPerPage) }}
            onChange={(selected) => {
              setItemsPerPage(selected?.value || 10);
              setCurrentPage(1);
              setStartPage(1);
            }}
            className="text-black"
            styles={selectStyles}
          />
        </div>

        {/* Product */}
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Product</label>
          <Select
            options={receivedDropdownOptions}
            value={
              receivedDropdownOptions.find((o) => o.label === productName) ||
              null
            }
            onChange={(selected) => setProductName(selected?.label || "")}
            placeholder={receivedLoading ? "Loading..." : "Select Product"}
            isClearable
            isDisabled={receivedLoading}
            styles={selectStyles}
            className="text-black"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Warehouse</label>
          <Select
            options={warehouseOptions}
            value={
              warehouseOptions.find(
                (o) => String(o.value) === String(warehouse),
              ) || null
            }
            onChange={(selected) => setWarehouse(selected?.value || "")}
            placeholder="Select Warehouse"
            isClearable
            className="text-black"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Supplier</label>
          <Select
            options={supplierOptions}
            value={
              supplierOptions.find(
                (o) => String(o.value) === String(supplier),
              ) || null
            }
            onChange={(selected) => setSupplier(selected?.value || "")}
            placeholder="Select Supplier"
            isClearable
            className="text-black"
          />
        </div>

        <button
          type="button"
          className="h-11 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 transition rounded-xl px-4 text-sm font-semibold"
          onClick={clearFilters}
        >
          Clear Filters
        </button>
      </div>

      {/* Table */}
      <div className="four-row-table-scroll mt-6 rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Variants
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Financials
              </th>

              {/* <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Status
              </th> */}
              {/* <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th> */}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map((rp) => {
              const variantDisplayRows = getVariantDisplayRows(rp);

              return (
                <motion.tr
                  key={rp.Id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {rp.createdAt
                      ? new Date(rp.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {resolveProductName(rp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {Number(rp.quantity || 0)}
                  </td>
                  <td className="px-6 py-4 min-w-[420px]">
                    {variantDisplayRows.length > 0 ? (
                      <div className="flex flex-nowrap items-start gap-2 overflow-x-auto pb-1">
                        {variantDisplayRows.map((variant, index) => (
                          <div
                            key={`${rp.Id}-variant-${index}`}
                            className="min-w-[132px] rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-3 py-2 shadow-sm"
                          >
                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-800">
                              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                                {variant.size || "N/A"}
                              </span>
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-indigo-700">
                                {variant.color || "N/A"}
                              </span>
                            </div>
                            <div className="mt-2 text-[11px] font-medium text-slate-500">
                              Qty{" "}
                              <span className="font-bold text-slate-900">
                                {Number(variant.quantity || 0).toFixed(0)}
                              </span>
                            </div>
                            <div className="mt-1 text-[10px] font-medium text-slate-500">
                              Unit Buy{" "}
                              <span className="font-bold text-slate-700">
                                {formatMoney(
                                  getVariantUnitPrice(
                                    rp,
                                    variant,
                                    "purchase_price",
                                  ),
                                )}
                              </span>
                            </div>
                            <div className="mt-1 text-[10px] font-medium text-slate-500">
                              Unit Sell{" "}
                              <span className="font-bold text-slate-700">
                                {formatMoney(
                                  getVariantUnitPrice(
                                    rp,
                                    variant,
                                    "sale_price",
                                  ),
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="inline-flex min-w-[132px] flex-col rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                        <span className="font-bold text-slate-800">
                          {resolveProductName(rp)}
                        </span>
                        <span className="mt-2">
                          Qty{" "}
                          <span className="font-bold text-slate-900">
                            {Number(rp.quantity || 0).toFixed(0)}
                          </span>
                        </span>
                        <span className="mt-1">
                          Unit Buy{" "}
                          <span className="font-bold text-slate-700">
                            {formatMoney(getStockUnitPrice(rp, "purchase_price"))}
                          </span>
                        </span>
                        <span className="mt-1">
                          Unit Sell{" "}
                          <span className="font-bold text-slate-700">
                            {formatMoney(getStockUnitPrice(rp, "sale_price"))}
                          </span>
                        </span>
                        <span className="mt-2 text-[10px] text-slate-400">
                          No variants
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    <div className="space-y-1 text-[11px] uppercase tracking-wide">
                      <div>
                        <span className="text-slate-400">Total Buy: </span>
                        <span className="font-bold text-slate-900">
                          {formatMoney(rp.purchase_price)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Total Sell: </span>
                        <span className="font-bold text-emerald-600">
                          {formatMoney(rp.sale_price)}
                        </span>
                      </div>
                    </div>
                  </td>
                  {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${rp.status === "Approved"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : rp.status === "Active"
                        ? "bg-blue-50 text-blue-700 border-blue-200" // New color for Active
                        : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                  >
                    {rp.status}
                  </span>
                </td> */}
                  {/* Actions
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-3">
                    {rp.note ? (
                      <div className="relative">
                        <button
                          className="relative h-10 w-10 rounded-md flex items-center justify-center"
                          title={rp.note}
                          type="button"
                          onClick={() => handleNoteClick(rp.note)} // Open modal on click
                        >
                          <Notebook size={18} className="text-slate-700" />
                        </button>

                        <span className="absolute top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
                          {rp.note ? 1 : null}
                        </span>
                      </div>
                    ) : (
                      <button
                        className="h-10 w-10 rounded-md flex items-center justify-center"
                        title={rp.note}
                        type="button"
                      >
                        <Notebook size={18} className="text-slate-700" />
                      </button>
                    )}

                    <button
                      onClick={() => openEdit(rp)}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <Edit size={18} />
                    </button>

                    {role === "superAdmin" || role === "admin" ? (
                      <button
                        onClick={() => handleDelete(rp.Id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={() => openEdit1(rp)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                  */}
                  {/* ✅ Note Modal (Popup) */}
                  {isNoteModalOpen && (
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                      <div className="bg-white rounded-lg p-6 shadow-xl w-full md:w-1/3">
                        <h2 className="text-xl font-semibold text-slate-900">
                          Note
                        </h2>
                        <p className="mt-4 text-sm text-slate-700">
                          {noteContent}
                        </p>

                        <div className="mt-6 flex justify-end gap-2">
                          <button
                            onClick={handleNoteModalClose}
                            className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.tr>
              );
            })}

            {!isLoading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-sm text-slate-600"
                >
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center flex-wrap gap-2 mt-6">
        <button
          onClick={handlePreviousSet}
          disabled={startPage === 1}
          className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
        >
          Prev
        </button>

        {[...Array(endPage - startPage + 1)].map((_, index) => {
          const pageNum = startPage + index;
          const active = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`px-4 py-2 rounded-xl border transition ${
                active
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={handleNextSet}
          disabled={endPage === totalPages}
          className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
        >
          Next
        </button>
      </div>

      {/* Edit Modal */}
      {isEditOpen && currentItem && (
        <div className="fixed inset-0 flex items-center justify-center   p-4">
          <motion.div
            className="bg-white rounded-2xl p-6 shadow-xl w-full md:w-1/3 border border-slate-200"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Edit Product
            </h2>

            <div className="mt-4">
              <label className="block text-sm text-slate-600 mb-1">Name</label>
              <Select
                options={receivedDropdownOptions}
                value={
                  receivedDropdownOptions.find(
                    (o) => o.value === String(currentItem.receivedId),
                  ) || null
                }
                onChange={(selected) =>
                  setCurrentItem((p) => ({
                    ...p,
                    receivedId: selected?.value || "",
                  }))
                }
                placeholder={receivedLoading ? "Loading..." : "Select Product"}
                isClearable
                isDisabled={receivedLoading}
                styles={selectStyles}
                className="text-black"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm text-slate-700">Date</label>
              <input
                type="date"
                value={currentItem?.date || ""}
                onChange={(e) =>
                  setCurrentItem((p) => ({ ...p, date: e.target.value }))
                }
                className="border bg-white border-slate-200 rounded-xl p-2 w-full mt-1 text-slate-900 outline-none
                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm text-slate-700">Warehouse</label>
              <select
                value={currentItem?.warehouseId || ""}
                onChange={(e) =>
                  setCurrentItem({
                    ...currentItem,
                    warehouseId: e.target.value,
                  })
                }
                className="h-11 border border-slate-200 rounded-xl px-3 w-full mt-1 text-slate-900 bg-white outline-none
                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                required
              >
                <option value="">Select Warehouse</option>
                {isLoadingWarehouse ? (
                  <option disabled>Loading...</option>
                ) : (
                  warehouses?.map((w) => (
                    <option key={w.Id} value={w.Id}>
                      {w.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="mt-4">
              <label className="block text-sm text-slate-700">Supplier</label>
              <select
                value={currentItem?.supplierId || ""}
                onChange={(e) =>
                  setCurrentItem({
                    ...currentItem,
                    supplierId: e.target.value,
                  })
                }
                className="h-11 border border-slate-200 rounded-xl px-3 w-full mt-1 text-slate-900 bg-white outline-none
                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                required
              >
                <option value="">Select Supplier</option>
                {isLoadingSupplier ? (
                  <option disabled>Loading...</option>
                ) : (
                  suppliers?.map((s) => (
                    <option key={s.Id} value={s.Id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="mt-4">
              <label className="block text-sm text-slate-600 mb-1">
                Quantity
              </label>
              <input
                type="number"
                step="0.01"
                value={currentItem.quantity ?? ""}
                onChange={(e) =>
                  setCurrentItem((p) => ({ ...p, quantity: e.target.value }))
                }
                className="h-11 border bg-white border-slate-200 rounded-xl px-3 w-full text-slate-900 outline-none
                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              />
            </div>

            {role === "superAdmin" || role === "admin" ? (
              <div className="mt-4">
                <label className="block text-sm text-slate-600 mb-1">
                  Status
                </label>
                <select
                  value={currentItem.status || ""}
                  onChange={(e) =>
                    setCurrentItem((p) => ({
                      ...p,
                      status: e.target.value,
                    }))
                  }
                  className="h-11 border bg-white border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white outline-none
                             focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                  required
                >
                  <option value="">Select Status</option>
                  <option value="Active">Active</option>
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            ) : (
              <div className="mt-4">
                <label className="block text-sm text-slate-600 mb-1">
                  Note
                </label>
                <textarea
                  value={currentItem?.note || ""}
                  onChange={(e) =>
                    setCurrentItem((p) => ({ ...p, note: e.target.value }))
                  }
                  className="min-h-[90px] border border-slate-200 rounded-xl p-3 w-full text-slate-900 outline-none
                             focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 h-11 rounded-xl font-semibold"
                onClick={handleUpdate}
              >
                Save
              </button>
              <button
                className="bg-white hover:bg-slate-50 text-slate-800 px-4 h-11 rounded-xl border border-slate-200 font-semibold"
                onClick={closeEdit}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Note Modal */}
      {isEditOpen1 && currentItem && (
        <div className="fixed inset-0 flex items-center justify-center   p-4">
          <motion.div
            className="bg-white rounded-2xl p-6 shadow-xl w-full md:w-1/3 border border-slate-200"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-slate-900">Edit Note</h2>

            <div className="mt-4">
              <label className="block text-sm text-slate-600 mb-1">Note</label>
              <textarea
                value={currentItem?.note || ""}
                onChange={(e) =>
                  setCurrentItem((p) => ({ ...p, note: e.target.value }))
                }
                className="min-h-[110px] border border-slate-200 rounded-xl p-3 w-full text-slate-900 outline-none
                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 h-11 rounded-xl font-semibold"
                onClick={handleUpdate1}
              >
                Save
              </button>
              <button
                className="bg-white hover:bg-slate-50 text-slate-800 px-4 h-11 rounded-xl border border-slate-200 font-semibold"
                onClick={closeEdit1}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed top-6 inset-0 flex items-center justify-center   p-4">
          <motion.div
            className="bg-white rounded-2xl p-6 shadow-xl w-full md:w-1/3 border border-slate-200"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Add Product
            </h2>

            <form onSubmit={handleCreate}>
              <div className="mt-4">
                <label className="block text-sm text-slate-600 mb-1">
                  Name
                </label>
                <Select
                  options={receivedDropdownOptions}
                  value={
                    receivedDropdownOptions.find(
                      (o) => o.value === String(createForm.receivedId),
                    ) || null
                  }
                  onChange={(selected) =>
                    setCreateForm((p) => ({
                      ...p,
                      receivedId: selected?.value || "",
                    }))
                  }
                  placeholder={
                    receivedLoading ? "Loading..." : "Select Product"
                  }
                  isClearable
                  isDisabled={receivedLoading}
                  styles={selectStyles}
                  className="text-black"
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm text-slate-700">Date</label>
                <input
                  type="date"
                  value={createForm?.date || ""}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, date: e.target.value }))
                  }
                  className="border bg-white border-slate-200 rounded-xl p-2 w-full mt-1 text-slate-900 outline-none
                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm text-slate-700">
                  Warehouse
                </label>
                <select
                  value={createForm?.warehouseId || ""}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      warehouseId: e.target.value,
                    })
                  }
                  className="h-11 border border-slate-200 rounded-xl px-3 w-full mt-1 text-slate-900 bg-white outline-none
                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                  required
                >
                  <option value="">Select Warehouse</option>
                  {isLoadingWarehouse ? (
                    <option disabled>Loading...</option>
                  ) : (
                    warehouses?.map((w) => (
                      <option key={w.Id} value={w.Id}>
                        {w.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="mt-4">
                <label className="block text-sm text-slate-700">Supplier</label>
                <select
                  value={createForm?.supplierId || ""}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      supplierId: e.target.value,
                    })
                  }
                  className="h-11 border border-slate-200 rounded-xl px-3 w-full mt-1 text-slate-900 bg-white outline-none
                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                  required
                >
                  <option value="">Select Supplier</option>
                  {isLoadingSupplier ? (
                    <option disabled>Loading...</option>
                  ) : (
                    suppliers?.map((s) => (
                      <option key={s.Id} value={s.Id}>
                        {s.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="mt-4">
                <label className="block text-sm text-slate-600 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={createForm.quantity}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, quantity: e.target.value }))
                  }
                  className="h-11 border bg-white border-slate-200 rounded-xl px-3 w-full text-slate-900 outline-none
                             focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                  required
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm text-slate-700">Note</label>
                <textarea
                  value={createForm?.note || ""}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      note: e.target.value,
                    })
                  }
                  className="min-h-[90px] border border-slate-200 rounded-xl p-3 w-full mt-1 text-slate-900 bg-white outline-none
                             focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                />
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 h-11 rounded-xl font-semibold"
                >
                  Save
                </button>
                <button
                  type="button"
                  className="bg-white hover:bg-slate-50 text-slate-800 px-4 h-11 rounded-xl border border-slate-200 font-semibold"
                  onClick={closeAdd}
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default DamageStockTable;
