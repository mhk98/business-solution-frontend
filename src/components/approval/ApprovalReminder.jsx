import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BellRing } from "lucide-react";
import Modal from "../common/Modal";
import ApprovalList from "./ApprovalList";
import { useGetPendingApprovalsQuery } from "../../features/approval/approval";

export const REMINDER_INTERVAL_MS = 5 * 60 * 1000;
const SHOWN_AT_KEY = "approvalReminderShownAt";

const readShownAt = () => {
  try {
    return Number(localStorage.getItem(SHOWN_AT_KEY) || 0);
  } catch {
    return 0;
  }
};

const writeShownAt = (value) => {
  try {
    localStorage.setItem(SHOWN_AT_KEY, String(value));
  } catch {
    // Without storage the popup simply comes back on the next check.
  }
};

// For admin / superAdmin / department heads: pops up the pending approvals
// every 5 minutes until each one is approved or rejected.
const ApprovalReminder = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data } = useGetPendingApprovalsQuery(undefined, {
    pollingInterval: REMINDER_INTERVAL_MS / 2,
    skip: !localStorage.getItem("token"),
  });
  const items = data?.data || [];
  const isApprover = Boolean(data?.meta?.isApprover);
  const onApprovalsPage = location.pathname === "/approvals";

  useEffect(() => {
    if (!isApprover || !items.length || onApprovalsPage) return undefined;
    const check = () => {
      if (Date.now() - readShownAt() >= REMINDER_INTERVAL_MS) {
        writeShownAt(Date.now());
        setOpen(true);
      }
    };
    check();
    const timer = setInterval(check, 30 * 1000);
    return () => clearInterval(timer);
  }, [isApprover, items.length, onApprovalsPage]);

  // Close once everything is decided.
  useEffect(() => {
    if (open && !items.length) setOpen(false);
  }, [open, items.length]);

  if (!isApprover) return null;

  return (
    <Modal
      isOpen={open && items.length > 0 && !onApprovalsPage}
      onClose={() => setOpen(false)}
      title={`${items.length} waiting for your approval`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <BellRing size={18} className="shrink-0" />
          This reminder comes back every 5 minutes until each request is approved or rejected.
        </div>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <ApprovalList items={items} />
        </div>
        <div className="flex justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/approvals");
            }}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
          >
            Open Approvals page
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Remind me in 5 minutes
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ApprovalReminder;
