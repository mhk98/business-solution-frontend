import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Pencil, RefreshCcw, UserCheck, UserX, Users } from "lucide-react";
import HrmWorkspace from "../hrm/HrmWorkspace";
import Modal from "../common/Modal";
import { useGetAllShiftsQuery } from "../../features/shift/shift";
import {
  useGetAttendanceSetupQuery,
  useRecomputeAttendanceMutation,
  useUpdateEmployeeAttendanceSetupMutation,
} from "../../features/attendance/attendance";
import { Panel, TableShell, bdToday, inputClass } from "./attendanceUi";

const PIN_SOURCE_LABEL = {
  attendancePin: "set here",
  employee_id: "from Employee ID",
  employeeCode: "from Employee Code",
};

const EditEmployeeModal = ({ employee, shifts, onClose }) => {
  const [form, setForm] = useState({});
  const [save, { isLoading }] = useUpdateEmployeeAttendanceSetupMutation();

  useEffect(() => {
    if (!employee) return;
    setForm({
      attendancePin: employee.attendancePin || "",
      shiftId: employee.defaultShift?.Id || "",
      joiningDate: employee.joiningDate || "",
      exitDate: employee.exitDate || "",
      attendanceExempt: employee.attendanceExempt,
    });
  }, [employee]);

  if (!employee) return null;
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await save({
        id: employee.Id,
        data: {
          attendancePin: form.attendancePin,
          shiftId: form.shiftId || null,
          joiningDate: form.joiningDate || null,
          exitDate: form.exitDate || null,
          attendanceExempt: Boolean(form.attendanceExempt),
        },
      }).unwrap();
      toast.success("Saved — this month is being recalculated");
      onClose();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to save");
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Attendance setup — ${employee.name}`} maxWidth="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">Device PIN (User ID on the machine)</span>
          <input
            value={form.attendancePin || ""}
            onChange={(e) => set("attendancePin", e.target.value)}
            placeholder={employee.pin ? `Empty = ${employee.pin} (${PIN_SOURCE_LABEL[employee.pinSource] || ""})` : "e.g. 2158"}
            className={`${inputClass} w-full`}
          />
          <span className="mt-1 block text-xs text-slate-500">
            Leave empty to keep using the Employee ID. Must match the User ID the employee was enrolled with on the device.
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">Default shift</span>
          <select value={form.shiftId || ""} onChange={(e) => set("shiftId", e.target.value)} className={`${inputClass} w-full`}>
            <option value="">— Policy default —</option>
            {shifts.map((shift) => (
              <option key={shift.Id} value={shift.Id}>
                {shift.name} ({shift.startTime}–{shift.endTime})
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-slate-500">
            A dated Shift Assignment overrides this for its period.
          </span>
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Joining date</span>
            <input type="date" value={form.joiningDate || ""} onChange={(e) => set("joiningDate", e.target.value)} className={`${inputClass} w-full`} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Last working day (exit)</span>
            <input type="date" value={form.exitDate || ""} onChange={(e) => set("exitDate", e.target.value)} className={`${inputClass} w-full`} />
          </label>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
          <input type="checkbox" checked={Boolean(form.attendanceExempt)} onChange={(e) => set("attendanceExempt", e.target.checked)} />
          <span className="text-sm text-slate-700">Exempt from attendance (no punch required — e.g. owner, field staff)</span>
        </label>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
};

const AttendanceSetupManager = () => {
  const { data, isFetching, error } = useGetAttendanceSetupQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: shiftsRes } = useGetAllShiftsQuery({ page: 1, limit: 200 });
  const [save] = useUpdateEmployeeAttendanceSetupMutation();
  const [recompute, { isLoading: recomputing }] = useRecomputeAttendanceMutation();
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("");
  const [assignPin, setAssignPin] = useState({});
  const [range, setRange] = useState({ from: `${bdToday().slice(0, 7)}-01`, to: bdToday() });

  const setup = data?.data;
  const shifts = (shiftsRes?.data || []).filter((shift) => shift.status !== "Inactive");
  const employees = setup?.employees || [];
  const unmatched = setup?.unmatchedPins || [];

  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return employees.filter((row) => {
      if (filter === "conflict" && !row.pinConflict) return false;
      if (filter === "noShift" && (!row.tracked || row.currentShift || row.defaultShift)) return false;
      if (filter === "notOnDevice" && (!row.tracked || row.onDevice)) return false;
      if (filter === "untracked" && row.tracked) return false;
      if (!term) return true;
      return String(row.name || "").toLowerCase().includes(term) || String(row.pin || "").includes(term);
    });
  }, [employees, filter, searchTerm]);

  const tracked = employees.filter((row) => row.tracked);
  const stats = [
    { name: "Tracked employees", value: tracked.length, icon: Users, iconBg: "#EEF2FF", iconColor: "#4338CA" },
    { name: "Unmatched device PINs", value: unmatched.length, icon: UserX, iconBg: "#FFF1F2", iconColor: "#BE123C" },
    { name: "PIN conflicts", value: employees.filter((row) => row.pinConflict).length, icon: AlertTriangle, iconBg: "#FFFBEB", iconColor: "#B45309" },
    {
      name: "No shift",
      value: tracked.filter((row) => !row.currentShift && !row.defaultShift).length,
      icon: UserCheck,
      iconBg: "#ECFDF5",
      iconColor: "#047857",
    },
  ];

  const linkPin = async (pin) => {
    const employeeId = assignPin[pin];
    if (!employeeId) return toast.error("Choose the employee for this PIN");
    try {
      await save({ id: employeeId, data: { attendancePin: pin } }).unwrap();
      toast.success(`PIN ${pin} linked`);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to link PIN");
    }
  };

  const runRecompute = async () => {
    if (!range.from || !range.to || range.from > range.to) return toast.error("Pick a valid date range");
    try {
      const res = await recompute(range).unwrap();
      toast.success(`Recalculated ${res?.data?.rows ?? 0} employee-day(s)`);
    } catch (err) {
      toast.error(err?.data?.message || "Recalculation failed");
    }
  };

  return (
    <HrmWorkspace
      eyebrow="Attendance"
      title="Attendance Setup"
      description="Link each employee to the PIN they punch with on the device, set joining/exit dates and who is exempt. Everything here feeds the daily calculation."
      stats={stats}
    >
      {error?.status === 403 && (
        <Panel>
          <p className="text-sm text-rose-600">Only Super Admin / Admin / HR can change attendance setup.</p>
        </Panel>
      )}

      {unmatched.length > 0 && (
        <Panel>
          <h3 className="text-base font-bold text-slate-900">Device PINs not linked to any employee</h3>
          <p className="mt-1 text-sm text-slate-500">
            These punches are not counted for anyone. Link each PIN to its employee — past punches are picked up automatically.
          </p>
          <div className="mt-4">
            <TableShell headings={["PIN", "Name on device", "Punches (60 days)", "Last punch", "Link to employee"]} minWidth="min-w-[760px]">
              {unmatched.map((row) => (
                <tr key={row.pin}>
                  <td className="px-3 py-2.5 font-semibold">{row.pin}</td>
                  <td className="px-3 py-2.5">{row.deviceName || "-"}</td>
                  <td className="px-3 py-2.5">{row.punches}</td>
                  <td className="px-3 py-2.5">{row.lastPunchDate || "-"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-2">
                      <select
                        value={assignPin[row.pin] || ""}
                        onChange={(e) => setAssignPin((prev) => ({ ...prev, [row.pin]: e.target.value }))}
                        className={inputClass}
                      >
                        <option value="">Select employee</option>
                        {tracked.map((employee) => (
                          <option key={employee.Id} value={employee.Id}>
                            {employee.name} (now {employee.pin || "no PIN"})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => linkPin(row.pin)}
                        className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        Link
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </TableShell>
          </div>
        </Panel>
      )}

      <Panel>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search name / PIN" className={inputClass} />
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className={inputClass}>
              <option value="">All employees</option>
              <option value="conflict">PIN conflict</option>
              <option value="noShift">No shift</option>
              <option value="notOnDevice">Not enrolled on device</option>
              <option value="untracked">Not tracked (inactive / exempt)</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={range.from} onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))} className={inputClass} />
            <span className="text-slate-400">to</span>
            <input type="date" value={range.to} max={bdToday()} onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))} className={inputClass} />
            <button
              type="button"
              onClick={runRecompute}
              disabled={recomputing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCcw size={16} className={recomputing ? "animate-spin" : ""} /> Recalculate
            </button>
          </div>
        </div>
        {setup?.policy?.trackFromDate && (
          <p className="mt-3 text-xs text-slate-500">Attendance is calculated from {setup.policy.trackFromDate} (Attendance Policy).</p>
        )}

        <div className="mt-4">
          <TableShell
            headings={["Employee", "PIN", "On device", "Last punch", "Shift", "Joining", "Exit", "Tracked", ""]}
            minWidth="min-w-[1040px]"
            empty={isFetching && !rows.length ? "Loading…" : !rows.length ? "No employees" : null}
          >
            {rows.map((row) => (
              <tr key={row.Id} className={row.tracked ? "" : "bg-slate-50/70 text-slate-400"}>
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-slate-900">{row.name}</div>
                  <div className="text-xs text-slate-400">{row.department || row.status}</div>
                </td>
                <td className="px-3 py-2.5">
                  <span className={row.pinConflict ? "font-bold text-amber-700" : "font-medium"}>{row.pin || "—"}</span>
                  <div className="text-xs text-slate-400">
                    {row.pinConflict ? "Shared with another employee" : PIN_SOURCE_LABEL[row.pinSource] || "no PIN"}
                  </div>
                </td>
                <td className="px-3 py-2.5">{row.onDevice ? "Yes" : <span className="text-slate-400">No</span>}</td>
                <td className="px-3 py-2.5">{row.lastPunchDate || "-"}</td>
                <td className="px-3 py-2.5">
                  {row.currentShift ? (
                    <>
                      {row.currentShift.name}
                      <div className="text-xs text-slate-400">since {row.currentShift.from}</div>
                    </>
                  ) : row.defaultShift ? (
                    row.defaultShift.name
                  ) : (
                    <span className="text-slate-400">Policy default</span>
                  )}
                </td>
                <td className="px-3 py-2.5">{row.joiningDate || "-"}</td>
                <td className="px-3 py-2.5">{row.exitDate || "-"}</td>
                <td className="px-3 py-2.5">{row.attendanceExempt ? "Exempt" : row.tracked ? "Yes" : row.status}</td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => setEditing(row)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                    title="Edit attendance setup"
                  >
                    <Pencil size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </TableShell>
        </div>
      </Panel>

      {editing && <EditEmployeeModal employee={editing} shifts={shifts} onClose={() => setEditing(null)} />}
    </HrmWorkspace>
  );
};

export default AttendanceSetupManager;
