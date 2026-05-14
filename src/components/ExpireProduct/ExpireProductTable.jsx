import { motion } from "framer-motion";
import { RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useGetAllWarrantyProductQuery } from "../../features/warrantyProduct/warrantyProduct";
import useDebounce from "../../hooks/useDebounce";


// ✅ তোমার query hook

const ExpireProductTable = () => {
  const SOON_DAYS = 30;

  // menu
  const [view, setView] = useState("soon"); // "soon" | "expired"

  // filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  // pagination
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

  // responsive pagesPerSet
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

  // reset page when filters/perPage change
  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [startDate, endDate, searchTerm, itemsPerPage, view]);

  // fix endDate
  useEffect(() => {
    if (startDate && endDate && startDate > endDate) setEndDate(startDate);
  }, [startDate, endDate]);

  // ✅ query args
  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      searchTerm: debouncedSearchTerm?.trim() || undefined,
    };

    Object.keys(args).forEach((k) => {
      if (args[k] === undefined || args[k] === null || args[k] === "") {
        delete args[k];
      }
    });

    return args;
  }, [currentPage, itemsPerPage, startDate, endDate, searchTerm]);

  // ✅ API call
  const { data, isLoading, isError, error, refetch } =
    useGetAllWarrantyProductQuery(queryArgs);

  // ✅ rows from API response
  const rows = data?.data || [];

  // ✅ set total pages from meta.count
  useEffect(() => {
    if (isError) {
      console.error("ExpireProduct fetch error:", error);
      // toast.error(error?.data?.message || "Failed to load data");
    }
    if (!isLoading && data?.meta) {
      const count = Number(data?.meta?.count || 0);
      setTotalPages(Math.max(1, Math.ceil(count / itemsPerPage)));
    }
  }, [isError, error, isLoading, data, itemsPerPage]);

  // helpers
  const normalizeDate = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const addWarranty = (createdAt, value, unit) => {
    if (!createdAt) return null;

    const v = Number(value || 0);
    const u = String(unit || "")
      .toLowerCase()
      .trim();
    if (!v || !u) return null;

    const base = normalizeDate(createdAt);
    const d = new Date(base);

    if (u.startsWith("day")) d.setDate(d.getDate() + v);
    else if (u.startsWith("month")) d.setMonth(d.getMonth() + v);
    else if (u.startsWith("year")) d.setFullYear(d.getFullYear() + v);
    else return null;

    d.setHours(0, 0, 0, 0);
    return d;
  };

  const diffDays = (from, to) => {
    const ms = normalizeDate(to) - normalizeDate(from);
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  };

  const formatDate = (d) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return "-";
    }
  };

  const formatMoney = (n) => Number(n || 0).toFixed(2);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // computedRows: add expiryDate + daysLeft, then filter by menu
  const computedRows = useMemo(() => {
    const list = rows.map((r) => {
      const expiryDate = addWarranty(
        r.createdAt,
        r.warrantyValue,
        r.warrantyUnit,
      );
      const daysLeft = expiryDate ? diffDays(today, expiryDate) : null;
      return { ...r, expiryDate, daysLeft };
    });

    if (view === "expired") {
      return list.filter((r) => r.expiryDate && r.daysLeft < 0);
    }

    return list.filter(
      (r) => r.expiryDate && r.daysLeft >= 0 && r.daysLeft <= SOON_DAYS,
    );
  }, [rows, today, view]);

  // counts for badges
  const counts = useMemo(() => {
    const list = rows.map((r) => {
      const expiryDate = addWarranty(
        r.createdAt,
        r.warrantyValue,
        r.warrantyUnit,
      );
      const daysLeft = expiryDate ? diffDays(today, expiryDate) : null;
      return { ...r, expiryDate, daysLeft };
    });

    const expired = list.filter((r) => r.expiryDate && r.daysLeft < 0).length;
    const soon = list.filter(
      (r) => r.expiryDate && r.daysLeft >= 0 && r.daysLeft <= SOON_DAYS,
    ).length;

    return { expired, soon };
  }, [rows, today]);

  // clear filters
  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
  };

  // pagination helpers
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

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Warranty Expire Products
          </h2>
          {/* <p className="text-sm text-slate-600">
            Expiry হিসাব হবে createdAt + warrantyValue + warrantyUnit
          </p> */}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch?.()}
            className="inline-flex items-center justify-center rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition"
          >
            Refresh <RotateCcw size={18} className="ml-2 text-amber-500" />
          </button>
        </div>
      </div>

      {/* Menu */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setView("soon")}
          className={`h-10 px-4 rounded-xl border text-sm font-semibold transition ${view === "soon"
            ? "bg-indigo-600 text-white border-indigo-600"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
        >
          Soon Expire
          <span
            className={`ml-2 inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-bold ${view === "soon"
              ? "bg-white/20 text-white"
              : "bg-indigo-50 text-indigo-700"
              }`}
          >
            {counts.soon}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setView("expired")}
          className={`h-10 px-4 rounded-xl border text-sm font-semibold transition ${view === "expired"
            ? "bg-rose-600 text-white border-rose-600"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
        >
          Expired
          <span
            className={`ml-2 inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-bold ${view === "expired"
              ? "bg-white/20 text-white"
              : "bg-rose-50 text-rose-700"
              }`}
          >
            {counts.expired}
          </span>
        </button>
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

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Search</label>
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name/supplier..."
              className="h-11 w-full pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none
                         focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
            />
          </div>
        </div>

        <button
          type="button"
          className="h-11 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 transition rounded-xl px-4 text-sm font-semibold"
          onClick={clearFilters}
        >
          Clear Filters
        </button>
      </div>

      {/* Total card */}
      <div className="mt-4 flex items-center justify-between sm:justify-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="text-slate-700 text-sm font-medium">
          Total Quantity (API)
        </div>
        <div className="text-slate-900 font-semibold tabular-nums">
          {isLoading ? "Loading..." : (data?.meta?.totalQuantity ?? 0)}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mt-6 rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Unit Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Warranty
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Expiry Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Days Left
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {computedRows.map((rp) => (
              <motion.tr
                key={rp.Id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="hover:bg-slate-50"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {formatDate(rp.date)}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                  {rp.name || "-"}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 tabular-nums">
                  {Number(rp.quantity || 0)}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 tabular-nums">
                  {formatMoney(rp.price)}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {rp.warrantyValue
                    ? `${rp.warrantyValue} ${rp.warrantyUnit || ""}`
                    : "-"}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {rp.expiryDate ? rp.expiryDate.toLocaleDateString() : "-"}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm tabular-nums">
                  {rp.daysLeft === null ? (
                    <span className="text-slate-500">-</span>
                  ) : rp.daysLeft < 0 ? (
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border bg-rose-50 text-rose-700 border-rose-200">
                      {rp.daysLeft} (Expired)
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">
                      {rp.daysLeft} days
                    </span>
                  )}
                </td>
              </motion.tr>
            ))}

            {!isLoading && computedRows.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-6 py-10 text-center text-sm text-slate-500"
                >
                  No data found
                </td>
              </tr>
            )}

            {isLoading && (
              <tr>
                <td
                  colSpan={10}
                  className="px-6 py-10 text-center text-sm text-slate-500"
                >
                  Loading...
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
          Prev
        </button>

        {[...Array(endPage - startPage + 1)].map((_, idx) => {
          const pageNum = startPage + idx;
          const active = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`px-4 py-2 rounded-xl border transition ${active
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
          Next
        </button>
      </div>
    </motion.div>
  );
};

export default ExpireProductTable;
