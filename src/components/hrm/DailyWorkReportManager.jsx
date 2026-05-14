import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  BarChart3,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Eye,
  FileText,
  Plus,
  Save,
  Search,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import HrmWorkspace from "./HrmWorkspace";
import {
  useCreateDailyWorkReportMutation,
  useGetAllDailyWorkReportsQuery,
  useGetDailyWorkAdminDashboardQuery,
  useGetDailyWorkEligibleSubmittersQuery,
  useGetDailyWorkEmployeeDashboardQuery,
  useGetDailyWorkReportLeaderboardQuery,
  useGetMyDailyWorkReportsQuery,
  useReviewDailyWorkReportMutation,
  useSendDailyWorkReportRemindersMutation,
  useUpdateDailyWorkReportMutation,
} from "../../features/dailyWorkReport/dailyWorkReport";
import useDebounce from "../../hooks/useDebounce";


const today = new Date().toISOString().slice(0, 10);
const EMPTY_WORK_ENTRY = {
  taskId: null,
  taskSource: "Self-created",
  taskTitle: "",
  taskDescription: "",
  taskCategory: "",
  priority: "Medium",
  status: "Completed",
  startTime: "",
  endTime: "",
  outputResult: "",
  blockerProblem: "",
  selfRating: 3,
  progressPercent: 100,
  timeSpentMinutes: 0,
  dueDate: "",
  isDueToday: false,
};

const EMPTY_FORM = {
  reportDate: today,
  workStartTime: "09:00",
  workEndTime: "18:00",
  totalWorkingHours: 9,
  todayWork: "",
  tomorrowPlan: "",
  blockers: "",
  tasks: [],
};

const WORK_CATEGORIES = [
  "Web Development",
  "Graphics Design",
  "Digital Marketing",
  "Video Editing",
  "Customer Service",
  "Accounts",
  "Inventory",
  "Other",
];

const STATUS_PROGRESS = {
  Completed: 100,
  Partial: 50,
  Pending: 0,
  Blocked: 25,
  Failed: 0,
};

const EVALUATION_WEIGHTS = [
  { label: "Task Completion", value: "45%", note: "Status অনুযায়ী কাজ কতটা শেষ হয়েছে" },
  { label: "Productivity", value: "25%", note: "Working hours অনুযায়ী completed work units" },
  { label: "Consistency", value: "15%", note: "নিয়মিত daily report submit করা" },
  { label: "Task Quality", value: "10%", note: "Clear title, result, blocker details" },
  { label: "Initiative", value: "5%", note: "নিজে থেকে কাজ করা এবং blocker explain করা" },
];

const STATUS_GUIDE = [
  { label: "Completed", value: "100%", tone: "emerald" },
  { label: "Partial", value: "50%", tone: "amber" },
  { label: "Blocked", value: "25%", tone: "violet" },
  { label: "Pending", value: "0%", tone: "slate" },
  { label: "Failed", value: "0%", tone: "rose" },
];

const statusStyles = {
  Submitted: "border-sky-200 bg-sky-50 text-sky-700",
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Rejected: "border-rose-200 bg-rose-50 text-rose-700",
  Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Failed: "border-rose-200 bg-rose-50 text-rose-700",
  Hold: "border-violet-200 bg-violet-50 text-violet-700",
  Blocked: "border-violet-200 bg-violet-50 text-violet-700",
};

const getEmployeeName = (row) =>
  row?.employee?.name ||
  `${row?.user?.FirstName || ""} ${row?.user?.LastName || ""}`.trim() ||
  row?.user?.Email ||
  "Unknown";

const toInputTime = (value) => String(value || "").slice(0, 5);

const calculateHours = (start, end) => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return minutes > 0 ? Number((minutes / 60).toFixed(2)) : 0;
};

const buildWorkSummary = (entries) =>
  entries
    .map((entry, index) => {
      const result = entry.outputResult || entry.status;
      return `${index + 1}. ${entry.taskTitle} - ${result}`;
    })
    .join("\n");

