import { useState } from "react";
import toast from "react-hot-toast";
import { Pencil, X } from "lucide-react";
import Header from "../components/common/Header";
import Modal from "../components/common/Modal";
import { Panel, StatusBadge, TableShell, clockOf, currentMonth, inputClass } from "../components/attendance/attendanceUi";
import JobCardTable, { JobCardTotals } from "../components/attendance/JobCardTable";
import {
  useApplyMyCorrectionMutation,
  useCancelMyCorrectionMutation,
  useGetMyAttendanceQuery,
} from "../features/attendance/attendance";

const fullName = (user) => (user ? [user.FirstName, user.LastName].filter(Boolean).join(" ") || user.Email : "");

const CORRECTION_STATUS = {
  Pending: { label: "Waiting HR", style: "bg-amber-50 text-amber-700 border-amber-200" },
  Approved: { label: "Approved", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Rejected: { label: "Rejected", style: "bg-rose-50 text-rose-700 border-rose-200" },
  Cancelled: { label: "Cancelled", style: "bg-slate-100 text-slate-500 border-slate-200" },
};

// "2026-10-05T03:00:00.000Z" → "09:00" (Bangladesh time).
const bdClock = (value) =>
  value
    ? new Date(value).toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hour12: false })
    : "";

// Self service: every logged-in user sees their own attendance and asks HR to
// correct a day of the current month. No permission needed.
const MyAttendancePage = () => {
  const [month, setMonth] = useState(currentMonth());
  const { data, isFetching } = useGetMyAttendanceQuery({ month }, { refetchOnMountOrArgChange: true });
  const [apply, { isLoading: isApplying }] = useApplyMyCorrectionMutation();
  const [cancel, { isLoading: isCancelling }] = useCancelMyCorrectionMutation();
  const [form, setForm] = useState(null);
  const card = data?.data;
  const correctionWindow = card?.correctionWindow;
  const pendingDates = new Set((card?.corrections || []).filter((c) => c.approvalStatus === "Pending").map((c) => c.attendanceDate));
  const todayRow = card?.days?.find((row) => row.date === card.today);
  const canCorrect = (date) =>
    correctionWindow && date >= correctionWindow.from && date <= correctionWindow.to && !pendingDates.has(date);

  const openCorrection = (date, day) =>
    setForm({
      date,
      requestType: day?.inTime && !day?.outTime ? "Missing Punch" : "Manual In/Out",
      inTime: clockOf(day?.inTime, date).replace(/[^0-9:]/g, "").slice(0, 5) || "",
      outTime: clockOf(day?.outTime, date).replace(/[^0-9:]/g, "").slice(0, 5) || "",
      reason: "",
    });

  const submit = async (event) => {
    event.preventDefault();
    if (!form.inTime && !form.outTime) return toast.error("Give the correct in time, out time or both");
    if (!form.reason.trim()) return toast.error("Write the reason");
    try {
      await apply(form).unwrap();
      toast.success("Correction request sent to HR");
      setForm(null);
    } catch (error) {
      toast.error(error?.data?.message || "Failed to send the correction request");
    }
  };

  const withdraw = async (row) => {
    if (!window.confirm("Cancel this correction request?")) return;
    try {
      await cancel(row.Id).unwrap();
      toast.success("Correction request cancelled");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to cancel");
    }
  };

  return (
    <div className="flex-1 relative z-10">
      <Header title="My Attendance" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)] space-y-4">
        {card?.exempt && (
          <Panel>
            <p className="text-sm text-slate-600">Attendance tracking does not apply to you (exempt). Contact HR if this is wrong.</p>
          </Panel>
        )}

        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{card?.employee?.name || "My Attendance"}</h2>
              <p className="text-sm text-slate-500">
                {[card?.employee?.department, card?.employee?.shift && `Shift: ${card.employee.shift}`, card?.employee?.pin && `PIN ${card.employee.pin}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {todayRow && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  Today:
                  <StatusBadge day={todayRow.day} />
                  {todayRow.day?.inTime && <span>In {clockOf(todayRow.day.inTime, todayRow.date)}</span>}
                </div>
              )}
              <input type="month" value={month} max={currentMonth()} onChange={(e) => setMonth(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="mt-4">
            <JobCardTotals totals={card?.totals} />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Wrong or missing punch? Use the <Pencil size={12} className="inline" /> button on that day — HR approves it. Only days of
            the current month can be corrected.
          </p>
          <div className="mt-4">
            <JobCardTable
              card={card}
              loading={isFetching}
              action={(date, day) =>
                canCorrect(date) ? (
                  <button
                    type="button"
                    onClick={() => openCorrection(date, day)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                    title="Ask HR to correct this day"
                  >
                    <Pencil size={14} /> Correct
                  </button>
                ) : pendingDates.has(date) ? (
                  <span className="text-xs font-medium text-amber-700">Waiting HR</span>
                ) : null
              }
            />
          </div>
        </Panel>

        <Panel>
          <h2 className="mb-4 text-lg font-bold text-slate-900">My correction requests</h2>
          <TableShell
            headings={["Date", "Type", "In", "Out", "Reason", "HR", "Status", "Note", ""]}
            minWidth="min-w-[900px]"
            empty={!card?.corrections?.length ? "No correction request yet" : null}
          >
            {(card?.corrections || []).map((row) => {
              const status = CORRECTION_STATUS[row.approvalStatus] || { label: row.approvalStatus, style: "" };
              return (
                <tr key={row.Id}>
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-slate-900">{row.attendanceDate}</td>
                  <td className="px-3 py-2.5">{row.requestType}</td>
                  <td className="px-3 py-2.5">{bdClock(row.requestedIn) || "-"}</td>
                  <td className="px-3 py-2.5">{bdClock(row.requestedOut) || "-"}</td>
                  <td className="max-w-[240px] px-3 py-2.5 text-slate-600">{row.reason}</td>
                  <td className="px-3 py-2.5">{fullName(row.approvedBy) || "-"}</td>
                  <td className="px-3 py-2.5">
                    <span className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.style}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="max-w-[200px] px-3 py-2.5 text-xs text-slate-500">{row.note || ""}</td>
                  <td className="px-3 py-2.5 text-right">
                    {row.approvalStatus === "Pending" && (
                      <button
                        type="button"
                        disabled={isCancelling}
                        onClick={() => withdraw(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                      >
                        <X size={15} /> Cancel
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </TableShell>
        </Panel>
      </main>

      <Modal isOpen={Boolean(form)} onClose={() => setForm(null)} title={`Correct ${form?.date || ""}`} maxWidth="max-w-lg">
        {form && (
          <form onSubmit={submit} className="space-y-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Problem
              <select value={form.requestType} onChange={(e) => setForm({ ...form, requestType: e.target.value })} className={inputClass}>
                {(card?.requestTypes || ["Missing Punch", "Manual In/Out", "Wrong Device Punch"]).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Correct in time
                <input type="time" value={form.inTime} onChange={(e) => setForm({ ...form, inTime: e.target.value })} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Correct out time
                <input type="time" value={form.outTime} onChange={(e) => setForm({ ...form, outTime: e.target.value })} className={inputClass} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Reason
              <textarea
                rows={3}
                maxLength={255}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className={inputClass}
                placeholder="e.g. Forgot to punch out, device was off…"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isApplying}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {isApplying ? "Sending…" : "Send to HR"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default MyAttendancePage;
