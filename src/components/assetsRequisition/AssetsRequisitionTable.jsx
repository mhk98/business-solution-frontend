// import { motion } from "framer-motion";
// import { Edit, Notebook, Plus, ShoppingBasket, Trash2, X } from "lucide-react";
// import { useEffect, useMemo, useState } from "react";
// import toast from "react-hot-toast";
// import Select from "react-select";
// import {
//   useDeleteAssetsRequisitionMutation,
//   useGetAllAssetsRequisitionQuery,
//   useInsertAssetsRequisitionMutation,
//   useUpdateAssetsRequisitionMutation,
// } from "../../features/assetsRequisition/assetsRequisition";
// import Modal from "../common/Modal";
// import { useLayout } from "../../context/LayoutContext";
// import { translations } from "../../utils/translations";

// const AssetsRequisitionTable = () => {
//   const { language } = useLayout();
//   const t = translations[language] || translations.EN;
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [isModalOpen1, setIsModalOpen1] = useState(false);

//   const role = localStorage.getItem("role");
//   const userId = localStorage.getItem("userId");

//   const [currentProduct, setCurrentProduct] = useState(null);

//   const [createProduct, setCreateProduct] = useState({
//     name: "",
//     price: "",
//     quantity: "",
//     note: "",
//     status: "",
//     userId: "",
//     date: new Date().toISOString().slice(0, 10),
//   });

//   const [products, setProducts] = useState([]);

//   // Filters
//   const [startDate, setStartDate] = useState("");
//   const [endDate, setEndDate] = useState("");

//   // store selected name
//   const [name, setName] = useState("");

//   // ✅ Per-page user selectable (EmployeeTable like)
//   const [itemsPerPage, setItemsPerPage] = useState(10);

//   // Pagination
//   const [currentPage, setCurrentPage] = useState(1);
//   const [startPage, setStartPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [pagesPerSet, setPagesPerSet] = useState(10);

//   // All products for select
//   const [productsData, setProductsData] = useState([]);

//   const {
//     data: data2,
//     isLoading: isLoading2,
//     isError: isError2,
//     error: error2,
//   } = useGetAllAssetsRequisitionQuery();

//   useEffect(() => {
//     if (isError2) {
//       console.error("Error fetching products", error2);
//     } else if (!isLoading2 && data2) {
//       setProductsData(data2.data || []);
//     }
//   }, [data2, isLoading2, isError2, error2]);

//   // Responsive pagesPerSet
//   useEffect(() => {
//     const updatePagesPerSet = () => {
//       if (window.innerWidth < 640) setPagesPerSet(5);
//       else if (window.innerWidth < 1024) setPagesPerSet(7);
//       else setPagesPerSet(10);
//     };

//     updatePagesPerSet();
//     window.addEventListener("resize", updatePagesPerSet);
//     return () => window.removeEventListener("resize", updatePagesPerSet);
//   }, []);

//   // filter change হলে page reset
//   useEffect(() => {
//     setCurrentPage(1);
//     setStartPage(1);
//   }, [startDate, endDate, name, itemsPerPage]);

//   // startDate > endDate হলে endDate ঠিক করে দেবে
//   useEffect(() => {
//     if (startDate && endDate && startDate > endDate) {
//       setEndDate(startDate);
//     }
//   }, [startDate, endDate]);

//   // Query args
//   const queryArgs = useMemo(() => {
//     const args = {
//       page: currentPage,
//       limit: itemsPerPage,
//       startDate: startDate || undefined,
//       endDate: endDate || undefined,
//       name: name || undefined,
//     };

//     Object.keys(args).forEach((k) => {
//       if (args[k] === undefined || args[k] === null || args[k] === "")
//         delete args[k];
//     });

//     return args;
//   }, [currentPage, itemsPerPage, startDate, endDate, name]);

//   const { data, isLoading, isError, error, refetch } =
//     useGetAllAssetsRequisitionQuery(queryArgs);

//   useEffect(() => {
//     if (isError) {
//       console.error("Error fetching product data", error);
//     } else if (!isLoading && data) {
//       setProducts(data.data || []);
//       setTotalPages(Math.ceil((data?.meta?.count || 0) / itemsPerPage) || 1);
//     }
//   }, [data, isLoading, isError, error, currentPage, itemsPerPage]);

//   // Modals
//   const handleModalClose = () => setIsModalOpen(false);
//   const handleAddProduct = () => setIsModalOpen1(true);
//   const handleModalClose1 = () => setIsModalOpen1(false);

//   const [updateAssetsRequisition] = useUpdateAssetsRequisitionMutation();
//   const [isModalOpen2, setIsModalOpen2] = useState(false);
//   const handleModalClose2 = () => setIsModalOpen2(false);

//   const handleEditClick1 = (product) => {
//     setCurrentProduct({
//       ...product,
//       price: product.price ?? "",
//       note: product.note ?? "",
//       status: product.status ?? "",
//       quantity: product.quantity ?? "",
//       userId: userId,
//     });
//     setIsModalOpen2(true);
//   };

//   const handleUpdateProduct1 = async () => {
//     if (!currentProduct?.Id) return toast.error("Invalid item!");
//     if (currentProduct?.note === "" || currentProduct?.note === null)
//       return toast.error("Note is required!");

//     try {
//       const payload = {
//         name: currentProduct.name.trim(),
//         quantity: Number(currentProduct.quantity),
//         price: Number(currentProduct.price),
//         note: currentProduct.note,
//         status: currentProduct.status,
//         userId: userId,
//         actorRole: role,
//       };

//       const res = await updateAssetsRequisition({
//         id: currentProduct.Id,
//         data: payload,
//       }).unwrap();

