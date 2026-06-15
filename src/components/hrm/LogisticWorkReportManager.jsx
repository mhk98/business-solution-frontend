import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Edit3,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Select from "react-select";
import toast from "react-hot-toast";
import HrmWorkspace from "./HrmWorkspace";
import {
  useCreateLogisticWorkReportMutation,
  useDeleteLogisticWorkReportMutation,
  useGetAllLogisticWorkReportsQuery,
  useGetMyLogisticWorkReportsQuery,
  useUpdateLogisticWorkReportMutation,
} from "../../features/logisticWorkReport/logisticWorkReport";
import useDebounce from "../../hooks/useDebounce";

const today = new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

const REPORT_FIELDS = [
  { key: "pending", label: "Pending" },
  { key: "cancelRequest", label: "Cancel Request" },
  { key: "cancelApprove", label: "Cancel Approve" },
  { key: "cancelResend", label: "Cancel Resend" },
  { key: "incomingReceive", label: "Incoming Receive" },
  { key: "incomingSolve", label: "Incoming Solve" },
  { key: "entryUpdate", label: "Entry Update" },
  { key: "returnSheetReceived", label: "Return sheet received" },
  { key: "exchangePrint", label: "Exchange Print" },
  {
    key: "missingProblemParcelFollowup",
    label: "Missing parcel and Problem parcel followup",
  },
  { key: "holdParcelReceived", label: "Hold parcel received" },
  { key: "csProblemSolve", label: "CS Problem solve" },
  { key: "pendingAssign", label: "Pending Assign" },
  { key: "completedPendingAssign", label: "Completed Pending assign" },
];

const EMPTY_FORM = REPORT_FIELDS.reduce(
  (acc, field) => ({ ...acc, [field.key]: "" }),
  { reportDate: today },
);

