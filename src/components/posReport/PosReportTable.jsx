// import { motion } from "framer-motion";
// import { useEffect, useMemo, useRef, useState } from "react";
// import toast from "react-hot-toast";
// import Select from "react-select";
// import jsPDF from "jspdf";
// import html2canvas from "html2canvas";
// import { Edit, Trash2, FileText, X } from "lucide-react";

// import {
//   useDeletePosReportMutation,
//   useGetAllPosReportQuery,
//   useGetAllPosReportWithoutQueryQuery,
//   useUpdatePosReportMutation,
// } from "../../features/posReport/posReport";

// const PosReportTable = () => {
//   const role = localStorage.getItem("role");
//   const userId = localStorage.getItem("userId");

//   // ----------------------------
//   // List + Filters
//   // ----------------------------
//   const [reports, setReports] = useState([]);
//   const [reportsAll, setReportsAll] = useState([]);

//   const [startDate, setStartDate] = useState("");
//   const [endDate, setEndDate] = useState("");
//   const [name, setName] = useState("");

//   // per page + pagination
//   const [itemsPerPage, setItemsPerPage] = useState(10);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [startPage, setStartPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [pagesPerSet, setPagesPerSet] = useState(10);

//   // ----------------------------
//   // Modals
//   // ----------------------------
//   const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
//   const [invoiceReport, setInvoiceReport] = useState(null);
//   const invoiceRef = useRef(null);

//   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
//   const [currentReport, setCurrentReport] = useState(null);

//   // ----------------------------
//   // Queries
//   // ----------------------------
//   const {
//     data: dataAll,
//     isLoading: isLoadingAll,
//     isError: isErrorAll,
//     error: errorAll,
//   } = useGetAllPosReportWithoutQueryQuery();

//   useEffect(() => {
//     if (isErrorAll) {
//       console.error("Error fetching pos reports (all)", errorAll);
//       return;
//     }
//     if (!isLoadingAll && dataAll?.data) {
//       setReportsAll(dataAll.data);
//     }
//   }, [dataAll, isLoadingAll, isErrorAll, errorAll]);

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

//   useEffect(() => {
//     setCurrentPage(1);
//     setStartPage(1);
//   }, [startDate, endDate, name, itemsPerPage]);

//   const queryArgs = useMemo(() => {
//     const args = {
//       page: currentPage,
//       limit: itemsPerPage,
//       startDate: startDate || undefined,
//       endDate: endDate || undefined,
//       name: name?.trim() ? name.trim() : undefined,
//     };
//     Object.keys(args).forEach((k) => {
//       if (args[k] === undefined || args[k] === null || args[k] === "")
//         delete args[k];
//     });
//     return args;
//   }, [currentPage, itemsPerPage, startDate, endDate, name]);

//   const { data, isLoading, isError, error, refetch } =
//     useGetAllPosReportQuery(queryArgs);

//   useEffect(() => {
//     if (isError) {
//       console.error("Error fetching pos report data", error);
//       return;
//     }
//     if (!isLoading && data?.data) {
//       setReports(data.data);
//       setTotalPages(Math.ceil((data?.meta?.count || 0) / itemsPerPage) || 1);
//     }
//   }, [data, isLoading, isError, error, currentPage, itemsPerPage]);

//   // ----------------------------
//   // Mutations
//   // ----------------------------
//   const [deletePosReport] = useDeletePosReportMutation();
//   const [updatePosReport] = useUpdatePosReportMutation();

//   // ----------------------------
//   // Options (Sales names)
//   // ----------------------------
//   const nameOptions = useMemo(() => {
//     const names = (reportsAll || [])
//       .map((r) => r.name)
//       .filter(Boolean)
//       .map((x) => String(x).trim())
//       .filter(Boolean);

//     const uniq = Array.from(new Set(names));
//     return uniq.map((n) => ({ value: n, label: n }));
//   }, [reportsAll]);

//   // ----------------------------
//   // Helpers
//   // ----------------------------
//   const safeNum = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

//   const clearFilters = () => {
//     setStartDate("");
//     setEndDate("");
//     setName("");
//   };

//   // ----------------------------
//   // Pagination
//   // ----------------------------
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
//       Math.min(prev + pagesPerSet, totalPages - pagesPerSet + 1),
//     );

//   // ----------------------------
//   // Invoice Modal (single)
//   // ----------------------------
//   const openInvoice = (report) => {
//     setInvoiceReport(report);
//     setIsInvoiceOpen(true);
//   };

//   const closeInvoice = () => {
//     setIsInvoiceOpen(false);
//     setInvoiceReport(null);
//   };

//   const downloadInvoicePDF = async () => {
//     try {
//       if (!invoiceRef.current || !invoiceReport) return;

//       if (document.fonts?.ready) await document.fonts.ready;

//       const canvas = await html2canvas(invoiceRef.current, {
//         scale: 3,
//         useCORS: true,
//         allowTaint: true,
//         backgroundColor: "#ffffff",
//         logging: false,
//         scrollX: 0,
//         scrollY: -window.scrollY,
//         onclone: (clonedDoc) => {
//           clonedDoc.documentElement.style.background = "#ffffff";
//           clonedDoc.body.style.background = "#ffffff";

//           const style = clonedDoc.createElement("style");
//           style.setAttribute("data-html2canvas-fix", "true");
//           style.innerHTML = `
//             #posInvoiceCapture, #posInvoiceCapture * {
//               color: #000 !important;
//               background: transparent !important;
//               background-color: transparent !important;
//               border-color: #d1d5db !important;
//               box-shadow: none !important;
//               text-shadow: none !important;
//               filter: none !important;
//               outline: none !important;
//             }
//             #posInvoiceCapture { background: #fff !important; background-color: #fff !important; }
//             #posInvoiceCapture *::before,
//             #posInvoiceCapture *::after {
//               color: #000 !important;
//               background: transparent !important;
//               background-color: transparent !important;
//               border-color: #d1d5db !important;
//               box-shadow: none !important;
//               text-shadow: none !important;
//               filter: none !important;
//               outline: none !important;
//             }
//           `;
//           clonedDoc.head.appendChild(style);
//         },
//       });

//       const imgData = canvas.toDataURL("image/jpeg", 0.98);
//       const pdf = new jsPDF("p", "mm", "a4");

//       const pdfWidth = pdf.internal.pageSize.getWidth();
//       const pdfHeight = pdf.internal.pageSize.getHeight();

