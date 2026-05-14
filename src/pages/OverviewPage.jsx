import { motion } from "framer-motion";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import { useMemo, useState } from "react";
import {
  Receipt,
  CalendarDays,
  RefreshCcw,
  TrendingUp,
  Package,
  Wallet,
  Boxes,
  ClipboardList,
  TriangleAlert,
} from "lucide-react";
import { useGetOverviewSummaryQuery } from "../features/overview/overview";
import { useLayout } from "../context/LayoutContext";
import { translations } from "../utils/translations";
import { useGetInventoryOverviewLowStockQuery } from "../features/inventoryOverview/inventoryOverview";
import { useGetAllInTransitProductQuery } from "../features/inTransitProduct/inTransitProduct";

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) =>
  `৳${safeNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateOnly = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

const getTodayRange = () => {
  const today = formatDateOnly(new Date());
  return { from: today, to: today };
};

const getYesterdayRange = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = formatDateOnly(yesterday);
  return { from: date, to: date };
};

const getThisWeekRange = () => {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);

  return {
    from: formatDateOnly(start),
    to: formatDateOnly(now),
  };
};

const getThisMonthRange = () => {
  const now = new Date();
  return {
    from: formatDateOnly(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: formatDateOnly(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

const getLastDaysRange = (days) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - Math.max(Number(days) || 1, 1) + 1);

  return {
    from: formatDateOnly(start),
    to: formatDateOnly(end),
  };
};

const OverviewPage = () => {
  const { language } = useLayout();
  const t = translations[language] || translations.EN;
  const defaultRange = useMemo(() => getLastDaysRange(30), []);
  const [selectedFilter, setSelectedFilter] = useState("last30");
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [appliedFilter, setAppliedFilter] = useState({
    type: "last30",
    from: defaultRange.from,
    to: defaultRange.to,
  });

  const summaryQuery = useMemo(() => {
    if (appliedFilter.type === "today") {
      return { filter: "today" };
    }

    if (appliedFilter.type === "thisMonth") {
      return { filter: "thisMonth" };
    }

    if (
      ["yesterday", "thisWeek", "last30"].includes(appliedFilter.type) &&
      appliedFilter.from &&
      appliedFilter.to
    ) {
      return {
        filter: "custom",
        from: appliedFilter.from,
        to: appliedFilter.to,
        applyFilter: true,
      };
    }

    if (
      appliedFilter.type === "custom" &&
      appliedFilter.from &&
      appliedFilter.to
    ) {
      return {
        filter: "custom",
        from: appliedFilter.from,
        to: appliedFilter.to,
        applyFilter: true,
      };
    }

    return {};
  }, [appliedFilter]);

  const {
    data: summaryRes,
    isLoading,
    isError,
    error,
  } = useGetOverviewSummaryQuery(summaryQuery);

  const summary = summaryRes?.data || {};

  const onFilterChange = (value) => {
    setSelectedFilter(value);

    if (value === "today") {
      const todayRange = getTodayRange();
      setFrom(todayRange.from);
      setTo(todayRange.to);
      setAppliedFilter({ type: "today", ...todayRange });
      return;
    }

    if (value === "yesterday") {
      const yesterdayRange = getYesterdayRange();
      setFrom(yesterdayRange.from);
      setTo(yesterdayRange.to);
      setAppliedFilter({ type: "yesterday", ...yesterdayRange });
      return;
    }

    if (value === "thisWeek") {
      const weekRange = getThisWeekRange();
      setFrom(weekRange.from);
      setTo(weekRange.to);
      setAppliedFilter({ type: "thisWeek", ...weekRange });
      return;
    }

    if (value === "thisMonth") {
      const monthRange = getThisMonthRange();
      setFrom(monthRange.from);
      setTo(monthRange.to);
      setAppliedFilter({ type: "thisMonth", ...monthRange });
      return;
    }

    if (value === "last30") {
      const last30Range = getLastDaysRange(30);
      setFrom(last30Range.from);
      setTo(last30Range.to);
      setAppliedFilter({ type: "last30", ...last30Range });
      return;
    }

    if (value !== "custom") {
      setAppliedFilter({ type: null, from: null, to: null });
    }
  };

  const onApply = () => {
    if (selectedFilter !== "custom" || !from || !to) return;
    setAppliedFilter({ type: "custom", from, to });
  };

  const onReset = () => {
    const last30Range = getLastDaysRange(30);
    setSelectedFilter("last30");
    setFrom(last30Range.from);
    setTo(last30Range.to);
    setAppliedFilter({ type: "last30", ...last30Range });
  };

  if (isError) console.error("Overview Summary error:", error);

  const isCustomFilter = selectedFilter === "custom";
  const liveSummaryText =
    summary?.from && summary?.to
      ? `${t.live_summary}: ${summary.from} → ${summary.to}`
      : `${t.live_summary}: ALL DATA`;

  // ✅ values (fallback 0)
  const totalAssetsBalance = Number(summary?.totalAssetsBalance || 0);
  const inventoryOverview = Number(summary?.totalInventoryOverview || 0);
  const totalMetaAmount = Number(summary?.totalMetaAmount || 0);
  const totalCashInAmount = Number(summary?.totalCashInAmount || 0);
  const totalCashOutAmount = Number(summary?.totalCashOutAmount || 0);
  const netCashPosition = Number(summary?.netCashPosition || 0);
  const totalDamageStockPrice = Number(summary?.totalDamageStockPrice || 0);
  const totalRepairingStockPrice = Number(
    summary?.totalRepairingStockPrice || 0,
  );
  const lowStockCount = Number(summary?.lowStockCount || 0);
  const pendingPurchaseRequisitionCount = Number(
    summary?.pendingPurchaseRequisitionCount || 0,
  );
  const pendingPettyCashRequisitionCount = Number(
    summary?.pendingPettyCashRequisitionCount || 0,
  );
  const pendingAssetsRequisitionCount = Number(
    summary?.pendingAssetsRequisitionCount || 0,
  );
  const totalPendingApprovalCount = Number(
    summary?.totalPendingApprovalCount || 0,
  );
  const inTransitSalesAmount = safeNumber(summary?.inTransitSalesAmount);
  const salesReturnSalesAmount = safeNumber(summary?.salesReturnSalesAmount);
  const inTransitPurchaseAmount = safeNumber(summary?.inTransitPurchaseAmount);
  const salesReturnPurchaseAmount = safeNumber(summary?.salesReturnPurchaseAmount);
  const totalCodCharge = safeNumber(summary?.totalCodCharge);
  const totalCodChange = safeNumber(summary?.totalCodChange);
  const totalDeliveryCharge = safeNumber(summary?.totalDeliveryCharge);
  const totalDeliveryAdvance = safeNumber(summary?.totalDeliveryAdvance);
  const netRevenue =
    inTransitSalesAmount -
    salesReturnSalesAmount -
    totalCodCharge -
    totalCodChange -
    totalDeliveryCharge +
    totalDeliveryAdvance;
  const netPurchase = inTransitPurchaseAmount - salesReturnPurchaseAmount;

  const profitLossSummary = {
    netRevenue,
    netPurchase,
    grossProfit: netRevenue - netPurchase,
    othersExpense: safeNumber(summary?.othersExpense),
    netProfitLoss:
      netRevenue -
      netPurchase -
      safeNumber(summary?.othersExpense),
  };

  // =========================
  // ✅ Trending Products
  // =========================
  const [trendFilter, setTrendFilter] = useState("today");
  const inTransitTrendRange = useMemo(
    () =>
      trendFilter === "yesterday"
        ? getYesterdayRange()
        : getLastDaysRange(Number(trendFilter) || 1),
    [trendFilter],
  );
  const trendLabel =
    trendFilter === "today"
      ? t.today
      : trendFilter === "yesterday"
        ? t.yesterday
        : `${trendFilter} ${t.days}`;

  const {
    data: trendingRes,
    isLoading: trendingLoading,
    isError: trendingIsError,
    error: trendingErr,
    refetch: refetchTrending,
  } = useGetAllInTransitProductQuery({
    page: 1,
    limit: 100,
    startDate: inTransitTrendRange.from,
    endDate: inTransitTrendRange.to,
    sortBy: "quantity",
    sortOrder: "desc",
  });

  const inTransitTrendRows = trendingRes?.data ?? [];

  if (trendingIsError) console.error("Intransit trending error:", trendingErr);

  const trending = useMemo(() => {
    const productMap = new Map();

    inTransitTrendRows.forEach((item) => {
      const productId = item?.productId ?? item?.receivedId ?? item?.Id;
      const productName = item?.name || item?.product?.name || "Intransit Item";
      const quantity = Number(item?.quantity || 0);
      const salePrice = Number(item?.sale_price || item?.salePrice || 0);
      const purchasePrice = Number(
        item?.purchase_price || item?.purchasePrice || 0,
      );
      const revenue = quantity * (salePrice || purchasePrice);
      const key = productId != null ? `id-${productId}` : productName;
      const existing = productMap.get(key) || {
        productId,
        name: productName,
        soldQty: 0,
        revenue: 0,
      };

      productMap.set(key, {
        ...existing,
        soldQty: existing.soldQty + quantity,
        revenue: existing.revenue + revenue,
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => Number(b.soldQty || 0) - Number(a.soldQty || 0))
      .slice(0, 10);
  }, [inTransitTrendRows]);

  const trendSummary = useMemo(() => {
    if (!trending.length) {
      return {
        topProductName: "No product data",
        topSoldQty: 0,
        totalSoldQty: 0,
        totalRevenue: 0,
        avgRevenue: 0,
        productCount: 0,
      };
    }

    const totalSoldQty = trending.reduce(
      (sum, item) => sum + Number(item?.soldQty || 0),
      0,
    );

    const totalRevenue = trending.reduce(
      (sum, item) => sum + Number(item?.revenue || 0),
      0,
    );

    const topProduct = trending[0] || {};
    const productCount = trending.length;
    const avgRevenue = productCount > 0 ? totalRevenue / productCount : 0;

    return {
      topProductName:
        topProduct?.product?.name || topProduct?.name || "Unknown Product",
      topSoldQty: Number(topProduct?.soldQty || 0),
      totalSoldQty,
      totalRevenue,
      avgRevenue,
      productCount,
    };
  }, [trending]);

  // useGetInventoryOverviewLowStockQuery

  const {
    data: lowStockRes,
    isLoading: isLowStockLoading,
    isError: isLowStockError,
    error: lowStockError,
  } = useGetInventoryOverviewLowStockQuery();

  const lowStockProducts = lowStockRes?.data ?? [];

  if (isLowStockError) console.error("Low stock error:", lowStockError);

  return (
    <div className="flex-1 overflow-auto bg-slate-50/50">
      <Header title={t.management_console} />

      {/* ✅ Page background */}
      <main className="min-h-[calc(100vh-64px)] py-8 px-4 lg:px-8">
        <div className="max-w-8xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {t.executive_dashboard}
              </h1>
              <p className="text-slate-500 text-base mt-2 font-medium max-w-2xl">
                {t.real_time_view}
              </p>
            </div>

            {/* ✅ Date Range Filter Container */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-5 flex flex-col gap-3 lg:gap-4 ring-1 ring-slate-100 min-w-[320px]">
              <div className="flex flex-col sm:w-48">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">
                  Filter
                </label>
                <select
                  value={selectedFilter}
                  onChange={(e) => onFilterChange(e.target.value)}
                  className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                >
                  <option value="last30">Last 30 Days</option>
                  <option value="">All Data</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="thisWeek">This Week</option>
                  <option value="thisMonth">This Month</option>
                  <option value="custom">Custom Date</option>
                </select>
              </div>

              {isCustomFilter ? (
                <div className="flex flex-col sm:flex-row items-end gap-3 lg:gap-4">
                  <div className="flex flex-col flex-1 w-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 flex items-center gap-1.5">
                      <CalendarDays size={12} className="text-indigo-500" />{" "}
                      {t.start_date}
                    </label>
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                    />
                  </div>

                  <div className="flex flex-col flex-1 w-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 flex items-center gap-1.5">
                      <CalendarDays size={12} className="text-indigo-500" />{" "}
                      {t.end_date}
                    </label>
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                    />
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={onApply}
                      disabled={!from || !to}
                      className="h-11 px-6 rounded-xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 active:scale-[0.98] transition shadow-lg shadow-indigo-100 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                      {t.apply}
                    </button>

                    <button
                      onClick={onReset}
                      className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-600 active:scale-[0.98] transition flex items-center justify-center hover:bg-slate-50"
                      title="Reset to all data"
                    >
                      <RefreshCcw size={18} />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* ✅ Status Indicator */}
          <div className="mb-8 px-2">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white border border-slate-100 shadow-sm">
              <div
                className={`h-2 w-2 rounded-full ${isLoading ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`}
              ></div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.1em]">
                {isLoading ? t.syncing : liveSummaryText}
              </span>
            </div>
          </div>

          {/* ✅ Stat Cards */}
          <motion.div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 mb-12"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <StatCard
              name="Assets Balance"
              icon={Boxes}
              value={
                isLoading
                  ? "..."
                  : `৳${totalAssetsBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              }
              iconBg="#EEF2FF"
              iconColor="#4F46E5"
            />

            <StatCard
              name={t.marketing_investment}
              icon={Receipt}
              value={
                isLoading
                  ? "..."
                  : `৳${totalMetaAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              }
              iconBg="#F5F3FF"
              iconColor="#7C3AED"
            />

            <StatCard
              name="Low Stock Alerts"
              icon={TriangleAlert}
              value={isLoading ? "..." : lowStockCount.toLocaleString()}
              iconBg="#FFF1F2"
              iconColor="#E11D48"
            />
          </motion.div>

          <motion.div
            className="mb-10 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.02 }}
          >
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-600">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Profit & Loss
                  </h3>
                  <p className="text-xs font-medium text-slate-400">
                    Intransit sales minus returns, COD and delivery charges, plus advance payment
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                {isLoading ? "Loading..." : "Live Summary"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                [
                  "Net Revenue",
                  profitLossSummary.netRevenue,
                  "text-indigo-700",
                ],
                [
                  "Net Purchase",
                  profitLossSummary.netPurchase,
                  "text-amber-700",
                ],
                [
                  "Gross Profit",
                  profitLossSummary.grossProfit,
                  profitLossSummary.grossProfit >= 0
                    ? "text-emerald-600"
                    : "text-rose-600",
                ],
                [
                  "Others Expense",
                  profitLossSummary.othersExpense,
                  "text-slate-700",
                ],
                [
                  "Net Profit/Loss",
                  profitLossSummary.netProfitLoss,
                  profitLossSummary.netProfitLoss >= 0
                    ? "text-emerald-600"
                    : "text-rose-600",
                ],
              ].map(([label, value, tone]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                >
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {label}
                  </div>
                  <div className={`mt-2 text-xl font-black ${tone}`}>
                    {isLoading ? "..." : formatCurrency(value)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
            <motion.div
              className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.03 }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Approval Queue
                  </h3>
                  <p className="text-xs font-medium text-slate-400">
                    Items waiting for admin action
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  ["Purchase Requisition", pendingPurchaseRequisitionCount],
                  ["Petty Cash Requisition", pendingPettyCashRequisitionCount],
                  [
                    "Assets Purchase Requisition",
                    pendingAssetsRequisitionCount,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-slate-600">
                      {label}
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      {isLoading ? "..." : value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.06 }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                  <Wallet size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Cash Snapshot
                  </h3>
                  <p className="text-xs font-medium text-slate-400">
                    Real-time working cash position
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl bg-emerald-50/60 border border-emerald-100 p-4">
                  <div className="text-[11px] font-black uppercase tracking-widest text-emerald-600">
                    Net Position
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900">
                    {isLoading
                      ? "..."
                      : `৳${netCashPosition.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Cash In
                    </div>
                    <div className="mt-2 text-lg font-black text-emerald-600">
                      {isLoading
                        ? "..."
                        : `৳${totalCashInAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Cash Out
                    </div>
                    <div className="mt-2 text-lg font-black text-rose-600">
                      {isLoading
                        ? "..."
                        : `৳${totalCashOutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.09 }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Inventory Snapshot
                  </h3>
                  <p className="text-xs font-medium text-slate-400">
                    Receivables, liabilities and stock value
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  [
                    "Product Stock",
                    `৳${inventoryOverview.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                  ],
                  [
                    "Damage Stock",
                    `৳${totalDamageStockPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                  ],
                  [
                    "Repairing Stock",
                    `৳${totalRepairingStockPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-slate-600">
                      {label}
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {isLoading ? "..." : value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
            {/* ✅ Trending Products (Modern) */}
            <motion.div
              className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.06 }}
            >
              {/* Header */}
              <div className="p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100/50">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-900 tracking-tight">
                      {t.top_selling_products}
                    </div>
                    <div className="text-xs font-bold text-slate-400 mt-0.5">
                      Based on Intransit Product for {trendLabel}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={trendFilter}
                    onChange={(e) => setTrendFilter(e.target.value)}
                    className="h-11 pl-4 pr-10 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10 transition appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center",
                      backgroundSize: "16px",
                    }}
                  >
                    <option value="today">{t.today}</option>
                    <option value="yesterday">{t.yesterday}</option>
                    <option value="2">2 {t.days}</option>
                    <option value="7">7 {t.days}</option>
                    <option value="15">15 {t.days}</option>
                    <option value="30">30 {t.days}</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => refetchTrending?.()}
                    className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-indigo-600 active:scale-[0.98] transition flex items-center justify-center"
                  >
                    <RefreshCcw size={18} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                {trendingLoading ? (
                  <div className="py-20 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-[3px] border-indigo-600/20 border-t-indigo-600"></div>
                  </div>
                ) : trendingIsError ? (
                  <div className="py-20 text-center text-red-500 font-bold italic">
                    {t.system_error_trends}
                  </div>
                ) : trending.length === 0 ? (
                  <div className="py-20 text-center text-slate-300 font-black italic text-sm">
                    <Package size={40} className="mx-auto mb-3 opacity-10" />
                    {t.no_significant_performance}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trending.map((row, idx) => {
                      const soldQty = Number(row?.soldQty || 0);
                      const revenue = Number(row?.revenue || 0);
                      const pName =
                        row?.product?.name || row?.name || t.inventory_item;

                      return (
                        <motion.div
                          key={row?.productId ?? idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all group"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="relative flex-shrink-0">
                              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                <Package size={20} />
                              </div>
                              <div className="absolute -top-2 -left-2 h-6 w-6 rounded-lg bg-slate-900 group-hover:bg-indigo-600 border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                                {idx + 1}
                              </div>
                            </div>

                            {/* <div className="min-w-0">
                              <div className="text-sm font-black text-slate-900 truncate tracking-tight">{pName}</div>
                              <div className="text-[10px] font-black text-slate-400 mt-0.5 uppercase tracking-widest">ID: {row?.productId?.slice(-6).toUpperCase() ?? "NEW"}</div>
                            </div> */}

                            <div className="min-w-0">
                              <div className="text-sm font-black text-slate-900 truncate tracking-tight">
                                {pName}
                              </div>
                              <div className="text-[10px] font-black text-slate-400 mt-0.5 uppercase tracking-widest">
                                ID:{" "}
                                {row?.productId != null
                                  ? String(row.productId)
                                      .slice(-6)
                                      .toUpperCase()
                                  : "NEW"}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-8">
                            <div className="text-right hidden sm:block">
                              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                Intransit Qty
                              </div>
                              <div className="text-sm font-black text-slate-700">
                                {soldQty} {t.units}
                              </div>
                            </div>
                            <div className="text-right min-w-[100px]">
                              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                {t.revenue_impact}
                              </div>
                              <div className="text-sm font-black text-indigo-600">
                                ৳
                                {revenue.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              className="lg:col-span-1 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-sm border border-rose-100/50">
                    <Package size={20} />
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-900 tracking-tight">
                      Low Stock Products
                    </div>
                    <div className="text-xs font-bold text-slate-400 mt-0.5">
                      Items that need restocking soon
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {isLowStockLoading ? (
                  <div className="py-20 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-[3px] border-rose-600/20 border-t-rose-600"></div>
                  </div>
                ) : isLowStockError ? (
                  <div className="py-20 text-center text-red-500 font-bold italic">
                    Failed to load low stock products.
                  </div>
                ) : lowStockProducts.length === 0 ? (
                  <div className="py-20 text-center text-slate-300 font-black italic text-sm">
                    <Package size={40} className="mx-auto mb-3 opacity-10" />
                    No low stock products found.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                    {lowStockProducts.map((item, idx) => {
                      const productName =
                        item?.name || item?.product?.name || t.inventory_item;
                      const productId =
                        item?.productId ?? item?.id ?? item?.Id ?? idx;
                      const currentStock = Number(
                        item?.currentStock ??
                          item?.stock ??
                          item?.quantity ??
                          0,
                      );
                      const minStock = Number(
                        item?.minimumStock ??
                          item?.minStock ??
                          item?.threshold ??
                          0,
                      );

                      return (
                        <motion.div
                          key={productId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-50/50 transition-all group"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="relative flex-shrink-0">
                              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 group-hover:bg-rose-100 transition-colors">
                                <Package size={20} />
                              </div>
                              <div className="absolute -top-2 -left-2 h-6 min-w-6 px-1 rounded-lg bg-rose-500 border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                                {idx + 1}
                              </div>
                            </div>

                            <div className="min-w-0">
                              <div className="text-sm font-black text-slate-900 truncate tracking-tight">
                                {productName}
                              </div>
                              <div className="text-[10px] font-black text-slate-400 mt-0.5 uppercase tracking-widest">
                                ID: {String(productId).slice(-6).toUpperCase()}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                Current
                              </div>
                              <div className="text-sm font-black text-rose-600">
                                {currentStock}
                              </div>
                            </div>

                            <div className="text-right hidden sm:block">
                              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                Minimum
                              </div>
                              <div className="text-sm font-black text-slate-700">
                                {minStock}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>

            {/* <div className="space-y-6">
              <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group">
                <div className="relative z-10">
                  <h3 className="text-lg font-black tracking-tight mb-2">Performance Summary</h3>
                  <p className="text-indigo-100 text-sm font-medium leading-relaxed opacity-80">Your product velocity is increasing across 4 core categories compared to the last audit period.</p>
                  <button className="mt-8 bg-white/10 hover:bg-white/20 backdrop-blur-md px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition active:scale-95 border border-white/20">Download Report</button>
                </div>
                <div className="absolute -bottom-10 -right-10 h-40 w-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                <h3 className="text-slate-900 font-black tracking-tight mb-4">Live Indicators</h3>
                <div className="space-y-4">
                  {[
                    { label: "Purchase Flow", val: 84, color: "bg-indigo-500" },
                    { label: "Inventory Health", val: 62, color: "bg-emerald-500" },
                    { label: "Profit Margin", val: 78, color: "bg-blue-500" }
                  ].map((stat, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>{stat.label}</span>
                        <span className="text-slate-900">{stat.val}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${stat.val}%` }}
                          className={`h-full ${stat.color} rounded-full`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div> */}

            {/* <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="text-lg font-black tracking-tight mb-2">
                  {t.performance_summary}
                </h3>

                {trendingLoading ? (
                  <p className="text-indigo-100 text-sm font-medium leading-relaxed opacity-80">
                    {t.loading_product_performance}
                  </p>
                ) : trendingIsError ? (
                  <p className="text-red-100 text-sm font-medium leading-relaxed">
                    {t.failed_load_summary}
                  </p>
                ) : trending.length === 0 ? (
                  <p className="text-indigo-100 text-sm font-medium leading-relaxed opacity-80">
                    {t.no_selling_data}
                  </p>
                ) : (
                  <div className="space-y-3 mt-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-indigo-200 font-black">
                        {t.top_selling_product}
                      </p>
                      <p className="text-xl font-black text-white">
                        {trendSummary.topProductName}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-indigo-200 font-black">
                          {t.top_sold_qty}
                        </p>
                        <p className="text-xl font-black text-white">
                          {trendSummary.topSoldQty}
                        </p>
                      </div>

                      <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-indigo-200 font-black">
                          {t.total_sold}
                        </p>
                        <p className="text-xl font-black text-white">
                          {trendSummary.totalSoldQty}
                        </p>
                      </div>

                      <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-indigo-200 font-black">
                          {t.total_revenue}
                        </p>
                        <p className="text-lg font-black text-white">
                          ৳
                          {trendSummary.totalRevenue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>

                      <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-indigo-200 font-black">
                          {t.avg_revenue}
                        </p>
                        <p className="text-lg font-black text-white">
                          ৳
                          {trendSummary.avgRevenue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>

                    <p className="text-indigo-100 text-xs font-medium leading-relaxed opacity-80 pt-2">
                      {t.based_on_performance_last} {trendDays} {trendDays > 1 ? t.days : t.day}
                    </p>
                  </div>
                )}
              </div>

              <div className="absolute -bottom-10 -right-10 h-40 w-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
            </div> */}
          </div>
        </div>
      </main>
    </div>
  );
};

export default OverviewPage;
