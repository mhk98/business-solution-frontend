// import { motion } from "framer-motion";
// import { Edit, Plus, RotateCcw, Trash2 } from "lucide-react";
// import { useEffect, useMemo, useState } from "react";
// import toast from "react-hot-toast";
// import Select from "react-select";

// import { useGetAllReceivedProductWithoutQueryQuery } from "../../features/receivedProduct/receivedProduct";
// import {
//   useDeleteConfirmOrderMutation,
//   useGetAllConfirmOrderQuery,
//   useInsertConfirmOrderMutation,
//   useUpdateConfirmOrderMutation,
// } from "../../features/confirmOrder/confirmOrder";

// const ConfirmOrderTable = () => {
//   const [isEditOpen, setIsEditOpen] = useState(false);
//   const [isAddOpen, setIsAddOpen] = useState(false);

//   const [currentItem, setCurrentItem] = useState(null);

//   // ✅ UI uses receivedId (ReceivedProduct.Id)
//   const [createForm, setCreateForm] = useState({
//     receivedId: "",
//     quantity: "",
//   });

//   const [rows, setRows] = useState([]);

//   // filters
//   const [startDate, setStartDate] = useState("");
//   const [endDate, setEndDate] = useState("");
//   const [productName, setProductName] = useState("");

//   // pagination
//   const [currentPage, setCurrentPage] = useState(1);
//   const [startPage, setStartPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [pagesPerSet, setPagesPerSet] = useState(10);
//   const itemsPerPage = 10;

//   // ✅ all received products (for dropdown)
//   const {
//     data: receivedRes,
//     isLoading: receivedLoading,
//     isError: receivedError,
//     error: receivedErrObj,
//   } = useGetAllReceivedProductWithoutQueryQuery();

//   const receivedData = receivedRes?.data || [];

//   useEffect(() => {
//     if (receivedError) console.error("Received fetch error:", receivedErrObj);
//   }, [receivedError, receivedErrObj]);

//   // ✅ dropdown options -> value = ReceivedProduct.Id
//   const receivedDropdownOptions = useMemo(() => {
//     return receivedData.map((r) => ({
//       value: String(r.Id),
//       label: r.name,
//     }));
//   }, [receivedData]);

//   // ✅ responsive pagesPerSet
//   useEffect(() => {
//     const update = () => {
//       if (window.innerWidth < 640) setPagesPerSet(5);
//       else if (window.innerWidth < 1024) setPagesPerSet(7);
//       else setPagesPerSet(10);
//     };
//     update();
//     window.addEventListener("resize", update);
//     return () => window.removeEventListener("resize", update);
//   }, []);

//   // reset page when filters change
//   useEffect(() => {
//     setCurrentPage(1);
//     setStartPage(1);
//   }, [startDate, endDate, productName]);

//   // fix endDate if startDate > endDate
//   useEffect(() => {
//     if (startDate && endDate && startDate > endDate) setEndDate(startDate);
//   }, [startDate, endDate]);

//   // ✅ query
//   const queryArgs = {
//     page: currentPage,
//     limit: itemsPerPage,
//     startDate: startDate || undefined,
//     endDate: endDate || undefined,
//     name: productName || undefined,
//   };

//   const { data, isLoading, isError, error, refetch } =
//     useGetAllConfirmOrderQuery(queryArgs);

//   useEffect(() => {
//     if (isError) console.error("PurchaseReturn fetch error:", error);
//     if (!isLoading && data) {
//       setRows(data?.data ?? []);
//       setTotalPages(Math.ceil((data?.meta?.count || 0) / itemsPerPage) || 1);
//     }
//   }, [data, isLoading, isError, error]);

//   // ✅ Table product name (simple)
//   const resolveProductName = (rp) => {
//     // If backend already sends name
//     if (rp?.name) return rp.name;

//     // rp.productId = Products.Id (FK)
//     const productId = rp?.productId;
//     if (!productId) return "N/A";

//     // receivedData has productId = Products.Id
//     const match = receivedData.find(
//       (r) => Number(r.productId) === Number(productId),
//     );
//     return match?.name || "N/A";
//   };

//   // ✅ add/edit handlers
//   const openAdd = () => setIsAddOpen(true);
//   const closeAdd = () => setIsAddOpen(false);

//   const openEdit = (rp) => {
//     setCurrentItem({
//       ...rp,
//       receivedId: String(rp.receivedId ?? rp.productId ?? ""),
//       quantity: rp.quantity ?? "",
//     });
//     setIsEditOpen(true);
//   };
//   const closeEdit = async () => {
//     setIsEditOpen(false);
//     setCurrentItem(null);
//   };

//   // mutations
//   const [insertConfirmOrder] = useInsertConfirmOrderMutation();
//   const [updateConfirmOrder] = useUpdateConfirmOrderMutation();
//   const [deleteConfirmOrder] = useDeleteConfirmOrderMutation();

//   // ✅ create (send receivedId)
//   const handleCreate = async (e) => {
//     e.preventDefault();

//     if (!createForm.receivedId) return toast.error("Please select a product");
//     if (!createForm.quantity || Number(createForm.quantity) <= 0)
//       return toast.error("Please enter valid quantity");

//     try {
//       const payload = {
//         receivedId: Number(createForm.receivedId),
//         quantity: Number(createForm.quantity),
//       };