//       if (res?.success) {
//         toast.success("Successfully updated product!");
//         setIsModalOpen2(false);
//         refetch?.();
//       } else {
//         toast.error(res?.message || "Update failed!");
//       }
//     } catch (err) {
//       toast.error(err?.data?.message || "Update failed!");
//     }
//   };

//   const handleEditClick = async (product) => {
//     setCurrentProduct({
//       ...product,
//       price: product.price ?? "",
//       note: product.note ?? "",
//       status: product.status ?? "",
//       quantity: product.quantity ?? "",
//       date: product.date ?? "",
//       userId: userId,
//     });
//     setIsModalOpen(true);
//   };

//   const handleUpdateProduct = async () => {
//     if (!currentProduct?.Id) return toast.error("Invalid item!");
//     if (!currentProduct?.name?.trim()) return toast.error("Name is required!");
//     if (currentProduct?.price === "" || currentProduct?.price === null)
//       return toast.error("Price is required!");
//     if (currentProduct?.quantity === "" || currentProduct?.quantity === null)
//       return toast.error("Quantity is required!");

//     try {
//       const payload = {
//         name: currentProduct.name.trim(),
//         quantity: Number(currentProduct.quantity),
//         price: Number(currentProduct.price),
//         note: currentProduct.note,
//         status: currentProduct.status,
//         date: currentProduct.date,
//         userId: userId,
//         actorRole: role,
//       };

//       const res = await updateAssetsRequisition({
//         id: currentProduct.Id,
//         data: payload,
//       }).unwrap();

//       if (res?.success) {
//         toast.success("Successfully updated product!");
//         setIsModalOpen(false);
//         refetch?.();
//       } else {
//         toast.error(res?.message || "Update failed!");
//       }
//     } catch (err) {
//       toast.error(err?.data?.message || "Update failed!");
//     }
//   };

//   // Insert
//   const [insertAssetsRequisition] = useInsertAssetsRequisitionMutation();
//   const handleCreateProduct = async (e) => {
//     e.preventDefault();

//     if (!createProduct.name?.trim()) return toast.error("Name is required!");
//     if (!createProduct.price) return toast.error("Price is required!");
//     if (!createProduct.quantity) return toast.error("Quantity is required!");

//     try {
//       const payload = {
//         name: createProduct.name.trim(),
//         quantity: Number(createProduct.quantity),
//         price: Number(createProduct.price),
//         note: createProduct.note,
//         date: createProduct.date,
//         userId,
//       };

//       const res = await insertAssetsRequisition(payload).unwrap();
//       if (res?.success) {
//         toast.success("Successfully created product");
//         setIsModalOpen1(false);
//         setCreateProduct({
//           name: "",
//           price: "",
//           quantity: "",
//           note: "",
//           date: "",
//         });
//         refetch?.();
//       } else {
//         toast.error(res?.message || "Create failed!");
//       }
//     } catch (err) {
//       toast.error(err?.data?.message || "Create failed!");
//     }
//   };

//   // Delete
//   const [deleteAssetsRequisition] = useDeleteAssetsRequisitionMutation();
//   const handleDeleteProduct = async (id) => {
//     const confirmDelete = await requestDeleteConfirmation({ message: "Do you want to delete this product?" });
//     if (!confirmDelete) return toast.info("Delete action was cancelled.");

//     try {
//       const res = await deleteAssetsRequisition(id).unwrap();
//       if (res?.success) {
//         toast.success("Product deleted successfully!");
//         refetch?.();
//       } else {
//         toast.error(res?.message || "Delete failed!");
//       }
//     } catch (err) {
//       toast.error(err?.data?.message || "Delete failed!");
//     }
//   };

//   // Filters clear
//   const clearFilters = () => {
//     setStartDate("");
//     setEndDate("");
//     setName("");
//   };

//   // Pagination calculations
//   const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

//   const handlePageChange = (pageNumber) => {
//     setCurrentPage(pageNumber);
//     if (pageNumber < startPage) setStartPage(pageNumber);
//     else if (pageNumber > endPage) setStartPage(pageNumber - pagesPerSet + 1);
//   };

//   const handlePreviousSet = () =>
//     setStartPage((prev) => Math.max(prev - pagesPerSet, 1));

//   const handleNextSet = () =>
//     setStartPage((prev) =>
//       Math.min(prev + pagesPerSet, Math.max(totalPages - pagesPerSet + 1, 1)),
//     );

//   // Select options (light)
//   const productOptions = useMemo(
//     () =>
//       (productsData || []).map((p) => ({
//         value: p.name,
//         label: p.name,
//       })),
//     [productsData],
//   );

//   // ✅ React-select styles (light like EmployeeTable)
//   const selectStyles = useMemo(
//     () => ({
//       control: (base, state) => ({
//         ...base,
//         minHeight: 44,
//         borderRadius: 12,
//         borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0",
//         boxShadow: state.isFocused
//           ? "0 0 0 4px rgba(99, 102, 241, 0.15)"
//           : "none",
//         "&:hover": { borderColor: state.isFocused ? "#c7d2fe" : "#cbd5e1" },
//       }),
//       valueContainer: (base) => ({ ...base, padding: "0 12px" }),
//       placeholder: (base) => ({ ...base, color: "#64748b" }),
//       singleValue: (base) => ({ ...base, color: "#0f172a" }),
//       menu: (base) => ({
//         ...base,
//         borderRadius: 12,
//         overflow: "hidden",
//         zIndex: 60,
//       }),
//       option: (base, state) => ({
//         ...base,
//         backgroundColor: state.isSelected
//           ? "rgba(99, 102, 241, 0.12)"
//           : state.isFocused
//             ? "#f8fafc"
//             : "#fff",
//         color: "#0f172a",
//       }),
//     }),
//     [],
//   );