const DailyWorkReportManager = () => {
  const role = localStorage.getItem("role") || "user";
  const canManageReports = ["superAdmin", "admin"].includes(role);
  const canSubmitReports = role !== "employee";
  const [activePanel, setActivePanel] = useState("admin");
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    managerRemarks: "",
    status: "Approved",
  });
  const [leaderboardPeriod, setLeaderboardPeriod] = useState("daily");

  const myCurrentQueryArgs = useMemo(
    () => ({ page: 1, limit: 1, reportDate: form.reportDate }),
    [form.reportDate],
  );
  const adminQueryArgs = useMemo(
    () => ({
      page: currentPage,
      limit: 10,
      searchTerm: debouncedSearchTerm || undefined,
      startDate: fromDate || undefined,
      endDate: toDate || undefined,
      userId: selectedEmployeeId || undefined,
      departmentId: selectedDepartmentId || undefined,
      taskStatus: selectedStatus || undefined,
    }),
    [
      currentPage,
      searchTerm,
      fromDate,
      toDate,
      selectedEmployeeId,
      selectedDepartmentId,
      selectedStatus,
    ],
  );

  const { data: submitterListRes } = useGetDailyWorkEligibleSubmittersQuery(undefined, {
    skip: !canManageReports,
  });
  const {
    data: currentReportRes,
    isLoading: currentReportLoading,
    refetch: refetchCurrent,
  } = useGetMyDailyWorkReportsQuery(myCurrentQueryArgs);
  const {
    data: adminReportsRes,
    isLoading: adminReportsLoading,
    refetch: refetchAdminReports,
  } = useGetAllDailyWorkReportsQuery(adminQueryArgs, {
    skip: !canManageReports,
  });
  const { data: employeeDashboardRes } =
    useGetDailyWorkEmployeeDashboardQuery();
  const { data: adminDashboardRes } = useGetDailyWorkAdminDashboardQuery(
    { date: toDate },
    { skip: !canManageReports },
  );
  const { data: leaderboardRes } = useGetDailyWorkReportLeaderboardQuery({
    period: leaderboardPeriod,
    date: toDate,
  });

  const [createReport, { isLoading: creating }] =
    useCreateDailyWorkReportMutation();
  const [updateReport, { isLoading: updating }] =
    useUpdateDailyWorkReportMutation();
  const [reviewReport, { isLoading: reviewing }] =
    useReviewDailyWorkReportMutation();
  const [sendReminders, { isLoading: sendingReminders }] =
    useSendDailyWorkReportRemindersMutation();
  const currentReport = currentReportRes?.data?.[0];
  const reports = canManageReports ? adminReportsRes?.data || [] : [];
  const reportMeta = adminReportsRes?.meta || {};
  const totalPages = Math.max(1, Math.ceil((reportMeta.count || 0) / 10));
  const employeeDashboard = employeeDashboardRes?.data || {};
  const adminDashboard = adminDashboardRes?.data || {};
  const leaderboard = leaderboardRes?.data || [];
  const employeeOptions = submitterListRes?.data || [];
  const departmentOptions = useMemo(() => {
    const map = new Map();
    employeeOptions.forEach((employee) => {
      const department = employee.department || employee.employeeProfile?.department;
      if (department?.Id) map.set(department.Id, department.name);
    });
    return Array.from(map, ([Id, name]) => ({ Id, name }));
  }, [employeeOptions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    fromDate,
    toDate,
    selectedEmployeeId,
    selectedDepartmentId,
    selectedStatus,
  ]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      totalWorkingHours: calculateHours(prev.workStartTime, prev.workEndTime),
    }));
  }, [form.workStartTime, form.workEndTime]);

  useEffect(() => {
    if (!currentReport) {
      setForm((prev) => ({
        ...EMPTY_FORM,
        reportDate: prev.reportDate,
      }));
      return;
    }

    setForm({
      reportDate: currentReport.reportDate,
      workStartTime: toInputTime(currentReport.workStartTime) || "09:00",
      workEndTime: toInputTime(currentReport.workEndTime) || "18:00",
      totalWorkingHours: Number(currentReport.totalWorkingHours || 0),
      todayWork: currentReport.todayWork || "",
      tomorrowPlan: currentReport.tomorrowPlan || "",
      blockers: currentReport.blockers || "",
      tasks: currentReport.tasks?.length
        ? currentReport.tasks.map((task) => ({
            taskTitle: task.taskTitle || "",
            taskDescription: task.taskDescription || "",
            taskCategory: task.taskCategory || "",
            priority: task.priority || "Medium",
            status: task.status || "Completed",
            startTime: toInputTime(task.startTime),
            endTime: toInputTime(task.endTime),
            outputResult: task.outputResult || "",
            blockerProblem: task.blockerProblem || "",
            selfRating: task.selfRating || 3,
            taskId: null,
            taskSource: "Self-created",
            progressPercent: Number(task.progressPercent ?? 100),
            timeSpentMinutes: Number(task.timeSpentMinutes || 0),
            dueDate: task.dueDate || "",
            isDueToday: Boolean(task.isDueToday),
          }))
        : [],
    });
  }, [currentReport?.Id]);

  const handleFormChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleWorkEntryChange = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      tasks: prev.tasks.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              [key]: value,
              ...(key === "status"
                ? { progressPercent: STATUS_PROGRESS[value] ?? entry.progressPercent }
                : {}),
            }
          : entry,
      ),
    }));
  };

  const addWorkEntry = () => {
    setForm((prev) => ({
      ...prev,
      tasks: [...prev.tasks, { ...EMPTY_WORK_ENTRY }],
    }));
  };

  const removeWorkEntry = (index) => {
    setForm((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, entryIndex) => entryIndex !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        todayWork: form.todayWork || buildWorkSummary(form.tasks),
        totalWorkingHours: calculateHours(form.workStartTime, form.workEndTime),
      };
      const res = currentReport
        ? await updateReport({ id: currentReport.Id, data: payload }).unwrap()
        : await createReport(payload).unwrap();

      if (res?.success) {
        toast.success(currentReport ? "Report updated" : "Report submitted");
        refetchCurrent();
        if (canManageReports) refetchAdminReports();
      }
    } catch (err) {
      toast.error(err?.data?.message || err?.error || "Failed to save report");
    }
  };

  const handleReview = async () => {
    if (!selectedReport) return;
    try {
      const res = await reviewReport({
        id: selectedReport.Id,
        data: reviewForm,
      }).unwrap();
      if (res?.success) {
        toast.success("Evaluation saved");
        setSelectedReport(null);
        refetchAdminReports();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save evaluation");
    }
  };

  const handleSendReminders = async () => {
    try {
      const res = await sendReminders({ reportDate: toDate }).unwrap();
      toast.success(
        res?.data?.reminderCount
          ? `${res.data.reminderCount} reminders sent`
          : "No pending submitter found",
      );
    } catch (err) {
      toast.error(err?.data?.message || "Failed to send reminders");
    }
  };

  const stats = [
    {
      name: "Today Reports",
      value: canManageReports
        ? adminDashboard.totalReportsToday || 0
        : currentReport
          ? 1
          : 0,
      icon: ClipboardCheck,
      iconBg: "#EEF2FF",
      iconColor: "#4338CA",
    },
    {
      name: canManageReports ? "Pending Reviews" : "Monthly Average",
      value: canManageReports
        ? adminDashboard.pendingReviewReports || 0
        : `${employeeDashboard.monthlyAverageScore || 0}/100`,
      icon: CalendarDays,
      iconBg: "#ECFDF5",
      iconColor: "#047857",
    },
  ];

  return (
    <HrmWorkspace
      eyebrow="Performance Standard"
      title="Daily Work Reports"
      description="Eligible team members submit structured daily work, managers review reports, and the system calculates daily, weekly, and monthly performance."
      stats={stats}
    >
      {canManageReports && (
        <PanelSwitch activePanel={activePanel} onPanelChange={setActivePanel} />
      )}

      {canSubmitReports && (!canManageReports || activePanel === "daily") && (
        <div className="grid gap-6">
          <ReportForm
            form={form}
            currentReport={currentReport}
            currentReportLoading={currentReportLoading}
            onFormChange={handleFormChange}
            onWorkEntryChange={handleWorkEntryChange}
            onAddWorkEntry={addWorkEntry}
            onRemoveWorkEntry={removeWorkEntry}
            onSubmit={handleSubmit}
            isSaving={creating || updating}
          />
        </div>
      )}

      {!canSubmitReports && (
        <EmptyState text="Daily work reports are enabled for non-employee roles only." />
      )}

      {canManageReports && activePanel === "admin" && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <AdminDashboard
            dashboard={adminDashboard}
            leaderboard={leaderboard}
            leaderboardPeriod={leaderboardPeriod}
            onLeaderboardPeriodChange={setLeaderboardPeriod}
          />
          <AdminReviewPanel
            reports={reports}
            isLoading={adminReportsLoading}
            reportMeta={reportMeta}
            totalPages={totalPages}
            currentPage={currentPage}
            filters={{
              searchTerm,
              fromDate,
              toDate,
              selectedEmployeeId,
              selectedDepartmentId,
              selectedStatus,
            }}
            employeeOptions={employeeOptions}
            departmentOptions={departmentOptions}
            onFilterChange={{
              setSearchTerm,
              setFromDate,
              setToDate,
              setSelectedEmployeeId,
              setSelectedDepartmentId,
              setSelectedStatus,
              setCurrentPage,
            }}
            onViewReport={(report) => {
              setSelectedReport(report);
              setReviewForm({
                managerRemarks:
                  report.evaluation?.managerRemarks ||
                  report.reviewNote ||
                  "",
                status:
                  report.evaluation?.status === "Rejected"
                    ? "Rejected"
                    : "Approved",
              });
            }}
            onSendReminders={handleSendReminders}
            sendingReminders={sendingReminders}
          />
        </div>
      )}

      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          reviewForm={reviewForm}
          setReviewForm={setReviewForm}
          onClose={() => setSelectedReport(null)}
          onReview={handleReview}
          reviewing={reviewing}
        />
      )}
    </HrmWorkspace>
  );
};

