import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Coins,
  Monitor,
  Package,
  ReceiptText,
  RefreshCcw,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Users,
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
import { useGetAllAssetsDamageQuery } from "../../features/assetsDamage/assetsDamage";
import { useGetAllAssetsPurchaseQuery } from "../../features/assetsPurchase/assetsPurchase";
import { useGetAllAssetsSaleQuery } from "../../features/assetsSale/assetsSale";
import { useGetAllAssetsStockQuery } from "../../features/assetsStock/assetsStock";
import { useGetAllEmployeeWithoutQueryQuery } from "../../features/employee/employee";
import { useGetOverviewDashboardQuery } from "../../features/overview/overview";
import {
  useGetStellarAttendanceEmployeesQuery,
  useGetStellarAttendanceHolidaysQuery,
  useGetStellarAttendanceLeavesQuery,
  useGetStellarAttendanceLogsQuery,
} from "../../features/stellarAttendance/stellarAttendance";
import Header from "../common/Header";
import { useCanUseMasterPermission } from "../../utils/masterPermissions";
import { useNavigate } from "react-router-dom";

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

const dateFromParts = (year, month, day) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const getTodayDate = () => {
  const date = new Date();
  return dateFromParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
};

const getCurrentCalendarMonthRange = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    from: dateFromParts(
      start.getFullYear(),
      start.getMonth() + 1,
      start.getDate(),
    ),
    to: dateFromParts(end.getFullYear(), end.getMonth() + 1, end.getDate()),
  };
};

