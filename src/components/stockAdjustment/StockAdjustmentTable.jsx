import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Notebook,
  Plus,
  ShoppingBasket,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";

import Modal from "../common/Modal";
import { useLayout } from "../../context/LayoutContext";
import { translations } from "../../utils/translations";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import { useGetAllItemMasterWithoutQueryQuery } from "../../features/manufactureStock/manufactureStock";
import {
  useDeleteStockAdjustmentMutation,
  useGetAllStockAdjustmentQuery,
  useInsertStockAdjustmentMutation,
  useUpdateStockAdjustmentMutation,
} from "../../features/stockAdjustment/stockAdjustment";

const initialCreateProduct = {
  itemId: "",
  productId: "",
  unitValue: "",
  note: "",
  date: new Date().toISOString().slice(0, 10),
  hasUnit: false,
  unit: "Pcs",
};

const StockAdjustmentTable = () => {
  const { language } = useLayout();
  const t = translations[language] || translations.EN;

  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen1, setIsModalOpen1] = useState(false);
  const [isModalOpen2, setIsModalOpen2] = useState(false);
  const [isModalOpen3, setIsModalOpen3] = useState(false);

  const [currentProduct, setCurrentProduct] = useState(null);
  const [createProduct, setCreateProduct] = useState(initialCreateProduct);

  const [rows, setRows] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [itemName, setItemName] = useState("");

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");

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
  }, [startDate, endDate, itemName, itemsPerPage]);

  useEffect(() => {
    if (startDate && endDate && startDate > endDate) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);

    if (pageNumber < startPage) {
      setStartPage(pageNumber);
    } else if (pageNumber > endPage) {
      setStartPage(pageNumber - pagesPerSet + 1);
    }
  };

  const handlePreviousSet = () => {
    setStartPage((prev) => Math.max(prev - pagesPerSet, 1));
  };

  const handleNextSet = () => {
    setStartPage((prev) =>
      Math.min(prev + pagesPerSet, totalPages - pagesPerSet + 1),
    );
  };

  const {
    data: allItemsRes,
    isLoading: isLoadingAllItems,
    isError: isErrorAllItems,
    error: errorAllItems,
  } = useGetAllItemMasterWithoutQueryQuery();

  const itemsData = allItemsRes?.data || [];

  useEffect(() => {
    if (isErrorAllItems) {
      console.error("Error fetching items", errorAllItems);
    }
  }, [isErrorAllItems, errorAllItems]);

  const itemDropdownOptions = useMemo(() => {
    return (itemsData || []).map((p) => ({
      value: String(p.Id ?? p.id ?? p._id),
      label: [
        p.name,
        `${Number(p.unitValue || 0)} ${p.unit || "Pcs"}`,
      ].filter(Boolean).join(" - "),
      row: p,
    }));
  }, [itemsData]);

  const itemNameMap = useMemo(() => {
    const m = new Map();
    (itemsData || []).forEach((p) => {
      const key = String(p.Id ?? p.id ?? p._id);
      m.set(key, p.name);
    });
    return m;
  }, [itemsData]);

  // const resolveItemName = (rp) => {
  //   const pid =
  //     rp.itemId ??
  //     rp.item_id ??
  //     rp.ItemId ??
  //     rp.item?.Id ??
  //     rp.item?.id ??
  //     rp.item?._id;

  //   if (rp.itemName) return rp.itemName;
  //   if (rp.item?.name) return rp.item?.name;
  //   if (pid === null || pid === undefined || pid === "") return "N/A";

  //   return itemNameMap.get(String(pid)) || "N/A";
  // };

  const resolveItemName = (rp) => {
    const possibleName =
      rp?.itemName ||
      rp?.name ||
      rp?.item?.name ||
      rp?.Item?.name ||
      rp?.product?.name ||
      rp?.Product?.name ||
      "";

    if (possibleName) return possibleName;

    const possibleId =
      rp?.itemId ??
      rp?.item_id ??
      rp?.ItemId ??
      rp?.productId ??
      rp?.product_id ??
      rp?.ProductId ??
      rp?.manufactureItemId ??
      rp?.item?.Id ??
      rp?.item?.id ??
      rp?.item?._id ??
      rp?.Item?.Id ??
      rp?.Item?.id ??
      rp?.product?.Id ??
      rp?.product?.id ??
      rp?.product?._id ??
      "";

    if (possibleId === "" || possibleId === null || possibleId === undefined) {
      return "N/A";
    }

    const matchedName = itemNameMap.get(String(possibleId));
    return matchedName || `Item #${possibleId}`;
    // ||
    // productNameMap.get(String(possibleId)) ||
    // `Item #${possibleId}`
  };

  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      name: itemName || undefined,
    };

    Object.keys(args).forEach((k) => {
      if (args[k] === undefined || args[k] === null || args[k] === "") {
        delete args[k];
      }
    });

    return args;
  }, [currentPage, itemsPerPage, startDate, endDate, itemName]);

  const { data, isLoading, isError, error, refetch } =
    useGetAllStockAdjustmentQuery(queryArgs);

  useEffect(() => {
    if (isError) {
      console.error("Error fetching received product data", error);
      return;
    }

    if (!isLoading && data) {
      setRows(data.data || []);
      setTotalPages(
        Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)),
      );
    }
  }, [data, isLoading, isError, error, itemsPerPage]);


  const [insertStockAdjustment] = useInsertStockAdjustmentMutation();
  const [updateStockAdjustment] = useUpdateStockAdjustmentMutation();
  const [deleteStockAdjustment] = useDeleteStockAdjustmentMutation();

  const handleAddProduct = () => setIsModalOpen1(true);
  const handleAddProduct3 = () => setIsModalOpen3(true);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setCurrentProduct(null);
  };

  const handleModalClose1 = () => {
    setIsModalOpen1(false);
    setCreateProduct(initialCreateProduct);
  };

  const handleModalClose2 = () => {
    setIsModalOpen2(false);
    setCurrentProduct(null);
  };
  const handleModalClose3 = () => {
    setIsModalOpen3(false);
    setCurrentProduct(null);
  };

  const handleEditClick = (rp) => {
    setCurrentProduct({
      ...rp,
      itemId: rp.itemId ? String(rp.itemId) : "",
      productId: rp.productId ? String(rp.productId) : "",
      date: rp.date ?? "",
      note: rp.note ?? "",
      unitValue: rp.unitValue ?? "",
      unit: rp.unit ?? "Pcs",
      hasUnit: !!rp.unitValue,

      userId,
    });

    setIsModalOpen(true);
  };

  const handleEditClick1 = (rp) => {
    setCurrentProduct({
      ...rp,
      itemId: rp.itemId ? String(rp.itemId) : "",
      productId: rp.productId ? String(rp.productId) : "",
      date: rp.date ?? "",
      note: rp.note ?? "",
      unitValue: rp.unitValue ?? "",
      unit: rp.unit ?? "Pcs",
      hasUnit: !!rp.unitValue,

      userId,
    });

    setIsModalOpen2(true);
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();

    if (!createProduct.itemId) {
      return toast.error("Please select an item");
    }

    try {
      const payload = {
        itemId: Number(createProduct.itemId) || "",
        productId: Number(createProduct.productId) || "",
        unit: createProduct.unit || "Pcs",
        unitValue: createProduct.hasUnit
          ? Number(createProduct.unitValue) || 0
          : 0,
        stock: "In",
        date: createProduct.date || "",
        note: createProduct.note || "",
        userId: Number(userId) || 0,

        actorRole: role,
      };

      const res = await insertStockAdjustment(payload).unwrap();

      if (res?.success) {
        toast.success("Successfully created!");
        setIsModalOpen1(false);
        setCreateProduct(initialCreateProduct);
        refetch?.();
      } else {
        toast.error(res?.message || "Create failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  const handleCreateProduct1 = async (e) => {
    e.preventDefault();

    if (!createProduct.itemId) {
      return toast.error("Please select an item");
    }

    try {
      const payload = {
        itemId: Number(createProduct.itemId) || "",
        productId: Number(createProduct.productId) || "",
        unit: createProduct.unit || "Pcs",
        stock: "Out",
        unitValue: createProduct.hasUnit
          ? Number(createProduct.unitValue) || 0
          : 0,
        date: createProduct.date || "",
        note: createProduct.note || "",
        userId: Number(userId) || 0,

        actorRole: role,
      };

      const res = await insertStockAdjustment(payload).unwrap();

      if (res?.success) {
        toast.success("Successfully created!");
        setIsModalOpen3(false);
        setCreateProduct(initialCreateProduct);
        refetch?.();
      } else {
        toast.error(res?.message || "Create failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  const handleUpdateProduct = async () => {
    try {
      const payload = {
        itemId: Number(currentProduct.itemId) || "",
        productId: Number(currentProduct.productId) || "",
        unit: currentProduct.unit || "Pcs",
        unitValue: currentProduct.hasUnit
          ? Number(currentProduct.unitValue) || 0
          : 0,
        date: currentProduct.date || "",
        note: currentProduct.note || "",
        userId: Number(currentProduct.userId) || 0,

        actorRole: role,
      };

      const res = await updateStockAdjustment({
        id: currentProduct.Id,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated!");
        setIsModalOpen(false);
        setCurrentProduct(null);
        refetch?.();
      } else {
        toast.error(res?.message || "Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleUpdateProduct1 = async () => {
    if (!currentProduct?.Id) return toast.error("Invalid item!");
    if (!currentProduct?.note?.trim()) {
      return toast.error("Note is required!");
    }

    try {
      const payload = {
        itemId: Number(currentProduct.itemId) || "",
        productId: Number(currentProduct.productId) || "",
        unit: currentProduct.unit || "Pcs",
        unitValue: currentProduct.hasUnit
          ? Number(currentProduct.unitValue) || 0
          : 0,
        date: currentProduct.date || "",
        note: currentProduct.note || "",

        userId: Number(currentProduct.userId) || 0,
        actorRole: role,
      };

      const res = await updateStockAdjustment({
        id: currentProduct.Id,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated product!");
        setIsModalOpen2(false);
        setCurrentProduct(null);
        refetch?.();
      } else {
        toast.error(res?.message || "Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleDeleteProduct = async (id) => {
    const confirmDelete = await requestDeleteConfirmation({ message: "Do you want to delete this product?" });
    if (!confirmDelete) return toast.info("Delete action was cancelled.");

    try {
      const res = await deleteStockAdjustment(id).unwrap();

      if (res?.success !== false) {
        toast.success("Product deleted successfully!");
        refetch?.();
      } else {
        toast.error(res?.message || "Delete failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setItemName("");
  };

  const handleNoteClick = (note) => {
    setNoteContent(note);
    setIsNoteModalOpen(true);
  };

  const handleNoteModalClose = () => {
    setIsNoteModalOpen(false);
    setNoteContent("");
  };

  // const {
  //   data: allProductsRes,
  //   isLoading: isLoadingAllProducts,
  //   isError: isErrorAllProducts,
  //   error: errorAllProducts,
  // } = useGetAllProductWithoutQueryQuery();

  // const productsData = allProductsRes?.data || [];

  // useEffect(() => {
  //   if (isErrorAllProducts) {
  //     console.error("Error fetching products", errorAllProducts);
  //   }
  // }, [isErrorAllProducts, errorAllProducts]);

  // const productDropdownOptions = useMemo(() => {
  //   return (productsData || []).map((p) => ({
  //     value: String(p.Id ?? p.id ?? p._id),
  //     label: p.name,
  //   }));
  // }, [productsData]);

  // const productNameMap = useMemo(() => {
  //   const m = new Map();
  //   (productsData || []).forEach((p) => {
  //     const key = String(p.Id ?? p.id ?? p._id);
  //     m.set(key, p.name);
  //   });
  //   return m;
  // }, [productsData]);

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
  };

  const applySelectedStockRow = (target, selected) => {
    const safeTarget = target || {};
    const row = selected?.row || null;
    const patch = {
      itemMasterId: selected?.value || "",
      itemId: row?.itemId ? String(row.itemId) : "",
      productId: row?.productId ? String(row.productId) : "",
      unit: row?.unit || safeTarget?.unit || "Pcs",
    };

    return {
      ...safeTarget,
      ...patch,
    };
  };

  const findStockOption = (record = {}) => {
    const safeRecord = record || {};

    return itemDropdownOptions.find((option) => {
      const row = option.row || {};
      if (
        safeRecord.itemMasterId &&
        String(option.value) === String(safeRecord.itemMasterId)
      ) {
        return true;
      }

      return (
        String(row.itemId || "") === String(safeRecord.itemId || "") &&
        String(row.productId || "") === String(safeRecord.productId || "")
      );
    }) || null;
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
            {t.stock_adjustment_history || "Stock Adjustment History"}
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            {t.track_stock_adjustments || "Track and manage stock adjustments"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="inline-flex items-center gap-3 bg-indigo-50 border border-indigo-100 px-5 py-2.5 rounded-2xl shadow-sm shadow-indigo-50">
            <div className="h-8 w-8 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
              <ShoppingBasket size={18} />
            </div>
            <div>
              <div className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                {t.total_entries || "Total Entries"}
              </div>
              <div className="text-base font-black text-indigo-900 tabular-nums leading-none">
                {isLoading ? "..." : (data?.meta?.count ?? 0).toLocaleString()}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddProduct}
            className="group relative inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 active:scale-95 overflow-hidden w-full sm:w-auto"
          >
            <Plus size={18} /> {t.stock_in || "Stock In"}
          </button>
          <button
            type="button"
            onClick={handleAddProduct3}
            className="group relative inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 active:scale-95 overflow-hidden w-full sm:w-auto"
          >
            <Plus size={18} /> {t.stock_out || "Stock Out"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-10 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 items-end">
        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            {t.from}
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium text-sm"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            {t.to}
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium text-sm"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            {t.per_page_label || "Per Page"}
          </label>
          <Select
            options={[10, 20, 50, 100].map((v) => ({
              value: v,
              label: String(v),
            }))}
            value={{ value: itemsPerPage, label: String(itemsPerPage) }}
            onChange={(selected) => setItemsPerPage(selected?.value || 10)}
            styles={selectStyles}
            className="text-black"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            {t.product || "Product"}
          </label>
          <Select
            options={itemDropdownOptions}
            value={
              itemDropdownOptions.find((o) => o.label === itemName) || null
            }
            onChange={(selected) => setItemName(selected?.label || "")}
            placeholder={t.search || "Search"}
            isClearable
            isDisabled={isLoadingAllItems}
            styles={selectStyles}
            className="text-black"
          />
        </div>

        <button
          type="button"
          className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 transition rounded-xl px-4 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 border border-slate-200"
          onClick={clearFilters}
        >
          <X size={16} /> {t.clear_filters || "Clear Filters"}
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.date || "Date"}
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.product || "Product"}
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.unit_value || "Unit Value"}
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.status || "Status"}
                </th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.actions || "Actions"}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((rp) => (
                <motion.tr
                  key={rp.Id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="hover:bg-slate-50 group"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">
                      {rp.date || "-"}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-slate-900">
                      {resolveItemName(rp)}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {Number(rp.unitValue || 0)} {rp.unit || "Pcs"}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                        rp.status === "Approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100"
                          : rp.status === "Active"
                            ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-100"
                            : "bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-100"
                      }`}
                    >
                      {rp.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {rp.note ? (
                        <div className="relative">
                          <button
                            className="relative h-10 w-10 rounded-md flex items-center justify-center"
                            title={rp.note}
                            type="button"
                            onClick={() => handleNoteClick(rp.note)}
                          >
                            <Notebook size={18} className="text-slate-700" />
                          </button>

                          <span className="absolute top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
                            1
                          </span>
                        </div>
                      ) : (
                        <button
                          className="h-10 w-10 rounded-md flex items-center justify-center cursor-default"
                          title={t.no_note_available || "No note available"}
                          type="button"
                        >
                          <Notebook size={18} className="text-slate-300" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleEditClick(rp)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition shadow-sm"
                        title={t.edit_record || "Edit"}
                      >
                        <Edit size={16} />
                      </button>

                      {role === "superAdmin" || role === "admin" ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(rp.Id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition shadow-sm"
                          title={t.delete_record || "Delete"}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleEditClick1(rp)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition shadow-sm"
                          title={t.request_delete || "Request Delete"}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}

              {!isLoading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-20 text-center text-sm text-slate-400 italic"
                  >
                    {t.no_data_found || "No data found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between mt-10 gap-6 px-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          {t.showing_page || "Showing Page"}{" "}
          <span className="text-indigo-600">{currentPage}</span> {t.of || "of"}{" "}
          <span className="text-slate-900">{totalPages}</span>
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousSet}
            disabled={startPage === 1}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <ChevronLeft size={16} /> {t.prev || "Prev"}
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
            {t.next || "Next"} <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <Modal
        isOpen={isNoteModalOpen}
        onClose={handleNoteModalClose}
        title={t.note_preview || "Note Preview"}
      >
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 min-h-[120px]">
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {noteContent || t.no_note_available || "No note available."}
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleNoteModalClose}
              className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition shadow-sm active:scale-95"
            >
              {t.done || "Done"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen && !!currentProduct}
        onClose={handleModalClose}
        title={t.edit_record || "Edit Record"}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
          {/* <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.select_product || "Select Product"}
            </label>
            <Select
              options={productDropdownOptions}
              value={
                productDropdownOptions.find(
                  (o) => o.value === String(currentProduct?.productId),
                ) || null
              }
              onChange={(selected) =>
                setCurrentProduct({
                  ...currentProduct,
                  productId: selected?.value || "",
                })
              }
              placeholder={t.search_product || "Search product..."}
              isClearable
              styles={selectStyles}
              className="text-sm text-black font-medium"
              isDisabled={isLoadingAllProducts}
            />
          </div> */}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.select_item || "Select Item"}
            </label>
            <Select
              options={itemDropdownOptions}
              value={findStockOption(currentProduct)}
              onChange={(selected) =>
                setCurrentProduct(applySelectedStockRow(currentProduct, selected))
              }
              placeholder={t.search_item || "Search item..."}
              isClearable
              styles={selectStyles}
              className="text-sm font-medium"
              isDisabled={isLoadingAllItems}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.date || "Date"}
            </label>
            <input
              type="date"
              value={currentProduct?.date || ""}
              onChange={(e) =>
                setCurrentProduct((p) => ({ ...p, date: e.target.value }))
              }
              className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-1">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-sm font-black text-slate-700 uppercase tracking-tight">
                  {t.unit_settings || "Unit Settings"}
                </span>
                <p className="text-[10px] font-bold text-slate-400">
                  {t.enable_if_needed || "Enable if needed"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCurrentProduct((prev) => ({
                    ...prev,
                    hasUnit: !prev?.hasUnit,
                    unitValue: prev?.hasUnit ? "" : prev?.unitValue || "",
                    unit: prev?.hasUnit ? "Pcs" : prev?.unit || "Pcs",
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                  currentProduct?.hasUnit ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span className="sr-only">Toggle Unit</span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                    currentProduct?.hasUnit ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {currentProduct?.hasUnit && (
              <div className="bg-white rounded-xl border border-slate-100 m-1 p-4 space-y-3 shadow-sm">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t.unit_details || "Unit Details"}
                </label>

                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={currentProduct?.unitValue || ""}
                    onChange={(e) =>
                      setCurrentProduct((prev) => ({
                        ...prev,
                        unitValue: e.target.value,
                      }))
                    }
                    placeholder="30"
                    className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  />

                  <Select
                    options={[
                      "Pcs",
                      "Kg",
                      "Liter",
                      "Ml",
                      "Gram",
                      "Box",
                      "Dozen",
                    ].map((unit) => ({
                      value: unit,
                      label: unit,
                    }))}
                    value={{
                      value: currentProduct?.unit || "Pcs",
                      label: currentProduct?.unit || "Pcs",
                    }}
                    onChange={(selected) =>
                      setCurrentProduct((prev) => ({
                        ...prev,
                        unit: selected?.value || "Pcs",
                      }))
                    }
                    styles={selectStyles}
                    className="w-32 text-black"
                  />
                </div>
              </div>
            )}
          </div>

          {role === "superAdmin" || role === "admin" ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.status || "Status"}
              </label>
              <Select
                options={[
                  { value: "Pending", label: t.pending || "Pending" },
                  { value: "Active", label: t.active || "Active" },
                  { value: "Approved", label: t.approved || "Approved" },
                ]}
                value={
                  currentProduct?.status
                    ? {
                        value: currentProduct.status,
                        label:
                          currentProduct.status === "Active"
                            ? t.active || "Active"
                            : currentProduct.status === "Approved"
                              ? t.approved || "Approved"
                              : t.pending || "Pending",
                      }
                    : null
                }
                onChange={(selected) =>
                  setCurrentProduct({
                    ...currentProduct,
                    status: selected?.value || "",
                  })
                }
                styles={selectStyles}
                className="text-black"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.note || "Note"}
              </label>
              <textarea
                value={currentProduct?.note || ""}
                onChange={(e) =>
                  setCurrentProduct({ ...currentProduct, note: e.target.value })
                }
                className="w-full min-h-[90px] border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none"
                placeholder={t.extra_details || "Extra details..."}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.Stock || "Stock Status"}
            </label>
            <Select
              options={[
                { value: "In", label: t.Stock_In || "Stock In" },
                { value: "Out", label: t.Stock_Out || "Stock Out" },
              ]}
              value={
                currentProduct?.stock
                  ? {
                      value: currentProduct.stock,
                      label:
                        currentProduct.stock === "Out"
                          ? t.Stock_Out || "Stock Out"
                          : t.Stock_In || "Stock In",
                    }
                  : null
              }
              onChange={(selected) =>
                setCurrentProduct({
                  ...currentProduct,
                  stock: selected?.value || "",
                })
              }
              styles={selectStyles}
              className="text-black"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
          <button
            onClick={handleModalClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition active:scale-95"
          >
            {t.cancel || "Cancel"}
          </button>
          <button
            onClick={handleUpdateProduct}
            className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100 active:scale-95"
          >
            {t.update_changes || "Update Changes"}
          </button>
        </div>
      </Modal>

      {/* Add Stock In */}
      <Modal
        isOpen={isModalOpen1}
        onClose={handleModalClose1}
        title={t.add_new || "Add New"}
      >
        <form
          onSubmit={handleCreateProduct}
          className="space-y-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar"
        >
          {/* <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.select_product || "Select Product"}
            </label>
            <Select
              options={productDropdownOptions}
              value={
                productDropdownOptions.find(
                  (o) => o.value === String(createProduct.productId),
                ) || null
              }
              onChange={(selected) =>
                setCreateProduct({
                  ...createProduct,
                  productId: selected?.value || "",
                })
              }
              placeholder={t.search_product || "Search product..."}
              isClearable
              styles={selectStyles}
              className="text-sm text-black font-medium"
              isDisabled={isLoadingAllProducts}
            />
          </div> */}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.select_item || "Select Item"}
            </label>
            <Select
              options={itemDropdownOptions}
              value={findStockOption(createProduct)}
              onChange={(selected) =>
                setCreateProduct(applySelectedStockRow(createProduct, selected))
              }
              placeholder={t.search_product || "Search item..."}
              isClearable
              styles={selectStyles}
              className="text-sm text-black font-medium"
              isDisabled={isLoadingAllItems}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.date || "Date"}
            </label>
            <input
              type="date"
              value={createProduct?.date || ""}
              onChange={(e) =>
                setCreateProduct((p) => ({ ...p, date: e.target.value }))
              }
              className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-1">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-sm font-black text-slate-700 uppercase tracking-tight">
                  {t.unit_settings || "Unit Settings"}
                </span>
                <p className="text-[10px] font-bold text-slate-400">
                  {t.enable_if_needed || "Enable if needed"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCreateProduct((prev) => ({
                    ...prev,
                    hasUnit: !prev?.hasUnit,
                    unitValue: prev?.hasUnit ? "" : prev?.unitValue || "",
                    unit: prev?.hasUnit ? "Pcs" : prev?.unit || "Pcs",
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                  createProduct?.hasUnit ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span className="sr-only">Toggle Unit</span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                    createProduct?.hasUnit ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {createProduct?.hasUnit && (
              <div className="bg-white rounded-xl border border-slate-100 m-1 p-4 space-y-3 shadow-sm">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t.unit_details || "Unit Details"}
                </label>

                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={createProduct?.unitValue || ""}
                    onChange={(e) =>
                      setCreateProduct((prev) => ({
                        ...prev,
                        unitValue: e.target.value,
                      }))
                    }
                    placeholder="30"
                    className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  />

                  <Select
                    options={[
                      "Pcs",
                      "Kg",
                      "Liter",
                      "Ml",
                      "Gram",
                      "Box",
                      "Dozen",
                    ].map((unit) => ({
                      value: unit,
                      label: unit,
                    }))}
                    value={{
                      value: createProduct?.unit || "Pcs",
                      label: createProduct?.unit || "Pcs",
                    }}
                    onChange={(selected) =>
                      setCreateProduct((prev) => ({
                        ...prev,
                        unit: selected?.value || "Pcs",
                      }))
                    }
                    styles={selectStyles}
                    className="w-32 text-black"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.note || "Note"}
            </label>
            <textarea
              value={createProduct?.note || ""}
              onChange={(e) =>
                setCreateProduct({ ...createProduct, note: e.target.value })
              }
              className="w-full min-h-[80px] border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none"
              placeholder={t.add_extra_info || "Add any extra info..."}
            />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleModalClose1}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition active:scale-95"
            >
              {t.cancel || "Cancel"}
            </button>

            <button
              type="submit"
              className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100 active:scale-95"
            >
              {t.save || "Save"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Stock Out */}
      <Modal
        isOpen={isModalOpen3}
        onClose={handleModalClose3}
        title={t.stock_out || "Stock Out"}
      >
        <form
          onSubmit={handleCreateProduct1}
          className="space-y-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar"
        >
          {/* <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.select_product || "Select Product"}
            </label>
            <Select
              options={productDropdownOptions}
              value={
                productDropdownOptions.find(
                  (o) => o.value === String(createProduct.productId),
                ) || null
              }
              onChange={(selected) =>
                setCreateProduct({
                  ...createProduct,
                  productId: selected?.value || "",
                })
              }
              placeholder={t.search_product || "Search product..."}
              isClearable
              styles={selectStyles}
              className="text-sm text-black font-medium"
              isDisabled={isLoadingAllProducts}
            />
          </div> */}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.select_item || "Select Item"}
            </label>
            <Select
              options={itemDropdownOptions}
              value={findStockOption(createProduct)}
              onChange={(selected) =>
                setCreateProduct(applySelectedStockRow(createProduct, selected))
              }
              placeholder={t.search_product || "Search item..."}
              isClearable
              styles={selectStyles}
              className="text-sm text-black font-medium"
              isDisabled={isLoadingAllItems}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.date || "Date"}
            </label>
            <input
              type="date"
              value={createProduct?.date || ""}
              onChange={(e) =>
                setCreateProduct((p) => ({ ...p, date: e.target.value }))
              }
              className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-1">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-sm font-black text-slate-700 uppercase tracking-tight">
                  {t.unit_settings || "Unit Settings"}
                </span>
                <p className="text-[10px] font-bold text-slate-400">
                  {t.enable_if_needed || "Enable if needed"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCreateProduct((prev) => ({
                    ...prev,
                    hasUnit: !prev?.hasUnit,
                    unitValue: prev?.hasUnit ? "" : prev?.unitValue || "",
                    unit: prev?.hasUnit ? "Pcs" : prev?.unit || "Pcs",
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                  createProduct?.hasUnit ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span className="sr-only">Toggle Unit</span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                    createProduct?.hasUnit ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {createProduct?.hasUnit && (
              <div className="bg-white rounded-xl border border-slate-100 m-1 p-4 space-y-3 shadow-sm">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t.unit_details || "Unit Details"}
                </label>

                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={createProduct?.unitValue || ""}
                    onChange={(e) =>
                      setCreateProduct((prev) => ({
                        ...prev,
                        unitValue: e.target.value,
                      }))
                    }
                    placeholder="30"
                    className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  />

                  <Select
                    options={[
                      "Pcs",
                      "Kg",
                      "Ml",
                      "Liter",
                      "Gram",
                      "Box",
                      "Dozen",
                    ].map((unit) => ({
                      value: unit,
                      label: unit,
                    }))}
                    value={{
                      value: createProduct?.unit || "Pcs",
                      label: createProduct?.unit || "Pcs",
                    }}
                    onChange={(selected) =>
                      setCreateProduct((prev) => ({
                        ...prev,
                        unit: selected?.value || "Pcs",
                      }))
                    }
                    styles={selectStyles}
                    className="w-32 text-black"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.note || "Note"}
            </label>
            <textarea
              value={createProduct?.note || ""}
              onChange={(e) =>
                setCreateProduct({ ...createProduct, note: e.target.value })
              }
              className="w-full min-h-[80px] border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none"
              placeholder={t.add_extra_info || "Add any extra info..."}
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleModalClose3}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition active:scale-95"
            >
              {t.cancel || "Cancel"}
            </button>

            <button
              type="submit"
              className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100 active:scale-95"
            >
              {t.save || "Save"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isModalOpen2 && !!currentProduct}
        onClose={handleModalClose2}
        title={t.action_confirmation || "Action Confirmation"}
      >
        <div className="space-y-4">
          {role === "superAdmin" ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.update_status || "Update Status"}
              </label>
              <Select
                options={[
                  { value: "Pending", label: t.pending || "Pending" },
                  { value: "Active", label: t.active || "Active" },
                  { value: "Approved", label: t.approved || "Approved" },
                ]}
                value={
                  currentProduct?.status
                    ? {
                        value: currentProduct.status,
                        label:
                          currentProduct.status === "Active"
                            ? t.active || "Active"
                            : currentProduct.status === "Approved"
                              ? t.approved || "Approved"
                              : t.pending || "Pending",
                      }
                    : null
                }
                onChange={(selected) =>
                  setCurrentProduct({
                    ...currentProduct,
                    status: selected?.value || "",
                  })
                }
                styles={selectStyles}
                className="text-black"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.reason_for_removal || "Reason for Removal"}
              </label>
              <textarea
                value={currentProduct?.note || ""}
                onChange={(e) =>
                  setCurrentProduct({ ...currentProduct, note: e.target.value })
                }
                className="w-full min-h-[120px] border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none"
                placeholder={
                  t.explain_why_remove_record ||
                  "Please explain why you want to remove this record..."
                }
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={handleModalClose2}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition active:scale-95"
            >
              {t.cancel || "Cancel"}
            </button>

            <button
              onClick={handleUpdateProduct1}
              className="px-8 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 transition shadow-md shadow-amber-100 active:scale-95"
            >
              {t.submit_request || "Submit Request"}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default StockAdjustmentTable;