const LogisticWorkReportManager = () => {
  const role = localStorage.getItem("role") || "user";
  const canManageReports = ["superAdmin", "admin"].includes(role);
  const currentUserId = Number(localStorage.getItem("userId") || 0);
  const pageSize = 10;

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [selectedReportName, setSelectedReportName] = useState(null);
  const [fromDate, setFromDate] = useState(thirtyDaysAgo);
  const [toDate, setToDate] = useState(today);
  const [currentPage, setCurrentPage] = useState(1);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const currentReportArgs = useMemo(
    () => ({ page: 1, limit: 1, reportDate: form.reportDate }),
    [form.reportDate],
  );

  const listQueryArgs = useMemo(
    () => ({
      page: currentPage,
      limit: pageSize,
      searchTerm: debouncedSearchTerm || undefined,
      name: selectedReportName?.value || undefined,
      startDate: fromDate || undefined,
      endDate: toDate || undefined,
    }),
    [currentPage, debouncedSearchTerm, selectedReportName, fromDate, toDate],
  );

  const reportNameOptionArgs = useMemo(
    () => ({
      page: 1,
      limit: 1000,
      startDate: fromDate || undefined,
      endDate: toDate || undefined,
    }),
    [fromDate, toDate],
  );
  const { data: currentReportRes, refetch: refetchCurrent } =
    useGetMyLogisticWorkReportsQuery(currentReportArgs);
  const {
    data: myReportsRes,
    isLoading: myReportsLoading,
    refetch: refetchMine,
  } = useGetMyLogisticWorkReportsQuery(listQueryArgs, {
    skip: canManageReports,
  });
  const {
    data: allReportsRes,
    isLoading: allReportsLoading,
    refetch: refetchAll,
  } = useGetAllLogisticWorkReportsQuery(listQueryArgs, {
    skip: !canManageReports,
  });
  const { data: myReportNameOptionsRes } = useGetMyLogisticWorkReportsQuery(
    reportNameOptionArgs,
    { skip: canManageReports },
  );
  const { data: allReportNameOptionsRes } = useGetAllLogisticWorkReportsQuery(
    reportNameOptionArgs,
    { skip: !canManageReports },
  );

  const [createReport, { isLoading: creating }] =
    useCreateLogisticWorkReportMutation();
  const [updateReport, { isLoading: updating }] =
    useUpdateLogisticWorkReportMutation();
  const [deleteReport, { isLoading: deleting }] =
    useDeleteLogisticWorkReportMutation();

  const reportNameOptions = useMemo(
    () => {
      const optionRes = canManageReports
        ? allReportNameOptionsRes
        : myReportNameOptionsRes;

      return Array.from(
        new Set((optionRes?.data || []).map((row) => row?.name).filter(Boolean)),
      ).map((name) => ({ value: name, label: name }));
    },
    [allReportNameOptionsRes, canManageReports, myReportNameOptionsRes],
  );

  const currentReport = currentReportRes?.data?.[0];
  const reportRes = canManageReports ? allReportsRes : myReportsRes;
  const reports = reportRes?.data || [];
  const reportMeta = reportRes?.meta || {};
  const totalReports = reportMeta?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalReports / pageSize));
  const isLoading = myReportsLoading || allReportsLoading;

  const totals = reports.reduce(
    (acc, row) =>
      REPORT_FIELDS.reduce(
        (next, field) => ({
          ...next,
          [field.key]: next[field.key] + Number(row[field.key] || 0),
        }),
        acc,
      ),
    REPORT_FIELDS.reduce((acc, field) => ({ ...acc, [field.key]: 0 }), {}),
  );

  const totalActivity = REPORT_FIELDS.reduce(
    (total, field) => total + totals[field.key],
    0,
  );

  const stats = [
    {
      name: "Reports",
      value: totalReports,
      icon: ClipboardList,
      iconBg: "#EEF2FF",
      iconColor: "#4338CA",
    },
    {
      name: "Pending",
      value: totals.pending || 0,
      icon: CalendarDays,
      iconBg: "#FFF7ED",
      iconColor: "#C2410C",
    },
    {
      name: "Incoming Solved",
      value: totals.incomingSolve || 0,
      icon: BarChart3,
      iconBg: "#ECFDF5",
      iconColor: "#047857",
    },
    {
      name: "Total Activity",
      value: totalActivity,
      icon: BarChart3,
      iconBg: "#F0F9FF",
      iconColor: "#0369A1",
    },
  ];

  const refetchReports = () => {
    refetchCurrent();
    if (canManageReports) refetchAll();
    else refetchMine();
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, reportDate: today });
  };

  const openReportModal = () => {
    setIsReportModalOpen(true);
  };

  const closeReportModal = () => {
    setIsReportModalOpen(false);
    if (editingId) resetForm();
  };

  const handleFormChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayload = () => ({
    reportDate: form.reportDate,
    ...REPORT_FIELDS.reduce(
      (acc, field) => ({ ...acc, [field.key]: form[field.key] || 0 }),
      {},
    ),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = buildPayload();
      const targetId = editingId || currentReport?.Id;
      const res = targetId
        ? await updateReport({ id: targetId, data: payload }).unwrap()
        : await createReport(payload).unwrap();

      if (res?.success) {
        toast.success(
          targetId ? "Logistic report updated" : "Logistic report submitted",
        );
        setEditingId(null);
        setIsReportModalOpen(false);
        refetchReports();
      }
    } catch (err) {
      toast.error(
        err?.data?.message || err?.error || "Failed to save logistic report",
      );
    }
  };

  const handleEdit = (row) => {
    setEditingId(row.Id);
    setForm({
      reportDate: row.reportDate || today,
      ...REPORT_FIELDS.reduce(
        (acc, field) => ({ ...acc, [field.key]: row[field.key] ?? "" }),
        {},
      ),
    });
    setIsReportModalOpen(true);
  };

  const handleDelete = async (row) => {
    const ok = window.confirm("Delete this logistic work report?");
    if (!ok) return;

    try {
      const res = await deleteReport(row.Id).unwrap();
      if (res?.success) {
        toast.success("Logistic report deleted");
        if (editingId === row.Id) resetForm();
        refetchReports();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete logistic report");
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedReportName, fromDate, toDate]);

  useEffect(() => {
    if (editingId) return;
    if (!currentReport) return;

    setForm({
      reportDate: currentReport.reportDate || today,
      ...REPORT_FIELDS.reduce(
        (acc, field) => ({
          ...acc,
          [field.key]: currentReport[field.key] ?? "",
        }),
        {},
      ),
    });
  }, [currentReport?.Id, editingId]);

  return (
    <HrmWorkspace
      eyebrow="Logistic Report"
      title="Logistic Work Reports"
      description="Logistic team members submit daily workflow counts, and managers can search, compare, and filter submissions by date range."
      stats={stats}
    >
      <div className="grid gap-6">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {canManageReports ? "All Logistic Reports" : "My Reports"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Search by name and filter with start and end date.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openReportModal}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <Plus size={16} />
                Add Logistic Report
              </button>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
                Showing {reports.length} of {totalReports}
              </div>
            </div>
          </div>

          <div
            className={`mt-5 grid gap-3 ${
              canManageReports
                ? "lg:grid-cols-[260px_1fr_160px_160px]"
                : "lg:grid-cols-[1fr_160px_160px]"
            }`}
          >
            {canManageReports && (
              <Select
                value={selectedReportName}
                onChange={setSelectedReportName}
                options={reportNameOptions}
                isClearable
                placeholder="Select employee"
                className="text-sm text-slate-900"
                styles={selectStyles}
              />
            )}
            <label className="relative block">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search something..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          <div className="mt-5 max-w-full overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[2200px] w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Name</th>
                  {REPORT_FIELDS.map((field) => (
                    <th key={field.key} className="px-4 py-3">
                      {field.label}
                    </th>
                  ))}
                  <th className="sticky right-0 z-10 bg-slate-50 px-4 py-3 text-right shadow-[-10px_0_16px_-16px_rgba(15,23,42,0.65)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {isLoading && (
                  <tr>
                    <td
                      colSpan={REPORT_FIELDS.length + 3}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Loading reports...
                    </td>
                  </tr>
                )}
                {!isLoading && reports.length === 0 && (
                  <tr>
                    <td
                      colSpan={REPORT_FIELDS.length + 3}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No logistic work report found.
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  reports.map((row) => {
                    const canMutateRow = Number(row.user?.Id) === currentUserId;

                    return (
                      <tr key={row.Id} className="group hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {row.reportDate}
                        </td>
                        <td className="sticky right-0 bg-white px-4 py-3 shadow-[-10px_0_16px_-16px_rgba(15,23,42,0.65)] group-hover:bg-slate-50">
                          <div className="font-semibold text-slate-900">
                            {row.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {row.user?.Email || "-"}
                          </div>
                        </td>
                        {REPORT_FIELDS.map((field) => (
                          <td key={field.key} className="px-4 py-3">
                            {row[field.key] || 0}
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          {canMutateRow ? (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(row)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                                title="Edit"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(row)}
                                disabled={deleting}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ) : (
                            <div className="text-right text-xs font-semibold text-slate-400">
                              View only
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="px-3 text-sm font-semibold text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>

      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingId || currentReport
                    ? "Edit Logistic Report"
                    : "Submit Logistic Report"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  One report can be submitted per employee for a date.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(editingId || currentReport) && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    New
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeReportModal}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                  aria-label="Close report modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form
              className="min-h-0 overflow-y-auto px-6 py-5"
              onSubmit={handleSubmit}
            >
              <div className="space-y-4">
                <InputField
                  label="Report Date"
                  type="date"
                  value={form.reportDate}
                  onChange={(value) => handleFormChange("reportDate", value)}
                  required
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  {REPORT_FIELDS.map((field) => (
                    <InputField
                      key={field.key}
                      label={field.label}
                      type="number"
                      min="0"
                      step="1"
                      value={form[field.key]}
                      onChange={(value) => handleFormChange(field.key, value)}
                    />
                  ))}
                </div>
              </div>

              <div className="sticky bottom-0 mt-6 flex justify-end border-t border-slate-100 bg-white pt-4">
                <button
                  type="submit"
                  disabled={creating || updating}
                  className="inline-flex h-11 min-w-[180px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  <Save size={16} />
                  {creating || updating
                    ? "Saving..."
                    : editingId || currentReport
                      ? "Update Report"
                      : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </HrmWorkspace>
  );
};

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 12,
    borderColor: state.isFocused ? "#6366f1" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 4px rgb(99 102 241 / 0.1)" : "none",
    "&:hover": { borderColor: state.isFocused ? "#6366f1" : "#cbd5e1" },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 12,
    overflow: "hidden",
    zIndex: 50,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#4f46e5"
      : state.isFocused
        ? "#eef2ff"
        : "#fff",
    color: state.isSelected ? "#fff" : "#0f172a",
  }),
};

const InputField = ({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  ...props
}) => (
  <label className="block">
    <div className="mb-2 text-sm font-semibold text-slate-700">
      {label}
      {required ? " *" : ""}
    </div>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
      {...props}
    />
  </label>
);

export default LogisticWorkReportManager;