const buildCalendarWeeks = (baseDate = new Date()) => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const cursor = new Date(firstDay);
  cursor.setDate(firstDay.getDate() - firstDay.getDay());

  const days = [];
  while (days.length < 42) {
    days.push({
      key: dateFromParts(
        cursor.getFullYear(),
        cursor.getMonth() + 1,
        cursor.getDate(),
      ),
      day: cursor.getDate(),
      isCurrentMonth: cursor.getMonth() === month,
      isToday: cursor.toDateString() === new Date().toDateString(),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    label: baseDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    days,
  };
};

const getAttendanceMonthRange = (dateValue = getTodayDate()) => {
  const date = new Date(`${dateValue}T00:00:00`);
  if (date.getDate() <= 25) {
    date.setMonth(date.getMonth() - 1);
  }

  const startDate = new Date(date.getFullYear(), date.getMonth() - 1, 26);
  const endDate = new Date(date.getFullYear(), date.getMonth(), 25);

  return {
    start: dateFromParts(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      startDate.getDate(),
    ),
    end: dateFromParts(
      endDate.getFullYear(),
      endDate.getMonth() + 1,
      endDate.getDate(),
    ),
  };
};

const getDateRangeList = (start, end) => {
  const dates = [];
  const cursor = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  while (!Number.isNaN(cursor.getTime()) && cursor <= endDate) {
    dates.push(
      dateFromParts(
        cursor.getFullYear(),
        cursor.getMonth() + 1,
        cursor.getDate(),
      ),
    );
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const getOverlapDates = (start, end, range) => {
  const overlapStart = start > range.start ? start : range.start;
  const overlapEnd = end < range.end ? end : range.end;
  if (!overlapStart || !overlapEnd || overlapStart > overlapEnd) return [];
  return getDateRangeList(overlapStart, overlapEnd);
};

const isActiveStatus = (value) =>
  ["active", "approved"].includes(String(value || "").toLowerCase());

const getEmployeeRegistrationId = (employee) =>
  employee?.employee_id || employee?.employeeCode || "";

const getRegistrationId = (row) =>
  row.registration_id ||
  row.registraton_id ||
  row.registrationId ||
  row.deviceUserId ||
  "";

const getLogDate = (row) => row.access_date || row.logDate || row.date || "";

const getHolidayDates = (holidays, range) => {
  const dates = new Set();
  holidays.forEach((holiday) => {
    if (!isActiveStatus(holiday.status)) return;
    const start = String(holiday.startDate || holiday.holidayDate || "").slice(
      0,
      10,
    );
    const end = String(holiday.endDate || start).slice(0, 10);
    getOverlapDates(start, end, range).forEach((date) => dates.add(date));
  });
  return dates;
};

const getWeekdayName = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
  });

const getWeeklyOffDates = (shift, range) => {
  const weeklyOffDays = Array.isArray(shift?.weeklyOffDays)
    ? shift.weeklyOffDays.map((item) => String(item).toLowerCase())
    : [];
  if (!weeklyOffDays.length) return new Set();
  return new Set(
    getDateRangeList(range.start, range.end).filter((date) =>
      weeklyOffDays.includes(getWeekdayName(date).toLowerCase()),
    ),
  );
};

const countLeaveDates = ({
  leaveRequests,
  employeeId,
  range,
  excludedDates,
}) => {
  const dates = new Set();
  leaveRequests.forEach((leave) => {
    if (String(leave.employeeId) !== String(employeeId)) return;
    if (String(leave.approvalStatus || "").toLowerCase() !== "approved") return;
    const start = String(leave.startDate || "").slice(0, 10);
    const end = String(leave.endDate || start).slice(0, 10);
    getOverlapDates(start, end, range).forEach((date) => {
      if (!excludedDates.has(date)) dates.add(date);
    });
  });
  return dates.size;
};

const buildAttendanceRows = ({
  logs,
  employees,
  holidays,
  leaveRequests,
  range,
}) => {
  const holidayDates = getHolidayDates(holidays, range);
  const totalDays = getDateRangeList(range.start, range.end).length;
  const logsByEmployeeAndDate = logs.reduce((acc, log) => {
    const registrationId = String(getRegistrationId(log));
    const date = getLogDate(log);
    if (!registrationId || !date) return acc;
    if (!acc.has(registrationId)) acc.set(registrationId, new Set());
    acc.get(registrationId).add(date);
    return acc;
  }, new Map());

  return employees
    .map((employee) => {
      const registrationId = String(getEmployeeRegistrationId(employee));
      const weeklyOffDates = getWeeklyOffDates(employee.shift, range);
      const offDates = new Set([...holidayDates, ...weeklyOffDates]);
      const workDays = Math.max(0, totalDays - offDates.size);
      const employeeLogs =
        logsByEmployeeAndDate.get(registrationId) || new Set();
      const present = Array.from(employeeLogs).filter(
        (date) => !offDates.has(date),
      ).length;
      const leave = countLeaveDates({
        leaveRequests,
        employeeId: employee.Id,
        range,
        excludedDates: offDates,
      });
      const absent = Math.max(0, workDays - present - leave);
      const presentPercent = workDays
        ? Math.round((present / workDays) * 100)
        : 0;

      return { registrationId, present, absent, presentPercent };
    })
    .filter((row) => row.registrationId);
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
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm sm:h-12 sm:w-12"
          style={{ background: color }}
        >
          <Icon size={21} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          <p className="mt-2 break-words text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
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

const ManagementCard = ({
  title,
  value,
  centerLabel,
  icon: Icon,
  color,
  chartData,
  rows,
  actionLabel,
  onClick,
  isLoading,
}) => {
  const total = chartData.reduce(
    (sum, item) => sum + safeNumber(item.value),
    0,
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ background: color }}
          >
            <Icon size={18} />
          </div>
          <h3 className="truncate text-sm font-black text-slate-900">
            {title}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClick}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
          aria-label={actionLabel}
          title={actionLabel}
        >
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_116px] items-center gap-3 px-4 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{centerLabel}</p>
          <p className="mt-1 break-words text-xl font-black text-slate-950">
            {isLoading ? "..." : value}
          </p>
        </div>
        <div className="relative h-28 w-28">
          {total ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  innerRadius={34}
                  outerRadius={52}
                  paddingAngle={2}
                  stroke="none"
                >
                  {chartData.map((item) => (
                    <Cell key={item.label} fill={item.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-full border-8 border-slate-100" />
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-lg font-black text-slate-950">
              {total
                ? Math.round((safeNumber(chartData[0]?.value) / total) * 100)
                : 0}
              %
            </p>
            <p className="text-[10px] font-bold text-slate-500">
              {chartData[0]?.label}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2 px-4 pb-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: row.color }}
              />
              <span className="truncate font-semibold text-slate-600">
                {row.label}
              </span>
            </div>
            <span className="shrink-0 font-black text-slate-900">
              {isLoading ? "..." : row.value}
            </span>
          </div>
        ))}
      </div>
    </motion.section>
  );
};

