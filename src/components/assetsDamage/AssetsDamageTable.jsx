import { motion } from "framer-motion";
import { Edit, Notebook, Plus, Trash2, Wrench } from "lucide-react";
import Modal from "../common/Modal";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";

import { useGetAllAssetsStockWithoutQueryQuery } from "../../features/assetsStock/assetsStock";
import {
  useDeleteAssetsDamageMutation,
  useGetAllAssetsDamageQuery,
  useInsertAssetsDamageMutation,
  useUpdateAssetsDamageMutation,
} from "../../features/assetsDamage/assetsDamage";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";

const AssetsDamageTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen1, setIsModalOpen1] = useState(false);
  const [isModalOpen2, setIsModalOpen2] = useState(false);

  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");

  const [currentProduct, setCurrentProduct] = useState(null);

  // INSERT form
  const [createProduct, setCreateProduct] = useState({
    productId: "",
    quantity: "",
    price: "",
    note: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const [products, setProducts] = useState([]);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterProductName, setFilterProductName] = useState("");

  // Per page (optional but consistent)
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

  // All products (Purchase list)
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

  // Dropdown options (Id as value, name as label)
  const productDropdownOptions = useMemo(() => {
    return (productsData || []).map((p) => ({
      value: String(p.Id), // ✅ keep as string for Select consistency
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
    const pid =
      row?.productId ?? row?.product?.Id ?? row?.product?.id ?? row?.product_id;
    if (!pid) return "N/A";
    return productNameMap.get(String(pid)) || "N/A";
  };

  // Responsive pagesPerSet
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

  // Query args
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
    useGetAllAssetsDamageQuery(queryArgs);

  useEffect(() => {
    if (isError) {
      console.error("Error fetching assets damage", error);
      return;
    }
    if (!isLoading && data) {
      setProducts(data?.data || []);
      setTotalPages(Math.ceil((data?.meta?.count || 0) / itemsPerPage) || 1);
    }
  }, [data, isLoading, isError, error, itemsPerPage]);

  // Modals
  const handleAddProduct = () => setIsModalOpen1(true);
  const handleModalClose1 = () => setIsModalOpen1(false);

  const handleDeleteClose = () => setIsModalOpen2(false);
  const handleModalClose = () => setIsModalOpen(false);

  const handleDeleteClick = (row) => {
    setCurrentProduct({
      ...row,
      productId: String(row.productId ?? ""),
      quantity: row.quantity ?? "",
      price: row.price ?? "",
      note: row.note ?? "",
      status: row.status ?? "",
      userId: userId,
    });
    setIsModalOpen2(true);
  };

  const handleEditClick = (row) => {
    setCurrentProduct({
      ...row,
      productId: String(row.productId ?? ""),
      quantity: row.quantity ?? "",
      price: row.price ?? "",
      note: row.note ?? "",
      status: row.status ?? "",
      date: row.date ?? "",
      userId: userId,
    });
    setIsModalOpen(true);
  };

  // Insert
  const [insertAssetsDamage] = useInsertAssetsDamageMutation();

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

      const res = await insertAssetsDamage(payload).unwrap();

      if (res?.success) {
        toast.success("Successfully created damage!");
        setIsModalOpen1(false);
        setCreateProduct({ productId: "", quantity: "", price: "", date: "" });
        refetch?.();
      } else {
        toast.error(res?.message || "Create failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  // Update
  const [updateAssetsDamage] = useUpdateAssetsDamageMutation();

  const handleUpdateDelete = async () => {
    if (!currentProduct?.Id) return toast.error("Invalid item!");
    if (currentProduct?.note === "" || currentProduct?.note === null)
      return toast.error("Note is required!");

    try {
      const payload = {
        productId: Number(currentProduct.productId),
        quantity: Number(currentProduct.quantity),
        price: Number(currentProduct.price),
        note: currentProduct.note,
        status: currentProduct.status,
        date: currentProduct.date,
        userId: userId,
        actorRole: role,
      };

      const res = await updateAssetsDamage({
        id: currentProduct.Id,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated!");
        setIsModalOpen2(false);
        refetch?.();
      } else {
        toast.error(res?.message || "Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

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
        price: Number(currentProduct.price),
        note: currentProduct.note,
        status: currentProduct.status,
        date: currentProduct.date,
        userId: userId,
        actorRole: role,
      };

      const res = await updateAssetsDamage({
        id: rowId,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated!");
        setIsModalOpen(false);
        refetch?.();
      } else {
        toast.error(res?.message || "Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // Delete
  const [deleteAssetsDamage] = useDeleteAssetsDamageMutation();

  const handleDeleteProduct = async (rowId) => {
    if (!await requestDeleteConfirmation({ message: "Do you want to delete this row?" })) return;

    try {
      const res = await deleteAssetsDamage(rowId).unwrap();
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

  // Clear Filters
  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setFilterProductName("");
  };

  // Pagination
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

  // React-select light styles (same as Purchase light)
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Add Button + Total */}
      <div className="my-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleAddProduct}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition px-4 py-2 rounded-xl shadow-sm"
        >
          Add <Plus size={18} />
        </button>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2">
          <div className="flex items-center gap-2 text-slate-700">
            <Wrench size={18} className="text-amber-500" />
            <span className="text-sm">Total Damage</span>
          </div>

          <span className="text-slate-900 font-semibold tabular-nums">
            {isLoading ? "Loading..." : data?.meta?.totalQuantity}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6 w-full justify-center mx-auto">
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          />
        </div>

        <div className="flex items-center justify-center">
          <Select
            styles={selectStyles}
            options={productDropdownOptions}
            value={
              filterProductName
                ? productDropdownOptions.find(
                  (o) => o.label === filterProductName,
                )
                : null
            }
            onChange={(selected) => setFilterProductName(selected?.label || "")}
            placeholder="Select Assets"
            isClearable
            isDisabled={isLoadingAllProducts}
            className="w-full"
          />
        </div>

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
              {[
                "Product",
                "Quantity",
                "Price",
                "Total Price",
                "Status",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
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
                      {/* {row.note ? (
                        <div className="relative">
                          <button
                            className="relative h-10 w-10 rounded-md flex items-center justify-center"
                            title={row.note}
                            type="button"
                            onClick={() => handleNoteClick(row.note)} // Open modal on click
                          >
                            <Notebook size={18} className="text-slate-700" />
                          </button>

                          <span className="absolute top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
                            {row.note ? 1 : null}
                          </span>
                        </div>
                      ) : (
                        <button
                          className="h-10 w-10 rounded-md flex items-center justify-center"
                          title={row.note}
                          type="button"
                        >
                          <Notebook size={18} className="text-slate-700" />
                        </button>
                      )} */}

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
                        onClick={() => handleEditClick(row)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-indigo-50 transition"
                        title="Edit"
                      >
                        <Edit size={18} className="text-indigo-600" />
                      </button>

                      {/* {role === "superAdmin" || row.status === "Approved" ? (
                        <button
                          onClick={() => handleDeleteProduct(rowId)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-rose-50 transition"
                          title="Delete"
                        >
                          <Trash2 size={18} className="text-rose-600" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteClick(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-rose-50 transition"
                          title="Delete Request / Note"
                        >
                          <Trash2 size={18} className="text-rose-600" />
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
                          onClick={() => handleDeleteClick(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-rose-50 transition"
                          title="Delete Request / Note"
                        >
                          <Trash2 size={18} className="text-rose-600" />
                        </button>
                      )}
                    </div>
                  </td>

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

            {!isLoading && products.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-6 text-center text-sm text-slate-600"
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

      {/* -------------------- Edit Modal -------------------- */}
      <Modal isOpen={isModalOpen && !!currentProduct} onClose={handleModalClose} title="Edit Damage">
        {currentProduct && (
          <>
            <div className="mt-4">
              <label className="block text-sm text-slate-700">Product:</label>
              <Select
                styles={selectStyles}
                options={productDropdownOptions}
                value={
                  currentProduct.productId
                    ? productDropdownOptions.find(
                      (o) => o.value === String(currentProduct.productId),
                    )
                    : null
                }
                onChange={(selected) =>
                  setCurrentProduct((p) => ({
                    ...p,
                    productId: selected?.value || "",
                  }))
                }
                placeholder="Select Product"
                isClearable
                className="w-full"
                isDisabled={isLoadingAllProducts}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <Field
                label="Date:"
                type="date"
                value={currentProduct.date}
                onChange={(v) =>
                  setCurrentProduct({ ...currentProduct, date: v })
                }
                required
              />
              <Field
                label="Quantity:"
                type="number"
                step="0.01"
                value={currentProduct.quantity}
                onChange={(v) =>
                  setCurrentProduct((p) => ({ ...p, quantity: v }))
                }
              />
              <Field
                label="Price:"
                type="number"
                step="0.01"
                value={currentProduct.price}
                onChange={(v) => setCurrentProduct((p) => ({ ...p, price: v }))}
              />
            </div>

            {role === "superAdmin" ? (
              <div className="mt-4">
                <label className="block text-sm text-slate-700">Status</label>
                <select
                  value={currentProduct.status || ""}
                  onChange={(e) =>
                    setCurrentProduct((p) => ({ ...p, status: e.target.value }))
                  }
                  className="border border-slate-200 rounded-xl p-3 w-full mt-1 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
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
                <label className="block text-sm text-slate-700">Note:</label>
                <textarea
                  value={currentProduct?.note || ""}
                  onChange={(e) =>
                    setCurrentProduct((p) => ({ ...p, note: e.target.value }))
                  }
                  className="border border-slate-200 rounded-xl p-3 w-full mt-1 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                  rows={3}
                />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl shadow-sm"
                onClick={handleUpdateProduct}
              >
                Save
              </button>
              <button
                type="button"
                className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl border border-slate-200"
                onClick={handleModalClose}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* -------------------- Add Modal -------------------- */}
      <Modal isOpen={isModalOpen1} onClose={handleModalClose1} title="Add Damage">
        <form onSubmit={handleCreateProduct} className="mt-4">
          <label className="block text-sm text-slate-700">Product:</label>
          <Select
            styles={selectStyles}
            options={productDropdownOptions}
            value={
              createProduct.productId
                ? productDropdownOptions.find(
                  (o) => o.value === String(createProduct.productId),
                )
                : null
            }
            onChange={(selected) =>
              setCreateProduct((p) => ({
                ...p,
                productId: selected?.value || "",
              }))
            }
            placeholder="Select Product"
            isClearable
            className="w-full"
            isDisabled={isLoadingAllProducts}
          />

          <div className="grid grid-cols-1 gap-3 mt-4">
            <Field
              label="Date:"
              type="date"
              value={createProduct.date}
              onChange={(v) =>
                setCreateProduct({ ...createProduct, date: v })
              }
              required
            />
            <Field
              label="Quantity:"
              type="number"
              step="0.01"
              value={createProduct.quantity}
              onChange={(v) =>
                setCreateProduct((p) => ({ ...p, quantity: v }))
              }
              required
            />
            <Field
              label="Price:"
              type="number"
              step="0.01"
              value={createProduct.price}
              onChange={(v) =>
                setCreateProduct((p) => ({ ...p, price: v }))
              }
              required
            />
            <Field
              label="Note:"
              type="text"
              value={createProduct.note}
              onChange={(v) =>
                setCreateProduct({ ...createProduct, note: v })
              }
              className="min-h-[90px] border border-slate-200 rounded-xl p-3 w-full mt-1 text-slate-900 bg-white outline-none
                         focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl shadow-sm"
            >
              Save
            </button>
            <button
              type="button"
              className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl border border-slate-200"
              onClick={handleModalClose1}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* -------------------- Edit Delete (note/status update) -------------------- */}
      <Modal isOpen={isModalOpen2 && !!currentProduct} onClose={handleDeleteClose} title="Delete Request / Note">
        {currentProduct && (
          <>
            {role === "superAdmin" ? (
              <div className="mt-4">
                <label className="block text-sm text-slate-700">Status</label>
                <select
                  value={currentProduct.status || ""}
                  onChange={(e) =>
                    setCurrentProduct((p) => ({ ...p, status: e.target.value }))
                  }
                  className="border border-slate-200 rounded-xl p-3 w-full mt-1 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
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
                <label className="block text-sm text-slate-700">Note:</label>
                <textarea
                  value={currentProduct?.note || ""}
                  onChange={(e) =>
                    setCurrentProduct((p) => ({ ...p, note: e.target.value }))
                  }
                  className="border border-slate-200 rounded-xl p-3 w-full mt-1 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                  rows={3}
                />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl shadow-sm"
                onClick={handleUpdateDelete}
              >
                Save
              </button>
              <button
                type="button"
                className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl border border-slate-200"
                onClick={handleDeleteClose}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </Modal>
    </motion.div>
  );
};

const Field = ({
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

export default AssetsDamageTable;
