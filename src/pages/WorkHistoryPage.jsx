import { useSearchParams, Link } from "react-router-dom";
import Select from "react-select";
import { RefreshCw } from "lucide-react";
import Header from "../components/common/Header";
import { SIDEBAR_ITEMS } from "../utils/navigationPermissions";
import { useGetTodayNotWorkedQuery, useGetUserDayActivityQuery } from "../features/todayNotWorked/todayNotWorked";

const humanize = (value) => String(value || "")
  .replace(/([a-z])([A-Z])/g, "$1 $2")
  .replace(/[_-]+/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());
const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const moduleLabels = new Map();
const collectMenus = (items, parent = "") => items.forEach((item) => {
  const label = parent ? `${parent} / ${item.name}` : item.name;
  [item.key, item.href?.split("?")[0].split("/")[1]].filter(Boolean).forEach((key) => moduleLabels.set(normalize(key), label));
  if (item.children) collectMenus(item.children, label);
});
collectMenus(SIDEBAR_ITEMS);
moduleLabels.set("user", "User Management");
const moduleLabel = (row) => moduleLabels.get(normalize(row.module)) || humanize(row.module) || "—";
const today = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
const formatTime = (value, timezone) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB", {
    timeZone: timezone, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

export default function WorkHistoryPage() {
  const [params, setParams] = useSearchParams();
  const authorized = localStorage.getItem("role") === "superAdmin";
  const userId = params.get("userId") || "";
  const date = params.get("date") || today();
  const usersQuery = useGetTodayNotWorkedQuery({ view: "all", date }, { skip: !authorized });
  const { currentData: data, isFetching, isError, error, refetch } = useGetUserDayActivityQuery(
    { userId, date }, { skip: !authorized || !userId, refetchOnMountOrArgChange: true },
  );
  const options = (usersQuery.data?.meta?.users || []).map((user) => ({ value: String(user.Id), label: user.name }));
  const rows = data?.data || [];
  const meta = data?.meta || {};
  const updateFilter = (key, value) => {
    const next = new URLSearchParams(params);
    next.set("date", date);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  };
  const message = !userId ? "Select an employee to view work history."
    : isFetching ? "Loading work history..."
    : isError ? error?.data?.message || "Failed to load work history."
    : !rows.length ? "No log entries for this day." : "";

  return (
    <div className="relative z-10 flex-1 min-w-0">
      <Header title="Work History" />
      <main className="min-h-[calc(100vh-64px)] bg-slate-50 text-slate-800 px-4 py-6 lg:px-8">
        {!authorized ? <p>You are not authorized to view this page.</p> : (
          <div className="mx-auto max-w-[1200px] space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{meta.name ? `${meta.name} — Work History` : "Work History"}</h2>
                <p className="mt-1 text-sm text-slate-500">{date} · {meta.timezone || "Asia/Dhaka"}</p>
              </div>
              <div className="flex gap-3 items-center">
                <Link to="/today-not-worked" className="text-sm font-semibold text-indigo-600">Today Not Worked</Link>
                <button type="button" onClick={() => refetch()} disabled={!userId || isFetching} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50">
                  <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} /> Refresh
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="w-full sm:w-80">
                <label htmlFor="history-employee" className="mb-2 block text-sm font-semibold text-slate-700">Employee</label>
                <Select inputId="history-employee" options={options} value={options.find((option) => option.value === userId) || (userId && meta.name ? { value: userId, label: meta.name } : null)} onChange={(option) => updateFilter("userId", option?.value)} isClearable isLoading={usersQuery.isFetching} placeholder="Select employee" />
                {usersQuery.isError && <p className="mt-2 text-sm text-red-600">Failed to load employees. <button type="button" onClick={() => usersQuery.refetch()} className="underline">Retry</button></p>}
              </div>
              <div>
                <label htmlFor="history-date" className="mb-2 block text-sm font-semibold text-slate-700">Date</label>
                <input id="history-date" type="date" value={date} onChange={(event) => updateFilter("date", event.target.value || today())} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900" />
              </div>
            </div>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {data && !isFetching && !isError && <div className="mb-4 flex gap-3 text-sm text-slate-600"><span>{meta.workCount ?? 0} work actions</span><span>{meta.total ?? 0} total log entries</span></div>}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Time", "Action", "Module", "Status"].map((column) => <th key={column} className="px-4 py-3">{column}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {message ? <tr><td colSpan={4} className={`px-4 py-10 text-center ${isError ? "text-red-600" : "text-slate-500"}`}>{message}</td></tr> : rows.map((row) => {
                      const success = row.status === "success";
                      return <tr key={row.Id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3">{formatTime(row.createdAt, meta.timezone || "Asia/Dhaka")}</td>
                        <td className="px-4 py-3 font-semibold">{humanize(row.action) || "—"}</td>
                        <td className="px-4 py-3">{moduleLabel(row)}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{success ? "Success" : "Failed"}</span></td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
