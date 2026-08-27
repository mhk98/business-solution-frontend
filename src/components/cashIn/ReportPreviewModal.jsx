import { useRef } from "react";
import { Printer, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ReportPreviewModal = ({
  open,
  onClose,
  type, // "pdf" | "sheet"
  blobUrl,
  sheetPreview, // { title?, header:[], rows:[] }
  loading = false,
  title: titleProp,
  downloadName: downloadNameProp,
  autoPrint = false,
}) => {
  const iframeRef = useRef(null);
  const hasAutoPrintedRef = useRef(false);

  if (!open) {
    hasAutoPrintedRef.current = false;
    return null;
  }

  const title =
    titleProp ||
    sheetPreview?.title ||
    (type === "pdf" ? "PDF Report Preview" : "Sheet Report Preview");

  const downloadName =
    downloadNameProp ||
    (type === "pdf" ? "cash-in-out-report.pdf" : "cash-in-out-report.xlsx");

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handlePrint = () => {
    try {
      iframeRef.current?.contentWindow?.print();
    } catch (e) {
      window.open(blobUrl, "_blank");
    }
  };

  const handleIframeLoad = () => {
    if (autoPrint && !hasAutoPrintedRef.current) {
      hasAutoPrintedRef.current = true;
      handlePrint();
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 sm:py-6"
        onClick={onClose} // ✅ overlay click = close
      >
        <motion.div
          onClick={(e) => e.stopPropagation()} // ✅ modal click = not close
          className="w-full max-w-5xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)] rounded-xl overflow-hidden shadow-2xl border border-gray-700 bg-gray-900"
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          {/* Top Bar */}
          {/* <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <div className="text-white font-semibold text-sm md:text-base">
              {type === "sheet" ? title : "PDF Preview"}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={!blobUrl || loading}
                onClick={handleDownload}
                className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm disabled:opacity-50"
              >
                Download
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded hover:bg-gray-800 text-gray-200"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div> */}

          {/* Top Bar */}
          <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900">
            <div className="text-white font-semibold text-sm md:text-base truncate max-w-[60%]">
              {type === "sheet" ? title : titleProp || "PDF Preview"}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {type === "pdf" && (
                <button
                  disabled={!blobUrl || loading}
                  onClick={handlePrint}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs md:text-sm disabled:opacity-50"
                >
                  <Printer size={14} />
                  Print
                </button>
              )}

              <button
                disabled={!blobUrl || loading}
                onClick={handleDownload}
                className="inline-flex items-center justify-center px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm disabled:opacity-50"
              >
                Download
              </button>

              <button
                onClick={onClose}
                className="inline-flex items-center justify-center p-2 rounded hover:bg-gray-800 text-gray-200"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="h-[calc(100vh-6.75rem)] sm:h-[calc(100vh-8.25rem)] w-full bg-gray-900">
            {loading && (
              <div className="h-full flex items-center justify-center text-white">
                Generating report...
              </div>
            )}

            {!loading && type === "pdf" && blobUrl && (
              // ✅ PDF viewer (white page will show automatically)
              <iframe
                ref={iframeRef}
                title="pdf-preview"
                src={blobUrl}
                className="w-full h-full"
                onLoad={handleIframeLoad}
              />
            )}

            {!loading && type === "sheet" && (
              // ✅ SHEET PREVIEW: make it WHITE like PDF
              <div className="w-full h-full bg-white text-gray-900 overflow-auto">
                {/* Title like PDF */}
                <div className="px-6 pt-6">
                  <div className="text-lg font-bold">
                    {sheetPreview?.title || "Cash In/Out Report"}
                  </div>
                  <div className="mt-2 border-b border-gray-300" />
                </div>

                {/* Table */}
                <div className="px-6 pb-6 pt-4">
                  {sheetPreview?.metadata && (
                    <div className="mb-4 border border-gray-200 px-4 py-3 text-sm text-gray-900">
                      <span className="font-semibold">Duration:</span>{" "}
                      {sheetPreview.metadata.duration || "All Data"}
                      <span className="px-2 text-gray-400">|</span>
                      <span className="font-semibold">Generated by:</span>{" "}
                      {sheetPreview.metadata.generatedBy || "Unknown"}
                      <span className="px-2 text-gray-400">|</span>
                      <span className="font-semibold">Generated on:</span>{" "}
                      {sheetPreview.metadata.generatedAt || "-"}
                    </div>
                  )}
                  {sheetPreview?.summary && (
                    <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 border border-gray-200">
                      <div className="border-b sm:border-b-0 sm:border-r border-gray-200 p-4">
                        <div className="text-sm text-gray-500">
                          Total Cash In
                        </div>
                        <div className="mt-2 text-lg font-bold text-green-700">
                          {Number(
                            sheetPreview.summary.cashIn || 0,
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                      <div className="border-b sm:border-b-0 sm:border-r border-gray-200 p-4">
                        <div className="text-sm text-gray-500">
                          Total Cash Out
                        </div>
                        <div className="mt-2 text-lg font-bold text-red-600">
                          {Number(
                            sheetPreview.summary.cashOut || 0,
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="text-sm text-gray-500">
                          Final Balance
                        </div>
                        <div className="mt-2 text-lg font-bold text-gray-900">
                          {Number(
                            sheetPreview.summary.finalBalance || 0,
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-indigo-600 text-white text-xs uppercase">
                          {(sheetPreview?.header || []).map((h, i) => (
                            <th key={i} className="px-3 py-2 text-left">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="text-sm">
                        {(sheetPreview?.rows || []).map((r, idx) => (
                          <tr
                            key={idx}
                            className="border-t border-gray-200 hover:bg-gray-50"
                          >
                            {r.map((c, i) => (
                              <td
                                key={i}
                                className={`px-3 py-2 ${
                                  i === 5
                                    ? "text-green-700 font-semibold"
                                    : i === 6
                                      ? "text-red-600 font-semibold"
                                      : ""
                                }`}
                              >
                                {c}
                              </td>
                            ))}
                          </tr>
                        ))}

                        {(!sheetPreview?.rows ||
                          sheetPreview.rows.length === 0) && (
                          <tr>
                            <td
                              colSpan={(sheetPreview?.header || []).length || 6}
                              className="px-3 py-6 text-center text-gray-500"
                            >
                              No data found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    Preview only. Download to open in Google Sheets/Excel.
                  </div>
                </div>
              </div>
            )}

            {!loading && !blobUrl && type === "pdf" && (
              <div className="h-full flex items-center justify-center text-white">
                No preview available
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ReportPreviewModal;
