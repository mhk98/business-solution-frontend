// Small shared pieces for the attendance screens.

export const STATUS_STYLES = {
  Present: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Half Day": "bg-amber-50 text-amber-700 border-amber-200",
  Absent: "bg-rose-50 text-rose-700 border-rose-200",
  Leave: "bg-sky-50 text-sky-700 border-sky-200",
  "Half Leave": "bg-sky-50 text-sky-700 border-sky-200",
  Holiday: "bg-violet-50 text-violet-700 border-violet-200",
  "Weekly Off": "bg-slate-100 text-slate-600 border-slate-200",
  Pending: "bg-slate-50 text-slate-500 border-slate-200",
};

export const OVERRIDE_STATUSES = [
  "Present",
  "Half Day",
  "Absent",
  "Leave",
  "Half Leave",
  "Holiday",
  "Weekly Off",
];

export const MANAGER_ROLES = ["superAdmin", "admin", "hr"];
export const canManageAttendance = () =>
  MANAGER_ROLES.includes(localStorage.getItem("role") || "");

export const bdToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

export const currentMonth = () => bdToday().slice(0, 7);

export const weekdayShort = (ymd) =>
  new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });

// "YYYY-MM-DD HH:MM:SS" → "HH:MM" (+1 marker when the out time is next day).
export const clockOf = (value, baseDate) => {
  if (!value) return "-";
  const [date, time] = String(value).split(" ");
  const hm = (time || "").slice(0, 5);
  return baseDate && date && date !== baseDate ? `${hm} (+1)` : hm;
};

export const minutesToHm = (minutes) => {
  const total = Number(minutes || 0);
  if (!total) return "-";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
};

export const num = (value) => {
  const n = Number(value || 0);
  return Number.isInteger(n) ? n : n.toFixed(1);
};

export const StatusBadge = ({ day }) => {
  if (!day) {
    return (
      <span className="inline-flex rounded-full border border-dashed border-slate-300 px-2.5 py-0.5 text-xs font-medium text-slate-400">
        No record
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
          STATUS_STYLES[day.status] || STATUS_STYLES.Pending
        }`}
      >
        {day.status}
      </span>
      {Boolean(day.isLate) && <Flag tone="amber">Late</Flag>}
      {Boolean(day.isEarlyLeave) && <Flag tone="orange">Early</Flag>}
      {Boolean(day.isMissingPunch) && <Flag tone="rose">Missing out</Flag>}
      {Boolean(day.workedOnOffDay) && <Flag tone="violet">Worked</Flag>}
      {Boolean(day.isLocked) && <Flag tone="slate">Manual</Flag>}
    </span>
  );
};

const FLAG_TONES = {
  amber: "bg-amber-100 text-amber-800",
  orange: "bg-orange-100 text-orange-800",
  rose: "bg-rose-100 text-rose-800",
  violet: "bg-violet-100 text-violet-800",
  slate: "bg-slate-200 text-slate-700",
};

const Flag = ({ tone, children }) => (
  <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${FLAG_TONES[tone]}`}>
    {children}
  </span>
);

export const Panel = ({ children, className = "" }) => (
  <section className={`rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
    {children}
  </section>
);

export const inputClass =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

export const TableShell = ({ headings, children, minWidth = "min-w-[960px]", empty, colSpan }) => (
  <div className="overflow-x-auto rounded-2xl border border-slate-200">
    <table className={`${minWidth} w-full divide-y divide-slate-200 text-sm`}>
      <thead className="bg-slate-50">
        <tr>
          {headings.map((heading) => (
            <th key={heading} className="whitespace-nowrap px-3 py-3 text-left font-semibold text-slate-700">
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
        {empty ? (
          <tr>
            <td colSpan={colSpan || headings.length} className="px-4 py-10 text-center text-slate-500">
              {empty}
            </td>
          </tr>
        ) : (
          children
        )}
      </tbody>
    </table>
  </div>
);

export const downloadCsv = (filename, rows) => {
  const escape = (value) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([String.fromCharCode(0xfeff) + csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
