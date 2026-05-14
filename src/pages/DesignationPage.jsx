import Header from "../components/common/Header";
import HrmCrudManager from "../components/hrm/HrmCrudManager";
import {
  useApproveDesignationMutation,
  useCreateDesignationMutation,
  useDeleteDesignationMutation,
  useGetAllDesignationsQuery,
  useUpdateDesignationMutation,
} from "../features/designation/designation";
import { useGetAllDepartmentsQuery } from "../features/department/department";

const DesignationPage = () => {
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
      <Header title="Designation" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <HrmCrudManager
          entityLabel="Designation"
          title="Designation Management"
          description="Manage job titles and optionally map them to departments for employee assignment."
          fields={[
            {
              name: "departmentId",
              label: "Department",
              type: "select",
              options: departmentOptions,
              required: true,
            },
            { name: "name", label: "Designation Name", required: true },
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
            { key: "status", label: "Status" },
          ]}
          useListQuery={useGetAllDesignationsQuery}
          useCreateMutation={useCreateDesignationMutation}
          useUpdateMutation={useUpdateDesignationMutation}
          useDeleteMutation={useDeleteDesignationMutation}
          useApproveMutation={useApproveDesignationMutation}
        />
      </main>
    </div>
  );
};

export default DesignationPage;
