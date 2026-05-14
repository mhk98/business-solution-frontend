import { useMemo, useState } from "react";
import { ReceiptText, Search, Wallet } from "lucide-react";
import Header from "../components/common/Header";
import HrmWorkspace from "../components/hrm/HrmWorkspace";
import { useGetAllPayrollItemsQuery } from "../features/payrollItem/payrollItem";

const PayslipPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const queryArgs = useMemo(
    () => ({
      page: 1,
      limit: 200,
      searchTerm: searchTerm || undefined,
      month: month || undefined,
    }),
    [searchTerm, month],
  );

  const { data, isLoading } = useGetAllPayrollItemsQuery(queryArgs);
  const rows = data?.data || [];

  const stats = [
    {
      name: "Payslip Rows",
      value: rows.length,
      icon: ReceiptText,
      iconBg: "#EEF2FF",
      iconColor: "#4338CA",
    },
    {
      name: "Total Net",
      value: rows
        .reduce((sum, row) => sum + Number(row.netAmount || 0), 0)
        .toFixed(2),
      icon: Wallet,
      iconBg: "#ECFDF5",
      iconColor: "#047857",
    },
  ];

  return (
    <div className="flex-1 relative z-10">
      <Header title="Payslips" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <HrmWorkspace
          eyebrow="Phase 3"
          title="Payslip History"
          description="Browse finalized payroll rows employee-wise for month-end review and payslip-ready export workflows."
          stats={stats}
        >
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Payslip Browser
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Filter by month or employee to inspect payroll-ready item
                  rows.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <label className="relative block w-full sm:w-56">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search employee"
                    className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 sm:w-auto"
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[760px] divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Month
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Base
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Deductions
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Net
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : rows.length ? (
                    rows.map((row) => (
                      <tr key={row.Id}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {row.employee?.name || "-"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {row.employee?.employeeCode ||
                              row.employee?.employee_id ||
                              "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {row.payrollRun?.month || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {row.baseSalary}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {row.deductionAmount}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {row.netAmount}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        No payslip rows found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </HrmWorkspace>
      </main>
    </div>
  );
};

export default PayslipPage;
