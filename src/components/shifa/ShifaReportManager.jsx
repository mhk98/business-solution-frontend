import { useEffect, useMemo, useState } from "react";
import {
  Edit3,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Select from "react-select";
import toast from "react-hot-toast";
import DateRangeFilter from "../common/DateRangeFilter";
import {
  useCreateShifaReportMutation,
  useDeleteShifaReportMutation,
  useGetAllShifaReportsQuery,
  useGetMyShifaReportsQuery,
  useUpdateShifaReportMutation,
} from "../../features/shifaReport/shifaReport";
import useDebounce from "../../hooks/useDebounce";

const today = new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

export const SHIFA_REPORT_CONFIG = {
  call_history: {
    title: "Call History",
    eyebrow: "Shifa",
    permissionKey: "shifa_call_history",
    path: "/shifa/call-history",
    primaryField: "callHistory",
    primaryLabel: "Call History",
    description: "Record patient calls, caller information, and follow-up notes.",
  },
  starting_situation: {
    title: "Starting Situation",
    eyebrow: "Shifa",
    permissionKey: "shifa_starting_situation",
    path: "/shifa/starting-situation",
    primaryField: "startingSituation",
    primaryLabel: "Starting Situation",
    description: "Capture the patient's first condition and starting context.",
  },
  problem_history: {
    title: "Problem History",
    eyebrow: "Shifa",
    permissionKey: "shifa_problem_history",
    path: "/shifa/problem-history",
    primaryField: "problemHistory",
    primaryLabel: "Problem History",
    description: "Track symptoms, previous problems, and relevant history.",
  },
  patient_update: {
    title: "Patient Update",
    eyebrow: "Shifa",
    permissionKey: "shifa_patient_update",
    path: "/shifa/patient-update",
    primaryField: "patientUpdate",
    primaryLabel: "Patient Update",
    description: "Maintain patient progress updates and next follow-up plans.",
  },
};

const CALL_HISTORY_FIELDS = [
  { key: "phoneCalled", label: "ফোন করা হয়েছে" },
  { key: "phoneNotReceived", label: "ফোন রিসিভ করেনি" },
  { key: "phoneOff", label: "ফোন বন্ধ" },
  { key: "numberBusy", label: "নাম্বার ব্যস্ত" },
  { key: "refusedCall", label: "ফোন দিতে না করেছে" },
  { key: "callCut", label: "ফোন কেটে দিয়েছে" },
];

const SHIFA_FIELD_GROUPS = {
  call_history: CALL_HISTORY_FIELDS,
  starting_situation: [
    { key: "started", label: "শুরু করেছে" },
    { key: "notStarted", label: "শুরু করেনি" },
    { key: "startingOther", label: "অন্যান্য" },
  ],
  problem_history: [
    { key: "spousePractice", label: "স্বামী স্ত্রীর আমল" },
    { key: "evilEye", label: "বদনজর" },
    { key: "marriageObstacle", label: "বিবাহে বাধা" },
    { key: "livelihoodObstacle", label: "রিজিকে বাধা" },
    { key: "jinnAndMagic", label: "জীন ও জাদু" },
    { key: "separation", label: "বিচ্ছেদ" },
    { key: "noChild", label: "বাচ্চা হয় না" },
    { key: "problemOther", label: "অন্যান্য" },
  ],
  patient_update: [
    { key: "improving", label: "উন্নতি পাচ্ছে" },
    { key: "notImproving", label: "উন্নতি পাচ্ছে না" },
  ],
};

const EMPTY_FORM = {
  reportDate: today,
  name: "",
  phone: "",
  age: "",
  gender: "",
  address: "",
  callerName: "",
  relation: "",
  callHistory: "",
  phoneCalled: "",
  phoneNotReceived: "",
  phoneOff: "",
  numberBusy: "",
  refusedCall: "",
  callCut: "",
  started: "",
  notStarted: "",
  startingOther: "",
  spousePractice: "",
  evilEye: "",
  marriageObstacle: "",
  livelihoodObstacle: "",
  jinnAndMagic: "",
  separation: "",
  noChild: "",
  problemOther: "",
  improving: "",
  notImproving: "",
  startingSituation: "",
  problemHistory: "",
  patientUpdate: "",
  notes: "",
  nextFollowUpDate: "",
};

const ShifaReportManager = ({ reportType }) => {
  const config = SHIFA_REPORT_CONFIG[reportType];
  const role = localStorage.getItem("role") || "user";
  const canManageReports = ["superAdmin", "admin"].includes(role);
  const currentUserId = Number(localStorage.getItem("userId") || 0);
  const pageSize = 10;

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [fromDate, setFromDate] = useState(thirtyDaysAgo);
  const [toDate, setToDate] = useState(today);
  const [currentPage, setCurrentPage] = useState(1);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const listQueryArgs = useMemo(
    () => ({
      page: currentPage,
      limit: pageSize,
      reportType,
      searchTerm: debouncedSearchTerm || undefined,
      name: selectedPatient?.value || undefined,
      startDate: fromDate || undefined,
      endDate: toDate || undefined,
    }),
    [
      currentPage,
      debouncedSearchTerm,
      fromDate,
      reportType,
      selectedPatient,
      toDate,
    ],
  );

  const patientOptionArgs = useMemo(
    () => ({
      page: 1,
      limit: 1000,
      reportType,
      startDate: fromDate || undefined,
      endDate: toDate || undefined,
    }),
    [fromDate, reportType, toDate],
  );

  const {
    data: myReportsRes,
    isLoading: myReportsLoading,
    refetch: refetchMine,
  } = useGetMyShifaReportsQuery(listQueryArgs, { skip: canManageReports });
  const {
    data: allReportsRes,
    isLoading: allReportsLoading,
    refetch: refetchAll,
  } = useGetAllShifaReportsQuery(listQueryArgs, { skip: !canManageReports });
  const { data: myPatientOptionsRes } = useGetMyShifaReportsQuery(
    patientOptionArgs,
    { skip: canManageReports },
  );
  const { data: allPatientOptionsRes } = useGetAllShifaReportsQuery(
    patientOptionArgs,
    { skip: !canManageReports },
  );

  const [createReport, { isLoading: creating }] =
    useCreateShifaReportMutation();
  const [updateReport, { isLoading: updating }] =
    useUpdateShifaReportMutation();
  const [deleteReport, { isLoading: deleting }] =
    useDeleteShifaReportMutation();

  const reportRes = canManageReports ? allReportsRes : myReportsRes;
  const reports = reportRes?.data || [];
  const reportMeta = reportRes?.meta || {};
  const totalReports = reportMeta?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalReports / pageSize));
  const isLoading = myReportsLoading || allReportsLoading;
  const activeFields = SHIFA_FIELD_GROUPS[reportType] || [];
  const tableColSpan = activeFields.length + 2;

  const patientOptions = useMemo(() => {
    const optionRes = canManageReports ? allPatientOptionsRes : myPatientOptionsRes;
    return Array.from(
      new Set((optionRes?.data || []).map((row) => row?.name).filter(Boolean)),
    ).map((name) => ({ value: name, label: name }));
  }, [allPatientOptionsRes, canManageReports, myPatientOptionsRes]);

  const refetchReports = () => {
    if (canManageReports) refetchAll();
    else refetchMine();
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, reportDate: today });
  };

  const handleFormChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayload = () => {
    return {
      reportDate: form.reportDate,
      reportType,
      ...activeFields.reduce(
        (acc, field) => ({ ...acc, [field.key]: form[field.key] || 0 }),
        {},
      ),
      details: {
        source: config.title,
      },
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const payload = buildPayload();
      const res = editingId
        ? await updateReport({ id: editingId, data: payload }).unwrap()
        : await createReport(payload).unwrap();

      if (res?.success) {
        toast.success(editingId ? "Shifa report updated" : "Shifa report submitted");
        resetForm();
        setIsReportModalOpen(false);
        refetchReports();
      }
    } catch (err) {
      toast.error(err?.data?.message || err?.error || "Failed to save shifa report");
    }
  };

  const handleEdit = (row) => {
    setEditingId(row.Id);
    setForm({
      ...EMPTY_FORM,
      reportDate: row.reportDate || today,
      name: row.name || "",
      phone: row.phone || "",
      age: row.age || "",
      gender: row.gender || "",
      address: row.address || "",
      callerName: row.callerName || "",
      relation: row.relation || "",
      callHistory: row.callHistory || "",
      startingSituation: row.startingSituation || "",
      problemHistory: row.problemHistory || "",
      patientUpdate: row.patientUpdate || "",
      phoneCalled: row.phoneCalled ?? "",
      phoneNotReceived: row.phoneNotReceived ?? "",
      phoneOff: row.phoneOff ?? "",
      numberBusy: row.numberBusy ?? "",
      refusedCall: row.refusedCall ?? "",
      callCut: row.callCut ?? "",
      started: row.started ?? "",
      notStarted: row.notStarted ?? "",
      startingOther: row.startingOther ?? "",
      spousePractice: row.spousePractice ?? "",
      evilEye: row.evilEye ?? "",
      marriageObstacle: row.marriageObstacle ?? "",
      livelihoodObstacle: row.livelihoodObstacle ?? "",
      jinnAndMagic: row.jinnAndMagic ?? "",
      separation: row.separation ?? "",
      noChild: row.noChild ?? "",
      problemOther: row.problemOther ?? "",
      improving: row.improving ?? "",
      notImproving: row.notImproving ?? "",
      notes: row.notes || "",
      nextFollowUpDate: row.nextFollowUpDate || "",
    });
    setIsReportModalOpen(true);
  };

  const handleDelete = async (row) => {
    const ok = window.confirm("Delete this shifa report?");
    if (!ok) return;

    try {
      const res = await deleteReport(row.Id).unwrap();
      if (res?.success) {
        toast.success("Shifa report deleted");
        if (editingId === row.Id) resetForm();
        refetchReports();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete shifa report");
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedPatient, fromDate, toDate, reportType]);

  if (!config) return null;

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
              {config.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              {config.title}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {config.description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus size={16} />
            Add Report
          </button>
        </div>

      </section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {canManageReports ? `All ${config.title}` : `My ${config.title}`}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {canManageReports
                ? "Search by employee and filter with start and end date."
                : "Your own reports are shown for the selected date range."}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
            Showing {reports.length} of {totalReports}
          </div>
        </div>

        <div
          className={`mt-5 grid items-start gap-3 ${
            canManageReports
              ? "xl:grid-cols-[260px_minmax(260px,1fr)_minmax(320px,520px)]"
              : "xl:grid-cols-[minmax(260px,1fr)_minmax(320px,520px)]"
          }`}
        >
          {canManageReports && (
            <Select
              value={selectedPatient}
              onChange={setSelectedPatient}
              options={patientOptions}
              isClearable
              placeholder="Select employee"
              className="text-sm text-slate-900"
              styles={selectStyles}
            />
          )}
          <label className="relative block h-11 self-start">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search something..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>
          <DateRangeFilter
            startDate={fromDate}
            endDate={toDate}
            onStartDateChange={setFromDate}
            onEndDateChange={setToDate}
            defaultFilter="last30"
            label=""
            compact
            className="min-w-0 self-start"
          />
        </div>

        <div className="mt-5 max-w-full overflow-x-auto rounded-2xl border border-slate-200">
          <table className={`${activeFields.length > 4 ? "min-w-[1500px]" : "min-w-[900px]"} w-full divide-y divide-slate-200 text-left text-sm`}>
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                {activeFields.map((field) => (
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
                  <td colSpan={tableColSpan} className="px-4 py-10 text-center text-slate-500">
                    Loading reports...
                  </td>
                </tr>
              )}
              {!isLoading && reports.length === 0 && (
                <tr>
                  <td colSpan={tableColSpan} className="px-4 py-10 text-center text-slate-500">
                    No shifa report found.
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
                      {activeFields.map((field) => (
                        <td key={field.key} className="px-4 py-3">
                          {row[field.key] || 0}
                        </td>
                      ))}
                      <td className="sticky right-0 bg-white px-4 py-3 shadow-[-10px_0_16px_-16px_rgba(15,23,42,0.65)] group-hover:bg-slate-50">
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
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </section>

      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingId ? `Edit ${config.title}` : `Submit ${config.title}`}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Report date is required. Fill the section counts from the marked fields.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {editingId && (
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
                  onClick={() => setIsReportModalOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                  aria-label="Close report modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form className="min-h-0 overflow-y-auto px-6 py-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Report Date"
                  type="date"
                  value={form.reportDate}
                  onChange={(value) => handleFormChange("reportDate", value)}
                  required
                />
                {activeFields.map((field) => (
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

              <div className="sticky bottom-0 mt-6 flex justify-end border-t border-slate-100 bg-white pt-4">
                <button
                  type="submit"
                  disabled={creating || updating}
                  className="inline-flex h-11 min-w-[180px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  <Save size={16} />
                  {creating || updating
                    ? "Saving..."
                    : editingId
                      ? "Update Report"
                      : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
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
      onChange={(event) => onChange(event.target.value)}
      required={required}
      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
      {...props}
    />
  </label>
);

export default ShifaReportManager;
