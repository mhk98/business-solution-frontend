import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  CalendarDays,
  Edit3,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Header from "../components/common/Header";
import {
  useCreateShifaIncentiveMutation,
  useDeleteShifaIncentiveMutation,
  useGetShifaIncentivesQuery,
  useUpdateShifaIncentiveMutation,
} from "../features/shifaIncentive/shifaIncentive";
import useDebounce from "../hooks/useDebounce";

const emptyForm = {
  employeeId: "",
  totalOrder: "",
  totalAmount: "",
  thousandPlusAmount: "",
  returnOrder: "",
  returnMinus: "",
  totalIncentive: "",
  date: "",
  note: "",
};

const money = (value) =>
  `৳${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const numberValue = (value) => (value === "" ? 0 : Number(value));

const ShifaIncentivePage = () => {
  const pageSize = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const queryArgs = useMemo(
    () => ({
      page: currentPage,
      limit: pageSize,
      searchTerm: debouncedSearchTerm || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [currentPage, debouncedSearchTerm, endDate, startDate],
  );

  const { data, isLoading, refetch } = useGetShifaIncentivesQuery(queryArgs);
  const [createIncentive, { isLoading: creating }] =
    useCreateShifaIncentiveMutation();
  const [updateIncentive, { isLoading: updating }] =
    useUpdateShifaIncentiveMutation();
  const [deleteIncentive, { isLoading: deleting }] =
    useDeleteShifaIncentiveMutation();

  const incentives = data?.data || [];
  const totalRecords = data?.meta?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const isSaving = creating || updating;

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, endDate, startDate]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      employeeId: form.employeeId.trim(),
      totalOrder: numberValue(form.totalOrder),
      totalAmount: numberValue(form.totalAmount),
      thousandPlusAmount: numberValue(form.thousandPlusAmount),
      returnOrder: numberValue(form.returnOrder),
      returnMinus: numberValue(form.returnMinus),
      totalIncentive: numberValue(form.totalIncentive),
      date: form.date || null,
      note: form.note.trim() || null,
    };

    try {
      const res = editingId
        ? await updateIncentive({ id: editingId, data: payload }).unwrap()
        : await createIncentive(payload).unwrap();

      if (res?.success) {
        toast.success(editingId ? "Incentive updated" : "Incentive created");
        closeModal();
        refetch();
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to save incentive");
    }
  };

  const handleEdit = (row) => {
    setEditingId(row.Id);
    setForm({
      employeeId: row.employeeId || "",
      totalOrder: row.totalOrder ?? "",
      totalAmount: row.totalAmount ?? "",
      thousandPlusAmount: row.thousandPlusAmount ?? "",
      returnOrder: row.returnOrder ?? "",
      returnMinus: row.returnMinus ?? "",
      totalIncentive: row.totalIncentive ?? "",
      date: row.date || "",
      note: row.note || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete incentive for employee ${row.employeeId}?`)) return;

    try {
      const res = await deleteIncentive(row.Id).unwrap();
      if (res?.success) {
        toast.success("Incentive deleted");
        refetch();
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete incentive");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="flex-1 relative z-10">
      <Header title="Incentive" />

      <main className="max-w-8xl mx-auto min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                Shifa
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">Incentive</h1>
              <p className="mt-1 text-sm text-slate-500">
                Track employee orders, returns and final incentive amount.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus size={17} />
              Create Incentive
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_180px_180px_auto] xl:items-end">
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
                  placeholder="Search by employee id or note..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                From
              </span>
              <div className="relative">
                <CalendarDays size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                To
              </span>
              <div className="relative">
                <CalendarDays size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </label>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Reset
            </button>
          </div>

          <div className="mt-5 max-w-full overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[1160px] w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Employee Id</th>
                  <th className="px-4 py-3">Total Order</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">1000+ Amount</th>
                  <th className="px-4 py-3">Return Order</th>
                  <th className="px-4 py-3">Return Minus</th>
                  <th className="px-4 py-3">Total Incentive</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {isLoading && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                      Loading incentives...
                    </td>
                  </tr>
                )}
                {!isLoading && incentives.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                      No incentive found.
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  incentives.map((row) => (
                    <tr key={row.Id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.employeeId}</td>
                      <td className="px-4 py-3">{row.totalOrder}</td>
                      <td className="px-4 py-3">{money(row.totalAmount)}</td>
                      <td className="px-4 py-3">{money(row.thousandPlusAmount)}</td>
                      <td className="px-4 py-3">{row.returnOrder}</td>
                      <td className="px-4 py-3">{money(row.returnMinus)}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">
                        {money(row.totalIncentive)}
                      </td>
                      <td className="px-4 py-3">{row.date || "---"}</td>
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
          <form onSubmit={handleSubmit} className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? "Update Incentive" : "Create Incentive"}
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

            <div className="grid max-h-[72vh] gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2">
              {[
                ["employeeId", "Employee Id", "text"],
                ["totalOrder", "Total Order", "number"],
                ["totalAmount", "Total Amount", "number"],
                ["thousandPlusAmount", "1000+ Amount", "number"],
                ["returnOrder", "Return Order", "number"],
                ["returnMinus", "Return Minus", "number"],
                ["totalIncentive", "Total Incentive", "number"],
              ].map(([field, label, type]) => (
                <label key={field} className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">
                    {label} <span className="text-red-500">*</span>
                  </span>
                  <input
                    type={type}
                    min={type === "number" ? "0" : undefined}
                    step={type === "number" ? "0.01" : undefined}
                    value={form[field]}
                    onChange={(event) => updateField(field, event.target.value)}
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </label>
              ))}

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Date</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => updateField("date", event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Note</span>
                <textarea
                  value={form.note}
                  onChange={(event) => updateField("note", event.target.value)}
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
                {editingId ? "Update Incentive" : "Create Incentive"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ShifaIncentivePage;
