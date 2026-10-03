import Header from "../components/common/Header";
import HrmCrudManager from "../components/hrm/HrmCrudManager";
import {
  useApproveAttendanceDeviceMutation,
  useCreateAttendanceDeviceMutation,
  useDeleteAttendanceDeviceMutation,
  useGetAllAttendanceDevicesQuery,
  useUpdateAttendanceDeviceMutation,
} from "../features/attendanceDevice/attendanceDevice";

// A ZKTeco device on ADMS checks in every ~10–30 seconds while connected.
const ONLINE_WINDOW_MS = 3 * 60 * 1000;

const ConnectionCell = ({ lastSyncAt }) => {
  const time = lastSyncAt ? new Date(lastSyncAt) : null;
  const valid = time && !Number.isNaN(time.getTime());
  const online = valid && Date.now() - time.getTime() < ONLINE_WINDOW_MS;

  return (
    <div className="flex flex-col gap-1">
      <span
        className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
          online ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-slate-400"}`} />
        {online ? "Online" : "Offline"}
      </span>
      <span className="text-xs text-slate-500">
        {valid ? `Last seen ${time.toLocaleString("en-GB")}` : "Never connected"}
      </span>
    </div>
  );
};

const AttendanceDevicePage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Attendance Device" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <HrmCrudManager
          entityLabel="Device"
          title="Attendance Devices"
          description="Add each ZKTeco device with its serial number (Menu → System Info → Device Info). On the device set Cloud Server Settings → ADMS and point it at this server; its punches then show on the Attendance page."
          fields={[
            {
              name: "name",
              label: "Device Name",
              required: true,
              placeholder: "e.g. Head Office",
            },
            {
              name: "serialNumber",
              label: "Serial Number",
              required: true,
              placeholder: "From Menu → System Info → Device Info",
            },
            { name: "location", label: "Location", placeholder: "e.g. Main Entrance" },
            { name: "branch", label: "Branch", placeholder: "e.g. Head Office" },
            { name: "model", label: "Model", placeholder: "e.g. SpeedFace-V5L" },
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
            { name: "note", label: "Note", type: "textarea" },
          ]}
          columns={[
            { key: "name", label: "Name" },
            {
              key: "serialNumber",
              label: "Serial Number",
              render: (row) => (
                <span className="font-mono text-xs">{row.serialNumber || "-"}</span>
              ),
            },
            { key: "location", label: "Location" },
            { key: "status", label: "Status" },
            {
              key: "lastSyncAt",
              label: "Connection",
              render: (row) => <ConnectionCell lastSyncAt={row.lastSyncAt} />,
            },
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
