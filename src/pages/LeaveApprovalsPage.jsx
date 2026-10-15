import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";
import Header from "../components/common/Header";
import {
  Panel,
  TableShell,
  inputClass,
} from "../components/attendance/attendanceUi";
import {
  useDecideLeaveRequestMutation,
  useGetMyLeaveApprovalsQuery,
} from "../features/leaveRequest/leaveRequest";

const fullName = (user) =>
  user
    ? [user.FirstName, user.LastName].filter(Boolean).join(" ") || user.Email
    : "-";

const STATUS_STYLE = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  "Leader Approved": "bg-sky-50 text-sky-700 border-sky-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

// Two steps: Pending → team leader approves → "Leader Approved" → HR
// approves → Approved (counted in attendance).
const STATUS_LABEL = {
  Pending: "Waiting Team Leader",
  "Leader Approved": "Waiting HR",
};
const FILTERS = [
  { value: "mine", label: "Waiting for me" },
  { value: "Pending", label: "Waiting Team Leader" },
  { value: "Leader Approved", label: "Waiting HR" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "", label: "All" },
];

// Leave requests on the logged-in user's desk: as the team leader (step 1)
// or as HR (step 2). Open to every logged-in user — no Leave Management
// permission needed to approve your own team's requests.
const LeaveTab = () => {
  const { data, isFetching } = useGetMyLeaveApprovalsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [decide, { isLoading }] = useDecideLeaveRequestMutation();
  const [notes, setNotes] = useState({});
  const [filter, setFilter] = useState("mine");
  const all = data?.data || [];
  const rows = all.filter((row) =>
    filter === "mine"
      ? row.actionable
      : !filter || row.approvalStatus === filter,
  );
  const pendingCount = all.filter((row) => row.actionable).length;

  const submit = async (row, decision) => {
    try {
      await decide({
        id: row.Id,
        decision,
        note: notes[row.Id] || "",
      }).unwrap();
      toast.success(`Leave ${decision.toLowerCase()}`);
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update the leave request");
    }
  };

  return (
    <Panel>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Leave requests waiting for you
          </h2>
          <p className="text-sm text-slate-500">
            Team leader approves first, then HR gives the final approval.{" "}
            {pendingCount} waiting for you.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value || "all"}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-medium ${
                filter === value
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <TableShell
          headings={[
            "Employee",
            "Leave type",
            "Dates",
            "Days",
            "Reason",
            "Requested by",
            "Team leader",
            "HR",
            "Status",
            "Note",
            "",
          ]}
          minWidth="min-w-[1200px]"
          empty={
            isFetching && !rows.length
              ? "Loading…"
              : !rows.length
                ? "Nothing here"
                : null
          }
        >
          {rows.map((row) => (
            <tr key={row.Id}>
              <td className="px-3 py-2.5 font-semibold text-slate-900">
                {fullName(row.attendanceUser) || row.employee?.name}
              </td>
              <td className="px-3 py-2.5">{row.leaveType?.name || "-"}</td>
              <td className="whitespace-nowrap px-3 py-2.5">
                {row.startDate === row.endDate
                  ? row.startDate
                  : `${row.startDate} → ${row.endDate}`}
              </td>
              <td className="px-3 py-2.5">
                {row.isHalfDay
                  ? `½ (${row.halfDaySession || "Half"})`
                  : row.totalDays}
              </td>
              <td className="max-w-[220px] px-3 py-2.5 text-slate-600">
                {row.reason}
              </td>
              <td className="px-3 py-2.5">{fullName(row.requestedBy)}</td>
              <td className="px-3 py-2.5">
                {row.approvedBy ? fullName(row.approvedBy) : "-"}
              </td>
              <td className="px-3 py-2.5">
                {row.hrApprovedBy ? fullName(row.hrApprovedBy) : "-"}
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[row.approvalStatus] || ""}`}
                >
                  {STATUS_LABEL[row.approvalStatus] || row.approvalStatus}
                </span>
              </td>
              <td className="px-3 py-2.5">
                {row.actionable ? (
                  <input
                    value={notes[row.Id] || ""}
                    onChange={(e) =>
                      setNotes((prev) => ({
                        ...prev,
                        [row.Id]: e.target.value,
                      }))
                    }
                    placeholder="Optional note"
                    className={`${inputClass} w-44`}
                  />
                ) : (
                  <span className="text-xs text-slate-500">
                    {row.note || ""}
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right">
                {row.actionable && (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => submit(row, "Approved")}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <Check size={15} />{" "}
                      {row.step === "hr" ? "Final Approve" : "Approve"}
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
  );
};

// Leave requests waiting on the logged-in user (team leader, then HR).
// Old notification links (?tab=corrections) go to the corrections page.
const LeaveApprovalsPage = () => {
  const [params] = useSearchParams();
  if (params.get("tab") === "corrections")
    return <Navigate to="/attendance-correction-approvals" replace />;
  return (
    <div className="flex-1 relative z-10">
      <Header title="Leave Approvals" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)] space-y-4">
        <LeaveTab />
      </main>
    </div>
  );
};

export default LeaveApprovalsPage;
