import Header from "../components/common/Header";
import HrmCrudManager from "../components/hrm/HrmCrudManager";
import {
  useApproveHolidayMutation,
  useCreateHolidayMutation,
  useDeleteHolidayMutation,
  useGetAllHolidaysQuery,
  useUpdateHolidayMutation,
} from "../features/holiday/holiday";
import { useGetAllDepartmentsQuery } from "../features/department/department";

const parseIds = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const HolidayPage = () => {
  const { data: departmentsRes } = useGetAllDepartmentsQuery({ page: 1, limit: 500 });
  const departmentOptions = (departmentsRes?.data || []).map((row) => ({ value: row.Id, label: row.name }));
  const departmentName = (id) => departmentOptions.find((row) => String(row.value) === String(id))?.label || `#${id}`;

  return (
    <div className="flex-1 relative z-10">
      <Header title="Holiday" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <HrmCrudManager
          entityLabel="Holiday"
          title="Holiday Calendar"
          description="Maintain single-day and multi-day holiday ranges for attendance and leave calculations."
          fields={[
            { name: "name", label: "Holiday Name", required: true },
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
              name: "holidayType",
              label: "Type",
              type: "select",
              options: [
                { value: "Govt Holiday", label: "Govt Holiday" },
                { value: "Public Holiday", label: "Public Holiday" },
                { value: "Company Holiday", label: "Company Holiday" },
                { value: "Festival Holiday", label: "Festival Holiday" },
              ],
            },
            {
              name: "departmentIds",
              label: "Applies to departments",
              type: "multiselect",
              options: departmentOptions,
              fullWidth: true,
              serialize: parseIds,
              parse: (value) => (Array.isArray(value) && value.length ? value.map(Number) : null),
              help: "Leave empty for a holiday for everyone.",
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
            {
              key: "dateRange",
              label: "Date Range",
              render: (row) =>
                row.startDate && row.endDate
                  ? row.startDate === row.endDate
                    ? row.startDate
                    : `${row.startDate} - ${row.endDate}`
                  : row.holidayDate || "-",
            },
            { key: "holidayType", label: "Type" },
            {
              key: "departmentIds",
              label: "Applies To",
              render: (row) => {
                const ids = parseIds(row.departmentIds);
                return ids.length ? ids.map(departmentName).join(", ") : "Everyone";
              },
            },
            { key: "status", label: "Status" },
          ]}
          useListQuery={useGetAllHolidaysQuery}
          useCreateMutation={useCreateHolidayMutation}
          useUpdateMutation={useUpdateHolidayMutation}
          useDeleteMutation={useDeleteHolidayMutation}
          useApproveMutation={useApproveHolidayMutation}
        />
      </main>
    </div>
  );
};

export default HolidayPage;
