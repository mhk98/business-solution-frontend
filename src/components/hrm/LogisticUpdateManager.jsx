import { useMemo, useState } from "react";
import { Edit3, PackageCheck, Plus, Save } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../common/Modal";
import DateRangeFilter from "../common/DateRangeFilter";
import HrmWorkspace from "./HrmWorkspace";
import {
  useCreateLogisticUpdateMutation,
  useGetLogisticUpdateDepartmentsQuery,
  useGetLogisticUpdatesQuery,
  useUpdateLogisticUpdateMutation,
} from "../../features/logisticUpdate/logisticUpdate";

export const LOGISTIC_UPDATE_TYPES = [
  "Entry Update",
  "Return Sheet Received",
  "Missing Parcel and Problem Parcel Followup",
  "Hold Parcel Received",
];

const today = new Date().toISOString().slice(0, 10);
const emptyForm = { startDate: today, endDate: today, updateType: "", quantity: "" };

const LogisticUpdateManager = () => {
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [updateType, setUpdateType] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const queryArgs = useMemo(
    () => ({
      page,
      limit: 20,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      updateType: updateType || undefined,
      departmentId: departmentId || undefined,
    }),
    [page, startDate, endDate, updateType, departmentId],
  );
  const { data, isLoading } = useGetLogisticUpdatesQuery(queryArgs);
  const { data: departmentsResponse } = useGetLogisticUpdateDepartmentsQuery();
  const [createUpdate, { isLoading: isCreating }] = useCreateLogisticUpdateMutation();
  const [updateItem, { isLoading: isUpdating }] = useUpdateLogisticUpdateMutation();

  const rows = data?.data || [];
  const total = data?.meta?.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const totalQuantity = Number(data?.meta?.totalQuantity || 0);

  const stats = [
    { name: "Updates", value: total, icon: PackageCheck, iconBg: "#EEF2FF", iconColor: "#4F46E5" },
    { name: "Total Quantity", value: totalQuantity, icon: PackageCheck, iconBg: "#ECFDF5", iconColor: "#047857" },
  ];

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.Id);
    setForm({
      startDate: row.startDate,
      endDate: row.endDate,
      updateType: row.updateType,
      quantity: String(row.quantity),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.startDate > form.endDate) {
      toast.error("End date cannot be earlier than start date");
      return;
    }

    const payload = { ...form, quantity: Number(form.quantity) };
    try {
      const result = editingId
        ? await updateItem({ id: editingId, data: payload }).unwrap()
        : await createUpdate(payload).unwrap();
      toast.success(result?.message || (editingId ? "Logistic update edited" : "Logistic update added"));
      closeModal();
    } catch (error) {
      toast.error(error?.data?.message || "Could not save logistic update");
    }
  };

  const setFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <HrmWorkspace
      eyebrow="Logistic Update"
      title="Logistic Update"
      description="Record logistic activity by date range, category and quantity."
      stats={stats}
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Logistic Updates</h3>
            <p className="mt-1 text-sm text-slate-500">Filter entries by date range, department and update type.</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus size={17} /> Add Logistic
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            compact
            className="md:col-span-2"
          />
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Department</span>
            <select value={departmentId} onChange={setFilter(setDepartmentId)} className={inputClassName}>
              <option value="">All departments</option>
              {(departmentsResponse?.data || []).map((department) => <option key={department.Id} value={department.Id}>{department.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Update type</span>
            <select value={updateType} onChange={setFilter(setUpdateType)} className={inputClassName}>
              <option value="">All update types</option>
              {LOGISTIC_UPDATE_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[850px] w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">End Date</th>
                <th className="px-4 py-3">Update Type</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Entered By</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {isLoading && <TableMessage message="Loading logistic updates..." />}
              {!isLoading && rows.length === 0 && <TableMessage message="No logistic update found." />}
              {!isLoading && rows.map((row) => (
                <tr key={row.Id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.startDate}</td>
                  <td className="px-4 py-3">{row.endDate}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{row.updateType}</span></td>
                  <td className="px-4 py-3 font-bold text-slate-900">{row.quantity}</td>
                  <td className="px-4 py-3">{row.user?.employeeProfile?.department?.name || "-"}</td>
                  <td className="px-4 py-3">{formatUser(row.user)}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openEdit(row)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100" title="Edit">
                      <Edit3 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-center gap-3">
            <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className={pageButtonClassName}>Prev</button>
            <span className="text-sm font-semibold text-slate-600">Page {page} of {totalPages}</span>
            <button type="button" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className={pageButtonClassName}>Next</button>
          </div>
        )}
      </section>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? "Edit Logistic" : "Add Logistic"} maxWidth="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input required type="date" label="Start date" value={form.startDate} onChange={(e) => setForm((value) => ({ ...value, startDate: e.target.value }))} />
            <Input required type="date" label="End date" value={form.endDate} onChange={(e) => setForm((value) => ({ ...value, endDate: e.target.value }))} />
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Update type *</span>
            <select required value={form.updateType} onChange={(e) => setForm((value) => ({ ...value, updateType: e.target.value }))} className={inputClassName}>
              <option value="">Select update type</option>
              {LOGISTIC_UPDATE_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <Input required type="number" min="0" step="1" label="Quantity" value={form.quantity} onChange={(e) => setForm((value) => ({ ...value, quantity: e.target.value }))} placeholder="Enter quantity" />
          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button type="submit" disabled={isCreating || isUpdating} className="inline-flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
              <Save size={16} /> {isCreating || isUpdating ? "Saving..." : editingId ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </HrmWorkspace>
  );
};

const inputClassName = "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
const pageButtonClassName = "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50";

const Input = ({ label, ...props }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-semibold text-slate-700">{label}{props.required ? " *" : ""}</span>
    <input {...props} className={inputClassName} />
  </label>
);

const TableMessage = ({ message }) => <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">{message}</td></tr>;

const formatUser = (user) => {
  const name = `${user?.FirstName || ""} ${user?.LastName || ""}`.trim();
  return name || user?.Email || "-";
};

export default LogisticUpdateManager;
