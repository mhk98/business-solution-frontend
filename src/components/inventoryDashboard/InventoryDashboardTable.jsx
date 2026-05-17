import { useEffect, useMemo, useState } from "react";
import { useGetInventoryListQuery } from "../../features/inventoryDashboard/inventoryDashboard";
import { useGetAllProductWithoutQueryQuery } from "../../features/product/product";
import Select from "react-select";
import { motion } from "framer-motion";
import { ShoppingBasket } from "lucide-react";

const getNumberValue = (...values) => {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue) && numberValue > 0) return numberValue;
  }

  return 0;
};

const getInventoryTotalPages = ({ meta, rows, page, limit }) => {
  const explicitTotalPages = getNumberValue(
    meta?.totalPages,
    meta?.totalPage,
    meta?.lastPage,
    meta?.pageCount,
    meta?.pagination?.totalPages,
    meta?.pagination?.lastPage,
  );

  if (explicitTotalPages) return explicitTotalPages;

  const totalCount = getNumberValue(
    meta?.total,
    meta?.totalCount,
    meta?.totalItems,
    meta?.totalRecords,
    meta?.recordsTotal,
    meta?.pagination?.total,
    meta?.pagination?.totalItems,
    meta?.count,
  );

  const pagesFromCount = totalCount ? Math.ceil(totalCount / limit) : 0;
  const hasNextPage =
    Boolean(
      meta?.hasNextPage ??
      meta?.hasNext ??
      meta?.pagination?.hasNextPage ??
      meta?.pagination?.hasNext,
    ) ||
    getNumberValue(meta?.nextPage, meta?.pagination?.nextPage) > page ||
    rows.length >= limit;

  return Math.max(1, pagesFromCount, hasNextPage ? page + 1 : page);
};