//       const res = await insertConfirmOrder(payload).unwrap();
//       if (res?.success) {
//         toast.success("Created!");
//         setCreateForm({ receivedId: "", quantity: "" });
//         closeAdd();
//         refetch?.();
//       } else toast.error(res?.message || "Create failed!");
//     } catch (err) {
//       toast.error(err?.data?.message || "Create failed!");
//     }
//   };

//   // ✅ update (still send receivedId if backend supports, else remove receivedId)
//   const handleUpdate = async () => {
//     if (!currentItem?.Id) return toast.error("Invalid item");
//     if (!currentItem?.receivedId) return toast.error("Please select a product");
//     if (!currentItem.quantity || Number(currentItem.quantity) <= 0)
//       return toast.error("Please enter valid quantity");

//     try {
//       const payload = {
//         quantity: Number(currentItem.quantity),
//         receivedId: Number(currentItem.receivedId),
//       };

//       const res = await updateConfirmOrder({
//         id: currentItem.Id,
//         data: payload,
//       }).unwrap();

//       if (res?.success) {
//         toast.success("Successfully updated!");

//         closeEdit();
//         refetch?.();
//       } else toast.error(res?.message || "Update failed!");
//     } catch (err) {
//       toast.error(err?.data?.message || "Update failed!");
//     }
//   };

//   // delete
//   const handleDelete = async (id) => {
//     if (!await requestDeleteConfirmation({ message: "Do you want to delete this item?" })) return;

//     try {
//       const res = await deleteConfirmOrder(id).unwrap();
//       if (res?.success) {
//         toast.success("Deleted!");
//         refetch?.();
//       } else toast.error(res?.message || "Delete failed!");
//     } catch (err) {
//       toast.error(err?.data?.message || "Delete failed!");
//     }
//   };

//   // filters clear
//   const clearFilters = () => {
//     setStartDate("");
//     setEndDate("");
//     setProductName("");
//   };

//   // pagination helpers
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

//   return (
//     <motion.div
//       className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 mb-8"
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ delay: 0.2 }}
//     >
//       {/* Header */}
//       <div className="my-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <button
//           type="button"
//           onClick={openAdd}
//           className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
//         >
//           Add <Plus size={18} className="ml-2" />
//         </button>

//         <div className="flex items-center justify-between sm:justify-end gap-3 rounded-md border border-gray-700 bg-gray-800/60 px-4 py-2">
//           <div className="flex items-center gap-2 text-gray-300">
//             <RotateCcw size={18} className="text-amber-400" />
//             <span className="text-sm">Total Purchase Return</span>
//           </div>
//           <span className="text-white font-semibold tabular-nums">
//             {isLoading ? "Loading..." : (data?.meta?.totalQuantity ?? 0)}
//           </span>
//         </div>
//       </div>

//       {/* Filters */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center mb-6 w-full">
//         <div className="flex items-center justify-center">
//           <label className="mr-2 text-sm text-white">Start Date:</label>
//           <input
//             type="date"
//             value={startDate}
//             onChange={(e) => setStartDate(e.target.value)}
//             className="border border-gray-300 rounded p-1 text-black bg-white"
//           />
//         </div>

//         <div className="flex items-center justify-center">
//           <label className="mr-2 text-sm text-white">End Date:</label>
//           <input
//             type="date"
//             value={endDate}
//             onChange={(e) => setEndDate(e.target.value)}
//             className="border border-gray-300 rounded p-1 text-black bg-white"
//           />
//         </div>

//         <div className="flex items-center justify-center w-full">
//           <Select
//             options={receivedDropdownOptions}
//             value={
//               receivedDropdownOptions.find((o) => o.label === productName) ||
//               null
//             }
//             onChange={(selected) => setProductName(selected?.label || "")}
//             placeholder={receivedLoading ? "Loading..." : "Select Product"}
//             isClearable
//             className="text-black w-full"
//             isDisabled={receivedLoading}
//           />
//         </div>

//         <button
//           className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white transition duration-200 p-2 rounded w-36 justify-center mx-auto"
//           onClick={clearFilters}
//         >
//           Clear Filters
//         </button>
//       </div>

//       {/* Table */}
//       <div className="overflow-x-auto">
//         <table className="min-w-full divide-y divide-gray-700">
//           <thead>
//             <tr>
//               <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
//                 Date
//               </th>
//               <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
//                 Product
//               </th>
//               <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
//                 Supplier
//               </th>
//               <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
//                 Quantity
//               </th>
//               <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
//                 Purchase Price
//               </th>
//               <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
//                 Sale Price
//               </th>
//               <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
//                 Actions
//               </th>
//             </tr>
//           </thead>

//           <tbody className="divide-y divide-gray-700">
//             {rows.map((rp) => (
//               <motion.tr
//                 key={rp.Id}
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 transition={{ duration: 0.2 }}
//               >
//                 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
//                   {rp.date
//                     ? new Date(rp.date).toLocaleDateString()
//                     : "-"}
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
//                   {resolveProductName(rp)}
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
//                   {rp?.supplier?.name || "-"}
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
//                   {Number(rp.quantity || 0).toFixed(2)}
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
//                   {Number(rp.purchase_price || 0).toFixed(2)}
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
//                   {Number(rp.sale_price || 0).toFixed(2)}
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
//                   <button
//                     onClick={() => openEdit(rp)}
//                     className="text-indigo-400 hover:text-indigo-300"
//                   >
//                     <Edit size={18} />
//                   </button>
//                   <button
//                     onClick={() => handleDelete(rp.Id)}
//                     className="text-red-400 hover:text-red-300 ms-4"
//                   >
//                     <Trash2 size={18} />
//                   </button>
//                 </td>
//               </motion.tr>
//             ))}