//   const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
//   const [noteContent, setNoteContent] = useState("");

//   const handleNoteClick = (note) => {
//     setNoteContent(note);
//     setIsNoteModalOpen(true); // Open the modal
//   };

//   const handleNoteModalClose = () => {
//     setIsNoteModalOpen(false); // Close the modal
//   };

//   return (
//     <motion.div
//       className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ delay: 0.2 }}
//     >
//       {/* Top actions */}
//       <div className="my-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <button
//           type="button"
//           onClick={handleAddProduct}
//           className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition px-4 py-2 rounded-xl shadow-sm"
//         >
//           {t.add} <Plus size={18} />
//         </button>

//         <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2">
//           <div className="flex items-center gap-2 text-slate-700">
//             <ShoppingBasket size={18} className="text-amber-500" />
//             <span className="text-sm">{t.total_purchase}</span>
//           </div>

//           <span className="text-slate-900 font-semibold tabular-nums">
//             {isLoading ? "..." : data?.meta?.totalQuantity}
//           </span>
//         </div>
//       </div>

//       {/* Filters */}
//       <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6 w-full justify-center mx-auto">
//         <div className="flex flex-col">
//           <label className="text-sm text-slate-600 mb-1">{t.from}</label>
//           <input
//             type="date"
//             value={startDate}
//             onChange={(e) => setStartDate(e.target.value)}
//             className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
//           />
//         </div>

//         <div className="flex flex-col">
//           <label className="text-sm text-slate-600 mb-1">{t.to}</label>
//           <input
//             type="date"
//             value={endDate}
//             onChange={(e) => setEndDate(e.target.value)}
//             className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
//           />
//         </div>

//         <div className="flex items-center justify-center md:mt-0">
//           <Select
//             options={productOptions}
//             value={productOptions.find((o) => o.value === name) || null}
//             onChange={(selected) =>
//               setName(selected?.value ? String(selected.value) : "")
//             }
//             placeholder={t.select_assets}
//             isClearable
//             styles={selectStyles}
//             className="w-full"
//           />
//         </div>

//         <div className="flex flex-col">
//           <label className="text-sm text-slate-600 mb-1">{t.per_page}</label>
//           <Select
//             options={[10, 20, 50, 100].map((v) => ({
//               value: v,
//               label: String(v),
//             }))}
//             value={{ value: itemsPerPage, label: String(itemsPerPage) }}
//             onChange={(selected) => {
//               setItemsPerPage(selected?.value || 10);
//               setCurrentPage(1);
//               setStartPage(1);
//             }}
//             className="text-black"
//             styles={selectStyles}
//           />
//         </div>

//         <button
//           className="inline-flex items-center justify-center bg-white hover:bg-slate-50 text-slate-700 transition px-4 py-[10px] rounded-xl border border-slate-200"
//           onClick={clearFilters}
//         >
//           {t.clear_filters}
//         </button>
//       </div>

//       {/* Table */}
//       <div className="overflow-x-auto rounded-xl border border-slate-200">
//         <table className="min-w-full divide-y divide-slate-200">
//           <thead className="bg-slate-50">
//             <tr>
//               {[
//                 t.date,
//                 t.name,
//                 t.quantity,
//                 t.price,
//                 t.total_price,
//                 t.status,
//                 t.actions,
//               ].map((h) => (
//                 <th
//                   key={h}
//                   className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
//                 >
//                   {h}
//                 </th>
//               ))}
//             </tr>
//           </thead>

//           <tbody className="divide-y divide-slate-200 bg-white">
//             {(products || []).map((product) => (
//               <motion.tr
//                 key={product.Id}
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 transition={{ duration: 0.25 }}
//                 className="hover:bg-slate-50"
//               >
//                 <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
//                   {product.date}
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
//                   {product.name}
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
//                   {Number(product.quantity || 0).toFixed(2)}
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
//                   {Number(product.price || 0).toFixed(2)}
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
//                   {Number(product.total || 0).toFixed(2)}
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
//                   <span
//                     className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${product.status === "Approved"
//                       ? "bg-emerald-50 text-emerald-700 border-emerald-200"
//                       : product.status === "Active"
//                         ? "bg-blue-50 text-blue-700 border-blue-200" // New color for Active
//                         : "bg-amber-50 text-amber-700 border-amber-200"
//                       }`}
//                   >
//                     {t[product.status.toLowerCase()] || product.status}
//                   </span>
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
//                   <div className="flex items-center gap-3">
//                     {product.note ? (
//                       <div className="relative">
//                         <button
//                           className="relative h-10 w-10 rounded-md flex items-center justify-center"
//                           title={product.note}
//                           type="button"
//                           onClick={() => handleNoteClick(product.note)}
//                         >
//                           <Notebook size={18} className="text-slate-700" />
//                         </button>

//                         <span className="absolute top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
//                           1
//                         </span>
//                       </div>
//                     ) : (
//                       <button
//                         className="h-10 w-10 rounded-md flex items-center justify-center cursor-default"
//                         title="No note available"
//                         type="button"
//                       >
//                         <Notebook size={18} className="text-slate-300" />
//                       </button>
//                     )}

//                     <button
//                       onClick={() => handleEditClick(product)}
//                       className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-indigo-50 transition"
//                       title="Edit"
//                     >
//                       <Edit size={18} className="text-indigo-600" />
//                     </button>

