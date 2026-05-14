import { useMemo, useState } from "react";
import { CalendarRange, ClipboardCheck, Search } from "lucide-react";
import HrmWorkspace from "./HrmWorkspace";
import { useGetAllAttendanceSummariesQuery } from "../../features/attendanceSummary/attendanceSummary";
import useDebounce from "../../hooks/useDebounce";


const AttendanceSummaryManager = () => {
  const today = new Date().toISOString().slice(0, 10);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const queryArgs = useMemo(
    () => ({
      page: 1,
      limit: 200,
      searchTerm: debouncedSearchTerm || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [searchTerm, from, to],
  );

  const { data, isLoading } = useGetAllAttendanceSummariesQuery(queryArgs);
  const rows = data?.data || [];
  const statusCounts = data?.meta?.statusCounts || {};

  const stats = [
    {
      name: "Summary Rows",
      value: rows.length,
      icon: ClipboardCheck,
      iconBg: "#EEF2FF",
      iconColor: "#4338CA",
    },
    {
      name: "Present",
      value: statusCounts.Present || statusCounts["Holiday Worked"] || 0,
      icon: CalendarRange,
      iconBg: "#ECFDF5",
      iconColor: "#047857",
    },
  ];

  return (
    <HrmWorkspace
      eyebrow="Phase 2"
      title="Daily Attendance Summaries"
      description="Review processed attendance results after machine logs are paired and shift rules are applied."
      stats={stats}
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Daily Results</h3>
            <p className="mt-1 text-sm text-slate-500">
              Filter by date range and employee to inspect processed late,
              overtime and attendance status.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <label className="relative block w-full sm:w-56">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search employee"
                className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-black outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-black outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 sm:w-auto"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-black outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 sm:w-auto"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[860px] divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Employee
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Shift
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Time Window
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Late / Early
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Worked / OT
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((row) => (
                  <tr key={row.Id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {row.employee?.name || "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row.employee?.employeeCode ||
                          row.employee?.employee_id ||
                          "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.attendanceDate}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.shift?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>
                        {row.firstIn
                          ? new Date(row.firstIn).toLocaleTimeString()
                          : "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row.lastOut
                          ? new Date(row.lastOut).toLocaleTimeString()
                          : "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>Late: {row.lateMinutes || 0}m</div>
                      <div className="text-xs text-slate-500">
                        Early: {row.earlyLeaveMinutes || 0}m
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{row.workedMinutes || 0}m</div>
                      <div className="text-xs text-slate-500">
                        OT: {row.overtimeMinutes || 0}m
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                        {row.attendanceStatus}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12">
                    <div className="mx-auto max-w-md rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
                      <div className="text-base font-semibold text-slate-800">
                        No summaries found
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        Process a day of attendance logs first to generate daily
                        summaries.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </HrmWorkspace>
  );
};

export default AttendanceSummaryManager;
