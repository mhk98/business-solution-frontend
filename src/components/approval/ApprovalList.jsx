import { useState } from "react";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";
import {
  useApproveRequestMutation,
  useRejectRequestMutation,
} from "../../features/approval/approval";

const ACTION_STYLES = {
  Create: "bg-amber-50 text-amber-700 border-amber-200",
  Update: "bg-sky-50 text-sky-700 border-sky-200",
  Delete: "bg-rose-50 text-rose-700 border-rose-200",
};

const ACTION_TEXT = {
  Create: "New entry (back-dated)",
  Update: "Edit request",
  Delete: "Delete request",
};

// What reject does, so nobody is surprised.
const REJECT_HINT = {
  Create: "Rejecting removes this entry.",
  Update: "Rejecting keeps the record as it was.",
  Delete: "Rejecting keeps the record.",
};

const actionKind = (action) => (String(action).startsWith("Update") ? "Update" : action);

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).length > 60 ? `${String(value).slice(0, 60)}…` : String(value);
};

const timeAgo = (value) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const ApprovalItem = ({ item }) => {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [approve, { isLoading: approving }] = useApproveRequestMutation();
  const [reject, { isLoading: rejectingNow }] = useRejectRequestMutation();
  const kind = actionKind(item.action);
  const busy = approving || rejectingNow;

  const onApprove = async () => {
    try {
      await approve(item.key).unwrap();
      toast.success(`${item.entityLabel} approved`);
    } catch (error) {
      toast.error(error?.data?.message || "Approve failed");
    }
  };

  const onReject = async () => {
    try {
      await reject({ key: item.key, note: note.trim() || undefined }).unwrap();
      toast.success(`${item.entityLabel} rejected`);
    } catch (error) {
      toast.error(error?.data?.message || "Reject failed");
    }
  };

  const { title, amount, quantity, date } = item.record || {};

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{item.entityLabel}</span>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${ACTION_STYLES[kind] || ACTION_STYLES.Update}`}>
              {item.action === "Update (already saved)" ? "Edit (already saved)" : ACTION_TEXT[kind] || item.action}
            </span>
            <span className="text-xs text-slate-400">#{item.recordId}</span>
          </div>
          <p className="text-sm text-slate-600">
            {[title, date, quantity !== null && quantity !== undefined ? `Qty ${quantity}` : null, amount !== null && amount !== undefined ? `৳${Number(amount).toLocaleString()}` : null]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
          <p className="text-xs text-slate-500">
            {item.requestedBy ? `By ${item.requestedBy} · ` : ""}
            {timeAgo(item.requestedAt)}
          </p>
          {item.reason && <p className="text-xs text-rose-700">Reason: {item.reason}</p>}
          {item.changes?.length > 0 && (
            <ul className="mt-2 space-y-0.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
              {item.changes.map((change) => (
                <li key={change.field}>
                  <span className="font-medium">{change.field}</span>:{" "}
                  <span className="text-rose-600 line-through">{formatValue(change.from)}</span> →{" "}
                  <span className="text-emerald-700">{formatValue(change.to)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {!rejecting && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onApprove}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <Check size={15} /> Approve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setRejecting(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            >
              <X size={15} /> Reject
            </button>
          </div>
        )}
      </div>
      {rejecting && (
        <div className="mt-3 space-y-2 rounded-lg border border-rose-100 bg-rose-50/50 p-3">
          <p className="text-xs text-rose-700">{REJECT_HINT[kind]}</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Reason (optional, sent to the requester)"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {rejectingNow ? "Rejecting…" : "Confirm reject"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
};

const ApprovalList = ({ items = [], emptyText = "Nothing is waiting for approval." }) =>
  items.length ? (
    <ul className="space-y-3">
      {items.map((item) => (
        <ApprovalItem key={item.key} item={item} />
      ))}
    </ul>
  ) : (
    <p className="py-10 text-center text-sm text-slate-500">{emptyText}</p>
  );

export default ApprovalList;