//       const imgWidth = pdfWidth;
//       const imgHeight = (canvas.height * imgWidth) / canvas.width;

//       let heightLeft = imgHeight;
//       let position = 0;

//       pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
//       heightLeft -= pdfHeight;

//       while (heightLeft > 0) {
//         position -= pdfHeight;
//         pdf.addPage();
//         pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
//         heightLeft -= pdfHeight;
//       }

//       const fileName = `POS_Invoice_${invoiceReport?.Id || "POS"}_${Date.now()}.pdf`;
//       pdf.save(fileName);
//     } catch (err) {
//       console.error(err);
//       toast.error("PDF download failed!");
//     }
//   };

//   // ----------------------------
//   // Edit Modal
//   // ----------------------------
//   const openEdit = (report) => {
//     const normalized = {
//       ...report,
//       date: report?.date || "",
//       name: report?.name || "",
//       mobile: report?.mobile || "",
//       address: report?.address || "",
//       note: report?.note || "",
//       subTotal: safeNum(report?.subTotal),
//       discount: safeNum(report?.discount),
//       deliveryCharge: safeNum(report?.deliveryCharge),
//       total: safeNum(report?.total),
//       paidAmount: safeNum(report?.paidAmount),
//       dueAmount: safeNum(report?.dueAmount),
//       status: report?.status || "",
//       items: Array.isArray(report?.items) ? report.items : report?.items || [],
//       userId,
//     };

//     setCurrentReport(normalized);
//     setIsEditModalOpen(true);
//   };

//   const closeEdit = async () => {
//     setIsEditModalOpen(false);
//     setCurrentReport(null);
//   };

//   const handleUpdate = async () => {
//     if (!currentReport?.Id) return;

//     try {
//       const payload = {
//         date: currentReport.date || null,
//         name: currentReport.name || "",
//         mobile: currentReport.mobile || "",
//         address: currentReport.address || "",
//         note: currentReport.note || "",
//         status: currentReport.status || "---",

//         subTotal: safeNum(currentReport.subTotal),
//         discount: safeNum(currentReport.discount),
//         deliveryCharge: safeNum(currentReport.deliveryCharge),
//         total: safeNum(currentReport.total),
//         paidAmount: safeNum(currentReport.paidAmount),
//         dueAmount: safeNum(currentReport.dueAmount),

//         items: currentReport.items || [],
//         userId,
//       };

//       const res = await updatePosReport({
//         id: currentReport.Id,
//         data: payload,
//       }).unwrap();

//       if (res?.success) {
//         toast.success("POS Report updated!");
//         closeEdit();
//         refetch?.();
//       } else {
//         toast.error("Update failed!");
//       }
//     } catch (err) {
//       toast.error(err?.data?.message || "Update failed!");
//     }
//   };

//   // ----------------------------
//   // Delete
//   // ----------------------------
//   const handleDelete = async (id) => {
//     const ok = await requestDeleteConfirmation({ message: "Do you want to delete this POS report?" });
//     if (!ok) return toast.info("Delete cancelled.");

//     try {
//       const res = await deletePosReport(id).unwrap();
//       if (res?.success) {
//         toast.success("POS report deleted!");
//         refetch?.();
//       } else {
//         toast.error("Delete failed!");
//       }
//     } catch (err) {
//       toast.error(err?.data?.message || "Delete failed!");
//     }
//   };

//   // ----------------------------
//   // React-select styles
//   // ----------------------------
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

//   return (
//     <motion.div
//       className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ delay: 0.2 }}
//     >
//       {/* Filters */}
//       <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6 w-full justify-center mx-auto">
//         <div className="flex flex-col">
//           <label className="text-sm text-slate-600 mb-1">From</label>
//           <input
//             type="date"
//             value={startDate}
//             onChange={(e) => setStartDate(e.target.value)}
//             className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
//           />
//         </div>

//         <div className="flex flex-col">
//           <label className="text-sm text-slate-600 mb-1">To</label>
//           <input
//             type="date"
//             value={endDate}
//             onChange={(e) => setEndDate(e.target.value)}
//             className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
//           />
//         </div>

//         <div className="flex items-center justify-center md:mt-0">
//           <Select
//             options={nameOptions}
//             value={nameOptions.find((o) => o.value === name) || null}
//             onChange={(selected) => setName(selected?.value || "")}
//             placeholder="Select Customer"
//             isClearable
//             styles={selectStyles}
//             className="w-full"
//           />
//         </div>

//         <div className="flex flex-col">
//           <label className="text-sm text-slate-600 mb-1">Per Page</label>
//           <select
//             value={itemsPerPage}
//             onChange={(e) => {
//               setItemsPerPage(Number(e.target.value));
//               setCurrentPage(1);
//               setStartPage(1);
//             }}
//             className="px-3 py-[10px] rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
//           >
//             <option value={10}>10</option>
//             <option value={20}>20</option>
//             <option value={50}>50</option>
//             <option value={100}>100</option>
//           </select>
//         </div>

//         <button
//           className="inline-flex items-center justify-center bg-white hover:bg-slate-50 text-slate-700 transition px-4 py-[10px] rounded-xl border border-slate-200"
//           onClick={clearFilters}
//         >
//           Clear Filters
//         </button>
//       </div>

//       {/* Table */}
//       <div className="overflow-x-auto rounded-xl border border-slate-200">
//         <table className="min-w-full divide-y divide-slate-200">
//           <thead className="bg-slate-50">
//             <tr>
//               {[
//                 "Date",
//                 "Customer",
//                 "Mobile",
//                 "Total",
//                 "Paid",
//                 "Due",
//                 "Note",
//               ].map((h) => (
//                 <th
//                   key={h}
//                   className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
//                 >
//                   {h}
//                 </th>
//               ))}
//               <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
//                 Actions
//               </th>
//             </tr>
//           </thead>

//           <tbody className="divide-y divide-slate-200 bg-white">
//             {(reports || []).map((r) => (
//               <motion.tr
//                 key={r.Id}
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 transition={{ duration: 0.25 }}
//                 className="hover:bg-slate-50"
//               >
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
//                   {r.date ? String(r.date).slice(0, 10) : "-"}
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
//                   {r.name || "-"}
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
//                   {r.mobile || "-"}
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
//                   {safeNum(r.total).toFixed(0)}
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
//                   {safeNum(r.paidAmount).toFixed(0)}
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
//                   {safeNum(r.dueAmount).toFixed(0)}
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
//                   {r.note || "-"}
//                 </td>