//                     {role === "superAdmin" || role === "admin" ? (
//                       <button
//                         onClick={() => handleDeleteProduct(product.Id)}
//                         className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-rose-50 transition"
//                         title="Delete"
//                       >
//                         <Trash2 size={18} className="text-rose-600" />
//                       </button>
//                     ) : (
//                       <button
//                         onClick={() => handleEditClick1(product)}
//                         className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-rose-50 transition"
//                         title="Delete Request / Note"
//                       >
//                         <Trash2 size={18} className="text-rose-600" />
//                       </button>
//                     )}
//                   </div>
//                 </td>
//               </motion.tr>
//             ))}

//             {!isLoading && products.length === 0 && (
//               <tr>
//                 <td
//                   colSpan={6}
//                   className="px-6 py-6 text-center text-sm text-slate-600"
//                 >
//                   {t.no_data_found}
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Pagination */}
//       <div className="flex items-center justify-center flex-wrap gap-2 mt-6">
//         <button
//           onClick={handlePreviousSet}
//           disabled={startPage === 1}
//           className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
//         >
//           {t.prev}
//         </button>

//         {[...Array(endPage - startPage + 1)].map((_, index) => {
//           const pageNum = startPage + index;
//           const active = pageNum === currentPage;
//           return (
//             <button
//               key={pageNum}
//               onClick={() => handlePageChange(pageNum)}
//               className={`px-4 py-2 rounded-xl border transition ${active
//                 ? "bg-indigo-600 text-white border-indigo-600"
//                 : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
//                 }`}
//             >
//               {pageNum}
//             </button>
//           );
//         })}

//         <button
//           onClick={handleNextSet}
//           disabled={endPage === totalPages}
//           className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
//         >
//           {t.next}
//         </button>
//       </div>

//       {/* ✅ Note View Modal */}
//       <Modal
//         isOpen={isNoteModalOpen}
//         onClose={handleNoteModalClose}
//         title={t.note_content}
//       >
//         <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6">
//           <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
//             {noteContent || t.no_data_found}
//           </p>
//         </div>
//         <div className="flex justify-end">
//           <button
//             onClick={handleNoteModalClose}
//             className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition"
//           >
//             {t.close}
//           </button>
//         </div>
//       </Modal>

//       {/* ✅ Edit Modal */}
//       <Modal
//         isOpen={isModalOpen}
//         onClose={handleModalClose}
//         title={t.edit_purchase_requisition}
//         maxWidth="max-w-2xl"
//       >
//         <div className="space-y-4">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <Field
//               label={t.date}
//               type="date"
//               value={currentProduct?.date}
//               onChange={(v) =>
//                 setCurrentProduct({ ...currentProduct, date: v })
//               }
//               required
//             />
//             <Field
//               label={t.name}
//               value={currentProduct?.name || ""}
//               onChange={(v) =>
//                 setCurrentProduct({ ...currentProduct, name: v })
//               }
//               required
//             />
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <Field
//               label={t.quantity}
//               type="number"
//               step="0.01"
//               value={currentProduct?.quantity || ""}
//               onChange={(v) =>
//                 setCurrentProduct({ ...currentProduct, quantity: v })
//               }
//               required
//             />
//             <Field
//               label={t.price}
//               type="number"
//               step="0.01"
//               value={currentProduct?.price || ""}
//               onChange={(v) =>
//                 setCurrentProduct({ ...currentProduct, price: v })
//               }
//               required
//             />
//           </div>

//           <div className="space-y-4 pt-2">
//             {role === "superAdmin" ? (
//               <div>
//                 <label className="block text-sm font-medium text-slate-700 mb-1">{t.status}</label>
//                 <select
//                   value={currentProduct?.status || ""}
//                   onChange={(e) =>
//                     setCurrentProduct({
//                       ...currentProduct,
//                       status: e.target.value,
//                     })
//                   }
//                   className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
//                   required
//                 >
//                   <option value="">{t.select_status || "Select Status"}</option>
//                   <option value="Approved">{t.approved}</option>
//                   <option value="Pending">{t.pending}</option>
//                 </select>
//               </div>
//             ) : (
//               <div>
//                 <label className="block text-sm font-medium text-slate-700 mb-1">{t.note}</label>
//                 <textarea
//                   value={currentProduct?.note || ""}
//                   onChange={(e) =>
//                     setCurrentProduct({
//                       ...currentProduct,
//                       note: e.target.value,
//                     })
//                   }
//                   className="min-h-[100px] border border-slate-200 rounded-xl p-3 w-full text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
//                   rows={3}
//                 />
//               </div>
//             )}
//           </div>

//           <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
//             <button
//               type="button"
//               className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
//               onClick={handleModalClose}
//             >
//               {t.cancel}
//             </button>
//             <button
//               className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition"
//               onClick={handleUpdateProduct}
//             >
//               {t.save_changes}
//             </button>
//           </div>
//         </div>
//       </Modal>

//       {/* ✅ Delete Request / Status Modal */}
//       <Modal
//         isOpen={isModalOpen2}
//         onClose={handleModalClose2}
//         title={t.update_request_note}
//         maxWidth="max-w-xl"
//       >
//         <div className="space-y-6">
//           {role === "superAdmin" ? (
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">{t.status}</label>
//               <select
//                 value={currentProduct?.status || ""}
//                 onChange={(e) =>
//                   setCurrentProduct({
//                     ...currentProduct,
//                     status: e.target.value,
//                   })
//                 }
//                 className="h-12 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
//               >
//                 <option value="">{t.select_status || "Select Status"}</option>
//                 <option value="Approved">{t.approved}</option>
//                 <option value="Pending">{t.pending}</option>
//               </select>
//             </div>
//           ) : (
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">{t.note}</label>
//               <textarea
//                 value={currentProduct?.note || ""}
//                 onChange={(e) =>
//                   setCurrentProduct({
//                     ...currentProduct,
//                     note: e.target.value,
//                   })
//                 }
//                 className="min-h-[120px] border border-slate-200 rounded-xl p-3 w-full text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
//                 rows={4}
//                 placeholder="Enter note for delete request..."
//               />
//             </div>
//           )}

