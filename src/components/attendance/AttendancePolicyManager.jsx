import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import HrmWorkspace from "../hrm/HrmWorkspace";
import {
  useGetAttendancePolicyQuery,
  useSaveAttendancePolicyMutation,
} from "../../features/attendance/attendance";
import { Panel, canManageAttendance, inputClass } from "./attendanceUi";

const WEEKDAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const Field = ({ label, help, children }) => (
  <div>
    <div className="mb-1.5 text-sm font-semibold text-slate-700">{label}</div>
    {children}
    {help && <p className="mt-1 text-xs leading-5 text-slate-500">{help}</p>}
  </div>
);

const Toggle = ({ checked, onChange, label, help }) => (
  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
    <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5" />
    <span>
      <span className="block text-sm font-semibold text-slate-800">{label}</span>
      {help && <span className="mt-0.5 block text-xs leading-5 text-slate-500">{help}</span>}
    </span>
  </label>
);

const AttendancePolicyManager = () => {
  const { data, isLoading } = useGetAttendancePolicyQuery(undefined, { refetchOnMountOrArgChange: true });
  const [savePolicy, { isLoading: saving }] = useSaveAttendancePolicyMutation();
  const [form, setForm] = useState(null);
  const shifts = data?.data?.shifts || [];
  const canEdit = canManageAttendance();

  useEffect(() => {
    const policy = data?.data?.policy;
    if (!policy) return;
    let weeklyOff = policy.defaultWeeklyOffDays || [];
    if (typeof weeklyOff === "string") {
      try {
        weeklyOff = JSON.parse(weeklyOff);
      } catch {
        weeklyOff = [];
      }
    }
    setForm({ ...policy, defaultWeeklyOffDays: weeklyOff, defaultShiftId: policy.defaultShiftId || "" });
  }, [data]);

  if (isLoading || !form) {
    return (
      <HrmWorkspace eyebrow="Attendance" title="Attendance Policy" description="Loading…" stats={[]}>
        <Panel>Loading…</Panel>
      </HrmWorkspace>
    );
  }

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleDay = (day) =>
    set(
      "defaultWeeklyOffDays",
      form.defaultWeeklyOffDays.includes(day)
        ? form.defaultWeeklyOffDays.filter((item) => item !== day)
        : [...form.defaultWeeklyOffDays, day],
    );

  const submit = async (e) => {
    e.preventDefault();
    try {
      await savePolicy({
        trackFromDate: form.trackFromDate,
        defaultShiftId: form.defaultShiftId || null,
        defaultWeeklyOffDays: form.defaultWeeklyOffDays,
        duplicatePunchMinutes: form.duplicatePunchMinutes,
        singlePunchAs: form.singlePunchAs,
        lateDaysPerAbsent: form.lateDaysPerAbsent,
        earlyLeaveDaysPerAbsent: form.earlyLeaveDaysPerAbsent,
        overtimeEnabled: form.overtimeEnabled,
        offDayWorkAsOvertime: form.offDayWorkAsOvertime,
        sandwichRule: form.sandwichRule,
        holidayWorkPaid: form.holidayWorkPaid,
        weeklyOffWorkPaid: form.weeklyOffWorkPaid,
        recomputeDays: form.recomputeDays,
      }).unwrap();
      toast.success("Policy saved — this month is being recalculated");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to save policy");
    }
  };

  return (
    <HrmWorkspace
      eyebrow="Attendance"
      title="Attendance Policy"
      description="Company-wide rules the daily calculation follows. Shift timing, grace and weekly off live on each Shift; these rules apply to everyone."
      stats={[]}
    >
      <form onSubmit={submit} className="space-y-6">
        <Panel>
          <h3 className="text-base font-bold text-slate-900">Basics</h3>
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Track attendance from" help="Days before this are never calculated (the date the device went live). Moving it later removes earlier calculated days.">
              <input type="date" value={form.trackFromDate || ""} onChange={(e) => set("trackFromDate", e.target.value)} className={`${inputClass} w-full`} disabled={!canEdit} />
            </Field>
            <Field label="Default shift" help="Used for employees who have no shift of their own.">
              <select value={form.defaultShiftId} onChange={(e) => set("defaultShiftId", e.target.value)} className={`${inputClass} w-full`} disabled={!canEdit}>
                <option value="">None</option>
                {shifts.map((shift) => (
                  <option key={shift.Id} value={shift.Id}>
                    {shift.name} ({shift.startTime}–{shift.endTime})
                  </option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Weekly off when an employee has no shift at all">
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => toggleDay(day)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                        form.defaultWeeklyOffDays.includes(day)
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>
        </Panel>

        <Panel>
          <h3 className="text-base font-bold text-slate-900">Punch rules</h3>
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Ignore repeat punches within (minutes)" help="Two taps closer than this count as one punch.">
              <input type="number" min="0" value={form.duplicatePunchMinutes} onChange={(e) => set("duplicatePunchMinutes", e.target.value)} className={`${inputClass} w-full`} disabled={!canEdit} />
            </Field>
            <Field label="Only one punch on a finished working day counts as" help="Someone punched in but never out. They can fix it with an Attendance Correction.">
              <select value={form.singlePunchAs} onChange={(e) => set("singlePunchAs", e.target.value)} className={`${inputClass} w-full`} disabled={!canEdit}>
                <option value="Present">Present (flagged “Missing out”)</option>
                <option value="Half Day">Half Day</option>
                <option value="Absent">Absent</option>
              </select>
            </Field>
          </div>
        </Panel>

        <Panel>
          <h3 className="text-base font-bold text-slate-900">Late &amp; early leave</h3>
          <p className="mt-1 text-xs text-slate-500">
            Late = first punch after shift start + grace (minutes counted from shift start). Early leave = last punch before shift end − grace.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Late days that make 1 day deduction" help="0 = no deduction. Shown in the monthly summary only; Payroll is not changed.">
              <input type="number" min="0" value={form.lateDaysPerAbsent} onChange={(e) => set("lateDaysPerAbsent", e.target.value)} className={`${inputClass} w-full`} disabled={!canEdit} />
            </Field>
            <Field label="Early-leave days that make 1 day deduction" help="0 = no deduction.">
              <input type="number" min="0" value={form.earlyLeaveDaysPerAbsent} onChange={(e) => set("earlyLeaveDaysPerAbsent", e.target.value)} className={`${inputClass} w-full`} disabled={!canEdit} />
            </Field>
          </div>
        </Panel>

        <Panel>
          <h3 className="text-base font-bold text-slate-900">Overtime &amp; off days</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Toggle
              checked={form.overtimeEnabled}
              onChange={(value) => set("overtimeEnabled", value)}
              label="Count overtime"
              help="Time after shift end (the shift's “OT starts after” and “minimum OT” apply)."
            />
            <Toggle
              checked={form.offDayWorkAsOvertime}
              onChange={(value) => set("offDayWorkAsOvertime", value)}
              label="Work on a holiday / weekly off is overtime"
              help="The whole worked time on an off day counts as overtime."
            />
            <Toggle
              checked={form.holidayWorkPaid}
              onChange={(value) => set("holidayWorkPaid", value)}
              label="Working on a holiday earns that day's salary"
              help="Each holiday worked adds 1 payable day in the monthly summary."
            />
            <Toggle
              checked={form.weeklyOffWorkPaid}
              onChange={(value) => set("weeklyOffWorkPaid", value)}
              label="Working on a weekly off earns that day's salary"
              help="Each weekly off worked adds 1 payable day in the monthly summary."
            />
            <Toggle
              checked={form.sandwichRule}
              onChange={(value) => set("sandwichRule", value)}
              label="Sandwich rule"
              help="A weekly off or holiday between two absent working days becomes absent too."
            />
            <Field label="Re-check the last N days every 6 hours" help="Catches late leave approvals or corrections. 1–62.">
              <input type="number" min="1" max="62" value={form.recomputeDays} onChange={(e) => set("recomputeDays", e.target.value)} className={`${inputClass} w-full`} disabled={!canEdit} />
            </Field>
          </div>
        </Panel>

        {canEdit && (
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              Save policy
            </button>
          </div>
        )}
      </form>
    </HrmWorkspace>
  );
};

export default AttendancePolicyManager;
