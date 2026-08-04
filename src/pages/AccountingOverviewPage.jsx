import { useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Layers3,
  Minus,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import Header from "../components/common/Header";
import { useGetAllCashInOutWithoutQueryQuery } from "../features/cashInOut/cashInOut";

const safeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatCurrency = (value) =>
  `৳${safeNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatMonth = (date) =>
  date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

const getMonthRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getRowDate = (row) => {
  const rawDate = row?.date || row?.createdAt || row?.updatedAt;
  if (!rawDate) return null;

  const parsedDate = new Date(rawDate);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const isWithinRange = (date, range) =>
  date && date >= range.start && date <= range.end;

const getCategoryName = (row) => {
  const category = row?.category;
  if (typeof category === "string" && category.trim()) return category.trim();
  if (category?.name) return String(category.name).trim();
  if (row?.categoryName) return String(row.categoryName).trim();
  return "Uncategorized";
};

const extractRows = (payload) => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const getTrendMeta = (current, previous) => {
  if (current > previous) {
    return {
      label: "Higher than previous month",
      tone: "text-red-600 bg-red-50 border-red-200",
      dot: "bg-red-500",
      icon: ArrowUpRight,
      iconTone: "text-red-600",
    };
  }

  if (current < previous) {
    return {
      label: "Lower than previous month",
      tone: "text-emerald-600 bg-emerald-50 border-emerald-200",
      dot: "bg-emerald-500",
      icon: ArrowDownRight,
      iconTone: "text-emerald-600",
    };
  }

  return {
    label: "Same as previous month",
    tone: "text-amber-600 bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
    icon: Minus,
    iconTone: "text-amber-600",
  };
};

const AccountingOverviewPage = () => {
  const { data, isLoading, isFetching } = useGetAllCashInOutWithoutQueryQuery();

  const overview = useMemo(() => {
    const today = new Date();
    const currentRange = getMonthRange(today);
    const previousRange = getMonthRange(
      new Date(today.getFullYear(), today.getMonth() - 1, 1)
    );
    const currentMap = new Map();
    const previousMap = new Map();
    const rows = extractRows(data);

    rows.forEach((row) => {
      const paymentStatus = String(row?.paymentStatus || "")
        .replace(/\s+/g, "")
        .toLowerCase();
      const status = String(row?.status || "").toLowerCase();

      if (paymentStatus !== "cashout") return;
      if (["rejected", "declined", "deleted"].includes(status)) return;

      const rowDate = getRowDate(row);
      const categoryName = getCategoryName(row);
      const amount = safeNumber(row?.amount);

      if (!amount || !rowDate) return;

      if (isWithinRange(rowDate, currentRange)) {
        currentMap.set(categoryName, safeNumber(currentMap.get(categoryName)) + amount);
      }

      if (isWithinRange(rowDate, previousRange)) {
        previousMap.set(
          categoryName,
          safeNumber(previousMap.get(categoryName)) + amount
        );
      }
    });

    const categories = Array.from(
      new Set([...currentMap.keys(), ...previousMap.keys()])
    );

    const categoryCosts = categories
      .map((category) => {
        const currentCost = safeNumber(currentMap.get(category));
        const previousCost = safeNumber(previousMap.get(category));
        const difference = currentCost - previousCost;
        const percentage =
          previousCost > 0
            ? (difference / previousCost) * 100
            : currentCost > 0
              ? 100
              : 0;

        return {
          category,
          currentCost,
          previousCost,
          difference,
          percentage,
          trend: getTrendMeta(currentCost, previousCost),
        };
      })
      .sort((a, b) => {
        if (b.currentCost !== a.currentCost) return b.currentCost - a.currentCost;
        return b.previousCost - a.previousCost;
      });

    const currentTotal = categoryCosts.reduce(
      (total, item) => total + item.currentCost,
      0
    );
    const previousTotal = categoryCosts.reduce(
      (total, item) => total + item.previousCost,
      0
    );

    return {
      categoryCosts,
      currentMonth: formatMonth(currentRange.start),
      previousMonth: formatMonth(previousRange.start),
      currentTotal,
      previousTotal,
      difference: currentTotal - previousTotal,
    };
  }, [data]);

  const summaryCards = [
    {
      title: "Current Month Cost",
      value: formatCurrency(overview.currentTotal),
      helper: overview.currentMonth,
      icon: WalletCards,
      accent: "bg-violet-50 text-violet-600",
    },
    {
      title: "Previous Month Cost",
      value: formatCurrency(overview.previousTotal),
      helper: overview.previousMonth,
      icon: CalendarDays,
      accent: "bg-sky-50 text-sky-600",
    },
    {
      title: "Month Difference",
      value: formatCurrency(Math.abs(overview.difference)),
      helper:
        overview.difference > 0
          ? "Cost increased"
          : overview.difference < 0
            ? "Cost decreased"
            : "No change",
      icon: TrendingUp,
      accent:
        overview.difference > 0
          ? "bg-red-50 text-red-600"
          : overview.difference < 0
            ? "bg-emerald-50 text-emerald-600"
            : "bg-amber-50 text-amber-600",
    },
    {
      title: "Categories",
      value: overview.categoryCosts.length.toLocaleString(),
      helper: "Compared categories",
      icon: Layers3,
      accent: "bg-slate-100 text-slate-700",
    },
  ];

  return (
    <div className="flex-1 relative z-10">
      <Header title="Accounting Overview" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <section className="rounded-[8px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Category Wise Cost Overview
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {overview.currentMonth} compared with {overview.previousMonth}
              </p>
            </div>
            {isFetching ? (
              <span className="inline-flex w-fit items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                Updating...
              </span>
            ) : null}
          </div>

          <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-[8px] border border-slate-200 bg-white p-4"
                >
                  <div
                    className={`mb-4 flex h-11 w-11 items-center justify-center rounded-[8px] ${card.accent}`}
                  >
                    <Icon size={22} />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">
                    {card.title}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {isLoading ? "..." : card.value}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {card.helper}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="px-5 pb-5">
            <div className="overflow-hidden rounded-[8px] border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Rank
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Category
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                        Current Month
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                        Previous Month
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                        Difference
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Signal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-12 text-center text-sm font-semibold text-slate-500"
                        >
                          Loading category cost overview...
                        </td>
                      </tr>
                    ) : overview.categoryCosts.length ? (
                      overview.categoryCosts.map((item, index) => {
                        const TrendIcon = item.trend.icon;
                        return (
                          <tr key={item.category} className="hover:bg-slate-50">
                            <td className="px-4 py-4 text-sm font-bold text-slate-400">
                              #{index + 1}
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-semibold text-slate-900">
                                {item.category}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right text-sm font-bold text-slate-950">
                              {formatCurrency(item.currentCost)}
                            </td>
                            <td className="px-4 py-4 text-right text-sm font-semibold text-slate-600">
                              {formatCurrency(item.previousCost)}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="text-sm font-bold text-slate-900">
                                {formatCurrency(Math.abs(item.difference))}
                              </div>
                              <div className="text-xs font-semibold text-slate-400">
                                {Math.abs(item.percentage).toFixed(1)}%
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${item.trend.tone}`}
                              >
                                <span
                                  className={`h-2 w-2 rounded-full ${item.trend.dot}`}
                                />
                                <TrendIcon size={14} className={item.trend.iconTone} />
                                {item.trend.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-12 text-center text-sm font-semibold text-slate-500"
                        >
                          No cash out category cost found for these two months.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AccountingOverviewPage;
