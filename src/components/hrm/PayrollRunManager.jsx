import { useMemo, useState } from "react";
import { FileText, PlayCircle, Search, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../common/Modal";
import HrmWorkspace from "./HrmWorkspace";
import useDebounce from "../../hooks/useDebounce";

import {
  useCreatePayrollRunMutation,
  useGetAllPayrollRunsQuery,
  useGetPayrollRunByIdQuery,
  useUpdatePayrollRunMutation,
} from "../../features/payrollRun/payrollRun";

const currentMonth = new Date().toISOString().slice(0, 7);

const PayrollRunManager = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({
    month: currentMonth,
    title: "",
    note: "",
  });

  const queryArgs = useMemo(
    () => ({
      page: 1,
      limit: 100,
      searchTerm: debouncedSearchTerm || undefined,
    }),
    [searchTerm],
  );

  const { data, isLoading, refetch } = useGetAllPayrollRunsQuery(queryArgs);
  const { data: runDetailsRes } = useGetPayrollRunByIdQuery(selectedRunId, {
    skip: !selectedRunId,
  });
  const [createRun, { isLoading: isCreating }] = useCreatePayrollRunMutation();
  const [updateRun] = useUpdatePayrollRunMutation();

  const rows = data?.data || [];
  const selectedRun = runDetailsRes?.data;

  const stats = [
    {
      name: "Payroll Runs",
      value: rows.length,
      icon: Wallet,
      iconBg: "#EEF2FF",
      iconColor: "#4338CA",
    },
    {
      name: "Net Amount",
      value: selectedRun?.netAmount || rows[0]?.netAmount || 0,
      icon: FileText,
      iconBg: "#ECFDF5",
      iconColor: "#047857",
    },
  ];

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.month) return toast.error("Month is required");

    try {
      const res = await createRun(form).unwrap();
      if (res?.success) {
        toast.success("Payroll generated successfully");
        setIsCreateOpen(false);
        setSelectedRunId(res?.data?.Id || null);
        refetch?.();
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to generate payroll");
    }
  };

  const handleFinalize = async () => {
    if (!selectedRun?.Id) return;
    try {
      const res = await updateRun({
        id: selectedRun.Id,
        data: { status: "Finalized" },
      }).unwrap();
      if (res?.success) {
        toast.success("Payroll finalized");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to finalize payroll");
    }
  };

  return (
    <HrmWorkspace
      eyebrow="Phase 3"
      title="Payroll Runs"
      description="Generate monthly payroll from attendance summaries and approved leaves, then review itemized employee results."
      stats={stats}
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Payroll Console</h3>
            <p className="mt-1 text-sm text-slate-500">
              Create a new payroll run for a month, then inspect itemized net, deductions and overtime.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <label className="relative block w-full sm:w-56">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search payroll month"
                className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </label>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 sm:w-auto"
            >
              <PlayCircle size={16} />
              Generate Payroll
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-sm font-semibold text-slate-800">
            Run History
          </div>
          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">Loading...</div>
            ) : rows.length ? (
              rows.map((run) => (
                <button
                  key={run.Id}
                  type="button"
                  onClick={() => setSelectedRunId(run.Id)}
                  className={`w-full px-5 py-4 text-left transition hover:bg-slate-50 ${
                    selectedRunId === run.Id ? "bg-indigo-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{run.title || run.month}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Month: {run.month} • Employees: {run.totalEmployees || 0}
                      </div>
                    </div>
                    <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      {run.status}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-slate-500">
                No payroll run found.
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-3 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3">
            <div className="text-sm font-semibold text-slate-800">Run Details</div>
            {selectedRun?.status !== "Finalized" && selectedRun?.Id ? (
              <button
                type="button"
                onClick={handleFinalize}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                Finalize
              </button>
            ) : null}
          </div>

          {selectedRun ? (
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Gross</div>
                  <div className="mt-2 text-2xl font-black text-slate-900">{selectedRun.grossAmount || 0}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Deduction</div>
                  <div className="mt-2 text-2xl font-black text-slate-900">{selectedRun.deductionAmount || 0}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Net</div>
                  <div className="mt-2 text-2xl font-black text-slate-900">{selectedRun.netAmount || 0}</div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-[720px] divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Employee</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Base</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Leave / Absent</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">OT / Late</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedRun.items || []).map((item) => (
                      <tr key={item.Id}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{item.employee?.name || "-"}</div>
                          <div className="text-xs text-slate-500">{item.employee?.employeeCode || item.employee?.employee_id}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item.baseSalary}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <div>Paid: {item.paidLeaveDays || 0}</div>
                          <div className="text-xs text-slate-500">
                            Unpaid: {item.unpaidLeaveDays || 0} • Absent: {item.absentDays || 0}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div>OT: {item.overtimeAmount}</div>
                          <div className="text-xs text-slate-500">
                            Late count: {item.lateCount || 0}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{item.netAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              Select a payroll run to inspect itemized results.
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Generate Payroll Run" maxWidth="max-w-2xl">
        <form onSubmit={handleCreate} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Payroll Month</span>
            <input
              type="month"
              value={form.month}
              onChange={(e) => setForm((prev) => ({ ...prev, month: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Title</span>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Note</span>
            <textarea
              rows={4}
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>
          <div className="flex justify-end">
            <button type="submit" disabled={isCreating} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
              {isCreating ? "Generating..." : "Generate"}
            </button>
          </div>
        </form>
      </Modal>
    </HrmWorkspace>
  );
};

export default PayrollRunManager;
