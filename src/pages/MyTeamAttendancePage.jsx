import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Header from "../components/common/Header";
import { Panel, StatusBadge, TableShell, bdToday, clockOf, currentMonth, inputClass, minutesToHm, num } from "../components/attendance/attendanceUi";
import JobCardTable, { JobCardTotals } from "../components/attendance/JobCardTable";
import { useGetMyTeamAttendanceQuery, useGetTeamJobCardQuery } from "../features/attendance/attendance";

const COUNT_TILES = [
  ["Present", "text-emerald-700"],
  ["Late", "text-amber-700"],
  ["Absent", "text-rose-700"],
  ["Leave", "text-sky-700"],
  ["No Record", "text-slate-500"],
];

// One team member's month, opened from the team lists.
const MemberJobCard = ({ member, month, onBack }) => {
  const [selectedMonth, setSelectedMonth] = useState(month);
  const { data, isFetching, error } = useGetTeamJobCardQuery(
    { employeeId: member.Id, month: selectedMonth },
    { refetchOnMountOrArgChange: true },
  );
  const card = data?.data;
  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={16} /> Team
        </button>
        <div>
          <div className="text-lg font-bold text-slate-900">{member.name}</div>
          <div className="text-xs text-slate-500">{[member.department, card?.employee?.shift && `Shift: ${card.employee.shift}`].filter(Boolean).join(" · ")}</div>
        </div>
        <input
          type="month"
          value={selectedMonth}
          max={currentMonth()}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className={`${inputClass} ml-auto`}
        />
      </div>
      {error && <p className="mt-4 text-sm text-rose-600">{error?.data?.message || "Failed to load"}</p>}
      <div className="mt-4">
        <JobCardTotals totals={card?.totals} />
      </div>
      <div className="mt-4">
        <JobCardTable card={card} loading={isFetching} />
      </div>
    </Panel>
  );
};

// Team leaders: today and this month for the departments they lead. View only
// — corrections go through HR.
const MyTeamAttendancePage = () => {
  const [date, setDate] = useState(bdToday());
  const [month, setMonth] = useState(currentMonth());
  const [member, setMember] = useState(null);
  const { data, isFetching, error } = useGetMyTeamAttendanceQuery({ date, month }, { refetchOnMountOrArgChange: true });
  const departments = data?.data?.departments || [];

  return (
    <div className="flex-1 relative z-10">
      <Header title="My Team Attendance" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)] space-y-4">
        {member ? (
          <MemberJobCard member={member} month={month} onBack={() => setMember(null)} />
        ) : (
          <>
            {error && (
              <Panel>
                <p className="text-sm text-rose-600">{error?.data?.message || "Failed to load your team"}</p>
              </Panel>
            )}
            {departments.map((department) => (
              <div key={department.Id} className="space-y-4">
                <Panel>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{department.name}</h2>
                      <p className="text-sm text-slate-500">{department.counts?.total || 0} people · click a name for the full month</p>
                    </div>
                    <input type="date" value={date} max={bdToday()} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {COUNT_TILES.map(([label, tone]) => (
                      <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-xs text-slate-500">{label}</div>
                        <div className={`text-lg font-bold ${tone}`}>
                          {label === "Leave"
                            ? (department.counts?.Leave || 0) + (department.counts?.["Half Leave"] || 0)
                            : department.counts?.[label] || 0}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <TableShell
                      headings={["Employee", "Shift", "In", "Out", "Worked", "Late", "Status"]}
                      minWidth="min-w-[760px]"
                      empty={isFetching && !department.today?.length ? "Loading…" : !department.today?.length ? "No one in this department" : null}
                    >
                      {(department.today || []).map(({ employee, day }) => (
                        <tr key={employee.Id} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => setMember({ ...employee, department: department.name })}
                              className="text-left font-semibold text-slate-900 hover:text-indigo-600"
                            >
                              {employee.name}
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{day?.shiftStart ? `${day.shiftStart}–${day.shiftEnd}` : "-"}</td>
                          <td className="px-3 py-2.5">{clockOf(day?.inTime, date)}</td>
                          <td className="px-3 py-2.5">{clockOf(day?.outTime, date)}</td>
                          <td className="px-3 py-2.5 text-slate-600">{minutesToHm(day?.workedMinutes)}</td>
                          <td className="px-3 py-2.5 text-amber-700">{minutesToHm(day?.lateMinutes)}</td>
                          <td className="px-3 py-2.5">
                            <StatusBadge day={day} />
                          </td>
                        </tr>
                      ))}
                    </TableShell>
                  </div>
                </Panel>

                <Panel>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-900">{department.name} — month summary</h3>
                    <input type="month" value={month} max={currentMonth()} onChange={(e) => setMonth(e.target.value)} className={inputClass} />
                  </div>
                  <div className="mt-4">
                    <TableShell
                      headings={["Employee", "Working", "Present", "Absent", "Leave", "Half day", "Late", "Early", "Missing out", "Payable", "%"]}
                      minWidth="min-w-[960px]"
                      empty={!department.monthly?.length ? "No data for this month" : null}
                    >
                      {(department.monthly || []).map(({ employee, totals }) => (
                        <tr key={employee.Id} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => setMember({ ...employee, department: department.name })}
                              className="text-left font-semibold text-slate-900 hover:text-indigo-600"
                            >
                              {employee.name}
                            </button>
                          </td>
                          <td className="px-3 py-2.5">{totals.workingDays}</td>
                          <td className="px-3 py-2.5 font-semibold text-emerald-700">{num(totals.present)}</td>
                          <td className="px-3 py-2.5 font-semibold text-rose-700">{num(totals.absent)}</td>
                          <td className="px-3 py-2.5">{num(totals.leave)}</td>
                          <td className="px-3 py-2.5">{totals.halfDays}</td>
                          <td className="px-3 py-2.5 text-amber-700">{totals.lateDays}</td>
                          <td className="px-3 py-2.5 text-orange-700">{totals.earlyLeaveDays}</td>
                          <td className="px-3 py-2.5">{totals.missingPunch}</td>
                          <td className="px-3 py-2.5 font-semibold">{num(totals.payableDays)}</td>
                          <td className="px-3 py-2.5">{totals.attendancePercent}%</td>
                        </tr>
                      ))}
                    </TableShell>
                  </div>
                </Panel>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
};

export default MyTeamAttendancePage;
