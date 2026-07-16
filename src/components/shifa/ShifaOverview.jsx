import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, BarChart3, History, RefreshCcw } from "lucide-react";
import DateRangeFilter, {
  getDatePresetRange,
} from "../common/DateRangeFilter";
import {
  useGetAllShifaReportsQuery,
  useGetMyShifaReportsQuery,
} from "../../features/shifaReport/shifaReport";

const SECTION_FIELDS = {
  call_history: {
    title: "Call History",
    subtitle: "কল হিস্টোরি",
    icon: History,
    tone: "indigo",
    chart: "bar",
    fields: [
      { key: "phoneCalled", label: "ফোন করা হয়েছে" },
      { key: "phoneNotReceived", label: "ফোন রিসিভ করেনি" },
      { key: "phoneOff", label: "ফোন বন্ধ" },
      { key: "numberBusy", label: "নাম্বার ব্যস্ত" },
      { key: "refusedCall", label: "ফোন দিতে না করেছে" },
      { key: "callCut", label: "ফোন কেটে দিয়েছে" },
    ],
  },
  starting_situation: {
    title: "Starting Situation",
    subtitle: "শুরুর অবস্থা",
    icon: Activity,
    tone: "emerald",
    chart: "pie",
    fields: [
      { key: "started", label: "শুরু করেছে" },
      { key: "notStarted", label: "শুরু করেনি" },
      { key: "startingOther", label: "অন্যান্য" },
    ],
  },
  problem_history: {
    title: "Problem History",
    subtitle: "সমস্যার হিস্টোরি",
    icon: BarChart3,
    tone: "sky",
    chart: "bar",
    fields: [
      { key: "spousePractice", label: "স্বামী স্ত্রীর আমল" },
      { key: "evilEye", label: "বদনজর" },
      { key: "marriageObstacle", label: "বিবাহে বাধা" },
      { key: "livelihoodObstacle", label: "রিজিকে বাধা" },
      { key: "jinnAndMagic", label: "জীন ও জাদু" },
      { key: "separation", label: "বিচ্ছেদ" },
      { key: "noChild", label: "বাচ্চা হয় না" },
      { key: "problemOther", label: "অন্যান্য" },
    ],
  },
  patient_update: {
    title: "Patient Update",
    subtitle: "রোগীর আপডেট",
    icon: RefreshCcw,
    tone: "rose",
    chart: "bar",
    fields: [
      { key: "improving", label: "উন্নতি পাচ্ছে" },
      { key: "notImproving", label: "উন্নতি পাচ্ছে না" },
    ],
  },
};

const COLORS = [
  "#4f46e5",
  "#10b981",
  "#f43f5e",
  "#0ea5e9",
  "#f59e0b",
  "#8b5cf6",
  "#14b8a6",
  "#64748b",
];

const toneClasses = {
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  sky: "bg-sky-50 text-sky-600 border-sky-100",
  rose: "bg-rose-50 text-rose-600 border-rose-100",
};

const makeChartData = (fields, totals = {}) =>
  fields.map((field) => ({
    name: field.label,
    value: Number(totals[field.key] || 0),
  }));

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-bold text-slate-900">{label || item.name}</p>
      <p className="text-slate-600">Count: {Number(item.value || 0).toLocaleString()}</p>
    </div>
  );
};

const ShifaOverview = () => {
  const defaultRange = getDatePresetRange("last30");
  const [startDate, setStartDate] = useState(defaultRange.from);
  const [endDate, setEndDate] = useState(defaultRange.to);
  const [dateFilterType, setDateFilterType] = useState("last30");
  const role = localStorage.getItem("role") || "user";
  const canManageReports = ["superAdmin", "admin"].includes(role);
  const queryArgs = {
    page: 1,
    limit: 1,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };
  const allReports = useGetAllShifaReportsQuery(queryArgs, {
    skip: !canManageReports,
  });
  const myReports = useGetMyShifaReportsQuery(queryArgs, {
    skip: canManageReports,
  });
  const response = canManageReports ? allReports.data : myReports.data;
  const isLoading = canManageReports ? allReports.isLoading : myReports.isLoading;
  const totals = response?.meta?.totals || {};
  const totalReports = Number(response?.meta?.count || 0);

  const sections = useMemo(
    () =>
      Object.entries(SECTION_FIELDS).map(([key, config]) => ({
        key,
        ...config,
        data: makeChartData(config.fields, totals),
      })),
    [totals],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-500">
              Shifa
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              Overview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Call History, Starting Situation, Problem History, and Patient Update chart summary.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onFilterTypeChange={(type) => setDateFilterType(type)}
              defaultFilter={dateFilterType}
              compact
              className="w-full sm:w-80"
              selectWrapperClassName="w-full"
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Reports
              </p>
              <p className="text-xl font-black text-slate-900">
                {isLoading ? "..." : totalReports.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {sections.map((section) => (
          <ChartCard key={section.key} section={section} isLoading={isLoading} />
        ))}
      </div>
    </div>
  );
};

const ChartCard = ({ section, isLoading }) => {
  const Icon = section.icon;
  const total = section.data.reduce((sum, item) => sum + item.value, 0);
  const hasData = total > 0;

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${toneClasses[section.tone]}`}
          >
            <Icon size={19} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-black text-slate-900">
              {section.title}
            </h3>
            <p className="text-xs font-bold text-slate-400">{section.subtitle}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Total
          </p>
          <p className="text-lg font-black text-slate-900">
            {isLoading ? "..." : total.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="h-80 w-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">
            Loading chart...
          </div>
        ) : !hasData ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm font-bold text-slate-300">
            No chart data found.
          </div>
        ) : section.chart === "pie" ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={section.data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={105}
                label={({ name, percent, value }) =>
                  `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
                }
              >
                {section.data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={section.data} margin={{ top: 12, right: 12, left: 0, bottom: 58 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                interval={0}
                angle={-18}
                textAnchor="end"
                height={70}
                tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#4f46e5">
                {section.data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
};

export default ShifaOverview;
