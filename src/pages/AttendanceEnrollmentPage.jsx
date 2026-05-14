import Header from "../components/common/Header";
import HrmCrudManager from "../components/hrm/HrmCrudManager";
import {
  useCreateAttendanceEnrollmentMutation,
  useDeleteAttendanceEnrollmentMutation,
  useGetAllAttendanceEnrollmentsQuery,
  useUpdateAttendanceEnrollmentMutation,
} from "../features/attendanceEnrollment/attendanceEnrollment";
import { useGetAllAttendanceDevicesQuery } from "../features/attendanceDevice/attendanceDevice";
import { useGetAllEmployeeListQuery } from "../features/employeeList/employeeList";

const AttendanceEnrollmentPage = () => {
  const { data: devicesRes } = useGetAllAttendanceDevicesQuery({
    page: 1,
    limit: 500,
  });
  const { data: employeesRes } = useGetAllEmployeeListQuery({
    page: 1,
    limit: 500,
  });

  const deviceOptions = (devicesRes?.data || []).map((device) => ({
    value: device.Id,
    label: `${device.name}${device.branch ? ` • ${device.branch}` : ""}`,
  }));

  const employeeOptions = (employeesRes?.data || []).map((employee) => ({
    value: employee.Id,
    label: `${employee.name}${employee.employeeCode ? ` • ${employee.employeeCode}` : ""}`,
  }));

  return (
    <div className="flex-1 relative z-10">
      <Header title="Attendance Enrollment" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <HrmCrudManager
          eyebrow="Phase 2"
          entityLabel="Attendance Enrollment"
          title="Biometric Enrollment Mapping"
          description="Map machine user identities to employee master profiles so raw device logs can be resolved correctly."
          fields={[
            {
              name: "employeeId",
              label: "Employee",
              type: "select",
              options: employeeOptions,
              required: true,
            },
            {
              name: "attendanceDeviceId",
              label: "Device",
              type: "select",
              options: deviceOptions,
              required: true,
            },
            { name: "deviceUserId", label: "Device User ID", required: true },
            {
              name: "biometricModes",
              label: "Biometric Modes",
              placeholder: "face,fingerprint",
              parse: (value) =>
                !value
                  ? []
                  : value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
              serialize: (value) =>
                Array.isArray(value) ? value.join(", ") : value || "",
            },
            {
              name: "enrollmentStatus",
              label: "Enrollment Status",
              type: "select",
              options: [
                { value: "Enrolled", label: "Enrolled" },
                { value: "Pending", label: "Pending" },
                { value: "Disabled", label: "Disabled" },
              ],
              defaultValue: "Enrolled",
            },
            {
              name: "enrolledAt",
              label: "Enrolled At",
              type: "datetime-local",
            },
            {
              name: "lastSyncedAt",
              label: "Last Synced",
              type: "datetime-local",
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
            {
              key: "employee",
              label: "Employee",
              render: (row) => row.employee?.name || "-",
            },
            {
              key: "device",
              label: "Device",
              render: (row) => row.device?.name || "-",
            },
            { key: "deviceUserId", label: "Device User ID" },
            { key: "enrollmentStatus", label: "Enrollment" },
            {
              key: "biometricModes",
              label: "Modes",
              render: (row) =>
                Array.isArray(row.biometricModes) && row.biometricModes.length
                  ? row.biometricModes.join(", ")
                  : "-",
            },
            { key: "status", label: "Status" },
          ]}
          useListQuery={useGetAllAttendanceEnrollmentsQuery}
          useCreateMutation={useCreateAttendanceEnrollmentMutation}
          useUpdateMutation={useUpdateAttendanceEnrollmentMutation}
          useDeleteMutation={useDeleteAttendanceEnrollmentMutation}
        />
      </main>
    </div>
  );
};

export default AttendanceEnrollmentPage;
