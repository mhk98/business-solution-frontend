import Header from "../components/common/Header";
import HrmCrudManager from "../components/hrm/HrmCrudManager";
import {
  useApproveShiftMutation,
  useCreateShiftMutation,
  useDeleteShiftMutation,
  useGetAllShiftsQuery,
  useUpdateShiftMutation,
} from "../features/shift/shift";

const normalizeWeeklyOffDays = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      // Fall back to comma-separated input below.
    }

    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const WEEKDAY_OPTIONS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
  (day) => ({ value: day, label: day }),
);

const ShiftPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Shift" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <HrmCrudManager
          entityLabel="Shift"
          title="Shift Management"
          description="Define office shifts: timing, grace, weekly off, break and the half-day / overtime limits the attendance calculation uses. An end time earlier than the start is a night shift."
          fields={[
            { name: "name", label: "Shift Name", required: true },
            { name: "code", label: "Code" },
            { name: "startTime", label: "Start Time", type: "time" },
            { name: "endTime", label: "End Time", type: "time" },
            {
              name: "graceInMinutes",
              label: "Grace In Minutes",
              type: "number",
              help: "Coming in within this is not late.",
            },
            {
              name: "graceOutMinutes",
              label: "Grace Out Minutes",
              type: "number",
              help: "Leaving within this before the end is not early leave.",
            },
            {
              name: "weeklyOffDays",
              label: "Weekly Off Days",
              type: "multiselect",
              options: WEEKDAY_OPTIONS,
              fullWidth: true,
              parse: normalizeWeeklyOffDays,
              serialize: normalizeWeeklyOffDays,
            },
            {
              name: "breakMinutes",
              label: "Break Minutes",
              type: "number",
              help: "Deducted from worked time.",
            },
            {
              name: "fullDayMinutes",
              label: "Full Day Minimum (minutes)",
              type: "number",
              help: "Worked less than this = Half Day. Empty = off.",
            },
            {
              name: "halfDayMinutes",
              label: "Half Day Minimum (minutes)",
              type: "number",
              help: "Worked less than this = Absent. Empty = off.",
            },
            {
              name: "overtimeStartAfterMinutes",
              label: "Overtime Starts After (minutes)",
              type: "number",
              help: "Minutes after shift end before overtime counts.",
            },
            {
              name: "minimumOvertimeMinutes",
              label: "Minimum Overtime (minutes)",
              type: "number",
              help: "Shorter overtime is ignored. Turn overtime on in Attendance Policy.",
            },
            { name: "note", label: "Note", type: "textarea" },
            {
              name: "status",
              label: "Status",
              type: "select",
              options: [
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" },
              ],
              defaultValue: "Active",
            },
          ]}
          columns={[
            { key: "name", label: "Name" },
            { key: "code", label: "Code" },
            {
              key: "timing",
              label: "Timing",
              render: (row) =>
                `${row.startTime || "-"} - ${row.endTime || "-"}`,
            },
            {
              key: "weeklyOffDays",
              label: "Weekly Off",
              render: (row) => {
                const weeklyOffDays = normalizeWeeklyOffDays(
                  row.weeklyOffDays,
                );
                return weeklyOffDays.length ? weeklyOffDays.join(", ") : "-";
              },
            },
            { key: "status", label: "Status" },
          ]}
          useListQuery={useGetAllShiftsQuery}
          useCreateMutation={useCreateShiftMutation}
          useUpdateMutation={useUpdateShiftMutation}
          useDeleteMutation={useDeleteShiftMutation}
          useApproveMutation={useApproveShiftMutation}
        />
      </main>
    </div>
  );
};

export default ShiftPage;
