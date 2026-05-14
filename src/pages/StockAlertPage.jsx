import { useMemo, useState } from "react";
import { Package, RefreshCcw, Save, Search, TriangleAlert } from "lucide-react";
import toast from "react-hot-toast";
import Header from "../components/common/Header";
import {
  useGetAllInventoryOverviewQuery,
  useUpdateInventoryOverviewMutation,
} from "../features/inventoryOverview/inventoryOverview";

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const StockAlertPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState({});
  const limit = 12;

  const queryArgs = useMemo(
    () => ({
      page,
      limit,
      searchTerm: searchTerm || undefined,
    }),
    [page, searchTerm],
  );

  const { data, isLoading, isFetching, refetch } =
    useGetAllInventoryOverviewQuery(queryArgs);
  const [updateInventoryOverview, { isLoading: isSaving }] =
    useUpdateInventoryOverviewMutation();

  const rows = data?.data || [];
  const totalCount = safeNumber(data?.meta?.count ?? data?.meta?.total);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const getDraftValue = (row) =>
    drafts[row.Id] ?? String(safeNumber(row?.minimumStock));

  const setDraftValue = (id, value) => {
    setDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = async (row) => {
    const minimumStock = Math.max(safeNumber(getDraftValue(row)), 0);

    try {
      const res = await updateInventoryOverview({
        id: row.Id,
        data: { minimumStock },
      }).unwrap();

      if (res?.success) {
        toast.success("Minimum stock updated");
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[row.Id];
          return next;
        });
      } else {
        toast.error(res?.message || "Update failed");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Update failed");
    }
  };

  return (
    <div className="relative z-10 flex-1">
      <Header title="Stock Alert" />

      <main className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-8xl">
          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600">
                  <TriangleAlert size={20} />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900">
                    Stock Alert
                  </h1>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    প্রতিটা product-এর জন্য আলাদা minimum stock set করুন।
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative min-w-[280px]">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search product"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <RefreshCcw
                    size={16}
                    className={isFetching ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-[900px] w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left">
                    {[
                      "Product",
                      "SKU",
                      "Current Stock",
                      "Minimum Stock",
                      "Status",
                      "Action",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="border-b border-slate-200 px-3 py-4 text-sm font-bold text-slate-700 first:pl-2"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-16 text-center text-sm font-medium text-slate-500"
                      >
                        Loading stock products...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-16 text-center text-sm font-medium text-slate-500"
                      >
                        কোনো stock product পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const quantity = safeNumber(row?.quantity);
                      const minimumStock = safeNumber(getDraftValue(row));
                      const isLowStock = quantity <= minimumStock;

                      return (
                        <tr key={row.Id} className="group">
                          <td className="border-b border-slate-100 px-3 py-4 first:pl-2">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                                <Package size={17} />
                              </div>
                              <div className="min-w-0">
                                <div className="max-w-[320px] truncate text-sm font-bold text-slate-900">
                                  {row?.name || "Unnamed Product"}
                                </div>
                                <div className="text-xs font-medium text-slate-400">
                                  ID: {row?.Id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="border-b border-slate-100 px-3 py-4 text-sm font-medium text-slate-600">
                            {row?.sku || "-"}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-4 text-sm font-black text-slate-900">
                            {quantity.toLocaleString()}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-4">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={getDraftValue(row)}
                              onChange={(event) =>
                                setDraftValue(row.Id, event.target.value)
                              }
                              className="h-10 w-32 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                            />
                          </td>
                          <td className="border-b border-slate-100 px-3 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.1em] ${
                                isLowStock
                                  ? "bg-rose-50 text-rose-600"
                                  : "bg-emerald-50 text-emerald-600"
                              }`}
                            >
                              {isLowStock ? "Low Stock" : "Healthy"}
                            </span>
                          </td>
                          <td className="border-b border-slate-100 px-3 py-4">
                            <button
                              type="button"
                              onClick={() => handleSave(row)}
                              disabled={isSaving}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Save size={15} />
                              Save
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-slate-500">
                Total: {totalCount} products
              </p>
              <div className="flex items-center gap-2 self-end">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-sm font-semibold text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StockAlertPage;