const Panel = ({ title, action, children, className = "" }) => (
  <section
    className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
  >
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
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

const CompactListItem = ({ icon: Icon, colorClass, title, subtitle, meta }) => (
  <div className="flex items-start gap-3 px-4 py-3 sm:px-5">
    <div
      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${colorClass}`}
    >
      <Icon size={17} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-black text-slate-900">{title}</p>
      <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
        {subtitle}
      </p>
    </div>
    <span className="shrink-0 text-xs font-semibold text-slate-500">
      {meta}
    </span>
  </div>
);

const InventoryDashboardOverview = () => {
  const navigate = useNavigate();
  const { canUseMasterPermission: canSeeSensitiveOverview } =
    useCanUseMasterPermission();
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
  const todayDate = useMemo(() => getTodayDate(), []);
  const attendanceMonthRange = useMemo(
    () => getAttendanceMonthRange(todayDate),
    [todayDate],
  );
  const attendanceQueryRange = useMemo(() => {
    const dates = [
      attendanceMonthRange.start,
      attendanceMonthRange.end,
      todayDate,
    ].sort();
    return { start: dates[0], end: dates[dates.length - 1] };
  }, [attendanceMonthRange, todayDate]);
  const { data: attendanceLogsData } = useGetStellarAttendanceLogsQuery({
    start_date: attendanceQueryRange.start,
    end_date: attendanceQueryRange.end,
    start_time: "00:00:01",
    end_time: "23:59:59",
  });
  const { data: attendanceEmployeesData } =
    useGetStellarAttendanceEmployeesQuery({
      page: 1,
      limit: 1000,
      status: "Active",
    });
  const { data: attendanceHolidaysData } = useGetStellarAttendanceHolidaysQuery(
    {
      page: 1,
      limit: 1000,
      status: "Active",
    },
  );
  const { data: attendanceLeavesData } = useGetStellarAttendanceLeavesQuery({
    page: 1,
    limit: 1000,
    from: attendanceQueryRange.start,
    to: attendanceQueryRange.end,
    approvalStatus: "Approved",
  });
  const { data: assetStockData } = useGetAllAssetsStockQuery({
    page: 1,
    limit: 1,
  });
  const assetTotalsQuery = useMemo(
    () => ({
      page: 1,
      limit: 1,
    }),
    [],
  );
  const { data: assetPurchaseData } =
    useGetAllAssetsPurchaseQuery(assetTotalsQuery);
  const { data: assetSaleData } = useGetAllAssetsSaleQuery(assetTotalsQuery);
  const { data: assetDamageData } =
    useGetAllAssetsDamageQuery(assetTotalsQuery);
  const { data: payrollRowsData } = useGetAllEmployeeWithoutQueryQuery();
  const dashboard = data?.data || {};
  const metrics = dashboard.metrics || {};
  const summary = dashboard.summary || {};
  const managementSummary = dashboard.managementSummary || {};
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
    // {
    //   title: "Total Sales",
    //   value: formatCurrency(metrics.totalSales?.value),
    //   changePercent: metrics.totalSales?.changePercent,
    //   icon: ShoppingBag,
    //   color: "#22c55e",
    // },
    {
      title: "Total POS Sale",
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
      label: "Item Requisition",
      value: summary.pendingPurchaseRequisitionCount,
      href: "/item-requisition",
    },
    {
      label: "Petty Cash Requisition",
      value: summary.pendingPettyCashRequisitionCount,
      href: "/petty-cash-requisition",
    },
    {
      label: "Assets Purchase Requisition",
      value: summary.pendingAssetsRequisitionCount,
      href: "/assets-requisition",
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

  const profitLossCards = [
    {
      label: "Net Revenue",
      value: summary.netRevenue,
      icon: WalletCards,
      iconClass: "bg-indigo-50 text-indigo-600 border-indigo-100",
      accentClass: "bg-indigo-500",
      valueClass: "text-indigo-700",
    },
    {
      label: "Net Purchase",
      value: summary.netPurchase,
      icon: ReceiptText,
      iconClass: "bg-amber-50 text-amber-600 border-amber-100",
      accentClass: "bg-amber-500",
      valueClass: "text-amber-700",
    },
    {
      label: "Gross Profit",
      value: summary.grossProfit,
      icon: TrendingUp,
      iconClass:
        safeNumber(summary.grossProfit) >= 0
          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
          : "bg-rose-50 text-rose-600 border-rose-100",
      accentClass:
        safeNumber(summary.grossProfit) >= 0 ? "bg-emerald-500" : "bg-rose-500",
      valueClass:
        safeNumber(summary.grossProfit) >= 0
          ? "text-emerald-600"
          : "text-rose-600",
    },
    {
      label: "Others Expense",
      value: summary.othersExpense,
      icon: TrendingDown,
      iconClass: "bg-slate-50 text-slate-600 border-slate-200",
      accentClass: "bg-slate-400",
      valueClass: "text-slate-700",
    },
    {
      label: "Net Profit/Loss",
      value: summary.netProfitLoss,
      icon: Coins,
      iconClass:
        safeNumber(summary.netProfitLoss) >= 0
          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
          : "bg-rose-50 text-rose-600 border-rose-100",
      accentClass:
        safeNumber(summary.netProfitLoss) >= 0
          ? "bg-emerald-500"
          : "bg-rose-500",
      valueClass:
        safeNumber(summary.netProfitLoss) >= 0
          ? "text-emerald-600"
          : "text-rose-600",
    },
  ];

  const accountsSummary = {
    cashIn: summary.totalCashInAmount,
    cashOut: summary.totalCashOutAmount,
    netBalance: summary.netCashPosition,
    ...(managementSummary.accounts || {}),
  };
  const attendanceLogs = attendanceLogsData?.data?.rows || [];
  const attendanceEmployees = attendanceEmployeesData?.data || [];
  const attendanceHolidays = attendanceHolidaysData?.data || [];
  const attendanceLeaveRequests = attendanceLeavesData?.data || [];
  const attendanceComputedSummary = useMemo(() => {
    const logsForRange = (range) =>
      attendanceLogs.filter((log) => {
        const date = getLogDate(log);
        return date >= range.start && date <= range.end;
      });
    const monthRows = buildAttendanceRows({
      logs: logsForRange(attendanceMonthRange),
      employees: attendanceEmployees,
      holidays: attendanceHolidays,
      leaveRequests: attendanceLeaveRequests,
      range: attendanceMonthRange,
    });
    const todayRows = buildAttendanceRows({
      logs: logsForRange({ start: todayDate, end: todayDate }),
      employees: attendanceEmployees,
      holidays: attendanceHolidays,
      leaveRequests: attendanceLeaveRequests,
      range: { start: todayDate, end: todayDate },
    });

    return {
      totalEmployees: monthRows.length,
      activeEmployees: monthRows.filter((row) => row.presentPercent >= 80)
        .length,
      inactiveEmployees: Math.max(
        monthRows.length -
          monthRows.filter((row) => row.presentPercent >= 80).length,
        0,
      ),
      presentToday: todayRows.filter((row) => row.present > 0).length,
      absentToday: todayRows.filter((row) => row.absent > 0).length,
    };
  }, [
    attendanceEmployees,
    attendanceHolidays,
    attendanceLeaveRequests,
    attendanceLogs,
    attendanceMonthRange,
    todayDate,
  ]);
  const apiEmployeeSummary = managementSummary.employees || {};
  const employeeSummary = {
    totalEmployees:
      safeNumber(apiEmployeeSummary.totalEmployees) ||
      attendanceComputedSummary.totalEmployees,
    activeEmployees:
      safeNumber(apiEmployeeSummary.activeEmployees) ||
      attendanceComputedSummary.activeEmployees,
    inactiveEmployees:
      safeNumber(apiEmployeeSummary.inactiveEmployees) ||
      attendanceComputedSummary.inactiveEmployees,
    presentToday:
      safeNumber(apiEmployeeSummary.presentToday) ||
      attendanceComputedSummary.presentToday,
    absentToday:
      safeNumber(apiEmployeeSummary.absentToday) ||
      attendanceComputedSummary.absentToday,
  };
  const assetStockMeta = assetStockData?.meta || {};
  const assetPurchaseMeta = assetPurchaseData?.meta || {};
  const assetSaleMeta = assetSaleData?.meta || {};
  const assetDamageMeta = assetDamageData?.meta || {};
  const apiAssetSummary = managementSummary.assets || {};
  const assetSummary = {
    totalAssets:
      safeNumber(apiAssetSummary.totalAssets) ||
      safeNumber(assetStockMeta.count),
    totalQuantity:
      safeNumber(apiAssetSummary.totalQuantity) ||
      safeNumber(assetStockMeta.totalQuantity),
    totalValue:
      safeNumber(apiAssetSummary.totalValue) ||
      safeNumber(assetStockMeta.totalAmount),
    purchasedValue:
      safeNumber(apiAssetSummary.purchasedValue) ||
      safeNumber(assetPurchaseMeta.totalAmount),
    soldValue:
      safeNumber(apiAssetSummary.soldValue) ||
      safeNumber(assetSaleMeta.totalAmount),
    damagedQuantity:
      safeNumber(apiAssetSummary.damagedQuantity) ||
      safeNumber(assetDamageMeta.totalQuantity),
    damagedValue:
      safeNumber(apiAssetSummary.damagedValue) ||
      safeNumber(assetDamageMeta.totalAmount),
  };
  const payrollCurrentMonthRange = useMemo(
    () => getCurrentCalendarMonthRange(),
    [],
  );
  const payrollComputedSummary = useMemo(() => {
    const rows = (payrollRowsData?.data || []).filter((row) => {
      const payrollDate = String(row?.date || "").slice(0, 10);
      return (
        payrollDate >= payrollCurrentMonthRange.from &&
        payrollDate <= payrollCurrentMonthRange.to
      );
    });

    return rows.reduce(
      (acc, row) => {
        const holidaySalary =
          (safeNumber(row.basic_salary) / 30) * safeNumber(row.holiday_payment);
        const gross =
          safeNumber(row.total_salary) +
          holidaySalary +
          safeNumber(row.festival_bonus);
        const net = safeNumber(row.net_salary);

        acc.grossAmount += gross;
        acc.netAmount += net;
        acc.deductionAmount += Math.max(gross - net, 0);
        return acc;
      },
      {
        month: payrollCurrentMonthRange.month,
        status: rows.length ? "Current Month" : "No Payroll",
        totalEmployees: rows.length,
        grossAmount: 0,
        deductionAmount: 0,
        netAmount: 0,
      },
    );
  }, [payrollCurrentMonthRange, payrollRowsData]);
  const apiPayrollSummary = managementSummary.payroll || {};
  const payrollSummary = {
    month: apiPayrollSummary.month || payrollComputedSummary.month,
    status: apiPayrollSummary.status || payrollComputedSummary.status,
    totalEmployees:
      safeNumber(apiPayrollSummary.totalEmployees) ||
      payrollComputedSummary.totalEmployees,
    grossAmount:
      safeNumber(apiPayrollSummary.grossAmount) ||
      payrollComputedSummary.grossAmount,
    deductionAmount:
      safeNumber(apiPayrollSummary.deductionAmount) ||
      payrollComputedSummary.deductionAmount,
    netAmount:
      safeNumber(apiPayrollSummary.netAmount) ||
      payrollComputedSummary.netAmount,
  };

  const managementCards = [
    {
      title: "Accounts Management",
      value: formatCurrency(accountsSummary.netBalance, 2),
      centerLabel: "Net Balance",
      icon: Banknote,
      color: "#16a34a",
      href: "/Receivable",
      actionLabel: "View accounts",
      chartData: [
        {
          label: "Cash In",
          value: accountsSummary.cashIn,
          color: "#22c55e",
        },
        {
          label: "Cash Out",
          value: accountsSummary.cashOut,
          color: "#f97316",
        },
      ],
      rows: [
        {
          label: "Cash In",
          value: formatCurrency(accountsSummary.cashIn, 2),
          color: "#22c55e",
        },
        {
          label: "Cash Out",
          value: formatCurrency(accountsSummary.cashOut, 2),
          color: "#ef4444",
        },
      ],
    },
    {
      title: "Employee Management",
      value: formatNumber(employeeSummary.totalEmployees),
      centerLabel: "Total Employees",
      icon: Users,
      color: "#f97316",
      href: "/hrm/attendance-summaries",
      actionLabel: "View attendance",
      chartData: [
        {
          label: "Active",
          value: employeeSummary.activeEmployees,
          color: "#22c55e",
        },
        {
          label: "Below 80%",
          value: employeeSummary.inactiveEmployees,
          color: "#ef4444",
        },
      ],
      rows: [
        {
          label: "Active",
          value: formatNumber(employeeSummary.activeEmployees),
          color: "#22c55e",
        },
        {
          label: "Present Today",
          value: formatNumber(employeeSummary.presentToday),
          color: "#14b8a6",
        },
        {
          label: "Absent Today",
          value: formatNumber(employeeSummary.absentToday),
          color: "#f97316",
        },
      ],
    },
    {
      title: "Asset Management",
      value: formatCurrency(assetSummary.totalValue, 2),
      centerLabel: "Total Assets",
      icon: Monitor,
      color: "#7c3aed",
      href: "/assets-stock",
      actionLabel: "View assets",
      chartData: [
        {
          label: "In Stock",
          value: assetSummary.totalQuantity,
          color: "#7c3aed",
        },
        {
          label: "Damaged",
          value: assetSummary.damagedQuantity,
          color: "#ef4444",
        },
      ],
      rows: [
        {
          label: "Purchase",
          value: formatCurrency(assetSummary.purchasedValue, 2),
          color: "#7c3aed",
        },
        {
          label: "Sale",
          value: formatCurrency(assetSummary.soldValue, 2),
          color: "#f97316",
        },
        {
          label: "Damage",
          value: formatCurrency(assetSummary.damagedValue, 2),
          color: "#ef4444",
        },
      ],
    },
    {
      title: "Payroll Management",
      value: formatCurrency(payrollSummary.netAmount, 2),
      centerLabel: "Payroll",
      icon: WalletCards,
      color: "#14b8a6",
      href: "/hrm/payroll-runs",
      actionLabel: "View payroll",
      chartData: [
        {
          label: "Net",
          value: payrollSummary.netAmount,
          color: "#14b8a6",
        },
        {
          label: "Deduction",
          value: payrollSummary.deductionAmount,
          color: "#f97316",
        },
      ],
      rows: [
        {
          label: "Gross",
          value: formatCurrency(payrollSummary.grossAmount, 2),
          color: "#14b8a6",
        },
        {
          label: "Deduction",
          value: formatCurrency(payrollSummary.deductionAmount, 2),
          color: "#f97316",
        },
        {
          label: "Employees",
          value: formatNumber(payrollSummary.totalEmployees),
          color: "#ef4444",
        },
      ],
    },
  ];

  const alertItems = [
    {
      title: "Low Stock Alert",
      subtitle: `${formatNumber(metrics.lowStockItems?.value)} items are running low in stock.`,
      meta: "Live",
      icon: AlertTriangle,
      colorClass: "bg-rose-50 text-rose-600",
    },
    {
      title: "Approval Queue",
      subtitle: `${formatNumber(
        approvalQueue.reduce((sum, item) => sum + safeNumber(item.value), 0),
      )} pending requests need admin action.`,
      meta: "Today",
      icon: ClipboardList,
      colorClass: "bg-amber-50 text-amber-600",
    },
    {
      title: "Asset Maintenance",
      subtitle: `${formatNumber(assetSummary.damagedQuantity)} damaged assets require attention.`,
      meta: "Live",
      icon: Monitor,
      colorClass: "bg-indigo-50 text-indigo-600",
    },
    {
      title: "Payroll Reminder",
      subtitle:
        payrollSummary.totalEmployees > 0
          ? `${formatNumber(payrollSummary.totalEmployees)} employee payroll entries are ready for review.`
          : "No payroll entries found for the current month.",
      meta: "This Month",
      icon: Bell,
      colorClass: "bg-emerald-50 text-emerald-600",
    },
  ];

  const activityItems = [
    {
      title: "Sales summary updated",
      subtitle: `${formatCurrency(metrics.totalRevenue?.value)} revenue recorded in this period.`,
      meta: "Live",
      icon: ReceiptText,
      colorClass: "bg-blue-50 text-blue-600",
    },
    {
      title: "Payment activity refreshed",
      subtitle: `${formatCurrency(accountsSummary.cashIn, 2)} cash in and ${formatCurrency(
        accountsSummary.cashOut,
        2,
      )} cash out tracked.`,
      meta: "Live",
      icon: Banknote,
      colorClass: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Employee attendance synced",
      subtitle: `${formatNumber(employeeSummary.presentToday)} present today, ${formatNumber(
        employeeSummary.absentToday,
      )} absent today.`,
      meta: "Today",
      icon: Users,
      colorClass: "bg-violet-50 text-violet-600",
    },
    {
      title: "Inventory status checked",
      subtitle: `${formatNumber(inventorySummary.totalItems)} total items available in live stock summary.`,
      meta: "Live",
      icon: CheckCircle2,
      colorClass: "bg-orange-50 text-orange-600",
    },
  ];

  const calendar = useMemo(() => buildCalendarWeeks(new Date()), []);
  const calendarEventDates = useMemo(
    () =>
      new Set(
        [todayDate, payrollCurrentMonthRange.to, query.to]
          .filter(Boolean)
          .map((value) => String(value).slice(0, 10)),
      ),
    [payrollCurrentMonthRange.to, query.to, todayDate],
  );

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

      <main className="px-3 py-4 sm:px-5 sm:py-5 lg:px-8">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight text-slate-950">
              Dashboard
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Welcome back, Admin! Here's what's happening with your business
              today.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto">
            <DateRangeFilter
              startDate={from}
              endDate={to}
              onStartDateChange={setFrom}
              onEndDateChange={setTo}
              onFilterTypeChange={applyDateRange}
              defaultFilter="last30"
              className="w-full sm:min-w-[280px] xl:w-auto"
            />
            <button
              type="button"
              onClick={() => refetch?.()}
              className="flex h-11 w-full shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:text-indigo-600 sm:w-11"
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
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mb-5"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {profitLossCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <div
                      key={card.label}
                      className="group relative flex min-h-[132px] overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-6"
                    >
                      <div
                        className={`absolute inset-x-0 top-0 h-1.5 ${card.accentClass}`}
                      />
                      <div className="flex w-full items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                            {card.label}
                          </p>
                          <p
                            className={`mt-5 break-words text-2xl font-black tracking-tight ${card.valueClass}`}
                          >
                            {isLoading ? "..." : formatCurrency(card.value, 2)}
                          </p>
                        </div>
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-sm transition duration-200 group-hover:scale-105 ${card.iconClass}`}
                        >
                          <Icon size={22} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.section>

            <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-5">
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

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {managementCards.map((card) => (
                <ManagementCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  centerLabel={card.centerLabel}
                  icon={card.icon}
                  color={card.color}
                  chartData={card.chartData}
                  rows={card.rows}
                  actionLabel={card.actionLabel}
                  onClick={() => navigate(card.href)}
                  isLoading={isLoading}
                />
              ))}
            </div>

            {/* <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
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
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {cashCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <div
                      key={card.label}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-4 sm:px-5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-500">
                          {card.label}
                        </p>
                        <p
                          className={`mt-2 break-words text-xl font-black tracking-tight sm:text-2xl ${card.valueClass}`}
                        >
                          {isLoading ? "..." : formatCurrency(card.value, 2)}
                        </p>
                      </div>
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${card.iconClass}`}
                      >
                        <Icon size={19} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section> */}

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
                <div className="h-[240px] px-1 py-4 sm:h-[320px] sm:px-3 sm:py-5">
                  {chartData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient
                            id="salesCurrent"
                            x1="0"
                            x2="0"
                            y1="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#4f46e5"
                              stopOpacity={0.24}
                            />
                            <stop
                              offset="95%"
                              stopColor="#4f46e5"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          interval="preserveStartEnd"
                          minTickGap={18}
                          tick={{ fontSize: 12, fill: "#64748b" }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          width={36}
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          tickFormatter={(value) =>
                            `${Math.round(value / 1000)}K`
                          }
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
                <div className="grid min-h-[260px] grid-cols-1 items-center gap-4 px-4 py-5 sm:min-h-[320px]">
                  {inventoryChart.length ? (
                    <>
                      <div className="relative mx-auto h-44 w-44 sm:h-56 sm:w-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={inventoryChart}
                              dataKey="value"
                              innerRadius={70}
                              outerRadius="88%"
                              paddingAngle={2}
                            >
                              {inventoryChart.map((entry) => (
                                <Cell
                                  key={entry.key}
                                  fill={inventoryColors[entry.key]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value) => formatNumber(value)}
                            />
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
                            ? Math.round(
                                (safeNumber(item.value) / totalInventoryValue) *
                                  100,
                              )
                            : 0;

                          return (
                            <div
                              key={item.key}
                              className="flex items-center gap-3"
                            >
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{
                                  background: inventoryColors[item.key],
                                }}
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
                <div className="space-y-3 p-4 sm:p-5">
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
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => navigate(item.href)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <span className="text-sm font-bold text-slate-600">
                        {item.label}
                      </span>
                      <span className="text-lg font-black text-slate-950">
                        {isLoading ? "..." : formatNumber(item.value)}
                      </span>
                    </button>
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
                    className="flex items-center gap-3 px-4 py-4 sm:px-5"
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
                    <p className="shrink-0 text-right text-sm font-black text-slate-800">
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
                    className="flex items-center gap-3 px-4 py-4 sm:px-5"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500 sm:h-12 sm:w-12">
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
                    <div className="shrink-0 text-right">
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

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
          <Panel
            title="Alerts & Notifications"
            className="xl:col-span-4"
            action={
              <button
                type="button"
                onClick={() => navigate("/notifications")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                View All
              </button>
            }
          >
            <div className="divide-y divide-slate-100">
              {alertItems.map((item) => (
                <CompactListItem key={item.title} {...item} />
              ))}
            </div>
          </Panel>

          <Panel
            title="Recent Activities"
            className="xl:col-span-4"
            action={
              <button
                type="button"
                onClick={() => navigate("/log-history")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                View All
              </button>
            }
          >
            <div className="divide-y divide-slate-100">
              {activityItems.map((item) => (
                <CompactListItem key={item.title} {...item} />
              ))}
            </div>
          </Panel>

          <Panel
            title="Calendar"
            className="xl:col-span-4"
            action={
              <button
                type="button"
                onClick={() => navigate("/hrm/attendance")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                View Full Calendar
              </button>
            }
          >
            <div className="px-4 py-4 sm:px-5">
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={17} />
                </button>
                <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <CalendarDays size={16} className="text-indigo-600" />
                  {calendar.label}
                </div>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                  aria-label="Next month"
                >
                  <ChevronRight size={17} />
                </button>
              </div>

              <div className="grid grid-cols-7 text-center text-[11px] font-black uppercase text-slate-500">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div key={day} className="py-1">
                      {day}
                    </div>
                  ),
                )}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-sm font-bold">
                {calendar.days.map((day) => {
                  const hasEvent = calendarEventDates.has(day.key);
                  return (
                    <div
                      key={day.key}
                      className="flex min-h-9 items-center justify-center"
                    >
                      <div
                        className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                          day.isToday
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                            : day.isCurrentMonth
                              ? "text-slate-900"
                              : "text-slate-300"
                        }`}
                      >
                        {day.day}
                        {hasEvent && (
                          <span
                            className={`absolute -bottom-1 h-1.5 w-1.5 rounded-full ${
                              day.isToday ? "bg-white" : "bg-indigo-500"
                            }`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
