import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  History,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Select from "react-select";

import { useGetAllStockMovementsQuery } from "../../features/stockMovement/stockMovement";

const sourceOptions = [
  { value: "ItemPurchase", label: "Item Purchase" },
  { value: "Factory", label: "Factory" },
  { value: "StockAdjustment", label: "Stock Adjustment" },
  { value: "Mixer", label: "Mixer" },
];

const stockTypeOptions = [
  { value: "ItemStock", label: "Item Stock" },
  { value: "FactoryStock", label: "Factory Stock" },
  { value: "ProductStock", label: "Stock Product" },
  { value: "PackagingStock", label: "Packaging Stock" },
];

const operationOptions = [
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "UPDATE_REVERSE", label: "Update Reverse" },
  { value: "UPDATE_APPLY", label: "Update Apply" },
  { value: "DELETE", label: "Delete" },
];

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
  singleValue: (base) => ({
    ...base,
    color: "#1e293b",
    fontSize: "14px",
    fontWeight: "600",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid #f1f5f9",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
    zIndex: 60,
  }),
};

const formatDate = (value) => {
  if (!value) return "--";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const getSourceLabel = (value) =>
  sourceOptions.find((option) => option.value === value)?.label || value || "--";

const getStockTypeLabel = (value) =>
  stockTypeOptions.find((option) => option.value === value)?.label ||
  value ||
  "--";

const StockMovementTable = () => {
  const [rows, setRows] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [stockType, setStockType] = useState("");
  const [operation, setOperation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
  }, [itemsPerPage, searchTerm, sourceType, stockType, operation, startDate, endDate]);

  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      searchTerm: searchTerm || undefined,
      sourceType: sourceType || undefined,
      stockType: stockType || undefined,
      operation: operation || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };
    Object.keys(args).forEach((key) => {
      if (!args[key]) delete args[key];
    });
    return args;
  }, [
    currentPage,
    itemsPerPage,
    searchTerm,
    sourceType,
    stockType,
    operation,
    startDate,
    endDate,
  ]);

  const { data, isLoading, isFetching } =
    useGetAllStockMovementsQuery(queryArgs);

  useEffect(() => {
    if (data) {
      setRows(data.data || []);
      setTotalPages(
        Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)),
      );
    }
  }, [data, itemsPerPage]);

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    if (page < startPage) setStartPage(page);
    else if (page > endPage) setStartPage(page - pagesPerSet + 1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSourceType("");
    setStockType("");
    setOperation("");
    setStartDate("");
    setEndDate("");
  };

  const totalMovements = data?.meta?.count || 0;

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-sm rounded-3xl p-4 sm:p-8 border border-slate-100 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Stock Movement
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Immutable stock audit trail across purchase, factory, adjustment and mixer
          </p>
        </div>

        <div className="inline-flex items-center gap-4 bg-indigo-50 border border-indigo-100 px-6 py-3 rounded-2xl shadow-sm shadow-indigo-50">
          <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
            <History size={20} />
          </div>
          <div>
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
              Movements
            </div>
            <div className="text-xl font-black text-indigo-900 tabular-nums">
              {isLoading ? "..." : totalMovements.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 mb-8 bg-slate-50/50 p-5 rounded-3xl border border-slate-100 items-end">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 block">
            Per Page
          </label>
          <select
            value={itemsPerPage}
            onChange={(event) => setItemsPerPage(Number(event.target.value))}
            className="h-11 w-full px-4 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold text-sm"
          >
            {[10, 20, 50, 100].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="xl:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 block">
            Search
          </label>
          <div className="relative">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search source, stock type, item..."
              className="h-11 w-full pl-11 pr-4 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-semibold text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 block">
            Source
          </label>
          <Select
            options={sourceOptions}
            value={sourceOptions.find((option) => option.value === sourceType) || null}
            onChange={(selected) => setSourceType(selected?.value || "")}
            placeholder="All sources"
            isClearable
            styles={selectStyles}
            className="text-black"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 block">
            Stock Type
          </label>
          <Select
            options={stockTypeOptions}
            value={stockTypeOptions.find((option) => option.value === stockType) || null}
            onChange={(selected) => setStockType(selected?.value || "")}
            placeholder="All stock"
            isClearable
            styles={selectStyles}
            className="text-black"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 block">
            Operation
          </label>
          <Select
            options={operationOptions}
            value={operationOptions.find((option) => option.value === operation) || null}
            onChange={(selected) => setOperation(selected?.value || "")}
            placeholder="All"
            isClearable
            styles={selectStyles}
            className="text-black"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 block">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="h-11 w-full px-4 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-semibold text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 block">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="h-11 w-full px-4 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-semibold text-sm"
          />
        </div>

        <button
          type="button"
          onClick={clearFilters}
          className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 transition rounded-xl px-4 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 border border-slate-200"
        >
          <X size={16} />
          Clear Filters
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/70">
              <tr>
                {[
                  "Date",
                  "Source",
                  "Stock Type",
                  "Item / Product",
                  "Movement",
                  "Before",
                  "After",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const change = Number(row.quantityChange || 0);
                const isIn = change > 0;
                return (
                  <motion.tr
                    key={row.Id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-indigo-50/30 transition-colors group"
                  >
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 group-hover:text-indigo-600">
                        <Calendar size={14} className="opacity-40" />
                        {formatDate(row.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-black text-slate-900">
                        {getSourceLabel(row.sourceType)}
                      </div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        #{row.sourceId || "--"} · {row.operation || "--"}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="inline-flex px-3 py-1.5 rounded-2xl text-xs font-black bg-slate-100 text-slate-700 border border-slate-200">
                        {getStockTypeLabel(row.stockType)}
                      </span>
                    </td>
                    <td className="px-6 py-5 min-w-[220px]">
                      <div className="text-sm font-black text-slate-900">
                        {row.name || "--"}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-400">
                        Item: {row.itemId || "--"} · Product: {row.productId || "--"}
                        {row.manufacturerId ? ` · Manufacturer: ${row.manufacturerId}` : ""}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl text-xs font-black border tabular-nums ${
                          isIn
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-100"
                        }`}
                      >
                        {isIn ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                        {isIn ? "+" : ""}
                        {formatNumber(change)} {row.unit || "Pcs"}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-slate-600 tabular-nums">
                      {formatNumber(row.balanceBefore)} {row.unit || "Pcs"}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-slate-900 tabular-nums">
                      {formatNumber(row.balanceAfter)} {row.unit || "Pcs"}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>

          {(isLoading || isFetching) && (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-[3px] border-indigo-600/20 border-t-indigo-600" />
              <p className="text-slate-500 text-sm mt-4 font-bold tracking-tight">
                Loading stock movements...
              </p>
            </div>
          )}

          {!isLoading && !isFetching && rows.length === 0 && (
            <div className="py-20 text-center text-slate-400">
              <History size={44} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold text-sm italic">
                No stock movement found
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between mt-10 gap-6 px-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Showing Page <span className="text-indigo-600">{currentPage}</span> of{" "}
          <span className="text-slate-900">{totalPages}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStartPage((prev) => Math.max(prev - pagesPerSet, 1))}
            disabled={startPage === 1}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <ChevronLeft size={16} />
            Prev
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
            onClick={() =>
              setStartPage((prev) =>
                Math.min(
                  prev + pagesPerSet,
                  Math.max(1, totalPages - pagesPerSet + 1),
                ),
              )
            }
            disabled={endPage === totalPages}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default StockMovementTable;
