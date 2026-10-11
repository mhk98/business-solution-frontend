import Header from "../components/common/Header";
import HrmCrudManager from "../components/hrm/HrmCrudManager";
import {
  useCreateAttendanceRegularizationMutation,
  useDeleteAttendanceRegularizationMutation,
  useGetAllAttendanceRegularizationsQuery,
  useUpdateAttendanceRegularizationMutation,
} from "../features/attendanceRegularization/attendanceRegularization";
import { useGetAttendancePeopleQuery } from "../features/attendance/attendance";

const AttendanceRegularizationPage = () => {
  const currentUserId = localStorage.getItem("userId");
  // Attendance people are Users; their Id is the device PIN.
  const { data: peopleRes } = useGetAttendancePeopleQuery();
  const employeeOptions = (peopleRes?.data || []).map((person) => ({
    value: person.Id,
    label: `${person.name} (ID ${person.Id})`,
  }));
  // Everyone active (incl. exempt) — requesters and approvers.
  const { data: allPeopleRes } = useGetAttendancePeopleQuery({ scope: "all" });
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
  // The approver: the employee's department leader, else the requester's.
  const leaderFor = (...ids) => ids.map((id) => personById(id)?.teamLeaderUserId).find(Boolean) || "";

  return (
    <div className="flex-1 relative z-10">
      <Header title="Attendance Regularization" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <HrmCrudManager
          eyebrow="Phase 2"
          entityLabel="Attendance Regularization"
          title="Attendance Corrections"
          description="Capture missing punch and manual correction requests before payroll and daily attendance are finalized."
          fields={[
            {
              name: "userId",
              label: "Employee",
              type: "combobox",
              options: employeeOptions,
              placeholder: "Select employee",
              required: true,
            },
            {
              name: "attendanceDate",
              label: "Attendance Date",
              type: "date",
              required: true,
            },
            {
              name: "requestType",
              label: "Request Type",
              type: "select",
              options: [
                { value: "Missing Punch", label: "Missing Punch" },
                { value: "Manual In/Out", label: "Manual In/Out" },
                { value: "Wrong Device Punch", label: "Wrong Device Punch" },
              ],
              defaultValue: "Missing Punch",
            },
            {
              name: "requestedIn",
              label: "Requested In",
              type: "datetime-local",
            },
            {
              name: "requestedOut",
              label: "Requested Out",
              type: "datetime-local",
            },
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
              options: requesterOptions,
              placeholder: "Select requester",
              defaultValue: currentUserId || "",
            },
            {
              name: "approvedByUserId",
              label: "Approved By",
              type: "combobox",
              options: approverOptions,
              placeholder: "Select approver",
              defaultValue: leaderFor(currentUserId),
              help: "Filled with the employee's department team leader.",
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
            {
              name: "approvedAt",
              label: "Approved At",
              type: "datetime-local",
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
            { key: "attendanceDate", label: "Date" },
            { key: "requestType", label: "Type" },
            { key: "approvalStatus", label: "Approval" },
            {
              key: "reason",
              label: "Reason",
              render: (row) =>
                row.reason?.length > 48
                  ? `${row.reason.slice(0, 48)}...`
                  : row.reason,
            },
          ]}
          useListQuery={useGetAllAttendanceRegularizationsQuery}
          onFieldChange={(name, value, form) => {
            if (name === "userId" || name === "requestedByUserId") {
              const leader = leaderFor(form.userId, form.requestedByUserId);
              if (leader) return { approvedByUserId: leader };
            }
            return undefined;
          }}
          useCreateMutation={useCreateAttendanceRegularizationMutation}
          useUpdateMutation={useUpdateAttendanceRegularizationMutation}
          useDeleteMutation={useDeleteAttendanceRegularizationMutation}
        />
      </main>
    </div>
  );
};

export default AttendanceRegularizationPage;