const PanelSwitch = ({ activePanel, onPanelChange }) => {
  const panels = [
    {
      key: "admin",
      label: "Admin Panel",
      icon: Users,
    },
    {
      key: "daily",
      label: "Daily Report Panel",
      icon: FileText,
    },
  ];

  return (
    <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      {panels.map((panel) => {
        const Icon = panel.icon;
        const active = activePanel === panel.key;

        return (
          <button
            key={panel.key}
            type="button"
            onClick={() => onPanelChange(panel.key)}
            className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
              active
                ? "border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm"
                : "border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Icon size={16} />
            {panel.label}
          </button>
        );
      })}
    </div>
  );
};

const ReportForm = ({
  form,
  currentReport,
  currentReportLoading,
  onFormChange,
  onWorkEntryChange,
  onAddWorkEntry,
  onRemoveWorkEntry,
  onSubmit,
  isSaving,
}) => (
  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="text-lg font-bold text-slate-900">
          Submit Daily Report
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Add independent work rows with output, progress, time, and blockers.
        </p>
      </div>
      <Badge value={currentReport ? currentReport.status : "New"} />
    </div>

    {currentReportLoading ? (
      <EmptyState text="Loading report..." />
    ) : (
      <form className="mt-6 space-y-5" onSubmit={onSubmit}>
        <EvaluationGuide />

        <div className="grid gap-3 md:grid-cols-4">
          <Input
            label="Date"
            type="date"
            value={form.reportDate}
            onChange={(value) => onFormChange("reportDate", value)}
          />
          <Input
            label="Work Start"
            type="time"
            value={form.workStartTime}
            onChange={(value) => onFormChange("workStartTime", value)}
          />
          <Input
            label="Work End"
            type="time"
            value={form.workEndTime}
            onChange={(value) => onFormChange("workEndTime", value)}
          />
          <Input
            label="Total Hours"
            type="number"
            value={form.totalWorkingHours}
            onChange={(value) => onFormChange("totalWorkingHours", value)}
            readOnly
          />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-bold text-slate-900">Work Entries</div>
            <button
              type="button"
              onClick={onAddWorkEntry}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700"
            >
              <Plus size={15} /> Add Work Row
            </button>
          </div>

          {form.tasks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Add at least one work row to calculate a meaningful performance score.
            </div>
          )}

          {form.tasks.map((entry, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-slate-800">
                  Work Row #{index + 1}
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveWorkEntry(index)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1.5fr_0.9fr_0.8fr_0.9fr]">
                <Input
                  label="Work Title"
                  value={entry.taskTitle}
                  onChange={(value) => onWorkEntryChange(index, "taskTitle", value)}
                  required
                />
                <SelectInput
                  label="Work Category"
                  value={entry.taskCategory}
                  onChange={(value) => onWorkEntryChange(index, "taskCategory", value)}
                  options={WORK_CATEGORIES}
                />
                <SelectInput
                  label="Status"
                  value={entry.status}
                  onChange={(value) => onWorkEntryChange(index, "status", value)}
                  options={["Completed", "Partial", "Pending", "Blocked", "Failed"]}
                />
                <Input
                  label="Time Spent (minutes)"
                  type="number"
                  value={entry.timeSpentMinutes}
                  min="0"
                  onChange={(value) =>
                    onWorkEntryChange(index, "timeSpentMinutes", Number(value))
                  }
                />
              </div>

              <details className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  More details
                </summary>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Input
                    label="Actual Output / Result"
                    value={entry.outputResult}
                    onChange={(value) => onWorkEntryChange(index, "outputResult", value)}
                  />
                  <Input
                    label="Blocker / Problem"
                    value={entry.blockerProblem}
                    onChange={(value) =>
                      onWorkEntryChange(index, "blockerProblem", value)
                    }
                  />
                </div>
              </details>
            </div>
          ))}
        </div>

        <TextArea
          label="Tomorrow Plan"
          value={form.tomorrowPlan}
          onChange={(value) => onFormChange("tomorrowPlan", value)}
          required
        />
        <TextArea
          label="General Blockers"
          value={form.blockers}
          onChange={(value) => onFormChange("blockers", value)}
        />

        <button
          type="submit"
          disabled={isSaving || form.tasks.length === 0}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 sm:w-auto"
        >
          <Save size={16} />
          {isSaving
            ? "Saving..."
            : currentReport
              ? "Update Report"
              : form.tasks.length === 0
                ? "Add work row first"
                : "Submit Report"}
        </button>
      </form>
    )}
  </section>
);

