import Header from "../components/common/Header";
import HrmCrudManager from "../components/hrm/HrmCrudManager";
import {
  useCreateLeaveRequestMutation,
  useDeleteLeaveRequestMutation,
  useGetAllLeaveRequestsQuery,
  useUpdateLeaveRequestMutation,
} from "../features/leaveRequest/leaveRequest";
import { useGetAttendancePeopleQuery } from "../features/attendance/attendance";
import { useGetAllLeaveTypesQuery } from "../features/leaveType/leaveType";
import { useGetAllDepartmentsQuery } from "../features/department/department";

const NO_DEPARTMENT = "none";

const LeaveRequestPage = () => {
  const currentUserId = localStorage.getItem("userId");
  // Only HR / Admin / Super Admin set a status here; everyone else's request
  // goes Team Leader → HR on the Leave Approvals page.
  const canSetStatus = ["hr", "admin", "superAdmin"].includes(localStorage.getItem("role") || "");
  // Attendance people are Users; their Id is the device PIN.
  const { data: peopleRes } = useGetAttendancePeopleQuery();
  // Everyone active (incl. exempt) — requesters and approvers.
  const { data: allPeopleRes } = useGetAttendancePeopleQuery({ scope: "all" });
  const { data: leaveTypesRes } = useGetAllLeaveTypesQuery({
    page: 1,
    limit: 500,
  });

  const { data: departmentsRes } = useGetAllDepartmentsQuery({ page: 1, limit: 500 });

  const employeeOptions = (peopleRes?.data || []).map((person) => ({
    value: person.Id,
    label: `${person.name} (ID ${person.Id})`,
    departmentId: person.departmentId ? String(person.departmentId) : NO_DEPARTMENT,
  }));
  // Departments from HRM → Department; "No department" catches employees not yet placed in one.
  const departmentOptions = [
    ...(departmentsRes?.data || [])
      .map((department) => ({ value: String(department.Id), label: department.name }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    ...(employeeOptions.some((option) => option.departmentId === NO_DEPARTMENT)
      ? [{ value: NO_DEPARTMENT, label: "No department" }]
      : []),
  ];
  const allPeople = allPeopleRes?.data || [];
  const personById = (id) => allPeople.find((person) => String(person.Id) === String(id));
  const requesterOptions = allPeople.map((person) => ({ value: person.Id, label: person.name }));
  // Team leaders first, labelled with the departments they lead.
  const approverOptions = [...allPeople]
    .sort((a, b) => (b.leaderOf.length > 0) - (a.leaderOf.length > 0) || a.name.localeCompare(b.name))
    .map((person) => ({
      value: person.Id,
      label: person.leaderOf.length ? `${person.name} — Team Leader (${person.leaderOf.join(", ")})` : person.name,
    }));
  // The approver for a leave: the employee's department leader, else the
  // requester's.
  const leaderFor = (...ids) => ids.map((id) => personById(id)?.teamLeaderUserId).find(Boolean) || "";
  const fullName = (user) => (user ? [user.FirstName, user.LastName].filter(Boolean).join(" ") : "-");
  const leaveTypeOptions = (leaveTypesRes?.data || []).map((type) => ({
    value: type.Id,
    label: type.name,
  }));

  return (
    <div className="flex-1 relative z-10">
      <Header title="Leave Requests" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <HrmCrudManager
          eyebrow="Phase 3"
          entityLabel="Leave Request"
          title="Leave Requests"
          description="Apply for leave: the department's team leader approves first, then HR gives the final approval. Only HR-approved leave is counted in attendance."
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
              name: "userId",
              label: "Employee",
              type: "combobox",
              options: (form) =>
                form.departmentId
                  ? employeeOptions.filter((option) => option.departmentId === String(form.departmentId))
                  : employeeOptions,
              allOptions: employeeOptions,
              // On edit the saved employee stays shown without picking a department.
              disabledText: (form) => (form.departmentId || form.userId ? null : "Select a department first"),
              placeholder: "Select employee",
              noOptionsText: "No employee in this department",
              required: true,
            },
            {
              name: "leaveTypeId",
              label: "Leave Type",
              type: "select",
              options: leaveTypeOptions,
              required: true,
            },
            {
              name: "startDate",
              label: "Start Date",
              type: "date",
              required: true,
            },
            {
              name: "endDate",
              label: "End Date",
              type: "date",
              required: true,
            },
            {
              name: "isHalfDay",
              label: "Half-day leave",
              type: "checkbox",
              checkboxLabel: "Only half of the start date",
            },
            {
              name: "halfDaySession",
              label: "Half",
              type: "select",
              options: [
                { value: "First Half", label: "First Half" },
                { value: "Second Half", label: "Second Half" },
              ],
            },
            { name: "totalDays", label: "Total Days", type: "number" },
            {
              name: "reason",
              label: "Reason",
              type: "textarea",
              required: true,
            },
            {
              name: "requestedByUserId",
              label: "Requested By",
              type: "combobox",
              placeholder: "Select requester",
              options: requesterOptions,
              defaultValue: currentUserId || "",
            },
            {
              name: "approvedByUserId",
              label: "Approved By (Team Leader)",
              type: "combobox",
              placeholder: "Select approver",
              options: approverOptions,
              defaultValue: leaderFor(currentUserId),
              help: "Filled with the employee's department team leader — they get a notification to approve.",
            },
            ...(canSetStatus
              ? [
                  {
                    name: "approvedAt",
                    label: "Approved At",
                    type: "datetime-local",
                  },
                  {
                    name: "approvalStatus",
                    label: "Approval Status",
                    type: "select",
                    options: [
                      { value: "Pending", label: "Waiting Team Leader" },
                      { value: "Leader Approved", label: "Waiting HR (Team Leader approved)" },
                      { value: "Approved", label: "Approved (HR)" },
                      { value: "Rejected", label: "Rejected" },
                    ],
                    defaultValue: "Pending",
                  },
                ]
              : []),
            { name: "note", label: "Note", type: "textarea" },
          ]}
          columns={[
            {
              key: "employee",
              label: "Employee",
              render: (row) =>
                row.attendanceUser
                  ? [row.attendanceUser.FirstName, row.attendanceUser.LastName].filter(Boolean).join(" ")
                  : row.employee?.name || "-",
            },
            {
              key: "leaveType",
              label: "Leave Type",
              render: (row) => row.leaveType?.name || "-",
            },
            { key: "startDate", label: "Start" },
            { key: "endDate", label: "End" },
            {
              key: "isHalfDay",
              label: "Days",
              render: (row) => (row.isHalfDay ? `½ (${row.halfDaySession || "Half"})` : row.totalDays || "-"),
            },
            { key: "requestedBy", label: "Requested By", render: (row) => fullName(row.requestedBy) },
            { key: "approvedBy", label: "Team Leader", render: (row) => fullName(row.approvedBy) },
            { key: "hrApprovedBy", label: "HR", render: (row) => (row.hrApprovedBy ? fullName(row.hrApprovedBy) : "-") },
            {
              key: "approvalStatus",
              label: "Approval",
              render: (row) =>
                ({ Pending: "Waiting Team Leader", "Leader Approved": "Waiting HR" })[row.approvalStatus] || row.approvalStatus,
            },
          ]}
          onFieldChange={(name, value, form) => {
            if (name === "departmentId") {
              const keep = employeeOptions.some(
                (option) => String(option.value) === String(form.userId) && option.departmentId === String(value),
              );
              if (!keep) return { userId: "" };
            }
            if (name === "userId" || name === "requestedByUserId") {
              const leader = leaderFor(form.userId, form.requestedByUserId);
              if (leader) return { approvedByUserId: leader };
            }
            return undefined;
          }}
          useListQuery={useGetAllLeaveRequestsQuery}
          useCreateMutation={useCreateLeaveRequestMutation}
          useUpdateMutation={useUpdateLeaveRequestMutation}
          useDeleteMutation={useDeleteLeaveRequestMutation}
        />
      </main>
    </div>
  );
};

export default LeaveRequestPage;
