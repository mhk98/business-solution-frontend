import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  CalendarDays,
  Edit3,
  Loader2,
  MessageSquareText,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Header from "../components/common/Header";
import {
  useCreateShifaAppointmentSerialMutation,
  useDeleteShifaAppointmentSerialMutation,
  useGetShifaAppointmentSerialsQuery,
  useUpdateShifaAppointmentSerialMutation,
} from "../features/shifaAppointmentSerial/shifaAppointmentSerial";
import useDebounce from "../hooks/useDebounce";

const getToday = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  serial: "",
  name: "",
  mobileNumber: "",
  appointmentDate: getToday(),
  note: "",
};

const smsStatusClass = {
  Sent: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Failed: "border-red-200 bg-red-50 text-red-700",
  "Not Sent": "border-slate-200 bg-slate-50 text-slate-600",
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
};

const ShifaAppointmentSerialPage = () => {
  const pageSize = 10;
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const queryArgs = useMemo(
    () => ({
      page: currentPage,
      limit: pageSize,
      appointmentDate: selectedDate || undefined,
      searchTerm: debouncedSearchTerm || undefined,
    }),
    [currentPage, debouncedSearchTerm, selectedDate],
  );

  const { data, isLoading, refetch } = useGetShifaAppointmentSerialsQuery(queryArgs);
  const [createSerial, { isLoading: creating }] =
    useCreateShifaAppointmentSerialMutation();
  const [updateSerial, { isLoading: updating }] =
    useUpdateShifaAppointmentSerialMutation();
  const [deleteSerial, { isLoading: deleting }] =
    useDeleteShifaAppointmentSerialMutation();

  const serials = data?.data || [];
  const totalRecords = data?.meta?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const isSaving = creating || updating;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, debouncedSearchTerm]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm, appointmentDate: selectedDate || getToday() });
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    resetForm();
    setIsModalOpen(false);
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      ...form,
      serial: form.serial === "" ? undefined : Number(form.serial),
    };

    try {
      const res = editingId
        ? await updateSerial({ id: editingId, data: payload }).unwrap()
        : await createSerial(payload).unwrap();

      if (res?.success) {
        toast.success(editingId ? "Appointment serial updated" : "Appointment serial created");
        setSelectedDate(payload.appointmentDate);
        closeModal();
        refetch();
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to save appointment serial");
    }
  };

  const handleEdit = (row) => {
    setEditingId(row.Id);
    setForm({
      serial: row.serial || "",
      name: row.name || "",
      mobileNumber: row.mobileNumber || "",
      appointmentDate: row.appointmentDate || selectedDate || getToday(),
      note: row.note || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (row) => {
    const ok = window.confirm(`Delete serial ${row.serial}?`);
    if (!ok) return;

    try {
      const res = await deleteSerial(row.Id).unwrap();
      if (res?.success) {
        toast.success("Appointment serial deleted");
        refetch();
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete appointment serial");
    }
  };

  return (
    <div className="flex-1 relative z-10">
      <Header title="Appointment Serial" />

      <main className="max-w-8xl mx-auto min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                Shifa
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">
                Appointment Serial
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Daily serial starts from 1. SMS is sent after creating a serial.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus size={17} />
              Create Serial
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[220px_minmax(260px,1fr)_auto] lg:items-end">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Appointment Date
              </span>
              <div className="relative">
                <CalendarDays
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Search
              </span>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name, mobile or note..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </label>

            <button
              type="button"
              onClick={() => setSelectedDate(getToday())}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Reset to Today
            </button>
          </div>

          <div className="mt-5 max-w-full overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[980px] w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Serial</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Mobile Number</th>
                  <th className="px-4 py-3">Appointment Date</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3">SMS</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      Loading serials...
                    </td>
                  </tr>
                )}
                {!isLoading && serials.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      No appointment serial found.
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  serials.map((row) => (
                    <tr key={row.Id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-indigo-50 px-3 text-sm font-bold text-indigo-700">
                          {row.serial}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.name}</td>
                      <td className="px-4 py-3">{row.mobileNumber}</td>
                      <td className="px-4 py-3">{row.appointmentDate}</td>
                      <td className="px-4 py-3">{row.note || "---"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            smsStatusClass[row.smsStatus] || smsStatusClass.Pending
                          }`}
                        >
                          <MessageSquareText size={13} />
                          {row.smsStatus || "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(row)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-indigo-600 transition hover:bg-indigo-50"
                            title="Edit"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            disabled={deleting}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-500">
              Total: {totalRecords} records
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="px-3 text-sm font-semibold text-slate-600">
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? "Update Appointment Serial" : "Create Appointment Serial"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[72vh] space-y-4 overflow-y-auto px-5 py-5">
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Serial auto generated hoy. Appointment date change korle oi date-er next serial number create hobe.
              </p>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">
                  Serial
                </span>
                <input
                  type="number"
                  min="1"
                  value={form.serial}
                  onChange={(event) => updateField("serial", event.target.value)}
                  placeholder="Auto"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
                <span className="mt-1 block text-xs text-slate-500">
                  Empty rakhle next serial auto hobe.
                </span>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">
                  Name <span className="text-red-500">*</span>
                </span>
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Full name"
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">
                  Mobile Number <span className="text-red-500">*</span>
                </span>
                <input
                  value={form.mobileNumber}
                  onChange={(event) => updateField("mobileNumber", event.target.value)}
                  placeholder="01XXXXXXXXX"
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">
                  Appointment Date <span className="text-red-500">*</span>
                </span>
                <input
                  type="date"
                  value={form.appointmentDate}
                  onChange={(event) => updateField("appointmentDate", event.target.value)}
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">
                  Note
                </span>
                <textarea
                  value={form.note}
                  onChange={(event) => updateField("note", event.target.value)}
                  placeholder="Optional note"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-70"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {editingId ? "Update Serial" : "Create Serial"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ShifaAppointmentSerialPage;
