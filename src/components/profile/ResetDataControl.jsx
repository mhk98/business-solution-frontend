import { useState } from "react";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, DatabaseZap, X } from "lucide-react";
import { useHardResetDataMutation } from "../../features/systemReset/systemReset";

const ResetDataControl = () => {
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deletePercentage, setDeletePercentage] = useState("80");
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [pendingResetRequest, setPendingResetRequest] = useState(null);
  const [hardResetData, { isLoading: isResetting }] =
    useHardResetDataMutation();

  const normalizedDeletePercentage = Math.min(
    100,
    Math.max(1, Number(deletePercentage) || 0),
  );
  const canConfirmDelete =
    pendingResetRequest &&
    deleteConfirmationText.trim() === "Delete" &&
    pendingResetRequest.percentage >= 1 &&
    pendingResetRequest.percentage <= 100;

  const closeResetModal = ({ force = false } = {}) => {
    if (isResetting && !force) return;
    setResetModalOpen(false);
    setDeletePercentage("80");
    setDeleteConfirmationText("");
    setPendingResetRequest(null);
  };

  const openDeleteConfirmation = (mode) => {
    if (Number(deletePercentage) < 1 || Number(deletePercentage) > 100) {
      toast.error("Delete percentage must be between 1 and 100.");
      return;
    }

    const percentage = mode === "all" ? 100 : normalizedDeletePercentage;
    setPendingResetRequest({ mode, percentage });
    setDeleteConfirmationText("");
  };

  const handleHardReset = async () => {
    if (!pendingResetRequest) return;

    try {
      const result = await hardResetData({
        mode: pendingResetRequest.mode,
        percentage: pendingResetRequest.percentage,
      }).unwrap();
      toast.success(
        `Hard delete completed. Deleted ${result?.data?.deletedTotal || 0} rows.`,
      );
      closeResetModal({ force: true });
    } catch (error) {
      toast.error(error?.data?.message || "Reset failed");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setResetModalOpen(true)}
        className="w-full rounded-xl border border-rose-200 bg-rose-50 p-4 text-left transition hover:bg-rose-100"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-rose-700">
              Reset Data
            </div>
            <div className="text-xs font-medium text-rose-500">
              Hard delete business data
            </div>
          </div>
          <span className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-rose-600">
            <DatabaseZap size={18} />
          </span>
        </div>
      </button>

      <AnimatePresence>
        {resetModalOpen ? (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600">
                    <AlertTriangle size={20} />
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Hard Delete Data
                    </h3>
                    <p className="text-xs font-semibold text-slate-500">
                      This is permanent and not a soft delete.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeResetModal}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                  disabled={isResetting}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 px-5 py-5">
                {!pendingResetRequest ? (
                  <>
                    <p className="text-sm font-semibold leading-6 text-slate-700">
                      কত percent data randomly hard delete করতে চান সেটা দিন,
                      অথবা all data delete করুন।
                    </p>

                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                        Delete Percentage
                      </span>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={deletePercentage}
                          onChange={(event) =>
                            setDeletePercentage(event.target.value)
                          }
                          disabled={isResetting}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:opacity-60"
                        />
                        <span className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                          %
                        </span>
                      </div>
                    </label>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => openDeleteConfirmation("percentage")}
                        disabled={isResetting}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-left hover:bg-amber-100 disabled:opacity-60"
                      >
                        <div className="text-sm font-black text-amber-800">
                          Delete {normalizedDeletePercentage}%
                        </div>
                        <div className="mt-1 text-xs font-semibold text-amber-700">
                          {normalizedDeletePercentage}% business data randomly
                          hard delete হবে।
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteConfirmation("all")}
                        disabled={isResetting}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-left hover:bg-rose-100 disabled:opacity-60"
                      >
                        <div className="text-sm font-black text-rose-800">
                          Delete All
                        </div>
                        <div className="mt-1 text-xs font-semibold text-rose-700">
                          সব business data hard delete হবে।
                        </div>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-800">
                      Are you want to delete. Please{" "}
                      <span className="font-black">Type Delete to confirm</span>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                        Type Delete to confirm
                      </span>
                      <input
                        value={deleteConfirmationText}
                        onChange={(event) =>
                          setDeleteConfirmationText(event.target.value)
                        }
                        disabled={isResetting}
                        placeholder="Delete"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:opacity-60"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleHardReset}
                      disabled={!canConfirmDelete || isResetting}
                      className="h-11 w-full rounded-xl bg-rose-600 text-sm font-black text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isResetting
                        ? "Deleting..."
                        : `Delete ${pendingResetRequest.percentage}% Data`}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isResetting) return;
                        setPendingResetRequest(null);
                        setDeleteConfirmationText("");
                      }}
                      disabled={isResetting}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    >
                      Back
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={closeResetModal}
                  disabled={isResetting}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default ResetDataControl;
