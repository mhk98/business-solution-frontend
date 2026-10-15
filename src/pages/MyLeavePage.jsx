import { useState } from "react";
import toast from "react-hot-toast";
import { CalendarPlus, X } from "lucide-react";
import Header from "../components/common/Header";
import { Panel, TableShell, bdToday, inputClass, num } from "../components/attendance/attendanceUi";
import {
  useApplyMyLeaveMutation,
  useCancelMyLeaveMutation,
  useGetMyLeaveQuery,
} from "../features/leaveRequest/leaveRequest";

const fullName = (user) => (user ? [user.FirstName, user.LastName].filter(Boolean).join(" ") || user.Email : "");

// Pending → team leader → "Leader Approved" → HR → Approved.
const STATUS = {
  Pending: { label: "Waiting Team Leader", style: "bg-amber-50 text-amber-700 border-amber-200" },
  "Leader Approved": { label: "Waiting HR", style: "bg-sky-50 text-sky-700 border-sky-200" },
  Approved: { label: "Approved", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Rejected: { label: "Rejected", style: "bg-rose-50 text-rose-700 border-rose-200" },
  Cancelled: { label: "Cancelled", style: "bg-slate-100 text-slate-500 border-slate-200" },
};
const OPEN = ["Pending", "Leader Approved"];

const emptyForm = () => ({
  leaveTypeId: "",
  startDate: bdToday(),
  endDate: bdToday(),
  isHalfDay: false,
  halfDaySession: "First Half",
  reason: "",
});

const dayCount = (form) => {
  if (form.isHalfDay) return 0.5;
  if (!form.startDate || !form.endDate || form.endDate < form.startDate) return 0;
  return Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1;
};

// Self service: every logged-in user applies for their own leave here, sees
// their balance and where each request stands. No permission needed.
const MyLeavePage = () => {
  const { data, isFetching } = useGetMyLeaveQuery(undefined, { refetchOnMountOrArgChange: true });
  const [apply, { isLoading: isApplying }] = useApplyMyLeaveMutation();
  const [cancel, { isLoading: isCancelling }] = useCancelMyLeaveMutation();
  const [form, setForm] = useState(emptyForm);
  const info = data?.data || {};
  const balances = info.balances || [];
  const requests = info.requests || [];
  const selectedBalance = balances.find((b) => String(b.leaveTypeId) === String(form.leaveTypeId));
  const days = dayCount(form);
  const overBalance = selectedBalance && selectedBalance.entitled > 0 && days > selectedBalance.remaining - selectedBalance.pending;

  const set = (name, value) =>
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "startDate" && (!next.endDate || next.endDate < value)) next.endDate = value;
      return next;
    });

  const submit = async (event) => {
    event.preventDefault();
    if (!form.leaveTypeId) return toast.error("Select a leave type");
    if (!form.reason.trim()) return toast.error("Write the reason");
    try {
      await apply({ ...form, endDate: form.isHalfDay ? form.startDate : form.endDate }).unwrap();
      toast.success(info.teamLeader ? "Leave request sent to your team leader" : "Leave request sent to HR");
      setForm(emptyForm());
    } catch (error) {
      toast.error(error?.data?.message || "Failed to send the leave request");
    }
  };

  const withdraw = async (row) => {
    if (!window.confirm("Cancel this leave request?")) return;
    try {
      await cancel(row.Id).unwrap();
      toast.success("Leave request cancelled");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to cancel");
    }
  };

  return (
    <div className="flex-1 relative z-10">
      <Header title="My Leave" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)] space-y-4">
        <Panel>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Leave balance {info.year || ""}</h2>
              <p className="text-sm text-slate-500">
                Department: <span className="font-medium text-slate-700">{info.department?.name || "Not set"}</span>
                {" · "}Team leader:{" "}
                <span className="font-medium text-slate-700">{fullName(info.teamLeader) || "Not set (goes straight to HR)"}</span>
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {balances.map((b) => (
              <div key={b.leaveTypeId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-700">{b.name}</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {b.entitled > 0 ? num(b.remaining) : "—"}
                  {b.entitled > 0 && <span className="ml-1 text-sm font-medium text-slate-500">/ {num(b.entitled)} left</span>}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Used {num(b.used)} · Waiting {num(b.pending)}
                </div>
              </div>
            ))}
            {!balances.length && <div className="text-sm text-slate-500">{isFetching ? "Loading…" : "No leave type set up yet"}</div>}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-lg font-bold text-slate-900">Apply for leave</h2>
          <p className="text-sm text-slate-500">Your team leader approves first, then HR gives the final approval.</p>
          <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Leave type
              <select value={form.leaveTypeId} onChange={(e) => set("leaveTypeId", e.target.value)} className={inputClass}>
                <option value="">Select leave type</option>
                {(info.leaveTypes || []).map((type) => (
                  <option key={type.Id} value={type.Id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              {form.isHalfDay ? "Date" : "Start date"}
              <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={inputClass} />
            </label>
            {form.isHalfDay ? (
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Half
                <select value={form.halfDaySession} onChange={(e) => set("halfDaySession", e.target.value)} className={inputClass}>
                  <option value="First Half">First Half</option>
                  <option value="Second Half">Second Half</option>
                </select>
              </label>
            ) : (
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                End date
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={(e) => set("endDate", e.target.value)}
                  className={inputClass}
                />
              </label>
            )}
            <div className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Days
              <div className="flex items-center gap-3">
                <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold">{num(days)}</span>
                <label className="flex items-center gap-2 font-normal text-slate-600">
                  <input type="checkbox" checked={form.isHalfDay} onChange={(e) => set("isHalfDay", e.target.checked)} />
                  Half day
                </label>
              </div>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2 lg:col-span-3">
              Reason
              <textarea
                rows={2}
                maxLength={255}
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
                className={inputClass}
                placeholder="Why do you need leave?"
              />
            </label>
            <div className="flex flex-col justify-end gap-2">
              {overBalance && (
                <p className="text-xs font-medium text-amber-700">
                  More than your remaining {selectedBalance.name} balance — HR may reject or treat it as unpaid.
                </p>
              )}
              <button
                type="submit"
                disabled={isApplying}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <CalendarPlus size={16} /> {isApplying ? "Sending…" : "Send request"}
              </button>
            </div>
          </form>
        </Panel>

        <Panel>
          <h2 className="mb-4 text-lg font-bold text-slate-900">My requests</h2>
          <TableShell
            headings={["Leave type", "Dates", "Days", "Reason", "Team leader", "HR", "Status", "Note", ""]}
            minWidth="min-w-[960px]"
            empty={isFetching && !requests.length ? "Loading…" : !requests.length ? "No leave request yet" : null}
          >
            {requests.map((row) => {
              const status = STATUS[row.approvalStatus] || { label: row.approvalStatus, style: "" };
              return (
                <tr key={row.Id}>
                  <td className="px-3 py-2.5 font-semibold text-slate-900">{row.leaveType?.name || "-"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {row.startDate === row.endDate ? row.startDate : `${row.startDate} → ${row.endDate}`}
                  </td>
                  <td className="px-3 py-2.5">{row.isHalfDay ? `½ (${row.halfDaySession || "Half"})` : row.totalDays}</td>
                  <td className="max-w-[240px] px-3 py-2.5 text-slate-600">{row.reason}</td>
                  <td className="px-3 py-2.5">{fullName(row.approvedBy) || "-"}</td>
                  <td className="px-3 py-2.5">{fullName(row.hrApprovedBy) || "-"}</td>
                  <td className="px-3 py-2.5">
                    <span className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.style}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="max-w-[200px] px-3 py-2.5 text-xs text-slate-500">{row.note || ""}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    {OPEN.includes(row.approvalStatus) && (
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
    </div>
  );
};

export default MyLeavePage;
