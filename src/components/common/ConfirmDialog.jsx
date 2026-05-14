import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";

const ConfirmDialog = ({
  isOpen,
  title = "Confirm action",
  message = "Are you sure you want to continue?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isLoading = false,
  tone = "danger",
  onConfirm,
  onCancel,
}) => {
  const confirmClasses =
    tone === "danger"
      ? "bg-rose-600 hover:bg-rose-700 focus-visible:outline-rose-600"
      : "bg-indigo-600 hover:bg-indigo-700 focus-visible:outline-indigo-600";

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? undefined : onCancel}
      title={title}
      maxWidth="max-w-md"
      showCloseButton={!isLoading}
    >
      <div className="-mx-4 -mt-4 space-y-0 sm:-mx-6 sm:-mt-6">
        <div className="border-b border-slate-100 px-4 py-6 sm:px-6">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle size={22} />
            </div>
            <p className="pt-1 text-base leading-8 text-slate-600">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-4 py-5 sm:px-6 sm:py-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex h-11 min-w-[112px] items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-70 ${confirmClasses}`}
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