const EvaluationGuide = () => (
  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-sky-700">
          <Award size={13} /> Evaluation Guide
        </div>
        <h4 className="mt-3 text-base font-black text-slate-900">
          Performance score যেভাবে calculate হয়
        </h4>
        <p className="mt-1 text-sm text-slate-600">
          Submitter শুধু কাজের row submit করবে। Status, time, result, blocker,
          এবং নিয়মিত submission থেকে score automatic হবে।
        </p>
      </div>
      <div className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm">
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
          Progress by Status
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {STATUS_GUIDE.map((item) => (
            <span
              key={item.label}
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                item.tone === "emerald"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : item.tone === "amber"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : item.tone === "violet"
                      ? "border-violet-200 bg-violet-50 text-violet-700"
                      : item.tone === "rose"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {item.label} {item.value}
            </span>
          ))}
        </div>
      </div>
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-5">
      {EVALUATION_WEIGHTS.map((item) => (
        <div key={item.label} className="rounded-2xl border border-sky-100 bg-white p-3">
          <div className="text-xl font-black text-slate-900">{item.value}</div>
          <div className="mt-1 text-sm font-bold text-slate-800">{item.label}</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">{item.note}</div>
        </div>
      ))}
    </div>

    <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
      <div className="rounded-2xl border border-sky-100 bg-white p-3">
        <div className="font-bold text-slate-900">Score বাড়ে</div>
        <p className="mt-1">
          Clear work title, correct status, actual result, এবং realistic time দিলে।
        </p>
      </div>
      <div className="rounded-2xl border border-sky-100 bg-white p-3">
        <div className="font-bold text-slate-900">Blocked হলে</div>
        <p className="mt-1">
          Blocker/problem লিখলে quality fair থাকে। খালি রাখলে score কমে।
        </p>
      </div>
      <div className="rounded-2xl border border-sky-100 bg-white p-3">
        <div className="font-bold text-slate-900">Manager mark দেয় না</div>
        <p className="mt-1">
          Manager শুধু approve/reject ও remarks দিতে পারে। Mark automatic.
        </p>
      </div>
    </div>
  </div>
);

