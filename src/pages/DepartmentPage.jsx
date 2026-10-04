import Header from "../components/common/Header";
import HrmCrudManager from "../components/hrm/HrmCrudManager";
import {
  useApproveDepartmentMutation,
  useCreateDepartmentMutation,
  useDeleteDepartmentMutation,
  useGetAllDepartmentsQuery,
  useUpdateDepartmentMutation,
} from "../features/department/department";
import { useGetAttendancePeopleQuery } from "../features/attendance/attendance";

const DepartmentPage = () => {
  const { data: peopleRes } = useGetAttendancePeopleQuery({ scope: "all" });
  const people = peopleRes?.data || [];
  const userOptions = people.map((person) => ({ value: person.Id, label: person.name }));
  const userName = (id) => people.find((person) => String(person.Id) === String(id))?.name || (id ? `User #${id}` : "-");

  return (
    <div className="flex-1 relative z-10">
      <Header title="Department" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <HrmCrudManager
          entityLabel="Department"
          title="Department Management"
          description="Create and maintain HR departments that employees and designations belong to."
          fields={[
            { name: "name", label: "Department Name", required: true },
            { name: "code", label: "Code" },
            { name: "description", label: "Description", type: "textarea" },
            {
              name: "teamLeaderUserId",
              label: "Team Leader",
              type: "select",
              options: userOptions,
              placeholder: "No team leader",
              help: "Approves this department's leave requests and gets their notifications.",
            },
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
            { key: "description", label: "Description" },
            { key: "teamLeaderUserId", label: "Team Leader", render: (row) => userName(row.teamLeaderUserId) },
            { key: "status", label: "Status" },
          ]}
          useListQuery={useGetAllDepartmentsQuery}
          useCreateMutation={useCreateDepartmentMutation}
          useUpdateMutation={useUpdateDepartmentMutation}
          useDeleteMutation={useDeleteDepartmentMutation}
          useApproveMutation={useApproveDepartmentMutation}
        />
      </main>
    </div>
  );
};

export default DepartmentPage;