//             {!isLoading && rows.length === 0 && (
//               <tr>
//                 <td
//                   colSpan={7}
//                   className="px-6 py-6 text-center text-sm text-gray-300"
//                 >
//                   No data found
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Pagination */}
//       <div className="flex items-center justify-center space-x-2 mt-6">
//         <button
//           onClick={handlePreviousSet}
//           disabled={startPage === 1}
//           className="px-3 py-2 text-white bg-indigo-600 rounded-md disabled:bg-gray-400"
//         >
//           Prev
//         </button>

//         {[...Array(endPage - startPage + 1)].map((_, index) => {
//           const pageNum = startPage + index;
//           return (
//             <button
//               key={pageNum}
//               onClick={() => handlePageChange(pageNum)}
//               className={`px-3 py-2 text-black rounded-md ${
//                 pageNum === currentPage
//                   ? "bg-white"
//                   : "bg-indigo-500 hover:bg-indigo-400"
//               }`}
//             >
//               {pageNum}
//             </button>
//           );
//         })}

//         <button
//           onClick={handleNextSet}
//           disabled={endPage === totalPages}
//           className="px-3 py-2 text-white bg-indigo-600 rounded-md disabled:bg-gray-400"
//         >
//           Next
//         </button>
//       </div>

//       {/* Edit Modal */}
//       {isEditOpen && currentItem && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black/50">
//           <motion.div
//             className="bg-gray-800 rounded-lg p-6 shadow-lg w-full md:w-1/3"
//             initial={{ opacity: 0, y: -40 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.2 }}
//           >
//             <h2 className="text-lg font-semibold text-white">Edit Product</h2>
//             <div className="mt-4">
//               <label className="block text-sm text-white">Name</label>
//               <Select
//                 options={receivedDropdownOptions}
//                 value={
//                   receivedDropdownOptions.find(
//                     (o) => o.value === String(currentItem.receivedId),
//                   ) || null
//                 }
//                 onChange={(selected) =>
//                   setCurrentItem((p) => ({
//                     ...p,
//                     receivedId: selected?.value || "",
//                   }))
//                 }
//                 placeholder={receivedLoading ? "Loading..." : "Select Product"}
//                 isClearable
//                 className="text-black w-full"
//                 isDisabled={receivedLoading}
//               />
//             </div>
//             <div className="mt-4">
//               <label className="block text-sm text-white">Quantity</label>
//               <input
//                 type="number"
//                 step="0.01"
//                 value={currentItem.quantity ?? ""}
//                 onChange={(e) =>
//                   setCurrentItem((p) => ({ ...p, quantity: e.target.value }))
//                 }
//                 className="border border-gray-300 rounded p-2 w-full mt-1 text-white bg-transparent"
//               />
//             </div>

//             <div className="mt-6 flex justify-end">
//               <button
//                 className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded mr-2"
//                 onClick={handleUpdate}
//               >
//                 Save
//               </button>
//               <button
//                 className="bg-red-600 hover:bg-red-700 text-white p-2 rounded"
//                 onClick={closeEdit}
//               >
//                 Cancel
//               </button>
//             </div>
//           </motion.div>
//         </div>
//       )}

//       {/* Add Modal */}
//       {isAddOpen && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black/50">
//           <motion.div
//             className="bg-gray-800 rounded-lg p-6 shadow-lg w-full md:w-1/3"
//             initial={{ opacity: 0, y: -40 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.2 }}
//           >
//             <h2 className="text-lg font-semibold text-white">Add Product</h2>

//             <form onSubmit={handleCreate}>
//               <div className="mt-4">
//                 <label className="block text-sm text-white">Name</label>
//                 <Select
//                   options={receivedDropdownOptions}
//                   value={
//                     receivedDropdownOptions.find(
//                       (o) => o.value === String(createForm.receivedId),
//                     ) || null
//                   }
//                   onChange={(selected) =>
//                     setCreateForm((p) => ({
//                       ...p,
//                       receivedId: selected?.value || "",
//                     }))
//                   }
//                   placeholder={
//                     receivedLoading ? "Loading..." : "Select Product"
//                   }
//                   isClearable
//                   className="text-black w-full"
//                   isDisabled={receivedLoading}
//                 />
//               </div>

//               <div className="mt-4">
//                 <label className="block text-sm text-white">Quantity</label>
//                 <input
//                   type="number"
//                   step="0.01"
//                   value={createForm.quantity}
//                   onChange={(e) =>
//                     setCreateForm((p) => ({ ...p, quantity: e.target.value }))
//                   }
//                   className="border border-gray-300 rounded p-2 w-full mt-1 text-white bg-transparent"
//                   required
//                 />
//               </div>

//               <div className="mt-6 flex justify-end">
//                 <button
//                   type="submit"
//                   className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded mr-2"
//                 >
//                   Save
//                 </button>
//                 <button
//                   type="button"
//                   className="bg-red-600 hover:bg-red-700 text-white p-2 rounded"
//                   onClick={closeAdd}
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </form>
//           </motion.div>
//         </div>
//       )}
//     </motion.div>
//   );
// };

// export default ConfirmOrderTable;

