import { motion } from "framer-motion";
import {
  AlertTriangle,
  ClipboardList,
  Coins,
  Package,
  ReceiptText,
  RefreshCcw,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DateRangeFilter, {
  getDatePresetRange,
} from "../../components/common/DateRangeFilter";
import { useGetOverviewDashboardQuery } from "../../features/overview/overview";
import Header from "../common/Header";

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value, digits = 0) =>
  `৳${safeNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;

const formatNumber = (value) => safeNumber(value).toLocaleString();

const formatShortDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
};

const metricTone = (changePercent) => {
  if (changePercent === null || changePercent === undefined) return "neutral";
  return safeNumber(changePercent) >= 0 ? "up" : "down";
};

const inventoryColors = {
  inStock: "#22c55e",
  lowStock: "#f59e0b",
  outOfStock: "#ef4444",
  damaged: "#6366f1",
  repairing: "#14b8a6",
};

const MetricCard = ({ title, value, changePercent, icon: Icon, color }) => {
  const tone = metricTone(changePercent);
  const TrendIcon = tone === "down" ? TrendingDown : TrendingUp;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
          style={{ background: color }}
        >
          <Icon size={21} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {value}
          </p>
          {tone === "neutral" ? (
            <p className="mt-3 text-xs font-semibold text-slate-400">
              Live stock snapshot
            </p>
          ) : (
            <p
              className={`mt-3 flex items-center gap-1 text-xs font-bold ${
                tone === "up" ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              <TrendIcon size={13} />
              {Math.abs(safeNumber(changePercent)).toFixed(1)}% vs last period
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const Panel = ({ title, action, children, className = "" }) => (
  <section
    className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
  >
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <h2 className="text-base font-black text-slate-950">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const EmptyState = ({ text }) => (
  <div className="flex min-h-[180px] items-center justify-center px-6 text-center text-sm font-semibold text-slate-400">
    {text}
  </div>
);

const SENSITIVE_OVERVIEW_EMAIL = "ndhrubotara7@gmail.com";

const getStoredAuthUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "{}");
  } catch {
    return {};
  }
};