//                 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
//                   <div className="flex items-center gap-3">
//                     <button
//                       onClick={() => openInvoice(r)}
//                       className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-emerald-50 transition"
//                       title="Invoice"
//                     >
//                       <FileText size={18} className="text-emerald-600" />
//                     </button>

//                     <button
//                       onClick={() => openEdit(r)}
//                       className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-indigo-50 transition"
//                       title="Edit"
//                     >
//                       <Edit size={18} className="text-indigo-600" />
//                     </button>

//                     {(role === "superAdmin" || role === "admin") && (
//                       <button
//                         onClick={() => handleDelete(r.Id)}
//                         className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-rose-50 transition"
//                         title="Delete"
//                       >
//                         <Trash2 size={18} className="text-rose-600" />
//                       </button>
//                     )}
//                   </div>
//                 </td>
//               </motion.tr>
//             ))}

//             {!isLoading && (reports || []).length === 0 && (
//               <tr>
//                 <td
//                   colSpan={8}
//                   className="px-6 py-10 text-center text-sm text-slate-500"
//                 >
//                   No POS reports found
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
//           Prev
//         </button>

//         {[...Array(endPage - startPage + 1)].map((_, index) => {
//           const pageNum = startPage + index;
//           const active = pageNum === currentPage;
//           return (
//             <button
//               key={pageNum}
//               onClick={() => handlePageChange(pageNum)}
//               className={`px-4 py-2 rounded-xl border transition ${
//                 active
//                   ? "bg-indigo-600 text-white border-indigo-600"
//                   : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
//               }`}
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
//           Next
//         </button>
//       </div>

//       {/* -------------------- Edit Modal -------------------- */}
//       {isEditModalOpen && currentReport && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
//           <motion.div
//             className="bg-white rounded-2xl p-6 shadow-[0_20px_60px_rgba(15,23,42,0.2)] w-full md:w-3/4 lg:w-2/3 border border-slate-200"
//             initial={{ opacity: 0, y: -50 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.25 }}
//           >
//             <div className="flex items-center justify-between">
//               <h2 className="text-lg font-semibold text-slate-900">
//                 Edit POS Report
//               </h2>
//               <button
//                 type="button"
//                 onClick={closeEdit}
//                 className="h-9 w-9 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center"
//                 title="Close"
//               >
//                 <X size={18} className="text-slate-600" />
//               </button>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
//               <Field
//                 label="Date"
//                 type="date"
//                 value={currentReport.date || ""}
//                 onChange={(v) =>
//                   setCurrentReport({ ...currentReport, date: v })
//                 }
//               />

//               <Field
//                 label="Customer Name"
//                 value={currentReport.name || ""}
//                 onChange={(v) =>
//                   setCurrentReport({ ...currentReport, name: v })
//                 }
//               />

//               <Field
//                 label="Mobile"
//                 value={currentReport.mobile || ""}
//                 onChange={(v) =>
//                   setCurrentReport({ ...currentReport, mobile: v })
//                 }
//               />

//               <Field
//                 label="Address"
//                 value={currentReport.address || ""}
//                 onChange={(v) =>
//                   setCurrentReport({ ...currentReport, address: v })
//                 }
//               />

//               <Field
//                 label="Subtotal"
//                 type="number"
//                 value={currentReport.subTotal}
//                 onChange={(v) =>
//                   setCurrentReport({ ...currentReport, subTotal: v })
//                 }
//               />

//               <Field
//                 label="Discount"
//                 type="number"
//                 value={currentReport.discount}
//                 onChange={(v) =>
//                   setCurrentReport({ ...currentReport, discount: v })
//                 }
//               />

//               <Field
//                 label="Delivery Charge"
//                 type="number"
//                 value={currentReport.deliveryCharge}
//                 onChange={(v) =>
//                   setCurrentReport({ ...currentReport, deliveryCharge: v })
//                 }
//               />

//               <Field
//                 label="Total"
//                 type="number"
//                 value={currentReport.total}
//                 onChange={(v) =>
//                   setCurrentReport({ ...currentReport, total: v })
//                 }
//               />

//               <Field
//                 label="Paid Amount"
//                 type="number"
//                 value={currentReport.paidAmount}
//                 onChange={(v) =>
//                   setCurrentReport({ ...currentReport, paidAmount: v })
//                 }
//               />

//               <Field
//                 label="Due Amount"
//                 type="number"
//                 value={currentReport.dueAmount}
//                 onChange={(v) =>
//                   setCurrentReport({ ...currentReport, dueAmount: v })
//                 }
//               />

//               <div className="md:col-span-3">
//                 <label className="block text-sm text-slate-700">Note</label>
//                 <textarea
//                   value={currentReport.note || ""}
//                   onChange={(e) =>
//                     setCurrentReport({
//                       ...currentReport,
//                       note: e.target.value,
//                     })
//                   }
//                   className="border border-slate-200 rounded-xl p-3 w-full mt-1 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
//                   rows={3}
//                 />
//               </div>

//               {(role === "superAdmin" || role === "admin") && (
//                 <div className="md:col-span-3">
//                   <label className="block text-sm text-slate-700">Status</label>
//                   <select
//                     value={currentReport.status || ""}
//                     onChange={(e) =>
//                       setCurrentReport({
//                         ...currentReport,
//                         status: e.target.value,
//                       })
//                     }
//                     className="border border-slate-200 rounded-xl p-3 w-full mt-1 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
//                   >
//                     <option value="">Select Status</option>
//                     <option value="Approved">Approved</option>
//                     <option value="Pending">Pending</option>
//                     <option value="---">---</option>
//                   </select>
//                 </div>
//               )}
//             </div>

//             <div className="mt-6 flex justify-end gap-2">
//               <button
//                 className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl shadow-sm"
//                 onClick={handleUpdate}
//               >
//                 Save
//               </button>
//               <button
//                 type="button"
//                 className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl border border-slate-200"
//                 onClick={closeEdit}
//               >
//                 Cancel
//               </button>
//             </div>
//           </motion.div>
//         </div>
//       )}

