// import { motion } from "framer-motion";
// import { Edit, Notebook, Plus, Search, Trash2 } from "lucide-react";
// import { useEffect, useMemo, useState } from "react";
// import toast from "react-hot-toast";
// import {
//   useDeleteMetaMutation,
//   useGetAllMetaQuery,
//   useGetAllMetaWithoutQueryQuery,
//   useInsertMetaMutation,
//   useUpdateMetaMutation,
// } from "../../features/marketing/marketing";

// const GoogleTable = () => {
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [isModalOpen1, setIsModalOpen1] = useState(false);
//   const [currentProduct, setCurrentProduct] = useState(null);
//   const [createProduct, setCreateProduct] = useState({
//     amount: "",
//   });
//   const userId = localStorage.getItem("userId");

//   const [products, setProducts] = useState([]);

//   // ✅ Filters
//   const [startDate, setStartDate] = useState("");
//   const [endDate, setEndDate] = useState("");

//   const [currentPage, setCurrentPage] = useState(1);
//   const [startPage, setStartPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [pagesPerSet, setPagesPerSet] = useState(10);
//   const itemsPerPage = 10;

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

//   // Filters change হলে page reset
//   useEffect(() => {
//     setCurrentPage(1);
//     setStartPage(1);
//   }, [startDate, endDate]);

//   // startDate > endDate হলে endDate ঠিক করে দেবে
//   useEffect(() => {
//     if (startDate && endDate && startDate > endDate) {
//       setEndDate(startDate);
//     }
//   }, [startDate, endDate]);

//   // Query args
//   const queryArgs = {
//     page: currentPage,
//     limit: itemsPerPage,
//     platform: "Google",
//     startDate: startDate || undefined,
//     endDate: endDate || undefined,
//   };

//   const { data, isLoading, isError, error, refetch } =
//     useGetAllMetaQuery(queryArgs);

//   useEffect(() => {
//     if (isError) {
//       console.error("Error fetching meta data", error);
//     } else if (!isLoading && data) {
//       const onlyGoogle = (data.data || []).filter(
//         (item) => item.platform === "Google",
//       );
//       setProducts(onlyGoogle);
//       setTotalPages(Math.ceil((data?.meta?.count || 0) / itemsPerPage) || 1);
//     }
//   }, [data, isLoading, isError, error, currentPage]);

//   // Modals
//   const handleAddProduct = () => setIsModalOpen1(true);
//   const handleModalClose1 = () => setIsModalOpen1(false);

//   const role = localStorage.getItem("role");
//   const [updateMeta] = useUpdateMetaMutation();
//   const [isModalOpen2, setIsModalOpen2] = useState(false);

//   const handleModalClose2 = () => setIsModalOpen2(false);

//   const handleEditClick1 = (rp) => {
//     setCurrentProduct({
//       ...rp,
//       amount: rp.amount ?? "",
//       status: rp.status ?? "",
//       note: rp.note ?? "",
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
//         amount: Number(currentProduct.amount),
//         note: currentProduct.note,
//         status: currentProduct.status,
//         userId: userId,
//       };

//       const res = await updateMeta({
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

//   const handleEditClick = async (rp) => {
//     setCurrentProduct({
//       ...rp,
//       amount: rp.amount ?? "",
//       status: rp.status ?? "",
//       note: rp.note ?? "",
//       userId: userId,
//     });
//     setIsModalOpen(true);
//   };

//   const handleUpdateProduct = async () => {
//     if (!currentProduct?.Id) return toast.error("Invalid item!");

//     try {
//       const payload = {
//         amount: Number(currentProduct.amount),
//         note: currentProduct.note,
//         status: currentProduct.status,
//         userId: userId,
//       };

//       const res = await updateMeta({
//         id: currentProduct.Id,
//         data: payload,
//       }).unwrap();

//       if (res?.success) {
//         toast.success("Successfully updated!");
//         setIsModalOpen(false);
//         refetch?.();
//       } else {
//         toast.error(res?.message || "Update failed!");
//       }
//     } catch (err) {
//       toast.error(err?.data?.message || "Update failed!");
//     }
//   };
//   const handleModalClose = () => setIsModalOpen(false);

//   // ✅ Insert
//   const [insertMeta] = useInsertMetaMutation();
//   const handleCreateProduct = async (e) => {
//     e.preventDefault();

//     if (!createProduct.amount) return toast.error("Amount is required!");

//     try {
//       const payload = {
//         platform: "Google",
//         amount: Number(createProduct.amount),
//       };

