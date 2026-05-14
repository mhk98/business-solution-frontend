import Header from "../components/common/Header";
import HrmCrudManager from "../components/hrm/HrmCrudManager";
import {
  useCreateLeaveTypeMutation,
  useDeleteLeaveTypeMutation,
  useGetAllLeaveTypesQuery,
  useUpdateLeaveTypeMutation,
} from "../features/leaveType/leaveType";

const LeaveTypePage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Leave Types" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <HrmCrudManager
          eyebrow="Phase 3"
          entityLabel="Leave Type"
          title="Leave Policy Setup"
          description="Configure paid and unpaid leave buckets before employees start applying for leave."
          fields={[
            { name: "name", label: "Leave Name", required: true },
            { name: "code", label: "Code" },
            {
              name: "isPaid",
              label: "Paid or Unpaid",
              type: "select",
              options: [
                { value: "true", label: "Paid" },
                { value: "false", label: "Unpaid" },
              ],
              defaultValue: "true",
              parse: (value) => value === "true",
              serialize: (value) => (value ? "true" : "false"),
            },
            { name: "daysPerYear", label: "Days Per Year", type: "number" },
            {
              name: "carryForward",
              label: "Carry Forward",
              type: "select",
              options: [
                { value: "true", label: "Yes" },
                { value: "false", label: "No" },
              ],
              defaultValue: "false",
              parse: (value) => value === "true",
              serialize: (value) => (value ? "true" : "false"),
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
              key: "isPaid",
              label: "Paid",
              render: (row) => (row.isPaid ? "Paid" : "Unpaid"),
            },
            { key: "daysPerYear", label: "Days/Year" },
            { key: "status", label: "Status" },
          ]}
          useListQuery={useGetAllLeaveTypesQuery}
          useCreateMutation={useCreateLeaveTypeMutation}
          useUpdateMutation={useUpdateLeaveTypeMutation}
          useDeleteMutation={useDeleteLeaveTypeMutation}
        />
      </main>
    </div>
  );
};

export default LeaveTypePage;
