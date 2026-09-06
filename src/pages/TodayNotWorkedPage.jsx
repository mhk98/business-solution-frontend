import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw,
  UserX,
  UserCheck,
  Users,
  CalendarRange,
  CalendarDays,
  X,
} from "lucide-react";
import Header from "../components/common/Header";
import Modal from "../components/common/Modal";
import DateRangeFilter from "../components/common/DateRangeFilter";
import {
  useGetTodayNotWorkedQuery,
} from "../features/todayNotWorked/todayNotWorked";

const formatRole = (role) => {
  if (!role) return "-";
  return role
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatRelativeTime = (value) => {
  if (!value) return "Never";
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return "Never";
  const diffMinutes = Math.round((Date.now() - then.getTime()) / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12)
    return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  const diffYears = Math.round(diffMonths / 12);
  return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
};

const formatDateLabel = (value) => {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
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
  menu: (base) => ({ ...base, borderRadius: 12, overflow: "hidden", zIndex: 50 }),
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

const StatCard = ({ card }) => {
  const Wrapper = card.onClick ? "button" : "div";
  return (
    <Wrapper
      type={card.onClick ? "button" : undefined}
      onClick={card.onClick}
      className={`flex min-w-0 items-center gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition sm:gap-4 sm:p-5 ${
        card.onClick ? "hover:border-indigo-300 hover:shadow-md" : ""
      } ${card.active ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200"}`}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12"
        style={{ backgroundColor: card.iconBg }}
      >
        <card.icon size={22} style={{ color: card.iconColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{card.name}</p>
        <p className="truncate text-lg font-bold text-slate-900 sm:text-xl">
          {card.value}
        </p>
      </div>
    </Wrapper>
  );
};

const DayByDayModal = ({ startDate, endDate, user, onClose }) => {
  const { data, isLoading, isError, error } = useGetTodayNotWorkedQuery(
    { startDate, endDate, userId: user?.Id },
    { skip: !user?.Id },
  );
  const rows = data?.data || [];
  const meta = data?.meta || {};

  return (
    <Modal
      isOpen={!!user}
      onClose={onClose}
      title={`${user?.name || "User"} — ${startDate} to ${endDate}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
            {meta.daysWorked ?? 0} days worked
          </span>
          <span className="rounded-full bg-red-50 px-3 py-1 text-red-600">
            {meta.daysNotWorked ?? 0} days not worked
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
            {meta.totalDays ?? rows.length} days
          </span>
        </div>

        <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200">
          <table className="w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Worked?</th>
                <th className="px-3 py-2">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {isLoading && (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              )}
              {!isLoading && isError && (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-red-500">
                    {error?.data?.message || "Failed to load."}
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.date}>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatDateLabel(row.date)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        row.worked
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {row.worked ? "Worked" : "Not worked"}
                    </span>
                  </td>
                  <td className="px-3 py-2">{row.activityCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};

const TodayNotWorkedPage = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "user";
  const isSuperAdmin = role === "superAdmin";

  const [view, setView] = useState("not_worked");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [employee, setEmployee] = useState(null);
  const [userOptions, setUserOptions] = useState([]);
  const [dayByDayTarget, setDayByDayTarget] = useState(null);

  const hasRange = Boolean(startDate) && Boolean(endDate);

  const queryArgs = useMemo(() => {
    if (hasRange) {
      return {
        startDate,
        endDate,
        userId: employee?.value || undefined,
      };
    }
    return { view, userId: employee?.value || undefined };
  }, [hasRange, startDate, endDate, employee, view]);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetTodayNotWorkedQuery(queryArgs, { skip: !isSuperAdmin });

  const rows = data?.data || [];
  const meta = useMemo(() => data?.meta || {}, [data]);
  const mode = meta.mode || "day";

  useEffect(() => {
    if (Array.isArray(meta.users) && meta.users.length) {
      setUserOptions(
        meta.users.map((u) => ({
          value: u.Id,
          label: `${u.name}${u.role ? ` · ${formatRole(u.role)}` : ""}`,
        })),
      );
    }
  }, [meta.users]);

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setEmployee(null);
  };

  const cards = useMemo(() => {
    if (mode === "range_user") {
      return [
        {
          name: "Days worked",
          value: meta.daysWorked ?? "-",
          icon: UserCheck,
          iconBg: "#ECFDF5",
          iconColor: "#047857",
        },
        {
          name: "Days not worked",
          value: meta.daysNotWorked ?? "-",
          icon: UserX,
          iconBg: "#FEF2F2",
          iconColor: "#DC2626",
        },
        {
          name: "Total days",
          value: meta.totalDays ?? "-",
          icon: CalendarRange,
          iconBg: "#EEF2FF",
          iconColor: "#4338CA",
        },
      ];
    }
    if (mode === "range") {
      return [
        {
          name: "Users",
          value: meta.totalConsidered ?? "-",
          icon: Users,
          iconBg: "#EEF2FF",
          iconColor: "#4338CA",
        },
        {
          name: "Days in range",
          value: meta.totalDays ?? "-",
          icon: CalendarRange,
          iconBg: "#F0F9FF",
          iconColor: "#0369A1",
        },
        {
          name: "Range",
          value: `${meta.startDate || "?"} → ${meta.endDate || "?"}`,
          icon: CalendarDays,
          iconBg: "#FFF7ED",
          iconColor: "#C2410C",
        },
      ];
    }
    return [
      {
        name: "Not worked today",
        value: meta.notWorkedCount ?? "-",
        icon: UserX,
        iconBg: "#FEF2F2",
        iconColor: "#DC2626",
        active: view === "not_worked",
        onClick: () => setView("not_worked"),
      },
      {
        name: "Worked today",
        value: meta.workedCount ?? "-",
        icon: UserCheck,
        iconBg: "#ECFDF5",
        iconColor: "#047857",
        active: view === "worked",
        onClick: () => setView("worked"),
      },
      {
        name: "Total users",
        value: meta.totalConsidered ?? "-",
        icon: Users,
        iconBg: "#EEF2FF",
        iconColor: "#4338CA",
        active: view === "all",
        onClick: () => setView("all"),
      },
    ];
  }, [mode, meta, view]);

  if (!isSuperAdmin) {
    return (
      <div className="relative z-10 flex-1">
        <Header title="Today Not Worked" />
        <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-slate-50 px-4">
          <p className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-semibold text-slate-600 shadow-sm">
            You are not authorized to view this page.
          </p>
        </main>
      </div>
    );
  }

  const title =
    mode === "range_user"
      ? `${meta.name || "Employee"} — day by day`
      : mode === "range"
        ? "Worked vs not-worked days"
        : view === "worked"
          ? "Users who worked today"
          : view === "all"
            ? "All users"
            : "Users with no activity today";

  const subtitle =
    mode === "day"
      ? `${formatDateLabel(meta.date)}${meta.timezone ? ` · ${meta.timezone}` : ""}`
      : `${meta.startDate} → ${meta.endDate}${meta.timezone ? ` · ${meta.timezone}` : ""}`;

  return (
    <div className="relative z-10 flex-1">
      <Header title="Today Not Worked" />

      <main className="min-h-[calc(100vh-64px)] min-w-0 bg-slate-50 px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
        <div className="mx-auto w-full min-w-0 max-w-[1200px] space-y-5 sm:space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              compact
              className="min-w-0"
            />
            <div className="min-w-0 sm:w-72">
              <label className="mb-1.5 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Employee
              </label>
              <Select
                value={employee}
                onChange={setEmployee}
                options={userOptions}
                isClearable
                placeholder="All employees"
                styles={selectStyles}
                className="text-sm"
              />
            </div>
            {(hasRange || employee) && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <X size={15} /> Clear
              </button>
            )}
          </div>

          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {cards.map((card) => (
              <StatCard key={card.name} card={card} />
            ))}
          </div>

          {/* Table */}
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
            <div className="max-w-full overflow-x-auto rounded-2xl border border-slate-200">
              {mode === "range_user" ? (
                <RangeUserTable
                  rows={rows}
                  isLoading={isLoading}
                  isError={isError}
                  error={error}
                />
              ) : mode === "range" ? (
                <RangeTable
                  rows={rows}
                  isLoading={isLoading}
                  isError={isError}
                  error={error}
                  onRowClick={(user) => setDayByDayTarget(user)}
                />
              ) : (
                <DayTable
                  rows={rows}
                  view={view}
                  isLoading={isLoading}
                  isError={isError}
                  error={error}
                  onRowClick={(user) =>
                    navigate(`/work-history?${new URLSearchParams({ userId: user.Id, date: meta.date })}`)
                  }
                />
              )}
            </div>
          </section>
        </div>
      </main>

      {dayByDayTarget && (
        <DayByDayModal
          startDate={startDate}
          endDate={endDate}
          user={dayByDayTarget}
          onClose={() => setDayByDayTarget(null)}
        />
      )}
    </div>
  );
};

const StateRow = ({ colSpan, isLoading, isError, error, empty }) => {
  if (isLoading)
    return (
      <tr>
        <td colSpan={colSpan} className="px-4 py-10 text-center text-slate-500">
          Loading...
        </td>
      </tr>
    );
  if (isError)
    return (
      <tr>
        <td colSpan={colSpan} className="px-4 py-10 text-center text-red-500">
          {error?.data?.message || "Failed to load data."}
        </td>
      </tr>
    );
  if (empty)
    return (
      <tr>
        <td colSpan={colSpan} className="px-4 py-10 text-center text-slate-500">
          No records.
        </td>
      </tr>
    );
  return null;
};

const DayTable = ({ rows, view, isLoading, isError, error, onRowClick }) => {
  const showActivity = view !== "not_worked";
  const clickable = view !== "not_worked";
  const colSpan = view === "all" ? 7 : showActivity ? 6 : 5;
  return (
    <table className="w-full min-w-[720px] divide-y divide-slate-200 text-left text-sm">
      <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
        <tr>
          <th className="px-4 py-3">#</th>
          <th className="px-4 py-3">Name</th>
          <th className="px-4 py-3">Email</th>
          <th className="px-4 py-3">Role</th>
          {view === "all" && <th className="px-4 py-3">Status</th>}
          {showActivity && <th className="px-4 py-3">Activity</th>}
          <th className="px-4 py-3">Last activity</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
        <StateRow
          colSpan={colSpan}
          isLoading={isLoading}
          isError={isError}
          error={error}
          empty={rows.length === 0}
        />
        {!isLoading &&
          !isError &&
          rows.map((row, index) => {
            const canClick = clickable && row.worked;
            return (
              <tr
                key={row.Id}
                onClick={canClick ? () => onRowClick(row) : undefined}
                tabIndex={canClick ? 0 : undefined}
                onKeyDown={canClick ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onRowClick(row);
                  }
                } : undefined}
                className={`${canClick ? "cursor-pointer hover:bg-indigo-50" : "hover:bg-slate-50"}`}
              >
                <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                  {row.name}
                </td>
                <td className="px-4 py-3">{row.Email || "-"}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {formatRole(row.role)}
                  </span>
                </td>
                {view === "all" && (
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        row.worked
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {row.worked ? "Worked" : "Not worked"}
                    </span>
                  </td>
                )}
                {view !== "not_worked" && (
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {row.activityCount}
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                  {formatRelativeTime(row.lastActivityAt)}
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  );
};

const RangeTable = ({ rows, isLoading, isError, error, onRowClick }) => (
  <table className="w-full min-w-[720px] divide-y divide-slate-200 text-left text-sm">
    <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
      <tr>
        <th className="px-4 py-3">#</th>
        <th className="px-4 py-3">Name</th>
        <th className="px-4 py-3">Role</th>
        <th className="px-4 py-3">Days worked</th>
        <th className="px-4 py-3">Days not worked</th>
        <th className="px-4 py-3">Total days</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
      <StateRow
        colSpan={6}
        isLoading={isLoading}
        isError={isError}
        error={error}
        empty={rows.length === 0}
      />
      {!isLoading &&
        !isError &&
        rows.map((row, index) => (
          <tr
            key={row.Id}
            onClick={() => onRowClick(row)}
            className="cursor-pointer hover:bg-indigo-50"
          >
            <td className="px-4 py-3 text-slate-400">{index + 1}</td>
            <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
              {row.name}
            </td>
            <td className="px-4 py-3">
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {formatRole(row.role)}
              </span>
            </td>
            <td className="px-4 py-3 font-semibold text-emerald-700">
              {row.daysWorked}
            </td>
            <td className="px-4 py-3 font-semibold text-red-600">
              {row.daysNotWorked}
            </td>
            <td className="px-4 py-3 text-slate-500">{row.totalDays}</td>
          </tr>
        ))}
    </tbody>
  </table>
);

const RangeUserTable = ({ rows, isLoading, isError, error }) => (
  <table className="w-full min-w-[480px] divide-y divide-slate-200 text-left text-sm">
    <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
      <tr>
        <th className="px-4 py-3">Date</th>
        <th className="px-4 py-3">Worked?</th>
        <th className="px-4 py-3">Activity</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
      <StateRow
        colSpan={3}
        isLoading={isLoading}
        isError={isError}
        error={error}
        empty={rows.length === 0}
      />
      {!isLoading &&
        !isError &&
        rows.map((row) => (
          <tr key={row.date} className={row.worked ? "" : "bg-red-50/40"}>
            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
              {formatDateLabel(row.date)}
            </td>
            <td className="px-4 py-3">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  row.worked
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {row.worked ? "Worked" : "Not worked"}
              </span>
            </td>
            <td className="px-4 py-3">{row.activityCount}</td>
          </tr>
        ))}
    </tbody>
  </table>
);

export default TodayNotWorkedPage;