//       {/* -------------------- Invoice Modal -------------------- */}
//       {isInvoiceOpen && invoiceReport && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
//           <motion.div
//             className="bg-white rounded-2xl p-4 shadow-[0_20px_60px_rgba(15,23,42,0.2)] w-full max-w-3xl border border-slate-200"
//             initial={{ opacity: 0, y: -30 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.25 }}
//           >
//             <div className="flex items-center justify-between mb-3">
//               <h2 className="text-slate-900 font-semibold text-lg">
//                 POS Invoice
//               </h2>

//               <div className="flex gap-2">
//                 <button
//                   onClick={downloadInvoicePDF}
//                   className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl shadow-sm"
//                 >
//                   Download PDF
//                 </button>

//                 <button
//                   onClick={closeInvoice}
//                   className="bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl border border-slate-200"
//                 >
//                   Close
//                 </button>
//               </div>
//             </div>

//             <div
//               id="posInvoiceCapture"
//               ref={invoiceRef}
//               className="bg-white text-slate-900 rounded-xl p-6 border border-slate-200"
//             >
//               <div className="flex justify-between items-start">
//                 <div>
//                   <h3 className="text-xl font-bold">Kafela Mart</h3>
//                   <p className="text-sm text-slate-600">Address line</p>
//                   <p className="text-sm text-slate-600">
//                     Phone: +880 9647-555333
//                   </p>
//                 </div>

//                 <div className="text-right">
//                   <h3 className="text-xl font-bold">INVOICE</h3>
//                   <p className="text-sm text-slate-600">
//                     Date:{" "}
//                     {invoiceReport.date
//                       ? String(invoiceReport.date).slice(0, 10)
//                       : new Date().toLocaleDateString()}
//                   </p>
//                   <p className="text-sm text-slate-600">
//                     Invoice No: POS-{invoiceReport.Id}-
//                     {String(Date.now()).slice(-6)}
//                   </p>
//                 </div>
//               </div>

//               <hr className="my-4 border-slate-200" />

//               <div className="flex justify-between gap-3 text-sm">
//                 <p>
//                   <b>Customer:</b> {invoiceReport.name || "-"}
//                 </p>
//                 <p>
//                   <b>Mobile:</b> {invoiceReport.mobile || "-"}
//                 </p>
//               </div>

//               <p className="text-sm mt-1">
//                 <b>Address:</b> {invoiceReport.address || "-"}
//               </p>

//               <hr className="my-4 border-slate-200" />

//               <table className="w-full text-sm border border-slate-200">
//                 <thead>
//                   <tr className="bg-slate-50 border-b border-slate-200">
//                     <th className="p-2 text-left">Item</th>
//                     <th className="p-2 text-right">Qty</th>
//                     <th className="p-2 text-right">Price</th>
//                     <th className="p-2 text-right">Total</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {(Array.isArray(invoiceReport.items)
//                     ? invoiceReport.items
//                     : []
//                   )?.map((it, idx) => (
//                     <tr key={idx} className="border-b border-slate-200">
//                       <td className="p-2">
//                         {it?.name || `Item ${idx + 1}`}
//                         {it?.Id ? (
//                           <span className="text-xs text-slate-500">
//                             {" "}
//                             (Id: {it.Id})
//                           </span>
//                         ) : null}
//                       </td>
//                       <td className="p-2 text-right">{safeNum(it?.qty)}</td>
//                       <td className="p-2 text-right">
//                         {safeNum(it?.price).toFixed(0)}
//                       </td>
//                       <td className="p-2 text-right">
//                         {safeNum(it?.total).toFixed(0)}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>

//               <hr className="my-4 border-slate-200" />

//               <div className="grid grid-cols-2 gap-3 text-sm">
//                 <div className="text-slate-600">Subtotal</div>
//                 <div className="text-right font-semibold">
//                   {safeNum(invoiceReport.subTotal).toFixed(0)}
//                 </div>

//                 <div className="text-slate-600">Discount</div>
//                 <div className="text-right font-semibold">
//                   {safeNum(invoiceReport.discount).toFixed(0)}
//                 </div>

//                 <div className="text-slate-600">Delivery</div>
//                 <div className="text-right font-semibold">
//                   {safeNum(invoiceReport.deliveryCharge).toFixed(0)}
//                 </div>

//                 <div className="text-slate-900 font-bold text-base">Total</div>
//                 <div className="text-right font-bold text-base">
//                   {safeNum(invoiceReport.total).toFixed(0)}
//                 </div>

//                 <div className="text-slate-600">Paid</div>
//                 <div className="text-right font-semibold">
//                   {safeNum(invoiceReport.paidAmount).toFixed(0)}
//                 </div>

//                 <div className="text-slate-600">Due</div>
//                 <div className="text-right font-semibold">
//                   {safeNum(invoiceReport.dueAmount).toFixed(0)}
//                 </div>
//               </div>

//               <p className="text-xs mt-4 text-slate-600">
//                 <span className="font-bold">Note: </span>
//                 {invoiceReport.note || "-"}
//               </p>

//               <div className="mt-10 grid grid-cols-2 gap-10 text-sm">
//                 <div className="border-t border-slate-300 pt-2 text-center">
//                   Customer Signature
//                 </div>
//                 <div className="border-t border-slate-300 pt-2 text-center">
//                   Authorized Signature
//                 </div>
//               </div>
//             </div>
//           </motion.div>
//         </div>
//       )}
//     </motion.div>
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
//       className={`border border-slate-200 rounded-xl p-3 w-full mt-1 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200 ${
//         readOnly ? "text-slate-900 opacity-80" : "text-slate-900"
//       }`}
//     />
//   </div>
// );

// export default PosReportTable;

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Edit, Trash2, FileText, Printer } from "lucide-react";

import {
  useDeletePosReportMutation,
  useGetAllPosReportQuery,
  useGetAllPosReportWithoutQueryQuery,
  useUpdatePosReportMutation,
} from "../../features/posReport/posReport";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import Modal from "../common/Modal";
import DateRangeFilter from "../common/DateRangeFilter";
import DocumentBrand from "../common/DocumentBrand";

const parseMaybeJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const getReportItems = (report) => {
  const itemsRaw =
    report?.items ??
    report?.Items ??
    report?.products ??
    report?.Products ??
    report?.posItems ??
    report?.PosItems ??
    report?.posReportItems ??
    report?.PosReportItems ??
    report?.saleItems ??
    report?.SaleItems ??
    report?.orderItems ??
    report?.OrderItems ??
    report?.details ??
    report?.Details ??
    [];

  return parseMaybeJsonArray(itemsRaw).map((item, index) => {
    const qty = Number(item?.qty ?? item?.quantity ?? item?.Quantity ?? 0);
    const price = Number(
      item?.price ??
        item?.unitPrice ??
        item?.sale_price ??
        item?.salePrice ??
        0,
    );

    return {
      ...item,
      Id: item?.Id ?? item?.id ?? item?.productId ?? item?.product?.Id ?? index,
      name:
        item?.name ??
        item?.productName ??
        item?.ProductName ??
        item?.product?.name ??
        item?.receivedProduct?.productName ??
        item?.receivedProduct?.product?.name ??
        `Item ${index + 1}`,
      qty,
      price,
      total:
        Number(item?.total ?? item?.amount ?? item?.lineTotal ?? 0) ||
        qty * price,
    };
  });
};

const getItemDisplayName = (item, index) =>
  item?.name || item?.productName || item?.ProductName || `Item ${index + 1}`;

const summarizeReportItems = (report) => {
  const items = getReportItems(report);
  if (!items.length) return "-";

  const [first, ...rest] = items;
  const suffix = rest.length ? ` +${rest.length} more` : "";
  return `${getItemDisplayName(first, 0)}${suffix}`;
};