const InventoryDashboardOverview = () => {
  const authUser = getStoredAuthUser();
  const currentUserEmail = String(
    authUser?.Email || authUser?.email || localStorage.getItem("email") || "",
  ).toLowerCase();
  const canSeeSensitiveOverview =
    currentUserEmail === SENSITIVE_OVERVIEW_EMAIL;
  const defaultRange = useMemo(() => getDatePresetRange("last30"), []);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [query, setQuery] = useState({
    filter: "custom",
    from: defaultRange.from,
    to: defaultRange.to,
    applyFilter: true,
  });

  const { data, isLoading, isError, refetch } =
    useGetOverviewDashboardQuery(query);
  const dashboard = data?.data || {};
  const metrics = dashboard.metrics || {};
  const summary = dashboard.summary || {};
  const inventorySummary = dashboard.inventorySummary || {};
  const salesOverview = dashboard.salesOverview || [];
  const lowStockProducts = dashboard.lowStockProducts || [];
  const topSellingProducts = dashboard.topSellingProducts || [];

  const chartData = salesOverview.map((item) => ({
    date: formatShortDate(item.date),
    current: safeNumber(item.currentRevenue),
    previous: safeNumber(item.previousRevenue),
  }));

  const inventoryChart = [
    {
      key: "inStock",
      name: "In Stock",
      value: safeNumber(inventorySummary.inStock?.quantity),
      count: safeNumber(inventorySummary.inStock?.count),
    },
    {
      key: "lowStock",
      name: "Low Stock",
      value: safeNumber(inventorySummary.lowStock?.quantity),
      count: safeNumber(inventorySummary.lowStock?.count),
    },
    {
      key: "outOfStock",
      name: "Out of Stock",
      value: safeNumber(inventorySummary.outOfStock?.count),
      count: safeNumber(inventorySummary.outOfStock?.count),
    },
    {
      key: "damaged",
      name: "Damaged",
      value: safeNumber(inventorySummary.damaged?.quantity),
      count: safeNumber(inventorySummary.damaged?.count),
    },
  ].filter((item) => item.value > 0 || item.count > 0);

  const totalInventoryValue = inventoryChart.reduce(
    (total, item) => total + safeNumber(item.value),
    0,
  );

  const metricCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(metrics.totalRevenue?.value),
      changePercent: metrics.totalRevenue?.changePercent,
      icon: WalletCards,
      color: "#635bff",
    },
    {
      title: "Total Sales",
      value: formatCurrency(metrics.totalSales?.value),
      changePercent: metrics.totalSales?.changePercent,
      icon: ShoppingBag,
      color: "#22c55e",
    },
    {
      title: "Total Orders",
      value: formatNumber(metrics.totalOrders?.value),
      changePercent: metrics.totalOrders?.changePercent,
      icon: ReceiptText,
      color: "#f59e0b",
    },
    {
      title: "Total Products",
      value: formatNumber(metrics.totalProducts?.value),
      changePercent: metrics.totalProducts?.periodChangePercent,
      icon: Package,
      color: "#0ea5e9",
    },
    {
      title: "Low Stock Items",
      value: formatNumber(metrics.lowStockItems?.value),
      changePercent: metrics.lowStockItems?.changePercent,
      icon: AlertTriangle,
      color: "#ec4899",
    },
    {
      title: "Stock Value",
      value: formatCurrency(metrics.stockValue?.value),
      changePercent: metrics.stockValue?.changePercent,
      icon: Coins,
      color: "#8b5cf6",
    },
  ];

  const approvalQueue = [
    {
      label: "Purchase Requisition",
      value: summary.pendingPurchaseRequisitionCount,
    },
    {
      label: "Petty Cash Requisition",
      value: summary.pendingPettyCashRequisitionCount,
    },
    {
      label: "Assets Purchase Requisition",
      value: summary.pendingAssetsRequisitionCount,
    },
  ];

  const cashCards = [
    {
      label: "Total Cash In",
      value: summary.totalCashInAmount,
      icon: TrendingUp,
      iconClass: "bg-emerald-50 text-emerald-600 border-emerald-100",
      valueClass: "text-emerald-600",
    },
    {
      label: "Total Cash Out",
      value: summary.totalCashOutAmount,
      icon: TrendingDown,
      iconClass: "bg-rose-50 text-rose-600 border-rose-100",
      valueClass: "text-rose-600",
    },
    {
      label: "Net Balance",
      value: summary.netCashPosition,
      icon: WalletCards,
      iconClass: "bg-indigo-50 text-indigo-600 border-indigo-100",
      valueClass:
        safeNumber(summary.netCashPosition) >= 0
          ? "text-slate-950"
          : "text-rose-600",
    },
  ];

  const applyDateRange = (filterType, range) => {
    const nextRange = range || getDatePresetRange(filterType || "last30");
    setFrom(nextRange.from);
    setTo(nextRange.to);
    setQuery({
      filter: "custom",
      from: nextRange.from,
      to: nextRange.to,
      applyFilter: true,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Header title="Dashboard" />

      <main className="px-5 py-5 lg:px-8">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">
              Dashboard
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Welcome back, Admin! Here's what's happening with your business
              today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DateRangeFilter
              startDate={from}
              endDate={to}
              onStartDateChange={setFrom}
              onEndDateChange={setTo}
              onFilterTypeChange={applyDateRange}
              defaultFilter="last30"
              className="min-w-[320px]"
            />
            <button
              type="button"
              onClick={() => refetch?.()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:text-indigo-600"
              aria-label="Refresh dashboard"
            >
              <RefreshCcw size={17} />
            </button>
          </div>
        </div>

        {isError && (
          <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            Failed to load dashboard data.
          </div>
        )}

        {canSeeSensitiveOverview && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
              {metricCards.map((card) => (
                <MetricCard
                  key={card.title}
                  title={card.title}
                  value={isLoading ? "..." : card.value}
                  changePercent={card.changePercent}
                  icon={card.icon}
                  color={card.color}
                />
              ))}
            </div>

            <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-950">
                    Cash Snapshot
                  </h2>
                  <p className="text-xs font-semibold text-slate-500">
                    Cash in, cash out and current net balance for this period
                  </p>
                </div>
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-500">
                  Live Summary
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {cashCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <div
                      key={card.label}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-500">
                          {card.label}
                        </p>
                        <p
                          className={`mt-2 text-2xl font-black tracking-tight ${card.valueClass}`}
                        >
                          {isLoading ? "..." : formatCurrency(card.value, 2)}
                        </p>
                      </div>
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-lg border ${card.iconClass}`}
                      >
                        <Icon size={19} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
              <Panel
                title="Sales Overview"
                className="xl:col-span-6"
                action={
                  <span className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">
                    This Period
                  </span>
                }
              >
                <div className="h-[320px] px-3 py-5">
                  {chartData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="salesCurrent" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.24} />
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#64748b" }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#64748b" }}
                          tickFormatter={(value) => `${Math.round(value / 1000)}K`}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{
                            borderRadius: 8,
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="previous"
                          stroke="#c4b5fd"
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          fill="transparent"
                          name="Last Period"
                        />
                        <Area
                          type="monotone"
                          dataKey="current"
                          stroke="#4f46e5"
                          strokeWidth={3}
                          fill="url(#salesCurrent)"
                          name="This Period"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState text="No sales chart data found." />
                  )}
                </div>
              </Panel>

              <Panel
                title="Inventory Summary"
                className="xl:col-span-3"
                action={
                  <span className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">
                    All Warehouses
                  </span>
                }
              >
                <div className="grid min-h-[320px] grid-cols-1 items-center gap-4 px-4 py-5">
                  {inventoryChart.length ? (
                    <>
                      <div className="relative mx-auto h-56 w-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={inventoryChart}
                              dataKey="value"
                              innerRadius={70}
                              outerRadius={100}
                              paddingAngle={2}
                            >
                              {inventoryChart.map((entry) => (
                                <Cell
                                  key={entry.key}
                                  fill={inventoryColors[entry.key]}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatNumber(value)} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-3xl font-black text-slate-950">
                            {formatNumber(inventorySummary.totalItems)}
                          </p>
                          <p className="text-xs font-bold text-slate-500">
                            Total Items
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {inventoryChart.map((item) => {
                          const percent = totalInventoryValue
                            ? Math.round((safeNumber(item.value) / totalInventoryValue) * 100)
                            : 0;

                          return (
                            <div key={item.key} className="flex items-center gap-3">
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ background: inventoryColors[item.key] }}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-700">
                                  {item.name}
                                </p>
                                <p className="text-xs font-semibold text-slate-500">
                                  {formatNumber(item.value)} ({percent}%)
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <EmptyState text="No inventory summary found." />
                  )}
                </div>
              </Panel>

              <Panel
                title="Approval Queue"
                className="xl:col-span-3"
                action={
                  <span className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
                    Live Summary
                  </span>
                }
              >
                <div className="space-y-3 p-5">
                  <div className="mb-1 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-600">
                      <ClipboardList size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-950">
                        Items waiting for admin action
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        Pending requests summary
                      </p>
                    </div>
                  </div>
                  {approvalQueue.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <span className="text-sm font-bold text-slate-600">
                        {item.label}
                      </span>
                      <span className="text-lg font-black text-slate-950">
                        {isLoading ? "..." : formatNumber(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </>
        )}

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
          <Panel title="Top Selling Products" className="xl:col-span-6">
            <div className="divide-y divide-slate-100">
              {topSellingProducts.length ? (
                topSellingProducts.map((product) => (
                  <div
                    key={`${product.rank}-${product.productName}`}
                    className="flex items-center gap-3 px-5 py-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-slate-700">
                      {product.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900">
                        {product.productName}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        Sold Qty: {formatNumber(product.soldQty)}
                      </p>
                    </div>
                    <p className="text-sm font-black text-slate-800">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState text="No top selling products found." />
              )}
            </div>
          </Panel>

          <Panel
            title="Low Stock Alert"
            className="xl:col-span-6"
            action={
              <span className="text-xs font-black text-indigo-600">
                View All
              </span>
            }
          >
            <div className="divide-y divide-slate-100">
              {lowStockProducts.length ? (
                lowStockProducts.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-5 py-4"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                      <Package size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900">
                        {item.name}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        SKU: {item.sku || item.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400">
                        Current Stock
                      </p>
                      <p className="text-lg font-black text-rose-500">
                        {formatNumber(item.currentStock)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState text="No low stock products found." />
              )}
            </div>
          </Panel>
        </div>

        <footer className="mt-7 flex flex-col gap-2 border-t border-slate-200 py-5 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Kafela Mart Inventory Management System.</span>
          <span>Version 1.0.0</span>
        </footer>
      </main>
    </div>
  );
};

export default InventoryDashboardOverview;