const EmployeeDashboard = ({ dashboard, currentReport }) => (
  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
        <BarChart3 size={18} />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-900">My Performance Dashboard</h3>
        <p className="mt-1 text-sm text-slate-500">
          Personal score, weekly trend, monthly average, and manager feedback.
        </p>
      </div>
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <ScoreCard
        label="Today Score"
        value={
          currentReport?.performanceScore?.finalScore ||
          dashboard.personalPerformanceScore ||
          0
        }
      />
      <ScoreCard
        label="Monthly Avg"
        value={dashboard.monthlyAverageScore || 0}
      />
      <MetricCard
        label="Reports"
        value={dashboard.previousReports?.length || 0}
      />
    </div>

    <div className="mt-5">
      <div className="mb-3 text-sm font-bold text-slate-900">
        Weekly Score Trend
      </div>
      <div className="space-y-2">
        {(dashboard.weeklyScoreTrend || []).map((item) => (
          <ProgressRow
            key={item.date}
            label={item.date}
            value={Number(item.score || 0)}
          />
        ))}
        {!dashboard.weeklyScoreTrend?.length && (
          <EmptyState text="No score trend yet." />
        )}
      </div>
    </div>

    <div className="mt-5">
      <div className="mb-3 text-sm font-bold text-slate-900">
        Manager Feedback
      </div>
      <div className="space-y-2">
        {(dashboard.managerFeedback || [])
          .slice(0, 4)
          .map((feedback, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="text-xs font-semibold text-slate-500">
                {feedback.reportDate}
              </div>
              <div className="mt-1 text-sm text-slate-700">
                {feedback.remarks}
              </div>
            </div>
          ))}
        {!dashboard.managerFeedback?.length && (
          <EmptyState text="No manager feedback yet." />
        )}
      </div>
    </div>
  </section>
);

