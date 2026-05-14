import Header from "../components/common/Header";
import HrmCrudManager from "../components/hrm/HrmCrudManager";
import {
  useApproveAttendanceDeviceMutation,
  useCreateAttendanceDeviceMutation,
  useDeleteAttendanceDeviceMutation,
  useGetAllAttendanceDevicesQuery,
  useUpdateAttendanceDeviceMutation,
} from "../features/attendanceDevice/attendanceDevice";

const AttendanceDevicePage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Attendance Device" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <HrmCrudManager
          entityLabel="Attendance Device"
          title="Biometric Attendance Devices"
          description="Track machine setup for ZKTeco-ready biometric devices, network identity and sync planning."
          fields={[
            { name: "name", label: "Device Name", required: true },
            { name: "code", label: "Code" },
            { name: "brand", label: "Brand", defaultValue: "ZKTeco" },
            { name: "model", label: "Model", defaultValue: "SpeedFace-V5L" },
            { name: "serialNumber", label: "Serial Number" },
            { name: "deviceIdentifier", label: "Device Identifier" },
            { name: "apiKey", label: "Device API Key" },
            { name: "ipAddress", label: "IP Address" },
            { name: "branch", label: "Branch" },
            { name: "location", label: "Location" },
            {
              name: "syncMethod",
              label: "Sync Method",
              type: "select",
              options: [
                { value: "WDMS", label: "WDMS" },
                { value: "ADMS", label: "ADMS" },
                { value: "LAN", label: "LAN" },
              ],
              defaultValue: "WDMS",
            },
            {
              name: "status",
              label: "Status",
              type: "select",
              options: [
                { value: "Planned", label: "Planned" },
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" },
                { value: "Maintenance", label: "Maintenance" },
              ],
              defaultValue: "Planned",
            },
            { name: "note", label: "Note", type: "textarea" },
          ]}
          columns={[
            { key: "name", label: "Name" },
            { key: "model", label: "Model" },
            { key: "branch", label: "Branch" },
            { key: "ipAddress", label: "IP" },
            { key: "syncMethod", label: "Sync Method" },
            { key: "status", label: "Status" },
          ]}
          useListQuery={useGetAllAttendanceDevicesQuery}
          useCreateMutation={useCreateAttendanceDeviceMutation}
          useUpdateMutation={useUpdateAttendanceDeviceMutation}
          useDeleteMutation={useDeleteAttendanceDeviceMutation}
          useApproveMutation={useApproveAttendanceDeviceMutation}
        />
      </main>
    </div>
  );
};

export default AttendanceDevicePage;