const PosReportTable = () => {
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");

  // ----------------------------
  // List + Filters
  // ----------------------------
  const [reports, setReports] = useState([]);
  const [reportsAll, setReportsAll] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [name, setName] = useState("");

  // per page + pagination
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

  // ----------------------------
  // Bulk selection
  // ----------------------------
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkInvoiceOpen, setIsBulkInvoiceOpen] = useState(false);
  const bulkInvoiceRef = useRef(null);

  // ----------------------------
  // Modals
  // ----------------------------
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceReport, setInvoiceReport] = useState(null);
  const invoiceRef = useRef(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);

  // ----------------------------
  // Queries
  // ----------------------------
  const {
    data: dataAll,
    isLoading: isLoadingAll,
    isError: isErrorAll,
    error: errorAll,
  } = useGetAllPosReportWithoutQueryQuery();

  useEffect(() => {
    if (isErrorAll) {
      console.error("Error fetching pos reports (all)", errorAll);
      return;
    }
    if (!isLoadingAll && dataAll?.data) {
      setReportsAll(dataAll.data);
    }
  }, [dataAll, isLoadingAll, isErrorAll, errorAll]);

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
  }, [startDate, endDate, name, itemsPerPage]);

  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      name: name?.trim() ? name.trim() : undefined,
    };
    Object.keys(args).forEach((k) => {
      if (args[k] === undefined || args[k] === null || args[k] === "")
        delete args[k];
    });
    return args;
  }, [currentPage, itemsPerPage, startDate, endDate, name]);

  const { data, isLoading, isError, error, refetch } =
    useGetAllPosReportQuery(queryArgs);

  useEffect(() => {
    if (isError) {
      console.error("Error fetching pos report data", error);
      return;
    }
    if (!isLoading && data?.data) {
      setReports(data.data);
      setTotalPages(Math.ceil((data?.meta?.count || 0) / itemsPerPage) || 1);
    }
  }, [data, isLoading, isError, error, currentPage, itemsPerPage]);

  // ----------------------------
  // Mutations
  // ----------------------------
  const [deletePosReport] = useDeletePosReportMutation();
  const [updatePosReport] = useUpdatePosReportMutation();

  // ----------------------------
  // Options (Customer names)
  // ----------------------------
  const nameOptions = useMemo(() => {
    const names = (reportsAll || [])
      .map((r) => r?.name)
      .filter(Boolean)
      .map((x) => String(x).trim())
      .filter(Boolean);

    const uniq = Array.from(new Set(names));
    return uniq.map((n) => ({ value: n, label: n }));
  }, [reportsAll]);

  // ----------------------------
  // Helpers
  // ----------------------------
  const safeNum = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setName("");
  };

  const formatDate = (d) => {
    if (!d) return "-";
    const s = String(d);
    return s.length >= 10 ? s.slice(0, 10) : s;
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
    setStartPage((prev) => Math.max(prev - pagesPerSet, 1));

  const handleNextSet = () =>
    setStartPage((prev) =>
      Math.min(prev + pagesPerSet, totalPages - pagesPerSet + 1),
    );

  // ----------------------------
  // ✅ Bulk selection (table checkbox) like EmployeeTable
  // ----------------------------
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const isAllSelectedOnPage = useMemo(() => {
    const idsOnPage = (reports || []).map((r) => r.Id);
    return (
      idsOnPage.length > 0 && idsOnPage.every((id) => selectedIds.includes(id))
    );
  }, [reports, selectedIds]);

  const toggleSelectAllOnPage = () => {
    const idsOnPage = (reports || []).map((r) => r.Id);
    setSelectedIds((prev) => {
      const allSelected = idsOnPage.every((id) => prev.includes(id));
      if (allSelected) return prev.filter((id) => !idsOnPage.includes(id));
      return Array.from(new Set([...prev, ...idsOnPage]));
    });
  };

  const selectedReports = useMemo(() => {
    const all =
      Array.isArray(reportsAll) && reportsAll.length ? reportsAll : reports;
    const map = new Map((all || []).map((r) => [r.Id, r]));
    return selectedIds
      .map((id) => {
        const report = map.get(id);
        return report ? { ...report, items: getReportItems(report) } : null;
      })
      .filter(Boolean);
  }, [selectedIds, reportsAll, reports]);

  const getFullReport = (report) =>
    (reportsAll || []).find((item) => String(item?.Id) === String(report?.Id)) ||
    report;

  // ----------------------------
  // Invoice Modal (single)
  // ----------------------------
  const openInvoice = (report) => {
    const fullReport = getFullReport(report);

    setInvoiceReport({ ...fullReport, items: getReportItems(fullReport) });
    setIsInvoiceOpen(true);
  };

  const closeInvoice = () => {
    setIsInvoiceOpen(false);
    setInvoiceReport(null);
  };

  const downloadInvoicePDF = async () => {
    try {
      if (!invoiceRef.current || !invoiceReport) return;

      if (document.fonts?.ready) await document.fonts.ready;

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        onclone: (clonedDoc) => {
          clonedDoc.documentElement.style.background = "#ffffff";
          clonedDoc.body.style.background = "#ffffff";

          const style = clonedDoc.createElement("style");
          style.setAttribute("data-html2canvas-fix", "true");
          style.innerHTML = `
            #posInvoiceCapture, #posInvoiceCapture * {
              color: #000 !important;
              background: transparent !important;
              background-color: transparent !important;
              border-color: #d1d5db !important;
              box-shadow: none !important;
              text-shadow: none !important;
              filter: none !important;
              outline: none !important;
            }
            #posInvoiceCapture { background: #fff !important; background-color: #fff !important; }
            #posInvoiceCapture *::before,
            #posInvoiceCapture *::after {
              color: #000 !important;
              background: transparent !important;
              background-color: transparent !important;
              border-color: #d1d5db !important;
              box-shadow: none !important;
              text-shadow: none !important;
              filter: none !important;
              outline: none !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        },
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const fileName = `POS_Invoice_${invoiceReport?.Id || "POS"}_${Date.now()}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error(err);
      toast.error("PDF download failed!");
    }
  };

  // ----------------------------
  // ✅ Bulk invoice PDF (download + print) like EmployeeTable
  // ----------------------------
  const downloadBulkInvoicePDF = async () => {
    try {
      if (!bulkInvoiceRef.current || selectedReports.length === 0) return;

      if (document.fonts?.ready) await document.fonts.ready;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const nodes = bulkInvoiceRef.current.querySelectorAll(".invoice-page");

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        const canvas = await html2canvas(node, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: -window.scrollY,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        const imgH = (canvas.height * pageW) / canvas.width;

        let heightLeft = imgH;
        let position = 0;

        if (i > 0) pdf.addPage();

        pdf.addImage(imgData, "JPEG", 0, position, pageW, imgH);
        heightLeft -= pageH;

        while (heightLeft > 0) {
          position -= pageH;
          pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, position, pageW, imgH);
          heightLeft -= pageH;
        }
      }

      pdf.save(`POS_Invoices_${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error("Bulk PDF download failed!");
    }
  };

  const printBulkInvoices = () => {
    if (!bulkInvoiceRef.current || selectedReports.length === 0) return;

    const html = bulkInvoiceRef.current.innerHTML;

    const printWindow = window.open("", "_blank", "width=900,height=650");
    if (!printWindow) {
      toast.error("Popup blocked! Allow popups then try again.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>Print POS Invoices</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 12px; }
            .invoice-page { page-break-after: always; border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 8px; }
            hr { margin: 14px 0; }
          </style>
        </head>
        <body>
          ${html}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); }
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ----------------------------
  // Edit Modal
  // ----------------------------
  const openEdit = (report) => {
    const fullReport = getFullReport(report);
    const normalized = {
      ...fullReport,
      date: fullReport?.date ? String(fullReport.date).slice(0, 10) : "",
      name: fullReport?.name || "",
      mobile: fullReport?.mobile || "",
      address: fullReport?.address || "",
      note: fullReport?.note || "",
      subTotal: safeNum(fullReport?.subTotal),
      discount: safeNum(fullReport?.discount),
      deliveryCharge: safeNum(fullReport?.deliveryCharge),
      total: safeNum(fullReport?.total),
      paidAmount: safeNum(fullReport?.paidAmount),
      dueAmount: safeNum(fullReport?.dueAmount),
      status: fullReport?.status || "---",
      items: getReportItems(fullReport),
      userId,
    };

    setCurrentReport(normalized);
    setIsEditModalOpen(true);
  };

  const closeEdit = () => {
    setIsEditModalOpen(false);
    setCurrentReport(null);
  };

  const handleEditPaidAmountChange = (value) => {
    if (!currentReport) return;

    const safeTotal = safeNum(currentReport.total);
    const nextPaidAmount = Math.min(Math.max(0, safeNum(value)), safeTotal);

    setCurrentReport({
      ...currentReport,
      paidAmount: nextPaidAmount,
      dueAmount: Math.max(0, safeTotal - nextPaidAmount),
    });
  };

  const handleEditDueAmountChange = (value) => {
    if (!currentReport) return;

    const safeTotal = safeNum(currentReport.total);
    const nextDueAmount = Math.min(Math.max(0, safeNum(value)), safeTotal);

    setCurrentReport({
      ...currentReport,
      dueAmount: nextDueAmount,
      paidAmount: Math.max(0, safeTotal - nextDueAmount),
    });
  };

  const recalculateEditTotals = (updates) => {
    const nextReport = { ...currentReport, ...updates };
    const itemsTotal = (nextReport.items || []).reduce(
      (sum, item) => sum + safeNum(item?.qty) * safeNum(item?.price),
      0,
    );
    const subTotal = (nextReport.items || []).length
      ? itemsTotal
      : safeNum(nextReport.subTotal);
    const total = Math.max(
      0,
      subTotal -
        safeNum(nextReport.discount) +
        safeNum(nextReport.deliveryCharge),
    );
    const paidAmount = Math.min(safeNum(nextReport.paidAmount), total);

    return {
      ...nextReport,
      subTotal,
      total,
      paidAmount,
      dueAmount: Math.max(0, total - paidAmount),
    };
  };

  const updateEditItem = (index, field, value) => {
    if (!currentReport) return;

    const items = (currentReport.items || []).map((item, itemIndex) => {
      if (itemIndex !== index) return item;

      const nextItem = {
        ...item,
        [field]: field === "name" ? value : safeNum(value),
      };

      if (field === "qty" || field === "price") {
        nextItem.total = safeNum(nextItem.qty) * safeNum(nextItem.price);
      }

      return nextItem;
    });

    setCurrentReport(recalculateEditTotals({ items }));
  };

  const handleEditAmountFieldChange = (field, value) => {
    if (!currentReport) return;
    setCurrentReport(recalculateEditTotals({ [field]: value }));
  };

  const handleUpdate = async () => {
    if (!currentReport?.Id) return;

    try {
      const payload = {
        date: currentReport.date || null,
        name: currentReport.name || "",
        mobile: currentReport.mobile || "",
        address: currentReport.address || "",
        note: currentReport.note || "",
        status: currentReport.status || "---",

        subTotal: safeNum(currentReport.subTotal),
        discount: safeNum(currentReport.discount),
        deliveryCharge: safeNum(currentReport.deliveryCharge),
        total: safeNum(currentReport.total),
        paidAmount: safeNum(currentReport.paidAmount),
        dueAmount: safeNum(currentReport.dueAmount),

        items: currentReport.items || [],
        userId,
      };

      const res = await updatePosReport({
        id: currentReport.Id,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("POS Report updated!");
        closeEdit();
        refetch?.();
      } else {
        toast.error("Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // ----------------------------
  // Delete
  // ----------------------------
  const handleDelete = async (id) => {
    const ok = await requestDeleteConfirmation({
      message: "Do you want to delete this POS report?",
    });
    if (!ok) return toast.info("Delete cancelled.");

    try {
      const res = await deletePosReport(id).unwrap();
      if (res?.success) {
        toast.success("POS report deleted!");
        // clear selection if deleted was selected
        setSelectedIds((prev) => prev.filter((x) => x !== id));
        refetch?.();
      } else {
        toast.error("Delete failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  // ----------------------------
  // React-select styles
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

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Bulk actions */}
      <div className="my-6 flex flex-wrap gap-3 items-center justify-start">
        <button
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl disabled:opacity-60 shadow-sm inline-flex items-center gap-2"
          onClick={() => setIsBulkInvoiceOpen(true)}
          disabled={selectedIds.length === 0}
        >
          <Printer size={18} />
          Print Selected ({selectedIds.length})
        </button>

        <button
          className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl border border-slate-200 disabled:opacity-60"
          onClick={() => setSelectedIds([])}
          disabled={selectedIds.length === 0}
        >
          Clear Selection
        </button>
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
            options={nameOptions}
            value={nameOptions.find((o) => o.value === name) || null}
            onChange={(selected) => setName(selected?.value || "")}
            placeholder="Select Customer"
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
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={isAllSelectedOnPage}
                  onChange={toggleSelectAllOnPage}
                />
              </th>

              {[
                "Date",
                "Customer",
                "Product",
                "Mobile",
                "Total",
                "Paid",
                "Due",
                "Note",
              ].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}

              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {(reports || []).map((r) => (
              <motion.tr
                key={r.Id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="hover:bg-slate-50"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(r.Id)}
                    onChange={() => toggleSelect(r.Id)}
                  />
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {formatDate(r.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                  {r.name || "-"}
                </td>
                <td className="px-6 py-4 min-w-[220px] text-sm text-slate-700">
                  {summarizeReportItems(getFullReport(r))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {r.mobile || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {safeNum(r.total).toFixed(0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {safeNum(r.paidAmount).toFixed(0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {safeNum(r.dueAmount).toFixed(0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {r.note || "-"}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openInvoice(r)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-emerald-50 transition"
                      title="Invoice"
                    >
                      <FileText size={18} className="text-emerald-600" />
                    </button>

                    <button
                      onClick={() => openEdit(r)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-indigo-50 transition"
                      title="Edit"
                    >
                      <Edit size={18} className="text-indigo-600" />
                    </button>

                    {(role === "superAdmin" || role === "admin") && (
                      <button
                        onClick={() => handleDelete(r.Id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-rose-50 transition"
                        title="Delete"
                      >
                        <Trash2 size={18} className="text-rose-600" />
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}

            {!isLoading && (reports || []).length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-6 py-10 text-center text-sm text-slate-500"
                >
                  No POS reports found
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

      {/* -------------------- Edit Modal -------------------- */}
      <Modal
        isOpen={isEditModalOpen && !!currentReport}
        onClose={closeEdit}
        title="Edit POS Report"
        maxWidth="max-w-5xl"
      >
        {currentReport && (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field
                label="Date"
                type="date"
                value={currentReport.date || ""}
                onChange={(v) =>
                  setCurrentReport({ ...currentReport, date: v })
                }
              />

              <Field
                label="Customer Name"
                value={currentReport.name || ""}
                onChange={(v) =>
                  setCurrentReport({ ...currentReport, name: v })
                }
              />

              <Field
                label="Mobile"
                value={currentReport.mobile || ""}
                onChange={(v) =>
                  setCurrentReport({ ...currentReport, mobile: v })
                }
              />

              <Field
                label="Address"
                value={currentReport.address || ""}
                onChange={(v) =>
                  setCurrentReport({ ...currentReport, address: v })
                }
              />

              <Field
                label="Subtotal"
                type="number"
                value={currentReport.subTotal}
                onChange={(v) =>
                  setCurrentReport({ ...currentReport, subTotal: v })
                }
              />

              <Field
                label="Discount"
                type="number"
                value={currentReport.discount}
                onChange={(v) =>
                  handleEditAmountFieldChange("discount", v)
                }
              />

              <Field
                label="Delivery Charge"
                type="number"
                value={currentReport.deliveryCharge}
                onChange={(v) =>
                  handleEditAmountFieldChange("deliveryCharge", v)
                }
              />

              <Field
                label="Total"
                type="number"
                value={currentReport.total}
                readOnly
              />

              <Field
                label="Paid Amount"
                type="number"
                value={currentReport.paidAmount}
                onChange={handleEditPaidAmountChange}
              />

              <Field
                label="Due Amount"
                type="number"
                value={currentReport.dueAmount}
                onChange={handleEditDueAmountChange}
              />

              <div className="md:col-span-3">
                <label className="block text-sm text-slate-700">Note</label>
                <textarea
                  value={currentReport.note || ""}
                  onChange={(e) =>
                    setCurrentReport({
                      ...currentReport,
                      note: e.target.value,
                    })
                  }
                  className="border border-slate-200 rounded-xl p-3 w-full mt-1 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                  rows={3}
                />
              </div>

              {(role === "superAdmin" || role === "admin") && (
                <div className="md:col-span-3">
                  <label className="block text-sm text-slate-700">Status</label>
                  <select
                    value={currentReport.status || ""}
                    onChange={(e) =>
                      setCurrentReport({
                        ...currentReport,
                        status: e.target.value,
                      })
                    }
                    className="border border-slate-200 rounded-xl p-3 w-full mt-1 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                  >
                    <option value="">Select Status</option>
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                    <option value="---">---</option>
                  </select>
                </div>
              )}
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-900">
                Product Details
              </h3>
              <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">
                        Product
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-600">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-600">
                        Price
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-600">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {(currentReport.items || []).map((item, index) => (
                      <tr key={`${item?.Id || "item"}-${index}`}>
                        <td className="px-3 py-2 min-w-[240px]">
                          <input
                            type="text"
                            value={getItemDisplayName(item, index)}
                            onChange={(e) =>
                              updateEditItem(index, "name", e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={item?.qty ?? 0}
                            onChange={(e) =>
                              updateEditItem(index, "qty", e.target.value)
                            }
                            className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-slate-900 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={item?.price ?? 0}
                            onChange={(e) =>
                              updateEditItem(index, "price", e.target.value)
                            }
                            className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-slate-900 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-900">
                          {safeNum(item?.total).toFixed(0)}
                        </td>
                      </tr>
                    ))}

                    {(currentReport.items || []).length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-6 text-center text-slate-500"
                        >
                          No product details
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 mt-6 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl border border-slate-200"
                onClick={closeEdit}
              >
                Cancel
              </button>
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl shadow-sm"
                onClick={handleUpdate}
              >
                Save
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* -------------------- Invoice Modal (single) -------------------- */}
      {isInvoiceOpen && invoiceReport && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-3 sm:p-5">
          <motion.div
            className="my-auto flex h-[calc(100vh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.2)] sm:h-[calc(100vh-2.5rem)]"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-slate-900 font-semibold text-lg">
                POS Invoice
              </h2>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={downloadInvoicePDF}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl shadow-sm"
                >
                  Download PDF
                </button>

                <button
                  onClick={closeInvoice}
                  className="bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl border border-slate-200"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-3 sm:p-4">
              <div
                id="posInvoiceCapture"
                ref={invoiceRef}
                className="mx-auto bg-white text-slate-900 rounded-xl p-4 sm:p-6 border border-slate-200"
              >
                <PosInvoiceView report={invoiceReport} />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* -------------------- Bulk Invoice Modal -------------------- */}
      {isBulkInvoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-3 sm:p-5">
          <motion.div
            className="my-auto flex h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.2)] sm:h-[calc(100vh-2.5rem)]"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-slate-900 font-semibold text-lg">
                Selected POS Invoices ({selectedReports.length})
              </h2>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={printBulkInvoices}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl disabled:opacity-60 shadow-sm"
                  disabled={selectedReports.length === 0}
                >
                  Print
                </button>

                <button
                  onClick={downloadBulkInvoicePDF}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl disabled:opacity-60 shadow-sm"
                  disabled={selectedReports.length === 0}
                >
                  Download PDF
                </button>

                <button
                  onClick={() => setIsBulkInvoiceOpen(false)}
                  className="bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl border border-slate-200"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-3 sm:p-4">
              <div ref={bulkInvoiceRef}>
                {selectedReports.map((r) => (
                  <div
                    key={r.Id}
                    className="invoice-page mx-auto bg-white text-slate-900 rounded-xl p-4 sm:p-6 mb-6 border border-slate-200"
                  >
                    <PosInvoiceView report={r} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

function PosInvoiceView({ report }) {
  const safeNum = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);
  const formatDate = (d) => {
    if (!d) return new Date().toLocaleDateString();
    const s = String(d);
    return s.length >= 10 ? s.slice(0, 10) : s;
  };

  const items = getReportItems(report);

  return (
    <>
      <div className="flex justify-between items-start">
        <div className="text-left">
          <DocumentBrand
            align="left"
            subtitle=""
            logoClassName="h-10 max-w-36 object-contain"
            nameClassName="text-xl font-bold text-slate-900"
          />
          <p className="text-sm text-slate-600">Address line</p>
          <p className="text-sm text-slate-600">Phone: +880 9647-555333</p>
        </div>

        <div className="text-right">
          <h3 className="text-xl font-bold">INVOICE</h3>
          <p className="text-sm text-slate-600">
            Date: {formatDate(report?.date)}
          </p>
          <p className="text-sm text-slate-600">
            Invoice No: POS-{report?.Id}-{String(Date.now()).slice(-6)}
          </p>
        </div>
      </div>

      <hr className="my-4 border-slate-200" />

      <div className="flex justify-between gap-3 text-sm">
        <p>
          <b>Customer:</b> {report?.name || "-"}
        </p>
        <p>
          <b>Mobile:</b> {report?.mobile || "-"}
        </p>
      </div>

      <p className="text-sm mt-1">
        <b>Address:</b> {report?.address || "-"}
      </p>

      <hr className="my-4 border-slate-200" />

      <table className="w-full text-sm border border-slate-200">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="p-2 text-left">Item</th>
            <th className="p-2 text-right">Qty</th>
            <th className="p-2 text-right">Price</th>
            <th className="p-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx} className="border-b border-slate-200">
              <td className="p-2">
                {it?.name || `Item ${idx + 1}`}
                {it?.Id ? (
                  <span className="text-xs text-slate-500"> (Id: {it.Id})</span>
                ) : null}
              </td>
              <td className="p-2 text-right">{safeNum(it?.qty)}</td>
              <td className="p-2 text-right">
                {safeNum(it?.price).toFixed(0)}
              </td>
              <td className="p-2 text-right">
                {safeNum(it?.total).toFixed(0)}
              </td>
            </tr>
          ))}
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} className="p-3 text-center text-slate-500">
                No items
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <hr className="my-4 border-slate-200" />

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="text-slate-600">Subtotal</div>
        <div className="text-right font-semibold">
          {safeNum(report?.subTotal).toFixed(0)}
        </div>

        <div className="text-slate-600">Discount</div>
        <div className="text-right font-semibold">
          {safeNum(report?.discount).toFixed(0)}
        </div>

        <div className="text-slate-600">Delivery</div>
        <div className="text-right font-semibold">
          {safeNum(report?.deliveryCharge).toFixed(0)}
        </div>

        <div className="text-slate-900 font-bold text-base">Total</div>
        <div className="text-right font-bold text-base">
          {safeNum(report?.total).toFixed(0)}
        </div>

        <div className="text-slate-600">Paid</div>
        <div className="text-right font-semibold">
          {safeNum(report?.paidAmount).toFixed(0)}
        </div>

        <div className="text-slate-600">Due</div>
        <div className="text-right font-semibold">
          {safeNum(report?.dueAmount).toFixed(0)}
        </div>
      </div>

      <p className="text-xs mt-4 text-slate-600">
        <span className="font-bold">Note: </span>
        {report?.note || "-"}
      </p>

      <div className="mt-10 grid grid-cols-2 gap-10 text-sm">
        <div className="border-t border-slate-300 pt-2 text-center">
          Customer Signature
        </div>
        <div className="border-t border-slate-300 pt-2 text-center">
          Authorized Signature
        </div>
      </div>
    </>
  );
}

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

export default PosReportTable;
