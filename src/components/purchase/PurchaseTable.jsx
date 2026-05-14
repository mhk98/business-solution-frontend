import { motion } from "framer-motion";
import { Download, Edit, FileDown, Plus, Trash2, X, ChevronLeft, ChevronRight, ReceiptText, Calendar, User, Package } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Select from "react-select";
import {
  useDeletePurchaseMutation,
  useGetAllPurchaseQuery,
  useInsertPurchaseMutation,
  useUpdatePurchaseMutation,
} from "../../features/purchase/purchase";
import { useGetAllSupplierWithoutQueryQuery } from "../../features/supplier/supplier";
import { useGetAllProductWithoutQueryQuery } from "../../features/product/product";
import Modal from "../common/Modal";

const PurchaseTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPurchase, setCurrentPurchase] = useState(null);
  const [isModalOpen1, setIsModalOpen1] = useState(false);

  const [createPurchase, setCreatePurchase] = useState({
    productId: "",
    supplierId: "",
    transaction_date: new Date().toISOString().split("T")[0],
    quantity: "",
    rate: "",
    paid_amount: "",
    remarks: "",
  });

  const [purchases, setPurchases] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterSupplierId, setFilterSupplierId] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);
  const itemsPerPage = 10;

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

  const queryArgs = useMemo(() => ({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    supplierId: filterSupplierId || undefined,
    page: currentPage,
    limit: itemsPerPage,
  }), [startDate, endDate, filterSupplierId, currentPage, itemsPerPage]);

  const { data, isLoading, refetch } = useGetAllPurchaseQuery(queryArgs);

  useEffect(() => {
    if (!isLoading && data) {
      setPurchases(data.data || []);
      setTotalPages(Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)));
    }
  }, [data, isLoading, itemsPerPage]);

  // Suppliers & Products for Selects
  const { data: supplierRes } = useGetAllSupplierWithoutQueryQuery();
  const { data: productRes } = useGetAllProductWithoutQueryQuery();

  const supplierOptions = useMemo(() =>
    (supplierRes?.data || []).map(s => ({ value: s.Id, label: s.name })),
    [supplierRes]
  );

  const productOptions = useMemo(() =>
    (productRes?.data || []).map(p => ({ value: p.Id, label: p.name })),
    [productRes]
  );

  const [insertPurchase] = useInsertPurchaseMutation();
  const handleCreatePurchase = async (e) => {
    e.preventDefault();
    try {
      const res = await insertPurchase({
        ...createPurchase,
        quantity: Number(createPurchase.quantity),
        rate: Number(createPurchase.rate),
        paid_amount: Number(createPurchase.paid_amount),
      }).unwrap();
      if (res.success) {
        toast.success("Purchase recorded successfully");
        setIsModalOpen1(false);
        setCreatePurchase({
          productId: "",
          supplierId: "",
          transaction_date: new Date().toISOString().split("T")[0],
          quantity: "",
          rate: "",
          paid_amount: "",
          remarks: "",
        });
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Creation failed");
    }
  };

  const [updatePurchase] = useUpdatePurchaseMutation();
  const handleUpdatePurchase = async (e) => {
    e.preventDefault();
    try {
      const res = await updatePurchase({
        id: currentPurchase.Id,
        data: {
          productId: currentPurchase.productId,
          supplierId: currentPurchase.supplierId,
          transaction_date: currentPurchase.transaction_date,
          quantity: Number(currentPurchase.quantity),
          rate: Number(currentPurchase.rate),
          paid_amount: Number(currentPurchase.paid_amount),
          remarks: currentPurchase.remarks,
        },
      }).unwrap();
      if (res.success) {
        toast.success("Purchase updated successfully");
        setIsModalOpen(false);
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed");
    }
  };

  const [deletePurchase] = useDeletePurchaseMutation();
  const handleDeletePurchase = async (id) => {
    if (await requestDeleteConfirmation({ message: "Are you sure you want to delete this purchase record?" })) {
      try {
        const res = await deletePurchase(id).unwrap();
        if (res.success) {
          toast.success("Deleted successfully");
          refetch();
        }
      } catch (err) {
        toast.error(err?.data?.message || "Delete failed");
      }
    }
  };

  const handleDownloadPDF = (p) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text("PURCHASE INVOICE", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Invoice ID: ${p.Id}`, 14, 35);
    doc.text(`Date: ${p.transaction_date}`, 14, 40);

    const tableData = [
      ["Product", "Supplier", "Quantity", "Rate", "Total", "Paid", "Due"],
      [
        p.product_name,
        p.supplier_name,
        `${Number(p.quantity).toFixed(2)}`,
        `৳${Number(p.rate).toLocaleString()}`,
        `৳${Number(p.price).toLocaleString()}`,
        `৳${Number(p.paid_amount).toLocaleString()}`,
        `৳${Number(p.due_amount).toLocaleString()}`
      ]
    ];

    autoTable(doc, {
      head: [tableData[0]],
      body: [tableData[1]],
      startY: 50,
      theme: "grid",
      headStyles: { fillGray: [79, 70, 229], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 5 }
    });

    if (p.remarks) {
      doc.text("Remarks:", 14, doc.lastAutoTable.finalY + 15);
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(p.remarks, 14, doc.lastAutoTable.finalY + 22);
    }

    doc.save(`Purchase_${p.Id}.pdf`);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(purchases);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchases");
    XLSX.writeFile(wb, `Purchases_Export_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);
  const handlePageChange = (p) => {
    setCurrentPage(p);
    if (p < startPage) setStartPage(p);
    else if (p > endPage) setStartPage(p - pagesPerSet + 1);
  };

  const handlePreviousSet = () => setStartPage((p) => Math.max(p - pagesPerSet, 1));
  const handleNextSet = () => setStartPage((p) => Math.min(p + pagesPerSet, Math.max(1, totalPages - pagesPerSet + 1)));

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 14,
      borderColor: state.isFocused ? "#6366f1" : "#e2e8f0",
      boxShadow: state.isFocused ? "0 0 0 4px rgba(99,102,241,0.1)" : "none",
      "&:hover": { borderColor: "#cbd5e1" },
      backgroundColor: "white",
    }),
    placeholder: (base) => ({ ...base, color: "#94a3b8", fontSize: "14px" }),
    singleValue: (base) => ({ ...base, color: "#1e293b", fontSize: "14px", fontWeight: "500" }),
    menu: (base) => ({
      ...base,
      borderRadius: 14,
      overflow: "hidden",
      border: "1px solid #f1f5f9",
      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
      zIndex: 50
    }),
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-sm rounded-3xl p-4 sm:p-8 border border-slate-100 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Purchase Inventory</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Manage and monitor all incoming product supplies</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={exportToExcel}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all px-6 py-3 rounded-2xl text-sm font-bold active:scale-95"
          >
            <FileDown size={18} /> Export Excel
          </button>
          <button
            onClick={() => setIsModalOpen1(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 active:scale-95"
          >
            <Plus size={18} /> Record Purchase
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 items-end">
        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium text-sm"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium text-sm"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Supplier</label>
          <Select
            options={supplierOptions}
            value={supplierOptions.find(o => o.value === filterSupplierId) || null}
            onChange={(s) => setFilterSupplierId(s?.value || "")}
            placeholder="Search supplier..."
            isClearable
            styles={selectStyles}
          />
        </div>

        <button
          className="h-11 bg-white hover:bg-slate-100 text-slate-600 transition rounded-xl px-4 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 border border-slate-200"
          onClick={() => { setStartDate(""); setEndDate(""); setFilterSupplierId(""); }}
        >
          <X size={16} /> Clear All
        </button>
      </div>

      {/* Table */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">Transaction</th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">Item Details</th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">Financials</th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">Payments</th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {purchases.map((p) => (
                <motion.tr
                  key={p.Id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-indigo-50/30 transition-colors group"
                >
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="text-sm font-bold text-slate-900">{new Date(p.transaction_date).toLocaleDateString()}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: #{p.Id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{p.product_name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {p.supplier_name}
                        </span>
                        <span className="text-xs font-bold text-slate-400">Qty: {Number(p.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap font-medium">
                    <div className="flex flex-col gap-1">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        Rate: <span className="text-slate-900">৳{Number(p.rate).toLocaleString()}</span>
                      </div>
                      <div className="text-sm font-black text-indigo-600">
                        ৳{Number(p.price).toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                        <span className="text-[11px] font-bold text-slate-700">Paid: ৳{Number(p.paid_amount).toLocaleString()}</span>
                      </div>
                      {Number(p.due_amount) > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                          <span className="text-[11px] font-black text-rose-600">Due: ৳{Number(p.due_amount).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDownloadPDF(p)}
                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition shadow-sm active:scale-90"
                        title="Download Invoice"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => { setCurrentPurchase(p); setIsModalOpen(true); }}
                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition shadow-sm active:scale-90"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeletePurchase(p.Id)}
                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition shadow-sm active:scale-90"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {isLoading && (
            <div className="py-24 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-[3px] border-indigo-600/20 border-t-indigo-600"></div>
            </div>
          )}

          {!isLoading && purchases.length === 0 && (
            <div className="py-24 text-center text-slate-400">
              <div className="text-4xl mb-4 opacity-20">📦</div>
              <p className="font-bold text-sm italic">No purchase records found</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between mt-10 gap-6 px-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Showing Page <span className="text-indigo-600">{currentPage}</span> of <span className="text-slate-900">{totalPages}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousSet}
            disabled={startPage === 1}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <div className="flex items-center gap-1.5">
            {[...Array(endPage - startPage + 1)].map((_, index) => {
              const pageNum = startPage + index;
              const active = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`h-11 w-11 rounded-2xl font-black text-sm transition-all active:scale-90 ${active ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100" : "bg-white text-slate-600 border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600"
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
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={isModalOpen1} onClose={() => setIsModalOpen1(false)} title="Add Purchase Record">
        <form onSubmit={handleCreatePurchase} className="space-y-5 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1 flex items-center gap-1.5">
                <Package size={12} className="text-indigo-500" /> Select Product
              </label>
              <Select
                options={productOptions}
                value={productOptions.find(o => o.value === createPurchase.productId) || null}
                onChange={(s) => setCreatePurchase({ ...createPurchase, productId: s?.value || "" })}
                placeholder="Find product..."
                styles={selectStyles}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1 flex items-center gap-1.5">
                <User size={12} className="text-indigo-500" /> Select Supplier
              </label>
              <Select
                options={supplierOptions}
                value={supplierOptions.find(o => o.value === createPurchase.supplierId) || null}
                onChange={(s) => setCreatePurchase({ ...createPurchase, supplierId: s?.value || "" })}
                placeholder="Find supplier..."
                styles={selectStyles}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1 flex items-center gap-1.5">
                <Calendar size={12} className="text-indigo-500" /> Date
              </label>
              <input
                type="date"
                required
                value={createPurchase.transaction_date}
                onChange={(e) => setCreatePurchase({ ...createPurchase, transaction_date: e.target.value })}
                className="h-11 w-full px-4 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1 flex items-center gap-1.5">
                <ReceiptText size={12} className="text-indigo-500" /> Quantity
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={createPurchase.quantity}
                onChange={(e) => setCreatePurchase({ ...createPurchase, quantity: e.target.value })}
                className="h-11 w-full px-4 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold text-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1 flex items-center gap-1.5">
                <span className="text-indigo-500 font-black">৳</span> Rate / Unit
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={createPurchase.rate}
                onChange={(e) => setCreatePurchase({ ...createPurchase, rate: e.target.value })}
                className="h-11 w-full px-4 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold text-sm"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1 flex items-center gap-1.5">
                <span className="text-emerald-500 font-black">৳</span> Amount Paid
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={createPurchase.paid_amount}
                onChange={(e) => setCreatePurchase({ ...createPurchase, paid_amount: e.target.value })}
                className="h-11 w-full px-4 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold text-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">Remarks / Note</label>
            <textarea
              value={createPurchase.remarks}
              onChange={(e) => setCreatePurchase({ ...createPurchase, remarks: e.target.value })}
              className="w-full min-h-[80px] px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium text-sm resize-none"
              placeholder="Add any extra details..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen1(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" className="px-10 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100">Log Purchase</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit Purchase Record">
        {currentPurchase && (
          <form onSubmit={handleUpdatePurchase} className="space-y-5 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">Update Product</label>
                <Select
                  options={productOptions}
                  value={productOptions.find(o => o.value === currentPurchase.productId) || null}
                  onChange={(s) => setCurrentPurchase({ ...currentPurchase, productId: s?.value || "" })}
                  styles={selectStyles}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">Update Supplier</label>
                <Select
                  options={supplierOptions}
                  value={supplierOptions.find(o => o.value === currentPurchase.supplierId) || null}
                  onChange={(s) => setCurrentPurchase({ ...currentPurchase, supplierId: s?.value || "" })}
                  styles={selectStyles}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">Transaction Date</label>
                <input
                  type="date"
                  required
                  value={currentPurchase.transaction_date.split("T")[0]}
                  onChange={(e) => setCurrentPurchase({ ...currentPurchase, transaction_date: e.target.value })}
                  className="h-11 w-full px-4 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">Update Quantity</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={currentPurchase.quantity}
                  onChange={(e) => setCurrentPurchase({ ...currentPurchase, quantity: e.target.value })}
                  className="h-11 w-full px-4 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">Unit Rate (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={currentPurchase.rate}
                  onChange={(e) => setCurrentPurchase({ ...currentPurchase, rate: e.target.value })}
                  className="h-11 w-full px-4 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">Paid Amount (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={currentPurchase.paid_amount}
                  onChange={(e) => setCurrentPurchase({ ...currentPurchase, paid_amount: e.target.value })}
                  className="h-11 w-full px-4 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">Maintenance Note</label>
              <textarea
                value={currentPurchase.remarks}
                onChange={(e) => setCurrentPurchase({ ...currentPurchase, remarks: e.target.value })}
                className="w-full min-h-[80px] px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium text-sm resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition">Cancel</button>
              <button type="submit" className="px-10 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100">Update Record</button>
            </div>
          </form>
        )}
      </Modal>
    </motion.div>
  );
};

export default PurchaseTable;
