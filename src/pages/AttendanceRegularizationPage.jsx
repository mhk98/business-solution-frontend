import Header from "../components/common/Header";
import HrmCrudManager from "../components/hrm/HrmCrudManager";
import {
  useCreateAttendanceRegularizationMutation,
  useDeleteAttendanceRegularizationMutation,
  useGetAllAttendanceRegularizationsQuery,
  useUpdateAttendanceRegularizationMutation,
} from "../features/attendanceRegularization/attendanceRegularization";
import { useGetAllEmployeeListQuery } from "../features/employeeList/employeeList";

const AttendanceRegularizationPage = () => {
  const currentUserId = localStorage.getItem("userId");
  const { data: employeesRes } = useGetAllEmployeeListQuery({
    page: 1,
    limit: 500,
  });
  const employeeOptions = (employeesRes?.data || []).map((employee) => ({
    value: employee.Id,
    label: `${employee.name}${employee.employeeCode ? ` • ${employee.employeeCode}` : ""}`,
  }));

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
              name: "employeeId",
              label: "Employee",
              type: "select",
              options: employeeOptions,
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
              label: "Requested By User ID",
              type: "number",
              defaultValue: currentUserId || "",
            },
            {
              name: "approvedByUserId",
              label: "Approved By User ID",
              type: "number",
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
              render: (row) => row.employee?.name || "-",
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
          useCreateMutation={useCreateAttendanceRegularizationMutation}
          useUpdateMutation={useUpdateAttendanceRegularizationMutation}
          useDeleteMutation={useDeleteAttendanceRegularizationMutation}
        />
      </main>
    </div>
  );
};

export default AttendanceRegularizationPage;
