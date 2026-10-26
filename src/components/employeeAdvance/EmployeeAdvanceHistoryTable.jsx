import { motion } from "framer-motion";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import TableSkeleton from "../common/TableSkeleton";
import { useGetAllBookWithoutQueryQuery } from "../../features/book/book";
import { useGetAllEmployeeListWithoutQueryQuery } from "../../features/employeeList/employeeList";
import { useGetAllLedgerHistoryQuery } from "../../features/ledgerHistory/ledgerHistory";

const fmt = (v) =>
  Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

const isRecovery = (row) =>
  String(row?.status || "") === "Paid" ||
  (String(row?.status || "") !== "Unpaid" && Number(row?.paidAmount || 0) > 0);

const getSource = (row) => {
  if (row?.ledgerId) return "Credit Ledger";
  if (row?.cashInOutId) return "Book Cash Out";
  if (isRecovery(row)) return "Payroll";
  return "-";
};

// Statement of one employee's advances (LedgerHistory rows keyed by the
// EmployeeList Id; the backend also matches the employee code).
const EmployeeAdvanceHistoryTable = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: employeeRes } = useGetAllEmployeeListWithoutQueryQuery();
  const employee = useMemo(
    () =>
      (Array.isArray(employeeRes?.data) ? employeeRes.data : []).find(
        (item) => String(item.Id) === String(id),
      ),
    [employeeRes, id],
  );

  const { data: bookRes } = useGetAllBookWithoutQueryQuery();
  const bookNameById = useMemo(
    () =>
      Object.fromEntries(
        (bookRes?.data || []).map((book) => [String(book.Id), book.name]),
      ),
    [bookRes],
  );

  const { data, isLoading } = useGetAllLedgerHistoryQuery(
    { page: 1, limit: 5000, employeeId: id },
    { skip: !id },
  );

  // Oldest first so the running balance reads top-down.
  const rows = useMemo(() => {
    const list = [...(Array.isArray(data?.data) ? data.data : [])].sort(
      (a, b) =>
        String(a.date || "").localeCompare(String(b.date || "")) ||
        Number(a.Id) - Number(b.Id),
    );
    let balance = 0;
    return list.map((row) => {
      const recovered = isRecovery(row) ? Number(row.paidAmount || 0) : 0;
      const advance = isRecovery(row) ? 0 : Number(row.unpaidAmount || 0);
      balance += advance - recovered;
      return { ...row, advance, recovered, balance };
    });
  }, [data]);

  const totals = rows.reduce(
    (acc, row) => ({
      advance: acc.advance + row.advance,
      recovered: acc.recovered + row.recovered,
    }),
    { advance: 0, recovered: 0 },
  );
  const balance = Math.max(totals.advance - totals.recovered, 0);

  const cards = [
    { label: "Total Advance", value: totals.advance, tone: "text-slate-900" },
    { label: "Recovered (Payroll)", value: totals.recovered, tone: "text-emerald-700" },
    { label: "Advance Balance", value: balance, tone: "text-amber-600" },
  ];

  return (
    <motion.div
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            {employee?.name || "Employee"}
          </h2>
          <p className="text-sm text-slate-500">
            {[
              employee?.employee_id ? `ID: ${employee.employee_id}` : "",
              employee?.department?.name,
              employee?.phone,
            ]
              .filter(Boolean)
              .join(" • ")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/employee-advance")}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          ← Back
        </button>
      </div>

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

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Date",
                  "Type",
                  "Source",
                  "Book",
                  "Note",
                  "Advance",
                  "Recovered",
                  "Balance",
                ].map((label, idx) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 ${
                      idx >= 5 ? "text-right" : "text-left"
                    }`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length ? (
                rows.map((row) => (
                  <tr key={row.Id}>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {row.date || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                          row.recovered
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {row.recovered ? "Recovered" : "Advance"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{getSource(row)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {bookNameById[String(row.bookId)] || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.note || "-"}</td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {row.advance ? fmt(row.advance) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700">
                      {row.recovered ? fmt(row.recovered) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600">
                      {fmt(row.balance)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    No advance history
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

export default EmployeeAdvanceHistoryTable;
