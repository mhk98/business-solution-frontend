import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BellRing, CalendarCheck } from "lucide-react";
import Modal from "../common/Modal";
import ApprovalList from "./ApprovalList";
import { useGetPendingApprovalsQuery } from "../../features/approval/approval";
import { useGetMyLeaveApprovalCountQuery } from "../../features/leaveRequest/leaveRequest";

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

// For admin / superAdmin / department heads (and HR for leave): pops up the
// pending approvals and leave requests every 5 minutes until each one is
// approved or rejected.
const ApprovalReminder = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data } = useGetPendingApprovalsQuery(undefined, {
    pollingInterval: REMINDER_INTERVAL_MS / 2,
    skip: !localStorage.getItem("token"),
  });
  const { data: leaveRes } = useGetMyLeaveApprovalCountQuery(undefined, {
    pollingInterval: REMINDER_INTERVAL_MS / 2,
    skip: !localStorage.getItem("token"),
  });
  const items = (data?.meta?.isApprover && data?.data) || [];
  const leaveCount =
    (leaveRes?.data?.isApprover && leaveRes.data.leaveCount) || 0;
  const correctionCount =
    (leaveRes?.data?.isApprover && leaveRes.data.correctionCount) || 0;
  const total = items.length + leaveCount + correctionCount;
  const isApprover = Boolean(
    data?.meta?.isApprover || leaveRes?.data?.isApprover,
  );
  const onApprovalsPage = [
    "/approvals",
    "/leave-approvals",
    "/attendance-correction-approvals",
  ].includes(location.pathname);

  useEffect(() => {
    if (!isApprover || !total || onApprovalsPage) return undefined;
    const check = () => {
      if (Date.now() - readShownAt() >= REMINDER_INTERVAL_MS) {
        writeShownAt(Date.now());
        setOpen(true);
      }
    };
    check();
    const timer = setInterval(check, 30 * 1000);
    return () => clearInterval(timer);
  }, [isApprover, total, onApprovalsPage]);

  // Close once everything is decided.
  useEffect(() => {
    if (open && !total) setOpen(false);
  }, [open, total]);

  if (!isApprover) return null;

  return (
    <Modal
      isOpen={open && total > 0 && !onApprovalsPage}
      onClose={() => setOpen(false)}
      title={`${total} waiting for your approval`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <BellRing size={18} className="shrink-0" />
          This reminder comes back every 5 minutes until each request is
          approved or rejected.
        </div>
        {leaveCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/leave-approvals");
            }}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-left text-sm text-sky-800 hover:bg-sky-100"
          >
            <span className="flex items-center gap-2 font-semibold">
              <CalendarCheck size={18} className="shrink-0" />
              {leaveCount} leave request{leaveCount > 1 ? "s" : ""} waiting for
              you
            </span>
            <span className="font-semibold">Open Leave Approvals →</span>
          </button>
        )}
        {correctionCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/attendance-correction-approvals");
            }}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-left text-sm text-sky-800 hover:bg-sky-100"
          >
            <span className="flex items-center gap-2 font-semibold">
              <CalendarCheck size={18} className="shrink-0" />
              {correctionCount} attendance correction
              {correctionCount > 1 ? "s" : ""} waiting for you
            </span>
            <span className="font-semibold">Open Correction Approvals →</span>
          </button>
        )}
        {items.length > 0 && (
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <ApprovalList items={items} />
          </div>
        )}
        <div className="flex justify-between gap-2">
          {items.length > 0 ? (
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
          ) : (
            <span />
          )}
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
