import { useState } from "react";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";
import Header from "../components/common/Header";
import { Panel, TableShell, inputClass } from "../components/attendance/attendanceUi";
import {
  useDecideLeaveRequestMutation,
  useGetMyLeaveApprovalsQuery,
} from "../features/leaveRequest/leaveRequest";

const fullName = (user) => (user ? [user.FirstName, user.LastName].filter(Boolean).join(" ") || user.Email : "-");

const STATUS_STYLE = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

// Leave requests where the logged-in user is the chosen approver (the
// department's team leader). Open to every logged-in user — no Leave
// Management permission needed to approve your own team's requests.
const LeaveApprovalsPage = () => {
  const { data, isFetching } = useGetMyLeaveApprovalsQuery(undefined, { refetchOnMountOrArgChange: true });
  const [decide, { isLoading }] = useDecideLeaveRequestMutation();
  const [notes, setNotes] = useState({});
  const [filter, setFilter] = useState("Pending");
  const rows = (data?.data || []).filter((row) => !filter || row.approvalStatus === filter);
  const pendingCount = (data?.data || []).filter((row) => row.approvalStatus === "Pending").length;

  const submit = async (row, decision) => {
    try {
      await decide({ id: row.Id, decision, note: notes[row.Id] || "" }).unwrap();
      toast.success(`Leave ${decision.toLowerCase()}`);
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update the leave request");
    }
  };

  return (
    <div className="flex-1 relative z-10">
      <Header title="My Leave Approvals" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)] space-y-4">
        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Leave requests waiting for you</h2>
              <p className="text-sm text-slate-500">
                You are the approver (team leader) on these. {pendingCount} pending.
              </p>
            </div>
            <div className="flex gap-2">
              {["Pending", "Approved", "Rejected", ""].map((value) => (
                <button
                  key={value || "all"}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-xl border px-3 py-1.5 text-sm font-medium ${
                    filter === value ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {value || "All"}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <TableShell
              headings={["Employee", "Leave type", "Dates", "Days", "Reason", "Requested by", "Status", "Note", ""]}
              minWidth="min-w-[1000px]"
              empty={isFetching && !rows.length ? "Loading…" : !rows.length ? "Nothing here" : null}
            >
              {rows.map((row) => (
                <tr key={row.Id}>
                  <td className="px-3 py-2.5 font-semibold text-slate-900">{fullName(row.attendanceUser) || row.employee?.name}</td>
                  <td className="px-3 py-2.5">{row.leaveType?.name || "-"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {row.startDate === row.endDate ? row.startDate : `${row.startDate} → ${row.endDate}`}
                  </td>
                  <td className="px-3 py-2.5">{row.isHalfDay ? `½ (${row.halfDaySession || "Half"})` : row.totalDays}</td>
                  <td className="max-w-[220px] px-3 py-2.5 text-slate-600">{row.reason}</td>
                  <td className="px-3 py-2.5">{fullName(row.requestedBy)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[row.approvalStatus] || ""}`}>
                      {row.approvalStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {row.approvalStatus === "Pending" ? (
                      <input
                        value={notes[row.Id] || ""}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [row.Id]: e.target.value }))}
                        placeholder="Optional note"
                        className={`${inputClass} w-44`}
                      />
                    ) : (
                      <span className="text-xs text-slate-500">{row.note || ""}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    {row.approvalStatus === "Pending" && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => submit(row, "Approved")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <Check size={15} /> Approve
                        </button>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => submit(row, "Rejected")}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                        >
                          <X size={15} /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </TableShell>
          </div>
        </Panel>
      </main>
    </div>
  );
};

export default LeaveApprovalsPage;