const AdminDashboard = ({
  dashboard,
  leaderboard,
  leaderboardPeriod,
  onLeaderboardPeriodChange,
}) => (
  // <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
  <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
        <Users size={18} />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-900">
          Admin Performance Dashboard
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Submission health, review queue, best performers, and low performers.
        </p>
      </div>
    </div>

    <div className="mt-5 grid gap-3 md:grid-cols-4">
      <MetricCard
        label="Today Reports"
        value={dashboard.totalReportsToday || 0}
      />
      <MetricCard
        label="Pending Review"
        value={dashboard.pendingReviewReports || 0}
      />
      <MetricCard
        label="Not Submitted"
        value={dashboard.reportsNotSubmittedToday || 0}
      />
      <MetricCard
        label="Active Submitters"
        value={dashboard.activeEmployees || 0}
      />
    </div>

    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm font-bold text-slate-900">Leaderboard</div>
      <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        {["daily", "weekly", "monthly"].map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => onLeaderboardPeriodChange(period)}
            className={`h-8 rounded-lg px-3 text-xs font-semibold capitalize ${
              leaderboardPeriod === period
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500"
            }`}
          >
            {period}
          </button>
        ))}
      </div>
    </div>

    <div className="mt-3 space-y-3">
      {leaderboard.slice(0, 5).map((row) => (
        <LeaderboardRow key={`${row.userId}-${row.rank}`} row={row} />
      ))}
      {!leaderboard.length && <EmptyState text="No leaderboard data yet." />}
    </div>
  </section>
);

const AdminReviewPanel = ({
  reports,
  isLoading,
  reportMeta,
  totalPages,
  currentPage,
  filters,
  employeeOptions,
  departmentOptions,
  onFilterChange,
  onViewReport,
  onSendReminders,
  sendingReminders,
}) => (
  <section className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
          <FileText size={18} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Admin Review Panel
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Filter reports, open details, score quality and initiative, approve
            or reject.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onSendReminders}
        disabled={sendingReminders}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 disabled:opacity-60 sm:w-auto"
      >
        <BellRing size={16} />{" "}
        {sendingReminders ? "Sending..." : "Send Reminder"}
      </button>
    </div>

    <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr]">
      <label className="relative block">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={filters.searchTerm}
          onChange={(e) => onFilterChange.setSearchTerm(e.target.value)}
          placeholder="Search submitter or report"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-black outline-none focus:border-indigo-500"
        />
      </label>
      <FilterSelect
        value={filters.selectedEmployeeId}
        onChange={onFilterChange.setSelectedEmployeeId}
        placeholder="All submitters"
        options={employeeOptions.map((employee) => ({
          value: employee.Id,
          label: `${employee.name}${employee.role ? ` (${employee.role})` : ""}`,
        }))}
      />
      <FilterSelect
        value={filters.selectedDepartmentId}
        onChange={onFilterChange.setSelectedDepartmentId}
        placeholder="All departments"
        options={departmentOptions.map((department) => ({
          value: department.Id,
          label: department.name,
        }))}
      />
      <FilterSelect
        value={filters.selectedStatus}
        onChange={onFilterChange.setSelectedStatus}
        placeholder="All work status"
        options={["Completed", "Partial", "Pending", "Blocked", "Failed"].map((status) => ({
          value: status,
          label: status,
        }))}
      />
      <input
        type="date"
        value={filters.fromDate}
        onChange={(e) => onFilterChange.setFromDate(e.target.value)}
        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-black"
      />
      <input
        type="date"
        value={filters.toDate}
        onChange={(e) => onFilterChange.setToDate(e.target.value)}
        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-black"
      />
    </div>

    <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
      <div className="min-w-[760px]">
      <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.8fr_0.4fr] bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        <div>Submitter</div>
        <div>Date</div>
        <div>Status</div>
        <div>Score</div>
        <div>Tasks</div>
        <div />
      </div>
      {isLoading && <EmptyState text="Loading reports..." />}
      {!isLoading &&
        reports.map((report) => (
          <div
            key={report.Id}
            className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.8fr_0.4fr] items-center border-t border-slate-200 px-4 py-3 text-sm"
          >
            <div>
              <div className="font-bold text-slate-900">
                {getEmployeeName(report)}
              </div>
              <div className="text-xs text-slate-500">
                {report.employee?.department?.name || "-"} •{" "}
                {report.employee?.designation?.name || "-"}
              </div>
            </div>
            <div className="text-slate-600">{report.reportDate}</div>
            <div>
              <Badge value={report.status} />
            </div>
            <div className="font-black text-slate-900">
              {report.performanceScore?.finalScore || 0}/100
            </div>
            <div className="text-slate-600">
              {report.performanceScore?.completedTasks || 0}/
              {report.performanceScore?.totalTasks || report.tasks?.length || 0}{" "}
              done
            </div>
            <button
              type="button"
              onClick={() => onViewReport(report)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700"
            >
              <Eye size={16} />
            </button>
          </div>
        ))}
      {!isLoading && !reports.length && (
        <EmptyState text="No daily work report found." />
      )}
      </div>
    </div>

    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
      <div>
        Showing{" "}
        <span className="font-bold text-slate-900">{reports.length}</span> of{" "}
        <span className="font-bold text-slate-900">
          {reportMeta.count || 0}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            onFilterChange.setCurrentPage((prev) => Math.max(prev - 1, 1))
          }
          disabled={currentPage === 1}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold disabled:opacity-50"
        >
          Prev
        </button>
        <span className="font-bold text-slate-900">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() =>
            onFilterChange.setCurrentPage((prev) =>
              Math.min(prev + 1, totalPages),
            )
          }
          disabled={currentPage === totalPages}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  </section>
);