// import { motion } from "framer-motion";
// import { Edit, Notebook, Plus, RotateCcw, Trash2 } from "lucide-react";
// import { useEffect, useMemo, useState } from "react";
// import toast from "react-hot-toast";
// import Select from "react-select";
// import {
//   useDeleteConfirmOrderMutation,
//   useGetAllConfirmOrderQuery,
//   useInsertConfirmOrderMutation,
//   useUpdateConfirmOrderMutation,
// } from "../../features/confirmOrder/confirmOrder";
// import { useGetAllProductWithoutQueryQuery } from "../../features/product/product";

// const ConfirmOrderTable = () => {
//   const [isEditOpen, setIsEditOpen] = useState(false);
//   const [isEditOpen1, setIsEditOpen1] = useState(false);
//   const [isAddOpen, setIsAddOpen] = useState(false);
//   const role = localStorage.getItem("role");
//   const [currentItem, setCurrentItem] = useState(null);
//   const userId = localStorage.getItem("userId");

//   // ✅ UI uses receivedId (ReceivedProduct.Id)
//   const [createForm, setCreateForm] = useState({
//     receivedId: "",
//     quantity: "",
//   });

//   const [rows, setRows] = useState([]);

//   // filters
//   const [startDate, setStartDate] = useState("");
//   const [endDate, setEndDate] = useState("");
//   const [productName, setProductName] = useState("");

//   // pagination
//   const [currentPage, setCurrentPage] = useState(1);
//   const [startPage, setStartPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [pagesPerSet, setPagesPerSet] = useState(10);
//   const itemsPerPage = 10;

//   // ✅ all received products (for dropdown)
//   const {
//     data: receivedRes,
//     isLoading: receivedLoading,
//     isError: receivedError,
//     error: receivedErrObj,
//   } = useGetAllProductWithoutQueryQuery();

//   const receivedData = receivedRes?.data || [];

//   useEffect(() => {
//     if (receivedError) console.error("Received fetch error:", receivedErrObj);
//   }, [receivedError, receivedErrObj]);

//   // ✅ dropdown options -> value = ReceivedProduct.Id
//   const receivedDropdownOptions = useMemo(() => {
//     return receivedData.map((r) => ({
//       value: String(r.Id),
//       label: r.name,
//     }));
//   }, [receivedData]);

//   // ✅ responsive pagesPerSet
//   useEffect(() => {
//     const update = () => {
//       if (window.innerWidth < 640) setPagesPerSet(5);
//       else if (window.innerWidth < 1024) setPagesPerSet(7);
//       else setPagesPerSet(10);
//     };
//     update();
//     window.addEventListener("resize", update);
//     return () => window.removeEventListener("resize", update);
//   }, []);

//   // reset page when filters change
//   useEffect(() => {
//     setCurrentPage(1);
//     setStartPage(1);
//   }, [startDate, endDate, productName]);

//   // fix endDate if startDate > endDate
//   useEffect(() => {
//     if (startDate && endDate && startDate > endDate) setEndDate(startDate);
//   }, [startDate, endDate]);

//   // ✅ query
//   const queryArgs = {
//     page: currentPage,
//     limit: itemsPerPage,
//     startDate: startDate || undefined,
//     endDate: endDate || undefined,
//     name: productName || undefined,
//   };

//   const { data, isLoading, isError, error, refetch } =
//     useGetAllConfirmOrderQuery(queryArgs);

//   useEffect(() => {
//     if (isError) console.error("PurchaseReturn fetch error:", error);
//     if (!isLoading && data) {
//       setRows(data?.data ?? []);
//       setTotalPages(Math.ceil((data?.meta?.count || 0) / itemsPerPage) || 1);
//     }
//   }, [data, isLoading, isError, error]);

//   // ✅ Table product name (simple)
//   const resolveProductName = (rp) => {
//     // If backend already sends name
//     if (rp?.name) return rp.name;

//     // rp.productId = Products.Id (FK)
//     const productId = rp?.productId;
//     if (!productId) return "N/A";

//     // receivedData has productId = Products.Id
//     const match = receivedData.find(
//       (r) => Number(r.productId) === Number(productId),
//     );
//     return match?.name || "N/A";
//   };

//   // ✅ add/edit handlers
//   const openAdd = () => setIsAddOpen(true);
//   const closeAdd = () => setIsAddOpen(false);

//   const openEdit = (rp) => {
//     setCurrentItem({
//       ...rp,
//       receivedId: String(rp.receivedId ?? rp.productId ?? ""),
//       quantity: rp.quantity ?? "",
//       note: rp.note ?? "",
//       status: rp.status ?? "",
//       userId: userId,
//     });
//     setIsEditOpen(true);
//   };
//   const closeEdit = () => {
//     setIsEditOpen(false);
//     setCurrentItem(null);
//   };

//   const openEdit1 = (rp) => {
//     setCurrentItem({
//       ...rp,
//       receivedId: String(rp.receivedId ?? rp.productId ?? ""),
//       quantity: rp.quantity ?? "",
//       note: rp.note ?? "",
//       status: rp.status ?? "",
//       userId: userId,
//     });
//     setIsEditOpen1(true);
//   };
//   const closeEdit1 = async () => {
//     setIsEditOpen1(false);
//     setCurrentItem(null);
//   };

//   // mutations
//   const [insertConfirmOrder] = useInsertConfirmOrderMutation();
//   const [updateConfirmOrder] = useUpdateConfirmOrderMutation();
//   const [deleteConfirmOrder] = useDeleteConfirmOrderMutation();

//   // ✅ create (send receivedId)
//   const handleCreate = async (e) => {
//     e.preventDefault();

