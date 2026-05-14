import {
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Fingerprint,
  Layers3,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  TimerReset,
  Users2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import StatCard from "../common/StatCard";
import {
  canAccessPath,
  subscribeToPermissionChanges,
} from "../../utils/navigationPermissions";

const SECTION_ITEMS = [
  // {
  //   group: "HRM",
  //   label: "Employee Profile",
  //   href: "/employee-profile",
  //   match: ["/employee-profile"],
  //   icon: ShieldCheck,
  // },
  // {
  //   group: "HRM",
  //   label: "Employee Master",
  //   href: "/employee-master",
  //   match: ["/employee-master"],
  //   icon: Users2,
  // },
  {
    group: "HRM",
    label: "Departments",
    href: "/hrm/departments",
    match: ["/hrm/departments"],
    icon: Building2,
  },
  {
    group: "HRM",
    label: "Designations",
    href: "/hrm/designations",
    match: ["/hrm/designations"],
    icon: Layers3,
  },
  {
    group: "HRM",
    label: "Team",
    href: "/hrm/teams",
    match: ["/hrm/teams"],
    icon: Users2,
  },
  // {
  //   group: "HRM",
  //   label: "Shifts",
  //   href: "/hrm/shifts",
  //   match: ["/hrm/shifts"],
  //   icon: TimerReset,
  // },
  // {
  //   group: "HRM",
  //   label: "Holidays",
  //   href: "/hrm/holidays",
  //   match: ["/hrm/holidays"],
  //   icon: CalendarDays,
  // },
  // {
  //   group: "HRM",
  //   label: "Attendance Devices",
  //   href: "/hrm/attendance-devices",
  //   match: ["/hrm/attendance-devices"],
  //   icon: Fingerprint,
  // },
  // {
  //   group: "HRM",
  //   label: "Enrollments",
  //   href: "/hrm/attendance-enrollments",
  //   match: ["/hrm/attendance-enrollments"],
  //   icon: Fingerprint,
  // },
  // {
  //   group: "HRM",
  //   label: "Raw Logs",
  //   href: "/hrm/attendance-logs",
  //   match: ["/hrm/attendance-logs"],
  //   icon: TimerReset,
  // },
  // {
  //   group: "HRM",
  //   label: "Summaries",
  //   href: "/hrm/attendance-summaries",
  //   match: ["/hrm/attendance-summaries"],
  //   icon: CalendarDays,
  // },
  // {
  //   group: "HRM",
  //   label: "Regularizations",
  //   href: "/hrm/attendance-regularizations",
  //   match: ["/hrm/attendance-regularizations"],
  //   icon: RefreshCcw,
  // },
  // {
  //   group: "HRM",
  //   label: "Leave Types",
  //   href: "/hrm/leave-types",
  //   match: ["/hrm/leave-types"],
  //   icon: CalendarDays,
  // },
  // {
  //   group: "HRM",
  //   label: "Leave Requests",
  //   href: "/hrm/leave-requests",
  //   match: ["/hrm/leave-requests"],
  //   icon: Layers3,
  // },
  // {
  //   group: "Payroll",
  //   label: "Payroll Runs",
  //   href: "/hrm/payroll-runs",
  //   match: ["/hrm/payroll-runs"],
  //   icon: CircleDollarSign,
  // },
  // {
  //   group: "Payroll",
  //   label: "Payslips",
  //   href: "/hrm/payslips",
  //   match: ["/hrm/payslips"],
  //   icon: ReceiptText,
  // },
  {
    group: "HRM",
    label: "Daily Work Reports",
    href: "/hrm/daily-work-reports",
    match: ["/hrm/daily-work-reports"],
    icon: ClipboardList,
  },
  {
    group: "HRM",
    label: "CS Work Reports",
    href: "/hrm/employee-work-reports",
    match: ["/hrm/employee-work-reports"],
    icon: ClipboardCheck,
  },
  {
    group: "HRM",
    label: "Logistic Work Reports",
    href: "/hrm/logistic-work-reports",
    match: ["/hrm/logistic-work-reports"],
    icon: ClipboardList,
  },
  {
    group: "Payroll",
    label: "Employee List",
    href: "/employee-list",
    match: ["/employee-list"],
    icon: ShieldCheck,
  },
  {
    group: "Payroll",
    label: "Payroll",
    href: "/employee",
    match: ["/employee"],
    icon: CircleDollarSign,
  },
  {
    group: "Payroll",
    label: "Payroll Fine",
    href: "/salary",
    match: ["/salary"],
    icon: Building2,
  },
];

const HrmWorkspace = ({
  eyebrow = "Phase 1",
  title,
  description,
  stats = [],
  children,
}) => {
  const { pathname } = useLocation();
  const [permissionVersion, setPermissionVersion] = useState(0);
  const userRole =
    typeof window !== "undefined"
      ? localStorage.getItem("role") || "user"
      : "user";
  const visibleSectionItems = useMemo(
    () => SECTION_ITEMS.filter((item) => canAccessPath(userRole, item.href)),
    [userRole, permissionVersion],
  );
  const activeSectionGroup = useMemo(() => {
    const activeItem = SECTION_ITEMS.find((item) =>
      item.match.some((matchPath) => pathname.startsWith(matchPath)),
    );

    return activeItem?.group || "HRM";
  }, [pathname]);
  const visibleSectionGroups = useMemo(
    () =>
      ["HRM", "Payroll"]
        .map((group) => ({
          group,
          items: visibleSectionItems.filter(
            (item) => item.group === group && group === activeSectionGroup,
          ),
        }))
        .filter((section) => section.items.length > 0),
    [activeSectionGroup, visibleSectionItems],
  );

  useEffect(() => {
    return subscribeToPermissionChanges(() =>
      setPermissionVersion((prev) => prev + 1),
    );
  }, []);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.12),_transparent_35%)]" />
          <div className="relative px-5 py-6 sm:px-7 sm:py-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                  <ShieldCheck size={14} />
                  {eyebrow}
                </div>
                <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {title}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                  {description}
                </p>
              </div>

              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[360px] xl:min-w-[420px] xl:grid-cols-2">
                {stats.map((stat) => (
                  <StatCard
                    key={stat.name}
                    name={stat.name}
                    value={stat.value}
                    icon={stat.icon}
                    iconBg={stat.iconBg}
                    iconColor={stat.iconColor}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="space-y-5">
          {visibleSectionGroups.map((section) => (
            <div key={section.group}>
              <div className="mb-3 px-2 pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {section.group} Sections
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
                {section.items.map((item) => {
                  const active = item.match.some((matchPath) =>
                    pathname.startsWith(matchPath),
                  );
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`group flex min-h-[58px] items-center rounded-2xl border px-4 py-3 transition ${
                        active
                          ? "border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm"
                          : "border-slate-200 bg-slate-50/70 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex w-full items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            active
                              ? "bg-white text-indigo-600"
                              : "bg-white text-slate-500"
                          }`}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold leading-5 text-current">
                            {item.label}
                          </div>
                          <div className="text-xs leading-4 text-slate-400 group-hover:text-slate-500">
                            Open section
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {children}
    </div>
  );
};

export default HrmWorkspace;
