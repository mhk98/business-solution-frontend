import { motion } from "framer-motion";
import {
  BadgeDollarSign,
  Edit,
  Notebook,
  Plus,
  ShoppingBasket,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import { useGetAllAssetWithoutQueryQuery } from "../../features/assets/assets";
import {
  useDeleteAssetsPurchaseMutation,
  useGetAllAssetsPurchaseQuery,
  useInsertAssetsPurchaseMutation,
  useUpdateAssetsPurchaseMutation,
} from "../../features/assetsPurchase/assetsPurchase";
import Modal from "../common/Modal";
import DateRangeFilter from "../common/DateRangeFilter";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";

const formatNumber = (value) => Number(value || 0).toLocaleString();
const formatCurrency = (value) => `৳${Number(value || 0).toLocaleString()}`;

const AssetsPurchaseTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen1, setIsModalOpen1] = useState(false);

  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");

  const [currentProduct, setCurrentProduct] = useState(null);

  const [createProduct, setCreateProduct] = useState({
    assetId: "",
    price: "",
    quantity: "",
    note: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const [products, setProducts] = useState([]);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [assetId, setAssetId] = useState("");

  // ✅ Per-page user selectable (EmployeeTable like)
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

  // All assets for select
  const [assetsData, setAssetsData] = useState([]);

  const {
    data: data2,
    isLoading: isLoading2,
    isError: isError2,
    error: error2,
  } = useGetAllAssetWithoutQueryQuery();

  useEffect(() => {
    if (isError2) {
      console.error("Error fetching assets", error2);
    } else if (!isLoading2 && data2) {
      setAssetsData(data2.data || []);
    }
  }, [data2, isLoading2, isError2, error2]);

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

  // filter change হলে page reset
  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [startDate, endDate, assetId, itemsPerPage]);

  // startDate > endDate হলে endDate ঠিক করে দেবে
  useEffect(() => {
    if (startDate && endDate && startDate > endDate) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

  // Query args
  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      assetId: assetId || undefined,
    };

    Object.keys(args).forEach((k) => {
      if (args[k] === undefined || args[k] === null || args[k] === "")
        delete args[k];
    });

    return args;
  }, [currentPage, itemsPerPage, startDate, endDate, assetId]);

  const { data, isLoading, isError, error, refetch } =
    useGetAllAssetsPurchaseQuery(queryArgs);

  useEffect(() => {
    if (isError) {
      console.error("Error fetching product data", error);
    } else if (!isLoading && data) {
      setProducts(data.data || []);
      setTotalPages(Math.ceil((data?.meta?.count || 0) / itemsPerPage) || 1);
    }
  }, [data, isLoading, isError, error, currentPage, itemsPerPage]);

  // Modals
  const handleModalClose = () => setIsModalOpen(false);
  const handleAddProduct = () => setIsModalOpen1(true);
  const handleModalClose1 = () => setIsModalOpen1(false);

  const [updateAssetsPurchase] = useUpdateAssetsPurchaseMutation();
  const [isModalOpen2, setIsModalOpen2] = useState(false);
  const handleModalClose2 = () => setIsModalOpen2(false);

  const handleEditClick1 = (product) => {
    setCurrentProduct({
      ...product,
      assetId: String(product.assetId ?? product.productId ?? ""),
      price: product.price ?? "",
      note: product.note ?? "",
      status: product.status ?? "",
      quantity: product.quantity ?? "",
      userId: userId,
    });
    setIsModalOpen2(true);
  };

  const handleUpdateProduct1 = async () => {
    if (!currentProduct?.Id) return toast.error("Invalid item!");
    if (!currentProduct?.assetId) return toast.error("Asset is required!");
    if (currentProduct?.note === "" || currentProduct?.note === null)
      return toast.error("Note is required!");

    try {
      const payload = {
        assetId: Number(currentProduct.assetId),
        quantity: Number(currentProduct.quantity),
        price: Number(currentProduct.price),
        note: currentProduct.note,
        status: currentProduct.status,
        userId: userId,
        actorRole: role,
      };

      const res = await updateAssetsPurchase({
        id: currentProduct.Id,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated product!");
        setIsModalOpen2(false);
        refetch?.();
      } else {
        toast.error(res?.message || "Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleEditClick = (product) => {
    setCurrentProduct({
      ...product,
      assetId: String(product.assetId ?? product.productId ?? ""),
      price: product.price ?? "",
      note: product.note ?? "",
      status: product.status ?? "",
      quantity: product.quantity ?? "",
      date: product.date ?? "",
      userId: userId,
    });
    setIsModalOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!currentProduct?.Id) return toast.error("Invalid item!");
    if (!currentProduct?.assetId) return toast.error("Asset is required!");
    if (currentProduct?.price === "" || currentProduct?.price === null)
      return toast.error("Price is required!");
    if (currentProduct?.quantity === "" || currentProduct?.quantity === null)
      return toast.error("Quantity is required!");

    try {
      const payload = {
        assetId: Number(currentProduct.assetId),
        quantity: Number(currentProduct.quantity),
        price: Number(currentProduct.price),
        note: currentProduct.note,
        status: currentProduct.status,
        date: currentProduct.date,
        userId: userId,
        actorRole: role,
      };

      const res = await updateAssetsPurchase({
        id: currentProduct.Id,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated product!");
        setIsModalOpen(false);
        refetch?.();
      } else {
        toast.error(res?.message || "Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // Insert
  const [insertAssetsPurchase] = useInsertAssetsPurchaseMutation();
  const handleCreateProduct = async (e) => {
    e.preventDefault();

    if (!createProduct.assetId) return toast.error("Asset is required!");
    if (!createProduct.price) return toast.error("Price is required!");
    if (!createProduct.quantity) return toast.error("Quantity is required!");

    try {
      const payload = {
        assetId: Number(createProduct.assetId),
        quantity: Number(createProduct.quantity),
        price: Number(createProduct.price),
        date: createProduct.date,
        note: createProduct.note,
      };

      const res = await insertAssetsPurchase(payload).unwrap();
      if (res?.success) {
        toast.success("Successfully created product");
        setIsModalOpen1(false);
        setCreateProduct({
          assetId: "",
          price: "",
          quantity: "",
          note: "",
          date: new Date().toISOString().slice(0, 10),
        });
        refetch?.();
      } else {
        toast.error(res?.message || "Create failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  // Delete
  const [deleteAssetsPurchase] = useDeleteAssetsPurchaseMutation();
  const handleDeleteProduct = async (id) => {
    const confirmDelete = await requestDeleteConfirmation({
      message: "Do you want to delete this product?",
    });
    if (!confirmDelete) return toast.info("Delete action was cancelled.");

    try {
      const res = await deleteAssetsPurchase(id).unwrap();
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

  // Filters clear
  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setAssetId("");
  };

  // Pagination calculations
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

  // Select options (light)
  const productOptions = useMemo(
    () =>
      (assetsData || []).map((p) => ({
        value: String(p.Id),
        label: p.name,
      })),
    [assetsData],
  );

  // ✅ React-select styles (light like EmployeeTable)
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
    setIsNoteModalOpen(true);
  };

  const handleNoteModalClose = () => {
    setIsNoteModalOpen(false);
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
          onClick={handleAddProduct}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition px-4 py-2 rounded-xl shadow-sm font-semibold"
        >
          Add <Plus size={18} />
        </button>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2">
            <div className="flex items-center gap-2 text-slate-700">
              <ShoppingBasket size={18} className="text-amber-500" />
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

      {/* Filters */}
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
            options={productOptions}
            value={productOptions.find((o) => o.value === assetId) || null}
            onChange={(selected) =>
              setAssetId(selected?.value ? String(selected.value) : "")
            }
            placeholder="Select Assets"
            isClearable
            styles={selectStyles}
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
                "Name",
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
            {(products || []).map((product) => (
              <motion.tr
                key={product.Id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="hover:bg-slate-50"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                  {product.name}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(product.quantity || 0).toFixed(2)}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(product.price || 0).toFixed(2)}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(product.total || 0).toFixed(2)}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                      product.status === "Approved"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : product.status === "Active"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {product.status}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-3">
                    {/* <button
                      className={`relative h-10 w-10 rounded-md flex items-center justify-center hover:bg-slate-100 transition ${product.note ? 'text-indigo-600' : 'text-slate-400'}`}
                      title={product.note || "No note"}
                      type="button"
                      onClick={() => product.note && handleNoteClick(product.note)}
                    >
                      <Notebook size={18} />
                      {product.note && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500" />
                      )}
                    </button> */}

                    {product.note ? (
                      <div className="relative">
                        <button
                          className="relative h-10 w-10 rounded-md flex items-center justify-center"
                          title={product.note}
                          type="button"
                          onClick={() => handleNoteClick(product.note)}
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
                      onClick={() => handleEditClick(product)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-indigo-50 transition"
                      title="Edit"
                    >
                      <Edit size={18} className="text-indigo-600" />
                    </button>

                    {role === "superAdmin" || role === "admin" ? (
                      <button
                        onClick={() => handleDeleteProduct(product.Id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-rose-50 transition"
                        title="Delete"
                      >
                        <Trash2 size={18} className="text-rose-600" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEditClick1(product)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-rose-50 transition"
                        title="Delete Request / Note"
                      >
                        <Trash2 size={18} className="text-rose-600" />
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}

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
          className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition font-semibold"
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
              className={`px-4 py-2 rounded-xl border transition font-bold ${
                active
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
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
          className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition font-semibold"
        >
          Next
        </button>
      </div>

      {/* Note Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={handleNoteModalClose}
        title="Asset Purchase Note"
      >
        <div className="p-2">
          <p className="text-slate-600 leading-relaxed font-medium capitalize prose-slate">
            {noteContent}
          </p>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title="Edit Purchase Asset"
      >
        <div className="grid grid-cols-1 gap-5">
          <Field
            label="Date"
            type="date"
            value={currentProduct?.date}
            onChange={(v) => setCurrentProduct({ ...currentProduct, date: v })}
            required
          />
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
              Asset Name
            </label>
            <Select
              options={productOptions}
              value={
                currentProduct?.assetId
                  ? productOptions.find(
                      (o) => o.value === String(currentProduct.assetId),
                    ) || null
                  : null
              }
              onChange={(selected) =>
                setCurrentProduct({
                  ...currentProduct,
                  assetId: selected?.value || "",
                })
              }
              placeholder="Select Asset"
              isClearable
              isDisabled={isLoading2}
              styles={selectStyles}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Quantity"
              type="number"
              step="0.01"
              value={currentProduct?.quantity || ""}
              onChange={(v) =>
                setCurrentProduct({ ...currentProduct, quantity: v })
              }
            />
            <Field
              label="Unit Price"
              type="number"
              step="0.01"
              value={currentProduct?.price || ""}
              onChange={(v) =>
                setCurrentProduct({ ...currentProduct, price: v })
              }
            />
          </div>

          {role === "superAdmin" ? (
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
                Approval Status
              </label>
              <select
                value={currentProduct?.status || ""}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    status: e.target.value,
                  })
                }
                className="h-12 w-full px-4 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                required
              >
                <option value="">Select Status</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
                Internal Note
              </label>
              <textarea
                value={currentProduct?.note || ""}
                onChange={(e) =>
                  setCurrentProduct({ ...currentProduct, note: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                rows={4}
              />
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={handleModalClose}
            className="px-6 py-2.5 border border-slate-200 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateProduct}
            className="px-10 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-xl shadow-indigo-100"
          >
            Apply Changes
          </button>
        </div>
      </Modal>

      {/* Delete/Status Request Modal */}
      <Modal
        isOpen={isModalOpen2}
        onClose={handleModalClose2}
        title="Action Request / Note Update"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
              Asset Name
            </label>
            <Select
              options={productOptions}
              value={
                currentProduct?.assetId
                  ? productOptions.find(
                      (o) => o.value === String(currentProduct.assetId),
                    ) || null
                  : null
              }
              onChange={(selected) =>
                setCurrentProduct({
                  ...currentProduct,
                  assetId: selected?.value || "",
                })
              }
              placeholder="Select Asset"
              isClearable
              isDisabled={isLoading2}
              styles={selectStyles}
              className="w-full"
            />
          </div>
          {role === "superAdmin" ? (
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
                Status Overwrite
              </label>
              <select
                value={currentProduct?.status || ""}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    status: e.target.value,
                  })
                }
                className="h-12 w-full px-4 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                required
              >
                <option value="">Select Status</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
                Request Justification / Note
              </label>
              <textarea
                value={currentProduct?.note || ""}
                onChange={(e) =>
                  setCurrentProduct({ ...currentProduct, note: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                rows={4}
                placeholder="Reason for deletion request or updated notes..."
              />
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={handleModalClose2}
            className="px-6 py-2.5 border border-slate-200 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateProduct1}
            className="px-10 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-xl shadow-indigo-100"
          >
            Submit Request
          </button>
        </div>
      </Modal>

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen1}
        onClose={handleModalClose1}
        title="Record New Asset Purchase"
      >
        <form onSubmit={handleCreateProduct} className="grid grid-cols-1 gap-5">
          <Field
            label="Purchase Date"
            type="date"
            value={createProduct.date}
            onChange={(v) => setCreateProduct({ ...createProduct, date: v })}
            required
          />

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
              Asset Name
            </label>
            <Select
              options={productOptions}
              value={
                createProduct.assetId
                  ? productOptions.find(
                      (o) => o.value === String(createProduct.assetId),
                    ) || null
                  : null
              }
              onChange={(selected) =>
                setCreateProduct({
                  ...createProduct,
                  assetId: selected?.value || "",
                })
              }
              placeholder="Select Asset"
              isClearable
              isDisabled={isLoading2}
              styles={selectStyles}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Quantity"
              type="number"
              step="0.01"
              value={createProduct.quantity}
              onChange={(v) =>
                setCreateProduct({ ...createProduct, quantity: v })
              }
              required
              placeholder=""
            />
            <Field
              label="Unit Price"
              type="number"
              step="0.01"
              value={createProduct.price}
              onChange={(v) => setCreateProduct({ ...createProduct, price: v })}
              required
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
              Additional Note
            </label>
            <textarea
              value={createProduct.note}
              onChange={(v) =>
                setCreateProduct({ ...createProduct, note: v.target.value })
              }
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              rows={3}
              placeholder="Vendor details or serial numbers..."
            />
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleModalClose1}
              className="px-6 py-2.5 border border-slate-200 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-xl shadow-indigo-100"
            >
              Create Record
            </button>
          </div>
        </form>
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
  placeholder,
}) => (
  <div>
    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
      {label}
    </label>
    <input
      type={type}
      step={step}
      value={value ?? ""}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      readOnly={readOnly}
      required={required}
      placeholder={placeholder}
      className={`h-12 w-full px-4 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition ${
        readOnly ? "opacity-70 cursor-not-allowed" : ""
      }`}
    />
  </div>
);

export default AssetsPurchaseTable;
