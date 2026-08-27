import { CalendarDays, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";

const pad2 = (value) => String(value).padStart(2, "0");

const formatDateOnly = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

// Our accounting month runs from the 26th of a calendar month through the
// 25th of the next — not the calendar month. cyclesBack=0 is the cycle that
// contains `referenceDate`, cyclesBack=1 is the one immediately before it.
export const getAccountingCycleRange = (cyclesBack = 0, referenceDate = new Date()) => {
  const day = referenceDate.getDate();
  let startMonth = referenceDate.getMonth();
  const startYear = referenceDate.getFullYear();

  if (day < 26) startMonth -= 1;
  startMonth -= cyclesBack;

  const start = new Date(startYear, startMonth, 26);
  const end = new Date(startYear, startMonth + 1, 25);

  return { from: formatDateOnly(start), to: formatDateOnly(end) };
};

export const formatRangeLabel = (from, to) => {
  if (!from || !to) return "";
  const opts = { day: "numeric", month: "short", year: "numeric" };
  const fromLabel = new Date(from).toLocaleDateString("en-GB", opts);
  const toLabel = new Date(to).toLocaleDateString("en-GB", opts);
  return `${fromLabel} – ${toLabel}`;
};

const FILTER_OPTIONS = [
  { value: "current", label: "Current Month" },
  { value: "previous", label: "Previous Month" },
  { value: "custom", label: "Custom Date" },
];

const AccountingMonthFilter = ({ onChange, className = "" }) => {
  const [selected, setSelected] = useState("current");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const emit = (preset, range) => {
    onChange?.({
      preset,
      from: range.from,
      to: range.to,
      label: formatRangeLabel(range.from, range.to),
    });
  };

  useEffect(() => {
    emit("current", getAccountingCycleRange(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (value) => {
    setSelected(value);

    if (value === "current") {
      emit("current", getAccountingCycleRange(0));
      return;
    }

    if (value === "previous") {
      emit("previous", getAccountingCycleRange(1));
      return;
    }

    const range = getAccountingCycleRange(0);
    setCustomFrom(range.from);
    setCustomTo(range.to);
  };

  const handleApply = () => {
    if (!customFrom || !customTo) return;
    emit("custom", { from: customFrom, to: customTo });
  };

  const handleReset = () => handleChange("current");

  const isCustom = selected === "custom";

  return (
    <div className={`grid min-w-0 grid-cols-1 gap-3 ${className}`}>
      <div className="flex min-w-0 flex-col w-full">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">
          Filter
        </label>
        <select
          value={selected}
          onChange={(e) => handleChange(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
        >
          {FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isCustom ? (
        <div className="grid min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-2">
          <div className="flex flex-col flex-1 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">
              Start
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
              End
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

          <div className="flex gap-2 w-full sm:col-span-2">
            <button
              type="button"
              onClick={handleApply}
              disabled={!customFrom || !customTo}
              className="h-11 min-w-0 flex-1 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none disabled:active:scale-100"
            >
              Apply
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-600 active:scale-[0.98] transition flex items-center justify-center hover:bg-slate-50"
              title="Reset to current month"
            >
              <RefreshCcw size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AccountingMonthFilter;