const ReportDetailModal = ({
  report,
  reviewForm,
  setReviewForm,
  onClose,
  onReview,
  reviewing,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
    <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-5">
        <div>
          <h3 className="text-lg font-black text-slate-900">
            {getEmployeeName(report)}
          </h3>
          <p className="text-sm text-slate-500">
            {report.reportDate} • {report.employee?.department?.name || "-"} •{" "}
            {report.employee?.designation?.name || "-"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <MetricCard label="Hours" value={report.totalWorkingHours || 0} />
            <MetricCard label="Tasks" value={report.tasks?.length || 0} />
            <MetricCard
              label="Completed"
              value={report.performanceScore?.completedTasks || 0}
            />
            <ScoreCard
              label="Final Score"
              value={report.performanceScore?.finalScore || 0}
            />
          </div>

          {(report.tasks || []).map((task, index) => (
            <div
              key={task.Id || index}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-slate-900">
                  {index + 1}. {task.taskTitle}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge value={task.taskSource || "Self-created"} />
                  <Badge value={task.priority} />
                  <Badge value={task.status} />
                </div>
              </div>
              {task.taskId && (
                <div className="mt-2 text-xs font-semibold text-emerald-700">
                  Linked with Task #{task.taskId}
                  {task.linkedTask?.dueDate
                    ? ` • Due ${task.linkedTask.dueDate}`
                    : ""}
                </div>
              )}
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <InfoBlock title="Description" value={task.taskDescription} />
                <InfoBlock title="Output / Result" value={task.outputResult} />
                <InfoBlock
                  title="Blocker"
                  value={task.blockerProblem || "No blocker"}
                />
                <InfoBlock
                  title="Progress Today"
                  value={`${task.progressPercent || 0}%`}
                />
                <InfoBlock
                  title="Time Spent"
                  value={`${task.timeSpentMinutes || 0} minutes`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <CheckCircle2 size={17} /> Report Review
          </div>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            Performance score is calculated automatically from task completion,
            productivity, task quality, consistency, and initiative.
          </div>
          <SelectInput
            label="Review Decision"
            value={reviewForm.status}
            onChange={(value) =>
              setReviewForm((prev) => ({ ...prev, status: value }))
            }
            options={["Approved", "Rejected"]}
          />
          <TextArea
            label="Manager Remarks"
            value={reviewForm.managerRemarks}
            onChange={(value) =>
              setReviewForm((prev) => ({ ...prev, managerRemarks: value }))
            }
          />
          <button
            type="button"
            onClick={onReview}
            disabled={reviewing}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Save size={16} /> {reviewing ? "Saving..." : "Save Evaluation"}
          </button>

          <div className="mt-5 space-y-3">
            <ProgressRow
              label="Task Completion"
              value={Number(report.performanceScore?.taskCompletionScore || 0)}
            />
            <ProgressRow
              label="Productivity"
              value={Number(report.performanceScore?.productivityScore || 0)}
            />
            <ProgressRow
              label="Task Quality"
              value={Number(report.performanceScore?.qualityScore || 0)}
            />
            <ProgressRow
              label="Consistency"
              value={Number(report.performanceScore?.consistencyScore || 0)}
            />
            <ProgressRow
              label="Initiative"
              value={Number(report.performanceScore?.initiativeScore || 0)}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Input = ({
  label,
  value,
  onChange,
  type = "text",
  required,
  readOnly,
  wrapperClassName = "",
  ...props
}) => {
  const inputRef = useRef(null);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const dateTimeClass = ["date", "time"].includes(type)
    ? "date-time-light"
    : "";
  const showTimeIcon = type === "time";
  const [selectedHour = "09", selectedMinute = "00"] = String(value || "09:00")
    .split(":")
    .map((item) => item.padStart(2, "0"));
  const hours = Array.from({ length: 24 }, (_, index) =>
    String(index).padStart(2, "0"),
  );
  const minutes = Array.from({ length: 60 }, (_, index) =>
    String(index).padStart(2, "0"),
  );

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return setIsTimePickerOpen(true);

    input.focus();
    setIsTimePickerOpen(true);

    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
      }
    } catch {
      // The custom picker below is the cross-browser fallback.
    }
  };

  const updateTimePart = (part, nextValue) => {
    const nextHour = part === "hour" ? nextValue : selectedHour;
    const nextMinute = part === "minute" ? nextValue : selectedMinute;
    onChange(`${nextHour}:${nextMinute}`);
  };

  return (
    <div className={`${wrapperClassName} block`}>
      <div className="mb-2 text-sm font-semibold text-slate-700">
        {label}
        {required ? " *" : ""}
      </div>
      <div className="relative">
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={showTimeIcon ? openPicker : undefined}
          required={required}
          readOnly={readOnly}
          className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-black outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 read-only:bg-slate-100 ${
            showTimeIcon ? "pr-10" : ""
          } ${dateTimeClass}`}
          {...props}
        />
        {showTimeIcon ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={openPicker}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-indigo-600"
            tabIndex={-1}
            aria-label={`Open ${label} picker`}
          >
            <Clock3 size={17} />
          </button>
        ) : null}
        {showTimeIcon && isTimePickerOpen ? (
          <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              {label}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedHour}
                onChange={(event) => updateTimePart("hour", event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400"
              >
                {hours.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
              <select
                value={selectedMinute}
                onChange={(event) =>
                  updateTimePart("minute", event.target.value)
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400"
              >
                {minutes.map((minute) => (
                  <option key={minute} value={minute}>
                    {minute}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsTimePickerOpen(false)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700"
              >
                Set Time
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const SelectInput = ({ label, value, onChange, options }) => (
  <label className="mt-3 block">
    <div className="mb-2 text-sm font-semibold text-slate-700">{label}</div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-black outline-none focus:border-indigo-500"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);

const FilterSelect = ({ value, onChange, placeholder, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-black"
  >
    <option value="">{placeholder}</option>
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

const TextArea = ({ label, value, onChange, required = false }) => (
  <label className="mt-3 block">
    <div className="mb-2 text-sm font-semibold text-slate-700">
      {label}
      {required ? " *" : ""}
    </div>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      rows={3}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-black outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
    />
  </label>
);

const Badge = ({ value }) => (
  <span
    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${
      statusStyles[value] || "border-slate-200 bg-slate-50 text-slate-600"
    }`}
  >
    {value}
  </span>
);

const ScoreCard = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
      {label}
    </div>
    <div className="mt-3 text-3xl font-black text-slate-900">
      {Number(value || 0).toFixed(0)}
      <span className="text-sm text-slate-500">/100</span>
    </div>
  </div>
);

const MetricCard = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="text-xs font-semibold text-slate-500">{label}</div>
    <div className="mt-2 text-2xl font-black text-slate-900">{value}</div>
  </div>
);

const ProgressRow = ({ label, value }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
      <span>{label}</span>
      <span>{Number(value || 0).toFixed(0)}%</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-indigo-600"
        style={{ width: `${Math.min(100, Number(value || 0))}%` }}
      />
    </div>
  </div>
);

const LeaderboardRow = ({ row }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-center gap-3">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-indigo-600">
        {row.rank === 1 ? <Trophy size={19} /> : <Award size={18} />}
      </div>
      <div>
        <div className="text-sm font-bold text-slate-900">
          {row.employeeName}
        </div>
        <div className="text-xs text-slate-500">
          Rank #{row.rank} • {row.department} • {row.totalReportsSubmitted}{" "}
          reports
        </div>
      </div>
    </div>
    <div className="text-right">
      <div className="text-xl font-black text-slate-900">
        {row.totalScore}/100
      </div>
      <div className="text-xs text-slate-500">
        {row.completedTasks} done • {row.failedTasks} failed
      </div>
    </div>
  </div>
);

const InfoBlock = ({ title, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-3">
    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
      {title}
    </div>
    <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
      {value || "-"}
    </div>
  </div>
);

const EmptyState = ({ text }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
    {text}
  </div>
);

export default DailyWorkReportManager;
