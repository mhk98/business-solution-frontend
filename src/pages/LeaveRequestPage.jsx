import Header from "../components/common/Header";
import HrmCrudManager from "../components/hrm/HrmCrudManager";
import {
  useCreateLeaveRequestMutation,
  useDeleteLeaveRequestMutation,
  useGetAllLeaveRequestsQuery,
  useUpdateLeaveRequestMutation,
} from "../features/leaveRequest/leaveRequest";
import { useGetAllEmployeeListQuery } from "../features/employeeList/employeeList";
import { useGetAllLeaveTypesQuery } from "../features/leaveType/leaveType";

const LeaveRequestPage = () => {
  const currentUserId = localStorage.getItem("userId");
  const { data: employeesRes } = useGetAllEmployeeListQuery({
    page: 1,
    limit: 500,
  });
  const { data: leaveTypesRes } = useGetAllLeaveTypesQuery({
    page: 1,
    limit: 500,
  });

  const employeeOptions = (employeesRes?.data || []).map((employee) => ({
    value: employee.Id,
    label: `${employee.name}${employee.employeeCode ? ` • ${employee.employeeCode}` : ""}`,
  }));
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
          description="Submit, approve and review leave applications so payroll can respect paid and unpaid absence."
          fields={[
            {
              name: "employeeId",
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
            { name: "totalDays", label: "Total Days", type: "number" },
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
              render: (row) => row.employee?.name || "-",
            },
            {
              key: "leaveType",
              label: "Leave Type",
              render: (row) => row.leaveType?.name || "-",
            },
            { key: "startDate", label: "Start" },
            { key: "endDate", label: "End" },
            { key: "approvalStatus", label: "Approval" },
          ]}
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
