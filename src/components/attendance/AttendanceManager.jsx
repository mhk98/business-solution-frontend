import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CalendarCheck2,
  CalendarDays,
  Clock3,
  Download,
  Fingerprint,
  ListChecks,
  Pencil,
  RefreshCcw,
  Trash2,
  UserX,
  WalletCards,
} from "lucide-react";
import HrmWorkspace from "../hrm/HrmWorkspace";
import Modal from "../common/Modal";
import { useGetAllDepartmentsQuery } from "../../features/department/department";
import {
  useAddManualPunchMutation,
  useClearAttendanceOverrideMutation,
  useDeleteManualPunchMutation,
  useGetAttendanceDailyQuery,
  useGetAttendanceJobCardQuery,
  useGetAttendanceMonthlyQuery,
  useGetAttendancePunchesQuery,
  useGetLeaveBalanceQuery,
  useOverrideAttendanceDayMutation,
  useRecomputeAttendanceMutation,
} from "../../features/attendance/attendance";
import {
  OVERRIDE_STATUSES,
  Panel,
  StatusBadge,
  TableShell,
  bdToday,
  canManageAttendance,
  clockOf,
  currentMonth,
  downloadCsv,
  inputClass,
  minutesToHm,
  num,
  weekdayShort,
} from "./attendanceUi";

const TABS = [
  { key: "daily", label: "Daily", icon: CalendarCheck2 },
  { key: "monthly", label: "Monthly Summary", icon: CalendarDays },
  { key: "job-card", label: "Job Card", icon: ListChecks },
  { key: "punches", label: "Punch Log", icon: Fingerprint },
  { key: "leave", label: "Leave Balance", icon: WalletCards },
];

const DAILY_CHIPS = [
  { key: "", label: "All", count: (c) => c.total },
  { key: "Present", label: "Present", count: (c) => c.Present },
  { key: "Late", label: "Late", count: (c) => c.Late },
  { key: "Early Leave", label: "Early Leave", count: (c) => c["Early Leave"] },
  { key: "Half Day", label: "Half Day", count: (c) => c["Half Day"] },
  { key: "Absent", label: "Absent", count: (c) => c.Absent },
  { key: "Leave", label: "Leave", count: (c) => c.Leave + c["Half Leave"] },
  { key: "Weekly Off", label: "Weekly Off", count: (c) => c["Weekly Off"] },
  { key: "Holiday", label: "Holiday", count: (c) => c.Holiday },
  { key: "Pending", label: "Not in yet", count: (c) => c.Pending },
];

const useDepartmentOptions = () => {
  const { data } = useGetAllDepartmentsQuery({ page: 1, limit: 500 });
  return (data?.data || []).map((row) => ({ value: row.Id, label: row.name }));
};

const errorMessage = (error, fallback) => error?.data?.message || fallback;