//       const res = await insertMeta(payload).unwrap();
//       if (res?.success) {
//         toast.success("Successfully created meta");
//         setIsModalOpen1(false);
//         setCreateProduct({ amount: "" });
//         refetch?.();
//       } else {
//         toast.error(res?.message || "Create failed!");
//       }
//     } catch (err) {
//       toast.error(err?.data?.message || "Create failed!");
//     }
//   };

//   // ✅ Delete
//   const [deleteMeta] = useDeleteMetaMutation();
//   const handleDeleteProduct = async (id) => {
//     const confirmDelete = await requestDeleteConfirmation({ message: "Do you want to delete this item?" });
//     if (!confirmDelete) return toast.info("Delete action was cancelled.");

//     try {
//       const res = await deleteMeta(id).unwrap();
//       if (res?.success) {
//         toast.success("Deleted successfully!");
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
//   };

//   // Pagination
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

//   const {
//     data: googleRes,
//     isLoading: googleLoading,
//     isError: googleError,
//     error: googleErrObj,
//   } = useGetAllMetaWithoutQueryQuery();

//   const google = googleRes?.data || [];

//   // ✅ totals
//   const totalGoogleAmount = useMemo(() => {
//     return google
//       ?.filter((item) => item.platform === "Google")
//       .reduce((sum, item) => sum + Number(item?.amount || 0), 0);
//   }, [google]);

//   if (googleError) console.error("Purchase error:", googleErrObj);

//   return (
//     <motion.div
//       className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 mb-8"
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ delay: 0.2 }}
//     >
//       {/* Add Button */}
//       <div className="my-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <button
//           type="button"
//           onClick={handleAddProduct}
//           className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
//         >
//           Add <Plus size={18} className="ml-2" />
//         </button>

//         <div className="flex items-center justify-between sm:justify-end gap-3 rounded-md border border-gray-700 bg-gray-800/60 px-4 py-2">
//           <div className="flex items-center gap-2 text-gray-300">
//             <Search size={18} className="text-amber-400" />
//             <span className="text-sm">Total Google Expense</span>
//           </div>

//           <span className="text-white font-semibold tabular-nums">
//             {googleLoading ? "Loading..." : totalGoogleAmount.toFixed(2)}
//           </span>
//         </div>
//       </div>

//       {/* Filters */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mb-6 w-full justify-center mx-auto">
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
//                 Amount
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
//             {products.map((rp) => (
//               <motion.tr
//                 key={rp.Id}
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 transition={{ duration: 0.3 }}
//               >
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
//                   {rp.date
//                     ? new Date(rp.date).toLocaleDateString()
//                     : "-"}
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
//                   {Number(rp.amount || 0).toFixed(2)}
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
//                     onClick={() => handleEditClick(rp)}
//                     className="text-indigo-600 hover:text-indigo-900"
//                   >
//                     <Edit size={18} />
//                   </button>

//                   {role === "superAdmin" || rp.status === "Approved" ? (
//                     <button
//                       onClick={() => handleDeleteProduct(rp.Id)}
//                       className="text-red-600 hover:text-red-900 ms-4"
//                     >
//                       <Trash2 size={18} />
//                     </button>
//                   ) : (
//                     <button
//                       onClick={() => handleEditClick1(rp)}
//                       className="text-red-600 hover:text-red-900 ms-4"
//                     >
//                       <Trash2 size={18} />
//                     </button>
//                   )}
//                 </td>
//               </motion.tr>
//             ))}

//             {!isLoading && products.length === 0 && (
//               <tr>
//                 <td
//                   colSpan={3}
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
//       {isModalOpen && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
//           <motion.div
//             className="bg-gray-800 rounded-lg p-6 shadow-lg w-full md:w-1/3 lg:w-1/3"
//             initial={{ opacity: 0, y: -50 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.3 }}
//           >
//             <h2 className="text-lg font-semibold text-white">
//               Edit Google Expense
//             </h2>

//             <div className="mt-4">
//               <label className="block text-sm text-white">Amount:</label>
//               <input
//                 type="number"
//                 step="0.01"
//                 value={currentProduct?.amount || ""}
//                 onChange={(e) =>
//                   setCurrentProduct({
//                     ...currentProduct,
//                     amount: e.target.value, // ✅ fixed
//                   })
//                 }
//                 className="border border-gray-300 rounded p-2 w-full mt-1 text-white"
//               />
//             </div>