//           <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
//             <button
//               type="button"
//               className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
//               onClick={handleModalClose2}
//             >
//               {t.cancel}
//             </button>
//             <button
//               className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition"
//               onClick={handleUpdateProduct1}
//             >
//               {t.save_changes}
//             </button>
//           </div>
//         </div>
//       </Modal>

//       {/* ✅ Add Modal */}
//       <Modal
//         isOpen={isModalOpen1}
//         onClose={handleModalClose1}
//         title={t.add_purchase_requisition}
//         maxWidth="max-w-2xl"
//       >
//         <form onSubmit={handleCreateProduct} className="space-y-4">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <Field
//               label={t.date}
//               type="date"
//               value={createProduct.date}
//               onChange={(v) =>
//                 setCreateProduct({ ...createProduct, date: v })
//               }
//               required
//             />
//             <Field
//               label={t.name}
//               value={createProduct.name}
//               onChange={(v) =>
//                 setCreateProduct({ ...createProduct, name: v })
//               }
//               required
//             />
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <Field
//               label={t.quantity}
//               type="number"
//               step="0.01"
//               value={createProduct.quantity}
//               onChange={(v) =>
//                 setCreateProduct({ ...createProduct, quantity: v })
//               }
//               required
//             />
//             <Field
//               label={t.price}
//               type="number"
//               step="0.01"
//               value={createProduct.price}
//               onChange={(v) =>
//                 setCreateProduct({ ...createProduct, price: v })
//               }
//               required
//             />
//           </div>

//           <div>
//             <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">{t.additional_note}</label>
//             <textarea
//               value={createProduct.note}
//               onChange={(v) => setCreateProduct({ ...createProduct, note: v.target.value })}
//               className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
//               rows={3}
//               placeholder={t.vendor_details}
//             />
//           </div>

//           <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
//             <button
//               type="button"
//               className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
//               onClick={handleModalClose1}
//             >
//               {t.cancel}
//             </button>
//             <button
//               type="submit"
//               className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition"
//             >
//               {t.create_requisition}
//             </button>
//           </div>
//         </form>
//       </Modal>
//     </motion.div >
//   );
// };

// const Field = ({
//   label,
//   value,
//   onChange,
//   type = "text",
//   step,
//   readOnly,
//   required,
// }) => (
//   <div>
//     <label className="block text-sm text-slate-700">{label}</label>
//     <input
//       type={type}
//       step={step}
//       value={value ?? ""}
//       onChange={(e) => onChange(e.target.value)}
//       readOnly={readOnly}
//       required={required}
//       className={`border border-slate-200 rounded-xl p-3 w-full mt-1 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200 ${readOnly ? "text-slate-900 opacity-80" : "text-slate-900"
//         }`}
//     />
//   </div>
// );

// export default AssetsRequisitionTable;

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
import {
  useDeleteAssetsRequisitionMutation,
  useGetAllAssetsRequisitionQuery,
  useInsertAssetsRequisitionMutation,
  useUpdateAssetsRequisitionMutation,
} from "../../features/assetsRequisition/assetsRequisition";

import Modal from "../common/Modal";
import DateRangeFilter from "../common/DateRangeFilter";
import { useLayout } from "../../context/LayoutContext";
import { translations } from "../../utils/translations";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import {
  useGetAllAssetWithoutQueryQuery,
  useDeleteAssetMutation,
  useInsertAssetMutation,
} from "../../features/assets/assets";

const formatNumber = (value) => Number(value || 0).toLocaleString();
const formatCurrency = (value) => `৳${Number(value || 0).toLocaleString()}`;

