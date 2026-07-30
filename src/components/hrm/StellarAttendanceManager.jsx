import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Fingerprint,
  RefreshCcw,
  Search,
  Users2,
} from "lucide-react";
import HrmWorkspace from "./HrmWorkspace";
import {
  useGetStellarAttendanceEmployeesQuery,
  useGetStellarAttendanceHolidaysQuery,
  useGetStellarAttendanceLeavesQuery,
  useGetStellarAttendanceLogsQuery,
  useGetStellarAttendanceUsersQuery,
} from "../../features/stellarAttendance/stellarAttendance";
import useDebounce from "../../hooks/useDebounce";

const today = new Date().toISOString().slice(0, 10);
const currentMonth = today.slice(0, 7);

const toLower = (value) => String(value || "").toLowerCase();

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const dateFromParts = (year, month, day) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const getMonthRange = (monthValue) => {
  const [year, month] = String(monthValue || currentMonth)
    .split("-")
    .map(Number);
  const startDate = new Date(year, month - 2, 26);
  const endDate = new Date(year, month - 1, 25);
  const start = dateFromParts(
    startDate.getFullYear(),
    startDate.getMonth() + 1,
    startDate.getDate(),
  );
  const end = dateFromParts(
    endDate.getFullYear(),
    endDate.getMonth() + 1,
    endDate.getDate(),
  );

  return { start, end };
};

const getDefaultPayrollMonth = () => {
  const date = new Date(`${today}T00:00:00`);
  if (date.getDate() <= 25) {
    date.setMonth(date.getMonth() - 1);
  }
  return dateFromParts(date.getFullYear(), date.getMonth() + 1, 1).slice(0, 7);
};

const getDefaultAttendanceRange = () => getMonthRange(getDefaultPayrollMonth());

const getCurrentCalendarMonthRange = () => ({
  start: `${currentMonth}-01`,
  end: today,
});

const countDays = (start, end) => {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0;
  }
  return Math.max(
    0,
    Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1,
  );
};

const getDateRangeList = (start, end) => {
  const dates = [];
  const cursor = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  if (Number.isNaN(cursor.getTime()) || Number.isNaN(endDate.getTime())) {
    return dates;
  }

  while (cursor <= endDate) {
    dates.push(
      dateFromParts(
        cursor.getFullYear(),
        cursor.getMonth() + 1,
        cursor.getDate(),
      ),
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};

const getRegistrationId = (row) =>
  row.registration_id || row.registraton_id || row.deviceUserId || "";

const getUserName = (row) => row.name || row.username || row.user_name || "-";

const getEmployeeRegistrationId = (employee) =>
  employee?.employee_id || employee?.employeeCode || "";

const normalizeDateValue = (value) => String(value || "").slice(0, 10);

const isActiveStatus = (value) =>
  ["active", "approved"].includes(String(value || "").toLowerCase());

const getOverlapDates = (start, end, range) => {
  const overlapStart = start > range.start ? start : range.start;
  const overlapEnd = end < range.end ? end : range.end;
  if (!overlapStart || !overlapEnd || overlapStart > overlapEnd) return [];
  return getDateRangeList(overlapStart, overlapEnd);
};

const getHolidayDates = (holidays, range) => {
  const dates = new Set();

  holidays.forEach((holiday) => {
    if (!isActiveStatus(holiday.status)) return;
    const start = normalizeDateValue(holiday.startDate || holiday.holidayDate);
    const end = normalizeDateValue(holiday.endDate || start);
    getOverlapDates(start, end, range).forEach((date) => dates.add(date));
  });

  return dates;
};

const getWeekdayName = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
  });

const getWeeklyOffDates = (shift, range) => {
  const weeklyOffDays = Array.isArray(shift?.weeklyOffDays)
    ? shift.weeklyOffDays.map((item) => String(item).toLowerCase())
    : [];

  if (!weeklyOffDays.length) return new Set();

  return new Set(
    getDateRangeList(range.start, range.end).filter((date) =>
      weeklyOffDays.includes(getWeekdayName(date).toLowerCase()),
    ),
  );
};