// --- Correction modal (manual punch / status override) -------------------------
const DayEditModal = ({ target, onClose }) => {
  const [punchTime, setPunchTime] = useState("");
  const [punchNote, setPunchNote] = useState("");
  const [status, setStatus] = useState("Present");
  const [note, setNote] = useState("");
  const [clearLate, setClearLate] = useState(false);
  const [clearEarly, setClearEarly] = useState(false);
  const [addPunch, { isLoading: addingPunch }] = useAddManualPunchMutation();
  const [override, { isLoading: overriding }] = useOverrideAttendanceDayMutation();
  const [clearOverride, { isLoading: clearing }] = useClearAttendanceOverrideMutation();

  useEffect(() => {
    setPunchTime("");
    setPunchNote("");
    setStatus(target?.day?.status && OVERRIDE_STATUSES.includes(target.day.status) ? target.day.status : "Present");
    setNote(target?.day?.manualNote || "");
    setClearLate(false);
    setClearEarly(false);
  }, [target]);

  if (!target) return null;
  const { employee, date, day } = target;

  const submitPunch = async (e) => {
    e.preventDefault();
    if (!punchTime) return toast.error("Pick the punch time");
    try {
      await addPunch({ employeeId: employee.Id, date, time: punchTime, note: punchNote }).unwrap();
      toast.success("Punch added and the day recalculated");
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, "Failed to add punch"));
    }
  };

  const submitOverride = async (e) => {
    e.preventDefault();
    if (!note.trim()) return toast.error("Write why you are changing this day");
    try {
      await override({
        employeeId: employee.Id,
        date,
        status,
        note,
        clearLate,
        clearEarlyLeave: clearEarly,
      }).unwrap();
      toast.success("Day overridden and locked");
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, "Failed to override"));
    }
  };

  const removeOverride = async () => {
    try {
      await clearOverride({ employeeId: employee.Id, date }).unwrap();
      toast.success("Override removed — the day follows punches again");
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, "Failed to remove override"));
    }
  };

  return (
    <Modal isOpen={Boolean(target)} onClose={onClose} title={`${employee.name} — ${date}`} maxWidth="max-w-xl">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <StatusBadge day={day} />
          {day?.inTime && <span>In {clockOf(day.inTime, date)}</span>}
          {day?.outTime && <span>· Out {clockOf(day.outTime, date)}</span>}
          {day?.remarks && <span className="text-slate-400">· {day.remarks}</span>}
        </div>

        <form onSubmit={submitPunch} className="rounded-2xl border border-slate-200 p-4">
          <h4 className="text-sm font-bold text-slate-800">Add a missing punch</h4>
          <p className="mt-1 text-xs text-slate-500">
            For a forgotten in/out. The day is recalculated from all punches (device + manual).
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr_auto]">
            <input type="time" value={punchTime} onChange={(e) => setPunchTime(e.target.value)} className={inputClass} />
            <input
              value={punchNote}
              onChange={(e) => setPunchNote(e.target.value)}
              placeholder="Note (e.g. forgot to punch out)"
              className={inputClass}
            />
            <button
              type="submit"
              disabled={addingPunch}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              Add punch
            </button>
          </div>
        </form>

        <form onSubmit={submitOverride} className="rounded-2xl border border-slate-200 p-4">
          <h4 className="text-sm font-bold text-slate-800">Override the status</h4>
          <p className="mt-1 text-xs text-slate-500">
            Sets the day by hand and locks it — automatic recalculation will not change it until the override is removed.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              {OVERRIDE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (required)" className={inputClass} />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={clearLate} onChange={(e) => setClearLate(e.target.checked)} />
              Waive late
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={clearEarly} onChange={(e) => setClearEarly(e.target.checked)} />
              Waive early leave
            </label>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {Boolean(day?.isLocked) && (
              <button
                type="button"
                onClick={removeOverride}
                disabled={clearing}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Remove override
              </button>
            )}
            <button
              type="submit"
              disabled={overriding}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Save override
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

// --- Daily -------------------------------------------------------------------------------
const DailyView = ({ onEdit, onOpenJobCard }) => {
  const [date, setDate] = useState(bdToday());
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const departments = useDepartmentOptions();
  const isToday = date === bdToday();
  const { data, isFetching, refetch } = useGetAttendanceDailyQuery(
    { date, departmentId: departmentId || undefined, status: status || undefined },
    { refetchOnMountOrArgChange: true, pollingInterval: isToday ? 120000 : 0 },
  );
  const [recompute, { isLoading: recomputing }] = useRecomputeAttendanceMutation();
  const result = data?.data;
  const counts = result?.counts;
  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = result?.rows || [];
    if (!term) return list;
    return list.filter(
      ({ employee }) =>
        String(employee.name || "").toLowerCase().includes(term) || String(employee.pin || "").includes(term),
    );
  }, [result, searchTerm]);

  const runRecompute = async () => {
    try {
      const res = await recompute({ from: date, to: date }).unwrap();
      toast.success(`Recalculated ${res?.data?.rows ?? 0} day(s)`);
      refetch();
    } catch (error) {
      toast.error(errorMessage(error, "Recalculation failed"));
    }
  };

  return (
    <Panel>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={date} max={bdToday()} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
            <option value="">All departments</option>
            {departments.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name / PIN"
            className={inputClass}
          />
        </div>
        {canManageAttendance() && (
          <button
            type="button"
            onClick={runRecompute}
            disabled={recomputing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCcw size={16} className={recomputing ? "animate-spin" : ""} />
            Recalculate this day
          </button>
        )}
      </div>

      {result?.beforeTracking && (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Attendance is tracked from {result.trackFromDate}. Change it on Attendance Policy to include earlier days.
        </p>
      )}

      {counts && (
        <div className="mt-4 flex flex-wrap gap-2">
          {DAILY_CHIPS.map((chip) => (
            <button
              key={chip.key || "all"}
              type="button"
              onClick={() => setStatus(chip.key)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
                status === chip.key
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300"
              }`}
            >
              {chip.label} <span className="ml-1 font-bold">{chip.count(counts) || 0}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4">
        <TableShell
          headings={["Employee", "Department", "Shift", "In", "Out", "Worked", "Late", "Early", "OT", "Status", "Remarks", ""]}
          minWidth="min-w-[1180px]"
          empty={isFetching && !rows.length ? "Loading…" : !rows.length ? "No employees match" : null}
        >
          {rows.map(({ employee, day }) => (
            <tr key={employee.Id} className="hover:bg-slate-50/70">
              <td className="px-3 py-2.5">
                <button type="button" onClick={() => onOpenJobCard(employee.Id)} className="text-left">
                  <div className="font-semibold text-slate-900 hover:text-indigo-600">{employee.name}</div>
                  <div className="text-xs text-slate-400">PIN {employee.pin || "—"}</div>
                </button>
              </td>
              <td className="px-3 py-2.5 text-slate-600">{employee.department || "-"}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                {day?.shiftStart ? `${day.shiftStart}–${day.shiftEnd}` : "-"}
              </td>
              <td className="px-3 py-2.5 font-medium text-slate-800">{clockOf(day?.inTime, date)}</td>
              <td className="px-3 py-2.5 font-medium text-slate-800">{clockOf(day?.outTime, date)}</td>
              <td className="px-3 py-2.5 text-slate-600">{minutesToHm(day?.workedMinutes)}</td>
              <td className="px-3 py-2.5 text-amber-700">{minutesToHm(day?.lateMinutes)}</td>
              <td className="px-3 py-2.5 text-orange-700">{minutesToHm(day?.earlyLeaveMinutes)}</td>
              <td className="px-3 py-2.5 text-emerald-700">{minutesToHm(day?.overtimeMinutes)}</td>
              <td className="px-3 py-2.5">
                <StatusBadge day={day} />
              </td>
              <td className="max-w-[220px] truncate px-3 py-2.5 text-xs text-slate-500" title={day?.manualNote || day?.remarks || ""}>
                {day?.manualNote || day?.remarks || ""}
              </td>
              <td className="px-3 py-2.5 text-right">
                {canManageAttendance() && (
                  <button
                    type="button"
                    onClick={() => onEdit({ employee, date, day })}
                    className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                    title="Correct this day"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </TableShell>
      </div>
    </Panel>
  );
};

// --- Monthly ------------------------------------------------------------------------------
const MonthlyView = ({ onOpenJobCard }) => {
  const [month, setMonth] = useState(currentMonth());
  const [departmentId, setDepartmentId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const departments = useDepartmentOptions();
  const { data, isFetching } = useGetAttendanceMonthlyQuery(
    { month, departmentId: departmentId || undefined },
    { refetchOnMountOrArgChange: true },
  );
  const result = data?.data;
  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = result?.rows || [];
    return term ? list.filter(({ employee }) => String(employee.name || "").toLowerCase().includes(term)) : list;
  }, [result, searchTerm]);
  const lateRule = result?.policy?.lateDaysPerAbsent;

  const exportCsv = () => {
    downloadCsv(`attendance-${month}.csv`, [
      ["Employee", "PIN", "Department", "Working days", "Present", "Absent", "Paid leave", "Unpaid leave", "Half days", "Weekly off", "Holiday", "Late days", "Late minutes", "Early leave days", "Overtime minutes", "Missing punch", "Late deduction days", "Holiday/off-day worked (paid)", "Payable days", "Attendance %"],
      ...rows.map(({ employee, totals }) => [
        employee.name, employee.pin, employee.department, totals.workingDays, totals.present, totals.absent,
        totals.paidLeave, totals.unpaidLeave, totals.halfDays, totals.weeklyOffs, totals.holidays, totals.lateDays,
        totals.lateMinutes, totals.earlyLeaveDays, totals.overtimeMinutes, totals.missingPunch,
        totals.lateDeductionDays + totals.earlyLeaveDeductionDays, totals.extraPaidDays, totals.payableDays, totals.attendancePercent,
      ]),
    ]);
  };

  return (
    <Panel>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input type="month" value={month} max={currentMonth()} onChange={(e) => setMonth(e.target.value)} className={inputClass} />
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
            <option value="">All departments</option>
            {departments.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search name" className={inputClass} />
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!rows.length}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {lateRule ? `Every ${lateRule} late days = 1 day deducted. ` : "Late days are not deducted (Attendance Policy). "}
        Payable days are for reference only — the Payroll menu is calculated separately.
      </p>
      <div className="mt-4">
        <TableShell
          headings={["Employee", "Working", "Present", "Absent", "Leave (paid/unpaid)", "Half day", "Off (WO/H)", "Late", "Early", "OT", "Missing out", "Deduct", "Payable", "%"]}
          minWidth="min-w-[1200px]"
          empty={isFetching && !rows.length ? "Loading…" : !rows.length ? "No data for this month" : null}
        >
          {rows.map(({ employee, totals }) => (
            <tr key={employee.Id} className="hover:bg-slate-50/70">
              <td className="px-3 py-2.5">
                <button type="button" onClick={() => onOpenJobCard(employee.Id, month)} className="text-left">
                  <div className="font-semibold text-slate-900 hover:text-indigo-600">{employee.name}</div>
                  <div className="text-xs text-slate-400">{employee.department || `PIN ${employee.pin || "—"}`}</div>
                </button>
              </td>
              <td className="px-3 py-2.5">{totals.workingDays}</td>
              <td className="px-3 py-2.5 font-semibold text-emerald-700">{num(totals.present)}</td>
              <td className="px-3 py-2.5 font-semibold text-rose-700">{num(totals.absent)}</td>
              <td className="px-3 py-2.5">
                {num(totals.paidLeave)} / {num(totals.unpaidLeave)}
              </td>
              <td className="px-3 py-2.5">{totals.halfDays}</td>
              <td className="px-3 py-2.5">
                {totals.weeklyOffs} / {totals.holidays}
              </td>
              <td className="px-3 py-2.5 text-amber-700">
                {totals.lateDays} <span className="text-xs text-slate-400">({minutesToHm(totals.lateMinutes)})</span>
              </td>
              <td className="px-3 py-2.5 text-orange-700">{totals.earlyLeaveDays}</td>
              <td className="px-3 py-2.5 text-emerald-700">{minutesToHm(totals.overtimeMinutes)}</td>
              <td className="px-3 py-2.5">{totals.missingPunch}</td>
              <td className="px-3 py-2.5">{totals.lateDeductionDays + totals.earlyLeaveDeductionDays}</td>
              <td className="px-3 py-2.5 font-semibold">
                {num(totals.payableDays)}
                {totals.extraPaidDays > 0 && (
                  <span className="ml-1 text-xs font-medium text-violet-600" title="Holiday / off-day worked, paid">
                    (+{totals.extraPaidDays})
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5">{totals.attendancePercent}%</td>
            </tr>
          ))}
        </TableShell>
      </div>
    </Panel>
  );
};

// --- Job card --------------------------------------------------------------------------------
const JobCardView = ({ employeeId, month, onChange, onEdit }) => {
  const { data: monthlyData } = useGetAttendanceMonthlyQuery({ month });
  const employees = (monthlyData?.data?.rows || []).map(({ employee }) => employee);
  const { data, isFetching } = useGetAttendanceJobCardQuery(
    { employeeId, month },
    { skip: !employeeId, refetchOnMountOrArgChange: true },
  );
  const card = data?.data;
  const totals = card?.totals;

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2">
        <select value={employeeId || ""} onChange={(e) => onChange({ employeeId: e.target.value, month })} className={inputClass}>
          <option value="">Select employee</option>
          {employees.map((employee) => (
            <option key={employee.Id} value={employee.Id}>
              {employee.name} {employee.pin ? `(PIN ${employee.pin})` : ""}
            </option>
          ))}
        </select>
        <input
          type="month"
          value={month}
          max={currentMonth()}
          onChange={(e) => onChange({ employeeId, month: e.target.value })}
          className={inputClass}
        />
      </div>

      {!employeeId && <p className="mt-6 text-center text-sm text-slate-500">Choose an employee to see the month day by day.</p>}

      {card && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-600">
            <span className="text-base font-bold text-slate-900">{card.employee.name}</span>
            <span>PIN {card.employee.pin || "—"}</span>
            {card.employee.department && <span>{card.employee.department}</span>}
            {card.employee.shift && <span>Default shift: {card.employee.shift}</span>}
          </div>
          {totals && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {[
                ["Present", num(totals.present), "text-emerald-700"],
                ["Absent", num(totals.absent), "text-rose-700"],
                ["Leave", num(totals.leave), "text-sky-700"],
                ["Late days", totals.lateDays, "text-amber-700"],
                ["Early leave", totals.earlyLeaveDays, "text-orange-700"],
                ["Overtime", minutesToHm(totals.overtimeMinutes), "text-emerald-700"],
                ["Weekly off / Holiday", `${totals.weeklyOffs} / ${totals.holidays}`, "text-slate-700"],
                ["Payable days", num(totals.payableDays), "text-slate-900"],
              ].map(([label, value, tone]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className={`text-lg font-bold ${tone}`}>{value}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <TableShell
              headings={["Date", "Shift", "In", "Out", "Worked", "Late", "Early", "OT", "Status", "Punches", "Remarks", ""]}
              minWidth="min-w-[1180px]"
              empty={isFetching && !card ? "Loading…" : null}
            >
              {card.days.map(({ date, day, punches }) => (
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
                  <td className="px-3 py-2 text-emerald-700">{minutesToHm(day?.overtimeMinutes)}</td>
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
                  <td className="px-3 py-2 text-right">
                    {canManageAttendance() && date <= bdToday() && (
                      <button
                        type="button"
                        onClick={() => onEdit({ employee: card.employee, date, day })}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                        title="Correct this day"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </TableShell>
          </div>
        </>
      )}
    </Panel>
  );
};

// --- Punch log -------------------------------------------------------------------------------
const PunchLogView = () => {
  const [from, setFrom] = useState(bdToday());
  const [to, setTo] = useState(bdToday());
  const [source, setSource] = useState("");
  const [pin, setPin] = useState("");
  const { data, isFetching } = useGetAttendancePunchesQuery(
    { from, to, source: source || undefined, pin: pin.trim() || undefined },
    { refetchOnMountOrArgChange: true },
  );
  const [deletePunch] = useDeleteManualPunchMutation();
  const rows = data?.data || [];

  const remove = async (row) => {
    if (!window.confirm(`Delete the manual punch at ${row.punchClock}?`)) return;
    try {
      await deletePunch(row.Id).unwrap();
      toast.success("Manual punch deleted");
    } catch (error) {
      toast.error(errorMessage(error, "Failed to delete punch"));
    }
  };

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
        <span className="text-slate-400">to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
        <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}>
          <option value="">All sources</option>
          <option value="device">Device</option>
          <option value="manual">Manual</option>
          <option value="regularization">Correction (approved)</option>
        </select>
        <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" className={`${inputClass} w-28`} />
      </div>
      <div className="mt-4">
        <TableShell
          headings={["Date", "Time", "PIN", "Employee", "Source", "Device", "Note", ""]}
          minWidth="min-w-[900px]"
          empty={isFetching && !rows.length ? "Loading…" : !rows.length ? "No punches in this range" : null}
        >
          {rows.map((row) => (
            <tr key={row.Id} className="hover:bg-slate-50/70">
              <td className="whitespace-nowrap px-3 py-2">{row.punchDate}</td>
              <td className="px-3 py-2 font-medium">{row.punchClock}</td>
              <td className="px-3 py-2">{row.employeePin || "-"}</td>
              <td className="px-3 py-2">
                {row.employees.length ? (
                  row.employees.map((employee) => employee.name).join(", ")
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-600">
                    <UserX size={14} /> Not matched
                  </span>
                )}
              </td>
              <td className="px-3 py-2 capitalize">{row.source}</td>
              <td className="px-3 py-2 text-slate-500">{row.deviceName || row.deviceSerial || "-"}</td>
              <td className="max-w-[220px] truncate px-3 py-2 text-xs text-slate-500">{row.note || ""}</td>
              <td className="px-3 py-2 text-right">
                {row.source === "manual" && canManageAttendance() && (
                  <button type="button" onClick={() => remove(row)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 size={15} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </TableShell>
      </div>
    </Panel>
  );
};

// --- Leave balance ---------------------------------------------------------------------------
const LeaveBalanceView = () => {
  const [year, setYear] = useState(bdToday().slice(0, 4));
  const { data, isFetching, error } = useGetLeaveBalanceQuery({ year }, { refetchOnMountOrArgChange: true });
  const result = data?.data;
  const types = result?.leaveTypes || [];
  const rows = result?.rows || [];

  return (
    <Panel>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="2020"
          max="2100"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className={`${inputClass} w-28`}
        />
        <span className="text-xs text-slate-500">Used = approved leave on working days · pending shown in brackets</span>
      </div>
      {error?.status === 403 && <p className="mt-4 text-sm text-rose-600">You need Leave Management permission.</p>}
      <div className="mt-4">
        <TableShell
          headings={["Employee", ...types.map((type) => `${type.name} (${type.daysPerYear})`)]}
          minWidth="min-w-[700px]"
          empty={isFetching && !rows.length ? "Loading…" : !types.length ? "Add leave types first (Leave Types)" : !rows.length ? "No employees" : null}
        >
          {rows.map(({ employee, balances }) => (
            <tr key={employee.Id}>
              <td className="px-3 py-2.5 font-semibold text-slate-900">{employee.name}</td>
              {balances.map((balance) => (
                <td key={balance.leaveTypeId} className="px-3 py-2.5">
                  <span className={balance.remaining < 0 ? "font-bold text-rose-600" : "text-slate-800"}>
                    {num(balance.used)} used · {num(balance.remaining)} left
                  </span>
                  {balance.pending > 0 && <span className="ml-1 text-xs text-amber-600">({num(balance.pending)} pending)</span>}
                </td>
              ))}
            </tr>
          ))}
        </TableShell>
      </div>
    </Panel>
  );
};

// --- Page ---------------------------------------------------------------------------------------
const AttendanceManager = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((item) => item.key === searchParams.get("tab")) ? searchParams.get("tab") : "daily";
  const jobEmployeeId = searchParams.get("employeeId") || "";
  const jobMonth = searchParams.get("month") || currentMonth();
  const [editTarget, setEditTarget] = useState(null);

  const setTab = (key, extra = {}) => {
    const next = new URLSearchParams({ tab: key });
    Object.entries(extra).forEach(([name, value]) => value && next.set(name, value));
    setSearchParams(next);
  };
  const openJobCard = (employeeId, month = currentMonth()) => setTab("job-card", { employeeId: String(employeeId), month });

  return (
    <HrmWorkspace
      eyebrow="Attendance"
      title="Attendance"
      description="Daily status, monthly summary and per-employee job card, calculated from the device punches with shifts, weekly off, holidays and approved leave."
      stats={[]}
    >
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => (key === "job-card" ? setTab(key, { employeeId: jobEmployeeId, month: jobMonth }) : setTab(key))}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              tab === key ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => navigate("/hrm/attendance-setup")}
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-indigo-300"
        >
          <Clock3 size={16} /> Setup
        </button>
      </div>

      {tab === "daily" && <DailyView onEdit={setEditTarget} onOpenJobCard={openJobCard} />}
      {tab === "monthly" && <MonthlyView onOpenJobCard={openJobCard} />}
      {tab === "job-card" && (
        <JobCardView
          employeeId={jobEmployeeId}
          month={jobMonth}
          onChange={({ employeeId, month }) => setTab("job-card", { employeeId, month })}
          onEdit={setEditTarget}
        />
      )}
      {tab === "punches" && <PunchLogView />}
      {tab === "leave" && <LeaveBalanceView />}

      <DayEditModal target={editTarget} onClose={() => setEditTarget(null)} />
    </HrmWorkspace>
  );
};

export default AttendanceManager;
