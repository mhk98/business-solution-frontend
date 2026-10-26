import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import TableSkeleton from "../common/TableSkeleton";
import { useGetAllEmployeeListWithoutQueryQuery } from "../../features/employeeList/employeeList";

const fmt = (v) =>
  Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

// Employee advance balances. Advances come from Book Cash Out (party type
// Employee) / Credit Ledger; recoveries come from payroll's Advance field.
const EmployeeAdvanceTable = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [onlyWithBalance, setOnlyWithBalance] = useState(false);

  const { data, isLoading } = useGetAllEmployeeListWithoutQueryQuery();

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (Array.isArray(data?.data) ? data.data : [])
      .filter((employee) => !employee.deletedAt)
      .filter((employee) =>
        onlyWithBalance ? Number(employee.advanceBalance || 0) > 0 : true,
      )
      .filter((employee) =>
        term
          ? [employee.name, employee.employee_id, employee.phone]
              .map((value) => String(value ?? "").toLowerCase())
              .some((value) => value.includes(term))
          : true,
      )
      .sort(
        (a, b) =>
          Number(b.advanceBalance || 0) - Number(a.advanceBalance || 0) ||
          String(a.name || "").localeCompare(String(b.name || "")),
      );
  }, [data, search, onlyWithBalance]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, employee) => ({
          advance: acc.advance + Number(employee.ledgerUnpaidAmount || 0),
          recovered: acc.recovered + Number(employee.ledgerPaidAmount || 0),
          balance: acc.balance + Number(employee.advanceBalance || 0),
        }),
        { advance: 0, recovered: 0, balance: 0 },
      ),
    [rows],
  );

  const cards = [
    { label: "Total Advance", value: totals.advance, tone: "text-slate-900" },
    { label: "Recovered (Payroll)", value: totals.recovered, tone: "text-emerald-700" },
    { label: "Advance Balance", value: totals.balance, tone: "text-amber-600" },
  ];

  return (
    <motion.div
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {card.label}
            </p>
            <p className={`mt-1 text-2xl font-black ${card.tone}`}>
              ৳ {fmt(card.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, ID or phone..."
          className="h-10 w-full sm:w-72 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={onlyWithBalance}
            onChange={(e) => setOnlyWithBalance(e.target.checked)}
          />
          Only with advance balance
        </label>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Employee ID",
                  "Name",
                  "Department",
                  "Phone",
                  "Total Advance",
                  "Recovered",
                  "Balance",
                ].map((label, idx) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 ${
                      idx >= 4 ? "text-right" : "text-left"
                    }`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length ? (
                rows.map((employee) => (
                  <tr
                    key={employee.Id}
                    onClick={() => navigate(`/employee-advance/${employee.Id}`)}
                    className="cursor-pointer hover:bg-indigo-50/40"
                  >
                    <td className="px-4 py-3 text-slate-700">
                      {employee.employee_id || "-"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-indigo-600">
                      {employee.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {employee.department?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {employee.phone || "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {fmt(employee.ledgerUnpaidAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700">
                      {fmt(employee.ledgerPaidAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600">
                      {fmt(employee.advanceBalance)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    No employees found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

export default EmployeeAdvanceTable;
