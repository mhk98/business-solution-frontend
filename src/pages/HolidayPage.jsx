import Header from "../components/common/Header";
import HrmCrudManager from "../components/hrm/HrmCrudManager";
import {
  useApproveHolidayMutation,
  useCreateHolidayMutation,
  useDeleteHolidayMutation,
  useGetAllHolidaysQuery,
  useUpdateHolidayMutation,
} from "../features/holiday/holiday";

const HolidayPage = () => {
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
                { value: "Public Holiday", label: "Public Holiday" },
                { value: "Company Holiday", label: "Company Holiday" },
                { value: "Festival Holiday", label: "Festival Holiday" },
              ],
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