const parseTimeToDate = (date, time) => {
  if (!time) return null;
  const [hours, minutes, seconds = "0"] = String(time).split(":");
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(Number(hours) || 0, Number(minutes) || 0, Number(seconds) || 0, 0);
  return parsed;
};

const minutesDiff = (later, earlier) => {
  if (!later || !earlier) return 0;
  return Math.max(0, Math.round((later.getTime() - earlier.getTime()) / 60000));
};

const countLeaveDates = ({ leaveRequests, employeeId, range, excludedDates }) => {
  const dates = new Set();

  leaveRequests.forEach((leave) => {
    if (String(leave.employeeId) !== String(employeeId)) return;
    if (String(leave.approvalStatus || "").toLowerCase() !== "approved") return;

    const start = normalizeDateValue(leave.startDate);
    const end = normalizeDateValue(leave.endDate || start);
    getOverlapDates(start, end, range).forEach((date) => {
      if (!excludedDates.has(date)) dates.add(date);
    });
  });

  return dates.size;
};

const formatPickerLabel = (type, value) => {
  if (!value) return type === "month" ? "Select month" : "Select date";
  if (type === "month") {
    const [year, month] = value.split("-");
    return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const buildSummaryRows = ({ users, logs, employees, holidays, leaveRequests, range }) => {
  const userMap = new Map();
  const employeesByRegistrationId = new Map();
  const holidayDates = getHolidayDates(holidays, range);
  const totalDays = countDays(range.start, range.end);

  employees.forEach((employee) => {
    const registrationId = String(getEmployeeRegistrationId(employee));
    if (!registrationId) return;
    employeesByRegistrationId.set(registrationId, employee);
  });

  users.forEach((user) => {
    const registrationId = String(getRegistrationId(user));
    if (!registrationId) return;
    const employee = employeesByRegistrationId.get(registrationId);
    userMap.set(registrationId, {
      registrationId,
      name: employee?.name || getUserName(user),
      phone: employee?.phone || user.phone || "",
      employee,
    });
  });

  logs.forEach((log) => {
    const registrationId = String(getRegistrationId(log));
    if (!registrationId || userMap.has(registrationId)) return;
    const employee = employeesByRegistrationId.get(registrationId);
    userMap.set(registrationId, {
      registrationId,
      name: employee?.name || log.user_name || "-",
      phone: employee?.phone || "",
      employee,
    });
  });

  employeesByRegistrationId.forEach((employee, registrationId) => {
    if (userMap.has(registrationId)) return;
    userMap.set(registrationId, {
      registrationId,
      name: employee.name || "-",
      phone: employee.phone || "",
      employee,
    });
  });

  const logsByUserAndDate = logs.reduce((acc, log) => {
    const registrationId = String(getRegistrationId(log));
    if (!registrationId || !log.access_date) return acc;
    if (!acc.has(registrationId)) acc.set(registrationId, new Map());
    if (!acc.get(registrationId).has(log.access_date)) {
      acc.get(registrationId).set(log.access_date, []);
    }
    acc.get(registrationId).get(log.access_date).push(log);
    return acc;
  }, new Map());

  logsByUserAndDate.forEach((logsByDate) => {
    logsByDate.forEach((rows) => {
      rows.sort((a, b) => String(a.access_time || "").localeCompare(String(b.access_time || "")));
    });
  });

  return Array.from(userMap.values())
    .map((user) => {
      const logsByDate = logsByUserAndDate.get(user.registrationId) || new Map();
      const accessIds = Array.from(logsByDate.values())
        .flat()
        .map((log) => Number(log.access_id))
        .filter((accessId) => Number.isFinite(accessId));
      const latestAccessId = accessIds.length ? Math.max(...accessIds) : "";
      const weeklyOffDates = getWeeklyOffDates(user.employee?.shift, range);
      const offDates = new Set([...holidayDates, ...weeklyOffDates]);
      const dayOff = offDates.size;
      const workDays = Math.max(0, totalDays - dayOff);
      const present = Array.from(logsByDate.keys()).filter(
        (date) => !offDates.has(date),
      ).length;
      const leave = user.employee
        ? countLeaveDates({
            leaveRequests,
            employeeId: user.employee.Id,
            range,
            excludedDates: offDates,
          })
        : 0;
      let late = 0;
      let earlyOut = 0;

      logsByDate.forEach((dayLogs, date) => {
        if (offDates.has(date)) return;
        const firstIn = dayLogs[0]?.access_time
          ? parseTimeToDate(date, dayLogs[0].access_time)
          : null;
        const lastLog = dayLogs.length > 1 ? dayLogs[dayLogs.length - 1] : dayLogs[0];
        const lastOut = lastLog?.access_time
          ? parseTimeToDate(date, lastLog.access_time)
          : null;
        const shiftStart = parseTimeToDate(date, user.employee?.shift?.startTime);
        const shiftEnd = parseTimeToDate(date, user.employee?.shift?.endTime);
        const lateThreshold = shiftStart
          ? new Date(
              shiftStart.getTime() +
                Number(user.employee?.shift?.graceInMinutes || 0) * 60000,
            )
          : null;
        const earlyThreshold = shiftEnd
          ? new Date(
              shiftEnd.getTime() -
                Number(user.employee?.shift?.graceOutMinutes || 0) * 60000,
            )
          : null;

        if (minutesDiff(firstIn, lateThreshold) > 0) late += 1;
        if (dayLogs.length > 1 && minutesDiff(earlyThreshold, lastOut) > 0) {
          earlyOut += 1;
        }
      });

      const absent = Math.max(0, workDays - present - leave);
      const presentPercent = workDays ? Math.round((present / workDays) * 100) : 0;

      return {
        ...user,
        latestAccessId,
        workDays,
        dayOff,
        present,
        absent,
        leave,
        late,
        earlyOut,
        presentPercent,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

const buildDetailRows = ({ logs, registrationId, range }) => {
  const logsByDate = logs
    .filter((row) => getRegistrationId(row) === registrationId)
    .reduce((acc, row) => {
      if (!row.access_date) return acc;
      if (!acc.has(row.access_date)) acc.set(row.access_date, []);
      acc.get(row.access_date).push(row);
      return acc;
    }, new Map());

  logsByDate.forEach((rows) => {
    rows.sort((a, b) => String(a.access_time || "").localeCompare(String(b.access_time || "")));
  });

  return getDateRangeList(range.start, range.end).map((date) => {
    const dayLogs = logsByDate.get(date) || [];
    const firstLog = dayLogs[0] || {};
    const lastLog = dayLogs.length > 1 ? dayLogs[dayLogs.length - 1] : null;
    const accessIds = dayLogs
      .map((log) => Number(log.access_id))
      .filter((accessId) => Number.isFinite(accessId));

    return {
      date,
      accessId: accessIds.length ? Math.max(...accessIds) : "",
      inTime: firstLog.access_time || "-",
      outTime: lastLog?.access_time || "-",
      deviceName: firstLog.unit_name || "-",
      deviceId: firstLog.unit_id || "",
      card: firstLog.card || "-",
      status: dayLogs.length ? "Present" : "Absent",
    };
  });
};

const StatusBadge = ({ cacheInfo }) => {
  const isLive = cacheInfo?.status === "live";
  const isLocked = cacheInfo?.status === "sync_locked";

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
            isLocked
              ? "bg-amber-100 text-amber-700"
              : isLive
                ? "bg-emerald-100 text-emerald-700"
                : "bg-sky-100 text-sky-700"
          }`}
        >
          {isLocked ? "Sync Locked" : isLive ? "Live Sync" : "Saved Data"}
        </span>
        <span>Last synced: {formatDateTime(cacheInfo?.cachedAt)}</span>
      </div>
      <span>
        Next sync:{" "}
        {formatDateTime(cacheInfo?.syncLock?.nextAllowedAt || cacheInfo?.expiresAt)}
      </span>
    </div>
  );
};

const DatePickerField = ({ type = "date", value, onChange }) => {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const [year, month] = String(value || currentMonth).split("-").map(Number);
    return new Date(year || new Date().getFullYear(), (month || 1) - 1, 1);
  });

  useEffect(() => {
    const onMouseDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const emitValue = (nextValue) => {
    onChange({ target: { value: nextValue } });
    setOpen(false);
  };

  const moveView = (step) => {
    setViewDate((prev) => {
      const next = new Date(prev);
      if (type === "month") next.setFullYear(prev.getFullYear() + step);
      else next.setMonth(prev.getMonth() + step);
      return next;
    });
  };

  const selectedDate = value ? new Date(`${value}T00:00:00`) : null;
  const selectedMonth = type === "month" ? String(value || "") : "";
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dateCells = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 min-w-[190px] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 text-left text-sm text-black outline-none transition hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
      >
        <span>{formatPickerLabel(type, value)}</span>
        <CalendarRange size={18} className="text-indigo-500" />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[286px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/20">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => moveView(-1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Previous"
            >
              <ChevronLeft size={17} />
            </button>
            <div className="text-sm font-extrabold text-slate-900">
              {type === "month" ? year : `${MONTH_NAMES[month]} ${year}`}
            </div>
            <button
              type="button"
              onClick={() => moveView(1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Next"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          {type === "month" ? (
            <div className="grid grid-cols-3 gap-2">
              {MONTH_NAMES.map((name, index) => {
                const nextValue = `${year}-${String(index + 1).padStart(2, "0")}`;
                const active = selectedMonth === nextValue;

                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => emitValue(nextValue)}
                    className={`h-10 rounded-xl text-sm font-bold transition ${
                      active
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[11px] font-bold text-slate-400">
                {WEEK_DAYS.map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {dateCells.map((day, index) => {
                  if (!day) return <div key={`blank-${index}`} />;
                  const nextValue = dateFromParts(year, month + 1, day);
                  const active =
                    selectedDate &&
                    selectedDate.getFullYear() === year &&
                    selectedDate.getMonth() === month &&
                    selectedDate.getDate() === day;

                  return (
                    <button
                      key={nextValue}
                      type="button"
                      onClick={() => emitValue(nextValue)}
                      className={`h-9 rounded-lg text-sm font-semibold transition ${
                        active
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};

const SummaryTable = ({ rows, isLoading, range }) => (
  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="min-w-[1240px] divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {[
              "Reg ID",
              "Name",
              "Phone",
              "W/D",
              "D/OFF",
              "Present",
              "Absent",
              "Leave",
              "Late",
              "Early Out",
              "Present(%)",
              "",
            ].map((heading) => (
              <th key={heading} className="px-4 py-3 text-left font-semibold text-slate-700">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading ? (
            <tr>
              <td colSpan={12} className="px-4 py-10 text-center text-slate-500">
                Loading attendance summary...
              </td>
            </tr>
          ) : rows.length ? (
            rows.map((row) => (
              <tr key={row.registrationId} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 text-slate-700">{row.registrationId}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{row.name}</td>
                <td className="px-4 py-3 text-slate-700">{row.phone || "-"}</td>
                <td className="px-4 py-3 text-slate-700">{row.workDays}</td>
                <td className="px-4 py-3 text-slate-700">{row.dayOff}</td>
                <td className="px-4 py-3 text-slate-700">{row.present}</td>
                <td className="px-4 py-3 text-slate-700">{row.absent}</td>
                <td className="px-4 py-3 text-slate-700">{row.leave}</td>
                <td className="px-4 py-3 text-slate-700">{row.late}</td>
                <td className="px-4 py-3 text-slate-700">{row.earlyOut}</td>
                <td className="px-4 py-3 text-slate-700">{row.presentPercent}%</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/hrm/attendance/${encodeURIComponent(
                      row.registrationId,
                    )}?name=${encodeURIComponent(
                      row.name,
                    )}&phone=${encodeURIComponent(row.phone || "")}`}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    Details
                  </Link>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={12} className="px-4 py-12 text-center text-slate-500">
                No attendance users found for the selected filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const DetailTable = ({ rows, isLoading }) => (
  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="min-w-[1020px] divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {["Date", "In Time", "Out Time", "Device", "Card", "Status"].map((heading) => (
              <th key={heading} className="px-4 py-3 text-left font-semibold text-slate-700">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                Loading attendance details...
              </td>
            </tr>
          ) : rows.length ? (
            rows.map((row, index) => (
              <tr key={`${row.date || index}`} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 text-slate-700">{row.date || "-"}</td>
                <td className="px-4 py-3 text-slate-700">{row.inTime || "-"}</td>
                <td className="px-4 py-3 text-slate-700">{row.outTime || "-"}</td>
                <td className="px-4 py-3 text-slate-700">
                  <div className="font-medium">{row.deviceName || "-"}</div>
                  <div className="text-xs text-slate-500">{row.deviceId || ""}</div>
                </td>
                <td className="px-4 py-3 text-slate-700">{row.card || "-"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                      row.status === "Present"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                No attendance punches found for this employee.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const StellarAttendanceManager = () => {
  const { registrationId } = useParams();
  const [searchParams] = useSearchParams();
  const isDetail = Boolean(registrationId);
  const initialStart = searchParams.get("start");
  const initialEnd = searchParams.get("end");
  const defaultPayrollMonth = getDefaultPayrollMonth();
  const currentCalendarMonthRange = getCurrentCalendarMonthRange();
  const defaultAttendanceRange = isDetail
    ? currentCalendarMonthRange
    : getDefaultAttendanceRange();
  const initialMonth = searchParams.get("start")?.slice(0, 7) || defaultPayrollMonth;
  const initialRange = getMonthRange(initialMonth);
  const hasExplicitRange = Boolean(initialStart || initialEnd);
  const shouldUseCustomRange =
    hasExplicitRange &&
    (initialStart !== initialRange.start || initialEnd !== initialRange.end);

  const [month, setMonth] = useState(initialMonth);
  const [rangeMode, setRangeMode] = useState(
    shouldUseCustomRange || isDetail ? "custom" : "month",
  );
  const [customRange, setCustomRange] = useState({
    start: initialStart || defaultAttendanceRange.start,
    end: initialEnd || defaultAttendanceRange.end,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [syncNonce, setSyncNonce] = useState(0);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const monthRange = useMemo(() => getMonthRange(month), [month]);
  const activeRange = rangeMode === "custom" ? customRange : monthRange;
  useEffect(() => {
    setSyncNonce(0);
  }, [activeRange.start, activeRange.end]);
  const workDays = useMemo(
    () => countDays(activeRange.start, activeRange.end),
    [activeRange.start, activeRange.end],
  );

  const logQueryArgs = useMemo(
    () => ({
      start_date: activeRange.start,
      end_date: activeRange.end,
      start_time: "00:00:01",
      end_time: "23:59:59",
      ...(syncNonce ? { sync: "true", syncNonce } : {}),
    }),
    [activeRange.start, activeRange.end, syncNonce],
  );

  const {
    data: logsData,
    isFetching: isLogsFetching,
    isError: isLogsError,
    error: logsError,
  } = useGetStellarAttendanceLogsQuery(logQueryArgs);
  const { data: usersData, isFetching: isUsersFetching } =
    useGetStellarAttendanceUsersQuery(undefined, { skip: isDetail });
  const { data: employeesData, isFetching: isEmployeesFetching } =
    useGetStellarAttendanceEmployeesQuery(
      { page: 1, limit: 1000, status: "Active" },
      { skip: isDetail },
    );
  const { data: holidaysData, isFetching: isHolidaysFetching } =
    useGetStellarAttendanceHolidaysQuery(
      { page: 1, limit: 1000, status: "Active" },
      { skip: isDetail },
    );
  const { data: leavesData, isFetching: isLeavesFetching } =
    useGetStellarAttendanceLeavesQuery(
      {
        page: 1,
        limit: 1000,
        from: activeRange.start,
        to: activeRange.end,
        approvalStatus: "Approved",
      },
      { skip: isDetail },
    );

  const logsResponse = logsData?.data || {};
  const usersResponse = usersData?.data || {};
  const logs = logsResponse.rows || [];
  const users = usersResponse.rows || [];
  const employees = employeesData?.data || [];
  const holidays = holidaysData?.data || [];
  const leaveRequests = leavesData?.data || [];
  const decodedRegistrationId = registrationId
    ? decodeURIComponent(registrationId)
    : "";
  const detailName = searchParams.get("name") || decodedRegistrationId;
  const detailPhone = searchParams.get("phone") || "";

  const summaryRows = useMemo(
    () =>
      buildSummaryRows({
        users,
        logs,
        employees,
        holidays,
        leaveRequests,
        range: activeRange,
      }),
    [users, logs, employees, holidays, leaveRequests, activeRange],
  );

  const filteredSummaryRows = useMemo(() => {
    const q = debouncedSearchTerm.trim().toLowerCase();
    if (!q) return summaryRows;
    return summaryRows.filter((row) =>
      [row.registrationId, row.name, row.phone].some((value) =>
        toLower(value).includes(q),
      ),
    );
  }, [summaryRows, debouncedSearchTerm]);

  const detailRows = useMemo(
    () =>
      buildDetailRows({
        logs,
        registrationId: decodedRegistrationId,
        range: activeRange,
      }),
    [logs, decodedRegistrationId, activeRange],
  );
  const presentDetailDays = useMemo(
    () => detailRows.filter((row) => row.status === "Present").length,
    [detailRows],
  );

  const stats = [
    {
      name: isDetail ? "Present Days" : "Employees",
      value: isDetail ? presentDetailDays : filteredSummaryRows.length,
      icon: isDetail ? Fingerprint : Users2,
      iconBg: "#EEF2FF",
      iconColor: "#4338CA",
    },
    {
      name: "Working Days",
      value: workDays,
      icon: CalendarRange,
      iconBg: "#ECFDF5",
      iconColor: "#047857",
    },
    {
      name: "Log Rows",
      value: logsResponse.meta?.count || logs.length || 0,
      icon: ClipboardCheck,
      iconBg: "#FFF7ED",
      iconColor: "#C2410C",
    },
  ];

  return (
    <HrmWorkspace
      eyebrow="Stellar RAMS"
      title={isDetail ? `Attendance Details - ${detailName}` : "Attendance"}
      description={
        isDetail
          ? "Review this employee's attendance punches by month or a custom date range."
          : "Review every Stellar user in a monthly attendance summary, then open details for employee-wise logs."
      }
      stats={stats}
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              {isDetail ? (
                <Link
                  to="/hrm/attendance"
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft size={15} />
                  Back
                </Link>
              ) : null}
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {isDetail ? "Detail Filters" : "Monthly Summary"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Same filter requests are served from backend cache for five minutes.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:flex xl:flex-wrap xl:justify-end">
            <select
              value={rangeMode}
              onChange={(e) => setRangeMode(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-black outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="month">Month</option>
              <option value="custom">Custom Date</option>
            </select>

            {rangeMode === "month" ? (
              <DatePickerField
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            ) : (
              <>
                <DatePickerField
                  value={customRange.start}
                  onChange={(e) =>
                    setCustomRange((prev) => ({ ...prev, start: e.target.value }))
                  }
                />
                <DatePickerField
                  value={customRange.end}
                  onChange={(e) =>
                    setCustomRange((prev) => ({ ...prev, end: e.target.value }))
                  }
                />
              </>
            )}

            <button
              type="button"
              onClick={() => setSyncNonce((prev) => prev + 1)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
            >
              <RefreshCcw size={16} className={isLogsFetching ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {!isDetail ? (
          <label className="relative mt-4 block w-full max-w-md">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reg ID, name, phone"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-black outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>
        ) : (
          <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
            <div>Reg ID: {decodedRegistrationId}</div>
            <div>Name: {detailName}</div>
            <div>Phone: {detailPhone || "-"}</div>
          </div>
        )}

        <div className="mt-4">
          <StatusBadge cacheInfo={logsResponse.cache} />
        </div>
      </div>

      {isLogsError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">
          {logsError?.data?.message || "Failed to fetch Stellar attendance response"}
        </div>
      ) : null}

      {isDetail ? (
        <DetailTable rows={detailRows} isLoading={isLogsFetching} />
      ) : (
        <SummaryTable
          rows={filteredSummaryRows}
          isLoading={
            isLogsFetching ||
            isUsersFetching ||
            isEmployeesFetching ||
            isHolidaysFetching ||
            isLeavesFetching
          }
          range={activeRange}
        />
      )}
    </HrmWorkspace>
  );
};

export default StellarAttendanceManager;