const AssetsRequisitionTable = () => {
  const { language } = useLayout();
  const t = translations[language] || translations.EN;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen1, setIsModalOpen1] = useState(false);
  const [isModalOpen2, setIsModalOpen2] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");

  const [currentProduct, setCurrentProduct] = useState(null);
  const [noteContent, setNoteContent] = useState("");

  const [createProduct, setCreateProduct] = useState({
    name: "",
    price: "",
    quantity: "",
    note: "",
    status: "",
    userId: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const [products, setProducts] = useState([]);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [name, setName] = useState("");

  // Per-page
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

  // Assets states
  const [assets, setAssets] = useState([]);
  const [isNewAssetAdd, setIsNewAssetAdd] = useState(false);
  const [newAssetNameAdd, setNewAssetNameAdd] = useState("");
  const [isNewAssetEdit, setIsNewAssetEdit] = useState(false);
  const [newAssetNameEdit, setNewAssetNameEdit] = useState("");

  // Assets fetch
  const {
    data: assetRes,
    isLoading: assetLoading,
    isError: isAssetError,
    error: assetError,
  } = useGetAllAssetWithoutQueryQuery();

  useEffect(() => {
    if (isAssetError) {
      console.error("Error fetching assets", assetError);
    } else if (!assetLoading && assetRes) {
      setAssets(assetRes?.data || []);
    }
  }, [assetRes, assetLoading, isAssetError, assetError]);

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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [startDate, endDate, name, itemsPerPage]);

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
      name: name || undefined,
    };

    Object.keys(args).forEach((k) => {
      if (args[k] === undefined || args[k] === null || args[k] === "") {
        delete args[k];
      }
    });

    return args;
  }, [currentPage, itemsPerPage, startDate, endDate, name]);

  const { data, isLoading, isError, error, refetch } =
    useGetAllAssetsRequisitionQuery(queryArgs);

  useEffect(() => {
    if (isError) {
      console.error("Error fetching product data", error);
    } else if (!isLoading && data) {
      setProducts(data?.data || []);
      setTotalPages(Math.ceil((data?.meta?.count || 0) / itemsPerPage) || 1);
    }
  }, [data, isLoading, isError, error, itemsPerPage]);

  // Asset mutation
  const [insertAsset, { isLoading: isAddingAsset }] = useInsertAssetMutation();
  const [deleteAsset] = useDeleteAssetMutation();

  const addAssetByName = async (name) => {
    const n = String(name || "").trim();

    if (!n) {
      toast.error("New asset name is required!");
      return null;
    }

    try {
      const res = await insertAsset({ name: n }).unwrap();

      if (res?.success) {
        setAssets((prev) => {
          const exists = prev.some(
            (a) =>
              String(a?.name || "")
                .trim()
                .toLowerCase() === n.toLowerCase(),
          );
          if (exists) return prev;
          return [...prev, res?.data || { name: n }];
        });

        return n;
      }

      toast.error(res?.message || "Asset add failed!");
      return null;
    } catch (err) {
      toast.error(err?.data?.message || "Asset add failed!");
      return null;
    }
  };

  // Modals
  const handleModalClose = () => {
    setIsModalOpen(false);
    setCurrentProduct(null);
    setIsNewAssetEdit(false);
    setNewAssetNameEdit("");
  };

  const handleAddProduct = () => setIsModalOpen1(true);

  const handleModalClose1 = () => {
    setIsModalOpen1(false);
    setIsNewAssetAdd(false);
    setNewAssetNameAdd("");
  };

  const handleModalClose2 = () => {
    setIsModalOpen2(false);
    setCurrentProduct(null);
  };

  // Update
  const [updateAssetsRequisition] = useUpdateAssetsRequisitionMutation();

  const handleEditClick1 = (product) => {
    setCurrentProduct({
      ...product,
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
    if (currentProduct?.note === "" || currentProduct?.note === null)
      return toast.error("Note is required!");

    try {
      const payload = {
        name: currentProduct.name.trim(),
        quantity: Number(currentProduct.quantity),
        price: Number(currentProduct.price),
        note: currentProduct.note,
        status: currentProduct.status,
        userId: userId,
        actorRole: role,
      };

      const res = await updateAssetsRequisition({
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
      price: product.price ?? "",
      note: product.note ?? "",
      status: product.status ?? "",
      quantity: product.quantity ?? "",
      date: product.date ?? "",
      userId: userId,
    });
    setIsNewAssetEdit(false);
    setNewAssetNameEdit("");
    setIsModalOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!currentProduct?.Id) return toast.error("Invalid item!");
    if (!currentProduct?.name?.trim() && !isNewAssetEdit)
      return toast.error("Name is required!");
    if (currentProduct?.price === "" || currentProduct?.price === null)
      return toast.error("Price is required!");
    if (currentProduct?.quantity === "" || currentProduct?.quantity === null)
      return toast.error("Quantity is required!");

    try {
      let finalAssetName = currentProduct.name;

      if (isNewAssetEdit) {
        const createdAssetName = await addAssetByName(newAssetNameEdit);
        if (!createdAssetName) return;
        finalAssetName = createdAssetName;
      }

      const payload = {
        name: String(finalAssetName || "").trim(),
        quantity: Number(currentProduct.quantity),
        price: Number(currentProduct.price),
        note: currentProduct.note,
        status: currentProduct.status,
        date: currentProduct.date,
        userId: userId,
        actorRole: role,
      };

      const res = await updateAssetsRequisition({
        id: currentProduct.Id,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated product!");
        setIsModalOpen(false);
        setCurrentProduct(null);
        setIsNewAssetEdit(false);
        setNewAssetNameEdit("");
        refetch?.();
      } else {
        toast.error(res?.message || "Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // Insert requisition
  const [insertAssetsRequisition] = useInsertAssetsRequisitionMutation();

  const handleCreateProduct = async (e) => {
    e.preventDefault();

    if (!createProduct.name?.trim() && !isNewAssetAdd)
      return toast.error("Name is required!");
    if (!createProduct.price) return toast.error("Price is required!");
    if (!createProduct.quantity) return toast.error("Quantity is required!");

    try {
      let finalAssetName = createProduct.name;

      if (isNewAssetAdd) {
        const createdAssetName = await addAssetByName(newAssetNameAdd);
        if (!createdAssetName) return;
        finalAssetName = createdAssetName;
      }

      const payload = {
        name: String(finalAssetName || "").trim(),
        quantity: Number(createProduct.quantity),
        price: Number(createProduct.price),
        note: createProduct.note,
        date: createProduct.date,
        userId,
      };

      const res = await insertAssetsRequisition(payload).unwrap();

      if (res?.success) {
        toast.success("Successfully created product");
        setIsModalOpen1(false);
        setIsNewAssetAdd(false);
        setNewAssetNameAdd("");
        setCreateProduct({
          name: "",
          price: "",
          quantity: "",
          note: "",
          status: "",
          userId: "",
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
  const [deleteAssetsRequisition] = useDeleteAssetsRequisitionMutation();

  const handleDeleteProduct = async (id) => {
    const confirmDelete = await requestDeleteConfirmation({ message: "Do you want to delete this product?" });
    if (!confirmDelete) return toast.info("Delete action was cancelled.");

    try {
      const res = await deleteAssetsRequisition(id).unwrap();
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
    setName("");
  };

  // Pagination
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

  // Asset dropdown options
  const assetOptions = useMemo(() => {
    const seen = new Set();

    return (assets || [])
      .map((a) => ({
        value: a.name,
        label: a.name,
        assetId: a.Id,
      }))
      .filter((item) => {
        const key = String(item.value || "")
          .trim()
          .toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [assets]);

  const assetSelectOptions = useMemo(
    () => [...assetOptions, { value: "__new__", label: "+ New Asset" }],
    [assetOptions],
  );

  const handleDeleteAssetOption = async (assetOption) => {
    if (!assetOption?.assetId) return;

    const confirmDelete = await requestDeleteConfirmation({
      message: `Do you want to delete "${assetOption.label}"?`,
    });
    if (!confirmDelete) return toast.info("Delete action was cancelled.");

    try {
      const res = await deleteAsset(assetOption.assetId).unwrap();

      if (res?.success !== false) {
        toast.success("Asset deleted successfully!");
        setAssets((prev) =>
          prev.filter((asset) => Number(asset.Id) !== Number(assetOption.assetId)),
        );
        setCreateProduct((prev) =>
          prev.name === assetOption.value ? { ...prev, name: "" } : prev,
        );
        setCurrentProduct((prev) =>
          prev?.name === assetOption.value ? { ...prev, name: "" } : prev,
        );
      } else {
        toast.error(res?.message || "Asset delete failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Asset delete failed!");
    }
  };

  const formatAssetOptionLabel = (option, { context }) => {
    if (option.value === "__new__" || context !== "menu") return option.label;

    return (
      <div className="flex items-center justify-between gap-3">
        <span className="truncate">{option.label}</span>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleDeleteAssetOption(option);
          }}
          className="shrink-0 rounded-md p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
          title="Delete asset"
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  };

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

  const handleNoteClick = (note) => {
    setNoteContent(note);
    setIsNoteModalOpen(true);
  };

  const handleNoteModalClose = () => {
    setIsNoteModalOpen(false);
    setNoteContent("");
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
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition px-4 py-2 rounded-xl shadow-sm"
        >
          {t.add} <Plus size={18} />
        </button>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2">
            <div className="flex items-center gap-2 text-slate-700">
              <ShoppingBasket size={18} className="text-amber-500" />
              <span className="text-sm">Total Quantity</span>
            </div>

            <span className="text-slate-900 font-semibold tabular-nums">
              {isLoading ? "..." : formatNumber(data?.meta?.totalQuantity)}
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2">
            <div className="flex items-center gap-2 text-slate-700">
              <BadgeDollarSign size={18} className="text-emerald-500" />
              <span className="text-sm">Total Amount</span>
            </div>

            <span className="text-slate-900 font-semibold tabular-nums">
              {isLoading ? "..." : formatCurrency(data?.meta?.totalAmount)}
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
          startLabel={t.start_date}
          endLabel={t.end_date}
          compact
          className="md:col-span-2"
        />

        <div className="flex items-center justify-center md:mt-0">
          <Select
            options={assetOptions}
            value={assetOptions.find((o) => o.value === name) || null}
            onChange={(selected) =>
              setName(selected?.value ? String(selected.value) : "")
            }
            placeholder={t.select_assets || "Select Asset"}
            isClearable
            isDisabled={assetLoading}
            styles={selectStyles}
            className="w-full"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">{t.per_page}</label>
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
          type="button"
        >
          {t.clear_filters}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {[
                t.date,
                t.name,
                t.quantity,
                t.price,
                t.total_price,
                t.status,
                t.actions,
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
                  {product.date}
                </td>

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
                    {t[product.status?.toLowerCase?.()] || product.status}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-3">
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
                      type="button"
                    >
                      <Edit size={18} className="text-indigo-600" />
                    </button>

                    {role === "superAdmin" || role === "admin" ? (
                      <button
                        onClick={() => handleDeleteProduct(product.Id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-rose-50 transition"
                        title="Delete"
                        type="button"
                      >
                        <Trash2 size={18} className="text-rose-600" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEditClick1(product)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-rose-50 transition"
                        title="Delete Request / Note"
                        type="button"
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
                  colSpan={7}
                  className="px-6 py-6 text-center text-sm text-slate-600"
                >
                  {t.no_data_found}
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
          type="button"
        >
          {t.prev}
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
              type="button"
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={handleNextSet}
          disabled={endPage === totalPages}
          className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
          type="button"
        >
          {t.next}
        </button>
      </div>

      {/* Note View Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={handleNoteModalClose}
        title={t.note_content}
      >
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {noteContent || t.no_data_found}
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleNoteModalClose}
            className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition"
            type="button"
          >
            {t.close}
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={t.edit_purchase_requisition}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label={t.date}
              type="date"
              value={currentProduct?.date}
              onChange={(v) =>
                setCurrentProduct((prev) => ({ ...prev, date: v }))
              }
              required
            />

            <div>
              <label className="block text-sm text-slate-700">{t.name}</label>

              <Select
                options={assetSelectOptions}
                value={
                  assetSelectOptions.find(
                    (option) =>
                      option.value ===
                      (isNewAssetEdit ? "__new__" : currentProduct?.name),
                  ) || null
                }
                onChange={(selectedOption) => {
                  const value = selectedOption?.value || "";

                  if (value === "__new__") {
                    setIsNewAssetEdit(true);
                    setCurrentProduct((prev) => ({ ...prev, name: "" }));
                    return;
                  }

                  setIsNewAssetEdit(false);
                  setNewAssetNameEdit("");
                  setCurrentProduct((prev) => ({ ...prev, name: value }));
                }}
                placeholder={t.select_assets || "Select Asset"}
                className="text-sm mt-1"
                styles={selectStyles}
                formatOptionLabel={formatAssetOptionLabel}
                isClearable
              />

              {isNewAssetEdit && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newAssetNameEdit}
                    onChange={(e) => setNewAssetNameEdit(e.target.value)}
                    placeholder="New asset name"
                    className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const createdAssetName =
                        await addAssetByName(newAssetNameEdit);
                      if (!createdAssetName) return;

                      setCurrentProduct((prev) => ({
                        ...prev,
                        name: createdAssetName,
                      }));
                      setIsNewAssetEdit(false);
                      setNewAssetNameEdit("");
                    }}
                    disabled={isAddingAsset}
                    className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  >
                    {isAddingAsset ? "..." : "Add"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label={t.quantity}
              type="number"
              step="0.01"
              value={currentProduct?.quantity || ""}
              onChange={(v) =>
                setCurrentProduct((prev) => ({ ...prev, quantity: v }))
              }
              required
            />
            <Field
              label={t.price}
              type="number"
              step="0.01"
              value={currentProduct?.price || ""}
              onChange={(v) =>
                setCurrentProduct((prev) => ({ ...prev, price: v }))
              }
              required
            />
          </div>

          <div className="space-y-4 pt-2">
            {role === "superAdmin" ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.status}
                </label>
                <select
                  value={currentProduct?.status || ""}
                  onChange={(e) =>
                    setCurrentProduct((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                  required
                >
                  <option value="">{t.select_status || "Select Status"}</option>
                  <option value="Approved">{t.approved}</option>
                  <option value="Pending">{t.pending}</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.note}
                </label>
                <textarea
                  value={currentProduct?.note || ""}
                  onChange={(e) =>
                    setCurrentProduct((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  className="min-h-[100px] border border-slate-200 rounded-xl p-3 w-full text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                  rows={3}
                />
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
              onClick={handleModalClose}
            >
              {t.cancel}
            </button>
            <button
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition"
              onClick={handleUpdateProduct}
              type="button"
            >
              {t.save_changes}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Request / Status Modal */}
      <Modal
        isOpen={isModalOpen2}
        onClose={handleModalClose2}
        title={t.update_request_note}
        maxWidth="max-w-xl"
      >
        <div className="space-y-6">
          {role === "superAdmin" ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t.status}
              </label>
              <select
                value={currentProduct?.status || ""}
                onChange={(e) =>
                  setCurrentProduct((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                className="h-12 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              >
                <option value="">{t.select_status || "Select Status"}</option>
                <option value="Approved">{t.approved}</option>
                <option value="Pending">{t.pending}</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t.note}
              </label>
              <textarea
                value={currentProduct?.note || ""}
                onChange={(e) =>
                  setCurrentProduct((prev) => ({
                    ...prev,
                    note: e.target.value,
                  }))
                }
                className="min-h-[120px] border border-slate-200 rounded-xl p-3 w-full text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                rows={4}
                placeholder="Enter note for delete request..."
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
              onClick={handleModalClose2}
            >
              {t.cancel}
            </button>
            <button
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition"
              onClick={handleUpdateProduct1}
              type="button"
            >
              {t.save_changes}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen1}
        onClose={handleModalClose1}
        title={t.add_purchase_requisition}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label={t.date}
              type="date"
              value={createProduct.date}
              onChange={(v) =>
                setCreateProduct((prev) => ({ ...prev, date: v }))
              }
              required
            />

            <div>
              <label className="block text-sm text-slate-700">{t.name}</label>

              <Select
                options={assetSelectOptions}
                value={
                  assetSelectOptions.find(
                    (option) =>
                      option.value ===
                      (isNewAssetAdd ? "__new__" : createProduct.name),
                  ) || null
                }
                onChange={(selectedOption) => {
                  const value = selectedOption?.value || "";

                  if (value === "__new__") {
                    setIsNewAssetAdd(true);
                    setCreateProduct((prev) => ({ ...prev, name: "" }));
                    return;
                  }

                  setIsNewAssetAdd(false);
                  setNewAssetNameAdd("");
                  setCreateProduct((prev) => ({ ...prev, name: value }));
                }}
                placeholder={t.select_assets || "Select Asset"}
                className="text-sm mt-1"
                styles={selectStyles}
                formatOptionLabel={formatAssetOptionLabel}
                isClearable
              />

              {isNewAssetAdd && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newAssetNameAdd}
                    onChange={(e) => setNewAssetNameAdd(e.target.value)}
                    placeholder="New asset name"
                    className="h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 bg-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const createdAssetName =
                        await addAssetByName(newAssetNameAdd);
                      if (!createdAssetName) return;

                      setCreateProduct((prev) => ({
                        ...prev,
                        name: createdAssetName,
                      }));
                      setIsNewAssetAdd(false);
                      setNewAssetNameAdd("");
                    }}
                    disabled={isAddingAsset}
                    className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  >
                    {isAddingAsset ? "..." : "Add"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label={t.quantity}
              type="number"
              step="0.01"
              value={createProduct.quantity}
              onChange={(v) =>
                setCreateProduct((prev) => ({ ...prev, quantity: v }))
              }
              required
            />
            <Field
              label={t.price}
              type="number"
              step="0.01"
              value={createProduct.price}
              onChange={(v) =>
                setCreateProduct((prev) => ({ ...prev, price: v }))
              }
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
              {t.additional_note}
            </label>
            <textarea
              value={createProduct.note}
              onChange={(e) =>
                setCreateProduct((prev) => ({
                  ...prev,
                  note: e.target.value,
                }))
              }
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              rows={3}
              placeholder={t.vendor_details}
            />
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
              onClick={handleModalClose1}
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition"
            >
              {t.create_requisition}
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
      className={`border border-slate-200 rounded-xl p-3 w-full mt-1 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200 ${
        readOnly ? "text-slate-900 opacity-80" : "text-slate-900"
      }`}
    />
  </div>
);

export default AssetsRequisitionTable;