//             {role === "superAdmin" ? (
//               <div className="mt-4">
//                 <label className="block text-sm text-white">Status</label>
//                 <select
//                   value={currentProduct.status || ""}
//                   onChange={(e) =>
//                     setCurrentProduct({
//                       ...currentProduct,
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
//                   value={currentProduct?.note || ""}
//                   onChange={(e) =>
//                     setCurrentProduct({
//                       ...currentProduct,
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
//                 onClick={handleUpdateProduct}
//               >
//                 Save
//               </button>
//               <button
//                 className="bg-red-600 hover:bg-red-700 text-white p-2 rounded"
//                 onClick={handleModalClose}
//               >
//                 Cancel
//               </button>
//             </div>
//           </motion.div>
//         </div>
//       )}

//       {/* Add Modal */}
//       {isModalOpen1 && (
//         <div className="fixed inset-0 top-12 z-10 flex items-center justify-center bg-black bg-opacity-50">
//           <motion.div
//             className="bg-gray-800 rounded-lg p-6 shadow-lg w-full md:w-1/3 lg:w-1/3"
//             initial={{ opacity: 0, y: -50 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.3 }}
//           >
//             <h2 className="text-lg font-semibold text-white">
//               Add Google Expense
//             </h2>

//             <form onSubmit={handleCreateProduct}>
//               <div className="mt-4">
//                 <label className="block text-sm text-white">Amount</label>
//                 <input
//                   type="number"
//                   step="0.01"
//                   value={createProduct.amount}
//                   onChange={(e) =>
//                     setCreateProduct({
//                       ...createProduct,
//                       amount: e.target.value,
//                     })
//                   }
//                   className="border border-gray-300 rounded p-2 w-full mt-1 text-white"
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
//                   onClick={handleModalClose1}
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </form>
//           </motion.div>
//         </div>
//       )}

//       {/* Delete Modal */}

//       {isModalOpen2 && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
//           <motion.div
//             className="bg-gray-800 rounded-lg p-6 shadow-lg w-full md:w-1/3 lg:w-1/3"
//             initial={{ opacity: 0, y: -50 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.3 }}
//           >
//             <h2 className="text-lg font-semibold text-white">
//               Delete Meta Expense
//             </h2>

//             {role === "superAdmin" ? (
//               <div className="mt-4">
//                 <label className="block text-sm text-white">Status</label>
//                 <select
//                   value={currentProduct.status || ""}
//                   onChange={(e) =>
//                     setCurrentProduct({
//                       ...currentProduct,
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
//                   value={currentProduct?.note || ""}
//                   onChange={(e) =>
//                     setCurrentProduct({
//                       ...currentProduct,
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
//                 onClick={handleUpdateProduct1}
//               >
//                 Save
//               </button>
//               <button
//                 className="bg-red-600 hover:bg-red-700 text-white p-2 rounded"
//                 onClick={handleModalClose2}
//               >
//                 Cancel
//               </button>
//             </div>
//           </motion.div>
//         </div>
//       )}
//     </motion.div>
//   );
// };

// export default GoogleTable;

import { motion } from "framer-motion";
import { Edit, BarChart3, Plus, Trash2, Notebook } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Modal from "../common/Modal";
import {
  useDeleteMetaMutation,
  useGetAllMetaQuery,
  useGetAllMetaWithoutQueryQuery,
  useInsertMetaMutation,
  useUpdateMetaMutation,
} from "../../features/marketing/marketing";
import { useLayout } from "../../context/LayoutContext";
import { translations } from "../../utils/translations";