const InventoryOverviewTable = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [startPage, setStartPage] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

  // Filters for product, start date, end date, and category
  const [productName, setProductName] = useState("");
  const [startDate, setStartDate] = useState(""); // from
  const [endDate, setEndDate] = useState(""); // to
  const [category, setCategory] = useState(""); // source category

  // ✅ Query params sent to the API
  const query = useMemo(() => {
    return {
      page,
      limit,
      from: startDate || undefined,
      to: endDate || undefined,
      name: productName || undefined,
      source: category || undefined, // Ensure the category is passed correctly
    };
  }, [page, limit, startDate, endDate, productName, category]);

  const { data, isLoading, isError, error } = useGetInventoryListQuery(query);

  // Flatten the data if it contains nested arrays
  const rows = (data?.data ?? []).flat();

  const totalPages = getInventoryTotalPages({
    meta: data?.meta,
    rows,
    page,
    limit,
  });
  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  useEffect(() => {
    if (isError) console.error("Inventory list error:", error);
  }, [isError, error]);

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

  // Fetching all products for dropdown filter
  const {
    data: allProductsRes,
    isLoading: isLoadingAllProducts,
    isError: isErrorAllProducts,
    error: errorAllProducts,
  } = useGetAllProductWithoutQueryQuery();

  useEffect(() => {
    if (isErrorAllProducts)
      console.error("Error fetching products", errorAllProducts);
  }, [isErrorAllProducts, errorAllProducts]);

  const productDropdownOptions = useMemo(() => {
    return (allProductsRes?.data || []).map((p) => ({
      value: String(p.Id ?? p.id ?? p._id),
      label: p.name,
    }));
  }, [allProductsRes?.data]);

  const categoryDropdownOptions = useMemo(
    () => [
      { value: "Purchase Product", label: "Purchase Product" },
      { value: "Purchase Return Product", label: "Purchase Return Product" },
      { value: "In Transit Product", label: "In Transit Product" },
      { value: "Sales Return Product", label: "Sales Return Product" },
      { value: "Damage Product", label: "Damage Product" },
      { value: "Damage Repair", label: "Damage Repair" },
      { value: "Damage Repaired", label: "Damage Repaired" },
    ],
    [],
  );

  // Filters reset logic
  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setProductName("");
    setCategory("");
    setPage(1);
    setStartPage(1);
  };

  // Whenever filters change, reset the page to 1
  useEffect(() => {
    setPage(1);
    setStartPage(1);
  }, [startDate, endDate, productName, category, limit]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
      return;
    }

    if (page < startPage || page > endPage) {
      setStartPage(Math.floor((page - 1) / pagesPerSet) * pagesPerSet + 1);
    }
  }, [page, totalPages, startPage, endPage, pagesPerSet]);

  const handlePageChange = (pageNumber) => {
    setPage(pageNumber);
    if (pageNumber < startPage) setStartPage(pageNumber);
    else if (pageNumber > endPage) setStartPage(pageNumber - pagesPerSet + 1);
  };

  const handlePreviousSet = () =>
    setStartPage((prev) => Math.max(prev - pagesPerSet, 1));

  const handleNextSet = () =>
    setStartPage((prev) =>
      Math.min(prev + pagesPerSet, Math.max(1, totalPages - pagesPerSet + 1)),
    );

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 14,
      borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0",
      boxShadow: state.isFocused ? "0 0 0 4px rgba(99,102,241,0.15)" : "none",
      "&:hover": { borderColor: "#cbd5e1" },
    }),
    valueContainer: (base) => ({ ...base, padding: "0 12px" }),
    placeholder: (base) => ({ ...base, color: "#64748b" }),
    menu: (base) => ({ ...base, borderRadius: 14, overflow: "hidden" }),
  };

  // Table rendering and pagination
  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Overview History
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Use the filters to analyze specific time periods, products, or
            categories for better inventory management.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="inline-flex items-center gap-3 bg-indigo-50 border border-indigo-100 px-5 py-2.5 rounded-2xl shadow-sm shadow-indigo-50">
            <div className="h-8 w-8 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
              <ShoppingBasket size={18} />
            </div>
            <div>
              <div className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                Total Units
              </div>
              <div className="text-base font-black text-indigo-900 tabular-nums leading-none">
                {isLoading
                  ? "..."
                  : (data?.meta?.totalQuantity ?? 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-8xl mx-auto px-4 lg:px-8 py-6">
        {/* Filters row */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-6 gap-4 items-end w-full">
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

          {/* Product Filter */}
          <div className="flex flex-col">
            <label className="text-sm text-slate-600 mb-1">Product</label>
            <Select
              options={productDropdownOptions}
              value={
                productDropdownOptions.find((o) => o.label === productName) ||
                null
              }
              onChange={(selected) => setProductName(selected?.label || "")}
              placeholder={
                isLoadingAllProducts ? "Loading..." : "Select Product"
              }
              isClearable
              className="text-black"
              isDisabled={isLoadingAllProducts}
              styles={selectStyles}
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-col">
            <label className="text-sm text-slate-600 mb-1">Category</label>
            <Select
              options={categoryDropdownOptions}
              value={
                categoryDropdownOptions.find(
                  (option) => option.value === category,
                ) || null
              }
              onChange={(selected) => setCategory(selected?.value || "")}
              placeholder="Select Category"
              isClearable
              className="text-black"
              styles={selectStyles}
            />
          </div>

          {/* Clear Filters Button */}
          <button
            type="button"
            className="h-11 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 transition rounded-xl px-4 text-sm font-semibold"
            onClick={clearFilters}
          >
            Clear Filters
          </button>

          {/* Items per page */}
          <div className="flex flex-col">
            <label className="text-sm text-slate-600 mb-1">Per Page</label>
            <Select
              options={[10, 20, 50, 100].map((x) => ({
                value: x,
                label: String(x),
              }))}
              value={{ value: limit, label: String(limit) }}
              onChange={(selected) => setLimit(selected?.value || 10)}
              className="text-black"
              styles={selectStyles}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto mt-6 rounded-2xl border border-slate-200">
          <table className="w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Date
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Category
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Quantity
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(4)].map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 rounded-lg bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading &&
                rows.map((rp) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                      {rp.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                      {rp.source || "-"}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {Number(rp.quantity || 0)}
                    </td>
                  </motion.tr>
                ))}

              {!isLoading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    No data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center flex-wrap gap-2 mt-5">
          <button
            type="button"
            onClick={handlePreviousSet}
            disabled={startPage === 1 || isLoading}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed hover:bg-slate-50 transition"
          >
            Prev
          </button>

          {[...Array(endPage - startPage + 1)].map((_, index) => {
            const pageNumber = startPage + index;

            return (
              <button
                key={pageNumber}
                type="button"
                onClick={() => handlePageChange(pageNumber)}
                disabled={isLoading}
                className={`px-4 py-2 rounded-xl border transition ${
                  pageNumber === page
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {pageNumber}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleNextSet}
            disabled={endPage === totalPages || isLoading}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed hover:bg-slate-50 transition"
          >
            Next
          </button>
        </div>
      </div>
    </main>
  );
};

export default InventoryOverviewTable;