//     if (!createForm.receivedId) return toast.error("Please select a product");
//     if (!createForm.quantity || Number(createForm.quantity) <= 0)
//       return toast.error("Please enter valid quantity");

//     try {
//       const payload = {
//         receivedId: Number(createForm.receivedId),
//         quantity: Number(createForm.quantity),
//       };

//       const res = await insertConfirmOrder(payload).unwrap();
//       if (res?.success) {
//         toast.success("Created!");
//         setCreateForm({ receivedId: "", quantity: "" });
//         closeAdd();
//         refetch?.();
//       } else toast.error(res?.message || "Create failed!");
//     } catch (err) {
//       toast.error(err?.data?.message || "Create failed!");
//     }
//   };

//   // ✅ update (still send receivedId if backend supports, else remove receivedId)
//   const handleUpdate = async () => {
//     if (!currentItem?.Id) return toast.error("Invalid item");
//     if (!currentItem?.receivedId) return toast.error("Please select a product");
//     if (!currentItem.quantity || Number(currentItem.quantity) <= 0)
//       return toast.error("Please enter valid quantity");

//     try {
//       const payload = {
//         note: currentItem.note,
//         status: currentItem.status,
//         quantity: Number(currentItem.quantity),
//         receivedId: Number(currentItem.receivedId),
//         userId: userId,
//       };

//       const res = await updateConfirmOrder({
//         id: currentItem.Id,
//         data: payload,
//       }).unwrap();

//       if (res?.success) {
//         toast.success("Successfully updated!");

//         closeEdit();
//         refetch?.();
//       } else toast.error(res?.message || "Update failed!");
//     } catch (err) {
//       toast.error(err?.data?.message || "Update failed!");
//     }
//   };

//   const handleUpdate1 = async () => {
//     if (!currentItem?.Id) return toast.error("Invalid item");
//     if (!currentItem?.receivedId) return toast.error("Please select a product");
//     if (!currentItem.quantity || Number(currentItem.quantity) <= 0)
//       return toast.error("Please enter valid quantity");

//     try {
//       const payload = {
//         note: currentItem.note,
//         status: currentItem.status,
//         quantity: Number(currentItem.quantity),
//         receivedId: Number(currentItem.receivedId),
//         userId: userId,
//       };

//       const res = await updateConfirmOrder({
//         id: currentItem.Id,
//         data: payload,
//       }).unwrap();

//       if (res?.success) {
//         toast.success("Successfully updated!");

//         closeEdit();
//         refetch?.();
//       } else toast.error(res?.message || "Update failed!");
//     } catch (err) {
//       toast.error(err?.data?.message || "Update failed!");
//     }
//   };

//   // delete
//   const handleDelete = async (id) => {
//     if (!await requestDeleteConfirmation({ message: "Do you want to delete this item?" })) return;

//     try {
//       const res = await deleteConfirmOrder(id).unwrap();
//       if (res?.success) {
//         toast.success("Deleted!");
//         refetch?.();
//       } else toast.error(res?.message || "Delete failed!");
//     } catch (err) {
//       toast.error(err?.data?.message || "Delete failed!");
//     }
//   };

//   // filters clear
//   const clearFilters = () => {
//     setStartDate("");
//     setEndDate("");
//     setProductName("");
//   };

//   // pagination helpers
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

//   return (
//     <motion.div
//       className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 mb-8"
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ delay: 0.2 }}
//     >
//       {/* Header */}
//       <div className="my-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <button
//           type="button"
//           onClick={openAdd}
//           className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
//         >
//           Add <Plus size={18} className="ml-2" />
//         </button>

//         <div className="flex items-center justify-between sm:justify-end gap-3 rounded-md border border-gray-700 bg-gray-800/60 px-4 py-2">
//           <div className="flex items-center gap-2 text-gray-300">
//             <RotateCcw size={18} className="text-amber-400" />
//             <span className="text-sm">Total Confirm Order</span>
//           </div>
//           <span className="text-white font-semibold tabular-nums">
//             {isLoading ? "Loading..." : (data?.meta?.totalQuantity ?? 0)}
//           </span>
//         </div>
//       </div>

//       {/* Filters */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center mb-6 w-full">
//         <div className="flex flex-col">
//           <label className="text-sm text-gray-400 mb-1">From</label>
//           <input
//             type="date"
//             value={startDate}
//             onChange={(e) => setStartDate(e.target.value)}
//             className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100"
//           />
//         </div>

//         <div className="flex flex-col">
//           <label className="text-sm text-gray-400 mb-1">To</label>
//           <input
//             type="date"
//             value={endDate}
//             onChange={(e) => setEndDate(e.target.value)}
//             className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100"
//           />
//         </div>

//         <div className="flex items-center justify-center w-full mt-6">
//           <Select
//             options={receivedDropdownOptions}
//             value={
//               receivedDropdownOptions.find((o) => o.label === productName) ||
//               null
//             }
//             onChange={(selected) => setProductName(selected?.label || "")}
//             placeholder={receivedLoading ? "Loading..." : "Select Product"}
//             isClearable
//             className="text-black w-full"
//             isDisabled={receivedLoading}
//           />
//         </div>

//         <button
//           className="flex items-center mt-6 bg-indigo-600 hover:bg-indigo-700 text-white transition duration-200 p-2 rounded w-36 justify-center mx-auto"
//           onClick={clearFilters}
//         >
//           Clear Filters
//         </button>
//       </div>

