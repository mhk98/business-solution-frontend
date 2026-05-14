import { motion } from "framer-motion";
import { RefreshCcw, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useGetAllInTransitProductQuery } from "../../features/inTransitProduct/inTransitProduct";
import { useGetAllReturnProductQuery } from "../../features/returnProduct/returnProduct";
import {
  useGetAllProfitLossQuery,
  useInsertProfitLossMutation,
  useDeleteProfitLossMutation,
} from "../../features/profitLoss/profitLoss";

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatCurrency = (value) =>
  `৳${safeNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

const getProductKey = (row) =>
  String(row?.productId ?? row?.receivedId ?? row?.name ?? row?.Id ?? "");

const addRowToGroup = (map, row, type) => {
  const key = getProductKey(row);
  if (!key) return;

  const current = map.get(key) || {
    key,
    name: row?.name || "Unnamed Product",
    inTransitQty: 0,
    inTransitPurchase: 0,
    inTransitRevenue: 0,
    returnQty: 0,
    returnPurchase: 0,
    returnRevenue: 0,
  };

  if (type === "inTransit") {
    current.inTransitQty += safeNumber(row?.quantity);
    current.inTransitPurchase += safeNumber(row?.purchase_price);
    current.inTransitRevenue += safeNumber(row?.sale_price);
  } else {
    current.returnQty += safeNumber(row?.quantity);
    current.returnPurchase += safeNumber(row?.purchase_price);
    current.returnRevenue += safeNumber(row?.sale_price);
  }

  map.set(key, current);
};

const AutoProfitLossTable = () => {
  const [reportDate, setReportDate] = useState(() => toDateInputValue(new Date()));
  const [marketingSpends, setMarketingSpends] = useState(0);
  const [otherExpenses, setOtherExpenses] = useState(0);
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const reportQueryArgs = useMemo(
    () => ({
      page: 1,
      limit: 10000,
      startDate: reportDate,
      endDate: reportDate,
    }),
    [reportDate],
  );

  const {
    data: inTransitRes,
    isLoading: inTransitLoading,
    isFetching: inTransitFetching,
    refetch: refetchInTransit,
  } = useGetAllInTransitProductQuery(reportQueryArgs);

  const {
    data: returnRes,
    isLoading: returnLoading,
    isFetching: returnFetching,
    refetch: refetchReturn,
  } = useGetAllReturnProductQuery(reportQueryArgs);

  const historyQueryArgs = useMemo(
    () => ({
      page: currentPage,
      limit: itemsPerPage,
      startDate: historyStartDate || undefined,
      endDate: historyEndDate || undefined,
      mode: "auto",
    }),
    [currentPage, historyEndDate, historyStartDate],
  );

  const {
    data: profitLossRes,
    isLoading: historyLoading,
    isFetching: historyFetching,
  } = useGetAllProfitLossQuery(historyQueryArgs);

  const [insertProfitLoss, { isLoading: isSaving }] =
    useInsertProfitLossMutation();
  const [deleteProfitLoss, { isLoading: isDeleting }] =
    useDeleteProfitLossMutation();

  const sourceRows = useMemo(() => {
    const grouped = new Map();
    (inTransitRes?.data || []).forEach((row) =>
      addRowToGroup(grouped, row, "inTransit"),
    );
    (returnRes?.data || []).forEach((row) => addRowToGroup(grouped, row, "return"));

    return Array.from(grouped.values())
      .map((item) => {
        const netQty = Math.max(item.inTransitQty - item.returnQty, 0);
        const netPurchase = Math.max(
          item.inTransitPurchase - item.returnPurchase,
          0,
        );
        const netRevenue = Math.max(item.inTransitRevenue - item.returnRevenue, 0);

        return {
          ...item,
          netQty,
          netPurchase,
          netRevenue,
          profitLoss: netRevenue - netPurchase,
        };
      })
      .filter((item) => item.inTransitQty > 0 || item.returnQty > 0);
  }, [inTransitRes, returnRes]);

  const summary = useMemo(() => {
    const totals = sourceRows.reduce(
      (acc, item) => {
        acc.products += item.netQty > 0 ? 1 : 0;
        acc.inTransitQty += item.inTransitQty;
        acc.returnQty += item.returnQty;
        acc.netQty += item.netQty;
        acc.purchase += item.netPurchase;
        acc.revenue += item.netRevenue;
        acc.returnAmount += item.returnRevenue;
        acc.grossProfit += item.profitLoss;
        return acc;
      },
      {
        products: 0,
        inTransitQty: 0,
        returnQty: 0,
        netQty: 0,
        purchase: 0,
        revenue: 0,
        returnAmount: 0,
        grossProfit: 0,
      },
    );

    const extraCost = safeNumber(marketingSpends) + safeNumber(otherExpenses);
    return {
      ...totals,
      marketingCost: safeNumber(marketingSpends),
      otherCost: safeNumber(otherExpenses),
      extraCost,
      finalProfit: totals.grossProfit - extraCost,
    };
  }, [marketingSpends, otherExpenses, sourceRows]);

  const historyRows = profitLossRes?.data || [];
  const totalHistoryCount = safeNumber(
    profitLossRes?.meta?.count ?? profitLossRes?.meta?.total,
  );
  const totalPages = Math.max(1, Math.ceil(totalHistoryCount / itemsPerPage));
  const isLoading = inTransitLoading || returnLoading;
  const isFetching = inTransitFetching || returnFetching;

  const handleRefresh = () => {
    refetchInTransit();
    refetchReturn();
  };

  const handleSave = async () => {
    if (!reportDate) {
      toast.error("Please select report date");
      return;
    }

    if (!summary.netQty) {
      toast.error("No remaining quantity found for this date");
      return;
    }

    const payload = {
      mode: "auto",
      salesType: "Auto Profit & Loss",
      products: Math.round(summary.products),
      purchase: Math.round(summary.purchase),
      revenue: Math.round(summary.revenue),
      return: Math.round(summary.returnAmount),
      cost: Math.round(summary.extraCost),
      profitLoss: Math.round(summary.finalProfit),
      note: `Auto calculation date: ${reportDate}`,
    };

    try {
      const res = await insertProfitLoss(payload).unwrap();
      if (res?.success) {
        toast.success("Auto Profit/Loss saved successfully");
      } else {
        toast.error(res?.message || "Save failed");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Save failed");
    }
  };

  const handleDeleteHistory = async (id) => {
    if (!window.confirm("Delete this saved profit/loss record?")) return;

    try {
      const res = await deleteProfitLoss(id).unwrap();
      if (res?.success) {
        toast.success("Profit/Loss history deleted");
      } else {
        toast.error(res?.message || "Delete failed");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Delete failed");
    }
  };

  const summaryCards = [
    ["Intransit Qty", summary.inTransitQty],
    ["Sales Return Qty", summary.returnQty],
    ["Net Qty", summary.netQty],
    ["Net Sale", formatCurrency(summary.revenue)],
    ["Profit/Loss", formatCurrency(summary.finalProfit)],
  ];

  return (
    <motion.div
      className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Auto Profit & Loss
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Intransit product থেকে Sales Return বাদ দিয়ে remaining quantity
              অনুযায়ী profit/loss calculate হচ্ছে।
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Report Date
              </span>
              <input
                type="date"
                value={reportDate}
                onChange={(event) => setReportDate(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </label>
            <button
              type="button"
              onClick={handleRefresh}
              className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCcw size={16} className={isFetching ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4"
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                {label}
              </p>
              <p
                className={`mt-3 text-2xl font-black ${
                  label === "Profit/Loss" && summary.finalProfit < 0
                    ? "text-rose-600"
                    : label === "Profit/Loss"
                      ? "text-emerald-600"
                      : "text-slate-900"
                }`}
              >
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-[1120px] w-full border-separate border-spacing-0">
          <thead>
            <tr className="text-left">
              {[
                "Product",
                "Intransit Qty",
                "Sales Return",
                "Net Qty",
                "Purchase",
                "Sale",
                "Profit/Loss",
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
                  colSpan={7}
                  className="px-3 py-16 text-center text-sm font-medium text-slate-500"
                >
                  Loading auto profit/loss data...
                </td>
              </tr>
            ) : sourceRows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-16 text-center text-sm font-medium text-slate-500"
                >
                  এই date-এ কোনো intransit বা sales return data পাওয়া যায়নি।
                </td>
              </tr>
            ) : (
              sourceRows.map((row) => (
                <tr key={row.key} className="group">
                  <td className="border-b border-slate-100 px-3 py-4 text-[15px] font-semibold text-slate-900 first:pl-2">
                    {row.name}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-4 text-sm font-medium text-slate-700">
                    {row.inTransitQty.toLocaleString()}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-4 text-sm font-medium text-slate-700">
                    {row.returnQty.toLocaleString()}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-4 text-sm font-bold text-slate-900">
                    {row.netQty.toLocaleString()}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-700">
                    {formatCurrency(row.netPurchase)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-900">
                    {formatCurrency(row.netRevenue)}
                  </td>
                  <td
                    className={`border-b border-slate-100 px-3 py-4 text-sm font-bold ${
                      row.profitLoss >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {formatCurrency(row.profitLoss)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">Marketing Spends</h3>
          <input
            type="number"
            min="0"
            step="0.01"
            value={marketingSpends}
            onChange={(event) => setMarketingSpends(event.target.value)}
            className="mt-4 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">Other Expenses</h3>
          <input
            type="number"
            min="0"
            step="0.01"
            value={otherExpenses}
            onChange={(event) => setOtherExpenses(event.target.value)}
            className="mt-4 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">Calculation</h3>
          <div className="mt-4 space-y-2 text-sm font-medium text-slate-600">
            <div className="flex justify-between">
              <span>Gross Profit</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(summary.grossProfit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Extra Cost</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(summary.extraCost)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span>Final Profit/Loss</span>
              <span
                className={`font-bold ${
                  summary.finalProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {formatCurrency(summary.finalProfit)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Calculate & Save"}
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.04)] sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900">
              Saved Profit/Loss History
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Auto Profit & Loss calculation save করলে এখানে history দেখা যাবে।
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Start Date
              </span>
              <input
                type="date"
                value={historyStartDate}
                onChange={(event) => {
                  setHistoryStartDate(event.target.value);
                  setCurrentPage(1);
                }}
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                End Date
              </span>
              <input
                type="date"
                value={historyEndDate}
                onChange={(event) => {
                  setHistoryEndDate(event.target.value);
                  setCurrentPage(1);
                }}
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[920px] w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left">
                {[
                  "Date",
                  "Sales Type",
                  "Products",
                  "Purchase",
                  "Sale",
                  "Return",
                  "Cost",
                  "Profit/Loss",
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
              {historyLoading || historyFetching ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-16 text-center text-sm font-medium text-slate-500"
                  >
                    Loading saved profit/loss data...
                  </td>
                </tr>
              ) : historyRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-16 text-center text-sm font-medium text-slate-500"
                  >
                    কোনো saved auto profit/loss data পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                historyRows.map((row) => (
                  <tr key={row?.Id}>
                    <td className="border-b border-slate-100 px-3 py-4 text-sm font-medium text-slate-700 first:pl-2">
                      {formatDate(row?.createdAt || row?.date)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-900">
                      {row?.salesType || "-"}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-4 text-sm font-medium text-slate-700">
                      {safeNumber(row?.products)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-900">
                      {formatCurrency(row?.purchase)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-700">
                      {formatCurrency(row?.revenue)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-700">
                      {formatCurrency(row?.return)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-4 text-sm font-semibold text-slate-700">
                      {formatCurrency(row?.cost)}
                    </td>
                    <td
                      className={`border-b border-slate-100 px-3 py-4 text-sm font-bold ${
                        safeNumber(row?.profitLoss) >= 0
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {formatCurrency(row?.profitLoss)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-4">
                      <button
                        type="button"
                        onClick={() => handleDeleteHistory(row?.Id)}
                        disabled={isDeleting}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-500">
            Total: {totalHistoryCount} records
          </p>
          <div className="flex items-center gap-2 self-end">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm font-semibold text-slate-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AutoProfitLossTable;
