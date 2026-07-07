import { motion } from "framer-motion";
import {
  BadgeDollarSign,
  Boxes,
  Edit,
  Notebook,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import Modal from "../common/Modal";
import DateRangeFilter from "../common/DateRangeFilter";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";

import { useGetAllAssetsStockWithoutQueryQuery } from "../../features/assetsStock/assetsStock";
import {
  useDeleteAssetsSaleMutation,
  useGetAllAssetsSaleQuery,
  useInsertAssetsSaleMutation,
  useUpdateAssetsSaleMutation,
} from "../../features/assetsSale/assetsSale";

const formatNumber = (value) => Number(value || 0).toLocaleString();
const formatCurrency = (value) => `৳${Number(value || 0).toLocaleString()}`;

const AssetsSaleTable = () => {
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");

  // ----------------------------
  // Modals
  // ----------------------------
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // main edit
  const [isAddModalOpen, setIsAddModalOpen] = useState(false); // add
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false); // delete request / note

  // ----------------------------
  // State
  // ----------------------------
  const [currentProduct, setCurrentProduct] = useState(null);

  const [createProduct, setCreateProduct] = useState({
    productId: "",
    name: "",
    quantity: "",
    price: "",
    note: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const [products, setProducts] = useState([]);

  // filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterProductName, setFilterProductName] = useState("");

  // ✅ Per-page user selectable
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

  // ----------------------------
  // All products (Purchase list)
  // ----------------------------
  const {
    data: allProductsRes,
    isLoading: isLoadingAllProducts,
    isError: isErrorAllProducts,
    error: errorAllProducts,
  } = useGetAllAssetsStockWithoutQueryQuery();

  const productsData = allProductsRes?.data || [];

  useEffect(() => {
    if (isErrorAllProducts)
      console.error("Error fetching products", errorAllProducts);
  }, [isErrorAllProducts, errorAllProducts]);

  // dropdown options
  const productDropdownOptions = useMemo(() => {
    return (productsData || []).map((p) => ({
      value: String(p.Id),
      label: p.name || "Unnamed",
    }));
  }, [productsData]);

  // productId -> name map
  const productNameMap = useMemo(() => {
    const m = new Map();
    (productsData || []).forEach((p) => {
      m.set(String(p.Id), p.name);
    });
    return m;
  }, [productsData]);

  const resolveProductName = (row) => {
    if (row?.name) return row.name;
    const pid = row?.productId ?? row?.product?.Id ?? row?.product?.id;
    if (!pid) return "N/A";
    return productNameMap.get(String(pid)) || "N/A";
  };

  // ----------------------------
  // Responsive pagination set
  // ----------------------------
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

  // reset page on filters change
  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [startDate, endDate, filterProductName, itemsPerPage]);

  useEffect(() => {
    if (startDate && endDate && startDate > endDate) setEndDate(startDate);
  }, [startDate, endDate]);

  // ----------------------------
  // Query
  // ----------------------------
  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      name: filterProductName || undefined,
    };

    Object.keys(args).forEach((k) => {
      if (args[k] === undefined || args[k] === null || args[k] === "")
        delete args[k];
    });

    return args;
  }, [currentPage, itemsPerPage, startDate, endDate, filterProductName]);

  const { data, isLoading, isError, error, refetch } =
    useGetAllAssetsSaleQuery(queryArgs);

  useEffect(() => {
    if (isError) {
      console.error("Error fetching assets sale", error);
      return;
    }
    if (!isLoading && data) {
      setProducts(data?.data || []);
      setTotalPages(Math.ceil((data?.meta?.count || 0) / itemsPerPage) || 1);
    }
  }, [data, isLoading, isError, error, itemsPerPage]);

  // ----------------------------
  // Mutations
  // ----------------------------
  const [insertAssetsSale] = useInsertAssetsSaleMutation();
  const [updateAssetsSale] = useUpdateAssetsSaleMutation();
  const [deleteAssetsSale] = useDeleteAssetsSaleMutation();

  // ----------------------------
  // Modals handlers
  // ----------------------------
  const openAddModal = () => setIsAddModalOpen(true);
  const closeAddModal = () => setIsAddModalOpen(false);

  const openEditModal = (row) => {
    setCurrentProduct({
      ...row,
      productId: String(row.productId ?? ""),
      quantity: row.quantity ?? "",
      price: row.price ?? "",
      status: row.status ?? "",
      note: row.note ?? "",
      date: row.date ?? "",
      userId,
    });
    setIsEditModalOpen(true);
  };
  const closeEditModal = () => setIsEditModalOpen(false);

  const openNoteModal = (row) => {
    setCurrentProduct({
      ...row,
      productId: String(row.productId ?? ""),
      quantity: row.quantity ?? "",
      price: row.price ?? "",
      note: row.note ?? "",
      status: row.status ?? "",
      date: row.date ?? "",
      userId,
    });
    setIsNoteModalOpen(true);
  };
  const closeNoteModal = () => setIsNoteModalOpen(false);

  // ----------------------------
  // Create
  // ----------------------------
  const handleCreateProduct = async (e) => {
    e.preventDefault();

    if (!createProduct.productId) return toast.error("Please select a product");
    if (!createProduct.quantity || Number(createProduct.quantity) <= 0)
      return toast.error("Please enter a valid quantity");
    if (createProduct.price === "" || Number(createProduct.price) < 0)
      return toast.error("Please enter a valid price");

    try {
      const payload = {
        productId: Number(createProduct.productId),
        quantity: Number(createProduct.quantity),
        price: Number(createProduct.price),
        date: createProduct.date,
        note: createProduct.note,
      };

      const res = await insertAssetsSale(payload).unwrap();

      if (res?.success) {
        toast.success("Successfully created sale!");
        setIsAddModalOpen(false);
        setCreateProduct({ productId: "", name: "", quantity: "", price: "" });
        refetch?.();
      } else {
        toast.error(res?.message || "Create failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  // ----------------------------
  // Update (full edit)
  // ----------------------------
  const handleUpdateProduct = async () => {
    const rowId = currentProduct?.Id ?? currentProduct?.id;
    if (!rowId) return toast.error("Invalid row!");
    if (!currentProduct?.productId)
      return toast.error("Please select a product");
    if (!currentProduct?.quantity || Number(currentProduct.quantity) <= 0)
      return toast.error("Please enter a valid quantity");
    if (currentProduct.price === "" || Number(currentProduct.price) < 0)
      return toast.error("Please enter a valid price");

    try {
      const payload = {
        productId: Number(currentProduct.productId),
        quantity: Number(currentProduct.quantity),
        note: currentProduct.note,
        status: currentProduct.status,
        price: Number(currentProduct.price),
        date: currentProduct.date,
        userId: userId,
        actorRole: role,
      };

      const res = await updateAssetsSale({ id: rowId, data: payload }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated!");
        setIsEditModalOpen(false);
        refetch?.();
      } else {
        toast.error(res?.message || "Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // ----------------------------
  // Update (note/status only)
  // ----------------------------
  const handleUpdateProductNote = async () => {
    if (!currentProduct?.Id) return toast.error("Invalid item!");
    if (currentProduct?.note === "" || currentProduct?.note === null)
      return toast.error("Note is required!");

    try {
      const payload = {
        productId: Number(currentProduct.productId),
        quantity: Number(currentProduct.quantity),
        note: currentProduct.note,
        status: currentProduct.status,
        price: Number(currentProduct.price),
        userId: userId,
        actorRole: role,
      };

      const res = await updateAssetsSale({
        id: currentProduct.Id,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated!");
        setIsNoteModalOpen(false);
        refetch?.();
      } else {
        toast.error(res?.message || "Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // ----------------------------
  // Delete
  // ----------------------------
  const handleDeleteProduct = async (rowId) => {
    if (!await requestDeleteConfirmation({ message: "Do you want to delete this sale row?" })) return;

    try {
      const res = await deleteAssetsSale(rowId).unwrap();
      if (res?.success !== false) {
        toast.success("Deleted successfully!");
        refetch?.();
      } else {
        toast.error(res?.message || "Delete failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  // ----------------------------
  // Filters
  // ----------------------------
  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setFilterProductName("");
  };

  // ----------------------------
  // Pagination
  // ----------------------------
  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    if (pageNumber < startPage) setStartPage(pageNumber);
    else if (pageNumber > endPage) setStartPage(pageNumber - pagesPerSet + 1);
  };

  const handlePreviousSet = () =>
    setStartPage((p) => Math.max(p - pagesPerSet, 1));

  const handleNextSet = () =>
    setStartPage((p) =>
      Math.min(p + pagesPerSet, Math.max(totalPages - pagesPerSet + 1, 1)),
    );

  // ----------------------------
  // ✅ React-select styles (light like EmployeeTable)
  // ----------------------------
  const selectStyles = useMemo(
    () => ({
      control: (base, state) => ({
        ...base,
        minHeight: 44,
        borderRadius: 12,
        borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0",
        boxShadow: state.isFocused
          ? "0 0 0 4px rgba(99, 102, 241, 0.15)"
          : "none",
        "&:hover": { borderColor: state.isFocused ? "#c7d2fe" : "#cbd5e1" },
      }),
      valueContainer: (base) => ({ ...base, padding: "0 12px" }),
      placeholder: (base) => ({ ...base, color: "#64748b" }),
      singleValue: (base) => ({ ...base, color: "#0f172a" }),
      menu: (base) => ({
        ...base,
        borderRadius: 12,
        overflow: "hidden",
        zIndex: 60,
      }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
          ? "rgba(99, 102, 241, 0.12)"
          : state.isFocused
            ? "#f8fafc"
            : "#fff",
        color: "#0f172a",
      }),
    }),
    [],
  );

  const [isNoteModalOpen1, setIsNoteModalOpen1] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  const handleNoteClick = (note) => {
    setNoteContent(note);
    setIsNoteModalOpen1(true); // Open the modal
  };

  const handleNoteModalClose = () => {
    setIsNoteModalOpen1(false); // Close the modal
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Top actions */}
      <div className="my-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition px-4 py-2 rounded-xl shadow-sm"
        >
          Add <Plus size={18} />
        </button>
        {/* BadgeDollarSign */}
        {/* Total Sale badge (like EmployeeTable style) */}
        {/* <div className="inline-flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-slate-700">
          <span className="text-sm">Total Sale:</span>
          <span className="font-semibold tabular-nums text-slate-900">
            {isLoading ? "Loading..." : (data?.meta?.totalQuantity ?? 0)}
          </span>
        </div> */}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2">
            <div className="flex items-center gap-2 text-slate-700">
              <Boxes size={18} className="text-indigo-500" />
              <span className="text-sm">Total Quantity</span>
            </div>

            <span className="text-slate-900 font-semibold tabular-nums">
              {isLoading ? "Loading..." : formatNumber(data?.meta?.totalQuantity)}
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2">
            <div className="flex items-center gap-2 text-slate-700">
              <BadgeDollarSign size={18} className="text-emerald-500" />
              <span className="text-sm">Total Amount</span>
            </div>

            <span className="text-slate-900 font-semibold tabular-nums">
              {isLoading ? "Loading..." : formatCurrency(data?.meta?.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Filters (EmployeeTable-like grid) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6 w-full justify-center mx-auto">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          compact
          className="md:col-span-2"
        />

        <div className="flex items-center justify-center md:mt-0">
          <Select
            options={productDropdownOptions}
            value={
              filterProductName
                ? productDropdownOptions.find(
                  (o) => o.label === filterProductName,
                ) || null
                : null
            }
            onChange={(selected) => setFilterProductName(selected?.label || "")}
            placeholder="Select Assets"
            isClearable
            styles={selectStyles}
            className="w-full"
            isDisabled={isLoadingAllProducts}
          />
        </div>

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

        <button
          className="inline-flex items-center justify-center bg-white hover:bg-slate-50 text-slate-700 transition px-4 py-[10px] rounded-xl border border-slate-200"
          onClick={clearFilters}
        >
          Clear Filters
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {["Product", "Quantity", "Price", "Total Price", "Status"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ),
              )}

              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {(products || []).map((row) => {
              const rowId = row.Id ?? row.id;
              const total = Number(
                row.total ?? Number(row.quantity || 0) * Number(row.price || 0),
              );

              return (
                <motion.tr
                  key={rowId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                    {resolveProductName(row)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {Number(row.quantity || 0).toFixed(2)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {Number(row.price || 0).toFixed(2)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {total.toFixed(2)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${row.status === "Approved"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : row.status === "Active"
                          ? "bg-blue-50 text-blue-700 border-blue-200" // New color for Active
                          : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                    >
                      {row.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-3">
                      {/* <button
                        className="relative h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition shadow-sm text-indigo-600"
                        title="View Note"
                        type="button"
                        onClick={() => handleNoteClick(row.note)}
                      >
                        <Notebook size={16} />
                        {row.note && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </span>
                        )}
                      </button> */}
                      {row.note ? (
                        <div className="relative">
                          <button
                            className="relative h-10 w-10 rounded-md flex items-center justify-center"
                            title={row.note}
                            type="button"
                            onClick={() => handleNoteClick(row.note)}
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
                          title="No note available"
                          type="button"
                        >
                          <Notebook size={18} className="text-slate-300" />
                        </button>
                      )}


                      <button
                        onClick={() => openEditModal(row)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-indigo-50 transition"
                        title="Edit"
                      >
                        <Edit size={18} className="text-indigo-600" />
                      </button>

                      {/* {role === "superAdmin" || role === "admin" ? (
                        <button
                          onClick={() => handleDeleteProduct(rowId)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition shadow-sm"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => openNoteModal(row)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition shadow-sm"
                          title="Delete Request / Note"
                        >
                          <Trash2 size={16} />
                        </button>
                      )} */}


                      {role === "superAdmin" || role === "admin" ? (
                        <button
                          onClick={() => handleDeleteProduct(rowId)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-rose-50 transition"
                          title="Delete"
                        >
                          <Trash2 size={18} className="text-rose-600" />
                        </button>
                      ) : (
                        <button
                          onClick={() => openNoteModal(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-rose-50 transition"
                          title="Delete Request / Note"
                        >
                          <Trash2 size={18} className="text-rose-600" />
                        </button>
                      )}
                    </div>
                  </td>



                </motion.tr>
              );
            })}

            {!isLoading && products.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-sm text-slate-600"
                >
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination (EmployeeTable style) */}
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
              className={`px-4 py-2 rounded-xl border transition ${active
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

      {/* ✅ Note View Modal */}
      <Modal
        isOpen={isNoteModalOpen1}
        onClose={handleNoteModalClose}
        title="Transaction Note"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 min-h-[120px]">
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {noteContent || "No note available."}
            </p>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={handleNoteModalClose}
              className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition shadow-sm active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* ✅ Edit Modal */}
      <Modal
        isOpen={isEditModalOpen && !!currentProduct}
        onClose={closeEditModal}
        title="Edit Assets Sale"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              Product
            </label>
            <Select
              options={productDropdownOptions}
              value={
                currentProduct?.productId
                  ? productDropdownOptions.find(
                    (o) => o.value === String(currentProduct.productId),
                  ) || null
                  : null
              }
              onChange={(selected) =>
                setCurrentProduct((p) => ({
                  ...p,
                  productId: selected?.value || "",
                }))
              }
              placeholder="Select Assets"
              isClearable
              styles={selectStyles}
              className="w-full"
              isDisabled={isLoadingAllProducts}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LightField
              label="Date"
              type="date"
              value={currentProduct?.date}
              onChange={(v) =>
                setCurrentProduct({ ...currentProduct, date: v })
              }
              required
            />
            <LightField
              label="Quantity"
              type="number"
              step="0.01"
              value={currentProduct?.quantity}
              onChange={(v) =>
                setCurrentProduct((p) => ({ ...p, quantity: v }))
              }
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LightField
              label="Price"
              type="number"
              step="0.01"
              value={currentProduct?.price}
              onChange={(v) => setCurrentProduct((p) => ({ ...p, price: v }))}
              required
            />
            {role === "superAdmin" ? (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                  Status
                </label>
                <select
                  value={currentProduct?.status || ""}
                  onChange={(e) =>
                    setCurrentProduct((p) => ({
                      ...p,
                      status: e.target.value,
                    }))
                  }
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  required
                >
                  <option value="">Select Status</option>
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                  Note
                </label>
                <textarea
                  value={currentProduct?.note || ""}
                  onChange={(e) =>
                    setCurrentProduct((p) => ({ ...p, note: e.target.value }))
                  }
                  className="w-full min-h-[44px] border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none"
                  rows={1}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
            <button
              onClick={closeEditModal}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateProduct}
              className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100 active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* ✅ Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        title="Add Assets Sale"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              Product
            </label>
            <Select
              options={productDropdownOptions}
              value={
                createProduct.productId
                  ? productDropdownOptions.find(
                    (o) => o.value === String(createProduct.productId),
                  ) || null
                  : null
              }
              onChange={(selected) =>
                setCreateProduct((p) => ({
                  ...p,
                  productId: selected?.value || "",
                }))
              }
              placeholder="Select Assets"
              isClearable
              styles={selectStyles}
              className="w-full"
              isDisabled={isLoadingAllProducts}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LightField
              label="Date"
              type="date"
              value={createProduct.date}
              onChange={(v) =>
                setCreateProduct({ ...createProduct, date: v })
              }
              required
            />
            <LightField
              label="Quantity"
              type="number"
              step="0.01"
              value={createProduct.quantity}
              onChange={(v) =>
                setCreateProduct((p) => ({ ...p, quantity: v }))
              }
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LightField
              label="Price"
              type="number"
              step="0.01"
              value={createProduct.price}
              onChange={(v) => setCreateProduct((p) => ({ ...p, price: v }))}
              required
            />
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Note
              </label>
              <textarea
                value={createProduct?.note || ""}
                onChange={(e) =>
                  setCreateProduct({
                    ...createProduct,
                    note: e.target.value,
                  })
                }
                className="w-full min-h-[44px] border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none"
                rows={1}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={closeAddModal}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100 active:scale-95"
            >
              Save Assets Sale
            </button>
          </div>
        </form>
      </Modal>

      {/* ✅ Delete Request / Note Modal */}
      <Modal
        isOpen={isNoteModalOpen && !!currentProduct}
        onClose={closeNoteModal}
        title="Action Confirmation"
      >
        <div className="space-y-4">
          {role === "superAdmin" ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Status
              </label>
              <select
                value={currentProduct?.status || ""}
                onChange={(e) =>
                  setCurrentProduct((p) => ({
                    ...p,
                    status: e.target.value,
                  }))
                }
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                required
              >
                <option value="">Select Status</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Reason for Change
              </label>
              <textarea
                value={currentProduct?.note || ""}
                onChange={(e) =>
                  setCurrentProduct((p) => ({ ...p, note: e.target.value }))
                }
                className="w-full min-h-[120px] border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none"
                placeholder="Please explain the reason..."
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={closeNoteModal}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateProductNote}
              className="px-8 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 transition shadow-md shadow-amber-100 active:scale-95"
            >
              Submit Note
            </button>
          </div>
        </div>
      </Modal>
    </motion.div >
  );
};

const LightField = ({
  label,
  value,
  onChange,
  type = "text",
  step,
  readOnly,
  required,
}) => (
  <div>
    <label className="block text-sm text-slate-700">{label}</label>
    <input
      type={type}
      step={step}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      required={required}
      className={`border border-slate-200 rounded-xl p-3 w-full mt-1 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200 ${readOnly ? "text-slate-900 opacity-80" : "text-slate-900"
        }`}
    />
  </div>
);

export default AssetsSaleTable;