const GoogleTable = () => {
  const { language } = useLayout();
  const t = translations[language] || translations.EN;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen1, setIsModalOpen1] = useState(false);
  const [isModalOpen2, setIsModalOpen2] = useState(false);

  const userId = localStorage.getItem("userId");
  const role = localStorage.getItem("role");

  const [currentProduct, setCurrentProduct] = useState(null);

  // ✅ Add form state
  const [createProduct, setCreateProduct] = useState({
    amount: "",
    note: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const [products, setProducts] = useState([]);

  // ✅ Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  //Pagination calculation start
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

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
  }, [startDate, endDate, itemsPerPage]);

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
      Math.min(prev + pagesPerSet, totalPages - pagesPerSet + 1),
    );

  //Pagination calculation end

  // ✅ startDate > endDate হলে endDate ঠিক করে দেবে
  useEffect(() => {
    if (startDate && endDate && startDate > endDate) setEndDate(startDate);
  }, [startDate, endDate]);

  // ✅ Query args
  const queryArgs = useMemo(
    () => ({
      page: currentPage,
      limit: itemsPerPage, // ✅ dynamic
      platform: "Google",
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [currentPage, itemsPerPage, startDate, endDate],
  );

  const { data, isLoading, isError, error, refetch } =
    useGetAllMetaQuery(queryArgs);

  useEffect(() => {
    if (isError) {
      console.error("Error fetching meta data", error);
      return;
    }
    if (!isLoading && data) {
      // const onlyMeta = (data.data || []).filter(
      //   (item) => item.platform === "Meta",
      // );
      // setProducts(onlyMeta);
      setProducts(data?.data);

      setTotalPages(Math.ceil((data?.meta?.count || 0) / itemsPerPage) || 1);
    }
  }, [data, isLoading, isError, error, currentPage, itemsPerPage]);

  // ✅ totals (all rows without query)
  const {
    data: metaRes,
    isLoading: metaLoading,
    isError: metaError,
    error: metaErrObj,
  } = useGetAllMetaWithoutQueryQuery();

  const meta = metaRes?.data || [];

  const totalMetaAmount = useMemo(() => {
    return meta
      ?.filter((item) => item.platform === "Google")
      .reduce((sum, item) => sum + Number(item?.amount || 0), 0);
  }, [meta]);

  if (metaError) console.error("Meta error:", metaErrObj);

  // ✅ Insert
  const [insertMeta] = useInsertMetaMutation();
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!createProduct.amount) return toast.error("Amount is required!");

    try {
      const payload = {
        platform: "Google",
        amount: Number(createProduct.amount),
        date: createProduct.date,
      };
      const res = await insertMeta(payload).unwrap();
      if (res?.success) {
        toast.success("Successfully created meta");
        setIsModalOpen1(false);
        setCreateProduct({ amount: "" });
        refetch?.();
      } else toast.error(res?.message || "Create failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  // ✅ Update
  const [updateMeta] = useUpdateMetaMutation();

  const handleEditClick = (rp) => {
    setCurrentProduct({
      ...rp,
      amount: rp.amount ?? "",
      status: rp.status ?? "",
      note: rp.note ?? "",
      date: rp.date ?? "",
      userId,
    });
    setIsModalOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!currentProduct?.Id) return toast.error("Invalid item!");
    if (currentProduct?.note === "" || currentProduct?.note === null)
      return toast.error("Note is required!");

    try {
      const payload = {
        amount: Number(currentProduct.amount),
        note: currentProduct.note,
        status: currentProduct.status,
        date: currentProduct.date,
        userId,
      };

      const res = await updateMeta({
        id: currentProduct.Id,
        data: payload,
      }).unwrap();
      if (res?.success) {
        toast.success("Successfully updated!");
        setIsModalOpen(false);
        refetch?.();
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // ✅ Delete / note modal
  const handleEditClick1 = (rp) => {
    setCurrentProduct({
      ...rp,
      amount: rp.amount ?? "",
      status: rp.status ?? "",
      note: rp.note ?? "",
      userId,
    });
    setIsModalOpen2(true);
  };

  const handleUpdateProduct1 = async () => {
    if (!currentProduct?.Id) return toast.error("Invalid item!");
    if (currentProduct?.note === "" || currentProduct?.note === null)
      return toast.error("Note is required!");

    try {
      const payload = {
        amount: Number(currentProduct.amount),
        note: currentProduct.note,
        status: currentProduct.status,
        userId,
      };

      const res = await updateMeta({
        id: currentProduct.Id,
        data: payload,
      }).unwrap();
      if (res?.success) {
        toast.success("Successfully updated!");
        setIsModalOpen2(false);
        refetch?.();
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // ✅ Delete
  const [deleteMeta] = useDeleteMetaMutation();
  const handleDeleteProduct = async (id) => {
    const confirmDelete = await requestDeleteConfirmation({ message: "Do you want to delete this item?" });
    if (!confirmDelete) return toast.info("Delete action was cancelled.");

    try {
      const res = await deleteMeta(id).unwrap();
      if (res?.success) {
        toast.success("Deleted successfully!");
        refetch?.();
      } else toast.error(res?.message || "Delete failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  // ✅ Modals close
  const handleAddProduct = () => setIsModalOpen1(true);
  const handleModalClose = () => setIsModalOpen(false);
  const handleModalClose1 = () => setIsModalOpen1(false);
  const handleModalClose2 = () => setIsModalOpen2(false);

  // ✅ Clear Filters
  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="my-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleAddProduct}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          {t.add || "Add"} <Plus size={18} className="ml-2" />
        </button>

        <div className="flex items-center justify-between sm:justify-end gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
          <div className="flex items-center gap-2 text-slate-700">
            <BarChart3 size={18} className="text-indigo-600" />
            <span className="text-sm font-medium">{t.total_google_expense_label || "Total Google Expense"}</span>
          </div>

          <span className="text-slate-900 font-semibold tabular-nums">
            {metaLoading ? "Loading..." : totalMetaAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* ✅ Filters Row (WITH Per Page dropdown LIKE SCREENSHOT) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6">
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          />
        </div>

        {/* ✅ Per Page Dropdown (same position like your screenshot) */}
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Per Page</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
              setStartPage(1);
            }}
            className="px-3 py-[10px] rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* spacer (optional). If you want a dropdown/field here later, keep it */}
        <div className="hidden md:block" />

        <button
          className="h-11 bg-slate-900 hover:bg-slate-800 text-white transition px-4 rounded-xl w-full"
          onClick={clearFilters}
        >
          {t.clear_filters || "Clear Filters"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t.date || "Date"}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t.amount_label || "Amount"}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t.status_label || "Status"}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t.actions || "Actions"}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {products.map((rp) => (
              <motion.tr
                key={rp.Id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="hover:bg-slate-50"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {rp.date}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 tabular-nums">
                  {Number(rp.amount || 0).toFixed(2)}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
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
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {rp.note && (
                    <button
                      className="text-slate-600 hover:text-slate-900"
                      title={rp.note}
                    >
                      <Notebook size={18} />
                    </button>
                  )}

                  <button
                    onClick={() => handleEditClick(rp)}
                    className="text-indigo-600 hover:text-indigo-800 ml-3"
                    title="Edit"
                  >
                    <Edit size={18} />
                  </button>

                  {role === "superAdmin" || role === "admin" ? (
                    <button
                      onClick={() => handleDeleteProduct(rp.Id)}
                      className="text-red-600 hover:text-red-800 ml-3"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEditClick1(rp)}
                      className="text-red-600 hover:text-red-800 ml-3"
                      title="Request delete / Add note"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </motion.tr>
            ))}

            {!isLoading && products.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-sm text-slate-500"
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

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen && !!currentProduct}
        onClose={handleModalClose}
        title="Edit Google Expense"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Date</label>
            <input
              type="date"
              value={currentProduct?.date || ""}
              onChange={(e) =>
                setCurrentProduct((p) => ({ ...p, date: e.target.value }))
              }
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={currentProduct?.amount || ""}
              onChange={(e) =>
                setCurrentProduct((p) => ({ ...p, amount: e.target.value }))
              }
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
            />
          </div>

          {role === "superAdmin" ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Status</label>
              <select
                value={currentProduct?.status || ""}
                onChange={(e) =>
                  setCurrentProduct((p) => ({ ...p, status: e.target.value }))
                }
                className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-bold text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                required
              >
                <option value="">Select Status</option>
                <option value="Active">Active</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Note</label>
              <textarea
                value={currentProduct?.note || ""}
                onChange={(e) =>
                  setCurrentProduct((p) => ({ ...p, note: e.target.value }))
                }
                className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                rows={3}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={handleModalClose}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateProduct}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen1}
        onClose={handleModalClose1}
        title="Add Google Expense"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Date</label>
            <input
              type="date"
              value={createProduct?.date || ""}
              onChange={(e) =>
                setCreateProduct((p) => ({ ...p, date: e.target.value }))
              }
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={createProduct.amount}
              onChange={(e) =>
                setCreateProduct((p) => ({ ...p, amount: e.target.value }))
              }
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Note</label>
            <textarea
              value={createProduct?.note || ""}
              onChange={(e) =>
                setCreateProduct((p) => ({ ...p, note: e.target.value }))
              }
              className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              rows={3}
              placeholder="Additional details..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleModalClose1}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              Save Entry
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal (note/status update modal) */}
      <Modal
        isOpen={isModalOpen2 && !!currentProduct}
        onClose={handleModalClose2}
        title="Delete Confirmation"
      >
        <div className="space-y-4">
          {role === "superAdmin" ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Status</label>
              <select
                value={currentProduct?.status || ""}
                onChange={(e) =>
                  setCurrentProduct((p) => ({ ...p, status: e.target.value }))
                }
                className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-bold text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                required
              >
                <option value="">Select Status</option>
                <option value="Active">Active</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Reason for Deletion</label>
              <textarea
                value={currentProduct?.note || ""}
                onChange={(e) =>
                  setCurrentProduct((p) => ({ ...p, note: e.target.value }))
                }
                className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                rows={3}
                placeholder="Explain why this entry should be removed..."
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={handleModalClose2}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateProduct1}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default GoogleTable;
