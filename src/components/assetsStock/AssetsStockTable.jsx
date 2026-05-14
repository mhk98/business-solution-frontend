import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { Boxes, Calendar, X } from "lucide-react";
import {
  useGetAllAssetsStockQuery,
  useGetAllAssetsStockWithoutQueryQuery,
} from "../../features/assetsStock/assetsStock";

const AssetsStockTable = () => {
  const [rows, setRows] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [productName, setProductName] = useState("");
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
  }, [startDate, endDate, productName, itemsPerPage]);

  useEffect(() => {
    if (startDate && endDate && startDate > endDate) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const handlePageChange = (page) => {
    setCurrentPage(page);

    if (page < startPage) setStartPage(page);
    else if (page > endPage) setStartPage(page - pagesPerSet + 1);
  };

  const { data: allStockRes, isLoading: isLoadingAllStock } =
    useGetAllAssetsStockWithoutQueryQuery();

  const stockOptions = useMemo(
    () =>
      (allStockRes?.data || []).map((row) => ({
        value: row.Id,
        label: row.name,
      })),
    [allStockRes],
  );

  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      name: productName || undefined,
    };

    Object.keys(args).forEach((key) => {
      if (!args[key]) delete args[key];
    });

    return args;
  }, [currentPage, itemsPerPage, startDate, endDate, productName]);

  const { data, isLoading } = useGetAllAssetsStockQuery(queryArgs);

  useEffect(() => {
    if (!isLoading && data) {
      setRows(data?.data || []);
      setTotalPages(
        Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)),
      );
    }
  }, [data, isLoading, itemsPerPage]);

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
      fontWeight: "500",
    }),
    menu: (base) => ({
      ...base,
      borderRadius: 14,
      overflow: "hidden",
      border: "1px solid #f1f5f9",
      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
      zIndex: 50,
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
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Assets Stock
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Available asset stock after purchase, sale and damage movements
          </p>
        </div>

        <div className="inline-flex items-center gap-4 bg-indigo-50 border border-indigo-100 px-6 py-3 rounded-2xl shadow-sm shadow-indigo-50">
          <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
            <Boxes size={20} />
          </div>
          <div>
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
              Total Stock
            </div>
            <div className="text-xl font-black text-indigo-900 tabular-nums">
              {isLoading
                ? "Syncing..."
                : (data?.meta?.totalQuantity ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 items-end">
        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Per Page
          </label>
          <Select
            options={[10, 20, 50, 100].map((value) => ({
              value,
              label: String(value),
            }))}
            value={{ value: itemsPerPage, label: String(itemsPerPage) }}
            onChange={(selected) => setItemsPerPage(selected?.value || 10)}
            styles={selectStyles}
            className="text-black"
          />
        </div>

        <div className="flex flex-col sm:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Search Asset
          </label>
          <Select
            options={stockOptions}
            value={
              stockOptions.find((option) => option.label === productName) ||
              null
            }
            onChange={(selected) => setProductName(selected?.label || "")}
            placeholder={isLoadingAllStock ? "Syncing..." : "Select asset"}
            isClearable
            isDisabled={isLoadingAllStock}
            styles={selectStyles}
            className="text-black"
          />
        </div>

        <button
          className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 transition rounded-xl px-4 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 border border-slate-200"
          onClick={() => {
            setProductName("");
            setStartDate("");
            setEndDate("");
          }}
          type="button"
        >
          <X size={16} /> Reset
        </button>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Start Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-11 px-4 pr-10 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
            />
            <Calendar
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            End Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-11 px-4 pr-10 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
            />
            <Calendar
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">
                Quantity
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">
                Price
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.Id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                    {row.date || "---"}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                    {Number(row.quantity || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                    ৳{Number(row.price || 0).toLocaleString()}
                  </td>

                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                      {row.status || "Active"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm font-semibold text-slate-400"
                >
                  {isLoading
                    ? "Syncing assets stock..."
                    : "No assets stock found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center flex-wrap gap-2 mt-6">
        <button
          onClick={() =>
            setStartPage((prev) => Math.max(prev - pagesPerSet, 1))
          }
          disabled={startPage === 1}
          className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
          type="button"
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
              type="button"
            >
              {pageNum}
            </button>
          );
        })}

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
          className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
          type="button"
        >
          Next
        </button>
      </div>
    </motion.div>
  );
};

export default AssetsStockTable;
