import Header from "../components/common/Header";
import HrmCrudManager from "../components/hrm/HrmCrudManager";
import { useGetAllDepartmentsQuery } from "../features/department/department";
import {
  useApproveTeamMutation,
  useCreateTeamMutation,
  useDeleteTeamMutation,
  useGetAllTeamsQuery,
  useUpdateTeamMutation,
} from "../features/team/team";

const TeamPage = () => {
  const { data: departmentsRes } = useGetAllDepartmentsQuery({
    page: 1,
    limit: 500,
  });

  const departmentOptions = (departmentsRes?.data || []).map((department) => ({
    value: department.Id,
    label: department.name,
  }));

  return (
    <div className="flex-1 relative z-10">
      <Header title="Team" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <HrmCrudManager
          entityLabel="Team"
          title="Team Management"
          description="Create and maintain teams for grouping employees inside HR departments."
          fields={[
            {
              name: "departmentId",
              label: "Department",
              type: "select",
              options: departmentOptions,
              required: true,
            },
            { name: "name", label: "Team Name", required: true },
            { name: "code", label: "Code" },
            { name: "description", label: "Description", type: "textarea" },
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
            {
              key: "department",
              label: "Department",
              render: (row) => row.department?.name || "-",
            },
            { key: "code", label: "Code" },
            { key: "description", label: "Description" },
            { key: "status", label: "Status" },
          ]}
          useListQuery={useGetAllTeamsQuery}
          useCreateMutation={useCreateTeamMutation}
          useUpdateMutation={useUpdateTeamMutation}
          useDeleteMutation={useDeleteTeamMutation}
          useApproveMutation={useApproveTeamMutation}
        />
      </main>
    </div>
  );
};

export default TeamPage;
