import { CalendarRange, Users } from "lucide-react";
import Header from "../components/common/Header";
import HrmCrudManager from "../components/hrm/HrmCrudManager";
import { useGetAllShiftsQuery } from "../features/shift/shift";
import { useGetAllDepartmentsQuery } from "../features/department/department";
import {
  useCreateShiftAssignmentMutation,
  useDeleteShiftAssignmentMutation,
  useGetAttendancePeopleQuery,
  useGetAttendanceSetupQuery,
  useGetShiftAssignmentsQuery,
  useUpdateShiftAssignmentMutation,
} from "../features/attendance/attendance";
import { bdToday } from "../components/attendance/attendanceUi";

const WEEKDAY_OPTIONS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
  (day) => ({ value: day, label: day }),
);

const parseWeekdays = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value.split(",").map((day) => day.trim()).filter(Boolean);
    }
  }
  return [];
};

const NO_DEPARTMENT = "none";

const isCurrent = (row) => {
  const today = bdToday();
  return row.effectiveFrom <= today && (!row.effectiveTo || row.effectiveTo >= today);
};

const ShiftAssignmentPage = () => {
  const { data: peopleRes } = useGetAttendancePeopleQuery();
  const { data: setupRes } = useGetAttendanceSetupQuery();
  const { data: shiftsRes } = useGetAllShiftsQuery({ page: 1, limit: 200 });
  const { data: departmentsRes } = useGetAllDepartmentsQuery({ page: 1, limit: 500 });
  const { data: assignmentsRes } = useGetShiftAssignmentsQuery({ page: 1, limit: 200 });

  // Only people enrolled on / punching at an attendance device can be put on a shift.
  // Attendance Setup knows who is on a device (device user list / recent punches).
  const deviceIds = new Set(
    (setupRes?.data?.employees || [])
      .filter((employee) => employee.onDevice || employee.lastPunchDate)
      .map((employee) => Number(employee.Id)),
  );
  const devicePeople = (peopleRes?.data || []).filter(
    (person) => person.onDevice || deviceIds.has(Number(person.Id)),
  );
  const employeeOptions = devicePeople.map((person) => ({
    value: person.Id,
    label: `${person.name}${person.pin ? ` (PIN ${person.pin})` : ""}`,
    departmentId: person.departmentId ? String(person.departmentId) : NO_DEPARTMENT,
  }));
  // Departments from HRM → Department; "No department" catches device people not yet placed in one.
  const departmentOptions = [
    ...(departmentsRes?.data || [])
      .map((department) => ({ value: String(department.Id), label: department.name }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    ...(employeeOptions.some((option) => option.departmentId === NO_DEPARTMENT)
      ? [{ value: NO_DEPARTMENT, label: "No department" }]
      : []),
  ];
  const shiftOptions = (shiftsRes?.data || [])
    .filter((shift) => shift.status !== "Inactive")
    .map((shift) => ({ value: shift.Id, label: `${shift.name} (${shift.startTime || "?"}–${shift.endTime || "?"})` }));
  const rows = assignmentsRes?.data || [];

  return (
    <div className="flex-1 relative z-10">
      <Header title="Shift Assignment" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <HrmCrudManager
          eyebrow="Attendance"
          entityLabel="Shift Assignment"
          title="Shift Assignment"
          description="Put employees on a shift from a date — optionally with their own office time, grace and weekly off. A new assignment closes the previous one the day before, so past days keep the timing they were worked under."
          stats={[
            { name: "Assignments", value: rows.length, icon: CalendarRange, iconBg: "#EEF2FF", iconColor: "#4338CA" },
            { name: "Running today", value: rows.filter(isCurrent).length, icon: Users, iconBg: "#ECFDF5", iconColor: "#047857" },
          ]}
          fields={[
            {
              name: "departmentId",
              label: "Department",
              type: "combobox",
              options: departmentOptions,
              omit: true,
              placeholder: "Select department",
            },
            {
              name: "employeeIds",
              label: "Employees",
              type: "combobox",
              multiple: true,
              options: (form) => employeeOptions.filter((option) => option.departmentId === String(form.departmentId)),
              allOptions: employeeOptions,
              disabledText: (form) => (form.departmentId ? null : "Select a department first"),
              placeholder: "Select employees",
              noOptionsText: "No device-registered employee in this department",
              help: "Only employees registered on an attendance device are listed. You can switch department and keep adding. When editing, the employee can't be changed — delete and assign again instead.",
            },
            { name: "shiftId", label: "Shift", type: "select", options: shiftOptions, required: true },
            { name: "effectiveFrom", label: "From", type: "date", required: true, defaultValue: bdToday() },
            { name: "effectiveTo", label: "To (optional)", type: "date", help: "Empty = until changed." },
            {
              name: "startTime",
              label: "Own office start (optional)",
              type: "time",
              help: "Empty = the shift's start time.",
            },
            {
              name: "endTime",
              label: "Own office end (optional)",
              type: "time",
              help: "Empty = the shift's end time.",
            },
            {
              name: "graceInMinutes",
              label: "Own grace in (minutes, optional)",
              type: "number",
              help: "Empty = the shift's grace. 0 = no grace.",
            },
            {
              name: "graceOutMinutes",
              label: "Own grace out (minutes, optional)",
              type: "number",
              help: "Empty = the shift's grace. 0 = no grace.",
            },
            {
              name: "weeklyOffDays",
              label: "Weekly off override (optional)",
              type: "multiselect",
              options: WEEKDAY_OPTIONS,
              fullWidth: true,
              serialize: parseWeekdays,
              parse: (value) => (Array.isArray(value) && value.length ? value : null),
              help: "Leave empty to use the shift's weekly off. Use for someone whose off day differs (e.g. rotating).",
            },
            { name: "note", label: "Note", type: "textarea", fullWidth: true },
          ]}
          columns={[
            { key: "employee", label: "Employee", render: (row) => row.employee?.name || "-" },
            {
              key: "shift",
              label: "Shift",
              render: (row) => (row.shift ? `${row.shift.name} (${row.shift.startTime}–${row.shift.endTime})` : "-"),
            },
            {
              key: "officeTime",
              label: "Office Time",
              render: (row) => {
                const start = row.startTime || row.shift?.startTime || "?";
                const end = row.endTime || row.shift?.endTime || "?";
                const own = row.startTime || row.graceInMinutes !== null || row.graceOutMinutes !== null;
                const grace =
                  row.graceInMinutes !== null && row.graceInMinutes !== undefined
                    ? ` · grace ${row.graceInMinutes}/${row.graceOutMinutes ?? "-"}m`
                    : "";
                return `${start}–${end}${grace}${own ? " (own)" : ""}`;
              },
            },
            { key: "effectiveFrom", label: "From" },
            { key: "effectiveTo", label: "To", render: (row) => row.effectiveTo || "Ongoing" },
            {
              key: "weeklyOffDays",
              label: "Weekly Off",
              render: (row) => {
                const days = parseWeekdays(row.weeklyOffDays);
                if (days.length) return `${days.join(", ")} (override)`;
                const shiftDays = parseWeekdays(row.shift?.weeklyOffDays);
                return shiftDays.length ? shiftDays.join(", ") : "-";
              },
            },
            { key: "current", label: "Status", render: (row) => (isCurrent(row) ? "Running" : row.effectiveFrom > bdToday() ? "Upcoming" : "Ended") },
          ]}
          useListQuery={useGetShiftAssignmentsQuery}
          useCreateMutation={useCreateShiftAssignmentMutation}
          useUpdateMutation={useUpdateShiftAssignmentMutation}
          useDeleteMutation={useDeleteShiftAssignmentMutation}
        />
      </main>
    </div>
  );
};

export default ShiftAssignmentPage;