//       {/* Table */}
//       <div className="overflow-x-auto">
//         <table className="min-w-full divide-y divide-gray-700">
//           <thead>
//             <tr>
//               <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
//                 Date
//               </th>
//               <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
//                 Product
//               </th>
//               <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
//                 Supplier
//               </th>
//               <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
//                 Quantity
//               </th>
//               <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
//                 Purchase Price
//               </th>
//               <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
//                 Sale Price
//               </th>

//               <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
//                 Status
//               </th>
//               <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
//                 Actions
//               </th>
//             </tr>
//           </thead>

//           <tbody className="divide-y divide-gray-700">
//             {rows.map((rp) => (
//               <motion.tr
//                 key={rp.Id}
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 transition={{ duration: 0.2 }}
//               >
//                 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
//                   {rp.date
//                     ? new Date(rp.date).toLocaleDateString()
//                     : "-"}
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
//                   {resolveProductName(rp)}
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
//                   {rp?.supplier?.name || "-"}
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
//                   {Number(rp.quantity || 0).toFixed(2)}
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
//                   {Number(rp.purchase_price || 0).toFixed(2)}
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
//                   {Number(rp.sale_price || 0).toFixed(2)}
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
//                   {rp.status}
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
//                   {rp.note && (
//                     <button
//                       className="text-white-600 hover:text-white-900"
//                       title={rp.note}
//                     >
//                       <Notebook size={18} />
//                     </button>
//                   )}
//                   <button
//                     onClick={() => openEdit(rp)}
//                     className="text-indigo-400 hover:text-indigo-300"
//                   >
//                     <Edit size={18} />
//                   </button>

//                   {role === "superAdmin" ||
//                   role === "admin" ||
//                   rp.status === "Approved" ? (
//                     <button
//                       onClick={() => handleDelete(rp.Id)}
//                       className="text-red-400 hover:text-red-300 ms-4"
//                     >
//                       <Trash2 size={18} />
//                     </button>
//                   ) : (
//                     <button
//                       onClick={() => openEdit1(rp)}
//                       className="text-red-600 hover:text-red-900 ms-4"
//                     >
//                       <Trash2 size={18} />
//                     </button>
//                   )}
//                 </td>
//               </motion.tr>
//             ))}

//             {!isLoading && rows.length === 0 && (
//               <tr>
//                 <td
//                   colSpan={7}
//                   className="px-6 py-6 text-center text-sm text-gray-300"
//                 >
//                   No data found
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Pagination */}
//       <div className="flex items-center justify-center space-x-2 mt-6">
//         <button
//           onClick={handlePreviousSet}
//           disabled={startPage === 1}
//           className="px-3 py-2 text-white bg-indigo-600 rounded-md disabled:bg-gray-400"
//         >
//           Prev
//         </button>

//         {[...Array(endPage - startPage + 1)].map((_, index) => {
//           const pageNum = startPage + index;
//           return (
//             <button
//               key={pageNum}
//               onClick={() => handlePageChange(pageNum)}
//               className={`px-3 py-2 text-black rounded-md ${
//                 pageNum === currentPage
//                   ? "bg-white"
//                   : "bg-indigo-500 hover:bg-indigo-400"
//               }`}
//             >
//               {pageNum}
//             </button>
//           );
//         })}

//         <button
//           onClick={handleNextSet}
//           disabled={endPage === totalPages}
//           className="px-3 py-2 text-white bg-indigo-600 rounded-md disabled:bg-gray-400"
//         >
//           Next
//         </button>
//       </div>

//       {/* Edit Modal */}
//       {isEditOpen && currentItem && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black/50">
//           <motion.div
//             className="bg-gray-800 rounded-lg p-6 shadow-lg w-full md:w-1/3"
//             initial={{ opacity: 0, y: -40 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.2 }}
//           >
//             <h2 className="text-lg font-semibold text-white">Edit Product</h2>

//             <div className="mt-4">
//               <label className="block text-sm text-white">Name</label>
//               <Select
//                 options={receivedDropdownOptions}
//                 value={
//                   receivedDropdownOptions.find(
//                     (o) => o.value === String(currentItem.receivedId),
//                   ) || null
//                 }
//                 onChange={(selected) =>
//                   setCurrentItem((p) => ({
//                     ...p,
//                     receivedId: selected?.value || "",
//                   }))
//                 }
//                 placeholder={receivedLoading ? "Loading..." : "Select Product"}
//                 isClearable
//                 className="text-black w-full"
//                 isDisabled={receivedLoading}
//               />
//             </div>

//             <div className="mt-4">
//               <label className="block text-sm text-white">Quantity</label>
//               <input
//                 type="number"
//                 step="0.01"
//                 value={currentItem.quantity ?? ""}
//                 onChange={(e) =>
//                   setCurrentItem((p) => ({ ...p, quantity: e.target.value }))
//                 }
//                 className="border border-gray-300 rounded p-2 w-full mt-1 text-white bg-transparent"
//               />
//             </div>

//             {role === "superAdmin" || role === "admin" ? (
//               <div className="mt-4">
//                 <label className="block text-sm text-white">Status</label>
//                 <select
//                   value={currentItem.status || ""}
//                   onChange={(e) =>
//                     setCurrentItem({
//                       ...currentItem,
//                       status: e.target.value,
//                     })
//                   }
//                   className="border border-gray-300 rounded p-2 w-full mt-1 text-black bg-white"
//                   required
//                 >
//                   <option value="">Select Status</option>
//                   <option value="Approved">Approved</option>
//                   <option value="Pending">Pending</option>
//                 </select>
//               </div>
//             ) : (
//               <div className="mt-4">
//                 <label className="block text-sm text-white">Note:</label>
//                 <textarea
//                   type="text"
//                   value={currentItem?.note || ""}
//                   onChange={(e) =>
//                     setCurrentItem({
//                       ...currentItem,
//                       note: e.target.value,
//                     })
//                   }
//                   className="border border-gray-300 rounded p-2 w-full mt-1 text-white"
//                 />
//               </div>
//             )}

