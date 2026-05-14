import Header from "../components/common/Header";
import HrmCrudManager from "../components/hrm/HrmCrudManager";
import {
  useApproveDepartmentMutation,
  useCreateDepartmentMutation,
  useDeleteDepartmentMutation,
  useGetAllDepartmentsQuery,
  useUpdateDepartmentMutation,
} from "../features/department/department";

const DepartmentPage = () => {
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
