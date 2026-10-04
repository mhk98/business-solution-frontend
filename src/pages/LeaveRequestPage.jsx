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

const LeaveRequestPage = () => {
  const currentUserId = localStorage.getItem("userId");
  // Attendance people are Users; their Id is the device PIN.
  const { data: peopleRes } = useGetAttendancePeopleQuery();
  // Everyone active (incl. exempt) — requesters and approvers.
  const { data: allPeopleRes } = useGetAttendancePeopleQuery({ scope: "all" });
  const { data: leaveTypesRes } = useGetAllLeaveTypesQuery({
    page: 1,
    limit: 500,
  });

  const employeeOptions = (peopleRes?.data || []).map((person) => ({
    value: person.Id,
    label: `${person.name} (ID ${person.Id})`,
  }));
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
          description="Apply for leave and send it to the department's team leader for approval. Approved leave is counted in attendance."
          fields={[
            {
              name: "userId",
              label: "Employee",
              type: "select",
              options: employeeOptions,
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
              type: "select",
              options: requesterOptions,
              defaultValue: currentUserId || "",
            },
            {
              name: "approvedByUserId",
              label: "Approved By (Team Leader)",
              type: "select",
              options: approverOptions,
              defaultValue: leaderFor(currentUserId),
              help: "Filled with the employee's department team leader — they get a notification to approve.",
            },
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
                { value: "Pending", label: "Pending" },
                { value: "Approved", label: "Approved" },
                { value: "Rejected", label: "Rejected" },
              ],
              defaultValue: "Pending",
            },
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
            { key: "approvedBy", label: "Approver", render: (row) => fullName(row.approvedBy) },
            { key: "approvalStatus", label: "Approval" },
          ]}
          onFieldChange={(name, value, form) => {
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
