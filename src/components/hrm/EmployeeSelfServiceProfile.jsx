import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  Fingerprint,
  LineChart as LineChartIcon,
  Mail,
  Phone,
  ReceiptText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import HrmWorkspace from "./HrmWorkspace";
import StatCard from "../common/StatCard";
import { useGetMyEmployeeProfileQuery } from "../../features/employeeList/employeeList";
import { useGetMyAttendanceSummariesQuery } from "../../features/attendanceSummary/attendanceSummary";
import { useGetMyLeaveRequestsQuery } from "../../features/leaveRequest/leaveRequest";
import { useGetMyPayrollItemsQuery } from "../../features/payrollItem/payrollItem";
import { useGetKPIPerformanceGraphQuery } from "../../features/kpi/kpi";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  if (Number.isNaN(amount)) return "BDT 0";
  return `BDT ${amount.toLocaleString()}`;
};

const statusTone = {
  Present: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Absent: "bg-rose-50 text-rose-700 border-rose-200",
  Late: "bg-amber-50 text-amber-700 border-amber-200",
  Leave: "bg-sky-50 text-sky-700 border-sky-200",
  Weekend: "bg-slate-100 text-slate-700 border-slate-200",
  Holiday: "bg-violet-50 text-violet-700 border-violet-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

const toneFor = (status) =>
  statusTone[status] || "bg-slate-100 text-slate-700 border-slate-200";

const SectionCard = ({ title, actionLabel, actionHref, children }) => (
  <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      {actionHref ? (
        <Link
          to={actionHref}
          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
    <div className="mt-5">{children}</div>
  </section>
);

const EmptyState = ({ text }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
    {text}
  </div>
);

const EmployeeSelfServiceProfile = () => {
  const {
    data: profileRes,
    isLoading: isProfileLoading,
    error: profileError,
  } = useGetMyEmployeeProfileQuery();
  const { data: attendanceRes, isLoading: isAttendanceLoading } =
    useGetMyAttendanceSummariesQuery();
  const { data: leaveRes, isLoading: isLeaveLoading } =
    useGetMyLeaveRequestsQuery();
  const { data: payrollRes, isLoading: isPayrollLoading } =
    useGetMyPayrollItemsQuery();
  const { data: kpiGraphRes, isLoading: isKpiGraphLoading } =
    useGetKPIPerformanceGraphQuery();

  const profile = profileRes?.data;
  const attendanceRows = attendanceRes?.data || [];
  const leaveRows = leaveRes?.data || [];
  const payrollRows = payrollRes?.data || [];
  const kpiPoints = kpiGraphRes?.data?.points || [];
  const kpiSummary = kpiGraphRes?.data?.summary || {};
  const kpiChartData = kpiPoints.map((point) => ({
    name:
      point.periodType && point.periodStartDate
        ? `${point.periodType} ${formatDate(point.periodStartDate)}`
        : formatDate(point.date || point.periodStartDate),
    score: Number(point.totalMarks || 0),
    percentage: Number(point.performancePercentage || 0),
  }));

  const latestPayroll = payrollRows[0];

  const stats = [
    {
      name: "Attendance Entries",
      value: attendanceRows.length,
      icon: Fingerprint,
      iconBg: "#ecfeff",
      iconColor: "#0891b2",
    },
    {
      name: "Leave Requests",
      value: leaveRows.length,
      icon: CalendarClock,
      iconBg: "#eff6ff",
      iconColor: "#2563eb",
    },
    {
      name: "Payslips",
      value: payrollRows.length,
      icon: ReceiptText,
      iconBg: "#eef2ff",
      iconColor: "#4f46e5",
    },
    {
      name: "Latest Net Pay",
      value: latestPayroll ? formatCurrency(latestPayroll.netAmount) : "BDT 0",
      icon: CircleDollarSign,
      iconBg: "#f0fdf4",
      iconColor: "#16a34a",
    },
  ];

  if (isProfileLoading) {
    return (
      <HrmWorkspace
        eyebrow="Employee Self Service"
        title="Employee Profile"
        description="Loading your HR profile, attendance, leave and payroll snapshot."
        stats={stats}
      >
        <EmptyState text="Loading employee profile..." />
      </HrmWorkspace>
    );
  }

  if (profileError || !profile) {
    return (
      <HrmWorkspace
        eyebrow="Employee Self Service"
        title="Employee Profile"
        description="Review your linked employee record, recent attendance, leave requests and payslip history in one place."
        stats={stats}
      >
        <EmptyState text="No linked employee profile was found for this user yet." />
      </HrmWorkspace>
    );
  }

  return (
    <HrmWorkspace
      eyebrow="Employee Self Service"
      title={profile.name || "Employee Profile"}
      description="This workspace keeps your linked employee record, organization assignment and recent HR activity together."
      stats={stats}
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <SectionCard title="Profile Overview">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
                  <UserRound size={20} />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Employee
                  </div>
                  <div className="text-lg font-bold text-slate-900">{profile.name || "-"}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneFor(profile.status)}`}>
                  {profile.status || "Unknown"}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {profile.employeeCode || profile.employee_id || "No Code"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <Mail size={16} />
                  Email
                </div>
                <div className="mt-2 text-sm font-medium text-slate-900">
                  {profile.email || profile.user?.Email || "-"}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <Phone size={16} />
                  Phone
                </div>
                <div className="mt-2 text-sm font-medium text-slate-900">
                  {profile.phone || profile.user?.Phone || "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              name="Department"
              value={profile.department?.name || "-"}
              icon={BriefcaseBusiness}
              iconBg="#eef2ff"
              iconColor="#4f46e5"
            />
            <StatCard
              name="Designation"
              value={profile.designation?.name || "-"}
              icon={BadgeCheck}
              iconBg="#f5f3ff"
              iconColor="#7c3aed"
            />
            <StatCard
              name="Joining Date"
              value={formatDate(profile.joiningDate)}
              icon={CalendarClock}
              iconBg="#f0fdf4"
              iconColor="#16a34a"
            />
          </div>
        </SectionCard>

        <SectionCard title="Employment Snapshot">
          <div className="space-y-3">
            {[
              ["Employment Type", profile.employmentType || "-"],
              ["Shift", profile.shift?.name || "-"],
              ["Shift Window", profile.shift ? `${profile.shift.startTime || "-"} - ${profile.shift.endTime || "-"}` : "-"],
              ["Reporting Manager", profile.reportingManager?.name || "-"],
              ["Linked Account", profile.user?.Email || "-"],
              ["Base Salary", formatCurrency(profile.salary)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <span className="text-sm font-medium text-slate-500">{label}</span>
                <span className="text-sm font-semibold text-slate-900 text-right">{value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="My KPI Performance">
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            name="Latest Score"
            value={`${Number(kpiSummary.latestScore || 0).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}/${Number(kpiSummary.maxMarks || 100)}`}
            icon={LineChartIcon}
            iconBg="#eef2ff"
            iconColor="#4f46e5"
          />
          <StatCard
            name="Previous Score"
            value={`${Number(kpiSummary.previousScore || 0).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}/${Number(kpiSummary.maxMarks || 100)}`}
            icon={LineChartIcon}
            iconBg="#f8fafc"
            iconColor="#475569"
          />
          <StatCard
            name="Trend"
            value={kpiSummary.trend || "same"}
            icon={LineChartIcon}
            iconBg={
              kpiSummary.trend === "up"
                ? "#f0fdf4"
                : kpiSummary.trend === "down"
                  ? "#fff1f2"
                  : "#f8fafc"
            }
            iconColor={
              kpiSummary.trend === "up"
                ? "#16a34a"
                : kpiSummary.trend === "down"
                  ? "#e11d48"
                  : "#475569"
            }
          />
        </div>

        <div className="h-72 rounded-2xl bg-slate-50 p-4">
          {isKpiGraphLoading ? (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
              Loading KPI performance...
            </div>
          ) : kpiChartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kpiChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Score"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
              No KPI performance data is available for your profile yet.
            </div>
          )}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard title="Recent Attendance" actionLabel="Open Attendance" actionHref="/hrm/attendance-summaries">
          {isAttendanceLoading ? (
            <EmptyState text="Loading attendance..." />
          ) : attendanceRows.length === 0 ? (
            <EmptyState text="No attendance summary is available yet." />
          ) : (
            <div className="space-y-3">
              {attendanceRows.slice(0, 6).map((row) => (
                <div key={row.Id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {formatDate(row.attendanceDate)}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <Clock3 size={14} />
                        {row.workedMinutes || 0} mins worked
                      </div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneFor(row.attendanceStatus)}`}>
                      {row.attendanceStatus || "Unknown"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent Leave Requests" actionLabel="Open Leave" actionHref="/hrm/leave-requests">
          {isLeaveLoading ? (
            <EmptyState text="Loading leave requests..." />
          ) : leaveRows.length === 0 ? (
            <EmptyState text="No leave request was found yet." />
          ) : (
            <div className="space-y-3">
              {leaveRows.slice(0, 6).map((row) => (
                <div key={row.Id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {row.leaveType?.name || "Leave"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatDate(row.startDate)} to {formatDate(row.endDate)}
                      </div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneFor(row.approvalStatus)}`}>
                      {row.approvalStatus || "Pending"}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    {row.totalDays || 0} day(s)
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent Payslips" actionLabel="Open Payslips" actionHref="/hrm/payslips">
          {isPayrollLoading ? (
            <EmptyState text="Loading payslips..." />
          ) : payrollRows.length === 0 ? (
            <EmptyState text="No payslip is available yet." />
          ) : (
            <div className="space-y-3">
              {payrollRows.slice(0, 6).map((row) => (
                <div key={row.Id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {row.payrollRun?.title || row.payrollRun?.month || "Payroll"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Month: {row.payrollRun?.month || "-"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {formatCurrency(row.netAmount)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Gross {formatCurrency(row.grossAmount)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Self-Service Notes</h3>
            <p className="text-sm text-slate-500">
              This page is designed for employees to review their own HR data without opening the full admin workspace.
            </p>
          </div>
        </div>
      </section>
    </HrmWorkspace>
  );
};

export default EmployeeSelfServiceProfile;
