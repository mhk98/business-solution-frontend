import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, PackageCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Select from "react-select";

import DateRangeFilter from "../common/DateRangeFilter";
import { useGetAllPackagingItemWithoutQueryQuery } from "../../features/packagingItem/packagingItem";
import { useGetAllPackagingItemStockQuery } from "../../features/packagingItemStock/packagingItemStock";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 12,
    borderColor: state.isFocused ? "#6366f1" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 4px rgba(99, 102, 241, 0.1)" : "none",
    "&:hover": { borderColor: "#cbd5e1" },
    backgroundColor: "white",
  }),
  menu: (base) => ({ ...base, zIndex: 50, borderRadius: 14, overflow: "hidden" }),
  placeholder: (base) => ({ ...base, color: "#94a3b8", fontSize: 14 }),
  singleValue: (base) => ({ ...base, color: "#1e293b", fontSize: 14, fontWeight: 500 }),
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getUnitCost = (row) => {
  const cost = Number(row?.cost || 0);
  const unitValue = Number(row?.unitValue || 0);
  if (!cost || !unitValue) return 0;
  return cost / unitValue;
};

const PackagingItemStockTable = () => {
  const [rows, setRows] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [name, setName] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [startDate, endDate, name, itemsPerPage]);

  const { data: itemRes } = useGetAllPackagingItemWithoutQueryQuery();
  const itemOptions = useMemo(
    () => (itemRes?.data || []).map((item) => ({ value: item.name, label: item.name })),
    [itemRes?.data],
  );

  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      name: name || undefined,
    };
    Object.keys(args).forEach((key) => !args[key] && delete args[key]);
    return args;
  }, [currentPage, endDate, itemsPerPage, name, startDate]);

  const { data, isLoading } = useGetAllPackagingItemStockQuery(queryArgs);

  useEffect(() => {
    if (!isLoading && data) {
      setRows(data.data || []);
      setTotalPages(Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)));
    }
  }, [data, isLoading, itemsPerPage]);

  const endPage = Math.min(startPage + 9, totalPages);

  return (
    <motion.div className="bg-white/90 backdrop-blur-md shadow-sm rounded-3xl p-4 sm:p-8 border border-slate-100 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Packaging Item Stock</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Real-time packaging item stock levels.</p>
        </div>
        <div className="inline-flex items-center gap-4 bg-indigo-50 border border-indigo-100 px-6 py-3 rounded-2xl shadow-sm shadow-indigo-50">
          <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
            <PackageCheck size={20} />
          </div>
          <div>
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Total Stock</div>
            <div className="text-xl font-black text-indigo-900 tabular-nums">
              {isLoading ? "Syncing" : (data?.meta?.totalQuantity ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 items-end">
        <DateRangeFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} compact className="sm:col-span-2" />
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 block">Per Page</label>
          <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none w-full font-bold text-sm">
            {[10, 20, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 block">Packaging Item</label>
          <Select options={itemOptions} value={itemOptions.find((option) => option.value === name) || null} onChange={(selected) => setName(selected?.value || "")} placeholder="Search..." isClearable styles={selectStyles} />
        </div>
        <button className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl px-4 text-sm font-bold flex items-center justify-center gap-2 border border-slate-200" onClick={() => { setStartDate(""); setEndDate(""); setName(""); }} type="button">
          <X size={16} /> Clear
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                {["Packaging Item", "Quantity", "Unit", "Unit Cost", "Total Cost"].map((head) => (
                  <th key={head} className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.Id} className="hover:bg-indigo-50/30">
                  <td className="px-6 py-5 text-sm font-bold text-slate-900">{row.name}</td>
                  <td className="px-6 py-5 text-sm font-semibold text-slate-700">{Number(row.unitValue || 0).toLocaleString()}</td>
                  <td className="px-6 py-5 text-sm text-slate-600">{row.unit || "Pcs"}</td>
                  <td className="px-6 py-5 text-sm text-slate-700">{formatMoney(getUnitCost(row))}</td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-900">{formatMoney(row.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoading && <div className="py-20 text-center text-slate-500 font-bold">Syncing...</div>}
          {!isLoading && rows.length === 0 && (
            <div className="py-20 text-center text-slate-400">
              <PackageCheck className="mx-auto mb-4 opacity-30" size={42} />
              <p className="font-bold text-sm italic">No packaging item stock found.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-10 gap-6 px-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Showing Page <span className="text-indigo-600">{currentPage}</span> of <span className="text-slate-900">{totalPages}</span></p>
        <div className="flex items-center gap-2">
          <button disabled={startPage === 1} onClick={() => setStartPage((prev) => Math.max(prev - 10, 1))} className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm disabled:opacity-50 flex items-center gap-2" type="button"><ChevronLeft size={16} /> Prev</button>
          {[...Array(endPage - startPage + 1)].map((_, index) => {
            const page = startPage + index;
            return <button key={page} onClick={() => setCurrentPage(page)} className={`h-11 w-11 rounded-2xl font-black text-sm ${page === currentPage ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-100"}`} type="button">{page}</button>;
          })}
          <button disabled={endPage === totalPages} onClick={() => setStartPage((prev) => Math.min(prev + 10, Math.max(1, totalPages - 9)))} className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm disabled:opacity-50 flex items-center gap-2" type="button">Next <ChevronRight size={16} /></button>
        </div>
      </div>
    </motion.div>
  );
};

export default PackagingItemStockTable;
