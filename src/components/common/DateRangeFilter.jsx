import { CalendarDays, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";

export const formatDateOnly = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

export const getDatePresetRange = (preset) => {
  const today = new Date();

  if (preset === "today") {
    const date = formatDateOnly(today);
    return { from: date, to: date };
  }

  if (preset === "yesterday") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = formatDateOnly(yesterday);
    return { from: date, to: date };
  }

  if (preset === "thisWeek") {
    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(today);
    start.setDate(today.getDate() + diffToMonday);

    return { from: formatDateOnly(start), to: formatDateOnly(today) };
  }

  if (preset === "thisMonth") {
    return {
      from: formatDateOnly(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: formatDateOnly(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    };
  }

  if (preset === "last30") {
    const start = new Date();
    start.setDate(today.getDate() - 29);

    return { from: formatDateOnly(start), to: formatDateOnly(today) };
  }

  return { from: "", to: "" };
};

const FILTER_OPTIONS = [
  { value: "last30", label: "Last 30 Days" },
  { value: "", label: "All Data" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "custom", label: "Custom Date" },
];

const DateRangeFilter = ({
  startDate = "",
  endDate = "",
  onStartDateChange,
  onEndDateChange,
  onFilterTypeChange,
  defaultFilter = "",
  label = "Filter",
  startLabel = "Start",
  endLabel = "End",
  compact = false,
  className = "",
  selectWrapperClassName = "",
}) => {
  const [selectedFilter, setSelectedFilter] = useState(defaultFilter);
  const [customFrom, setCustomFrom] = useState(() => startDate || "");
  const [customTo, setCustomTo] = useState(() => endDate || "");

  useEffect(() => {
    setSelectedFilter(defaultFilter);
  }, [defaultFilter]);

  const applyRange = (filterType, range) => {
    onStartDateChange?.(range.from);
    onEndDateChange?.(range.to);
    onFilterTypeChange?.(filterType, range);
  };

  const handleFilterChange = (value) => {
    setSelectedFilter(value);

    if (value === "custom") {
      setCustomFrom(startDate || "");
      setCustomTo(endDate || "");
      return;
    }

    const range = getDatePresetRange(value);
    applyRange(value, range);
  };

  const handleApply = () => {
    if (!customFrom || !customTo) return;
    applyRange("custom", { from: customFrom, to: customTo });
  };

  const handleReset = () => {
    const range = getDatePresetRange(defaultFilter);
    setSelectedFilter(defaultFilter);
    setCustomFrom(range.from);
    setCustomTo(range.to);
    applyRange(defaultFilter, range);
  };

  const isCustomFilter = selectedFilter === "custom";
  const containerClass = compact
    ? "grid min-w-0 grid-cols-1 gap-3"
    : "bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-5 flex flex-col gap-3 lg:gap-4 ring-1 ring-slate-100";

  return (
    <div className={`${containerClass} ${className}`}>
      <div
        className={`flex min-w-0 flex-col ${compact ? "w-full" : "sm:w-48"} ${selectWrapperClassName}`}
      >
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">
          {label}
        </label>
        <select
          value={selectedFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
        >
          {FILTER_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isCustomFilter ? (
        <div className="grid min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_auto]">
          <div className="flex flex-col flex-1 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">
              {startLabel}
            </label>
            <div className="relative">
              <CalendarDays
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500"
              />
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>
          </div>

          <div className="flex flex-col flex-1 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">
              {endLabel}
            </label>
            <div className="relative">
              <CalendarDays
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500"
              />
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>
          </div>

          <div className="flex gap-2 w-full sm:col-span-2 xl:col-span-1 xl:w-auto">
            <button
              type="button"
              onClick={handleApply}
              disabled={!customFrom || !customTo}
              className="h-11 min-w-0 flex-1 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none disabled:active:scale-100 xl:flex-none xl:px-6"
            >
              Apply
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-600 active:scale-[0.98] transition flex items-center justify-center hover:bg-slate-50"
              title="Reset date filter"
            >
              <RefreshCcw size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DateRangeFilter;
