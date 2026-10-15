import { StatusBadge, TableShell, bdToday, clockOf, minutesToHm, num, weekdayShort } from "./attendanceUi";

// Read-only month view of one person (My Attendance / My Team Attendance):
// summary tiles + day-by-day table. `action(date, day)` renders the last cell.
export const JobCardTotals = ({ totals }) =>
  totals ? (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
      {[
        ["Present", num(totals.present), "text-emerald-700"],
        ["Absent", num(totals.absent), "text-rose-700"],
        ["Leave", num(totals.leave), "text-sky-700"],
        ["Late days", totals.lateDays, "text-amber-700"],
        ["Early leave", totals.earlyLeaveDays, "text-orange-700"],
        ["Missing out", totals.missingPunch, "text-rose-700"],
        ["Weekly off / Holiday", `${totals.weeklyOffs} / ${totals.holidays}`, "text-slate-700"],
        ["Payable days", num(totals.payableDays), "text-slate-900"],
      ].map(([label, value, tone]) => (
        <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-xs text-slate-500">{label}</div>
          <div className={`text-lg font-bold ${tone}`}>{value}</div>
        </div>
      ))}
    </div>
  ) : null;

const JobCardTable = ({ card, loading, action }) => (
  <TableShell
    headings={["Date", "Shift", "In", "Out", "Worked", "Late", "Early", "Status", "Punches", "Remarks", ...(action ? [""] : [])]}
    minWidth="min-w-[1080px]"
    empty={loading && !card ? "Loading…" : !card ? "No data" : null}
  >
    {card?.days.map(({ date, day, punches }) => (
      <tr key={date} className={day?.status === "Weekly Off" || day?.status === "Holiday" ? "bg-slate-50/70" : ""}>
        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">
          {date.slice(8)} <span className="text-xs text-slate-400">{weekdayShort(date)}</span>
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-slate-600">{day?.shiftStart ? `${day.shiftStart}–${day.shiftEnd}` : "-"}</td>
        <td className="px-3 py-2">{clockOf(day?.inTime, date)}</td>
        <td className="px-3 py-2">{clockOf(day?.outTime, date)}</td>
        <td className="px-3 py-2 text-slate-600">{minutesToHm(day?.workedMinutes)}</td>
        <td className="px-3 py-2 text-amber-700">{minutesToHm(day?.lateMinutes)}</td>
        <td className="px-3 py-2 text-orange-700">{minutesToHm(day?.earlyLeaveMinutes)}</td>
        <td className="px-3 py-2">{day || date <= bdToday() ? <StatusBadge day={day} /> : null}</td>
        <td className="px-3 py-2">
          <div className="flex flex-wrap gap-1">
            {punches.map((punch) => (
              <span
                key={punch.Id}
                title={punch.note || punch.source}
                className={`rounded px-1.5 py-0.5 text-xs ${
                  punch.source === "device" ? "bg-slate-100 text-slate-700" : "bg-indigo-50 text-indigo-700"
                }`}
              >
                {punch.clock.slice(0, 5)}
              </span>
            ))}
          </div>
        </td>
        <td className="max-w-[200px] truncate px-3 py-2 text-xs text-slate-500" title={day?.manualNote || day?.remarks || ""}>
          {day?.manualNote || day?.remarks || ""}
        </td>
        {action && <td className="whitespace-nowrap px-3 py-2 text-right">{action(date, day)}</td>}
      </tr>
    ))}
  </TableShell>
);

export default JobCardTable;