//             <div className="mt-6 flex justify-end">
//               <button
//                 className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded mr-2"
//                 onClick={handleUpdate}
//               >
//                 Save
//               </button>
//               <button
//                 className="bg-red-600 hover:bg-red-700 text-white p-2 rounded"
//                 onClick={closeEdit}
//               >
//                 Cancel
//               </button>
//             </div>
//           </motion.div>
//         </div>
//       )}

//       {/* Delete Modal */}
//       {isEditOpen1 && currentItem && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black/50">
//           <motion.div
//             className="bg-gray-800 rounded-lg p-6 shadow-lg w-full md:w-1/3"
//             initial={{ opacity: 0, y: -40 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.2 }}
//           >
//             <h2 className="text-lg font-semibold text-white">Edit Product</h2>

//             <div className="mt-4">
//               <label className="block text-sm text-white">Note:</label>
//               <textarea
//                 type="text"
//                 value={currentItem?.note || ""}
//                 onChange={(e) =>
//                   setCurrentItem({
//                     ...currentItem,
//                     note: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded p-2 w-full mt-1 text-white"
//               />
//             </div>

//             <div className="mt-6 flex justify-end">
//               <button
//                 className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded mr-2"
//                 onClick={handleUpdate1}
//               >
//                 Save
//               </button>
//               <button
//                 className="bg-red-600 hover:bg-red-700 text-white p-2 rounded"
//                 onClick={closeEdit1}
//               >
//                 Cancel
//               </button>
//             </div>
//           </motion.div>
//         </div>
//       )}

//       {/* Add Modal */}
//       {isAddOpen && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black/50">
//           <motion.div
//             className="bg-gray-800 rounded-lg p-6 shadow-lg w-full md:w-1/3"
//             initial={{ opacity: 0, y: -40 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.2 }}
//           >
//             <h2 className="text-lg font-semibold text-white">Add Product</h2>

//             <form onSubmit={handleCreate}>
//               <div className="mt-4">
//                 <label className="block text-sm text-white">Name</label>
//                 <Select
//                   options={receivedDropdownOptions}
//                   value={
//                     receivedDropdownOptions.find(
//                       (o) => o.value === String(createForm.receivedId),
//                     ) || null
//                   }
//                   onChange={(selected) =>
//                     setCreateForm((p) => ({
//                       ...p,
//                       receivedId: selected?.value || "",
//                     }))
//                   }
//                   placeholder={
//                     receivedLoading ? "Loading..." : "Select Product"
//                   }
//                   isClearable
//                   className="text-black w-full"
//                   isDisabled={receivedLoading}
//                 />
//               </div>

//               <div className="mt-4">
//                 <label className="block text-sm text-white">Quantity</label>
//                 <input
//                   type="number"
//                   step="0.01"
//                   value={createForm.quantity}
//                   onChange={(e) =>
//                     setCreateForm((p) => ({ ...p, quantity: e.target.value }))
//                   }
//                   className="border border-gray-300 rounded p-2 w-full mt-1 text-white bg-transparent"
//                   required
//                 />
//               </div>

//               <div className="mt-6 flex justify-end">
//                 <button
//                   type="submit"
//                   className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded mr-2"
//                 >
//                   Save
//                 </button>
//                 <button
//                   type="button"
//                   className="bg-red-600 hover:bg-red-700 text-white p-2 rounded"
//                   onClick={closeAdd}
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </form>
//           </motion.div>
//         </div>
//       )}
//     </motion.div>
//   );
// };

// export default ConfirmOrderTable;

