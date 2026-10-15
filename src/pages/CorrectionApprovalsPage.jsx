import { useState } from "react";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";
import Header from "../components/common/Header";
import {
  Panel,
  TableShell,
  inputClass,
} from "../components/attendance/attendanceUi";
import {
  useDecideCorrectionMutation,
  useGetCorrectionApprovalsQuery,
} from "../features/attendance/attendance";

const fullName = (user) =>
  user
    ? [user.FirstName, user.LastName].filter(Boolean).join(" ") || user.Email
    : "-";

const STATUS_STYLE = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

const bdClock = (value) =>
  value
    ? new Date(value).toLocaleTimeString("en-GB", {
        timeZone: "Asia/Dhaka",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "-";
const CORRECTION_FILTERS = [
  { value: "Pending", label: "Waiting for me" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "", label: "All" },
];

const CorrectionTab = () => {
  const { data, isFetching } = useGetCorrectionApprovalsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [decide, { isLoading }] = useDecideCorrectionMutation();
  const [notes, setNotes] = useState({});
  const [filter, setFilter] = useState("Pending");
  const all = data?.data || [];
  const rows = all.filter((row) => !filter || row.approvalStatus === filter);

  const submit = async (row, decision) => {
    try {
      await decide({
        id: row.Id,
        decision,
        note: notes[row.Id] || "",
      }).unwrap();
      toast.success(`Correction ${decision.toLowerCase()}`);
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update the correction");
    }
  };

  return (
    <Panel>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Attendance corrections
          </h2>
          <p className="text-sm text-slate-500">
            Asked by employees from My Attendance. Approving adds the in/out
            time as a manual punch and recalculates that day.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {CORRECTION_FILTERS.map(({ value, label }) => (
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
            "Date",
            "Type",
            "In",
            "Out",
            "Reason",
            "Status",
            "Note",
            "",
          ]}
          minWidth="min-w-[1100px]"
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
                {fullName(row.attendanceUser)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                {row.attendanceDate}
              </td>
              <td className="px-3 py-2.5">{row.requestType}</td>
              <td className="px-3 py-2.5">{bdClock(row.requestedIn)}</td>
              <td className="px-3 py-2.5">{bdClock(row.requestedOut)}</td>
              <td className="max-w-[240px] px-3 py-2.5 text-slate-600">
                {row.reason}
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[row.approvalStatus] || ""}`}
                >
                  {row.approvalStatus === "Pending"
                    ? "Waiting HR"
                    : row.approvalStatus}
                </span>
              </td>
              <td className="px-3 py-2.5">
                {row.approvalStatus === "Pending" ? (
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
  );
};

// HR: attendance corrections asked from My Attendance.
const CorrectionApprovalsPage = () => (
  <div className="flex-1 relative z-10">
    <Header title="Attendance Correction Approvals" />
    <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)] space-y-4">
      <CorrectionTab />
    </main>
  </div>
);

export default CorrectionApprovalsPage;
