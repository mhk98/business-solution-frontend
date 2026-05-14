import axios from "axios";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  History,
  RefreshCcw,
  Search,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import Pagination from "../common/Pagination";

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api/v1`;

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 14,
    borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 4px rgba(99,102,241,0.12)" : "none",
    "&:hover": { borderColor: "#cbd5e1" },
  }),
  valueContainer: (base) => ({ ...base, padding: "0 12px" }),
  placeholder: (base) => ({ ...base, color: "#64748b" }),
  menu: (base) => ({
    ...base,
    borderRadius: 14,
    overflow: "hidden",
    zIndex: 30,
  }),
};

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-BD", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getUserLabel = (user) => {
  const fullName = `${user?.FirstName || ""} ${user?.LastName || ""}`.trim();
  return fullName || user?.Email || "Unknown User";
};

const isWithinDateRange = (value, startDate, endDate) => {
  if (!startDate && !endDate) return true;
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`);
    if (date < start) return false;
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`);
    if (date > end) return false;
  }

  return true;
};

const getStatusBadgeClass = (status) => {
  const normalized = String(status || "").toLowerCase();

  if (
    normalized.includes("success") ||
    normalized.includes("ok") ||
    normalized.includes("approved")
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (
    normalized.includes("fail") ||
    normalized.includes("error") ||
    normalized.includes("denied")
  ) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
};

const getMethodBadgeClass = (method) => {
  const normalized = String(method || "").toUpperCase();

  if (normalized === "GET") {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }

  if (normalized === "POST") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (normalized === "PUT" || normalized === "PATCH") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (normalized === "DELETE") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
};

const LogHistoryTable = () => {
  const [userOptions, setUserOptions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [userSearch, setUserSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const token =
    localStorage.getItem("token") || localStorage.getItem("accessToken");

  const authHeaders = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token],
  );

  const loadUsers = async (inputValue = "") => {
    try {
      setLoadingUsers(true);

      const response = await axios.get(
        `${API_BASE_URL}/user?searchTerm=${encodeURIComponent(inputValue)}&limit=20`,
        authHeaders,
      );

      const users = response.data?.data || [];

      setUserOptions(
        users.map((user) => ({
          value: user.Id,
          label: getUserLabel(user),
          email: user.Email,
          raw: user,
        })),
      );
    } catch (error) {
      console.error("Failed to load users", error);
      setUserOptions([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadLogs = async (userId, filters = {}) => {
    if (!userId) {
      setLogs([]);
      setTotalCount(0);
      return;
    }

    try {
      setLoadingLogs(true);

      const params = new URLSearchParams({
        userId: String(userId),
        page: String(filters.page || 1),
        limit: String(filters.limit || pageSize),
      });

      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const response = await axios.get(
        `${API_BASE_URL}/user-log-history?${params.toString()}`,
        authHeaders,
      );

      const nextLogs = response.data?.data || [];
      const meta = response.data?.meta || {};
      setTotalCount(Number(meta.count || nextLogs.length || 0));
      setLogs(
        nextLogs.filter((log) =>
          isWithinDateRange(
            log?.createdAt || log?.date,
            filters.startDate,
            filters.endDate,
          ),
        ),
      );
    } catch (error) {
      console.error("Failed to load log history", error);
      setLogs([]);
      setTotalCount(0);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadUsers("");
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadUsers(userSearch);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [userSearch]);

  useEffect(() => {
    if (startDate && endDate && startDate > endDate) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (!selectedUser?.value) return;

    loadLogs(selectedUser.value, {
      startDate,
      endDate,
      page: currentPage,
      limit: pageSize,
    });
  }, [selectedUser?.value, startDate, endDate, currentPage, pageSize]);

  const handleUserChange = (selectedOption) => {
    setSelectedUser(selectedOption);
    setCurrentPage(1);
    if (!selectedOption?.value) {
      setLogs([]);
      setTotalCount(0);
    }
  };

  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
    setCurrentPage(1);
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (event) => {
    setPageSize(Number(event.target.value));
    setCurrentPage(1);
  };

  const totalLogs = totalCount;
  const successLogs = logs.filter((log) =>
    String(log?.status || "")
      .toLowerCase()
      .match(/success|ok|approved/),
  ).length;
  const failedLogs = logs.filter((log) =>
    String(log?.status || "")
      .toLowerCase()
      .match(/fail|error|denied/),
  ).length;
  const latestActivity = logs[0]?.createdAt || logs[0]?.date || null;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgba(15,23,42,0.04)] rounded-2xl p-4 sm:p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center justify-between mb-6 sm:mb-8">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Log History
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium max-w-2xl">
            Review user activity, request outcomes, and recent system actions
            from one place
          </p>
        </div>

        <div className="inline-flex w-full sm:w-auto items-center gap-3 bg-indigo-50 border border-indigo-100 px-4 sm:px-5 py-2.5 rounded-2xl shadow-sm shadow-indigo-50 self-start">
          <div className="h-8 w-8 shrink-0 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
            <History size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">
              Total Logs
            </div>
            <div className="text-base font-black text-indigo-900 tabular-nums leading-none truncate">
              {loadingLogs ? "..." : totalLogs.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-2xl bg-white text-slate-700 flex items-center justify-center shadow-sm border border-slate-200">
              <Activity size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Total Entries
              </p>
              <p className="text-lg sm:text-xl font-black text-slate-900 truncate">
                {loadingLogs ? "..." : totalLogs.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-sm border border-emerald-100">
              <CheckCircle2 size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
                Page Success
              </p>
              <p className="text-lg sm:text-xl font-black text-emerald-900 truncate">
                {loadingLogs ? "..." : successLogs.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/80 p-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-2xl bg-white text-rose-600 flex items-center justify-center shadow-sm border border-rose-100">
              <AlertCircle size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">
                Page Failed
              </p>
              <p className="text-lg sm:text-xl font-black text-rose-900 truncate">
                {loadingLogs ? "..." : failedLogs.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-2xl bg-white text-indigo-600 flex items-center justify-center shadow-sm border border-indigo-100">
              <UserRound size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-400">
                Page Latest
              </p>
              <p className="text-sm font-black text-indigo-900 break-words">
                {loadingLogs ? "Loading..." : formatDateTime(latestActivity)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(150px,0.35fr)_minmax(150px,0.35fr)_minmax(130px,0.25fr)_auto] gap-4 mb-6 sm:mb-8 bg-slate-50/50 p-4 sm:p-6 rounded-3xl border border-slate-100 items-end">
        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            User
          </label>
          <Select
            options={userOptions}
            value={selectedUser}
            isLoading={loadingUsers}
            onChange={handleUserChange}
            onInputChange={(value, meta) => {
              if (meta.action === "input-change") setUserSearch(value);
              if (meta.action === "menu-close" && !value) setUserSearch("");
              return value;
            }}
            placeholder="Search user..."
            isClearable
            styles={selectStyles}
            className="text-black"
            noOptionsMessage={() =>
              loadingUsers ? "Loading users..." : "No user found"
            }
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            From
          </label>
          <label className="relative">
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-200 focus:ring-4 focus:ring-indigo-100"
            />
            <Calendar
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </label>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            To
          </label>
          <label className="relative">
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={handleEndDateChange}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-200 focus:ring-4 focus:ring-indigo-100"
            />
            <Calendar
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </label>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            Per Page
          </label>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-200 focus:ring-4 focus:ring-indigo-100"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedUser(null);
            setUserSearch("");
            setStartDate("");
            setEndDate("");
            setCurrentPage(1);
            setTotalCount(0);
            setLogs([]);
            loadUsers("");
          }}
          className="h-11 w-full lg:w-auto px-5 border border-slate-200 rounded-xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition active:scale-95 flex items-center justify-center gap-2 shadow-sm"
        >
          <RefreshCcw size={16} />
          Reset
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="md:hidden space-y-3 p-3 sm:p-4">
          {logs.map((log) => (
            <motion.div
              key={log.Id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 break-words">
                    {log.action || "-"}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500 break-words">
                    {formatDateTime(log.createdAt || log.date)}
                  </p>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeClass(log.status)}`}
                >
                  {log.status || "Unknown"}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    User
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900 break-words">
                    {getUserLabel(log.user)}
                  </p>
                  <p className="text-xs text-slate-500 break-all">
                    {log.user?.Email || selectedUser?.email || "-"}
                  </p>
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Module
                    </p>
                    <p className="mt-1 text-sm text-slate-700 break-words">
                      {log.module || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Method
                    </p>
                    <span
                      className={`mt-1 inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${getMethodBadgeClass(log.method)}`}
                    >
                      {log.method || "-"}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Route
                  </p>
                  <p className="mt-1 text-sm text-slate-700 break-all">
                    {log.route || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Message
                  </p>
                  <p className="mt-1 text-sm text-slate-600 break-words">
                    {log.responseMessage || "-"}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-4 lg:px-6 py-4 lg:py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Time
                </th>
                <th className="px-4 lg:px-6 py-4 lg:py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  User
                </th>
                <th className="px-4 lg:px-6 py-4 lg:py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Action
                </th>
                <th className="px-4 lg:px-6 py-4 lg:py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Module
                </th>
                <th className="px-4 lg:px-6 py-4 lg:py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Method
                </th>
                <th className="px-4 lg:px-6 py-4 lg:py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Route
                </th>
                <th className="px-4 lg:px-6 py-4 lg:py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Status
                </th>
                <th className="px-4 lg:px-6 py-4 lg:py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Message
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {logs.map((log) => (
                <motion.tr
                  key={log.Id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="hover:bg-slate-50 group"
                >
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-slate-900">
                      {formatDateTime(log.createdAt || log.date)}
                    </div>
                  </td>

                  <td className="px-4 lg:px-6 py-4">
                    <div className="text-sm font-bold text-slate-900">
                      {getUserLabel(log.user)}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {log.user?.Email || selectedUser?.email || "-"}
                    </div>
                  </td>

                  <td className="px-4 lg:px-6 py-4 text-sm font-semibold text-slate-700">
                    {log.action || "-"}
                  </td>

                  <td className="px-4 lg:px-6 py-4 text-sm text-slate-700">
                    {log.module || "-"}
                  </td>

                  <td className="px-4 lg:px-6 py-4">
                    <span
                      className={`inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${getMethodBadgeClass(log.method)}`}
                    >
                      {log.method || "-"}
                    </span>
                  </td>

                  <td className="px-4 lg:px-6 py-4 text-sm text-slate-700 max-w-[220px]">
                    <div className="truncate" title={log.route || "-"}>
                      {log.route || "-"}
                    </div>
                  </td>

                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeClass(log.status)}`}
                    >
                      {log.status || "Unknown"}
                    </span>
                  </td>

                  <td className="px-4 lg:px-6 py-4 text-sm text-slate-600 max-w-[280px]">
                    <div
                      className="line-clamp-2 break-words"
                      title={log.responseMessage || "-"}
                    >
                      {log.responseMessage || "-"}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {loadingLogs && (
            <div className="py-24 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-[3px] border-indigo-600/20 border-t-indigo-600"></div>
              <p className="mt-4 text-sm font-semibold text-slate-500">
                Loading log history...
              </p>
            </div>
          )}

          {!loadingLogs && !selectedUser && (
            <div className="py-24 text-center text-slate-400 px-6">
              <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
                <Search size={24} />
              </div>
              <p className="font-bold text-sm text-slate-600">
                Select a user to view log history
              </p>
              <p className="text-xs mt-2">
                Search by name or email to load recent activity records
              </p>
            </div>
          )}

          {!loadingLogs && selectedUser && logs.length === 0 && (
            <div className="py-24 text-center text-slate-400 px-6">
              <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
                <History size={24} />
              </div>
              <p className="font-bold text-sm text-slate-600">
                No log history found
              </p>
              <p className="text-xs mt-2">
                This user does not have any recent activity records yet
              </p>
            </div>
          )}
        </div>
      </div>

      {!loadingLogs && selectedUser && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalCount={totalCount}
          pageSize={pageSize}
        />
      )}
    </motion.div>
  );
};

export default LogHistoryTable;