import { motion } from "framer-motion";
import { Edit, Notebook, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";

import {
  useDeleteConfirmOrderMutation,
  useGetAllConfirmOrderQuery,
  useInsertConfirmOrderMutation,
  useUpdateConfirmOrderMutation,
} from "../../features/confirmOrder/confirmOrder";
import { useGetAllProductWithoutQueryQuery } from "../../features/product/product";
import { useGetAllWirehouseWithoutQueryQuery } from "../../features/wirehouse/wirehouse";
import { useGetAllSupplierWithoutQueryQuery } from "../../features/supplier/supplier";

const ConfirmOrderTable = () => {
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
    hasWarranty: false,
    warrantyValue: "",
    warrantyUnit: "Day", // Day | Month | Year
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

  // ✅ all products (for dropdown)
  const {
    data: receivedRes,
    isLoading: receivedLoading,
    isError: receivedError,
    error: receivedErrObj,
  } = useGetAllProductWithoutQueryQuery();

  const receivedData = receivedRes?.data || [];

  useEffect(() => {
    if (receivedError) console.error("Product fetch error:", receivedErrObj);
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
    useGetAllConfirmOrderQuery(queryArgs);

  useEffect(() => {
    if (isError) console.error("ConfirmOrder fetch error:", error);
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

    // if your products list has Id only, then match by Id
    const match = receivedData.find((r) => Number(r.Id) === Number(productId));
    return match?.name || "N/A";
  };

  // add/edit modal handlers
  const openAdd = () => setIsAddOpen(true);
  const closeAdd = () => setIsAddOpen(false);

  const openEdit = (rp) => {
    setCurrentItem({
      ...rp,
      receivedId: String(rp.receivedId ?? rp.productId ?? ""),
      quantity: rp.quantity ?? "",
      note: rp.note ?? "",
      status: rp.status ?? "",
      date: rp.date ?? "",
      userId,
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
      userId,
    });
    setIsEditOpen1(true);
  };
  const closeEdit1 = () => {
    setIsEditOpen1(false);
    setCurrentItem(null);
  };

  // mutations
  const [insertConfirmOrder] = useInsertConfirmOrderMutation();
  const [updateConfirmOrder] = useUpdateConfirmOrderMutation();
  const [deleteConfirmOrder] = useDeleteConfirmOrderMutation();

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
        warrantyValue: createForm.hasWarranty
          ? Number(createForm.warrantyValue || 0)
          : 0,
        warrantyUnit: createForm.hasWarranty ? createForm.warrantyUnit : null,
      };

      const res = await insertConfirmOrder(payload).unwrap();
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
        status: currentItem.status,
        date: currentItem.date,
        supplierId: Number(currentItem.supplierId),
        warehouseId: Number(currentItem.warehouseId),
        quantity: Number(currentItem.quantity),
        receivedId: Number(currentItem.receivedId),
        userId,
        actorRole: role,
      };

      const res = await updateConfirmOrder({
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
        supplierId: Number(currentItem.supplierId),
        warehouseId: Number(currentItem.warehouseId),
        note: currentItem.note,
        status: currentItem.status,
        quantity: Number(currentItem.quantity || 0),
        receivedId: Number(currentItem.receivedId),
        userId,
        actorRole: role,
      };

      const res = await updateConfirmOrder({
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
      const res = await deleteConfirmOrder(id).unwrap();
      if (res?.success) {
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
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          Add <Plus size={18} className="ml-2" />
        </button>

        <div className="flex items-center justify-between sm:justify-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <RotateCcw size={18} className="text-amber-500" />
            <span className="text-sm">Total Confirm Order</span>
          </div>
          <span className="text-slate-900 font-semibold tabular-nums">
            {isLoading ? "Loading..." : (data?.meta?.totalQuantity ?? 0)}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-5 gap-4 items-end w-full">
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          />
        </div>

        {/* ✅ Per Page */}
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Per Page</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
              setStartPage(1);
            }}
            className="h-11 px-3 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
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
            className="text-black"
            styles={selectStyles}
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
      <div className="overflow-x-auto mt-6">
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
                Supplier
              </th>{" "}
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Warehouse
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Purchase Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Sale Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Warranty
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map((rp) => (
              <motion.tr
                key={rp.Id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="hover:bg-slate-50"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {rp.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {resolveProductName(rp)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {rp?.supplier?.name || "-"}
                </td>{" "}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {rp?.warehouse?.name || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(rp.quantity || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(rp.purchase_price || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(rp.sale_price || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                      rp.status === "Approved"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : rp.status === "Active"
                          ? "bg-blue-50 text-blue-700 border-blue-200" // New color for Active
                          : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {rp.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {rp.warrantyValue
                    ? `${rp.warrantyValue} ${rp.warrantyUnit || ""}`
                    : "-"}
                </td>
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
            ))}

            {!isLoading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
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

      {/* ✅ Modals */}
      {/* NOTE: আপনার modal গুলো একই রাখলাম শুধু bg/text light করে দিলাম */}

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
                className="text-black"
                styles={selectStyles}
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
                    setCurrentItem((p) => ({
                      ...p,
                      note: e.target.value,
                    }))
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

      {/* Delete Modal (Note Only) */}
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
                  setCurrentItem((p) => ({
                    ...p,
                    note: e.target.value,
                  }))
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
        <div className="fixed inset-0 top-24 flex items-center justify-center   p-4">
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
                  className="text-black"
                  styles={selectStyles}
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
                    setCreateForm((p) => ({
                      ...p,
                      quantity: e.target.value,
                    }))
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
              {/* Warranty */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">
                    Warranty
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCreateForm((p) => ({
                        ...p,
                        hasWarranty: !p.hasWarranty,
                        ...(p.hasWarranty
                          ? { warrantyValue: "", warrantyUnit: "Day" }
                          : {}),
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      createForm.hasWarranty ? "bg-indigo-600" : "bg-slate-300"
                    }`}
                    aria-pressed={createForm.hasWarranty}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                        createForm.hasWarranty
                          ? "translate-x-5"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {createForm.hasWarranty && (
                  <div className="border-t border-slate-200 px-4 py-3">
                    <label className="block text-xs text-slate-600 mb-1">
                      Warranty Duration
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={createForm.warrantyValue}
                        onChange={(e) =>
                          setCreateForm((p) => ({
                            ...p,
                            warrantyValue: e.target.value,
                          }))
                        }
                        placeholder="e.g. 30"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none
                     focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                      />

                      <select
                        value={createForm.warrantyUnit}
                        onChange={(e) =>
                          setCreateForm((p) => ({
                            ...p,
                            warrantyUnit: e.target.value,
                          }))
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none
                     focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                      >
                        <option value="Day">Day</option>
                        <option value="Month">Month</option>
                        <option value="Year">Year</option>
                      </select>
                    </div>
                  </div>
                )}
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

export default ConfirmOrderTable;
